import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { studioBoard } from "@/config/studio-board";

export type UtilityNavId =
  | "studio-board"
  | "campaign-details"
  | "review-room"
  | "deliverables"
  | "help-center"
  | "payment"
  | "past-campaigns"
  | "account";

export const utilityShell = {
  nav: [
    { id: "studio-board" as const, label: "Studio Board", href: studioBoard.routes.studioBoard },
    {
      id: "campaign-details" as const,
      label: customerJourneyStepName("project-record"),
      href: studioBoard.routes.campaignDetails,
    },
    { id: "review-room" as const, label: customerJourneyStepName("review-room"), href: studioBoard.routes.feedbackStudio },
    { id: "deliverables" as const, label: customerJourneyStepName("final-delivery"), href: studioBoard.routes.deliverables },
    { id: "help-center" as const, label: customerJourneyStepName("help-center"), href: studioBoard.routes.helpCenter },
  ],
  contentMax: "56rem",
  narrowMax: "28rem",
} as const;
