/**
 * Studio Extras shared job truth. Every role reads this record; no private copies.
 * Pure functions — callers persist the returned value on `campaign.studioExtras`.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CondensedPackageId } from "@/config/studio-customer-journey-condense-v1";
import {
  studioExtraDefinitions,
  studioExtrasCourtesyAdjustmentCents,
  studioExtrasV1,
  type StudioExtraId,
} from "@/config/studio-extras-v1";

import { eligibleStudioExtras } from "./selection";
import {
  missingStudioExtraInputs,
  STUDIO_EXTRA_INPUTS,
  studioExtraMenuKind,
  type StudioExtraInputValues,
} from "./inputs";
import type {
  CampaignStudioExtras,
  StudioExtraArtifact,
  StudioExtraAttempt,
  StudioExtraHistoryEvent,
  StudioExtraRecord,
  StudioExtraState,
  StudioExtraUnit,
  StudioExtrasCourtesy,
} from "./types";

const COPY_BUDGET = studioExtrasV1.exhaustion.attemptBudgets.copy;
const DESIGN_BUDGET = studioExtrasV1.exhaustion.attemptBudgets.design;

type UnitPlan = Pick<StudioExtraUnit, "unitId" | "label" | "kind" | "productionLine"> & {
  recoveryAvailable: boolean;
};

/**
 * Work units per Extra. Copy recovery is not offered: the template assembler
 * is not Studio-quality writing, so it is not an approved recovery for Extras.
 */
export function studioExtraUnitPlan(
  id: StudioExtraId,
  values: StudioExtraInputValues = {},
): readonly UnitPlan[] {
  switch (id) {
    case "review_request_kit":
      return [
        { unitId: "review-messages", label: "Review-request messages", kind: "copy", productionLine: "studio-extras-copy", recoveryAvailable: false },
        { unitId: "review-card", label: "Review-request card with QR code", kind: "design", productionLine: "studio-extras-review-card", recoveryAvailable: true },
      ];
    case "email_and_text":
      return [
        { unitId: "email", label: "Promotional email", kind: "copy", productionLine: "v2-rtu-email-kit", recoveryAvailable: false },
        { unitId: "texts", label: "Two text messages", kind: "copy", productionLine: "v2-rtu-sms-kit", recoveryAvailable: false },
      ];
    case "ad_creative":
      return [
        { unitId: "ad-copy", label: "Headline and main-text options", kind: "copy", productionLine: "studio-extras-copy", recoveryAvailable: false },
        { unitId: "ad-graphics", label: "Square and portrait ad graphics", kind: "design", productionLine: "v2-rtu-promotion-graphics", recoveryAvailable: true },
      ];
    case "flyer":
      return [
        { unitId: "flyer", label: "Single-page flyer", kind: "design", productionLine: "v2-rtu-flyer", recoveryAvailable: true },
      ];
    case "menu_price_list": {
      const priceList = studioExtraMenuKind(values) === "price_list";
      return [
        {
          unitId: "menu",
          label: priceList ? "Single-page price list" : "Single-page menu",
          kind: "design",
          productionLine: priceList ? "v2-rtu-service-sheet" : "v2-rtu-menu",
          recoveryAvailable: true,
        },
      ];
    }
  }
}

function event(
  at: string,
  name: string,
  detail: string,
  actor: StudioExtraHistoryEvent["actor"] = "system",
): StudioExtraHistoryEvent {
  return { at, event: name, detail, actor };
}

function freshUnit(plan: UnitPlan): StudioExtraUnit {
  return {
    unitId: plan.unitId,
    label: plan.label,
    kind: plan.kind,
    productionLine: plan.productionLine,
    budget: plan.kind === "copy" ? COPY_BUDGET : DESIGN_BUDGET,
    attempts: [],
    recovery: { available: plan.recoveryAvailable, attempted: false },
    quality: { outcome: "pending" },
    artifacts: [],
  };
}

function freshRecord(id: StudioExtraId, at: string): StudioExtraRecord {
  return {
    id,
    name: studioExtraDefinitions[id].name,
    state: "waiting_on_client",
    requiredInputs: [...STUDIO_EXTRA_INPUTS[id].required],
    missingInputs: [...STUDIO_EXTRA_INPUTS[id].required],
    units: studioExtraUnitPlan(id).map(freshUnit),
    exhaustion: null,
    lastRevisionRound: null,
    revisionNote: null,
    approvedAt: null,
    deliveredAt: null,
    history: [event(at, "selected", `${studioExtraDefinitions[id].name} selected at checkout.`, "customer")],
  };
}

/** Seed the shared truth from a validated checkout selection. */
export function initialStudioExtrasTruth(
  packageId: CondensedPackageId,
  extras: readonly StudioExtraId[],
  at: string,
): CampaignStudioExtras {
  return {
    schemaVersion: 1,
    packageId,
    selected: [...extras],
    eligibleAtSelection: [...eligibleStudioExtras(packageId)],
    selectedAt: at,
    records: extras.map((id) => freshRecord(id, at)),
    courtesy: null,
    updatedAt: at,
  };
}

const PRODUCTION_LOCKED: readonly StudioExtraState[] = [
  "in_production",
  "ready_for_review",
  "approved",
  "delivered",
  "exhausted",
];

function withRecord(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  at: string,
  update: (record: StudioExtraRecord) => StudioExtraRecord,
): CampaignStudioExtras {
  return {
    ...truth,
    updatedAt: at,
    records: truth.records.map((record) => (record.id === id ? update(record) : record)),
  };
}

/**
 * Re-read inputs. A missing required input is Waiting on Client — never
 * exhaustion, never Courtesy-eligible.
 */
export function refreshStudioExtrasInputs(
  truth: CampaignStudioExtras,
  values: StudioExtraInputValues,
  at: string,
): CampaignStudioExtras {
  let changed = false;
  const records = truth.records.map((record) => {
    const missing = missingStudioExtraInputs(record.id, values);
    const plans = studioExtraUnitPlan(record.id, values);
    const unitsChanged =
      record.units.every((unit) => unit.attempts.length === 0) &&
      plans.some((plan, index) => record.units[index]?.productionLine !== plan.productionLine);
    const units = unitsChanged ? plans.map(freshUnit) : record.units;
    if (PRODUCTION_LOCKED.includes(record.state)) {
      if (!unitsChanged) return record;
    }
    if (record.state === "waiting_on_system" && missing.length === 0 && !unitsChanged) {
      return record;
    }
    const nextState: StudioExtraState =
      PRODUCTION_LOCKED.includes(record.state)
        ? record.state
        : missing.length > 0
          ? "waiting_on_client"
          : record.state === "revision_requested"
            ? "revision_requested"
            : "ready_for_production";
    const sameMissing =
      missing.length === record.missingInputs.length &&
      missing.every((key) => record.missingInputs.includes(key));
    if (sameMissing && nextState === record.state && !unitsChanged) return record;
    changed = true;
    const history = [...record.history];
    if (nextState !== record.state) {
      history.push(
        event(
          at,
          nextState === "waiting_on_client" ? "waiting_on_client" : "inputs_complete",
          nextState === "waiting_on_client"
            ? `Waiting on the customer for: ${missing.join(", ")}.`
            : "All required inputs supplied.",
        ),
      );
    }
    return { ...record, missingInputs: missing, state: nextState, units, history };
  });
  return changed ? { ...truth, records, updatedAt: at } : truth;
}

export function markStudioExtraInProduction(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  at: string,
): CampaignStudioExtras {
  return withRecord(truth, id, at, (record) => {
    if (record.state !== "ready_for_production" && record.state !== "revision_requested") return record;
    return {
      ...record,
      state: "in_production",
      history: [...record.history, event(at, "production_started", "Production started.")],
    };
  });
}

export function markStudioExtraWaitingOnSystem(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  at: string,
  reason: string,
): CampaignStudioExtras {
  return withRecord(truth, id, at, (record) => ({
    ...record,
    state: "waiting_on_system",
    history: [...record.history, event(at, "waiting_on_system", reason)],
  }));
}

function updateUnit(
  record: StudioExtraRecord,
  unitId: string,
  update: (unit: StudioExtraUnit) => StudioExtraUnit,
): StudioExtraRecord {
  return { ...record, units: record.units.map((unit) => (unit.unitId === unitId ? update(unit) : unit)) };
}

/** Record one production attempt. Attempts past the budget are refused. */
export function recordStudioExtraAttempt(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  unitId: string,
  attempt: Omit<StudioExtraAttempt, "attempt">,
): CampaignStudioExtras {
  return withRecord(truth, id, attempt.at, (record) => {
    const unit = record.units.find((u) => u.unitId === unitId);
    if (!unit) return record;
    if (attempt.route === "primary") {
      const primaries = unit.attempts.filter((a) => a.route === "primary").length;
      if (primaries >= unit.budget) return record;
    } else if (!unit.recovery.available || unit.recovery.attempted) {
      return record;
    }
    const numbered: StudioExtraAttempt = { ...attempt, attempt: unit.attempts.length + 1 };
    const next = updateUnit(record, unitId, (u) => ({
      ...u,
      attempts: [...u.attempts, numbered],
      recovery:
        attempt.route === "recovery"
          ? { ...u.recovery, attempted: true, outcome: attempt.outcome === "passed" ? "passed" : "failed" }
          : u.recovery,
    }));
    return {
      ...next,
      history: [
        ...next.history,
        event(
          attempt.at,
          attempt.route === "recovery" ? "recovery_attempt" : "production_attempt",
          `${unit.label}: ${attempt.route} attempt ${numbered.attempt} ${attempt.outcome}${attempt.reasons.length ? ` (${attempt.reasons.join("; ")})` : ""}.`,
        ),
      ],
    };
  });
}

/** Quality's call on a unit. Passing stores the artifacts the customer will review. */
export function recordStudioExtraQuality(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  unitId: string,
  input: {
    at: string;
    outcome: "passed" | "below_standard";
    summary: string;
    artifacts?: readonly StudioExtraArtifact[];
  },
): CampaignStudioExtras {
  return withRecord(truth, id, input.at, (record) => {
    const next = updateUnit(record, unitId, (u) => ({
      ...u,
      quality: { outcome: input.outcome, at: input.at, summary: input.summary },
      artifacts: input.outcome === "passed" ? [...(input.artifacts ?? [])] : u.artifacts,
    }));
    const settled = settleStudioExtraState(next, input.at);
    return {
      ...settled,
      history: [
        ...settled.history.slice(0, record.history.length),
        event(input.at, "quality_review", `${unitId}: ${input.outcome} — ${input.summary}`),
        ...settled.history.slice(record.history.length),
      ],
    };
  });
}

/** True only when every canonical exhaustion step is proven for this unit. */
export function studioExtraUnitExhausted(unit: StudioExtraUnit): boolean {
  const primaryFailures = unit.attempts.filter((a) => a.route === "primary" && a.outcome === "failed").length;
  if (primaryFailures < unit.budget) return false;
  if (unit.recovery.available && !(unit.recovery.attempted && unit.recovery.outcome === "failed")) return false;
  return unit.quality.outcome === "below_standard";
}

function settleStudioExtraState(record: StudioExtraRecord, at: string): StudioExtraRecord {
  if (record.state === "exhausted" || record.state === "approved" || record.state === "delivered") {
    return record;
  }
  const exhaustedUnit = record.units.find(studioExtraUnitExhausted);
  if (exhaustedUnit) {
    if (record.missingInputs.length > 0) return record;
    return {
      ...record,
      state: "exhausted",
      exhaustion: {
        at,
        unitId: exhaustedUnit.unitId,
        customerSuppliedRequiredInputs: true,
        attemptsUsed: exhaustedUnit.attempts.length,
        attemptBudget: exhaustedUnit.budget,
        recoveryAvailable: exhaustedUnit.recovery.available,
        recoveryAttempted: exhaustedUnit.recovery.attempted,
        qualitySummary: exhaustedUnit.quality.summary ?? "",
      },
      history: [
        ...record.history,
        event(at, "exhausted", `${exhaustedUnit.label} could not reach Studio quality after the required process.`),
      ],
    };
  }
  if (record.units.every((unit) => unit.quality.outcome === "passed")) {
    return {
      ...record,
      state: "ready_for_review",
      history: [...record.history, event(at, "ready_for_review", "Passed Quality. Ready for the customer's review.")],
    };
  }
  return record;
}

/**
 * Customer revision on an Extra. Uses the package's shared revision round.
 * Clears Quality so the unit is produced and checked again.
 */
export function requestStudioExtraRevision(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  input: { at: string; note: string; packageRound: number },
): CampaignStudioExtras {
  return withRecord(truth, id, input.at, (record) => {
    if (record.state !== "ready_for_review") return record;
    return {
      ...record,
      state: "revision_requested",
      lastRevisionRound: input.packageRound,
      revisionNote: input.note.trim(),
      units: record.units.map((unit) => ({
        ...unit,
        attempts: [],
        recovery: { available: unit.recovery.available, attempted: false },
        quality: { outcome: "pending" as const },
      })),
      history: [
        ...record.history,
        event(input.at, "revision_requested", `Revision round ${input.packageRound}: ${input.note.trim()}`, "customer"),
      ],
    };
  });
}

export type StudioExtraChangeRequest = { id: StudioExtraId; note: string };

export type StudioExtrasChangeResult =
  | { ok: true; truth: CampaignStudioExtras; extraIds: readonly StudioExtraId[] }
  | { ok: false; error: string };

/**
 * One complete list of Extra changes. With `packageRound`, the changes ride a
 * package revision already recorded in the correction ledger. Without it, the
 * list opens an Extras-only round that spends a shared round once it reaches Review.
 */
export function requestStudioExtrasChanges(
  truth: CampaignStudioExtras,
  changes: readonly StudioExtraChangeRequest[],
  input: { at: string; packageRound: number; ridesPackageRevision: boolean },
): StudioExtrasChangeResult {
  const cleaned = changes
    .map((change) => ({ id: change.id, note: change.note.trim() }))
    .filter((change) => change.note.length > 0);
  if (cleaned.length === 0) {
    return { ok: false, error: "Describe the change you want for at least one Studio Extra." };
  }
  const ids = new Set<StudioExtraId>();
  for (const change of cleaned) {
    if (ids.has(change.id)) return { ok: false, error: "List each Studio Extra once." };
    ids.add(change.id);
    const record = truth.records.find((r) => r.id === change.id);
    if (!record) return { ok: false, error: "That Studio Extra is not part of this order." };
    if (record.state !== "ready_for_review") {
      return { ok: false, error: `${record.name} is not open for review right now.` };
    }
  }
  let next = truth;
  for (const change of cleaned) {
    next = requestStudioExtraRevision(next, change.id, {
      at: input.at,
      note: change.note,
      packageRound: input.packageRound,
    });
  }
  if (!input.ridesPackageRevision) {
    next = {
      ...next,
      revisionRounds: [
        ...(next.revisionRounds ?? []),
        {
          roundId: `extras-round:${input.at}`,
          requestedAt: input.at,
          extraIds: [...ids],
          reachedReviewAt: null,
          voidedAt: null,
        },
      ],
    };
  }
  return { ok: true, truth: next, extraIds: [...ids] };
}

const REACHED_REVIEW: readonly StudioExtraState[] = ["ready_for_review", "approved", "delivered"];

/** Close Extras-only rounds: counted once revised work is back in Review; voided if it never can be. */
export function settleStudioExtrasRevisionRounds(
  truth: CampaignStudioExtras,
  at: string,
): CampaignStudioExtras {
  const rounds = truth.revisionRounds ?? [];
  let changed = false;
  const settled = rounds.map((round) => {
    if (round.reachedReviewAt || round.voidedAt) return round;
    const records = round.extraIds
      .map((id) => truth.records.find((r) => r.id === id))
      .filter((r): r is StudioExtraRecord => Boolean(r));
    const open = records.some((r) => !REACHED_REVIEW.includes(r.state) && r.state !== "exhausted");
    if (open) return round;
    changed = true;
    return records.some((r) => REACHED_REVIEW.includes(r.state))
      ? { ...round, reachedReviewAt: at }
      : { ...round, voidedAt: at };
  });
  return changed ? { ...truth, revisionRounds: settled, updatedAt: at } : truth;
}

/** Approve every Extra currently in Review and release it. Extras need no assembly step. */
export function approveAndDeliverReadyStudioExtras(
  truth: CampaignStudioExtras,
  at: string,
  only?: readonly StudioExtraId[],
): { truth: CampaignStudioExtras; approved: readonly StudioExtraId[] } {
  let next = truth;
  const approved: StudioExtraId[] = [];
  for (const record of truth.records) {
    if (record.state !== "ready_for_review") continue;
    if (only && !only.includes(record.id)) continue;
    next = approveStudioExtra(next, record.id, at);
    next = deliverStudioExtra(next, record.id, at);
    approved.push(record.id);
  }
  return { truth: next, approved };
}

export function approveStudioExtra(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  at: string,
): CampaignStudioExtras {
  return withRecord(truth, id, at, (record) => {
    if (record.state !== "ready_for_review") return record;
    return {
      ...record,
      state: "approved",
      approvedAt: at,
      history: [...record.history, event(at, "approved", "Approved by the customer.", "customer")],
    };
  });
}

export function deliverStudioExtra(
  truth: CampaignStudioExtras,
  id: StudioExtraId,
  at: string,
): CampaignStudioExtras {
  return withRecord(truth, id, at, (record) => {
    if (record.state !== "approved") return record;
    return {
      ...record,
      state: "delivered",
      deliveredAt: at,
      history: [...record.history, event(at, "delivered", "Released in Final Delivery.")],
    };
  });
}

/**
 * Courtesy Adjustment eligibility. Stripe execution is separate and runs only
 * after every proof here is true. This function does not move money.
 */
export function evaluateStudioExtrasCourtesy(
  truth: CampaignStudioExtras,
  campaign: Pick<CampaignRecord, "paymentTruth">,
  at: string,
): StudioExtrasCourtesy {
  const prior = truth.courtesy;
  const exhausted = truth.records.filter((record) => record.state === "exhausted" && record.exhaustion);
  const confirmedPaid = campaign.paymentTruth?.status === "confirmed"
    ? campaign.paymentTruth.confirmedAmountCents
    : undefined;
  const amountPaidCents = typeof confirmedPaid === "number" ? confirmedPaid : 0;
  const count = Math.min(exhausted.length, 2);
  const percent = count === 0 ? 0 : studioExtrasV1.courtesyAdjustment.percentByExhaustedCount[count as 1 | 2];
  const total = studioExtrasCourtesyAdjustmentCents(amountPaidCents, count);
  const execution = prior?.paymentExecution ?? "not_started";
  const completedCents = execution === "completed" ? (prior?.refundAmountCents ?? prior?.totalAdjustmentCents ?? 0) : 0;
  const heldCents =
    execution === "accepted" || execution === "uncertain"
      ? (prior?.refundAmountCents ?? prior?.dueCents ?? 0)
      : 0;
  const due = Math.max(total - completedCents - heldCents, 0);
  const proof: Record<string, boolean> = {
    customer_supplied_required_inputs: exhausted.every((r) => r.missingInputs.length === 0 && r.exhaustion?.customerSuppliedRequiredInputs === true),
    required_production_attempts_exhausted: exhausted.every((r) => (r.exhaustion?.attemptsUsed ?? 0) >= (r.exhaustion?.attemptBudget ?? Infinity)),
    approved_recovery_attempted_where_available: exhausted.every((r) => !r.exhaustion?.recoveryAvailable || r.exhaustion.recoveryAttempted),
    quality_confirmed_below_studio_standard: exhausted.every((r) => r.units.some((u) => u.quality.outcome === "below_standard")),
    extra_marked_exhausted: exhausted.length > 0,
    amount_calculated_from_amount_actually_paid: amountPaidCents > 0,
    percent_matches_exhausted_count: percent === (count === 0 ? 0 : count * 5),
    same_adjustment_not_already_issued: due > 0,
  };
  const eligible = Object.values(proof).every(Boolean) && execution !== "accepted" && execution !== "uncertain" && execution !== "completed";
  const names = exhausted.map((r) => r.name);
  const moneyMoved = execution === "completed" || completedCents > 0;
  return {
    status: moneyMoved
      ? "issued"
      : eligible || execution === "failed" || execution === "accepted" || execution === "uncertain"
        ? "COURTESY_ADJUSTMENT_REQUIRED"
        : "not_eligible",
    exhaustedExtraIds: exhausted.map((r) => r.id),
    percent,
    amountPaidCents,
    totalAdjustmentCents: total,
    alreadyIssuedCents: completedCents,
    dueCents: eligible ? due : 0,
    proof,
    paymentExecution: execution,
    refundAmountCents: prior?.refundAmountCents ?? null,
    stripeRefundId: prior?.stripeRefundId ?? null,
    idempotencyKey: prior?.idempotencyKey ?? null,
    refundAttempt: prior?.refundAttempt ?? 0,
    providerStatus: prior?.providerStatus ?? null,
    failureDefinitive: prior?.failureDefinitive ?? null,
    failureReason: prior?.failureReason ?? null,
    ownerAttention: execution === "not_started" ? "none" : prior?.ownerAttention ?? "none",
    ownerNotice:
      execution === "not_started"
        ? eligible
          ? `Tagia, ${names.length === 1 ? "one Studio Extra" : "two Studio Extras"} (${names.join(" and ")}) exhausted after the required recovery path. A ${percent}% Courtesy Adjustment of $${(due / 100).toFixed(2)} is due on $${(amountPaidCents / 100).toFixed(2)} paid. The return to the original card has not completed.`
          : null
        : prior?.ownerNotice ?? null,
    computedAt: prior?.computedAt && execution !== "not_started" ? prior.computedAt : at,
    ...(prior?.customerEmailStage
      ? {
          customerEmailStage: prior.customerEmailStage,
          customerEmailRefundId: prior.customerEmailRefundId ?? null,
        }
      : {}),
    ...(prior?.customerEmailAttempts
      ? {
          customerEmailAttempts: prior.customerEmailAttempts,
          customerEmailLastAttemptAt: prior.customerEmailLastAttemptAt ?? null,
        }
      : {}),
  };
}

export function withStudioExtrasCourtesy(
  truth: CampaignStudioExtras,
  campaign: Pick<CampaignRecord, "paymentTruth">,
  at: string,
): CampaignStudioExtras {
  const courtesy = evaluateStudioExtrasCourtesy(truth, campaign, at);
  const prior = truth.courtesy;
  if (
    prior &&
    prior.status === courtesy.status &&
    prior.dueCents === courtesy.dueCents &&
    prior.paymentExecution === courtesy.paymentExecution &&
    prior.stripeRefundId === courtesy.stripeRefundId &&
    prior.exhaustedExtraIds.join() === courtesy.exhaustedExtraIds.join()
  ) {
    return truth;
  }
  return { ...truth, courtesy, updatedAt: at };
}

/** Customer-facing one-line status per Extra. */
export function studioExtraCustomerStatus(record: StudioExtraRecord): string {
  switch (record.state) {
    case "waiting_on_client":
      return "Waiting on you — add the details listed in My Studio.";
    case "ready_for_production":
    case "in_production":
    case "waiting_on_system":
      return "In production.";
    case "ready_for_review":
      return "Ready for your review.";
    case "revision_requested":
      return "Your changes are in production.";
    case "approved":
      return "Approved.";
    case "delivered":
      return "Delivered in Final Delivery.";
    case "exhausted":
      return "The Studio could not complete this Extra to Studio quality, so it will not be sent. A Courtesy Adjustment applies.";
  }
}
