import type { TranscriptSentence } from "@/lib/studio-short-form-video-editing/sentences";

export type ClipRepurposingViableCount = 0 | 1 | 2 | 3;

export type SetCandidateRejection =
  | "weak_short_form_value"
  | "filler_or_setup"
  | "not_standalone"
  | "window_too_short"
  | "window_too_long"
  | "duplicate_idea"
  | "cannibalizes_selected"
  | "same_hook_body"
  | "needs_other_clip_context"
  | "performance_not_strong_enough"
  | "not_in_top_three";

export type SetCandidate = {
  id: string;
  idea: string;
  corePoint: string;
  hookText: string;
  bodyText: string;
  windowStart: number;
  windowEnd: number;
  sentenceIndexes: readonly number[];
  standalone: boolean;
  shortFormScore: number;
  setValueScore: number;
  semanticScore: number;
  hookWordBonus: number;
  claim: string;
  whyViewerCares: string;
  semanticReasons: readonly string[];
  hasSpokenEntry: boolean;
  hasEnoughToLand: boolean;
  rejectionReason?: SetCandidateRejection;
};

export type SetDiscoverySuccess = {
  ok: true;
  productionAllowed: true;
  viableCount: number;
  selected: readonly SetCandidate[];
  alternates: readonly SetCandidate[];
  rejected: readonly SetCandidate[];
  setQuestion:
    | "If the customer posted these three clips separately, would each feel like a distinct piece worth publishing?";
  setQuestionPass: true;
};

export type SetDiscoveryFailure = {
  ok: false;
  productionAllowed: false;
  viableCount: ClipRepurposingViableCount;
  selected: readonly SetCandidate[];
  alternates: readonly SetCandidate[];
  rejected: readonly SetCandidate[];
  findings: readonly string[];
  setQuestion:
    | "If the customer posted these three clips separately, would each feel like a distinct piece worth publishing?";
  setQuestionPass: false;
};

export type SetDiscoveryResult = SetDiscoverySuccess | SetDiscoveryFailure;

export type PerformanceWindowNote = {
  candidateId: string;
  performsWellEnough: boolean;
  entrySeconds?: number;
  exitSeconds?: number;
  reason: string;
};

export type SetRevision =
  | { kind: "swap_clip"; removeId: string; addId: string }
  | { kind: "cta_change"; ctaText: string }
  | { kind: "end_card_hold"; holdSeconds: number };

export type LongSourceSentences = {
  sourceDurationSeconds: number;
  sentences: readonly TranscriptSentence[];
};
