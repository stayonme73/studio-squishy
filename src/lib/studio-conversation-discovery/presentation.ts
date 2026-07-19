import {
  DISCOVERY_TABLET_STEP_ORDER,
  discoveryTabletStepConfig,
  formatDiscoveryStepSummary,
  isDiscoveryTabletComplete,
  isDiscoveryTabletStepComplete,
} from "@/lib/studio-conversation-discovery/steps";
import type {
  DiscoveryCapturedSummary,
  DiscoveryDeadlineInformation,
  DiscoveryPresentationPayload,
  DiscoveryTabletStepId,
} from "@/lib/studio-conversation-discovery/types";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";

export function buildDiscoveryPresentationPayload(params: {
  stepId: DiscoveryTabletStepId;
  answers: DiscoveryAnswers;
  deadline?: DiscoveryDeadlineInformation | null;
}): DiscoveryPresentationPayload {
  const { stepId, answers, deadline } = params;
  const config = discoveryTabletStepConfig[stepId];
  const stepIndex = DISCOVERY_TABLET_STEP_ORDER.indexOf(stepId);
  const total = DISCOVERY_TABLET_STEP_ORDER.length;

  const captured: DiscoveryCapturedSummary[] = [];
  for (const id of DISCOVERY_TABLET_STEP_ORDER) {
    if (!isDiscoveryTabletStepComplete(id, answers, deadline)) continue;
    const summary = formatDiscoveryStepSummary(id, answers, deadline);
    if (!summary && discoveryTabletStepConfig[id].required === false) continue;
    if (!summary) continue;
    captured.push({
      stepId: id,
      title: discoveryTabletStepConfig[id].title,
      summary,
    });
  }

  const currentSummary = formatDiscoveryStepSummary(stepId, answers, deadline) || null;
  const complete = isDiscoveryTabletComplete(answers, deadline);

  return {
    stageLabel: "Discovery",
    currentTitle: config.title,
    currentQuestion: config.question,
    currentSummary,
    captured,
    progressLabel: complete
      ? "Discovery complete"
      : `Question ${Math.max(1, stepIndex + 1)} of ${total}`,
    discoveryComplete: complete,
  };
}
