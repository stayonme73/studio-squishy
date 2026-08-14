/**
 * STUDIO-OPERATING-DESIGN-RM-J002-POSTPAY-KIT-DISPATCH-STRUCTURE-1
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import {
  mapRmJ002KitLockFromLiveTruth,
  type RmJ002LiveKitLockInput,
} from "./rm-j002-intake-truth";
import { sealRmJ002KitForPayment } from "./rm-j002-kit-payment-gate";
import {
  assertRmJ002PostPayStructureDispatchReady,
  assertRmJ002PostPayStructureMatchesPaymentSeal,
  assertRmJ002PostPayStructureNoSilentKitMutation,
  buildRmJ002PostPayDispatchStructureFromCampaign,
  buildRmJ002PostPayDispatchStructureFromPaymentSeal,
  ensureRmJ002PostPayDispatchStructureOnCampaign,
} from "./rm-j002-postpay-kit-dispatch-structure";
import {
  DESIGN_RENDERER_RM_J002_SKU,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
} from "./rm-j002-types";

function harborLock(
  overrides: Partial<RmJ002LiveKitLockInput> = {},
): RmJ002LiveKitLockInput {
  return {
    platform: "Facebook",
    businessName: "Harbor & Oak Studio",
    displayName: "Harbor & Oak Studio",
    profileGoal:
      "Show a calm portrait photography studio that books discovery calls.",
    currentProfileNotes:
      "New professional profile. Emphasize downtown sessions and clear booking link.",
    website: "https://harbor-and-oak.example",
    phone: "(555) 014-2200",
    brandNotes: "Logo harbor-oak-anchor.svg — warm oak + soft harbor blue.",
    ...overrides,
  };
}

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: [DESIGN_RENDERER_RM_J002_SKU],
    projectNeed: "Need a Social Profile Setup Kit",
    businessName: "Harbor & Oak Studio",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a Social Profile Setup Kit",
    ...overrides,
  };
}

function unpaidCampaign(
  campaignId: string,
  skuIds: string[] = [DESIGN_RENDERER_RM_J002_SKU],
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(skuIds as never);
  return {
    campaignId,
    campaignName: "Harbor & Oak Studio",
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Awaiting payment",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: null,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...skuIds] as never,
      includedServiceIds: [...skuIds] as never,
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: [],
      approvedAt: now,
    },
  };
}

function sealFor(platform: "Facebook" | "Instagram" | "TikTok") {
  const mapped = mapRmJ002KitLockFromLiveTruth(harborLock({ platform }));
  if (!mapped.ok) throw new Error(mapped.message);
  return sealRmJ002KitForPayment(mapped.truth);
}

describe("STUDIO-OPERATING-DESIGN-RM-J002-POSTPAY-KIT-DISPATCH-STRUCTURE-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    /* no-op */
  });

  it("maps paid Facebook seal → 4 durable members with avatar + cover plates", () => {
    const seal = sealFor("Facebook");
    const built = buildRmJ002PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.rendererInvoked).toBe(false);
    expect(built.structure.status).toBe("paid_kit_dispatch_structure_ready");
    expect(built.structure.platform).toBe("facebook");
    expect(built.structure.lockedKitMemberCount).toBe(4);
    expect(built.structure.members.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
    ]);
    expect(built.structure.members.map((m) => m.productionRole)).toEqual([
      "copy",
      "field_map",
      "avatar",
      "page_cover",
    ]);
    const avatar = built.structure.members.find((m) => m.memberId === "profile_image")!;
    expect(avatar.agreedPlateId).toBe(RM_J002_AVATAR_PLATE.plateId);
    const cover = built.structure.members.find((m) => m.memberId === "page_cover")!;
    expect(cover.agreedPlateId).toBe(RM_J002_FACEBOOK_COVER_PLATE.plateId);
    expect(built.structure.credentialsPresent).toBe(false);
    expect(built.structure.customerApplies).toBe(true);
    expect(built.structure.remapAuthorized).toBe(false);
    expect(built.structure.dispatchHookAuthorized).toBe(false);
    expect(built.structure.composerInvoked).toBe(false);
    expect(assertRmJ002PostPayStructureDispatchReady(built.structure).ok).toBe(
      true,
    );
  });

  it("maps Instagram / TikTok → 3 members · no cover", () => {
    for (const platform of ["Instagram", "TikTok"] as const) {
      const seal = sealFor(platform);
      const built = buildRmJ002PostPayDispatchStructureFromPaymentSeal(seal);
      expect(built.ok).toBe(true);
      if (!built.ok) return;
      expect(built.structure.lockedKitMemberCount).toBe(3);
      expect(
        built.structure.members.some((m) => m.memberId === "page_cover"),
      ).toBe(false);
      expect(
        built.structure.members.some((m) => m.productionRole === "page_cover"),
      ).toBe(false);
    }
  });

  it("missing seal / unpaid fail closed", () => {
    expect(buildRmJ002PostPayDispatchStructureFromPaymentSeal(null).ok).toBe(
      false,
    );
    const unpaid = unpaidCampaign(`rmj002-postpay-unpaid-${Date.now()}`);
    const fromCampaign = buildRmJ002PostPayDispatchStructureFromCampaign(unpaid);
    expect(fromCampaign.ok).toBe(false);
    if (!fromCampaign.ok) expect(fromCampaign.code).toBe("RM_J002_NOT_PAID");
  });

  it("sandbox payment attaches durable structure from seal", async () => {
    const campaignId = `rmj002-postpay-ok-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj002KitLock: harborLock(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    const structure = confirmed.campaign.rmJ002PostPayDispatchStructure;
    expect(structure).toBeTruthy();
    expect(structure?.platform).toBe("facebook");
    expect(structure?.lockedKitMemberCount).toBe(4);
    expect(structure?.kitFingerprint).toBe(
      confirmed.campaign.paymentTruth?.rmj002KitSeal?.kitFingerprint,
    );
    expect(structure?.members.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
    ]);
  });

  it("fail closed: cover disappear / appear, avatar missing, kind swap, plate tamper, platform change", () => {
    const seal = sealFor("Facebook");
    const built = buildRmJ002PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const noCover = {
      ...built.structure,
      lockedKitMemberCount: 3 as const,
      members: built.structure.members.filter((m) => m.memberId !== "page_cover"),
    };
    expect(
      assertRmJ002PostPayStructureMatchesPaymentSeal(noCover, seal).ok,
    ).toBe(false);

    const igSeal = sealFor("Instagram");
    const igBuilt = buildRmJ002PostPayDispatchStructureFromPaymentSeal(igSeal);
    expect(igBuilt.ok).toBe(true);
    if (!igBuilt.ok) return;
    const withCover = {
      ...igBuilt.structure,
      lockedKitMemberCount: 4 as const,
      members: [
        ...igBuilt.structure.members,
        {
          memberId: "page_cover",
          order: 4,
          kind: "design_page_cover" as const,
          memberPurpose: "illegal",
          productionRole: "page_cover" as const,
          agreedPlateId: RM_J002_FACEBOOK_COVER_PLATE.plateId,
          plateRequired: true,
          customerApplies: true as const,
          accountMutation: false as const,
        },
      ],
    };
    expect(
      assertRmJ002PostPayStructureMatchesPaymentSeal(withCover, igSeal).ok,
    ).toBe(false);

    const noAvatar = {
      ...built.structure,
      members: built.structure.members.map((m) =>
        m.memberId === "profile_image"
          ? { ...m, memberId: "profile_image_gone" }
          : m,
      ),
    };
    const avatarCheck = assertRmJ002PostPayStructureMatchesPaymentSeal(
      noAvatar,
      seal,
    );
    expect(avatarCheck.ok).toBe(false);

    const kindSwap = {
      ...built.structure,
      members: built.structure.members.map((m, i) =>
        i === 0 ? { ...m, kind: "field_map_package" as const } : m,
      ),
    };
    expect(
      assertRmJ002PostPayStructureMatchesPaymentSeal(kindSwap, seal).ok,
    ).toBe(false);

    const plateTamper = {
      ...built.structure,
      members: built.structure.members.map((m) =>
        m.memberId === "profile_image"
          ? { ...m, agreedPlateId: "tampered-plate" }
          : m,
      ),
    };
    const plateCheck = assertRmJ002PostPayStructureMatchesPaymentSeal(
      plateTamper,
      seal,
    );
    expect(plateCheck.ok).toBe(false);
    if (!plateCheck.ok) expect(plateCheck.code).toBe("PLATE_TAMPER");

    const platformChange = assertRmJ002PostPayStructureNoSilentKitMutation({
      seal,
      attempted: { ...built.structure, platform: "tiktok" },
    });
    expect(platformChange.ok).toBe(false);
    if (!platformChange.ok) {
      expect(platformChange.code).toBe("POST_PAYMENT_PLATFORM_MUTATION");
    }

    const creds = assertRmJ002PostPayStructureMatchesPaymentSeal(
      { ...built.structure, credentialsPresent: false, mutationRequested: true as never },
      seal,
    );
    // mutationRequested typed false — force via cast
    const withMutation = {
      ...built.structure,
      mutationRequested: true,
    } as typeof built.structure;
    expect(
      assertRmJ002PostPayStructureMatchesPaymentSeal(withMutation, seal).ok,
    ).toBe(false);
    void creds;
  });

  it("ensure is idempotent; never mutates paymentTruth", async () => {
    const campaignId = `rmj002-postpay-idem-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj002KitLock: harborLock({ platform: "Instagram" }),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const first = ensureRmJ002PostPayDispatchStructureOnCampaign(
      confirmed.campaign,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyPresent).toBe(true);
    const sealFp = confirmed.campaign.paymentTruth?.rmj002KitSeal?.kitFingerprint;
    const second = ensureRmJ002PostPayDispatchStructureOnCampaign(first.campaign);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyPresent).toBe(true);
    expect(second.campaign.paymentTruth?.rmj002KitSeal?.kitFingerprint).toBe(
      sealFp,
    );
    expect(second.structure.platform).toBe("instagram");
  });

  it("non-rm-j002 paid campaign does not invent kit structure", async () => {
    const campaignId = `rmj002-postpay-skip-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, ["bf-001"]));
    // bf-001 alone may not clear pre-acceptance — build from a synthetic confirmed campaign
    const campaign: CampaignRecord = {
      ...unpaidCampaign(campaignId, ["bf-001"]),
      paymentReceivedAt: new Date().toISOString(),
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 9900,
        selectedServiceIds: ["bf-001"],
        decisionId: "d1",
        factFingerprint: "f1",
        draftRevision: 1,
        confirmedAt: new Date().toISOString(),
      },
    };
    const built = buildRmJ002PostPayDispatchStructureFromCampaign(campaign);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("RM_J002_NOT_PAID");
    expect(campaign.rmJ002PostPayDispatchStructure).toBeUndefined();
  });
});
