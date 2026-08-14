import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getServicePriceCents } from "@/catalog/accessors";
import type { CampaignRecord } from "@/config/studio-board";
import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import { deriveCheckoutAmountCents } from "./amount";
import { confirmPaymentFromProcessor } from "./confirm";
import { createCheckoutSession } from "./create-session";
import { writeCheckoutSessionBinding } from "./events-store";
import {
  campaignPaidAloneAuthorizesCycle,
  findPaidCyclePurchase,
  isPaidCyclePurchaseConfirmed,
} from "./paid-cycle-ledger";
import { derivePaidCycleCheckoutAmountCents } from "./paid-cycle-amount";
import { confirmSandboxCheckoutSession } from "./sandbox-confirm";
import { reconcileCheckoutSession } from "./reconcile";

const CYCLE_SKU = studioPaidCyclePaymentV1.skuId;

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: ["v2-rtu-flyer"],
    projectNeed: "Need a flyer for our spring open house",
    businessName: "Cedar Lane",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
    ...overrides,
  };
}

function unpaidCampaign(
  campaignId: string,
  selectedServiceIds: string[] = ["v2-rtu-flyer"],
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(selectedServiceIds as never);
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
      selectedServiceIds: [...selectedServiceIds],
      includedServiceIds: [...selectedServiceIds],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: totals.monthlySubtotalCents,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: [],
      approvedAt: now,
    },
  };
}

describe("STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-IMPLEMENT-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("derives paid-cycle amount including sm-001-monthly catalog price", () => {
    const cycleOnly = derivePaidCycleCheckoutAmountCents([CYCLE_SKU]);
    expect(cycleOnly.ok).toBe(true);
    if (!cycleOnly.ok) return;
    expect(cycleOnly.amountCents).toBe(getServicePriceCents(CYCLE_SKU));
    expect(cycleOnly.cyclePriceCents).toBe(getServicePriceCents(CYCLE_SKU));

    const mixed = derivePaidCycleCheckoutAmountCents(["v2-rtu-flyer", CYCLE_SKU]);
    expect(mixed.ok).toBe(true);
    if (!mixed.ok) return;
    expect(mixed.amountCents).toBe(
      getServicePriceCents("v2-rtu-flyer") + getServicePriceCents(CYCLE_SKU),
    );

    const planOnly = deriveCheckoutAmountCents(["v2-rtu-flyer", CYCLE_SKU]);
    expect(planOnly.ok).toBe(true);
    if (!planOnly.ok) return;
    // Sealed plan path still excludes monthly from amount-due-today.
    expect(planOnly.amountCents).toBe(getServicePriceCents("v2-rtu-flyer"));
  });

  it("valid monthly cycle purchase creates checkout with correct amount and purchase id before confirm", async () => {
    const campaignId = `pcp-create-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, [CYCLE_SKU]));

    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });

    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.purchaseKind).toBe("paid_cycle");
    expect(started.paidCyclePurchaseId).toMatch(/^pcp_/);
    expect(started.expectedAmountCents).toBe(getServicePriceCents(CYCLE_SKU));
    expect(started.cyclePriceCents).toBe(getServicePriceCents(CYCLE_SKU));

    const envelope = await readCampaignEnvelope(campaignId);
    const row = findPaidCyclePurchase(
      envelope!.record,
      started.paidCyclePurchaseId!,
    );
    expect(row?.status).toBe("initiated");
    expect(row?.checkoutSessionId).toBe(started.checkoutSessionId);
    expect(envelope?.record.paymentReceivedAt).toBeFalsy();
    expect(isPaidCyclePurchaseConfirmed(envelope!.record, started.paidCyclePurchaseId!)).toBe(
      false,
    );
  });

  it("confirmed payment creates one durable paid-cycle authority", async () => {
    const campaignId = `pcp-confirm-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, [CYCLE_SKU]));

    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const confirmed = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const rows = confirmed.campaign.paidCyclePurchases ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("confirmed");
    expect(rows[0]?.paidCyclePurchaseId).toBe(started.paidCyclePurchaseId);
    expect(rows[0]?.skuId).toBe(CYCLE_SKU);
    expect(confirmed.campaign.paymentReceivedAt).toBeTruthy();
  });

  it("duplicate sandbox confirm does not duplicate paid-cycle authority", async () => {
    const campaignId = `pcp-dup-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, [CYCLE_SKU]));

    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const first = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyPaid).toBe(true);
    expect(second.campaign.paidCyclePurchases).toHaveLength(1);
    expect(second.campaign.paidCyclePurchases?.[0]?.paidCyclePurchaseId).toBe(
      started.paidCyclePurchaseId,
    );

    // Reconcile must not invent a second authority from campaign-level paid alone.
    const reconciled = await reconcileCheckoutSession(started.checkoutSessionId);
    expect(reconciled.ok).toBe(true);
    if (!reconciled.ok) return;
    expect(reconciled.paid).toBe(true);
    expect(reconciled.campaign?.paidCyclePurchases).toHaveLength(1);
  });

  it("N+1 uses a new purchase id and session; campaign paid alone cannot authorize it", async () => {
    const campaignId = `pcp-nplus1-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, ["v2-rtu-flyer", CYCLE_SKU]));

    const cycle1 = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(cycle1.ok).toBe(true);
    if (!cycle1.ok) return;
    const paid1 = await confirmSandboxCheckoutSession(cycle1.checkoutSessionId);
    expect(paid1.ok).toBe(true);
    if (!paid1.ok) return;
    expect(paid1.campaign.paymentReceivedAt).toBeTruthy();
    expect(campaignPaidAloneAuthorizesCycle(paid1.campaign)).toBe(false);

    const cycle2 = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(cycle2.ok).toBe(true);
    if (!cycle2.ok) return;
    expect(cycle2.paidCyclePurchaseId).not.toBe(cycle1.paidCyclePurchaseId);
    expect(cycle2.checkoutSessionId).not.toBe(cycle1.checkoutSessionId);

    const beforeN1 = await readCampaignEnvelope(campaignId);
    expect(
      isPaidCyclePurchaseConfirmed(beforeN1!.record, cycle2.paidCyclePurchaseId!),
    ).toBe(false);

    const paid2 = await confirmSandboxCheckoutSession(cycle2.checkoutSessionId);
    expect(paid2.ok).toBe(true);
    if (!paid2.ok) return;
    expect(paid2.campaign.paidCyclePurchases).toHaveLength(2);
    const ids = new Set(
      (paid2.campaign.paidCyclePurchases ?? []).map((r) => r.paidCyclePurchaseId),
    );
    expect(ids.has(cycle1.paidCyclePurchaseId!)).toBe(true);
    expect(ids.has(cycle2.paidCyclePurchaseId!)).toBe(true);
    // Campaign paymentTruth session remains the first confirmed plan/cycle payment.
    expect(paid2.campaign.paymentTruth?.checkoutSessionId).toBe(cycle1.checkoutSessionId);
  });

  it("unpaid/initiated session cannot authorize a cycle", async () => {
    const campaignId = `pcp-unpaid-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, [CYCLE_SKU]));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const envelope = await readCampaignEnvelope(campaignId);
    expect(
      isPaidCyclePurchaseConfirmed(envelope!.record, started.paidCyclePurchaseId!),
    ).toBe(false);
    expect(envelope?.record.paidCyclePurchases?.[0]?.status).toBe("initiated");
  });

  it("wrong amount fails closed", async () => {
    const campaignId = `pcp-amt-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, [CYCLE_SKU]));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const decision = evaluatePreAcceptance(
      clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
    );
    const authorization = buildPreAcceptancePaymentAuthorization(decision)!;
    const result = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: started.checkoutSessionId,
      expectedAmountCents: started.expectedAmountCents,
      confirmedAmountCents: started.expectedAmountCents - 1,
      currency: "usd",
      selectedServiceIds: [CYCLE_SKU],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      authorization,
      stripeEventId: `evt_pcp_amt_${Date.now()}`,
      sandbox: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("amount_mismatch");
  });

  it("wrong SKU / missing purchase id fails closed", async () => {
    const missingSku = derivePaidCycleCheckoutAmountCents(["v2-rtu-flyer"]);
    expect(missingSku.ok).toBe(false);

    const campaignId = `pcp-sku-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, [CYCLE_SKU]));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const decision = evaluatePreAcceptance(
      clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
    );
    const authorization = buildPreAcceptancePaymentAuthorization(decision)!;

    await writeCheckoutSessionBinding({
      checkoutSessionId: started.checkoutSessionId,
      campaignId,
      expectedAmountCents: started.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [CYCLE_SKU],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      createdAt: new Date().toISOString(),
      sandbox: true,
      purchaseKind: "paid_cycle",
      // missing paidCyclePurchaseId
      cycleSkuId: CYCLE_SKU,
      cyclePriceCents: started.cyclePriceCents,
    });

    const result = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: started.checkoutSessionId,
      expectedAmountCents: started.expectedAmountCents,
      confirmedAmountCents: started.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [CYCLE_SKU],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      authorization,
      stripeEventId: `evt_pcp_missing_${Date.now()}`,
      sandbox: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("paid_cycle_invalid");
  });

  it("mismatched session↔purchase and campaign fail closed; prior purchase cannot be reused", async () => {
    const campaignId = `pcp-reuse-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId, [CYCLE_SKU]));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const paid = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;

    const decision = evaluatePreAcceptance(
      clearFacts({
        selectedServiceIds: [CYCLE_SKU],
        projectNeed: "Need monthly social content support",
        riskScanText: "Need monthly social content support",
      }),
    );
    const authorization = buildPreAcceptancePaymentAuthorization(decision)!;
    const forgedSession = `cs_sandbox_reuse_${Date.now()}`;

    await writeCheckoutSessionBinding({
      checkoutSessionId: forgedSession,
      campaignId,
      expectedAmountCents: started.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [CYCLE_SKU],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      createdAt: new Date().toISOString(),
      sandbox: true,
      purchaseKind: "paid_cycle",
      paidCyclePurchaseId: started.paidCyclePurchaseId,
      cycleSkuId: CYCLE_SKU,
      cyclePriceCents: started.cyclePriceCents,
    });

    const reuse = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: forgedSession,
      expectedAmountCents: started.expectedAmountCents,
      confirmedAmountCents: started.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [CYCLE_SKU],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      authorization,
      stripeEventId: `evt_pcp_reuse_${Date.now()}`,
      sandbox: true,
    });
    expect(reuse.ok).toBe(false);
    if (reuse.ok) return;
    expect(reuse.error).toBe("purchase_mismatch");

    const other = `pcp-other-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(other, [CYCLE_SKU]));
    const cross = await confirmPaymentFromProcessor({
      campaignId: other,
      checkoutSessionId: started.checkoutSessionId,
      expectedAmountCents: started.expectedAmountCents,
      confirmedAmountCents: started.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [CYCLE_SKU],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      authorization,
      stripeEventId: `evt_pcp_cross_${Date.now()}`,
      sandbox: true,
    });
    expect(cross.ok).toBe(false);
    if (cross.ok) return;
    expect(cross.error).toBe("transaction_reuse");
  });

  it("client sync cannot invent paidCyclePurchases", () => {
    const existing = unpaidCampaign("pcp-sync-lock", [CYCLE_SKU]);
    const forged = {
      ...existing,
      paidCyclePurchases: [
        {
          schemaVersion: 1 as const,
          paidCyclePurchaseId: "pcp_forged",
          campaignId: existing.campaignId,
          skuId: CYCLE_SKU,
          purchaseKind: "paid_cycle" as const,
          status: "confirmed" as const,
          expectedAmountCents: 34900,
          cyclePriceCents: 34900,
          currency: "usd" as const,
          checkoutSessionId: "cs_forged",
          selectedServiceIds: [CYCLE_SKU],
          decisionId: "dec",
          factFingerprint: "fp",
          draftRevision: 1,
          initiatedAt: new Date().toISOString(),
          confirmedAt: new Date().toISOString(),
        },
      ],
    };
    const merged = mergeCustomerOwnedCampaignSync(existing, forged);
    expect(merged.paidCyclePurchases).toBeUndefined();
  });

  it("non-monthly studio_plan checkout remains green and does not invent cycle authority", async () => {
    const campaignId = `pcp-plan-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.paidCyclePurchaseId).toBeUndefined();
    expect(started.expectedAmountCents).toBe(getServicePriceCents("v2-rtu-flyer"));

    const confirmed = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentTruth?.status).toBe("confirmed");
    expect(confirmed.campaign.paidCyclePurchases ?? []).toHaveLength(0);
    expect(confirmed.campaign.postPayActivation?.status).toBe("activated");
  });
});
