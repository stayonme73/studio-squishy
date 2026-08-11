import { getServiceById } from "@/catalog";
import { isGuideRelativeDeadlineChoice } from "@/config/conversation-room-guide-v1";
import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";

import type { PreAcceptanceTimingVerdict } from "./types";

/**
 * Resolve Conversation Room relative deadline bubbles into a planning horizon.
 * Relative wording stays customer-facing truth; this only derives a date ceiling
 * for catalog turnaround checks — never invents a confirmed calendar commitment.
 */
export type RelativeDeadlineHorizon =
  | { kind: "none" }
  | { kind: "open_urgency" }
  | { kind: "horizon"; date: Date; calendarDays: number }
  | { kind: "not_relative" };

export function resolveRelativeDeadlineHorizon(
  raw: string,
  today: Date = new Date(),
): RelativeDeadlineHorizon {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "none" };
  const lower = trimmed.toLowerCase();

  if (
    lower === "no deadline yet" ||
    lower === "skip for now" ||
    lower === "not requested"
  ) {
    return { kind: "none" };
  }

  if (lower === "as soon as possible") {
    return { kind: "open_urgency" };
  }

  const calendarDaysByChoice: Record<string, number> = {
    "within 1 week": 7,
    "within 2 weeks": 14,
    "within 1 month": 30,
    "more than 1 month": 45,
  };

  const days = calendarDaysByChoice[lower];
  if (days != null) {
    const base = startOfLocalDay(today);
    const date = new Date(base);
    date.setDate(date.getDate() + days);
    return { kind: "horizon", date, calendarDays: days };
  }

  if (isGuideRelativeDeadlineChoice(trimmed)) {
    /* Defensive: known relative list member without a horizon map. */
    return { kind: "open_urgency" };
  }

  return { kind: "not_relative" };
}

export type TimingEvaluationResult = {
  verdict: PreAcceptanceTimingVerdict;
  reason: string;
  /** Max catalog minimum business days across selected SKUs, when known. */
  requiredMinBusinessDays: number | null;
  /** Business days from tomorrow through the requested deadline (inclusive). */
  availableBusinessDays: number | null;
  evidenceSource: "catalog_timing_windows" | "none";
};

/**
 * Timing honesty for pre-acceptance.
 * CLEAR / NO_KNOWN_TIMING_CONFLICT never means “we guarantee capacity.”
 * It means: date is usable, not facially impossible, and no known catalog
 * turnaround rule is violated.
 */
export function evaluateTimingTruth(input: {
  requestedDeadline: string;
  deadlineStatus: string;
  selectedServiceIds?: readonly string[];
}): TimingEvaluationResult {
  const raw = input.requestedDeadline.trim();
  const status = input.deadlineStatus;
  const catalog = resolveRequiredMinBusinessDays(input.selectedServiceIds ?? []);

  if (!raw) {
    if (status === "unconfirmed") {
      return {
        verdict: "CLARIFICATION_NEEDED",
        reason: studioPreAcceptanceV1.customerCopy.timingAmbiguous,
        requiredMinBusinessDays: catalog.requiredMinBusinessDays,
        availableBusinessDays: null,
        evidenceSource: catalog.evidenceSource,
      };
    }
    return {
      verdict: "NO_KNOWN_TIMING_CONFLICT",
      reason: "No fixed deadline requested.",
      requiredMinBusinessDays: catalog.requiredMinBusinessDays,
      availableBusinessDays: null,
      evidenceSource: catalog.evidenceSource,
    };
  }

  const relative = resolveRelativeDeadlineHorizon(raw);
  if (relative.kind === "none") {
    return {
      verdict: "NO_KNOWN_TIMING_CONFLICT",
      reason: "No fixed deadline requested.",
      requiredMinBusinessDays: catalog.requiredMinBusinessDays,
      availableBusinessDays: null,
      evidenceSource: catalog.evidenceSource,
    };
  }
  if (relative.kind === "open_urgency") {
    /* ASAP — urgency noted, no fixed ceiling to violate. */
    return {
      verdict: "NO_KNOWN_TIMING_CONFLICT",
      reason:
        "Customer asked for the soonest workable timing without a fixed date. Catalog turnaround still applies when a date is set. This is not a capacity or on-time delivery guarantee.",
      requiredMinBusinessDays: catalog.requiredMinBusinessDays,
      availableBusinessDays: null,
      evidenceSource: catalog.evidenceSource,
    };
  }

  const parsed =
    relative.kind === "horizon"
      ? relative.date
      : parseCustomerDeadline(raw);
  if (!parsed) {
    return {
      verdict: "CLARIFICATION_NEEDED",
      reason: studioPreAcceptanceV1.customerCopy.timingInvalid,
      requiredMinBusinessDays: catalog.requiredMinBusinessDays,
      availableBusinessDays: null,
      evidenceSource: catalog.evidenceSource,
    };
  }

  const today = startOfLocalDay(new Date());
  if (parsed.getTime() < today.getTime()) {
    return {
      verdict: "UNSUPPORTED",
      reason: studioPreAcceptanceV1.customerCopy.timingPast,
      requiredMinBusinessDays: catalog.requiredMinBusinessDays,
      availableBusinessDays: 0,
      evidenceSource: catalog.evidenceSource,
    };
  }

  const available = countBusinessDaysAfter(today, parsed);

  if (
    catalog.requiredMinBusinessDays != null &&
    available < catalog.requiredMinBusinessDays
  ) {
    return {
      verdict: "UNSUPPORTED",
      reason: studioPreAcceptanceV1.customerCopy.timingTurnaroundTooSoon.replace(
        "{minDays}",
        String(catalog.requiredMinBusinessDays),
      ),
      requiredMinBusinessDays: catalog.requiredMinBusinessDays,
      availableBusinessDays: available,
      evidenceSource: catalog.evidenceSource,
    };
  }

  if (catalog.requiredMinBusinessDays != null) {
    return {
      verdict: "NO_KNOWN_TIMING_CONFLICT",
      reason: `Requested deadline clears the catalog minimum turnaround (${catalog.requiredMinBusinessDays} business days). This is not a capacity or staffing guarantee.`,
      requiredMinBusinessDays: catalog.requiredMinBusinessDays,
      availableBusinessDays: available,
      evidenceSource: "catalog_timing_windows",
    };
  }

  return {
    verdict: "NO_KNOWN_TIMING_CONFLICT",
    reason:
      "Requested deadline is a valid future date with no authoritative catalog turnaround rule to evaluate. This is not a capacity or on-time delivery guarantee.",
    requiredMinBusinessDays: null,
    availableBusinessDays: available,
    evidenceSource: "none",
  };
}

/** Max of each selected SKU’s finalDeliveryWindow.minDays (else firstReviewWindow.minDays). */
export function resolveRequiredMinBusinessDays(
  selectedServiceIds: readonly string[],
): {
  requiredMinBusinessDays: number | null;
  evidenceSource: "catalog_timing_windows" | "none";
  evidenceLabels: string[];
} {
  let maxMin = 0;
  let found = false;
  const evidenceLabels: string[] = [];

  for (const id of selectedServiceIds) {
    const service = getServiceById(id);
    if (!service) continue;
    const window = service.finalDeliveryWindow ?? service.firstReviewWindow;
    if (!window || typeof window.minDays !== "number" || window.minDays < 1) {
      continue;
    }
    found = true;
    if (window.minDays > maxMin) maxMin = window.minDays;
    evidenceLabels.push(
      `${id}: ${window.label} (min ${window.minDays} business days)`,
    );
  }

  if (!found) {
    return {
      requiredMinBusinessDays: null,
      evidenceSource: "none",
      evidenceLabels: [],
    };
  }

  return {
    requiredMinBusinessDays: maxMin,
    evidenceSource: "catalog_timing_windows",
    evidenceLabels,
  };
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Business days strictly after `from` through `to` inclusive. */
export function countBusinessDaysAfter(from: Date, to: Date): number {
  let count = 0;
  const cur = startOfLocalDay(from);
  const end = startOfLocalDay(to);
  cur.setDate(cur.getDate() + 1);
  while (cur.getTime() <= end.getTime()) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Accepts ISO yyyy-mm-dd or common US slash dates. */
export function parseCustomerDeadline(raw: string): Date | null {
  const trimmed = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    const d = new Date(y, m, day);
    if (d.getFullYear() === y && d.getMonth() === m && d.getDate() === day) {
      return startOfLocalDay(d);
    }
    return null;
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) {
    const m = Number(us[1]) - 1;
    const day = Number(us[2]);
    const y = Number(us[3]);
    const d = new Date(y, m, day);
    if (d.getFullYear() === y && d.getMonth() === m && d.getDate() === day) {
      return startOfLocalDay(d);
    }
    return null;
  }
  const t = Date.parse(trimmed);
  if (Number.isNaN(t)) return null;
  return startOfLocalDay(new Date(t));
}
