/**
 * Pre-Payment Working Draft — contract types (schema authority).
 * Full persistence wiring is separate; do not invent business rules here.
 * @see docs/studio-working-draft-persistence-v1-locked.md
 */

import type {
  WorkingDraftPersistedField,
  WorkingDraftStatus,
} from "@/config/studio-working-draft-v1";

export type WorkingDraftAttributionActor = "customer" | "voice" | "system";

export type WorkingDraftAttributionEvent = {
  id: string;
  at: string;
  /**
   * Primary actor for the event (usually who executed the material change).
   * Prefer initiatedBy + executedBy when both are known.
   */
  actor: WorkingDraftAttributionActor;
  /** Who started the action (e.g. Voice asked; Customer took control). */
  initiatedBy?: WorkingDraftAttributionActor;
  /** Who performed the capture / edit (e.g. Customer spoke; Voice entered). */
  executedBy?: WorkingDraftAttributionActor;
  /** Human-readable summary, e.g. "Customer removed Business Card". */
  summary: string;
  /** Optional machine-stable action code for tests / analytics. */
  actionCode?: string;
};

export type WorkingDraftCursor = {
  conversationLocation?: string;
  journeyPhase?: string;
  flowStep?: string;
};

/**
 * Shape of the durable pre-payment project. Field payloads fill in as packages land.
 * Presence of keys documents the contract; values may be sparse until wired.
 */
export type WorkingDraftRecord = {
  version: number;
  status: WorkingDraftStatus;
  editable: boolean;
  updatedAt: string;
  /** Monotonic revision — reject stale writes that would overwrite newer state. */
  revision: number;
  cursor: WorkingDraftCursor;
  attribution: WorkingDraftAttributionEvent[];
  /** Sparse slices keyed by persisted field name. */
  slices: Partial<Record<WorkingDraftPersistedField, unknown>>;
};
