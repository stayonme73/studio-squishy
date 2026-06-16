/**
 * Welcome Hall scene and zone types.
 * Perspective corridor — not a dashboard layout.
 */

export type WelcomeHallZoneId =
  | "corridor"
  | "welcomeWall"
  | "artPrism"
  | "studioDepth"
  | "endPortal";

export type WelcomeHallZoneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WorkspaceId =
  | "copywriter"
  | "strategy"
  | "campaign-planning"
  | "quality-review"
  | "video-production"
  | "reserved";

export type WorkspaceSide = "left" | "right";

export type WorkspaceDepth = "near" | "mid" | "far";

/** Landscape hallway stage — wider corridor plate. */
export const WELCOME_HALL_STAGE_ASPECT_RATIO = 1536 / 1024;
