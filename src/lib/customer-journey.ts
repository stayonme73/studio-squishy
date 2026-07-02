import { type CampaignRecord } from "@/config/studio-board";

export type CustomerJourneyStepState = "complete" | "current" | "upcoming";

export type CustomerJourneyStep = {
  id: string;
  label: string;
  state: CustomerJourneyStepState;
  actionLabel?: string;
  actionHref?: string;
};

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
      { id: "payment", label: "Payment Received", state: "upcoming" },
      { id: "intake", label: "Project Details Complete", state: "upcoming" },
      { id: "building", label: "Building Concepts", state: "upcoming" },
      { id: "review", label: "Review Concepts", state: "upcoming" },
      { id: "direction", label: "Choose Direction", state: "upcoming" },
      { id: "delivery", label: "Final Delivery", state: "upcoming" },
    ];
  }

  const intakeDone = Boolean(
    campaign.projectDetailsSubmittedAt ||
      campaign.routeMapIntakeSubmittedAt ||
      campaign.visionSubmittedAt ||
      campaign.intake?.submittedAt,
  );
  const paymentDone = Boolean(campaign.paymentReceivedAt);
  const directionChosen = Boolean(campaign.selectedCampaignOption);
  const delivered = campaign.campaignStatus === "DELIVERED";
  const buildingDone =
    campaign.campaignStatus === "READY_FOR_REVIEW" ||
    campaign.campaignStatus === "DELIVERED" ||
    directionChosen;

  const milestones: Milestone[] = [
    { id: "payment", label: "Payment Received", complete: paymentDone },
    { id: "intake", label: "Project Details Complete", complete: intakeDone },
    { id: "building", label: "Building Concepts", complete: buildingDone },
    {
      id: "review",
      label: "Review Concepts",
      complete: directionChosen || delivered,
    },
    {
      id: "direction",
      label: "Choose Direction",
      complete: directionChosen || delivered,
    },
    {
      id: "delivery",
      label: "Final Delivery",
      complete: delivered,
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
