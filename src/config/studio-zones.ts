import type { StudioZoneId, StudioZoneRect } from "@/types/studio";

/** Normalized zone bounds (0–1) within the studio stage. */
export const STUDIO_ZONES: Record<StudioZoneId, StudioZoneRect> = {
  whiteboardWall: { x: 0, y: 0.1, width: 0.46, height: 0.46 },
  strategyRoom: { x: 0.46, y: 0.1, width: 0.54, height: 0.38 },
  executiveDesk: { x: 0, y: 0.56, width: 0.48, height: 0.44 },
  builderWorkspace: { x: 0.48, y: 0.48, width: 0.52, height: 0.36 },
  fileCabinet: { x: 0.48, y: 0.84, width: 0.52, height: 0.16 },
};

export const STUDIO_ZONE_LABELS: Record<StudioZoneId, string> = {
  whiteboardWall: "Whiteboard Wall",
  strategyRoom: "Strategy Room",
  executiveDesk: "Executive Desk",
  builderWorkspace: "Builder Workspace",
  fileCabinet: "File Cabinet Area",
};
