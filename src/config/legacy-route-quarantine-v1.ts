/**
 * Legacy Route Quarantine V1 — active client navigation must not enter retired
 * Discovery / Studio Plan / standalone checkout flows.
 * @see docs/customer-journey-v1-locked.md
 */

/** Route Map — sole live front door for new campaigns, checkout, and intake. */
export const ROUTE_MAP_HREF = "/route-map";

/** Post-payment / edit materials — service-specific intake in Route Map scene. */
export const ROUTE_MAP_INTAKE_STEP_HREF = "/route-map?step=intake";

export const legacyRouteQuarantineV1 = {
  activeFrontDoor: ROUTE_MAP_HREF,
  activeIntake: ROUTE_MAP_INTAKE_STEP_HREF,
  activeStudioBoard: "/studio-board",
  activeProjectRecord: "/studio-board?record=open",
  activeReviewRoom: "/feedback-studio",
  activeFinalDelivery: "/deliverables",
  /** Retired client surfaces — direct navigation redirects here. */
  quarantineTarget: ROUTE_MAP_HREF,
} as const;

/** Legacy URLs preserved in code but sealed from active client entry. */
export const LEGACY_QUARANTINED_ROUTES = [
  "/business-discovery-studio",
  "/project-discovery",
  "/business_discovery_studio",
  "/draft-room",
  "/draft-room/begin",
  "/intake",
  "/project-summary",
  "/studio-plan-review",
  "/discovery-summary",
  "/payment",
  "/project-details",
  "/studio-guide",
] as const;
