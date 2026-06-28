/**
 * Owner QA — lean dev nav for the current Studio product journey.
 * Shown in local development (@see OwnerQaRoot).
 */

import { customerJourneyStepRoute } from "@/config/customer-journey-v1";
import { studioBoard } from "@/config/studio-board";
import type { OwnerQaJourneySeedKind } from "@/lib/owner-qa-campaign";

export type OwnerQaJourneyPreset = {
  id: string;
  label: string;
  description?: string;
  href: string;
  seed: OwnerQaJourneySeedKind;
};

export type OwnerQaShortcut =
  | { id: string; kind: "link"; label: string; href: string }
  | { id: string; kind: "reset"; label: string };

export const ownerQa = {
  journeyPresets: [
    {
      id: "studio-lobby",
      label: "Studio Lobby",
      description: "Welcome Hall entry state",
      href: studioBoard.routes.studioLobby,
      seed: "lobby",
    },
    {
      id: "discovery-room",
      label: "Discovery Room",
      description: "Green-and-Lean Discovery in progress",
      href: customerJourneyStepRoute("project-discovery"),
      seed: "discovery-in-progress",
    },
    {
      id: "studio-plan-preview",
      label: "Studio Plan Preview",
      description: "Discovery split-panel recommendation preview",
      href: customerJourneyStepRoute("project-discovery"),
      seed: "discovery-plan-preview",
    },
    {
      id: "project-summary-checkout",
      label: "Project Summary + Checkout",
      description: "Green services · $1,385 · embedded checkout",
      href: studioBoard.routes.projectSummary,
      seed: "project-summary-checkout",
    },
    {
      id: "project-details",
      label: "Project Details",
      description: "Paid · approved Green plan · wizard ready",
      href: studioBoard.routes.projectDetails,
      seed: "project-details",
    },
    {
      id: "studio-board-details-needed",
      label: "Studio Board — Project Details Needed",
      description: "Paid · PAYMENT_RECEIVED · details not submitted",
      href: studioBoard.routes.studioBoard,
      seed: "studio-board-details-needed",
    },
    {
      id: "studio-board-building",
      label: "Studio Board — Building Concepts",
      description: "Project Details complete · Custom Studio Plan",
      href: studioBoard.routes.studioBoard,
      seed: "studio-board-building",
    },
    {
      id: "project-record",
      label: "Project Record",
      description: "Campaign record drawer open",
      href: studioBoard.routes.campaignDetails,
      seed: "project-record",
    },
    {
      id: "review-room-ready",
      label: "Review Room — Ready",
      description: "Concepts ready for direction choice",
      href: studioBoard.routes.feedbackStudio,
      seed: "review-room-ready",
    },
    {
      id: "final-delivery-complete",
      label: "Final Delivery — Complete",
      description: "Campaign delivered",
      href: studioBoard.routes.deliverables,
      seed: "final-delivery-complete",
    },
    {
      id: "help-center",
      label: "Help Center",
      description: "Customer help entry point",
      href: studioBoard.routes.helpCenter,
      seed: "help-center",
    },
  ] satisfies OwnerQaJourneyPreset[],

  shortcuts: [
    {
      id: "reset-campaign",
      kind: "reset",
      label: "Reset Campaign",
    },
  ] satisfies OwnerQaShortcut[],
} as const;
