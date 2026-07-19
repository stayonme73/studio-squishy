/**
 * Map Discovery working-draft slices → Conversation phase-gate facts.
 */

import { isDiscoveryTileAnswerComplete } from "@/lib/business-discovery-completion";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import {
  isDeadlineAnswerComplete,
  isDiscoveryTabletComplete,
} from "@/lib/studio-conversation-discovery/steps";
import type { DiscoveryDeadlineInformation } from "@/lib/studio-conversation-discovery/types";
import type { ConversationPhaseGateFacts } from "@/lib/studio-conversation-phase-gates";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft";
import {
  readDeadlineFromDraft,
  readDiscoveryAnswersFromDraft,
} from "@/lib/studio-conversation-discovery/draft";

export function discoveryFactsFromAnswers(
  answers: DiscoveryAnswers,
  deadline: DiscoveryDeadlineInformation | null | undefined,
  extras: Partial<ConversationPhaseGateFacts> = {},
): ConversationPhaseGateFacts {
  const goalKnown = isDiscoveryTileAnswerComplete("your-focus", answers["your-focus"]);
  const needKnown = isDiscoveryTileAnswerComplete(
    "your-situation",
    answers["your-situation"],
  );
  const deadlineKnown = isDeadlineAnswerComplete(deadline);
  /* Every focus option is a Studio offering — answering focus confirms fit for V1. */
  const studioFit = goalKnown;

  return {
    customerReadyToBegin: true,
    inputModeAvailable: true,
    workingDraftReady: true,
    customerGoalKnown: goalKnown,
    needCharacterKnown: needKnown,
    deadlineKnown,
    studioOffersRelevantWork: studioFit,
    clarificationStillRequired: false,
    ...extras,
  };
}

export function discoveryFactsFromDraft(
  draft: WorkingDraftRecord,
  extras: Partial<ConversationPhaseGateFacts> = {},
): ConversationPhaseGateFacts {
  return discoveryFactsFromAnswers(
    readDiscoveryAnswersFromDraft(draft),
    readDeadlineFromDraft(draft),
    extras,
  );
}

export function isDiscoveryReadyForRouteRecommendation(
  draft: WorkingDraftRecord,
): boolean {
  const answers = readDiscoveryAnswersFromDraft(draft);
  const deadline = readDeadlineFromDraft(draft);
  return isDiscoveryTabletComplete(answers, deadline);
}
