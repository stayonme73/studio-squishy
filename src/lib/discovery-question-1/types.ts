import type {
  DiscoveryQuestion1CaptureMethod,
  DiscoveryQuestionStorageKey,
} from "@/config/discovery-question-1-v1";
import type { WorkingDraftAttributionActor } from "@/lib/studio-working-draft";

export type DiscoveryQuestionPhase =
  | "presenting"
  | "awaiting-answer"
  | "listening"
  | "captured"
  | "processing"
  | "acknowledging"
  | "ready"
  /** @deprecated Prefer `ready`. */
  | "confirmed";

/** @deprecated Prefer DiscoveryQuestionPhase */
export type DiscoveryQuestion1Phase = DiscoveryQuestionPhase;

export type DiscoveryQuestionRecord = {
  id: string;
  storageKey: DiscoveryQuestionStorageKey;
  question: string;
  answer: string;
  phase: DiscoveryQuestionPhase;
  captureMethod: DiscoveryQuestion1CaptureMethod | null;
  initiatedBy: WorkingDraftAttributionActor | null;
  executedBy: WorkingDraftAttributionActor | null;
  confirmedAt: string | null;
  updatedAt: string;
};

/** @deprecated Prefer DiscoveryQuestionRecord */
export type DiscoveryQuestion1Record = DiscoveryQuestionRecord;

export type DiscoveryAnswersSliceV1 = {
  q1?: DiscoveryQuestionRecord;
  q2?: DiscoveryQuestionRecord;
  q3?: DiscoveryQuestionRecord;
  q4?: DiscoveryQuestionRecord;
  /** Which question the conversation is on. */
  activeKey?: DiscoveryQuestionStorageKey;
  tiles?: Record<string, string>;
};
