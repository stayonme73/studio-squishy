/**
 * STUDIO-OPERATING-DESIGN-MA-001-COMPOSITION-PAYMENT-GATE-1
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import {
  readMa001PackComposition,
  writeMa001PackComposition,
} from "@/lib/conversation-room-draft/ma-001-composition";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import {
  readCheckoutSessionBinding,
  writeCheckoutSessionBinding,
} from "@/lib/studio-payment/events-store";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";

import {
  assertMa001CompositionUnchangedAfterCheckoutAuthority,
  assertMa001PlanCompositionFresh,
  customerFacingCompositionLines,
  evaluateMa001CompositionPaymentGate,
  fingerprintMa001CompositionTruth,
  sealMa001CompositionForPayment,
} from "./ma-001-composition-payment-gate";
import {
  mapMa001CompositionFromLiveTruth,
  type Ma001LiveCompositionInput,
} from "./ma-001-intake-truth";

function oneMemberInput(): Ma001LiveCompositionInput {
  return {
    lockedPackMemberCount: 1,
    campaignFocus: "Spring open house",
    members: [
      {
        kindLabel: "Flyer",
        purpose: "Launch flyer for the spring offer",
      },
    ],
  };
}

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

function editableDraft(
  composition?: Ma001LiveCompositionInput | null,
): WorkingDraftRecord {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: new Date().toISOString(),
    revision: 1,
    cursor: {},
    attribution: [],
    slices: composition
      ? { ma001PackComposition: composition }
      : {},
  };
}

describe("ma-001 composition payment gate (COMPOSITION-PAYMENT-GATE-1)", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    /* no-op */
  });

  it("valid 1-member pack can reach payment (sandbox)", async () => {
    const campaignId = `ma001-gate-1m-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const composition = oneMemberInput();
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      ma001PackComposition: composition,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.mode).toBe("sandbox");

    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    const seal = confirmed.campaign.paymentTruth?.ma001CompositionSeal;
    expect(seal).toBeTruthy();
    expect(seal?.lockedPackMemberCount).toBe(1);
    expect(seal?.customerKindLabels).toEqual(["Flyer"]);
    expect(seal?.memberKinds).toEqual(["flyer"]);
  });

  it("valid 4-member mixed pack can reach payment (sandbox)", async () => {
    const campaignId = `ma001-gate-4m-${Date.now()}`;
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
    expect(seal?.lockedPackMemberCount).toBe(4);
    expect(seal?.customerKindLabels).toEqual([
      "Flyer",
      "Business card",
      "Service sheet",
      "Campaign graphic",
    ]);
    expect(seal?.compositionFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("SKU-only purchase is rejected", async () => {
    const gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: ["ma-001"],
      composition: null,
    });
    expect(gate.ok).toBe(false);
    if (gate.ok) return;
    expect(gate.code).toBe("SKU_ONLY_INSUFFICIENT");

    const campaignId = `ma001-gate-sku-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
    });
    expect(started.ok).toBe(false);
    if (started.ok) return;
    expect(started.error).toBe("ma001_composition_required");
  });

  it("malformed composition rejected (count/member mismatch)", () => {
    const gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: ["ma-001"],
      composition: {
        lockedPackMemberCount: 3,
        campaignFocus: "Focus",
        members: [
          { kindLabel: "Flyer", purpose: "A" },
          { kindLabel: "Menu", purpose: "B" },
        ],
      },
    });
    expect(gate.ok).toBe(false);
  });

  it("unsupported kind rejected", () => {
    const gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: ["ma-001"],
      composition: {
        lockedPackMemberCount: 1,
        campaignFocus: "Focus",
        members: [{ kindLabel: "Poster", purpose: "No" }],
      },
    });
    expect(gate.ok).toBe(false);
    if (gate.ok) return;
    expect(gate.message).toMatch(/UNSUPPORTED_KIND|unsupported/i);
  });

  it("duplicate member ID rejected", () => {
    const mapped = mapMa001CompositionFromLiveTruth(oneMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const forged = {
      ...mapped.truth,
      lockedPackMemberCount: 2 as const,
      plannedPackMembers: [
        mapped.truth.plannedPackMembers[0]!,
        { ...mapped.truth.plannedPackMembers[0]!, order: 2 },
      ],
      customerKindLabels: ["Flyer", "Flyer"],
    };
    const gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: ["ma-001"],
      composition: forged,
    });
    expect(gate.ok).toBe(false);
    if (gate.ok) return;
    expect(gate.message).toMatch(/DUPLICATE_MEMBER_ID/);
  });

  it("missing member rejected", () => {
    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const forged = {
      ...mapped.truth,
      plannedPackMembers: mapped.truth.plannedPackMembers.slice(0, 3),
    };
    const gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: ["ma-001"],
      composition: forged,
    });
    expect(gate.ok).toBe(false);
  });

  it("payment binds exact composition; forged seal fails closed", async () => {
    const campaignId = `ma001-gate-bind-${Date.now()}`;
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

    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const forgedSeal = sealMa001CompositionForPayment(mapped.truth);

    const binding = await readCheckoutSessionBinding(started.checkoutSessionId);
    expect(binding?.ma001CompositionSeal).toBeTruthy();
    expect(binding?.ma001CompositionSeal?.lockedPackMemberCount).toBe(1);

    const authorization = {
      decisionId: binding!.decisionId,
      outcome: "CLEAR_TO_ACCEPT" as const,
      paymentAuthorized: true as const,
      evaluatedDraftRevision: binding!.draftRevision,
      selectedServiceIds: [...binding!.selectedServiceIds],
      factFingerprint: binding!.factFingerprint,
      decisionSchemaVersion: 1,
      evaluatedAt: binding!.createdAt,
      authorizedAt: new Date().toISOString(),
      packageId: "custom-studio-plan",
    };

    const forged = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: started.checkoutSessionId,
      expectedAmountCents: started.expectedAmountCents,
      confirmedAmountCents: started.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: ["ma-001"],
      decisionId: binding!.decisionId,
      factFingerprint: binding!.factFingerprint,
      draftRevision: binding!.draftRevision,
      authorization,
      sandbox: true,
      ma001CompositionSeal: forgedSeal,
    });
    expect(forged.ok).toBe(false);
    if (forged.ok) return;
    expect(forged.error).toBe("sku_mismatch");
  });

  it("post-checkout composition mutation fails closed", async () => {
    const mapped = mapMa001CompositionFromLiveTruth(oneMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);

    const mutated = assertMa001CompositionUnchangedAfterCheckoutAuthority({
      sealed: seal,
      attempted: fourMemberInput(),
    });
    expect(mutated.ok).toBe(false);
    if (mutated.ok) return;
    expect(mutated.code).toBe("POST_CHECKOUT_COMPOSITION_MUTATION");

    const purchased: WorkingDraftRecord = {
      ...editableDraft(oneMemberInput()),
      status: "purchased",
      editable: false,
    };
    const write = writeMa001PackComposition(purchased, fourMemberInput());
    expect(write.ok).toBe(false);
    if (write.ok) return;
    expect(write.code).toBe("NOT_EDITABLE");
  });

  it("stale plan composition fails closed", () => {
    const a = mapMa001CompositionFromLiveTruth(oneMemberInput());
    const b = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const stale = assertMa001PlanCompositionFresh({
      displayedFingerprint: fingerprintMa001CompositionTruth(a.truth),
      liveComposition: b.truth,
    });
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.code).toBe("STALE_PLAN_COMPOSITION");
  });

  it("Studio Plan customer lines use plain labels (no producer jargon)", () => {
    const mapped = mapMa001CompositionFromLiveTruth(fourMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const lines = customerFacingCompositionLines(mapped.truth);
    expect(lines.some((l) => /Flyer/.test(l))).toBe(true);
    expect(lines.join(" ")).not.toMatch(/v2-rtu|producerFamily|pack-member-\d/);
    const draft = editableDraft();
    const written = writeMa001PackComposition(draft, fourMemberInput());
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const read = readMa001PackComposition(written.draft);
    expect(read).toBeTruthy();
  });

  it("ordinary non-pack checkout remains green", async () => {
    const campaignId = `ma001-gate-nonpack-${Date.now()}`;
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
    expect(confirmed.campaign.paymentTruth?.ma001CompositionSeal).toBeUndefined();
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
    const pack = resolveServiceProductionContract("ma-001");
    // ma-001 not remapped in this package — composition gate only
    expect(pack.status === "resolved" || pack.status === "unresolved").toBe(true);
  });

  it("client-forged composition after authority without matching binding fails", async () => {
    const campaignId = `ma001-gate-forge-bind-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const mapped = mapMa001CompositionFromLiveTruth(oneMemberInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const seal = sealMa001CompositionForPayment(mapped.truth);
    const sessionId = `cs_sandbox_forge_${Date.now()}`;
    await writeCheckoutSessionBinding({
      checkoutSessionId: sessionId,
      campaignId,
      expectedAmountCents: 49500,
      currency: "usd",
      selectedServiceIds: ["ma-001"],
      decisionId: "decision-forge",
      factFingerprint: "fp-forge",
      draftRevision: 1,
      createdAt: new Date().toISOString(),
      sandbox: true,
      purchaseKind: "studio_plan",
      // Intentionally omit seal — confirm must reject client-supplied seal
    });

    const result = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: sessionId,
      expectedAmountCents: 49500,
      confirmedAmountCents: 49500,
      currency: "usd",
      selectedServiceIds: ["ma-001"],
      decisionId: "decision-forge",
      factFingerprint: "fp-forge",
      draftRevision: 1,
      authorization: {
        decisionId: "decision-forge",
        outcome: "CLEAR_TO_ACCEPT",
        paymentAuthorized: true,
        evaluatedDraftRevision: 1,
        selectedServiceIds: ["ma-001"],
        factFingerprint: "fp-forge",
        decisionSchemaVersion: 1,
        evaluatedAt: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        packageId: "custom-studio-plan",
      },
      sandbox: true,
      ma001CompositionSeal: seal,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("sku_mismatch");
  });
});
