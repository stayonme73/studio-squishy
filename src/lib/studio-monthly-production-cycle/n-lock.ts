/**
 * Per-cycle plannedPostCount lock for sm-001-monthly.
 * Reuses selectSm001PlannedPostCount. Never asks the customer for a count.
 * Never pads. Never invokes the renderer.
 */

import { studioSm001MonthlyDispatchCycleTargetV1 } from "@/config/studio-sm-001-monthly-dispatch-cycle-target-v1";
import type { CampaignRecord } from "@/config/studio-board";
import {
  collectSm001NSelectSignals,
  selectSm001PlannedPostCount,
} from "@/lib/studio-design-renderer/sm-001-n-select";
import type {
  Sm001MaterialRef,
  Sm001PlannedPostCountSelection,
} from "@/lib/studio-design-renderer/sm-001-types";
import { findPaidCyclePurchase } from "@/lib/studio-payment/paid-cycle-ledger";

import {
  findProductionCycleById,
  replaceSm001MonthlyProductionCycle,
} from "./create";
import { validateExplicitCyclePeriod } from "./period";
import type { Sm001MonthlyProductionCycleRecord } from "./types";

export type Sm001MonthlyCycleNLockCreativeTruth = {
  /** Cycle-scoped materials only — never another cycle's set. */
  materials: readonly Sm001MaterialRef[];
  offerName?: string;
  priceDisplay?: string;
  cta?: string;
  body?: string;
  headline?: string;
  wasPriceDisplay?: string;
};

export type Sm001MonthlyNLockError =
  | "missing_cycle_id"
  | "cycle_not_found"
  | "wrong_campaign"
  | "wrong_sku"
  | "purchase_not_found"
  | "purchase_not_confirmed"
  | "missing_period_focus"
  | "insufficient_n_signals"
  | "invalid_n"
  | "n_already_locked"
  | "n_immutable_after_target";

export type Sm001MonthlyNLockResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      cycle: Sm001MonthlyProductionCycleRecord;
      selection: Sm001PlannedPostCountSelection;
      alreadyLocked: boolean;
      /** This package never invokes the renderer. */
      rendererInvoked: false;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      error: Sm001MonthlyNLockError;
      message: string;
      rendererInvoked: false;
    };

function cycleDateWindow(cycle: Sm001MonthlyProductionCycleRecord): string {
  return `${cycle.cycleStartDate} – ${cycle.cycleEndDate}`;
}

/**
 * Build N-select signals for a named cycle.
 * dateWindow always comes from that cycle's period — never from another cycle
 * and never from wall-clock "current month".
 */
export function buildSm001MonthlyNSelectSignalsForCycle(
  cycle: Sm001MonthlyProductionCycleRecord,
  creative: Sm001MonthlyCycleNLockCreativeTruth,
): ReturnType<typeof collectSm001NSelectSignals> {
  return collectSm001NSelectSignals({
    materials: creative.materials,
    offerName: creative.offerName,
    priceDisplay: creative.priceDisplay,
    cta: creative.cta,
    body: creative.body,
    headline: creative.headline,
    wasPriceDisplay: creative.wasPriceDisplay,
    dateWindow: cycleDateWindow(cycle),
  });
}

function validateCycleAuthority(
  campaign: CampaignRecord,
  productionCycleId: string | undefined,
):
  | { ok: true; cycle: Sm001MonthlyProductionCycleRecord }
  | { ok: false; error: Sm001MonthlyNLockError; message: string } {
  const cycleId = productionCycleId?.trim();
  if (!cycleId) {
    return {
      ok: false,
      error: "missing_cycle_id",
      message: "productionCycleId is required to lock plannedPostCount.",
    };
  }

  const cycle = findProductionCycleById(campaign, cycleId);
  if (!cycle) {
    return {
      ok: false,
      error: "cycle_not_found",
      message: "No production cycle exists for this productionCycleId.",
    };
  }
  if (cycle.campaignId !== campaign.campaignId) {
    return {
      ok: false,
      error: "wrong_campaign",
      message: "Cycle campaignId does not match campaign.",
    };
  }
  if (cycle.skuId !== studioSm001MonthlyDispatchCycleTargetV1.skuId) {
    return {
      ok: false,
      error: "wrong_sku",
      message: "Cycle skuId must be sm-001-monthly.",
    };
  }

  const purchase = findPaidCyclePurchase(campaign, cycle.paidCyclePurchaseId);
  if (!purchase) {
    return {
      ok: false,
      error: "purchase_not_found",
      message: "Cycle paidCyclePurchaseId is missing from the ledger.",
    };
  }
  if (purchase.status !== "confirmed") {
    return {
      ok: false,
      error: "purchase_not_confirmed",
      message: "Paid-cycle purchase must be confirmed before N lock.",
    };
  }
  if (purchase.campaignId !== campaign.campaignId) {
    return {
      ok: false,
      error: "wrong_campaign",
      message: "Paid-cycle purchase campaign mismatch.",
    };
  }
  if (purchase.skuId !== studioSm001MonthlyDispatchCycleTargetV1.skuId) {
    return {
      ok: false,
      error: "wrong_sku",
      message: "Paid-cycle purchase skuId must be sm-001-monthly.",
    };
  }

  const period = validateExplicitCyclePeriod(cycle);
  if (!period.ok) {
    return {
      ok: false,
      error: "missing_period_focus",
      message: period.message,
    };
  }
  if (!cycle.monthlyContentFocus?.trim()) {
    return {
      ok: false,
      error: "missing_period_focus",
      message: "monthlyContentFocus is required before N lock.",
    };
  }

  return { ok: true, cycle };
}

/**
 * Lock plannedPostCount ∈ {4,5,6} on a named productionCycleId.
 * Must run after authoritative cycle truth exists and before Machine clearance.
 */
export function lockSm001MonthlyPlannedPostCount(
  campaign: CampaignRecord,
  input: {
    productionCycleId: string;
    creative: Sm001MonthlyCycleNLockCreativeTruth;
  },
): Sm001MonthlyNLockResult {
  const authority = validateCycleAuthority(campaign, input.productionCycleId);
  if (!authority.ok) {
    return {
      ok: false,
      campaign,
      error: authority.error,
      message: authority.message,
      rendererInvoked: false,
    };
  }

  const { cycle } = authority;

  if (cycle.machineDispatchTarget && cycle.plannedPostCount != null) {
    return {
      ok: false,
      campaign,
      error: "n_immutable_after_target",
      message:
        "plannedPostCount cannot mutate after machineDispatchTarget is set for this cycle.",
      rendererInvoked: false,
    };
  }

  let selection: Sm001PlannedPostCountSelection;
  try {
    const signals = buildSm001MonthlyNSelectSignalsForCycle(
      cycle,
      input.creative,
    );
    selection = selectSm001PlannedPostCount(signals);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("INVALID_PLANNED_POST_COUNT")) {
      const insufficient =
        message.includes("requires") || message.includes("before N can be selected");
      return {
        ok: false,
        campaign,
        error: insufficient ? "insufficient_n_signals" : "invalid_n",
        message,
        rendererInvoked: false,
      };
    }
    return {
      ok: false,
      campaign,
      error: "invalid_n",
      message,
      rendererInvoked: false,
    };
  }

  const allowed = studioSm001MonthlyDispatchCycleTargetV1.plannedPostCounts as readonly number[];
  if (!allowed.includes(selection.plannedPostCount)) {
    return {
      ok: false,
      campaign,
      error: "invalid_n",
      message: `plannedPostCount must be in {4,5,6}; got ${selection.plannedPostCount}`,
      rendererInvoked: false,
    };
  }

  if (cycle.plannedPostCount != null) {
    if (
      cycle.plannedPostCount === selection.plannedPostCount &&
      cycle.plannedPostCountSelection?.selectionFingerprint ===
        selection.selectionFingerprint
    ) {
      return {
        ok: true,
        campaign,
        cycle,
        selection: cycle.plannedPostCountSelection!,
        alreadyLocked: true,
        rendererInvoked: false,
      };
    }
    return {
      ok: false,
      campaign,
      error: "n_already_locked",
      message:
        "plannedPostCount is already locked on this productionCycleId — open a new paid cycle to change N.",
      rendererInvoked: false,
    };
  }

  const now = new Date().toISOString();
  const nextCycle: Sm001MonthlyProductionCycleRecord = {
    ...cycle,
    plannedPostCount: selection.plannedPostCount,
    plannedPostCountSelection: selection,
    plannedPostCountLockedAt: now,
  };

  return {
    ok: true,
    campaign: replaceSm001MonthlyProductionCycle(campaign, nextCycle, now),
    cycle: nextCycle,
    selection,
    alreadyLocked: false,
    rendererInvoked: false,
  };
}
