/**
 * STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-IMPLEMENT-1
 * Explicit target + per-cycle N lock — no remap, observer wire, or renderer invoke.
 */

import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioSm001MonthlyDispatchCycleTargetV1 } from "@/config/studio-sm-001-monthly-dispatch-cycle-target-v1";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import type { Sm001MaterialRef } from "@/lib/studio-design-renderer/sm-001-types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import type {
  DispatchExecutionRecord,
  JobDispatchRecord,
} from "@/lib/studio-dispatch/types";
import type { PaidCyclePurchaseRecord } from "@/lib/studio-payment/paid-cycle-types";

import {
  applySm001MonthlyDispatchTargetMirror,
  clearSm001MonthlyCycleForMachineDispatch,
  createSm001MonthlyProductionCycleFromPaidAuthority,
  evaluateSm001MonthlyDispatchTargetReadiness,
  lockSm001MonthlyCyclePeriodTruth,
  lockSm001MonthlyPlannedPostCount,
  replaceSm001MonthlyProductionCycle,
} from "./index";
import type { Sm001MonthlyProductionCycleRecord } from "./types";

const SKU = studioSm001MonthlyDispatchCycleTargetV1.skuId;

const LOGO: Sm001MaterialRef = {
  materialId: "mat_logo",
  role: "logo",
  relativePath: "logo.svg",
  contentSha256: "abc123",
};

const CREATIVE_CORE = {
  materials: [LOGO] as const,
  offerName: "Weekday Lunch Special",
  priceDisplay: "$12",
  cta: "Reserve a table",
};

const CREATIVE_FULL = {
  ...CREATIVE_CORE,
  headline: "Spring patio reopen",
  body: "Come back for weekday lunch on the patio with steady Harbor Oak hospitality.",
  wasPriceDisplay: "was $16",
};

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

function confirmedPurchase(
  campaignId: string,
  paidCyclePurchaseId: string,
  checkoutSessionId: string,
): PaidCyclePurchaseRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    paidCyclePurchaseId,
    campaignId,
    skuId: SKU,
    purchaseKind: "paid_cycle",
    status: "confirmed",
    expectedAmountCents: 9900,
    cyclePriceCents: 9900,
    currency: "usd",
    checkoutSessionId,
    selectedServiceIds: [SKU],
    decisionId: `dec_${paidCyclePurchaseId}`,
    factFingerprint: `fp_${paidCyclePurchaseId}`,
    draftRevision: 1,
    initiatedAt: now,
    confirmedAt: now,
    sandbox: true,
  };
}

function monthlyDispatchRecord(
  campaignId: string,
  productionCycleId?: string,
): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: SKU,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "social" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-monthly-target",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  const base = evaluateJobDispatch({
    campaignId,
    routing,
    jobId,
    skuId: SKU,
  });
  return productionCycleId ? { ...base, productionCycleId } : base;
}

function flyerDispatchRecord(campaignId: string): JobDispatchRecord {
  const skuId = "v2-rtu-flyer" as const;
  const jobId = `${campaignId}::${skuId}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "print" as const,
    controlLane: "quick" as const,
    factFingerprint: "fp-flyer",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  return evaluateJobDispatch({ campaignId, routing, jobId, skuId });
}

function dispatchEnvelope(
  campaignId: string,
  records: JobDispatchRecord[],
): DispatchExecutionRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: studioDispatchV1.schemaVersion,
    status: studioDispatchV1.envelopeStatuses.evaluated,
    evaluatedAt: now,
    lastAttemptAt: now,
    activationCheckoutSessionId: `cs_${campaignId}`,
    records,
    ownerActionRequired: false,
    lastError: null,
  };
}

function baseCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Harbor Oak",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "monthly dispatch target implement",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    paymentTruth: {
      status: "confirmed",
      checkoutSessionId: `cs_${campaignId}`,
      confirmedAt: now,
      source: "sandbox",
    },
  };
}

function withPurchaseAndPeriod(
  campaign: CampaignRecord,
  purchaseId: string,
  period: typeof PERIOD_A | typeof PERIOD_B,
): CampaignRecord {
  const withPurchase = {
    ...campaign,
    paidCyclePurchases: [
      ...(campaign.paidCyclePurchases ?? []),
      confirmedPurchase(
        campaign.campaignId,
        purchaseId,
        `cs_${purchaseId}`,
      ),
    ],
  };
  const locked = lockSm001MonthlyCyclePeriodTruth(withPurchase, {
    paidCyclePurchaseId: purchaseId,
    ...period,
  });
  if (!locked.ok) throw new Error(locked.message);
  return locked.campaign;
}

function createCycle(
  campaign: CampaignRecord,
  purchaseId: string,
): { campaign: CampaignRecord; cycle: Sm001MonthlyProductionCycleRecord } {
  const created = createSm001MonthlyProductionCycleFromPaidAuthority(
    campaign,
    purchaseId,
  );
  if (!created.ok) throw new Error(created.message);
  return { campaign: created.campaign, cycle: created.cycle };
}

function campaignWithMonthlyDispatch(
  campaign: CampaignRecord,
  productionCycleId?: string,
): CampaignRecord {
  return {
    ...campaign,
    dispatchExecution: dispatchEnvelope(campaign.campaignId, [
      monthlyDispatchRecord(campaign.campaignId, productionCycleId),
      flyerDispatchRecord(campaign.campaignId),
    ]),
  };
}

describe("STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-IMPLEMENT-1", () => {
  it("locks N on a named cycle before targeting and mirrors into dispatch", () => {
    const campaignId = `tgt-happy-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(created.campaign);

    const locked = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    expect(locked.alreadyLocked).toBe(false);
    expect(locked.cycle.plannedPostCount).toBe(4);
    expect(locked.cycle.plannedPostCountSelection?.selectedBeforeExecution).toBe(
      true,
    );
    expect(locked.rendererInvoked).toBe(false);
    expect(locked.cycle.machineDispatchTarget).toBeFalsy();

    const targeted = clearSm001MonthlyCycleForMachineDispatch(
      locked.campaign,
      created.cycle.productionCycleId,
    );
    expect(targeted.ok).toBe(true);
    if (!targeted.ok) return;
    expect(targeted.alreadyTargeted).toBe(false);
    expect(targeted.cycle.machineDispatchTarget).toBe(true);
    expect(targeted.dispatchRecord.productionCycleId).toBe(
      created.cycle.productionCycleId,
    );
    expect(targeted.rendererInvoked).toBe(false);

    const readiness = evaluateSm001MonthlyDispatchTargetReadiness(
      targeted.campaign,
      created.cycle.productionCycleId,
    );
    expect(readiness.ready).toBe(true);
    if (!readiness.ready) return;
    expect(readiness.plannedPostCount).toBe(4);
  });

  it("same-cycle retarget is idempotent", () => {
    const campaignId = `tgt-idem-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(created.campaign);
    const locked = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;

    const first = clearSm001MonthlyCycleForMachineDispatch(
      locked.campaign,
      created.cycle.productionCycleId,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = clearSm001MonthlyCycleForMachineDispatch(
      first.campaign,
      created.cycle.productionCycleId,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyTargeted).toBe(true);
    expect(second.dispatchRecord.productionCycleId).toBe(
      created.cycle.productionCycleId,
    );
    const targets = (second.campaign.sm001MonthlyProductionCycles ?? []).filter(
      (c) => c.machineDispatchTarget,
    );
    expect(targets).toHaveLength(1);
  });

  it("second concurrent target fails closed", () => {
    const campaignId = `tgt-dual-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    campaign = withPurchaseAndPeriod(campaign, "pcp_b", PERIOD_B);
    const a = createCycle(campaign, "pcp_a");
    const b = createCycle(a.campaign, "pcp_b");
    campaign = campaignWithMonthlyDispatch(b.campaign);

    const lockA = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: a.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(lockA.ok).toBe(true);
    if (!lockA.ok) return;
    const lockB = lockSm001MonthlyPlannedPostCount(lockA.campaign, {
      productionCycleId: b.cycle.productionCycleId,
      creative: CREATIVE_FULL,
    });
    expect(lockB.ok).toBe(true);
    if (!lockB.ok) return;

    const targetA = clearSm001MonthlyCycleForMachineDispatch(
      lockB.campaign,
      a.cycle.productionCycleId,
    );
    expect(targetA.ok).toBe(true);
    if (!targetA.ok) return;

    const targetB = clearSm001MonthlyCycleForMachineDispatch(
      targetA.campaign,
      b.cycle.productionCycleId,
    );
    expect(targetB.ok).toBe(false);
    if (targetB.ok) return;
    expect(targetB.error).toBe("dual_target");
    expect(targetB.rendererInvoked).toBe(false);
  });

  it("wrong-cycle dispatch mirror fails closed", () => {
    const campaignId = `tgt-mirror-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    campaign = withPurchaseAndPeriod(campaign, "pcp_b", PERIOD_B);
    const a = createCycle(campaign, "pcp_a");
    const b = createCycle(a.campaign, "pcp_b");
    campaign = campaignWithMonthlyDispatch(
      b.campaign,
      a.cycle.productionCycleId,
    );

    const lockB = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: b.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(lockB.ok).toBe(true);
    if (!lockB.ok) return;

    const targetB = clearSm001MonthlyCycleForMachineDispatch(
      lockB.campaign,
      b.cycle.productionCycleId,
    );
    expect(targetB.ok).toBe(false);
    if (targetB.ok) return;
    expect(targetB.error).toBe("wrong_cycle_mirror");
  });

  it("insufficient N signals fail closed before target", () => {
    const campaignId = `tgt-nsig-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(created.campaign);

    const locked = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: {
        materials: [],
        offerName: "Only a name",
      },
    });
    expect(locked.ok).toBe(false);
    if (locked.ok) return;
    expect(locked.error).toBe("insufficient_n_signals");
    expect(locked.rendererInvoked).toBe(false);

    const targeted = clearSm001MonthlyCycleForMachineDispatch(
      campaign,
      created.cycle.productionCycleId,
    );
    expect(targeted.ok).toBe(false);
    if (targeted.ok) return;
    expect(targeted.error).toBe("n_not_locked");
  });

  it("N cannot mutate after lock or after target", () => {
    const campaignId = `tgt-nmut-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(created.campaign);

    const locked = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    expect(locked.cycle.plannedPostCount).toBe(4);

    const mutate = lockSm001MonthlyPlannedPostCount(locked.campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: CREATIVE_FULL,
    });
    expect(mutate.ok).toBe(false);
    if (mutate.ok) return;
    expect(mutate.error).toBe("n_already_locked");

    const targeted = clearSm001MonthlyCycleForMachineDispatch(
      locked.campaign,
      created.cycle.productionCycleId,
    );
    expect(targeted.ok).toBe(true);
    if (!targeted.ok) return;

    const afterTarget = lockSm001MonthlyPlannedPostCount(targeted.campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: CREATIVE_FULL,
    });
    expect(afterTarget.ok).toBe(false);
    if (afterTarget.ok) return;
    expect(afterTarget.error).toBe("n_immutable_after_target");
  });

  it("Cycle B cannot read Cycle A N/focus/calendar truth", () => {
    const campaignId = `tgt-iso-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    campaign = withPurchaseAndPeriod(campaign, "pcp_b", PERIOD_B);
    const a = createCycle(campaign, "pcp_a");
    const b = createCycle(a.campaign, "pcp_b");
    campaign = campaignWithMonthlyDispatch(b.campaign);

    const lockA = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: a.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(lockA.ok).toBe(true);
    if (!lockA.ok) return;

    const lockB = lockSm001MonthlyPlannedPostCount(lockA.campaign, {
      productionCycleId: b.cycle.productionCycleId,
      creative: CREATIVE_FULL,
    });
    expect(lockB.ok).toBe(true);
    if (!lockB.ok) return;

    const cycleA = lockB.campaign.sm001MonthlyProductionCycles?.find(
      (c) => c.productionCycleId === a.cycle.productionCycleId,
    );
    const cycleB = lockB.campaign.sm001MonthlyProductionCycles?.find(
      (c) => c.productionCycleId === b.cycle.productionCycleId,
    );
    expect(cycleA?.plannedPostCount).toBe(4);
    expect(cycleB?.plannedPostCount).toBe(6);
    expect(cycleA?.monthlyContentFocus).toBe(PERIOD_A.monthlyContentFocus);
    expect(cycleB?.monthlyContentFocus).toBe(PERIOD_B.monthlyContentFocus);
    expect(cycleA?.cycleStartDate).toBe(PERIOD_A.cycleStartDate);
    expect(cycleB?.cycleStartDate).toBe(PERIOD_B.cycleStartDate);
    expect(cycleA?.plannedPostCountSelection?.selectionFingerprint).not.toBe(
      cycleB?.plannedPostCountSelection?.selectionFingerprint,
    );

    const targetB = clearSm001MonthlyCycleForMachineDispatch(
      lockB.campaign,
      b.cycle.productionCycleId,
    );
    expect(targetB.ok).toBe(true);
    if (!targetB.ok) return;
    expect(targetB.dispatchRecord.productionCycleId).toBe(
      b.cycle.productionCycleId,
    );
    expect(targetB.dispatchRecord.productionCycleId).not.toBe(
      a.cycle.productionCycleId,
    );

    const aAfter = targetB.campaign.sm001MonthlyProductionCycles?.find(
      (c) => c.productionCycleId === a.cycle.productionCycleId,
    );
    expect(aAfter?.plannedPostCount).toBe(4);
    expect(aAfter?.machineDispatchTarget).toBeFalsy();
    expect(aAfter?.monthlyContentFocus).toBe(PERIOD_A.monthlyContentFocus);
  });

  it("fail closed: missing cycle, wrong campaign/sku, unpaid, missing period", () => {
    const campaignId = `tgt-fail-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(created.campaign);

    expect(
      lockSm001MonthlyPlannedPostCount(campaign, {
        productionCycleId: "",
        creative: CREATIVE_CORE,
      }).ok,
    ).toBe(false);
    expect(
      clearSm001MonthlyCycleForMachineDispatch(campaign, "").error,
    ).toBe("missing_cycle_id");

    expect(
      lockSm001MonthlyPlannedPostCount(campaign, {
        productionCycleId: "cyc_missing",
        creative: CREATIVE_CORE,
      }).error,
    ).toBe("cycle_not_found");

    const wrongCampaign = {
      ...campaign,
      campaignId: "other-campaign",
    };
    expect(
      lockSm001MonthlyPlannedPostCount(wrongCampaign, {
        productionCycleId: created.cycle.productionCycleId,
        creative: CREATIVE_CORE,
      }).error,
    ).toBe("wrong_campaign");

    const wrongSkuCycle = replaceSm001MonthlyProductionCycle(campaign, {
      ...created.cycle,
      skuId: "sm-001" as typeof created.cycle.skuId,
    });
    expect(
      lockSm001MonthlyPlannedPostCount(wrongSkuCycle, {
        productionCycleId: created.cycle.productionCycleId,
        creative: CREATIVE_CORE,
      }).error,
    ).toBe("wrong_sku");

    const unpaid = {
      ...campaign,
      paidCyclePurchases: [
        {
          ...confirmedPurchase(campaignId, "pcp_a", "cs_pcp_a"),
          status: "initiated" as const,
          confirmedAt: undefined,
        },
      ],
    };
    expect(
      lockSm001MonthlyPlannedPostCount(unpaid, {
        productionCycleId: created.cycle.productionCycleId,
        creative: CREATIVE_CORE,
      }).error,
    ).toBe("purchase_not_confirmed");

    const noFocus = replaceSm001MonthlyProductionCycle(campaign, {
      ...created.cycle,
      monthlyContentFocus: "   ",
    });
    expect(
      lockSm001MonthlyPlannedPostCount(noFocus, {
        productionCycleId: created.cycle.productionCycleId,
        creative: CREATIVE_CORE,
      }).error,
    ).toBe("missing_period_focus");
  });

  it("apply mirror preserves non-monthly records and strips invented monthly ids without target", () => {
    const campaignId = `tgt-apply-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(
      created.campaign,
      created.cycle.productionCycleId,
    );

    const stripped = applySm001MonthlyDispatchTargetMirror(
      campaign,
      campaign.dispatchExecution!.records,
    );
    const monthly = stripped.find((r) => r.skuId === SKU);
    const flyer = stripped.find((r) => r.skuId === "v2-rtu-flyer");
    expect(monthly?.productionCycleId).toBeUndefined();
    expect(flyer?.productionCycleId).toBeUndefined();
    expect(flyer?.skuId).toBe("v2-rtu-flyer");
  });

  it("renderer is not invoked by N lock or target clearance", async () => {
    const pipeline = await import(
      "@/lib/studio-design-renderer/sm-001-monthly-pipeline"
    ).catch(() => null);
    const spy = pipeline?.runSm001MonthlyRendererPipeline
      ? vi.spyOn(pipeline, "runSm001MonthlyRendererPipeline")
      : null;

    const campaignId = `tgt-norender-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(created.campaign);
    const locked = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    const targeted = clearSm001MonthlyCycleForMachineDispatch(
      locked.campaign,
      created.cycle.productionCycleId,
    );
    expect(targeted.ok).toBe(true);
    if (!targeted.ok) return;
    expect(locked.rendererInvoked).toBe(false);
    expect(targeted.rendererInvoked).toBe(false);
    expect(spy?.mock.calls.length ?? 0).toBe(0);
    spy?.mockRestore();
  });

  it("sm-001-monthly remaps to studio_design_renderer; sealed lanes stay green", () => {
    const monthly = resolveServiceProductionContract("sm-001-monthly");
    expect(monthly.status).toBe("resolved");
    if (monthly.status !== "resolved") return;
    expect(monthly.contract.primaryTool.toolId).toBe("studio_design_renderer");

    const sealed = [
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "sm-001",
    ] as const;
    for (const skuId of sealed) {
      const resolved = resolveServiceProductionContract(skuId);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).toBe(
        "studio_design_renderer",
      );
    }

    const campaignId = `tgt-flyer-${Date.now()}`;
    const flyer = flyerDispatchRecord(campaignId);
    expect(flyer.skuId).toBe("v2-rtu-flyer");
    expect(flyer.productionCycleId).toBeUndefined();
    expect(flyer.executionIdentityReady).toBe(true);
  });

  it("readiness rejects dispatch mirror mismatch without invoking renderer", () => {
    const campaignId = `tgt-ready-${Date.now()}`;
    let campaign = withPurchaseAndPeriod(
      baseCampaign(campaignId),
      "pcp_a",
      PERIOD_A,
    );
    const created = createCycle(campaign, "pcp_a");
    campaign = campaignWithMonthlyDispatch(created.campaign);
    const locked = lockSm001MonthlyPlannedPostCount(campaign, {
      productionCycleId: created.cycle.productionCycleId,
      creative: CREATIVE_CORE,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    const targeted = clearSm001MonthlyCycleForMachineDispatch(
      locked.campaign,
      created.cycle.productionCycleId,
    );
    expect(targeted.ok).toBe(true);
    if (!targeted.ok) return;

    const corrupted: CampaignRecord = {
      ...targeted.campaign,
      dispatchExecution: {
        ...targeted.campaign.dispatchExecution!,
        records: targeted.campaign.dispatchExecution!.records.map((row) =>
          row.skuId === SKU
            ? { ...row, productionCycleId: "cyc_other" }
            : row,
        ),
      },
    };
    const readiness = evaluateSm001MonthlyDispatchTargetReadiness(
      corrupted,
      created.cycle.productionCycleId,
    );
    expect(readiness.ready).toBe(false);
    if (readiness.ready) return;
    expect(readiness.error).toBe("dispatch_mirror_mismatch");
  });
});
