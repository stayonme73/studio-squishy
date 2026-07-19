/**
 * Pre-payment working draft persistence — local durable store.
 * @see docs/studio-working-draft-persistence-v1-locked.md
 */

import {
  isWorkingDraftEditable,
  studioWorkingDraftV1,
} from "@/config/studio-working-draft-v1";
import type {
  WorkingDraftAttributionActor,
  WorkingDraftAttributionEvent,
  WorkingDraftCursor,
  WorkingDraftRecord,
} from "@/lib/studio-working-draft/types";

export type WorkingDraftStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function getLocalStorage(): WorkingDraftStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function newAttributionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `attr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyWorkingDraft(
  overrides: Partial<WorkingDraftRecord> = {},
): WorkingDraftRecord {
  return {
    version: studioWorkingDraftV1.version,
    status: studioWorkingDraftV1.prePayment.status,
    editable: studioWorkingDraftV1.prePayment.editable,
    updatedAt: nowIso(),
    revision: 0,
    cursor: {},
    attribution: [],
    slices: {},
    ...overrides,
  };
}

function isWorkingDraftRecord(value: unknown): value is WorkingDraftRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<WorkingDraftRecord>;
  return (
    typeof record.version === "number" &&
    typeof record.revision === "number" &&
    typeof record.updatedAt === "string" &&
    (record.status === "working_draft" || record.status === "purchased") &&
    typeof record.editable === "boolean" &&
    typeof record.cursor === "object" &&
    record.cursor !== null &&
    Array.isArray(record.attribution) &&
    typeof record.slices === "object" &&
    record.slices !== null
  );
}

export function readWorkingDraft(
  storage: WorkingDraftStorage | null | undefined = getLocalStorage(),
): WorkingDraftRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(studioWorkingDraftV1.storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isWorkingDraftRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export type WriteWorkingDraftResult =
  | { ok: true; draft: WorkingDraftRecord }
  | { ok: false; reason: "stale_revision" | "not_editable" | "storage_unavailable" };

/**
 * Persist a draft. Rejects stale revisions (expectedRevision must match stored).
 * Pass expectedRevision: null to force-create / replace when no prior draft.
 */
export function writeWorkingDraft(
  draft: WorkingDraftRecord,
  expectedRevision: number | null,
  storage: WorkingDraftStorage | null | undefined = getLocalStorage(),
): WriteWorkingDraftResult {
  if (!storage) {
    return { ok: false, reason: "storage_unavailable" };
  }

  const existing = readWorkingDraft(storage);
  if (existing && expectedRevision !== null && existing.revision !== expectedRevision) {
    return { ok: false, reason: "stale_revision" };
  }

  if (existing && !isWorkingDraftEditable(existing.status) && draft.status === "working_draft") {
    /* Purchased drafts must not quietly return to editable working_draft via this path. */
    return { ok: false, reason: "not_editable" };
  }

  const next: WorkingDraftRecord = {
    ...draft,
    version: studioWorkingDraftV1.version,
    editable: isWorkingDraftEditable(draft.status),
    updatedAt: nowIso(),
    revision: (existing?.revision ?? -1) + 1,
  };

  try {
    storage.setItem(studioWorkingDraftV1.storageKey, JSON.stringify(next));
    return { ok: true, draft: next };
  } catch {
    return { ok: false, reason: "storage_unavailable" };
  }
}

/** Read existing draft or create and persist an empty working draft. */
export function ensureWorkingDraft(
  storage: WorkingDraftStorage | null | undefined = getLocalStorage(),
): WorkingDraftRecord {
  const existing = readWorkingDraft(storage);
  if (existing) return existing;
  const created = createEmptyWorkingDraft();
  const result = writeWorkingDraft(created, null, storage);
  return result.ok ? result.draft : created;
}

export function clearWorkingDraft(
  storage: WorkingDraftStorage | null | undefined = getLocalStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(studioWorkingDraftV1.storageKey);
  } catch {
    /* fail silent */
  }
}

export function updateWorkingDraftCursor(
  draft: WorkingDraftRecord,
  cursor: WorkingDraftCursor,
  storage: WorkingDraftStorage | null | undefined = getLocalStorage(),
): WriteWorkingDraftResult {
  return writeWorkingDraft(
    {
      ...draft,
      cursor: { ...draft.cursor, ...cursor },
      slices: {
        ...draft.slices,
        currentConversationLocation:
          cursor.conversationLocation ?? draft.slices.currentConversationLocation,
      },
    },
    draft.revision,
    storage,
  );
}

export function appendWorkingDraftAttribution(
  draft: WorkingDraftRecord,
  event: Omit<WorkingDraftAttributionEvent, "id" | "at"> & {
    id?: string;
    at?: string;
  },
  storage: WorkingDraftStorage | null | undefined = getLocalStorage(),
): WriteWorkingDraftResult {
  const entry: WorkingDraftAttributionEvent = {
    id: event.id ?? newAttributionId(),
    at: event.at ?? nowIso(),
    actor: event.actor,
    initiatedBy: event.initiatedBy,
    executedBy: event.executedBy,
    summary: event.summary,
    actionCode: event.actionCode,
  };

  return writeWorkingDraft(
    {
      ...draft,
      attribution: [...draft.attribution, entry],
      slices: {
        ...draft.slices,
        actionAttributionHistory: [
          ...((draft.slices.actionAttributionHistory as WorkingDraftAttributionEvent[] | undefined) ??
            []),
          entry,
        ],
      },
    },
    draft.revision,
    storage,
  );
}

export function patchWorkingDraftSlice(
  draft: WorkingDraftRecord,
  field: keyof WorkingDraftRecord["slices"],
  value: unknown,
  attribution?: {
    actor: WorkingDraftAttributionActor;
    initiatedBy?: WorkingDraftAttributionActor;
    executedBy?: WorkingDraftAttributionActor;
    summary: string;
    actionCode?: string;
  },
  storage: WorkingDraftStorage | null | undefined = getLocalStorage(),
): WriteWorkingDraftResult {
  if (!isWorkingDraftEditable(draft.status)) {
    return { ok: false, reason: "not_editable" };
  }

  let next: WorkingDraftRecord = {
    ...draft,
    slices: {
      ...draft.slices,
      [field]: value,
    },
  };

  if (attribution) {
    const entry: WorkingDraftAttributionEvent = {
      id: newAttributionId(),
      at: nowIso(),
      actor: attribution.actor,
      initiatedBy: attribution.initiatedBy,
      executedBy: attribution.executedBy,
      summary: attribution.summary,
      actionCode: attribution.actionCode,
    };
    next = {
      ...next,
      attribution: [...next.attribution, entry],
      slices: {
        ...next.slices,
        actionAttributionHistory: [
          ...((next.slices.actionAttributionHistory as WorkingDraftAttributionEvent[] | undefined) ??
            []),
          entry,
        ],
      },
    };
  }

  return writeWorkingDraft(next, draft.revision, storage);
}
