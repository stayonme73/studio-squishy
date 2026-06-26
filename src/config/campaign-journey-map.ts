import type { CampaignStatus } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import { customerJourneyStepName } from "@/config/customer-journey-v1";

export type CampaignJourneyStepId = "campaign-details" | "review-room" | "deliverables";

export const campaignJourneyMap = {
  title: "Your Campaign Journey",
  steps: [
    {
      id: "campaign-details" as const,
      label: customerJourneyStepName("project-record"),
      href: studioBoard.routes.campaignDetails,
    },
    {
      id: "review-room" as const,
      label: customerJourneyStepName("review-room"),
      href: studioBoard.routes.feedbackStudio,
    },
    {
      id: "deliverables" as const,
      label: customerJourneyStepName("final-delivery"),
      href: studioBoard.routes.deliverables,
    },
  ],
} as const;

export function campaignJourneyStepIndex(stepId: CampaignJourneyStepId) {
  return campaignJourneyMap.steps.findIndex((step) => step.id === stepId);
}

export function campaignJourneyMaxAccessibleIndex(status: CampaignStatus | null) {
  if (!status) return -1;

  switch (status) {
    case "DRAFT_RECEIVED":
    case "PAYMENT_RECEIVED":
    case "BUILDING_CONCEPTS":
      return 0;
    case "READY_FOR_REVIEW":
      return 1;
    case "DELIVERED":
      return 2;
    default:
      return 0;
  }
}

export type CampaignJourneyVisualState = "complete" | "current" | "upcoming";

export function resolveCampaignJourneyVisualState(
  stepIndex: number,
  activeStepIndex: number,
): CampaignJourneyVisualState {
  if (stepIndex < activeStepIndex) return "complete";
  if (stepIndex === activeStepIndex) return "current";
  return "upcoming";
}

export function isCampaignJourneyStepAccessible(
  stepIndex: number,
  status: CampaignStatus | null,
  hasCampaign: boolean,
) {
  if (!hasCampaign || !status) return false;
  return stepIndex <= campaignJourneyMaxAccessibleIndex(status);
}
