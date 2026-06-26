/**

 * Owner QA — lean dev nav for the live product journey.

 * Shown in local development (@see OwnerQaRoot).

 */



import { studioBoard, type CampaignStatus } from "@/config/studio-board";
import { customerJourneyStepName, customerJourneyStepRoute } from "@/config/customer-journey-v1";

import type { StudioGuidePackageId } from "@/config/studio-guide";



export type OwnerQaShortcut = {
  label: string;
  href: string;
};



export type OwnerQaJourneySeed =

  | { kind: "reset" }

  | { kind: "status"; status: CampaignStatus }

  | { kind: "paid-awaiting-intake"; packageId?: StudioGuidePackageId };



export type OwnerQaJourneyPreset = {

  id: string;

  label: string;

  description?: string;

  href: string;

  seed: OwnerQaJourneySeed;

};



const PACKAGE = "momentum" as const;



export const ownerQa = {
  /** Non-journey utility pages — not duplicated in journeyPresets. */
  shortcuts: [
    { label: customerJourneyStepName("studio-lobby"), href: studioBoard.routes.welcomeHall },
    { label: customerJourneyStepName("help-center"), href: studioBoard.routes.helpCenter },
    { label: "Studio Kitchen", href: studioBoard.routes.studioKitchen },
  ] satisfies OwnerQaShortcut[],



  /** Guide → Payment → Intake → Studio Board — one click each. */

  journeyPresets: [
    {
      id: "fresh-guide",
      label: `Fresh — ${customerJourneyStepName("studio-guide")}`,
      description: "Clear state, pick a package",
      href: studioBoard.routes.studioGuide,
      seed: { kind: "reset" },
    },
    {
      id: "project-discovery",
      label: customerJourneyStepName("project-discovery"),
      description: "Discovery tiles on the drafting table",
      href: customerJourneyStepRoute("project-discovery"),
      seed: { kind: "reset" },
    },
    {
      id: "secure-checkout",
      label: customerJourneyStepName("secure-checkout"),
      description: "Package chosen, ready to pay",
      href: `/payment?package=${PACKAGE}`,
      seed: { kind: "reset" },
    },

    {

      id: "intake-after-payment",

      label: "Intake after payment",

      description: "Paid — intake wizard next",

      href: `/draft-room?begin=1&package=${PACKAGE}`,

      seed: { kind: "paid-awaiting-intake", packageId: PACKAGE },

    },

    {

      id: "board-onboarding",

      label: "Studio Board — onboarding done",

      description: "Paid + intake complete",

      href: studioBoard.routes.studioBoard,

      seed: { kind: "status", status: "PAYMENT_RECEIVED" },

    },

    {

      id: "board-building",

      label: "Studio Board — building concepts",

      href: studioBoard.routes.studioBoard,

      seed: { kind: "status", status: "BUILDING_CONCEPTS" },

    },

    {

      id: "feedback-ready",

      label: `${customerJourneyStepName("review-room")} — ready`,

      description: "Concepts ready for review",

      href: studioBoard.routes.feedbackStudio,

      seed: { kind: "status", status: "READY_FOR_REVIEW" },

    },

    {
      id: "delivered",
      label: `${customerJourneyStepName("final-delivery")} — complete`,
      href: studioBoard.routes.deliverables,
      seed: { kind: "status", status: "DELIVERED" },
    },

  ] satisfies OwnerQaJourneyPreset[],

} as const;


