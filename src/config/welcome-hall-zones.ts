import { artTowerZoneNormalized } from "@/config/welcome-hall-tower";
import type { WelcomeHallZoneId, WelcomeHallZoneRect } from "@/types/welcome-hall";

/** Normalized zone bounds (0–1) within the Welcome Hall stage. */
export const WELCOME_HALL_ZONES: Record<WelcomeHallZoneId, WelcomeHallZoneRect> = {
  corridor: { x: 0, y: 0.1, width: 1, height: 0.78 },
  welcomeWall: { x: 0.01, y: 0.2, width: 0.22, height: 0.65 },
  /** Welcome pillar slot — plate v29; dormant rotation in welcome-hall-tower.ts */
  artPrism: artTowerZoneNormalized(),
  studioDepth: { x: 0.78, y: 0.22, width: 0.2, height: 0.62 },
  endPortal: { x: 0.35, y: 0.04, width: 0.3, height: 0.5 },
};

export const WELCOME_HALL_ZONE_LABELS: Record<WelcomeHallZoneId, string> = {
  corridor: "Welcome Hall Corridor",
  welcomeWall: "Welcome Wall",
  artPrism: "Digital Art Prism",
  studioDepth: "Studio Depth",
  endPortal: "End Portal",
};
