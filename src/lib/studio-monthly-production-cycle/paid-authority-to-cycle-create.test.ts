import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import { ensurePostPayActivation } from "@/lib/studio-post-pay-activation";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import {
  campaignPaidAloneCreatesMonthlyCycle,
  createSm001MonthlyProductionCycleFromPaidAuthority,
  ensureSm001MonthlyProductionCyclesFromPaidAuthority,
  findProductionCycleByPaidPurchase,
  lockSm001MonthlyCyclePeriodTruth,
  refuseSm001MonthlyProductionCycleMutation,
} from "./index";

const CYCLE_SKU = studioPaidCyclePaymentV1.skuId;

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: [CYCLE_SKU],
    projectNeed: "Need monthly social content support",
    businessName: "Harbor Oak",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need monthly social content support",
    ...overrides,
  };
}

function unpaidCampaign(
  campaignId: string,
  selectedServiceIds: string[] = [CYCLE_SKU],
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(selectedServiceIds as never);
  return {
    campaignId,
    campaignName: "Harbor Oak",
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

const PERIOD_A = {
  cycleStartDate: "2026-03-01",
  cycleEndDate: "2026-03-31",
  monthlyContentFocus: "Spring patio reopen — weekday lunch traffic",
} as const;

const PERIOD_B = {
  cycleStartDate: "2026-04-01",
  cycleEndDate: "2026-04-30",
  monthlyContentFocus: "April dinner specials — Friday nights",
} as const;

async function startAndConfirmPaidCycle(campaignId: string) {
  await upsertCampaignRecord(unpaidCampaign(campaignId));
  const started = await createCheckoutSession({
    campaignId,
    facts: clearFacts(),
    returnOrigin: "http://localhost:3000",
    preferSandbox: true,
    purchaseKind: "paid_cycle",
  });
  if (!started.ok) throw new Error("checkout failed");
  const confirmed = await confirmSandboxCheckoutSession(started.checkoutSessionId);
  if (!confirmed.ok) throw new Error("confirm failed");
  return { started, confirmed };
}

describe("STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-AUTHORITY-TO-CYCLE-CREATE-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("confirmed paid-cycle authority + period truth creates one cycle via activation", async () => {
    const campaignId = `cyc-create-${Date.now()}`;
    const { started, confirmed } = await startAndConfirmPaidCycle(campaignId);
    expect(confirmed.campaign.sm001MonthlyProductionCycles ?? []).toHaveLength(0);

    const locked = lockSm001MonthlyCyclePeriodTruth(confirmed.campaign, {
      paidCyclePurchaseId: started.paidCyclePurchaseId!,
      ...PERIOD_A,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    await upsertCampaignRecord(locked.campaign);

    const activated = await ensurePostPayActivation(locked.campaign);
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const cycles = activated.campaign.sm001MonthlyProductionCycles ?? [];
    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.paidCyclePurchaseId).toBe(started.paidCyclePurchaseId);
    expect(cycles[0]?.checkoutSessionId).toBe(started.checkoutSessionId);
    expect(cycles[0]?.campaignId).toBe(campaignId);
    expect(cycles[0]?.skuId).toBe(CYCLE_SKU);
    expect(cycles[0]?.cycleStartDate).toBe(PERIOD_A.cycleStartDate);
    expect(cycles[0]?.cycleEndDate).toBe(PERIOD_A.cycleEndDate);
    expect(cycles[0]?.monthlyContentFocus).toBe(PERIOD_A.monthlyContentFocus);
    expect(cycles[0]?.productionCycleId).toMatch(/^cyc_/);
    expect(cycles[0]?.productionCycleId).not.toBe("Current cycle");
  });

  it("unconfirmed / initiated purchase cannot create a cycle", async () => {
    const campaignId = `cyc-unconf-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const envelope = await readCampaignEnvelope(campaignId);
    const locked = lockSm001MonthlyCyclePeriodTruth(envelope!.record, {
      paidCyclePurchaseId: started.paidCyclePurchaseId!,
      ...PERIOD_A,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;

    const created = createSm001MonthlyProductionCycleFromPaidAuthority(
      locked.campaign,
      started.paidCyclePurchaseId!,
    );
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error).toBe("purchase_not_confirmed");
  });

  it("same purchase cannot create two cycles; repeated activation returns existing", async () => {
    const campaignId = `cyc-idem-${Date.now()}`;
    const { started, confirmed } = await startAndConfirmPaidCycle(campaignId);
    const locked = lockSm001MonthlyCyclePeriodTruth(confirmed.campaign, {
      paidCyclePurchaseId: started.paidCyclePurchaseId!,
      ...PERIOD_A,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;

    const first = createSm001MonthlyProductionCycleFromPaidAuthority(
      locked.campaign,
      started.paidCyclePurchaseId!,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyCreated).toBe(false);

    const second = createSm001MonthlyProductionCycleFromPaidAuthority(
      first.campaign,
      started.paidCyclePurchaseId!,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyCreated).toBe(true);
    expect(second.cycle.productionCycleId).toBe(first.cycle.productionCycleId);
    expect(second.campaign.sm001MonthlyProductionCycles).toHaveLength(1);

    await upsertCampaignRecord(second.campaign);
    const again = await ensurePostPayActivation(second.campaign);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.campaign.sm001MonthlyProductionCycles).toHaveLength(1);
    expect(again.campaign.sm001MonthlyProductionCycles?.[0]?.productionCycleId).toBe(
      first.cycle.productionCycleId,
    );
  });

  it("N+1 creates a distinct cycle from a distinct paid purchase; prior immutable", async () => {
    const campaignId = `cyc-nplus1-${Date.now()}`;
    const first = await startAndConfirmPaidCycle(campaignId);
    const lock1 = lockSm001MonthlyCyclePeriodTruth(first.confirmed.campaign, {
      paidCyclePurchaseId: first.started.paidCyclePurchaseId!,
      ...PERIOD_A,
    });
    expect(lock1.ok).toBe(true);
    if (!lock1.ok) return;
    const cyc1 = createSm001MonthlyProductionCycleFromPaidAuthority(
      lock1.campaign,
      first.started.paidCyclePurchaseId!,
    );
    expect(cyc1.ok).toBe(true);
    if (!cyc1.ok) return;
    await upsertCampaignRecord(cyc1.campaign);

    const cycle2Start = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(cycle2Start.ok).toBe(true);
    if (!cycle2Start.ok) return;
    expect(cycle2Start.paidCyclePurchaseId).not.toBe(first.started.paidCyclePurchaseId);

    const paid2 = await confirmSandboxCheckoutSession(cycle2Start.checkoutSessionId);
    expect(paid2.ok).toBe(true);
    if (!paid2.ok) return;

    const lock2 = lockSm001MonthlyCyclePeriodTruth(paid2.campaign, {
      paidCyclePurchaseId: cycle2Start.paidCyclePurchaseId!,
      ...PERIOD_B,
    });
    expect(lock2.ok).toBe(true);
    if (!lock2.ok) return;

    const activated = await ensurePostPayActivation(lock2.campaign);
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const cycles = activated.campaign.sm001MonthlyProductionCycles ?? [];
    expect(cycles).toHaveLength(2);
    const a = findProductionCycleByPaidPurchase(
      activated.campaign,
      first.started.paidCyclePurchaseId!,
    );
    const b = findProductionCycleByPaidPurchase(
      activated.campaign,
      cycle2Start.paidCyclePurchaseId!,
    );
    expect(a?.productionCycleId).toBe(cyc1.cycle.productionCycleId);
    expect(b?.productionCycleId).not.toBe(a?.productionCycleId);
    expect(b?.cycleStartDate).toBe(PERIOD_B.cycleStartDate);
    expect(a?.monthlyContentFocus).toBe(PERIOD_A.monthlyContentFocus);

    const mutate = refuseSm001MonthlyProductionCycleMutation(
      activated.campaign,
      a!.productionCycleId,
      { cycleStartDate: "2026-05-01" },
    );
    expect(mutate.ok).toBe(false);
    if (mutate.ok) return;
    expect(mutate.error).toBe("cycle_immutable");
  });

  it("backfill requires separate paid authority; prior purchase cannot open N+1", async () => {
    const campaignId = `cyc-backfill-${Date.now()}`;
    const first = await startAndConfirmPaidCycle(campaignId);
    const lock1 = lockSm001MonthlyCyclePeriodTruth(first.confirmed.campaign, {
      paidCyclePurchaseId: first.started.paidCyclePurchaseId!,
      ...PERIOD_A,
    });
    expect(lock1.ok).toBe(true);
    if (!lock1.ok) return;
    const cyc1 = createSm001MonthlyProductionCycleFromPaidAuthority(
      lock1.campaign,
      first.started.paidCyclePurchaseId!,
    );
    expect(cyc1.ok).toBe(true);
    if (!cyc1.ok) return;

    // Reusing the same paid purchase for a second period lock after cycle exists → immutable.
    const reuse = lockSm001MonthlyCyclePeriodTruth(cyc1.campaign, {
      paidCyclePurchaseId: first.started.paidCyclePurchaseId!,
      ...PERIOD_B,
    });
    expect(reuse.ok).toBe(false);
    if (reuse.ok) return;
    expect(reuse.error).toBe("cycle_immutable");

    // True backfill: new paid purchase + new period + new cycle.
    await upsertCampaignRecord(cyc1.campaign);
    const backfillStart = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      purchaseKind: "paid_cycle",
    });
    expect(backfillStart.ok).toBe(true);
    if (!backfillStart.ok) return;
    const backfillPaid = await confirmSandboxCheckoutSession(
      backfillStart.checkoutSessionId,
    );
    expect(backfillPaid.ok).toBe(true);
    if (!backfillPaid.ok) return;
    const lockBf = lockSm001MonthlyCyclePeriodTruth(backfillPaid.campaign, {
      paidCyclePurchaseId: backfillStart.paidCyclePurchaseId!,
      ...PERIOD_B,
    });
    expect(lockBf.ok).toBe(true);
    if (!lockBf.ok) return;
    const bf = createSm001MonthlyProductionCycleFromPaidAuthority(
      lockBf.campaign,
      backfillStart.paidCyclePurchaseId!,
    );
    expect(bf.ok).toBe(true);
    if (!bf.ok) return;
    expect(bf.cycle.productionCycleId).not.toBe(cyc1.cycle.productionCycleId);
    expect(bf.campaign.sm001MonthlyProductionCycles).toHaveLength(2);
  });

  it("campaign-level paid truth alone cannot create a monthly cycle", async () => {
    const campaignId = `cyc-planonly-${Date.now()}`;
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
    const confirmed = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentReceivedAt).toBeTruthy();
    expect(campaignPaidAloneCreatesMonthlyCycle()).toBe(false);

    const ensured = ensureSm001MonthlyProductionCyclesFromPaidAuthority(
      confirmed.campaign,
    );
    expect(ensured.created).toHaveLength(0);
    expect(ensured.campaign.sm001MonthlyProductionCycles ?? []).toHaveLength(0);
  });

  it("missing cycle-period truth fails closed; missing purchase id / wrong sku fail", async () => {
    const campaignId = `cyc-fail-${Date.now()}`;
    const { started, confirmed } = await startAndConfirmPaidCycle(campaignId);

    const noPeriod = createSm001MonthlyProductionCycleFromPaidAuthority(
      confirmed.campaign,
      started.paidCyclePurchaseId!,
    );
    expect(noPeriod.ok).toBe(false);
    if (noPeriod.ok) return;
    expect(noPeriod.error).toBe("missing_period_truth");

    const missingId = createSm001MonthlyProductionCycleFromPaidAuthority(
      confirmed.campaign,
      "",
    );
    expect(missingId.ok).toBe(false);
    if (missingId.ok) return;
    expect(missingId.error).toBe("missing_purchase_id");

    const badFocus = lockSm001MonthlyCyclePeriodTruth(confirmed.campaign, {
      paidCyclePurchaseId: started.paidCyclePurchaseId!,
      cycleStartDate: "2026-03-01",
      cycleEndDate: "2026-03-31",
      monthlyContentFocus: "Current cycle",
    });
    expect(badFocus.ok).toBe(false);
    if (badFocus.ok) return;
    expect(badFocus.error).toBe("missing_cycle_focus");

    const badDates = lockSm001MonthlyCyclePeriodTruth(confirmed.campaign, {
      paidCyclePurchaseId: started.paidCyclePurchaseId!,
      cycleStartDate: "2026-03-31",
      cycleEndDate: "2026-03-01",
      monthlyContentFocus: "Valid focus text",
    });
    expect(badDates.ok).toBe(false);
    if (badDates.ok) return;
    expect(badDates.error).toBe("invalid_cycle_dates");
  });

  it("renderer is not invoked; Owner routine NONE; non-monthly activation remains green", async () => {
    const campaignId = `cyc-nonmonthly-${Date.now()}`;
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
    const confirmed = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.postPayActivation?.status).toBe("activated");
    expect(confirmed.campaign.postPayActivation?.ownerActionRequired).toBe(false);
    expect(confirmed.campaign.sm001MonthlyProductionCycles ?? []).toHaveLength(0);

    // Cycle create module must not import/run the monthly renderer pipeline.
    const createSource = await import("./create");
    expect(createSource).not.toHaveProperty("runSm001MonthlyRendererPipeline");
  });
});
