/**
 * sm-001 advisory schedule manifest + date governance.
 * Suggested dates respect campaign timing constraints; never invent customer facts.
 */

import { createHash } from "crypto";

import type {
  Sm001CalendarEntry,
  Sm001CalendarManifest,
  Sm001Caption,
  Sm001PlannedPostCount,
  Sm001PostingOrderEntry,
  Sm001TimingConstraints,
} from "./sm-001-types";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) {
    throw new Error(
      `DATE_GOVERNANCE_FAILURE: expected YYYY-MM-DD, got "${iso}"`,
    );
  }
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) {
    throw new Error(`DATE_GOVERNANCE_FAILURE: invalid date "${iso}"`);
  }
  return d;
}

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function fingerprintSm001Calendar(
  manifest: Pick<Sm001CalendarManifest, "plannedPostCount" | "entries" | "dateGovernance">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        plannedPostCount: manifest.plannedPostCount,
        policy: manifest.dateGovernance.policy,
        entries: manifest.entries.map((e) => ({
          orderIndex: e.orderIndex,
          assetId: e.assetId,
          captionId: e.captionId,
          suggestedDate: e.suggestedDate,
        })),
      }),
    )
    .digest("hex");
}

export type Sm001CalendarBuildResult =
  | { ok: true; manifest: Omit<Sm001CalendarManifest, "campaignSetRenderVersion"> & { campaignSetRenderVersion: number } }
  | {
      ok: false;
      code: "CALENDAR_FAILURE" | "DATE_GOVERNANCE_FAILURE" | "BINDING_FAILURE";
      message: string;
    };

/**
 * Build suggested dates for N posts.
 * - With start+end: space posts inside the inclusive window (fail if window too small).
 * - With end only: count backward from end.
 * - With start only: count forward from start.
 * - With neither: bounded advisory sequence from a fixed proof epoch (not customer facts).
 * Blackouts and end-date protection always applied when present.
 */
export function suggestSm001Dates(input: {
  plannedPostCount: Sm001PlannedPostCount;
  timing: Sm001TimingConstraints;
  /** Deterministic advisory epoch when no campaign dates exist (proof-safe). */
  advisoryEpochIso?: string;
}):
  | { ok: true; dates: string[]; policy: Sm001CalendarManifest["dateGovernance"] }
  | { ok: false; code: "DATE_GOVERNANCE_FAILURE"; message: string } {
  const n = input.plannedPostCount;
  const blackout = new Set(input.timing.blackoutDates ?? []);
  const start = input.timing.startDate
    ? parseIsoDate(input.timing.startDate)
    : null;
  const end = input.timing.endDate
    ? parseIsoDate(input.timing.endDate)
    : null;

  if (start && end && start.getTime() > end.getTime()) {
    return {
      ok: false,
      code: "DATE_GOVERNANCE_FAILURE",
      message: "Campaign startDate is after endDate",
    };
  }

  let policy: Sm001CalendarManifest["dateGovernance"]["policy"];
  let policyNote: string;
  let cursor: Date;
  let stepDays: number;

  if (start && end) {
    policy = "constraint_window";
    policyNote =
      "Suggested dates spaced inside authoritative campaign start/end window.";
    const spanDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS);
    if (spanDays + 1 < n) {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `Campaign window too short for ${n} posts (${spanDays + 1} days)`,
      };
    }
    // N is always >= 4 for this SKU, so the divisor is never zero.
    stepDays = Math.floor(spanDays / (n - 1));
    cursor = start;
  } else if (end) {
    policy = "constraint_window";
    policyNote =
      "Suggested dates count backward from authoritative end/expiration date.";
    stepDays = 2;
    cursor = addDays(end, -stepDays * (n - 1));
  } else if (start) {
    policy = "constraint_window";
    policyNote =
      "Suggested dates count forward from authoritative campaign start date.";
    stepDays = 2;
    cursor = start;
  } else {
    policy = "bounded_advisory_sequence";
    policyNote =
      "No campaign timing constraints present — Studio advisory sequence from bounded proof epoch (recommendations, not customer-provided dates).";
    stepDays = 2;
    cursor = parseIsoDate(input.advisoryEpochIso ?? "2026-03-10");
  }

  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    let candidate = i === 0 ? cursor : addDays(cursor, stepDays);
    // Skip blackout days forward (still must remain <= end when end exists).
    let guard = 0;
    while (blackout.has(formatIsoDate(candidate)) && guard < 40) {
      candidate = addDays(candidate, 1);
      guard++;
    }
    if (end && candidate.getTime() > end.getTime()) {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `Suggested date ${formatIsoDate(candidate)} is after campaign end ${formatIsoDate(end)}`,
      };
    }
    if (start && candidate.getTime() < start.getTime() && policy === "constraint_window") {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `Suggested date ${formatIsoDate(candidate)} is before campaign start ${formatIsoDate(start)}`,
      };
    }
    dates.push(formatIsoDate(candidate));
    cursor = candidate;
  }

  return {
    ok: true,
    dates,
    policy: {
      respectedConstraints: { ...input.timing },
      policy,
      policyNote,
    },
  };
}

export function assertSuggestedDatesObeyConstraints(
  dates: readonly string[],
  timing: Sm001TimingConstraints,
): { ok: true } | { ok: false; code: "DATE_GOVERNANCE_FAILURE"; message: string } {
  const start = timing.startDate ? parseIsoDate(timing.startDate) : null;
  const end = timing.endDate ? parseIsoDate(timing.endDate) : null;
  const blackout = new Set(timing.blackoutDates ?? []);

  for (const iso of dates) {
    const d = parseIsoDate(iso);
    if (start && d.getTime() < start.getTime()) {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `Suggested date ${iso} is before campaign start ${timing.startDate}`,
      };
    }
    if (end && d.getTime() > end.getTime()) {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `Suggested date ${iso} is after campaign end/expiration ${timing.endDate}`,
      };
    }
    if (blackout.has(iso)) {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `Suggested date ${iso} falls on a blackout date`,
      };
    }
  }
  return { ok: true };
}

export function buildSm001CalendarManifest(input: {
  plannedPostCount: Sm001PlannedPostCount;
  campaignSetRenderVersion: number;
  timing: Sm001TimingConstraints;
  postingOrder: readonly Sm001PostingOrderEntry[];
  captions: readonly Sm001Caption[];
  artifactPngByAssetId?: Record<string, string>;
  forceDateOutsideWindow?: boolean;
  advisoryEpochIso?: string;
}): Sm001CalendarBuildResult {
  const n = input.plannedPostCount;
  if (input.postingOrder.length !== n) {
    return {
      ok: false,
      code: "CALENDAR_FAILURE",
      message: `Calendar requires ${n} posting-order entries, found ${input.postingOrder.length}`,
    };
  }
  if (input.captions.length !== n) {
    return {
      ok: false,
      code: "CALENDAR_FAILURE",
      message: `Calendar requires ${n} captions, found ${input.captions.length}`,
    };
  }

  const suggested = suggestSm001Dates({
    plannedPostCount: n,
    timing: input.timing,
    advisoryEpochIso: input.advisoryEpochIso,
  });
  if (!suggested.ok) return suggested;

  let dates = [...suggested.dates];
  if (input.forceDateOutsideWindow && input.timing.endDate) {
    // Inject illegal date after end — must fail governance.
    dates = dates.map((d, i) =>
      i === dates.length - 1
        ? formatIsoDate(addDays(parseIsoDate(input.timing.endDate!), 5))
        : d,
    );
  }

  const gov = assertSuggestedDatesObeyConstraints(dates, input.timing);
  if (!gov.ok) return gov;

  const captionByAsset = new Map(
    input.captions.map((c) => [c.assetId, c] as const),
  );
  const entries: Sm001CalendarEntry[] = [];

  for (let i = 0; i < input.postingOrder.length; i++) {
    const order = input.postingOrder[i]!;
    const caption = captionByAsset.get(order.assetId);
    if (!caption) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Calendar missing caption for post ${order.assetId}`,
      };
    }
    if (caption.captionId !== order.captionId) {
      return {
        ok: false,
        code: "BINDING_FAILURE",
        message: `Calendar caption binding mismatch for ${order.assetId}`,
      };
    }
    if (order.position !== i + 1) {
      return {
        ok: false,
        code: "CALENDAR_FAILURE",
        message: `Calendar order gap at position ${i + 1}`,
      };
    }
    entries.push({
      setVersion: input.campaignSetRenderVersion,
      orderIndex: order.position,
      assetId: order.assetId,
      captionId: order.captionId,
      suggestedDate: dates[i]!,
      artifactPngRelativePath: input.artifactPngByAssetId?.[order.assetId],
    });
  }

  if (entries.length !== n) {
    return {
      ok: false,
      code: "CALENDAR_FAILURE",
      message: `Calendar must have exactly ${n} entries, found ${entries.length}`,
    };
  }

  return {
    ok: true,
    manifest: {
      kind: "sm_001_schedule_manifest",
      plannedPostCount: n,
      campaignSetRenderVersion: input.campaignSetRenderVersion,
      advisory: true,
      publishingExcluded: true,
      postingTimesExcluded: true,
      dateGovernance: suggested.policy,
      entries,
    },
  };
}
