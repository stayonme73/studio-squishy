import { randomUUID } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";
import { studioSm001MonthlyProductionCycleV1 } from "@/config/studio-sm-001-monthly-production-cycle-v1";
import {
  findPaidCyclePurchase,
  listPaidCyclePurchases,
} from "@/lib/studio-payment/paid-cycle-ledger";

import { validateExplicitCyclePeriod } from "./period";
import type {
  Sm001MonthlyCyclePeriodTruth,
  Sm001MonthlyProductionCycleRecord,
} from "./types";

export type CycleCreateError =
  | "missing_purchase_id"
  | "purchase_not_found"
  | "purchase_not_confirmed"
  | "wrong_sku"
  | "campaign_mismatch"
  | "missing_period_truth"
  | "missing_cycle_dates"
  | "invalid_cycle_dates"
  | "missing_cycle_focus"
  | "cycle_immutable"
  | "purchase_already_has_cycle";

export type CycleCreateResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      cycle: Sm001MonthlyProductionCycleRecord;
      alreadyCreated: boolean;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      error: CycleCreateError;
      message: string;
    };

export function mintProductionCycleId(): string {
  return `cyc_${randomUUID().replace(/-/g, "")}`;
}

export function listSm001MonthlyProductionCycles(
  campaign: CampaignRecord,
): readonly Sm001MonthlyProductionCycleRecord[] {
  return campaign.sm001MonthlyProductionCycles ?? [];
}

export function listSm001MonthlyCyclePeriodTruths(
  campaign: CampaignRecord,
): readonly Sm001MonthlyCyclePeriodTruth[] {
  return campaign.sm001MonthlyCyclePeriodTruths ?? [];
}

export function findProductionCycleByPaidPurchase(
  campaign: CampaignRecord,
  paidCyclePurchaseId: string,
): Sm001MonthlyProductionCycleRecord | null {
  return (
    listSm001MonthlyProductionCycles(campaign).find(
      (row) => row.paidCyclePurchaseId === paidCyclePurchaseId,
    ) ?? null
  );
}

export function findProductionCycleById(
  campaign: CampaignRecord,
  productionCycleId: string,
): Sm001MonthlyProductionCycleRecord | null {
  return (
    listSm001MonthlyProductionCycles(campaign).find(
      (row) => row.productionCycleId === productionCycleId,
    ) ?? null
  );
}

export function findPeriodTruthForPurchase(
  campaign: CampaignRecord,
  paidCyclePurchaseId: string,
): Sm001MonthlyCyclePeriodTruth | null {
  return (
    listSm001MonthlyCyclePeriodTruths(campaign).find(
      (row) => row.paidCyclePurchaseId === paidCyclePurchaseId,
    ) ?? null
  );
}

/**
 * Campaign-level paymentTruth alone never authorizes a monthly production cycle.
 */
export function campaignPaidAloneCreatesMonthlyCycle(): false {
  return false;
}

function upsertCycle(
  campaign: CampaignRecord,
  cycle: Sm001MonthlyProductionCycleRecord,
): CampaignRecord {
  const prior = listSm001MonthlyProductionCycles(campaign);
  const index = prior.findIndex(
    (row) => row.productionCycleId === cycle.productionCycleId,
  );
  const next =
    index >= 0
      ? prior.map((row, i) => (i === index ? cycle : row))
      : [...prior, cycle];
  return {
    ...campaign,
    sm001MonthlyProductionCycles: next,
    updatedAt: cycle.createdAt,
  };
}

function upsertPeriodTruth(
  campaign: CampaignRecord,
  truth: Sm001MonthlyCyclePeriodTruth,
): CampaignRecord {
  const prior = listSm001MonthlyCyclePeriodTruths(campaign);
  const index = prior.findIndex(
    (row) => row.paidCyclePurchaseId === truth.paidCyclePurchaseId,
  );
  const next =
    index >= 0
      ? prior.map((row, i) => (i === index ? truth : row))
      : [...prior, truth];
  return {
    ...campaign,
    sm001MonthlyCyclePeriodTruths: next,
    updatedAt: truth.lockedAt,
  };
}

/**
 * Lock explicit service-production-period truth for one paidCyclePurchaseId.
 * Refuses wall-clock / "Current cycle" / empty focus. Does not mint productionCycleId.
 */
export function lockSm001MonthlyCyclePeriodTruth(
  campaign: CampaignRecord,
  input: {
    paidCyclePurchaseId: string;
    cycleStartDate: string;
    cycleEndDate: string;
    monthlyContentFocus: string;
  },
):
  | { ok: true; campaign: CampaignRecord; truth: Sm001MonthlyCyclePeriodTruth }
  | { ok: false; campaign: CampaignRecord; error: CycleCreateError; message: string } {
  if (!input.paidCyclePurchaseId?.trim()) {
    return {
      ok: false,
      campaign,
      error: "missing_purchase_id",
      message: "paidCyclePurchaseId is required to lock cycle period truth.",
    };
  }

  const purchase = findPaidCyclePurchase(campaign, input.paidCyclePurchaseId);
  if (!purchase) {
    return {
      ok: false,
      campaign,
      error: "purchase_not_found",
      message: "No paid-cycle purchase exists for this id.",
    };
  }
  if (purchase.campaignId !== campaign.campaignId) {
    return {
      ok: false,
      campaign,
      error: "campaign_mismatch",
      message: "Period truth campaign does not match purchase.",
    };
  }

  const existingCycle = findProductionCycleByPaidPurchase(
    campaign,
    input.paidCyclePurchaseId,
  );
  if (existingCycle) {
    const period = validateExplicitCyclePeriod(input);
    if (!period.ok) {
      return { ok: false, campaign, error: period.error as CycleCreateError, message: period.message };
    }
    // Immutable once cycle exists — refuse period rewrite under same purchase.
    if (
      existingCycle.cycleStartDate !== period.cycleStartDate ||
      existingCycle.cycleEndDate !== period.cycleEndDate ||
      existingCycle.monthlyContentFocus !== period.monthlyContentFocus
    ) {
      return {
        ok: false,
        campaign,
        error: "cycle_immutable",
        message:
          "productionCycleId period/focus is immutable — open a new paid cycle for changes.",
      };
    }
    const existingTruth = findPeriodTruthForPurchase(
      campaign,
      input.paidCyclePurchaseId,
    );
    if (existingTruth) {
      return { ok: true, campaign, truth: existingTruth };
    }
  }

  const period = validateExplicitCyclePeriod(input);
  if (!period.ok) {
    return {
      ok: false,
      campaign,
      error: period.error as CycleCreateError,
      message: period.message,
    };
  }

  const now = new Date().toISOString();
  const truth: Sm001MonthlyCyclePeriodTruth = {
    schemaVersion: studioSm001MonthlyProductionCycleV1.schemaVersion,
    paidCyclePurchaseId: input.paidCyclePurchaseId,
    campaignId: campaign.campaignId,
    cycleStartDate: period.cycleStartDate,
    cycleEndDate: period.cycleEndDate,
    monthlyContentFocus: period.monthlyContentFocus,
    lockedAt: now,
    source: "explicit_service_production_period",
  };

  return {
    ok: true,
    campaign: upsertPeriodTruth(campaign, truth),
    truth,
  };
}

/**
 * Create-only: one confirmed paidCyclePurchaseId → one productionCycleId.
 * Never invents dates/focus. Never invokes renderer.
 */
export function createSm001MonthlyProductionCycleFromPaidAuthority(
  campaign: CampaignRecord,
  paidCyclePurchaseId: string,
): CycleCreateResult {
  if (!paidCyclePurchaseId?.trim()) {
    return {
      ok: false,
      campaign,
      error: "missing_purchase_id",
      message: "paidCyclePurchaseId is required to create a production cycle.",
    };
  }

  const existing = findProductionCycleByPaidPurchase(campaign, paidCyclePurchaseId);
  if (existing) {
    return {
      ok: true,
      campaign,
      cycle: existing,
      alreadyCreated: true,
    };
  }

  const purchase = findPaidCyclePurchase(campaign, paidCyclePurchaseId);
  if (!purchase) {
    return {
      ok: false,
      campaign,
      error: "purchase_not_found",
      message: "No paid-cycle purchase exists for this id.",
    };
  }
  if (purchase.status !== "confirmed") {
    return {
      ok: false,
      campaign,
      error: "purchase_not_confirmed",
      message: "Only a confirmed paid-cycle purchase may create a production cycle.",
    };
  }
  if (purchase.skuId !== studioPaidCyclePaymentV1.skuId) {
    return {
      ok: false,
      campaign,
      error: "wrong_sku",
      message: "Cycle create requires skuId sm-001-monthly.",
    };
  }
  if (purchase.campaignId !== campaign.campaignId) {
    return {
      ok: false,
      campaign,
      error: "campaign_mismatch",
      message: "Paid-cycle purchase campaign mismatch.",
    };
  }

  const periodTruth = findPeriodTruthForPurchase(campaign, paidCyclePurchaseId);
  if (!periodTruth) {
    return {
      ok: false,
      campaign,
      error: "missing_period_truth",
      message:
        "Explicit service-production-period truth is required before cycle create — refuse wall-clock inference.",
    };
  }
  if (periodTruth.campaignId !== campaign.campaignId) {
    return {
      ok: false,
      campaign,
      error: "campaign_mismatch",
      message: "Period truth campaign mismatch.",
    };
  }

  const period = validateExplicitCyclePeriod(periodTruth);
  if (!period.ok) {
    return {
      ok: false,
      campaign,
      error: period.error as CycleCreateError,
      message: period.message,
    };
  }

  const now = new Date().toISOString();
  const cycle: Sm001MonthlyProductionCycleRecord = {
    schemaVersion: studioSm001MonthlyProductionCycleV1.schemaVersion,
    productionCycleId: mintProductionCycleId(),
    paidCyclePurchaseId: purchase.paidCyclePurchaseId,
    checkoutSessionId: purchase.checkoutSessionId,
    campaignId: campaign.campaignId,
    skuId: studioSm001MonthlyProductionCycleV1.skuId,
    cycleStartDate: period.cycleStartDate,
    cycleEndDate: period.cycleEndDate,
    monthlyContentFocus: period.monthlyContentFocus,
    status: "open",
    createdAt: now,
  };

  return {
    ok: true,
    campaign: upsertCycle(campaign, cycle),
    cycle,
    alreadyCreated: false,
  };
}

/**
 * Refuse in-place mutation of an existing production cycle (CY-7).
 */
export function refuseSm001MonthlyProductionCycleMutation(
  campaign: CampaignRecord,
  productionCycleId: string,
  attempted: Partial<
    Pick<
      Sm001MonthlyProductionCycleRecord,
      | "cycleStartDate"
      | "cycleEndDate"
      | "monthlyContentFocus"
      | "paidCyclePurchaseId"
      | "checkoutSessionId"
    >
  >,
):
  | { ok: true }
  | { ok: false; error: "cycle_immutable" | "purchase_not_found"; message: string } {
  const existing = findProductionCycleById(campaign, productionCycleId);
  if (!existing) {
    return {
      ok: false,
      error: "purchase_not_found",
      message: "No production cycle exists for this id.",
    };
  }
  const keys = Object.keys(attempted) as (keyof typeof attempted)[];
  for (const key of keys) {
    const next = attempted[key];
    if (next !== undefined && next !== existing[key]) {
      return {
        ok: false,
        error: "cycle_immutable",
        message:
          "productionCycleId is immutable once created — open a new paid cycle for date/focus/backfill changes.",
      };
    }
  }
  return { ok: true };
}

/**
 * Activation helper: for each confirmed paid-cycle purchase with period truth,
 * create exactly one production cycle. Skips purchases not ready (fail closed per purchase).
 * Does not fail the whole activation when period truth is still missing.
 */
export function ensureSm001MonthlyProductionCyclesFromPaidAuthority(
  campaign: CampaignRecord,
): {
  campaign: CampaignRecord;
  created: Sm001MonthlyProductionCycleRecord[];
  alreadyPresent: Sm001MonthlyProductionCycleRecord[];
  skipped: Array<{ paidCyclePurchaseId: string; error: CycleCreateError; message: string }>;
  changed: boolean;
} {
  let working = campaign;
  const created: Sm001MonthlyProductionCycleRecord[] = [];
  const alreadyPresent: Sm001MonthlyProductionCycleRecord[] = [];
  const skipped: Array<{
    paidCyclePurchaseId: string;
    error: CycleCreateError;
    message: string;
  }> = [];

  for (const purchase of listPaidCyclePurchases(working)) {
    if (purchase.skuId !== studioPaidCyclePaymentV1.skuId) continue;
    if (purchase.status !== "confirmed") {
      skipped.push({
        paidCyclePurchaseId: purchase.paidCyclePurchaseId,
        error: "purchase_not_confirmed",
        message: "Purchase not confirmed.",
      });
      continue;
    }

    const result = createSm001MonthlyProductionCycleFromPaidAuthority(
      working,
      purchase.paidCyclePurchaseId,
    );
    if (!result.ok) {
      skipped.push({
        paidCyclePurchaseId: purchase.paidCyclePurchaseId,
        error: result.error,
        message: result.message,
      });
      continue;
    }
    working = result.campaign;
    if (result.alreadyCreated) {
      alreadyPresent.push(result.cycle);
    } else {
      created.push(result.cycle);
    }
  }

  return {
    campaign: working,
    created,
    alreadyPresent,
    skipped,
    changed: created.length > 0,
  };
}
