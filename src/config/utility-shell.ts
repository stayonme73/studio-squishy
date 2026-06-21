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
      label: "Campaign Record",
      href: studioBoard.routes.campaignDetails,
    },
    { id: "review-room" as const, label: "Review Room", href: studioBoard.routes.feedbackStudio },
    { id: "deliverables" as const, label: "Final Delivery", href: studioBoard.routes.deliverables },
    { id: "help-center" as const, label: "Help Center", href: studioBoard.routes.helpCenter },
  ],
  contentMax: "56rem",
  narrowMax: "28rem",
} as const;
