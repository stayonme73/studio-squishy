/**
 * Explicit Machine dispatch target for one named sm-001-monthly productionCycleId.
 * State transition — never a newest / last-paid / calendar / array-order query.
 * Does not remap, observe, or invoke the renderer.
 */

import { studioSm001MonthlyDispatchCycleTargetV1 } from "@/config/studio-sm-001-monthly-dispatch-cycle-target-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { findPaidCyclePurchase } from "@/lib/studio-payment/paid-cycle-ledger";

import {
  findProductionCycleById,
  listSm001MonthlyProductionCycles,
  replaceSm001MonthlyProductionCycle,
} from "./create";
import { validateExplicitCyclePeriod } from "./period";
import type { Sm001MonthlyProductionCycleRecord } from "./types";

export type Sm001MonthlyDispatchTargetError =
  | "missing_cycle_id"
  | "cycle_not_found"
  | "wrong_campaign"
  | "wrong_sku"
  | "purchase_not_found"
  | "purchase_not_confirmed"
  | "missing_period_focus"
  | "n_not_locked"
  | "invalid_n"
  | "target_not_set"
  | "dual_target"
  | "dispatch_mirror_missing"
  | "dispatch_mirror_mismatch"
  | "wrong_cycle_mirror";

export type Sm001MonthlyDispatchTargetResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      cycle: Sm001MonthlyProductionCycleRecord;
      dispatchRecord: JobDispatchRecord;
      alreadyTargeted: boolean;
      /** This package never invokes the renderer. */
      rendererInvoked: false;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      error: Sm001MonthlyDispatchTargetError;
      message: string;
      rendererInvoked: false;
    };

export type Sm001MonthlyDispatchReadiness =
  | {
      ready: true;
      productionCycleId: string;
      plannedPostCount: 4 | 5 | 6;
      paidCyclePurchaseId: string;
    }
  | {
      ready: false;
      error: Sm001MonthlyDispatchTargetError;
      message: string;
    };

function fail(
  campaign: CampaignRecord,
  error: Sm001MonthlyDispatchTargetError,
  message: string,
): Extract<Sm001MonthlyDispatchTargetResult, { ok: false }> {
  return { ok: false, campaign, error, message, rendererInvoked: false };
}

export function findSm001MonthlyMachineDispatchTarget(
  campaign: CampaignRecord,
): Sm001MonthlyProductionCycleRecord | null {
  const targeted = listSm001MonthlyProductionCycles(campaign).filter(
    (row) => row.machineDispatchTarget === true,
  );
  if (targeted.length > 1) {
    return null;
  }
  return targeted[0] ?? null;
}

export function findMonthlyJobDispatchRecord(
  campaign: CampaignRecord,
): JobDispatchRecord | null {
  const records = campaign.dispatchExecution?.records ?? [];
  return (
    records.find(
      (row) => row.skuId === studioSm001MonthlyDispatchCycleTargetV1.skuId,
    ) ?? null
  );
}

/**
 * Re-apply explicit monthly cycle mirror onto dispatch records.
 * Used after evaluateJobDispatch so ensure() cannot invent or wipe targets.
 */
export function applySm001MonthlyDispatchTargetMirror(
  campaign: CampaignRecord,
  records: readonly JobDispatchRecord[],
): JobDispatchRecord[] {
  const targeted = listSm001MonthlyProductionCycles(campaign).filter(
    (row) => row.machineDispatchTarget === true,
  );
  const targetId =
    targeted.length === 1 ? targeted[0]!.productionCycleId : null;

  return records.map((record) => {
    if (record.skuId !== studioSm001MonthlyDispatchCycleTargetV1.skuId) {
      if (record.productionCycleId !== undefined) {
        const { productionCycleId: _drop, ...rest } = record;
        return rest;
      }
      return record;
    }
    if (targetId) {
      return { ...record, productionCycleId: targetId };
    }
    if (record.productionCycleId !== undefined) {
      const { productionCycleId: _drop, ...rest } = record;
      return rest;
    }
    return record;
  });
}

function mirrorOntoCampaign(
  campaign: CampaignRecord,
  productionCycleId: string,
):
  | { ok: true; campaign: CampaignRecord; dispatchRecord: JobDispatchRecord }
  | { ok: false; error: Sm001MonthlyDispatchTargetError; message: string } {
  const dispatch = campaign.dispatchExecution;
  if (!dispatch) {
    return {
      ok: false,
      error: "dispatch_mirror_missing",
      message:
        "Monthly JobDispatchRecord is required before machine dispatch target clearance.",
    };
  }

  const monthly = findMonthlyJobDispatchRecord(campaign);
  if (!monthly) {
    return {
      ok: false,
      error: "dispatch_mirror_missing",
      message:
        "No sm-001-monthly JobDispatchRecord exists to mirror productionCycleId.",
    };
  }

  if (
    monthly.productionCycleId &&
    monthly.productionCycleId !== productionCycleId
  ) {
    return {
      ok: false,
      error: "wrong_cycle_mirror",
      message:
        "JobDispatchRecord.productionCycleId already points at a different cycle — refuse dual bind.",
    };
  }

  const nextRecords = dispatch.records.map((row) => {
    if (row.skuId !== studioSm001MonthlyDispatchCycleTargetV1.skuId) {
      return row;
    }
    return { ...row, productionCycleId };
  });

  const mirrored = nextRecords.find(
    (row) => row.skuId === studioSm001MonthlyDispatchCycleTargetV1.skuId,
  );
  if (!mirrored?.productionCycleId) {
    return {
      ok: false,
      error: "dispatch_mirror_missing",
      message: "Failed to mirror productionCycleId onto monthly dispatch record.",
    };
  }

  return {
    ok: true,
    campaign: {
      ...campaign,
      dispatchExecution: {
        ...dispatch,
        records: nextRecords,
      },
      updatedAt: new Date().toISOString(),
    },
    dispatchRecord: mirrored,
  };
}

function validateNamedCycleForTarget(
  campaign: CampaignRecord,
  productionCycleId: string | undefined,
):
  | { ok: true; cycle: Sm001MonthlyProductionCycleRecord }
  | { ok: false; error: Sm001MonthlyDispatchTargetError; message: string } {
  if (!productionCycleId?.trim()) {
    return {
      ok: false,
      error: "missing_cycle_id",
      message: "productionCycleId is required for Machine dispatch clearance.",
    };
  }

  const cycle = findProductionCycleById(campaign, productionCycleId);
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
      message: "Paid-cycle purchase must be confirmed before target clearance.",
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
  if (!period.ok || !cycle.monthlyContentFocus?.trim()) {
    return {
      ok: false,
      error: "missing_period_focus",
      message: period.ok
        ? "monthlyContentFocus is required before target clearance."
        : period.message,
    };
  }

  if (cycle.plannedPostCount == null || !cycle.plannedPostCountSelection) {
    return {
      ok: false,
      error: "n_not_locked",
      message:
        "plannedPostCount must be locked on this productionCycleId before Machine clearance.",
    };
  }

  const allowed = studioSm001MonthlyDispatchCycleTargetV1.plannedPostCounts as readonly number[];
  if (
    !allowed.includes(cycle.plannedPostCount) ||
    cycle.plannedPostCountSelection.plannedPostCount !== cycle.plannedPostCount
  ) {
    return {
      ok: false,
      error: "invalid_n",
      message: "Locked plannedPostCount must be in {4,5,6} and match selection.",
    };
  }

  return { ok: true, cycle };
}

/**
 * Explicit clearance: mark this named productionCycleId as the Machine dispatch target
 * and mirror the id onto the monthly JobDispatchRecord.
 */
export function clearSm001MonthlyCycleForMachineDispatch(
  campaign: CampaignRecord,
  productionCycleId: string,
): Sm001MonthlyDispatchTargetResult {
  const validated = validateNamedCycleForTarget(campaign, productionCycleId);
  if (!validated.ok) {
    return fail(campaign, validated.error, validated.message);
  }

  const { cycle } = validated;

  const otherTargeted = listSm001MonthlyProductionCycles(campaign).filter(
    (row) =>
      row.machineDispatchTarget === true &&
      row.productionCycleId !== cycle.productionCycleId,
  );
  if (otherTargeted.length > 0) {
    return fail(
      campaign,
      "dual_target",
      `Another cycle is already machineDispatchTarget (${otherTargeted[0]!.productionCycleId}) — refuse concurrent targets.`,
    );
  }

  if (cycle.machineDispatchTarget === true) {
    const mirrored = mirrorOntoCampaign(campaign, cycle.productionCycleId);
    if (!mirrored.ok) {
      return fail(campaign, mirrored.error, mirrored.message);
    }
    if (
      mirrored.dispatchRecord.productionCycleId !== cycle.productionCycleId
    ) {
      return fail(
        mirrored.campaign,
        "dispatch_mirror_mismatch",
        "Dispatch mirror does not match the targeted productionCycleId.",
      );
    }
    return {
      ok: true,
      campaign: mirrored.campaign,
      cycle,
      dispatchRecord: mirrored.dispatchRecord,
      alreadyTargeted: true,
      rendererInvoked: false,
    };
  }

  const now = new Date().toISOString();
  const targetedCycle: Sm001MonthlyProductionCycleRecord = {
    ...cycle,
    machineDispatchTarget: true,
    machineDispatchTargetSetAt: now,
  };

  let nextCampaign = replaceSm001MonthlyProductionCycle(
    campaign,
    targetedCycle,
    now,
  );
  const mirrored = mirrorOntoCampaign(nextCampaign, targetedCycle.productionCycleId);
  if (!mirrored.ok) {
    return fail(campaign, mirrored.error, mirrored.message);
  }
  nextCampaign = mirrored.campaign;

  if (mirrored.dispatchRecord.productionCycleId !== targetedCycle.productionCycleId) {
    return fail(
      nextCampaign,
      "dispatch_mirror_mismatch",
      "Dispatch mirror does not match the targeted productionCycleId.",
    );
  }

  return {
    ok: true,
    campaign: nextCampaign,
    cycle: targetedCycle,
    dispatchRecord: mirrored.dispatchRecord,
    alreadyTargeted: false,
    rendererInvoked: false,
  };
}

/**
 * Minimum readiness for a future monthly renderer dispatch hook.
 * Does not invoke the renderer.
 */
export function evaluateSm001MonthlyDispatchTargetReadiness(
  campaign: CampaignRecord,
  productionCycleId: string,
): Sm001MonthlyDispatchReadiness {
  const validated = validateNamedCycleForTarget(campaign, productionCycleId);
  if (!validated.ok) {
    return {
      ready: false,
      error: validated.error,
      message: validated.message,
    };
  }

  const { cycle } = validated;
  if (cycle.machineDispatchTarget !== true) {
    return {
      ready: false,
      error: "target_not_set",
      message:
        "machineDispatchTarget must be explicitly set on this productionCycleId.",
    };
  }

  const dual = listSm001MonthlyProductionCycles(campaign).filter(
    (row) => row.machineDispatchTarget === true,
  );
  if (dual.length !== 1) {
    return {
      ready: false,
      error: "dual_target",
      message: "Exactly one machineDispatchTarget cycle is required.",
    };
  }

  const monthly = findMonthlyJobDispatchRecord(campaign);
  if (!monthly?.productionCycleId) {
    return {
      ready: false,
      error: "dispatch_mirror_missing",
      message: "Monthly JobDispatchRecord.productionCycleId mirror is required.",
    };
  }
  if (monthly.productionCycleId !== cycle.productionCycleId) {
    return {
      ready: false,
      error: "dispatch_mirror_mismatch",
      message:
        "JobDispatchRecord.productionCycleId does not match the targeted cycle.",
    };
  }

  return {
    ready: true,
    productionCycleId: cycle.productionCycleId,
    plannedPostCount: cycle.plannedPostCount!,
    paidCyclePurchaseId: cycle.paidCyclePurchaseId,
  };
}
