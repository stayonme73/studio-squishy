/**
 * STUDIO-OPERATING-DESIGN-MA-001-POSTPAY-COMPOSITION-DISPATCH-STRUCTURE-1
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import {
  mapMa001CompositionFromLiveTruth,
  type Ma001LiveCompositionInput,
} from "./ma-001-intake-truth";
import { sealMa001CompositionForPayment } from "./ma-001-composition-payment-gate";
import {
  assertMa001PostPayStructureDispatchReady,
  assertMa001PostPayStructureMatchesPaymentSeal,
  assertMa001PostPayStructureNoSilentMemberMutation,
  buildMa001PostPayDispatchStructureFromCampaign,
  buildMa001PostPayDispatchStructureFromPaymentSeal,
  ensureMa001PostPayDispatchStructureOnCampaign,
} from "./ma-001-postpay-composition-dispatch-structure";

function fourMemberInput(): Ma001LiveCompositionInput {
  return {
    lockedPackMemberCount: 4,
    campaignFocus: "Spring Tune-Up + Drain Clear",
    members: [
      { kindLabel: "Flyer", purpose: "Launch flyer for the spring offer" },
      { kindLabel: "Business card", purpose: "Contact card for Jordan Hale" },
      { kindLabel: "Service sheet", purpose: "Service list handout" },
      {
        kindLabel: "Campaign graphic",
        purpose: "Social square campaign graphic",
        agreedFormatLabel: "Square (social / feed)",
      },
    ],
  };
}

function oneMemberInput(): Ma001LiveCompositionInput {
  return {
    lockedPackMemberCount: 1,
    campaignFocus: "Spring open house",
    members: [
      { kindLabel: "Flyer", purpose: "Launch flyer for the spring offer" },
    ],
  };
}

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: ["ma-001"],
    projectNeed: "Need a Promotion Pack for our spring campaign",
    businessName: "Cedar Lane",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a Promotion Pack for our spring campaign",
    ...overrides,
  };
}

function unpaidCampaign(
  campaignId: string,
  skuIds: string[] = ["ma-001"],
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(skuIds as never);
  return {
    campaignId,
    campaignName: "Cedar Lane",
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

describe("ma-001 postpay composition → dispatch structure", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    /* no-op */
  });

  it("maps paid 4-member seal → durable members + producer families + plates", () => {
    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);
    const built = buildMa001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    expect(built.rendererInvoked).toBe(false);
    if (!built.ok) return;

    expect(built.structure.status).toBe(
      "paid_composition_dispatch_structure_ready",
    );
    expect(built.structure.lockedPackMemberCount).toBe(4);
    expect(built.structure.compositionFingerprint).toBe(
      seal.compositionFingerprint,
    );
    expect(built.structure.remapAuthorized).toBe(false);
    expect(built.structure.dispatchHookAuthorized).toBe(false);
    expect(built.structure.members.map((m) => m.kind)).toEqual([
      "flyer",
      "business_card",
      "service_sheet",
      "promotion_graphic",
    ]);
    expect(built.structure.members.map((m) => m.producerFamily)).toEqual([
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-service-sheet",
      "v2-rtu-promotion-graphics-single-adapter",
    ]);
    expect(built.structure.members.every((m) => m.agreedPlateId.length > 0)).toBe(
      true,
    );
    expect(built.structure.members.map((m) => m.memberId)).toEqual([
      ...seal.memberIds,
    ]);
    expect(built.structure.members.map((m) => m.order)).toEqual([
      ...seal.memberOrder,
    ]);

    const ready = assertMa001PostPayStructureDispatchReady(built.structure);
    expect(ready.ok).toBe(true);
  });

  it("sandbox payment attaches post-pay structure from paymentTruth seal", async () => {
    const campaignId = `ma001-postpay-4m-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      ma001PackComposition: fourMemberInput(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const seal = confirmed.campaign.paymentTruth?.ma001CompositionSeal;
    expect(seal).toBeTruthy();
    const structure = confirmed.campaign.ma001PostPayDispatchStructure;
    expect(structure).toBeTruthy();
    expect(structure?.compositionFingerprint).toBe(seal?.compositionFingerprint);
    expect(structure?.lockedPackMemberCount).toBe(4);
    expect(structure?.members).toHaveLength(4);
    expect(structure?.rendererInvoked).toBe(false);
    expect(structure?.dispatchHookAuthorized).toBe(false);

    const fromCampaign = buildMa001PostPayDispatchStructureFromCampaign(
      confirmed.campaign,
    );
    expect(fromCampaign.ok).toBe(true);
    if (!fromCampaign.ok) return;
    expect(fromCampaign.structure.members.map((m) => m.memberId)).toEqual(
      structure!.members.map((m) => m.memberId),
    );
  });

  it("1-member paid pack structure preserves single identity", async () => {
    const campaignId = `ma001-postpay-1m-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      ma001PackComposition: oneMemberInput(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.ma001PostPayDispatchStructure?.members).toHaveLength(
      1,
    );
    expect(
      confirmed.campaign.ma001PostPayDispatchStructure?.members[0]?.kind,
    ).toBe("flyer");
  });

  it("fail closed: missing payment seal", () => {
    const built = buildMa001PostPayDispatchStructureFromPaymentSeal(null);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.code).toBe("MISSING_PAYMENT_SEAL");
  });

  it("fail closed: silent member drop", () => {
    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);
    const built = buildMa001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const dropped = {
      ...built.structure,
      members: built.structure.members.slice(0, 3),
    };
    const check = assertMa001PostPayStructureNoSilentMemberMutation({
      seal,
      attempted: dropped,
    });
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.code).toBe("MEMBER_DROPPED");
  });

  it("fail closed: silent member swap (kind/id)", () => {
    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);
    const built = buildMa001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const swapped = {
      ...built.structure,
      members: [
        built.structure.members[1]!,
        built.structure.members[0]!,
        built.structure.members[2]!,
        built.structure.members[3]!,
      ],
    };
    const check = assertMa001PostPayStructureMatchesPaymentSeal(swapped, seal);
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.code).toBe("MEMBER_SWAPPED");
  });

  it("fail closed: plate/output truth mutation after payment", () => {
    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);
    const built = buildMa001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const tampered = {
      ...built.structure,
      members: built.structure.members.map((m, i) =>
        i === 0 ? { ...m, agreedPlateId: "forged-plate" } : m,
      ),
    };
    const check = assertMa001PostPayStructureMatchesPaymentSeal(tampered, seal);
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.code).toBe("STRUCTURE_TAMPERED");
  });

  it("fail closed: producer family swap", () => {
    const mapped = mapMa001CompositionFromLiveTruth(oneMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);
    const built = buildMa001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const tampered = {
      ...built.structure,
      members: [
        {
          ...built.structure.members[0]!,
          producerFamily: "v2-rtu-menu",
        },
      ],
    };
    const check = assertMa001PostPayStructureMatchesPaymentSeal(tampered, seal);
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.code).toBe("PRODUCER_FAMILY_MISMATCH");
  });

  it("ensure is idempotent when structure already matches seal", () => {
    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);
    const campaign: CampaignRecord = {
      ...unpaidCampaign(`ma001-postpay-idem-${Date.now()}`),
      paymentReceivedAt: new Date().toISOString(),
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 49500,
        selectedServiceIds: ["ma-001"],
        decisionId: "d1",
        factFingerprint: "fp",
        draftRevision: 1,
        ma001CompositionSeal: seal,
      },
    };
    const first = ensureMa001PostPayDispatchStructureOnCampaign(campaign);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyPresent).toBe(false);
    const second = ensureMa001PostPayDispatchStructureOnCampaign(first.campaign);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyPresent).toBe(true);
  });

  it("ordinary non-ma-001 paid campaign does not invent pack structure", async () => {
    const campaignId = `ma001-postpay-non-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, ["v2-rtu-flyer"]));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: ["v2-rtu-flyer"],
        projectNeed: "Need a flyer for our spring open house",
        riskScanText: "Need a flyer for our spring open house",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.ma001PostPayDispatchStructure).toBeUndefined();
  });

  it("eight sealed lanes remain green (remap contracts untouched)", () => {
    const sealed = [
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "sm-001",
      "sm-001-monthly",
    ] as const;
    for (const skuId of sealed) {
      const resolved = resolveServiceProductionContract(skuId);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }
  });
});
