/**
 * Conversation Room — project-need → route recommendation (Guidance Pass v1).
 * Voice recommends; the customer confirms. Never auto-commit a route.
 *
 * @see docs/studio-voice-guidance-map-v1.md
 * @see src/config/conversation-room-guide-v1.ts
 */

import type { RouteMapRoadId } from "@/config/route-map-v1";

/** Selectable customer routes only — never i285. */
export type RecommendedRouteId = Exclude<RouteMapRoadId, "i285">;

/**
 * Map opening “project need” bubbles (and close free-text) to a recommended road.
 * Empty / unknown → null (Voice asks the customer to choose without a highlight).
 */
export function recommendRouteFromProjectNeed(
  projectNeed: string | null | undefined,
): RecommendedRouteId | null {
  const need = projectNeed?.trim().toLowerCase() ?? "";
  if (!need) return null;

  if (
    need === "business setup" ||
    need.includes("business setup") ||
    need.includes("get my business started") ||
    need.includes("starting a business") ||
    need.includes("new business")
  ) {
    return "i75";
  }

  if (
    need === "branding or logo" ||
    need.includes("branding") ||
    need.includes("logo") ||
    need.includes("visual identity")
  ) {
    return "i75";
  }

  if (
    need === "website" ||
    need.includes("website") ||
    need.includes("web site")
  ) {
    return "i75";
  }

  if (
    need === "marketing materials" ||
    need === "social media graphics" ||
    need.includes("promote") ||
    need.includes("promotion") ||
    need.includes("marketing") ||
    need.includes("social media") ||
    need.includes("flyer") ||
    need.includes("campaign")
  ) {
    return "i20";
  }

  if (
    need === "update something existing" ||
    need.includes("update") ||
    need.includes("refresh") ||
    need.includes("already have")
  ) {
    return "update";
  }

  if (
    need === "presentation or document" ||
    need.includes("presentation") ||
    need.includes("document")
  ) {
    return "random-exit";
  }

  if (
    need === "i know what i need" ||
    need.includes("i know what") ||
    need.includes("specific service")
  ) {
    return "random-exit";
  }

  /* "Not sure yet" / "Something else" / free text — no forced pick. */
  return null;
}
