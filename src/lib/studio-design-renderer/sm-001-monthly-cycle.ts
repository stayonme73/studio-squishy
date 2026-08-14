/**
 * Cycle identity validation — consume only. Never mint productionCycleId.
 */

import { isSm001PlannedPostCount } from "./sm-001-contracts";
import type {
  Sm001MonthlyCycleIdentity,
  Sm001MonthlyFailureCode,
  Sm001MonthlyProjectTruth,
} from "./sm-001-monthly-types";
import type { Sm001TimingConstraints } from "./sm-001-types";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseMonthlyIsoDate(iso: string): Date | null {
  const m = ISO_DATE.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function assertNeverMintsCycleId(input: {
  /** If caller asks the wrapper to invent an id, refuse. */
  requestedMint?: {
    fromCurrentMonth?: boolean;
    fromToday?: boolean;
    fromBillingMetadata?: boolean;
    fromCurrentCycleLabel?: boolean;
    fromPriorCycleId?: string;
  };
}): { ok: true } | { ok: false; code: Sm001MonthlyFailureCode; message: string } {
  const r = input.requestedMint;
  if (!r) return { ok: true };
  if (
    r.fromCurrentMonth ||
    r.fromToday ||
    r.fromBillingMetadata ||
    r.fromCurrentCycleLabel ||
    r.fromPriorCycleId
  ) {
    return {
      ok: false,
      code: "WRAPPER_REFUSED_CYCLE_MINT",
      message:
        "sm-001-monthly wrapper refuses to mint productionCycleId from current month, today, billing metadata, \"Current cycle\", or prior-cycle reuse",
    };
  }
  return { ok: true };
}

export function validateSm001MonthlyCycleIdentity(
  cycle: Partial<Sm001MonthlyCycleIdentity> | null | undefined,
):
  | { ok: true; cycle: Sm001MonthlyCycleIdentity }
  | { ok: false; code: Sm001MonthlyFailureCode; message: string } {
  if (!cycle || typeof cycle.productionCycleId !== "string" || !cycle.productionCycleId.trim()) {
    return {
      ok: false,
      code: "MISSING_PRODUCTION_CYCLE_ID",
      message: "Authoritative productionCycleId is required before monthly production",
    };
  }
  if (cycle.productionCycleId.trim() === "Current cycle") {
    return {
      ok: false,
      code: "MISSING_PRODUCTION_CYCLE_ID",
      message: "\"Current cycle\" is never production authority",
    };
  }
  if (typeof cycle.cycleStartDate !== "string" || !cycle.cycleStartDate.trim()) {
    return {
      ok: false,
      code: "MISSING_CYCLE_START",
      message: "cycleStartDate (YYYY-MM-DD) is required before monthly production",
    };
  }
  if (typeof cycle.cycleEndDate !== "string" || !cycle.cycleEndDate.trim()) {
    return {
      ok: false,
      code: "MISSING_CYCLE_END",
      message: "cycleEndDate (YYYY-MM-DD) is required before monthly production",
    };
  }
  const start = parseMonthlyIsoDate(cycle.cycleStartDate);
  const end = parseMonthlyIsoDate(cycle.cycleEndDate);
  if (!start || !end) {
    return {
      ok: false,
      code: "INVALID_CYCLE_DATE_RANGE",
      message: "cycleStartDate and cycleEndDate must be valid YYYY-MM-DD",
    };
  }
  if (end.getTime() < start.getTime()) {
    return {
      ok: false,
      code: "INVALID_CYCLE_DATE_RANGE",
      message: "cycleEndDate must be on or after cycleStartDate",
    };
  }
  if (
    typeof cycle.monthlyContentFocus !== "string" ||
    !cycle.monthlyContentFocus.trim()
  ) {
    return {
      ok: false,
      code: "MISSING_CYCLE_FOCUS",
      message: "Cycle-specific monthlyContentFocus is required before production",
    };
  }

  return {
    ok: true,
    cycle: {
      productionCycleId: cycle.productionCycleId.trim(),
      cycleStartDate: cycle.cycleStartDate.trim(),
      cycleEndDate: cycle.cycleEndDate.trim(),
      monthlyContentFocus: cycle.monthlyContentFocus.trim(),
    },
  };
}

export function validateSm001MonthlyPlannedPostCount(
  n: unknown,
):
  | { ok: true; plannedPostCount: Sm001MonthlyProjectTruth["plannedPostCount"] }
  | { ok: false; code: Sm001MonthlyFailureCode; message: string } {
  if (n === undefined || n === null) {
    return {
      ok: false,
      code: "MISSING_PLANNED_POST_COUNT",
      message: "Per-cycle plannedPostCount is required before monthly production",
    };
  }
  if (typeof n !== "number" || !isSm001PlannedPostCount(n)) {
    return {
      ok: false,
      code: "INVALID_PLANNED_POST_COUNT",
      message: `plannedPostCount must be in {4,5,6}; got ${String(n)}`,
    };
  }
  return { ok: true, plannedPostCount: n };
}

/**
 * Intersect cycle window with optional campaign timing.
 * Empty intersection → fail closed (do not silently extend the cycle).
 */
export function intersectCycleWindowWithCampaignTiming(input: {
  cycleStartDate: string;
  cycleEndDate: string;
  campaignTiming?: Sm001TimingConstraints;
}):
  | { ok: true; timing: Sm001TimingConstraints }
  | { ok: false; code: "CYCLE_WINDOW_CONFLICT"; message: string } {
  const cycleStart = parseMonthlyIsoDate(input.cycleStartDate)!;
  const cycleEnd = parseMonthlyIsoDate(input.cycleEndDate)!;
  let start = cycleStart;
  let end = cycleEnd;

  const c = input.campaignTiming;
  if (c?.startDate) {
    const cs = parseMonthlyIsoDate(c.startDate);
    if (!cs) {
      return {
        ok: false,
        code: "CYCLE_WINDOW_CONFLICT",
        message: `Invalid campaign startDate ${c.startDate}`,
      };
    }
    if (cs.getTime() > start.getTime()) start = cs;
  }
  if (c?.endDate) {
    const ce = parseMonthlyIsoDate(c.endDate);
    if (!ce) {
      return {
        ok: false,
        code: "CYCLE_WINDOW_CONFLICT",
        message: `Invalid campaign endDate ${c.endDate}`,
      };
    }
    if (ce.getTime() < end.getTime()) end = ce;
  }

  if (end.getTime() < start.getTime()) {
    return {
      ok: false,
      code: "CYCLE_WINDOW_CONFLICT",
      message:
        "Cycle window ∩ campaign timing is empty — refuse production; do not extend the cycle",
    };
  }

  return {
    ok: true,
    timing: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      eventDate: c?.eventDate,
      blackoutDates: c?.blackoutDates,
    },
  };
}

/** Path-safe cycle directory segment — encoding only; not a new identity. */
export function sanitizeProductionCycleIdForPath(productionCycleId: string): string {
  return productionCycleId.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
