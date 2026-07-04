/**
 * Owner QA — lean dev nav for the current Studio product journey.
 * Shown in local development (@see OwnerQaRoot).
 */

import { FILE_ROOM_ROUTE } from "@/config/file-room";
import { OWNER_CONSOLE_ROUTE } from "@/config/owner-console";
import { productionWorkspaceRoute } from "@/config/production-workspace";
import { studioBoard } from "@/config/studio-board";
import { teamOfficePath } from "@/config/team-offices";
import type { OwnerQaJourneySeedKind } from "@/lib/owner-qa-campaign";

const STUDIO_SELF_TEST_CAMPAIGN_ID = "studio-self-test";
const STUDIO_SELF_TEST_JOB_ID = `${STUDIO_SELF_TEST_CAMPAIGN_ID}:sm-001`;
const STUDIO_SELF_TEST_TEAM_OFFICE = "strategy";

export type OwnerQaJourneyPreset = {
  id: string;
  label: string;
  description?: string;
  href: string;
  seed: OwnerQaJourneySeedKind;
};

export type OwnerQaShortcut =
  | { id: string; kind: "link"; label: string; href: string; description?: string }
  | { id: string; kind: "reset"; label: string };

export const ownerQa = {
  journeyPresets: [
    {
      id: "studio-lobby",
      label: "Studio Lobby",
      description: "Clean lobby entry state",
      href: studioBoard.routes.studioLobby,
      seed: "lobby",
    },
    {
      id: "route-map",
      label: "Route Map",
      description: "Current campaign start workspace",
      href: studioBoard.routes.newCampaign,
      seed: "route-map",
    },
    {
      id: "payment-checkout-test",
      label: "Payment / Checkout test",
      description: "Route Map job selected · checkout ready",
      href: studioBoard.routes.newCampaign,
      seed: "payment-checkout-test",
    },
    {
      id: "studio-board",
      label: "Studio Board",
      description: "Campaign in production · Custom Studio Plan",
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
      label: "Review Room",
      description: "Concepts ready for direction choice",
      href: studioBoard.routes.feedbackStudio,
      seed: "review-room-ready",
    },
    {
      id: "final-delivery-complete",
      label: "Final Delivery",
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
      id: "file-room",
      kind: "link",
      label: "File Room",
      href: FILE_ROOM_ROUTE,
      description: "Internal campaign list",
    },
    {
      id: "owner-console",
      kind: "link",
      label: "Owner Console",
      href: OWNER_CONSOLE_ROUTE,
      description: "Owner decision desk",
    },
    {
      id: "production-workspace",
      kind: "link",
      label: "Production Workspace",
      href: productionWorkspaceRoute(STUDIO_SELF_TEST_CAMPAIGN_ID, STUDIO_SELF_TEST_JOB_ID),
      description: "Studio Self-Test job workspace",
    },
    {
      id: "team-offices",
      kind: "link",
      label: "Team Offices",
      href: teamOfficePath(STUDIO_SELF_TEST_CAMPAIGN_ID, STUDIO_SELF_TEST_TEAM_OFFICE),
      description: "Strategy office for self-test campaign",
    },
    {
      id: "studio-self-test",
      kind: "link",
      label: "Studio Self-Test",
      href: `${FILE_ROOM_ROUTE}/studio-self-test`,
      description: "Owner-only test scoreboard",
    },
    {
      id: "reset-campaign",
      kind: "reset",
      label: "Reset Campaign",
    },
  ] satisfies OwnerQaShortcut[],
} as const;

