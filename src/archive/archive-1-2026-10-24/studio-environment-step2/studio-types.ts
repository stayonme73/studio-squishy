/**
 * Studio scene and zone types.
 * Shapes future environment components without implementing them in MVP setup.
 */

export type StudioZoneId =
  | "whiteboardWall"
  | "strategyRoom"
  | "executiveDesk"
  | "builderWorkspace"
  | "fileCabinet";

export type StudioZoneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Portrait stage aspect ratio — consistent Squishy scale across viewports. */
export const STUDIO_STAGE_ASPECT_RATIO = 1024 / 1536;
