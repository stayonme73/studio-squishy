/**
 * Discovery conversation — working draft read/write + attribution.
 */

import {
  discoveryLiveQuestionsV1,
  discoveryQuestion1V1,
  getDiscoveryLiveQuestion,
  getNextDiscoveryLiveQuestion,
  type DiscoveryQuestion1CaptureMethod,
  type DiscoveryQuestionStorageKey,
} from "@/config/discovery-question-1-v1";
import type {
  DiscoveryAnswersSliceV1,
  DiscoveryQuestionPhase,
  DiscoveryQuestionRecord,
} from "@/lib/discovery-question-1/types";
import {
  ensureWorkingDraft,
  patchWorkingDraftSlice,
  updateWorkingDraftCursor,
  type WorkingDraftRecord,
  type WorkingDraftStorage,
  type WriteWorkingDraftResult,
} from "@/lib/studio-working-draft";
import type { WorkingDraftAttributionActor } from "@/lib/studio-working-draft/types";

function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyDiscoveryQuestion(
  storageKey: DiscoveryQuestionStorageKey = "q1",
  overrides: Partial<DiscoveryQuestionRecord> = {},
): DiscoveryQuestionRecord {
  const def = getDiscoveryLiveQuestion(storageKey);
  return {
    id: def.id,
    storageKey: def.storageKey,
    question: def.question,
    answer: "",
    phase: "presenting",
    captureMethod: null,
    initiatedBy: "voice",
    executedBy: null,
    confirmedAt: null,
    updatedAt: nowIso(),
    ...overrides,
  };
}

/** @deprecated Prefer createEmptyDiscoveryQuestion */
export function createEmptyDiscoveryQuestion1(
  overrides: Partial<DiscoveryQuestionRecord> = {},
): DiscoveryQuestionRecord {
  return createEmptyDiscoveryQuestion("q1", overrides);
}

function asDiscoveryAnswersSlice(value: unknown): DiscoveryAnswersSliceV1 {
  if (typeof value !== "object" || value === null) return {};
  const record = value as DiscoveryAnswersSliceV1 & Record<string, unknown>;
  if (
    record.q1 ||
    record.q2 ||
    record.q3 ||
    record.q4 ||
    record.tiles ||
    record.activeKey
  ) {
    return {
      q1: normalizeLegacyQ1(record.q1),
      q2: record.q2 as DiscoveryQuestionRecord | undefined,
      q3: record.q3 as DiscoveryQuestionRecord | undefined,
      q4: record.q4 as DiscoveryQuestionRecord | undefined,
      activeKey: record.activeKey as DiscoveryQuestionStorageKey | undefined,
      tiles: record.tiles,
    };
  }
  return { tiles: record as Record<string, string> };
}

function normalizeLegacyQ1(
  q1: DiscoveryQuestionRecord | undefined,
): DiscoveryQuestionRecord | undefined {
  if (!q1) return undefined;
  if (q1.storageKey) return q1;
  return {
    ...q1,
    storageKey: "q1",
    id: q1.id || discoveryQuestion1V1.id,
  };
}

export function readDiscoveryAnswersSlice(
  draft: WorkingDraftRecord,
): DiscoveryAnswersSliceV1 {
  return asDiscoveryAnswersSlice(draft.slices.discoveryAnswers);
}

export function readDiscoveryQuestion(
  draft: WorkingDraftRecord,
  storageKey: DiscoveryQuestionStorageKey,
): DiscoveryQuestionRecord | null {
  const slice = readDiscoveryAnswersSlice(draft);
  return slice[storageKey] ?? null;
}

export function readDiscoveryQuestion1(
  draft: WorkingDraftRecord,
): DiscoveryQuestionRecord | null {
  return readDiscoveryQuestion(draft, "q1");
}

export function readActiveDiscoveryKey(
  draft: WorkingDraftRecord,
): DiscoveryQuestionStorageKey {
  const slice = readDiscoveryAnswersSlice(draft);
  for (const question of discoveryLiveQuestionsV1) {
    const record = slice[question.storageKey];
    if (!isDiscoveryQuestionSettled(record)) return question.storageKey;
  }
  return (
    slice.activeKey ??
    discoveryLiveQuestionsV1[discoveryLiveQuestionsV1.length - 1].storageKey
  );
}

export function isDiscoveryQuestionSettled(
  record: DiscoveryQuestionRecord | null | undefined,
): boolean {
  if (!record?.answer.trim()) return false;
  return (
    record.phase === "ready" ||
    record.phase === "confirmed" ||
    Boolean(record.confirmedAt)
  );
}

/** @deprecated Prefer isDiscoveryQuestionSettled */
export function isDiscoveryQuestion1Confirmed(
  record: DiscoveryQuestionRecord | null | undefined,
): boolean {
  return isDiscoveryQuestionSettled(record);
}

export function buildDiscoveryAcknowledgment(
  storageKey: DiscoveryQuestionStorageKey,
): string {
  return (
    getDiscoveryLiveQuestion(storageKey).acknowledgment ||
    discoveryQuestion1V1.briefAcknowledgment
  );
}

/** @deprecated Prefer buildDiscoveryAcknowledgment */
export function buildDiscoveryQuestion1Acknowledgment(_answer: string): string {
  return buildDiscoveryAcknowledgment("q1");
}

export function persistDiscoveryQuestion(params: {
  draft: WorkingDraftRecord;
  record: DiscoveryQuestionRecord;
  activeKey?: DiscoveryQuestionStorageKey;
  attribution?: {
    actor: WorkingDraftAttributionActor;
    initiatedBy?: WorkingDraftAttributionActor;
    executedBy?: WorkingDraftAttributionActor;
    summary: string;
    actionCode?: string;
  };
  storage?: WorkingDraftStorage | null;
}): WriteWorkingDraftResult {
  const { draft, record, attribution, storage } = params;
  const slice = readDiscoveryAnswersSlice(draft);
  const key = record.storageKey;
  const settledReady =
    record.phase === "ready" || record.phase === "confirmed";
  const nextLive = settledReady
    ? getNextDiscoveryLiveQuestion(key)
    : null;
  const nextSlice: DiscoveryAnswersSliceV1 = {
    ...slice,
    [key]: { ...record, updatedAt: nowIso() },
    activeKey:
      params.activeKey ??
      (nextLive ? nextLive.storageKey : key),
  };

  const patched = patchWorkingDraftSlice(
    draft,
    "discoveryAnswers",
    nextSlice,
    attribution,
    storage,
  );
  if (!patched.ok) return patched;

  return updateWorkingDraftCursor(
    patched.draft,
    {
      conversationLocation: `discovery:${record.id}`,
      journeyPhase: "conversation",
      flowStep: "understanding",
    },
    storage,
  );
}

/** @deprecated Prefer persistDiscoveryQuestion */
export function persistDiscoveryQuestion1(params: {
  draft: WorkingDraftRecord;
  record: DiscoveryQuestionRecord;
  attribution?: {
    actor: WorkingDraftAttributionActor;
    initiatedBy?: WorkingDraftAttributionActor;
    executedBy?: WorkingDraftAttributionActor;
    summary: string;
    actionCode?: string;
  };
  storage?: WorkingDraftStorage | null;
}): WriteWorkingDraftResult {
  return persistDiscoveryQuestion({
    ...params,
    record: { ...params.record, storageKey: params.record.storageKey ?? "q1" },
  });
}

export function captureDiscoveryAnswer(params: {
  draft: WorkingDraftRecord;
  storageKey: DiscoveryQuestionStorageKey;
  answer: string;
  captureMethod: DiscoveryQuestion1CaptureMethod;
  initiatedBy: WorkingDraftAttributionActor;
  executedBy: WorkingDraftAttributionActor;
  phase?: Extract<
    DiscoveryQuestionPhase,
    "captured" | "processing" | "acknowledging" | "ready" | "confirmed"
  >;
  storage?: WorkingDraftStorage | null;
}): WriteWorkingDraftResult {
  const trimmed = params.answer.trim();
  if (!trimmed) {
    return { ok: false, reason: "not_editable" };
  }

  const def = getDiscoveryLiveQuestion(params.storageKey);
  const existing =
    readDiscoveryQuestion(params.draft, params.storageKey) ??
    createEmptyDiscoveryQuestion(params.storageKey);
  const phase = params.phase ?? "captured";
  const settled =
    phase === "ready" || phase === "confirmed" || phase === "processing";
  const record: DiscoveryQuestionRecord = {
    ...existing,
    id: def.id,
    storageKey: def.storageKey,
    question: def.question,
    answer: trimmed,
    phase,
    captureMethod: params.captureMethod,
    initiatedBy: params.initiatedBy,
    executedBy: params.executedBy,
    confirmedAt:
      phase === "ready" || phase === "confirmed" ? nowIso() : null,
    updatedAt: nowIso(),
  };

  return persistDiscoveryQuestion({
    draft: params.draft,
    record,
    activeKey: params.storageKey,
    attribution: {
      actor: params.executedBy,
      initiatedBy: params.initiatedBy,
      executedBy: params.executedBy,
      summary: settled
        ? `Saved Discovery ${params.storageKey} (${params.captureMethod}): ${trimmed}`
        : `Captured Discovery ${params.storageKey} (${params.captureMethod}): ${trimmed}`,
      actionCode:
        phase === "ready" || phase === "confirmed"
          ? `discovery.${params.storageKey}.confirm`
          : phase === "processing"
            ? `discovery.${params.storageKey}.process`
            : `discovery.${params.storageKey}.capture`,
    },
    storage: params.storage,
  });
}

export function captureDiscoveryQuestion1Answer(params: {
  draft: WorkingDraftRecord;
  answer: string;
  captureMethod: DiscoveryQuestion1CaptureMethod;
  initiatedBy: WorkingDraftAttributionActor;
  executedBy: WorkingDraftAttributionActor;
  phase?: Extract<
    DiscoveryQuestionPhase,
    "captured" | "processing" | "acknowledging" | "ready" | "confirmed"
  >;
  storage?: WorkingDraftStorage | null;
}): WriteWorkingDraftResult {
  return captureDiscoveryAnswer({
    ...params,
    storageKey: "q1",
  });
}

export function confirmDiscoveryQuestion1(params: {
  draft: WorkingDraftRecord;
  initiatedBy: WorkingDraftAttributionActor;
  executedBy: WorkingDraftAttributionActor;
  storage?: WorkingDraftStorage | null;
}): WriteWorkingDraftResult {
  const existing = readDiscoveryQuestion1(params.draft);
  if (!existing?.answer.trim()) {
    return { ok: false, reason: "not_editable" };
  }
  return captureDiscoveryAnswer({
    draft: params.draft,
    storageKey: "q1",
    answer: existing.answer,
    captureMethod: existing.captureMethod ?? "voice",
    initiatedBy: params.initiatedBy,
    executedBy: params.executedBy,
    phase: "ready",
    storage: params.storage,
  });
}

export function bootDiscoveryQuestion1Draft(
  storage?: WorkingDraftStorage | null,
): WorkingDraftRecord {
  return ensureWorkingDraft(storage);
}
