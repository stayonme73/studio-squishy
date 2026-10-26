/**
 * Internal production-attempt ledger — separate from customer revision accounting.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { studioAutonomousProductionLoopV1 } from "@/config/studio-autonomous-production-loop-v1";
import type { FlyerReasoningConstraints } from "@/config/studio-autonomous-production-loop-v1";

import type {
  InternalProductionAttemptRecord,
  InternalProductionLoopOrigin,
  InternalProductionLoopRecord,
  ProductionCorrectionBrief,
} from "./types";

export function createInternalProductionLoop(input: {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  occurredAt?: string;
  productionFactFingerprint?: string | null;
  origin?: InternalProductionLoopOrigin;
}): InternalProductionLoopRecord {
  const now = input.occurredAt ?? new Date().toISOString();
  return {
    packageId: studioAutonomousProductionLoopV1.packageId,
    skuId: studioAutonomousProductionLoopV1.skuId,
    campaignId: input.campaignId,
    jobId: input.jobId,
    dispatchId: input.dispatchId,
    origin: input.origin ?? "initial_production",
    status: "in_progress",
    maxAttempts: studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
    attempts: [],
    briefs: [],
    activeBrief: null,
    ownerEscalation: null,
    failClosed: null,
    settledConstraints: null,
    settledBriefFingerprint: null,
    productionFactFingerprint: input.productionFactFingerprint ?? null,
    updatedAt: now,
  };
}

/**
 * A changed production fingerprint after prior attempts is a Studio quality
 * correction — a new internal loop, not a customer revision and not a bypass
 * of an escalated loop on the same fingerprint.
 */
export function resolveWorkingProductionLoop(input: {
  stored: InternalProductionLoopRecord | null;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  productionFactFingerprint: string;
  occurredAt?: string;
}): InternalProductionLoopRecord {
  const stored = input.stored;
  if (stored && isTechnicalOnlyExhaustion(stored)) {
    return createInternalProductionLoop({
      campaignId: input.campaignId,
      jobId: input.jobId,
      dispatchId: input.dispatchId,
      occurredAt: input.occurredAt,
      productionFactFingerprint: input.productionFactFingerprint,
      origin: "technical_recovery",
    });
  }
  if (
    stored &&
    stored.productionFactFingerprint === input.productionFactFingerprint
  ) {
    return stored;
  }
  const fingerprintChanged = Boolean(
    stored?.productionFactFingerprint &&
      stored.productionFactFingerprint !== input.productionFactFingerprint,
  );
  return createInternalProductionLoop({
    campaignId: input.campaignId,
    jobId: input.jobId,
    dispatchId: input.dispatchId,
    occurredAt: input.occurredAt,
    productionFactFingerprint: input.productionFactFingerprint,
    origin:
      fingerprintChanged && (stored?.attempts.length ?? 0) > 0
        ? "studio_quality_correction"
        : "initial_production",
  });
}

/** Creative budget is for QA class failures, not missing-browser export errors. */
export function isTechnicalOnlyExhaustion(
  loop: InternalProductionLoopRecord,
): boolean {
  return (
    (loop.status === "escalated" || loop.status === "fail_closed") &&
    loop.attempts.length > 0 &&
    loop.attempts.every(
      (attempt) =>
        attempt.failureCode === "EXPORT_FAILURE" ||
        attempt.failureCode === "RENDER_FAILURE" ||
        (attempt.failureClasses.length > 0 &&
          attempt.failureClasses.every((cls) => cls === "technical_render_failure")),
    )
  );
}

/**
 * Attempts belonging to the sequence now running, rather than to the job's history.
 *
 * Every budget and routing decision wants this number. Reading `attempts.length` instead
 * made a fresh production inherit the attempts of one that had already finished.
 */
export function currentSequenceAttempts(
  loop: InternalProductionLoopRecord,
): number {
  return loop.attempts.length - sequenceStart(loop);
}

/**
 * Where the current sequence begins, or 0 for anything this cannot trust.
 *
 * The field is read from a file. A start past the end of `attempts` would report zero
 * attempts no matter how many the run had made, and the attempt loop is bounded by exactly
 * that number — so a corrupt or hand-edited value would buy unbounded production. Anything
 * that is not an in-range integer counts the whole history instead, which bounds the run.
 */
function sequenceStart(loop: InternalProductionLoopRecord): number {
  const raw = loop.sequenceStartedAtAttempt;
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < 0 ||
    raw > loop.attempts.length
  ) {
    return 0;
  }
  return raw;
}

/**
 * Start counting a new production sequence, keeping every prior attempt on the record.
 *
 * For a run that is genuinely entitled to produce something new — an authorized fresh
 * execution, a customer revision, a Studio correction on changed facts — the attempts of
 * the sequence that came before are history, not this run's spent budget.
 *
 * Deliberately touches nothing that identifies the request: `status`, `settledConstraints`,
 * `settledBriefFingerprint`, and `productionFactFingerprint` are what the idempotency key
 * is built from, and all of them are left exactly as they were. A new sequence changes how
 * this run is *counted*, never whether it is the same request.
 */
export function beginNewAttemptSequence(
  loop: InternalProductionLoopRecord,
): InternalProductionLoopRecord {
  if (currentSequenceAttempts(loop) === 0) return loop;
  return { ...loop, sequenceStartedAtAttempt: loop.attempts.length };
}

export function nextAttemptTriggeredBy(
  loop: InternalProductionLoopRecord,
): InternalProductionAttemptRecord["triggeredBy"] {
  if (currentSequenceAttempts(loop) > 0) return "qa_correction";
  return loop.origin === "studio_quality_correction"
    ? "studio_quality_correction"
    : "initial_dispatch";
}

export function remainingInternalAttempts(
  loop: InternalProductionLoopRecord,
): number {
  return Math.max(0, loop.maxAttempts - currentSequenceAttempts(loop));
}

export function wouldExceedInternalAttemptBudget(
  loop: InternalProductionLoopRecord,
): boolean {
  return remainingInternalAttempts(loop) <= 0;
}

export function isInternalLoopExhausted(
  loop: Pick<InternalProductionLoopRecord, "status">,
): boolean {
  return loop.status === "escalated" || loop.status === "fail_closed";
}

export function appendInternalAttempt(
  loop: InternalProductionLoopRecord,
  attempt: InternalProductionAttemptRecord,
  nextBrief: ProductionCorrectionBrief | null,
  occurredAt = new Date().toISOString(),
  settledConstraints: FlyerReasoningConstraints | null = loop.settledConstraints,
): InternalProductionLoopRecord {
  const attempts = [...loop.attempts, attempt];
  const briefs = nextBrief ? [...loop.briefs, nextBrief] : loop.briefs;
  // Sequence-relative, so an inherited attempt cannot escalate a run on its first failure.
  // Counted through the same guarded reader the budget uses, so an untrusted start cannot
  // let a run keep failing past its budget without escalating.
  const sequenceAttempts = attempts.length - sequenceStart(loop);
  const exhausted = sequenceAttempts >= loop.maxAttempts && attempt.qaResult !== "pass";
  const passed = attempt.qaResult === "pass";
  return {
    ...loop,
    attempts,
    briefs,
    activeBrief: passed ? null : nextBrief,
    settledConstraints: passed ? settledConstraints : loop.settledConstraints,
    settledBriefFingerprint: passed
      ? (attempt.correctionBriefFingerprint ?? loop.settledBriefFingerprint)
      : loop.settledBriefFingerprint,
    status: passed
      ? "passed"
      : exhausted
        ? studioAutonomousProductionLoopV1.failClosed.afterInternalBudgetExhausted
          ? "fail_closed"
          : "escalated"
        : "in_progress",
    ownerEscalation:
      exhausted &&
      !passed &&
      studioAutonomousProductionLoopV1.ownerEscalation.afterInternalBudgetExhausted
        ? {
            required: true,
            reason:
              "Internal production correction budget exhausted. Owner judgment is required; customer Review stays closed.",
            at: occurredAt,
            failureClasses: nextBrief?.failureClasses ?? attempt.failureClasses,
          }
        : exhausted && !passed
          ? null
          : loop.ownerEscalation,
    failClosed:
      exhausted &&
      !passed &&
      studioAutonomousProductionLoopV1.failClosed.afterInternalBudgetExhausted
        ? {
            required: true,
            customerDisposition: "refund_or_cannot_deliver",
            reason:
              "Internal production correction budget exhausted. The Studio cannot deliver this flyer to Studio standard on the paid path. Owner will not finish the flyer by hand. Review stays closed. The honest next step is a refund or cannot-deliver close.",
            at: occurredAt,
            failureClasses: nextBrief?.failureClasses ?? attempt.failureClasses,
          }
        : loop.failClosed,
    updatedAt: occurredAt,
  };
}

export function loopLedgerRelativePath(artifactRootRel: string): string {
  return `${artifactRootRel.replace(/\\/g, "/")}/internal-production-loop.json`;
}

export function readInternalProductionLoopFile(
  repoRoot: string,
  artifactRootRel: string,
): InternalProductionLoopRecord | null {
  const abs = path.join(repoRoot, loopLedgerRelativePath(artifactRootRel));
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as InternalProductionLoopRecord;
  } catch {
    return null;
  }
}

export function writeInternalProductionLoopFile(input: {
  repoRoot: string;
  artifactRootRel: string;
  loop: InternalProductionLoopRecord;
}): string {
  const rel = loopLedgerRelativePath(input.artifactRootRel);
  const abs = path.join(input.repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(input.loop, null, 2)}\n`, "utf8");
  return rel;
}
