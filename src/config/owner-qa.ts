/**
 * Owner QA — lean dev nav for the current Studio product journey.
 * Shown in local development (@see OwnerQaRoot).
 */

import { customerJourneyStepRoute } from "@/config/customer-journey-v1";
import { FILE_ROOM_ROUTE } from "@/config/file-room";
import { OWNER_CONSOLE_ROUTE } from "@/config/owner-console";
import { productionWorkspaceRoute } from "@/config/production-workspace";
import { ROUTE_MAP_INTAKE_STEP_HREF } from "@/config/legacy-route-quarantine-v1";
import { projectBuilderHref } from "@/config/project-builder-v1";
import { studioBoard } from "@/config/studio-board";
import { teamOfficePath } from "@/config/team-offices";
import type { OwnerQaJourneySeedKind } from "@/lib/owner-qa-campaign";

const STUDIO_SELF_TEST_CAMPAIGN_ID = "studio-self-test";
const STUDIO_SELF_TEST_JOB_ID = `${STUDIO_SELF_TEST_CAMPAIGN_ID}:sm-001`;
const STUDIO_SELF_TEST_TEAM_OFFICE = "strategy";
const OWNER_QA_BUILDER_ROAD_ID = "i75";

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
  panelHint: "Jump through the customer journey. Development only.",
  customerJourneySectionTitle: "Customer Journey",

  journeyPresets: [
    {
      id: "studio-lobby",
      label: "Studio Lobby",
      description: "Customer entry experience",
      href: studioBoard.routes.studioLobby,
      seed: "lobby",
    },
    {
      id: "route-map",
      label: "Route Map",
      description: "Choose a Studio route",
      href: studioBoard.routes.newCampaign,
      seed: "route-map",
    },
    {
      id: "project-builder",
      label: "Project Builder",
      description: "Build your project",
      href: projectBuilderHref(OWNER_QA_BUILDER_ROAD_ID),
      seed: "project-builder",
    },
    {
      id: "studio-plan",
      label: "Studio Plan",
      description: "Review your project",
      href: `${projectBuilderHref(OWNER_QA_BUILDER_ROAD_ID)}&view=studio-plan`,
      seed: "studio-plan",
    },
    {
      id: "checkout",
      label: "Checkout",
      description: "Review and payment",
      href: customerJourneyStepRoute("secure-checkout"),
      seed: "checkout",
    },
    {
      id: "project-intake",
      label: "Project Intake",
      description: "Submit Project Intake",
      href: ROUTE_MAP_INTAKE_STEP_HREF,
      seed: "project-intake",
    },
    {
      id: "studio-board",
      label: "Studio Board",
      description: "Project home after purchase",
      href: studioBoard.routes.studioBoard,
      seed: "studio-board",
    },
    {
      id: "production",
      label: "Production",
      description: "Studio is creating your work",
      href: studioBoard.routes.studioBoard,
      seed: "production",
    },
    {
      id: "review-room",
      label: "Review Room",
      description: "Concept review and approvals",
      href: studioBoard.routes.feedbackStudio,
      seed: "review-room-ready",
    },
    {
      id: "final-delivery",
      label: "Final Delivery",
      description: "Campaign delivered",
      href: studioBoard.routes.deliverables,
      seed: "final-delivery",
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
      id: "help-center",
      kind: "link",
      label: "Help Center",
      href: studioBoard.routes.helpCenter,
      description: "Customer help entry point",
    },
    {
      id: "reset-campaign",
      kind: "reset",
      label: "Reset Campaign",
    },
  ] satisfies OwnerQaShortcut[],
} as const;
