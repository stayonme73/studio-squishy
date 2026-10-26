/**
 * Owner QA — legacy journey seed + route inventory (tests / seeds).
 * Active Owner shortcuts: @see owner-console-website-inspection-v1.ts (Owner Console).
 */

import { customerJourneyStepRoute } from "@/config/customer-journey-v1";
import { FILE_ROOM_ROUTE } from "@/config/file-room";
import { OWNER_CONSOLE_ROUTE } from "@/config/owner-console";
import { productionWorkspaceRoute } from "@/config/production-workspace";
import { ROUTE_MAP_INTAKE_STEP_HREF } from "@/config/legacy-route-quarantine-v1";
import { projectBuilderHref } from "@/config/project-builder-v1";
import { studioBoard } from "@/config/studio-board";
import { studioLobbyEntryV1 } from "@/config/studio-lobby-entry-v1";
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
  brand: "The Studio Company",
  reviewModeLabel: "Review mode",

  journeyPhases: [
    {
      id: "plan",
      heading: "Phase 1 — Plan",
      stepIds: ["studio-lobby", "route-map", "project-builder", "studio-plan"],
    },
    {
      id: "start",
      heading: "Phase 2 — Start",
      stepIds: ["checkout", "project-intake"],
    },
    {
      id: "produce",
      heading: "Phase 3 — Produce & Deliver",
      stepIds: ["studio-board", "production", "review-room", "final-delivery"],
    },
  ] as const,

  journeyPresets: [
    {
      id: "studio-lobby",
      label: "Studio Lobby",
      description: "Customer enters the Studio",
      href: studioLobbyEntryV1.routes.frontDoor,
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
      description: "Review your project plan",
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
      description: "Submit project information/files",
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
      description: "Studio is creating the work",
      href: studioBoard.routes.studioBoard,
      seed: "production",
    },
    {
      id: "review-room",
      label: "Review Room",
      description: "Review and approvals",
      href: studioBoard.routes.feedbackStudio,
      seed: "review-room-ready",
    },
    {
      id: "final-delivery",
      label: "Final Delivery",
      description: "Receive completed work",
      href: studioBoard.routes.deliverables,
      seed: "final-delivery",
    },
  ] satisfies OwnerQaJourneyPreset[],

  shortcuts: [
    {
      id: "conversation-room-discovery",
      kind: "link",
      label: "Conversation Room",
      href: "/studio-conversation-room",
      description: "Voice tablet — Discovery migration",
    },
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

export type OwnerQaRouteClass = "KEEP" | "HIDE" | "ARCHIVE CANDIDATE" | "REMOVE";

export const ownerQaRouteInventory: readonly {
  route: string;
  classification: OwnerQaRouteClass;
  note: string;
}[] = [
  { route: "/studio-lobby?lobbyEntry=reset", classification: "KEEP", note: "Customer journey step 1." },
  { route: "/route-map", classification: "KEEP", note: "Customer journey step 2." },
  { route: "/project-builder", classification: "KEEP", note: "Customer journey step 3." },
  { route: "/project-builder?view=studio-plan", classification: "KEEP", note: "Customer journey step 4." },
  { route: "/checkout", classification: "KEEP", note: "Customer journey step 5." },
  { route: "/route-map?step=intake", classification: "KEEP", note: "Customer journey step 6." },
  { route: "/studio-board", classification: "KEEP", note: "Customer journey steps 7 and 8." },
  { route: "/feedback-studio", classification: "KEEP", note: "Customer journey step 9." },
  { route: "/deliverables", classification: "KEEP", note: "Live Final Delivery. Proof room is not this route." },
  { route: "/studio-conversation-room", classification: "KEEP", note: "Studio Tool. Hidden until Studio Tools opens." },
  { route: "/file-room", classification: "KEEP", note: "Studio Tool." },
  { route: "/file-room/owner-console", classification: "KEEP", note: "Studio Tool. Owner Console stays parked." },
  { route: "/file-room/studio-self-test", classification: "KEEP", note: "Studio Tool." },
  { route: "/help-center", classification: "KEEP", note: "Studio Tool." },
  { route: "/final-delivery-room", classification: "HIDE", note: "Clip proof room. Do not put it on this menu." },
  { route: "/campaign-details", classification: "HIDE", note: "Project Record still exists. Not on this journey list." },
  { route: "/review-room", classification: "HIDE", note: "Alias of Review Room. Keep the live /feedback-studio door." },
  { route: "/payment", classification: "HIDE", note: "Checkout alias. Keep /checkout as the jump." },
  { route: "/project-summary", classification: "ARCHIVE CANDIDATE", note: "Legacy. Already off this menu." },
  { route: "/project-details", classification: "ARCHIVE CANDIDATE", note: "Legacy intake. Already off this menu." },
  { route: "/business-discovery-studio", classification: "ARCHIVE CANDIDATE", note: "Legacy Discovery Room. Already off this menu." },
  { route: "/studio-guide-prototype", classification: "ARCHIVE CANDIDATE", note: "Legacy Route Map alias. Already off this menu." },
  { route: "/studio-kitchen", classification: "ARCHIVE CANDIDATE", note: "Not on this menu. Do not delete from this overhaul." },
];
