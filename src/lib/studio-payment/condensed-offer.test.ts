import { afterEach, describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { buildCondensedOfferIntakePlan } from "@/lib/project-intake-plan";
import { resolveIntakeEntrySurface } from "@/lib/route-map-intake-continuity";
import { canOpenIntakeForCampaign } from "@/lib/studio-intake-resume";

import { maximumApprovedFullRefundCents } from "./thank-you-refund";
import { confirmPaymentFromProcessor } from "./confirm";
import { createCheckoutSession } from "./create-session";
import { readCheckoutSessionBinding } from "./events-store";
import type { CheckoutSessionCreateRequest } from "./types";

const ORIGINAL_SECRET = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ORIGINAL_SECRET;
});

function request(
  packageId: string,
  campaignId: string,
  support: Record<string, string> = {},
): CheckoutSessionCreateRequest {
  return {
    campaignId,
    returnOrigin: "http://localhost:3000",
    customerEmail: "ada@example.com",
    purchaseKind: "condensed_offer",
    facts: {
      draftRevision: 1,
      routeId: null,
      selectedServiceIds: [packageId],
      projectNeed: "Announce the spring open house",
      businessName: "Cedar Lane",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "Logo is on the website",
    },
    condensedOffer: {
      packageId,
      customerName: "Ada Stone",
      company: "Cedar Lane",
      projectNeed: "Announce the spring open house",
      materialsNote: "Logo is on the website",
      support,
    },
  };
}

function stripeDouble(unitAmounts: number[], urls: string[] = []) {
  return {
    checkout: {
      sessions: {
        create: async (params: {
          line_items?: Array<{ price_data?: { unit_amount?: number } }>;
          success_url?: string;
          cancel_url?: string;
          metadata?: Record<string, string>;
        }) => {
          const amount = params.line_items?.[0]?.price_data?.unit_amount;
          if (typeof amount === "number") unitAmounts.push(amount);
          if (params.success_url) urls.push(params.success_url);
          if (params.cancel_url) urls.push(params.cancel_url);
          return {
            id: `cs_test_${unitAmounts.length}_${Date.now()}`,
            url: "https://checkout.stripe.com/c/pay/cs_test_condensed",
            success_url: params.success_url,
            cancel_url: params.cancel_url,
            metadata: params.metadata,
          };
        },
      },
    },
  };
}

describe("condensed three-package checkout", () => {
  it("keeps frozen catalog prices untouched", () => {
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(studioClipRepurposingBuildV1.sku.id).toBe(CLIP_REPURPOSING_SKU);
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(studioShortFormVideoEditingBuildV1.sku.id).toBe(SHORT_FORM_VIDEO_EDITING_SKU);
    expect(getServiceById("v2-rtu-social-posts")?.priceCents).toBe(9900);
    expect(getServiceById("v2-rtu-promotion-graphics")?.priceCents).toBe(7900);
  });

  it.each([
    ["clip_repurposing", 37375, 7475, 29900],
    ["short_form_video_editing", 18625, 3725, 14900],
    ["social_and_promo_graphics", 19900, 3980, 15920],
    ["campaign_launch_kit", 34900, 6980, 27920],
  ] as const)(
    "derives %s list %s with a 20% thank-you and 3 rounds",
    async (packageId, listCents, discountCents, chargeCents) => {
      process.env.STRIPE_SECRET_KEY = "sk_test_condensed_unit";
      const amounts: number[] = [];
      const urls: string[] = [];
      const campaignId = `condensed-${packageId}-${Date.now()}`;
      const result = await createCheckoutSession(
        request(packageId, campaignId, {
          reputation_customer_proof: "SELECT",
          ad_creative: "SELECT",
          email_and_text: "SKIP",
        }),
        {
          env: process.env,
          stripe: stripeDouble(amounts, urls) as never,
        },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.mode).toBe("stripe");
      expect(result.expectedAmountCents).toBe(chargeCents);
      expect(amounts).toEqual([chargeCents]);
      expect(urls[0]).toContain("stage=intake");
      expect(urls[0]).toContain(encodeURIComponent(campaignId));
      expect(urls[1]).toContain("/checkout?payment=cancel");
      expect(result.campaignId).toBe(campaignId);

      const saved = await readCampaignEnvelope(campaignId);
      expect(saved?.record.condensedOffer?.packageId).toBe(packageId);
      expect(saved?.record.condensedOffer?.priceCents).toBe(listCents);
      expect(saved?.record.condensedOffer?.listPriceCents).toBe(listCents);
      expect(saved?.record.condensedOffer?.thankYouDiscountCents).toBe(discountCents);
      expect(saved?.record.condensedOffer?.amountDueCents).toBe(chargeCents);
      expect(saved?.record.approvedStudioPlan?.amountDueTodayCents).toBe(chargeCents);
      expect(saved?.record.revisionRoundsIncluded).toBe(3);
      expect(saved?.record.paymentReceivedAt).toBeNull();
      expect(saved?.record.campaignStatus).toBe("DRAFT_RECEIVED");
      expect(saved?.record.approvedStudioPlan?.selectedServiceIds).not.toContain(
        "v2-rtu-clip-repurposing",
      );
      expect(saved?.record.approvedStudioPlan?.selectedServiceIds).not.toContain(
        "v2-rtu-short-form-video-edit",
      );
      expect(saved?.record.paymentTruth?.selectedServiceIds).toEqual([packageId]);
      expect(saved?.record.paymentTruth?.expectedAmountCents).toBe(chargeCents);
      expect(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")).toBe(true);
      expect(saved?.record.condensedOffer?.support.reputation_customer_proof).toBe(
        "SELECT",
      );

      const binding = await readCheckoutSessionBinding(result.checkoutSessionId);
      expect(binding?.expectedAmountCents).toBe(chargeCents);
      expect(binding?.selectedServiceIds).toEqual([packageId]);
      expect(binding?.purchaseKind).toBe("condensed_offer");
    },
  );

  it("records Studio Extras at no extra charge and keeps them through payment", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_condensed_unit";
    const amounts: number[] = [];
    const campaignId = `condensed-extras-${Date.now()}`;
    const result = await createCheckoutSession(
      { ...request("clip_repurposing", campaignId), condensedOffer: { ...request("clip_repurposing", campaignId).condensedOffer!, extras: ["flyer", "ad_creative"] } },
      { env: process.env, stripe: stripeDouble(amounts) as never },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(amounts).toEqual([29900]);
    const saved = await readCampaignEnvelope(campaignId);
    expect(saved?.record.condensedOffer?.extras).toEqual(["flyer", "ad_creative"]);
    expect(saved?.record.studioExtras?.selected).toEqual(["flyer", "ad_creative"]);
    expect(saved?.record.studioExtras?.records.map((r) => r.state)).toEqual(["waiting_on_client", "waiting_on_client"]);
    const binding = await readCheckoutSessionBinding(result.checkoutSessionId);
    if (!binding) throw new Error("binding missing");
    const confirmed = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: result.checkoutSessionId,
      expectedAmountCents: 29900,
      confirmedAmountCents: 29900,
      currency: "usd",
      selectedServiceIds: ["clip_repurposing"],
      decisionId: binding.decisionId,
      factFingerprint: binding.factFingerprint,
      draftRevision: binding.draftRevision,
      authorization: {
        decisionId: binding.decisionId,
        outcome: "CLEAR_TO_ACCEPT",
        paymentAuthorized: true,
        evaluatedDraftRevision: binding.draftRevision,
        selectedServiceIds: [...binding.selectedServiceIds],
        factFingerprint: binding.factFingerprint,
        decisionSchemaVersion: 2,
        evaluatedAt: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        packageId: "clip_repurposing",
      },
      stripeEventId: `evt_${campaignId}`,
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.studioExtras?.selected).toEqual(["flyer", "ad_creative"]);
    expect(confirmed.campaign.paymentTruth?.confirmedAmountCents).toBe(29900);
    expect(maximumApprovedFullRefundCents(confirmed.campaign)).toBe(29900);
  });

  it.each([
    ["social_and_promo_graphics", ["ad_creative"]],
    ["clip_repurposing", ["menu_price_list"]],
    ["clip_repurposing", ["flyer", "ad_creative", "email_and_text"]],
    ["clip_repurposing", ["ai_local_visibility"]],
  ] as const)("refuses %s with Extras %j on the server", async (packageId, extras) => {
    process.env.STRIPE_SECRET_KEY = "sk_test_condensed_unit";
    const amounts: number[] = [];
    const campaignId = `condensed-extras-bad-${Date.now()}`;
    const base = request(packageId, campaignId);
    const result = await createCheckoutSession(
      { ...base, condensedOffer: { ...base.condensedOffer!, extras: [...extras] } },
      { env: process.env, stripe: stripeDouble(amounts) as never },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("condensed_offer_invalid");
    expect(amounts).toEqual([]);
  });

  it("does not charge catalog prices when the client names a frozen SKU", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_condensed_unit";
    const result = await createCheckoutSession(
      request("v2-rtu-clip-repurposing", `condensed-reject-${Date.now()}`),
      { env: process.env, stripe: stripeDouble([]) as never },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("condensed_offer_invalid");
  });

  it("reuses one unpaid campaign and does not duplicate it after payment", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_condensed_unit";
    const campaignId = `condensed-idem-${Date.now()}`;
    const first = await createCheckoutSession(request("clip_repurposing", campaignId), {
      env: process.env,
      stripe: stripeDouble([]) as never,
    });
    const second = await createCheckoutSession(request("clip_repurposing", campaignId), {
      env: process.env,
      stripe: stripeDouble([]) as never,
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.campaignId).toBe(second.campaignId);
    expect(first.checkoutSessionId).not.toBe(second.checkoutSessionId);
    const stillOne = await readCampaignEnvelope(campaignId);
    expect(stillOne?.record.campaignId).toBe(campaignId);

    const binding = await readCheckoutSessionBinding(second.checkoutSessionId);
    expect(binding).toBeTruthy();
    if (!binding) return;
    const confirmed = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: second.checkoutSessionId,
      expectedAmountCents: 29900,
      confirmedAmountCents: 29900,
      currency: "usd",
      selectedServiceIds: ["clip_repurposing"],
      decisionId: binding.decisionId,
      factFingerprint: binding.factFingerprint,
      draftRevision: binding.draftRevision,
      authorization: {
        decisionId: binding.decisionId,
        outcome: "CLEAR_TO_ACCEPT",
        paymentAuthorized: true,
        evaluatedDraftRevision: binding.draftRevision,
        selectedServiceIds: [...binding.selectedServiceIds],
        factFingerprint: binding.factFingerprint,
        decisionSchemaVersion: 2,
        evaluatedAt: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        packageId: "clip_repurposing",
      },
      stripeEventId: `evt_${campaignId}`,
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.alreadyPaid).toBe(false);
    expect(confirmed.campaign.paymentReceivedAt).toBeTruthy();
    expect(confirmed.campaign.revisionRoundsIncluded).toBe(3);
    expect(confirmed.campaign.condensedOffer?.priceCents).toBe(37375);
    expect(confirmed.campaign.paymentTruth?.confirmedAmountCents).toBe(29900);
    expect(maximumApprovedFullRefundCents(confirmed.campaign)).toBe(29900);
    expect(confirmed.campaign.paymentTruth?.checkoutSessionId).toBe(
      second.checkoutSessionId,
    );

    const replay = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: second.checkoutSessionId,
      expectedAmountCents: 29900,
      confirmedAmountCents: 29900,
      currency: "usd",
      selectedServiceIds: ["clip_repurposing"],
      decisionId: binding.decisionId,
      factFingerprint: binding.factFingerprint,
      draftRevision: binding.draftRevision,
      authorization: {
        decisionId: binding.decisionId,
        outcome: "CLEAR_TO_ACCEPT",
        paymentAuthorized: true,
        evaluatedDraftRevision: binding.draftRevision,
        selectedServiceIds: [...binding.selectedServiceIds],
        factFingerprint: binding.factFingerprint,
        decisionSchemaVersion: 2,
        evaluatedAt: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        packageId: "clip_repurposing",
      },
      stripeEventId: `evt_${campaignId}`,
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.alreadyPaid).toBe(true);
    expect(replay.campaign.campaignId).toBe(campaignId);

    const afterPaid = await createCheckoutSession(
      request("clip_repurposing", campaignId),
      { env: process.env, stripe: stripeDouble([]) as never },
    );
    expect(afterPaid.ok).toBe(false);
    if (afterPaid.ok) return;
    expect(afterPaid.error).toBe("already_paid");
  });

  it("stops at a missing Stripe secret before creating a session", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await createCheckoutSession(
      request("social_and_promo_graphics", `condensed-nokey-${Date.now()}`),
      { env: process.env },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("processor_not_configured");
  });

  it("opens existing Project Intake for a paid condensed campaign without a file field", () => {
    const now = new Date().toISOString();
    const campaign = {
      campaignId: "condensed-intake",
      campaignName: "Cedar Lane",
      campaignStatus: "PAYMENT_RECEIVED",
      campaignDescription: "Payment confirmed by Stripe.",
      estimatedCompletion: "After payment and Project Intake",
      packageId: "custom-studio-plan",
      packageLabel: "Clip Repurposing",
      paymentReceivedAt: now,
      revisionRoundsIncluded: 3,
      createdAt: now,
      updatedAt: now,
      deliverablesDelivered: {},
      routeMapContext: {
        selectedServiceIds: [],
        jobId: "clip_repurposing",
        roadId: "random-exit",
        selectedAt: now,
        currentStep: "intake",
      },
      condensedOffer: {
        packageId: "clip_repurposing",
        name: "Clip Repurposing",
        priceCents: 37375,
        revisionRounds: 3,
        customerName: "Ada Stone",
        customerEmail: "ada@example.com",
        company: "Cedar Lane",
        projectNeed: "Announce the spring open house",
        materialsNote: "Logo is on the website",
        support: { ad_creative: "SELECT" },
      },
    } as CampaignRecord;
    expect(canOpenIntakeForCampaign(campaign)).toBe(true);
    const surface = resolveIntakeEntrySurface(campaign, "intake");
    expect(surface?.kind).toBe("form");
    if (surface?.kind !== "form") return;
    expect(surface.condensedPackageId).toBe("clip_repurposing");
    const plan = buildCondensedOfferIntakePlan({
      packageId: surface.condensedPackageId!,
      name: surface.condensedPackageName!,
    });
    const fields = [
      ...plan.sharedFields.map((field) => field.field),
      ...plan.services.flatMap((section) => section.fields),
    ];
    expect(fields.every((field) => field.type !== "select" || field.role !== "materials")).toBe(
      true,
    );
    expect(fields.some((field) => field.role === "materials" && field.required)).toBe(false);
    expect(JSON.stringify(fields)).not.toMatch(/type":"file"|upload/i);
  });

  it("fails closed for an unknown package and does not open a charge", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_condensed_unit";
    const amounts: number[] = [];
    const result = await createCheckoutSession(
      request("not_a_package", `unknown-${Date.now()}`),
      {
        env: process.env,
        stripe: stripeDouble(amounts) as never,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("condensed_offer_invalid");
    expect(amounts).toEqual([]);
  });

  it("keeps included Studio Extras off the charged amount", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_condensed_unit";
    const amounts: number[] = [];
    const body = request("clip_repurposing", `extras-${Date.now()}`);
    if (!body.condensedOffer) throw new Error("Package offer was not on the request.");
    body.condensedOffer = {
      ...body.condensedOffer,
      extras: ["flyer", "email_and_text"],
    };
    const result = await createCheckoutSession(body, {
      env: process.env,
      stripe: stripeDouble(amounts) as never,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expectedAmountCents).toBe(29900);
    expect(amounts).toEqual([29900]);
    expect(result.mode).toBe("stripe");
  });
});
