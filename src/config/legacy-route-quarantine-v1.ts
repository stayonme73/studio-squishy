/**
 * Legacy Route Quarantine V1 — active client navigation must not enter retired
 * Discovery / Studio Plan / standalone checkout flows.
 * @see docs/customer-journey-v1-locked.md
 */

/** Conversation Room: sole live front door for new campaigns, checkout, and intake. */
export const CONVERSATION_ROOM_HREF = "/studio-conversation-room";
export const ROUTE_MAP_HREF = CONVERSATION_ROOM_HREF;

/** Post-payment / edit materials: current intake panel in the Conversation Room. */
export const CONVERSATION_ROOM_INTAKE_HREF = "/studio-conversation-room?stage=intake";
export const CONVERSATION_ROOM_CHECKOUT_HREF = "/studio-conversation-room?stage=checkout";
export const ROUTE_MAP_INTAKE_STEP_HREF = CONVERSATION_ROOM_INTAKE_HREF;

export const legacyRouteQuarantineV1 = {
  activeFrontDoor: CONVERSATION_ROOM_HREF,
  activeCheckout: CONVERSATION_ROOM_CHECKOUT_HREF,
  activeIntake: CONVERSATION_ROOM_INTAKE_HREF,
  activeStudioBoard: "/studio-board",
  /**
   * Canonical Project Record is /campaign-details (customerJourneyV1's "project-record" step).
   * Kept as a literal here, not an import, because customer-journey-v1.ts already imports this
   * file — importing studio-board.ts back would create a cycle. Keep in sync by hand.
   */
  activeProjectRecord: "/campaign-details",
  activeReviewRoom: "/feedback-studio",
  activeFinalDelivery: "/deliverables",
  /** Retired client surfaces — direct navigation redirects here. */
  quarantineTarget: CONVERSATION_ROOM_HREF,
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
