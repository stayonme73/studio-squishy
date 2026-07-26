/**
 * Intake → attributed working-draft history.
 * Campaign remains the Intake answer store; this only records who changed what.
 * Does not invent speech attribution — the live Intake form is direct UI only.
 */

import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import { projectIntakeSharedContactKey } from "@/lib/project-intake-plan";
import {
  appendWorkingDraftAttribution,
  ensureWorkingDraft,
  updateWorkingDraftCursor,
  type WorkingDraftRecord,
  type WorkingDraftStorage,
  type WriteWorkingDraftResult,
} from "@/lib/studio-working-draft";

export const INTAKE_ATTRIBUTION_ACTION = {
  fieldPrefix: "intake.field.",
  carryForwardPrefix: "intake.carry-forward.",
  submitted: "intake.submitted",
} as const;

export type IntakeAnswerChange = {
  fieldKey: string;
  previousValue: string;
  newValue: string;
  kind: "customer-edit" | "system-carry-forward";
};

export type IntakeCarryForwardSeed = {
  fieldKey: string;
  value: string;
};

function normalizeAnswer(value: unknown): string {
  return String(value ?? "").trim();
}

function summarizeValue(value: string): string {
  if (!value) return "(empty)";
  if (value.length <= 80) return value;
  return `${value.slice(0, 77)}...`;
}

/** Business-name key used by multi-service Intake shared contact. */
export function intakeSharedBusinessNameKey(): string {
  return projectIntakeSharedContactKey("businessName");
}

export function intakeBusinessNameCarryForward(
  prefillBusinessName: string | null | undefined,
): IntakeCarryForwardSeed[] {
  const value = prefillBusinessName?.trim();
  if (!value) return [];
  return [{ fieldKey: intakeSharedBusinessNameKey(), value }];
}

/**
 * Diff previous campaign draft answers against the next write.
 * Unchanged keys are omitted. Carry-forward seeds only apply when the previous
 * value was empty and the new value matches the seeded opening value.
 */
export function diffIntakeAnswers(
  previous: RouteMapIntakeAnswers | null | undefined,
  next: RouteMapIntakeAnswers,
  carryForward: readonly IntakeCarryForwardSeed[] = [],
): IntakeAnswerChange[] {
  const prev = previous ?? {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const carryByKey = new Map(
    carryForward.map((seed) => [seed.fieldKey, normalizeAnswer(seed.value)]),
  );
  const changes: IntakeAnswerChange[] = [];

  for (const fieldKey of keys) {
    const previousValue = normalizeAnswer(prev[fieldKey]);
    const newValue = normalizeAnswer(next[fieldKey]);
    if (previousValue === newValue) continue;

    const seeded = carryByKey.get(fieldKey);
    const kind =
      previousValue === "" && seeded !== undefined && seeded === newValue
        ? ("system-carry-forward" as const)
        : ("customer-edit" as const);

    changes.push({ fieldKey, previousValue, newValue, kind });
  }

  return changes;
}

function appendFieldChange(
  draft: WorkingDraftRecord,
  change: IntakeAnswerChange,
  storage?: WorkingDraftStorage | null,
): WriteWorkingDraftResult {
  if (change.kind === "system-carry-forward") {
    return appendWorkingDraftAttribution(
      draft,
      {
        actor: "system",
        initiatedBy: "system",
        executedBy: "system",
        actionCode: `${INTAKE_ATTRIBUTION_ACTION.carryForwardPrefix}${change.fieldKey}`,
        summary: `System carried opening value into Intake ${change.fieldKey}: ${summarizeValue(change.newValue)} (original decision preserved elsewhere; not a new customer choice)`,
      },
      storage,
    );
  }

  return appendWorkingDraftAttribution(
    draft,
    {
      actor: "customer",
      initiatedBy: "customer",
      executedBy: "customer",
      actionCode: `${INTAKE_ATTRIBUTION_ACTION.fieldPrefix}${change.fieldKey}`,
      summary: `Customer edited Intake ${change.fieldKey} via form: ${summarizeValue(change.previousValue)} → ${summarizeValue(change.newValue)}`,
    },
    storage,
  );
}

/**
 * Record attributed field changes for a successful Intake draft save.
 * No-op (no write) when nothing meaningful changed — avoids render/save noise.
 */
export function recordIntakeAnswerChanges(params: {
  previous: RouteMapIntakeAnswers | null | undefined;
  next: RouteMapIntakeAnswers;
  carryForward?: readonly IntakeCarryForwardSeed[];
  storage?: WorkingDraftStorage | null;
}): WriteWorkingDraftResult & { changeCount: number } {
  const changes = diffIntakeAnswers(
    params.previous,
    params.next,
    params.carryForward ?? [],
  );
  if (changes.length === 0) {
    const draft = ensureWorkingDraft(params.storage);
    return { ok: true, draft, changeCount: 0 };
  }

  let draft = ensureWorkingDraft(params.storage);
  for (const change of changes) {
    const result = appendFieldChange(draft, change, params.storage);
    if (!result.ok) return { ...result, changeCount: changes.length };
    draft = result.draft;
  }

  const cursor = updateWorkingDraftCursor(
    draft,
    {
      conversationLocation: "intake",
      journeyPhase: "intake",
      flowStep: "intake-draft",
    },
    params.storage,
  );
  if (!cursor.ok) return { ...cursor, changeCount: changes.length };
  return { ok: true, draft: cursor.draft, changeCount: changes.length };
}

export type IntakeSubmissionAttributionInput = {
  campaignId?: string | null;
  auth: "signed-in" | "signed-out";
  destination: string;
  requiredSatisfied: boolean;
  answers: RouteMapIntakeAnswers;
  /** When known — submission must not run if campaign write failed. */
  submittedAt: string;
  storage?: WorkingDraftStorage | null;
};

function hasIntakeSubmittedEvent(draft: WorkingDraftRecord): boolean {
  return draft.attribution.some(
    (event) => event.actionCode === INTAKE_ATTRIBUTION_ACTION.submitted,
  );
}

/**
 * Distinct submission event. Idempotent — a second call does not duplicate.
 * Does not imply payment processing, Studio review, or production start.
 */
export function recordIntakeSubmission(
  params: IntakeSubmissionAttributionInput,
): WriteWorkingDraftResult & { duplicated: boolean } {
  let draft = ensureWorkingDraft(params.storage);
  if (hasIntakeSubmittedEvent(draft)) {
    return { ok: true, draft, duplicated: true };
  }

  const projectRef = params.campaignId?.trim() || "local-campaign";
  const fieldCount = Object.keys(params.answers).filter(
    (key) => normalizeAnswer(params.answers[key]).length > 0,
  ).length;

  const appended = appendWorkingDraftAttribution(
    draft,
    {
      actor: "customer",
      initiatedBy: "customer",
      executedBy: "customer",
      actionCode: INTAKE_ATTRIBUTION_ACTION.submitted,
      summary: `Customer submitted Project Intake (${params.auth}; requiredSatisfied=${params.requiredSatisfied}; fields=${fieldCount}; project=${projectRef}; handoff=${params.destination}; at=${params.submittedAt}). Submission is not payment, Studio review, or production acceptance.`,
    },
    params.storage,
  );
  if (!appended.ok) return { ...appended, duplicated: false };
  draft = appended.draft;

  const cursor = updateWorkingDraftCursor(
    draft,
    {
      conversationLocation: "intake",
      journeyPhase: "intake",
      flowStep: "intake-submitted",
    },
    params.storage,
  );
  if (!cursor.ok) return { ...cursor, duplicated: false };
  return { ok: true, draft: cursor.draft, duplicated: false };
}
