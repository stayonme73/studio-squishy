import { studioBoard, type CampaignRecord } from "@/config/studio-board";

export type CustomerJourneyStepState = "complete" | "current" | "upcoming";

export type CustomerJourneyStep = {
  id: string;
  label: string;
  state: CustomerJourneyStepState;
  actionLabel?: string;
  actionHref?: string;
};

const { routes, nextAction: nextCopy } = studioBoard;

type Milestone = {
  id: string;
  label: string;
  complete: boolean;
  actionLabel?: string;
  actionHref?: string;
};

/** Customer-facing roadmap — one current step at a time. */
export function resolveCustomerJourneySteps(
  campaign: CampaignRecord | null,
): readonly CustomerJourneyStep[] {
  if (!campaign) {
    return [
      { id: "intake", label: "Intake Complete", state: "upcoming" },
      { id: "payment", label: "Payment Received", state: "upcoming" },
      { id: "review", label: "Review Concepts", state: "upcoming" },
      { id: "direction", label: "Choose Direction", state: "upcoming" },
      { id: "delivery", label: "Final Delivery", state: "upcoming" },
    ];
  }

  const intakeDone = Boolean(campaign.visionSubmittedAt || campaign.intake?.submittedAt);
  const paymentDone = Boolean(campaign.paymentReceivedAt);
  const directionChosen = Boolean(campaign.selectedCampaignOption);
  const delivered = campaign.campaignStatus === "DELIVERED";

  const milestones: Milestone[] = [
    { id: "intake", label: "Intake Complete", complete: intakeDone },
    { id: "payment", label: "Payment Received", complete: paymentDone },
    {
      id: "review",
      label: "Review Concepts",
      complete: directionChosen || delivered,
      ...(campaign.campaignStatus === "READY_FOR_REVIEW" && !directionChosen
        ? { actionLabel: nextCopy.reviewMyConcepts, actionHref: routes.feedbackStudio }
        : {}),
    },
    {
      id: "direction",
      label: "Choose Direction",
      complete: directionChosen || delivered,
    },
    {
      id: "delivery",
      label: "Final Delivery",
      complete: false,
      ...(delivered
        ? { actionLabel: nextCopy.openFinalDelivery, actionHref: routes.deliverables }
        : {}),
    },
  ];

  let foundCurrent = false;

  return milestones.map((milestone) => {
    if (milestone.complete) {
      return {
        id: milestone.id,
        label: milestone.label,
        state: "complete" as const,
      };
    }

    if (!foundCurrent) {
      foundCurrent = true;
      return {
        id: milestone.id,
        label: milestone.label,
        state: "current" as const,
        actionLabel: milestone.actionLabel,
        actionHref: milestone.actionHref,
      };
    }

    return {
      id: milestone.id,
      label: milestone.label,
      state: "upcoming" as const,
    };
  });
}

export function statusNeedsReviewAction(status: CampaignRecord["campaignStatus"] | null): boolean {
  return status === "READY_FOR_REVIEW";
}
