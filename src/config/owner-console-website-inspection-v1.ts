/**
 * Owner Console — verified customer-site inspection shortcuts (migrated from Studio Review).
 * Owner-only surface; routes must match live customer journey doors.
 */

import {
  customerJourneyStepName,
  customerJourneyStepRoute,
} from "@/config/customer-journey-v1";
import { FILE_ROOM_ROUTE } from "@/config/file-room";
import { ROUTE_MAP_INTAKE_STEP_HREF } from "@/config/legacy-route-quarantine-v1";
import { projectBuilderHref } from "@/config/project-builder-v1";
import { studioBoard } from "@/config/studio-board";
import { studioLobbyEntryV1 } from "@/config/studio-lobby-entry-v1";

const BUILDER_ROAD_ID = "i75";

export type OwnerConsoleWebsiteShortcut = {
  id: string;
  label: string;
  href: string;
  description?: string;
};

export const ownerConsoleWebsiteInspectionV1 = {
  sectionTitle: "Website inspection",
  sectionLead:
    "Open live customer pages in a new tab. These are the same routes customers use — not legacy Studio Review jumps.",
  journeyTitle: "Customer journey",
  toolsTitle: "Studio tools (internal)",
  mobilePreviewTitle: "Mobile preview",
  mobilePreviewHint:
    "Development only — scan to open the current customer page on your phone (same Wi‑Fi). Studio Review drawer is retired.",
  shortcuts: {
    journey: [
      {
        id: "studio-lobby",
        label: customerJourneyStepName("studio-lobby"),
        href: studioLobbyEntryV1.routes.frontDoor,
        description: "Front door",
      },
      {
        id: "route-map",
        label: "Route Map",
        href: "/route-map",
        description: "Studio Guide — service discovery",
      },
      {
        id: "conversation-room",
        label: customerJourneyStepName("studio-guide"),
        href: customerJourneyStepRoute("studio-guide"),
        description: "Conversation Room spine",
      },
      {
        id: "project-builder",
        label: customerJourneyStepName("build-your-project"),
        href: projectBuilderHref(BUILDER_ROAD_ID),
        description: "Build Your Project workspace",
      },
      {
        id: "studio-plan",
        label: "Studio Plan",
        href: `${projectBuilderHref(BUILDER_ROAD_ID)}&view=studio-plan`,
        description: "Plan review before checkout",
      },
      {
        id: "checkout",
        label: customerJourneyStepName("secure-checkout"),
        href: customerJourneyStepRoute("secure-checkout"),
        description: "Review and Confirm",
      },
      {
        id: "materials-intake",
        label: "Materials upload (intake)",
        href: ROUTE_MAP_INTAKE_STEP_HREF,
        description: "Project Intake / materials",
      },
      {
        id: "studio-board",
        label: customerJourneyStepName("studio-board"),
        href: customerJourneyStepRoute("studio-board"),
        description: "Post-purchase project home",
      },
      {
        id: "review-room",
        label: customerJourneyStepName("review-room"),
        href: studioBoard.routes.feedbackStudio,
        description: "Customer Review Room",
      },
      {
        id: "final-delivery",
        label: customerJourneyStepName("final-delivery"),
        href: studioBoard.routes.deliverables,
        description: "Released deliverables",
      },
      {
        id: "help-center",
        label: customerJourneyStepName("help-center"),
        href: studioBoard.routes.helpCenter,
        description: "Policies and help",
      },
    ] satisfies OwnerConsoleWebsiteShortcut[],
    internal: [
      {
        id: "file-room",
        label: "File Room",
        href: FILE_ROOM_ROUTE,
        description: "Campaign list and materials review",
      },
      {
        id: "studio-self-test",
        label: "Studio Self-Test",
        href: `${FILE_ROOM_ROUTE}/studio-self-test`,
        description: "Owner test scoreboard",
      },
    ] satisfies OwnerConsoleWebsiteShortcut[],
  },
  /** Retired from active Owner UI (was global Studio Review). */
  retiredFromStudioReview: [
    { id: "global-studio-review-tab", reason: "Global ?studioReview=1 drawer removed from site layout" },
    { id: "owner-console-self-link", reason: "Redundant when already on Owner Console" },
    { id: "production-workspace-self-test", reason: "Deep link to studio-self-test job only — use File Room / Self-Test" },
    { id: "team-offices-self-test", reason: "Internal test campaign office — open from File Room when needed" },
    { id: "reset-campaign-dev", reason: "Dev reset control — not migrated (use File Room / dev scripts)" },
    { id: "conversation-review-dev-link", reason: "Conversation Room Studio Review link removed — use this section" },
  ],
} as const;
