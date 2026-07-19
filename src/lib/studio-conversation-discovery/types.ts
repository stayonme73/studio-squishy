import type { DiscoveryTileId } from "@/config/business-discovery-studio";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import type { WorkingDraftAttributionActor } from "@/lib/studio-working-draft";

/** Form tiles migrated from Discovery Room (excludes submit plate tile). */
export type DiscoveryFormTileId = Exclude<DiscoveryTileId, "submit-project">;

/**
 * Tablet steps = every Discovery Room form field + deadline Voice needs for gates.
 * Deadline is stored in working_draft.deadlineInformation (not a plate tile).
 */
export type DiscoveryTabletStepId = DiscoveryFormTileId | "project-deadline";

export type DiscoveryDeadlineInformation = {
  /** Customer-facing deadline answer (free text or chosen option). */
  answer: string;
};

export type DiscoveryMaterialsStatus = {
  /** Summary derived from marketing-channel answers. */
  summary: string;
  channelAnswers: string[];
};

export type DiscoveryCapturedSummary = {
  stepId: DiscoveryTabletStepId;
  title: string;
  summary: string;
};

export type DiscoveryPresentationPayload = {
  stageLabel: string;
  currentTitle: string;
  currentQuestion: string;
  currentSummary: string | null;
  captured: DiscoveryCapturedSummary[];
  progressLabel: string;
  discoveryComplete: boolean;
};

export type DiscoveryAnswerActor = WorkingDraftAttributionActor;

export type DiscoveryAnswersSlice = DiscoveryAnswers;
