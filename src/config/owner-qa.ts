/**

 * Owner QA — lean dev nav for the live product journey.

 * Shown in local development (@see OwnerQaRoot).

 */



import { studioBoard, type CampaignStatus } from "@/config/studio-board";

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
    { label: "Welcome Hall", href: studioBoard.routes.welcomeHall },
    { label: "Help Center", href: studioBoard.routes.helpCenter },
    { label: "Studio Kitchen", href: studioBoard.routes.studioKitchen },
  ] satisfies OwnerQaShortcut[],



  /** Guide → Payment → Intake → Studio Board — one click each. */

  journeyPresets: [

    {

      id: "fresh-guide",

      label: "Fresh — Studio Guide",

      description: "Clear state, pick a package",

      href: studioBoard.routes.studioGuide,

      seed: { kind: "reset" },

    },

    {

      id: "payment",

      label: "Payment checkout",

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

      label: "Feedback Studio — ready",

      description: "Concepts ready for review",

      href: studioBoard.routes.feedbackStudio,

      seed: { kind: "status", status: "READY_FOR_REVIEW" },

    },

    {

      id: "delivered",

      label: "Final Delivery — complete",

      href: studioBoard.routes.deliverables,

      seed: { kind: "status", status: "DELIVERED" },

    },

  ] satisfies OwnerQaJourneyPreset[],

} as const;


