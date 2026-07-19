/**
 * Conversation Room — customer desk stage machine + Activity Panel controller.
 * Stages advance the conversation; the Activity Panel is a single view slot.
 * Legacy /route-map and /project-builder pages remain until Voice-tablet cert.
 *
 * @see docs/studio-conversation-flow-rhythm-v1-locked.md
 * @see docs/studio-working-draft-persistence-v1-locked.md
 */

/** Ordered conversation stages — previous stage retires when the next owns the moment. */
export const CONVERSATION_ROOM_STAGES = [
  "opening",
  "route",
  "services",
  "plan",
  "checkout",
  "intake",
  "complete",
] as const;

export type ConversationRoomStage = (typeof CONVERSATION_ROOM_STAGES)[number];

/**
 * One Activity Panel source of truth.
 * Help may look different visually, but it still enters through this controller.
 */
export const ACTIVITY_PANEL_IDS = [
  "none",
  "route",
  "learnMore",
  "builder",
  "plan",
  "checkout",
  "intake",
  "help",
] as const;

export type ActivityPanelId = (typeof ACTIVITY_PANEL_IDS)[number];

/** Panels that use the right-hand slide shell (Help may use a distinct chrome). */
export const ACTIVITY_SLIDE_PANEL_IDS = [
  "route",
  "learnMore",
  "builder",
  "plan",
  "checkout",
  "intake",
] as const satisfies readonly ActivityPanelId[];

export type ActivitySlidePanelId = (typeof ACTIVITY_SLIDE_PANEL_IDS)[number];

export function isActivitySlidePanel(
  panel: ActivityPanelId,
): panel is ActivitySlidePanelId {
  return (ACTIVITY_SLIDE_PANEL_IDS as readonly string[]).includes(panel);
}

export function isConversationRoomStage(
  value: unknown,
): value is ConversationRoomStage {
  return (
    typeof value === "string" &&
    (CONVERSATION_ROOM_STAGES as readonly string[]).includes(value)
  );
}

export function isActivityPanelId(value: unknown): value is ActivityPanelId {
  return (
    typeof value === "string" &&
    (ACTIVITY_PANEL_IDS as readonly string[]).includes(value)
  );
}

/** Default panel when a stage first becomes active (none = conversation only). */
export const STAGE_DEFAULT_PANEL: Record<
  ConversationRoomStage,
  ActivityPanelId
> = {
  opening: "none",
  /** Route chooser lives on the tablet — Activity Panel stays closed. */
  route: "none",
  services: "builder",
  /** Studio Plan review lives on the tablet — Activity Panel stays closed. */
  plan: "none",
  checkout: "checkout",
  /** Project Intake opens in the Activity Panel (multi-service cards). */
  intake: "intake",
  complete: "none",
};

export const conversationRoomStageV1 = {
  stages: CONVERSATION_ROOM_STAGES,
  panels: ACTIVITY_PANEL_IDS,
  initialStage: "opening" as ConversationRoomStage,
  initialPanel: "none" as ActivityPanelId,
  /** Cursor key stored on the working draft. */
  locationPrefix: "conversation-room-stage:",
} as const;

export function stageLocation(stage: ConversationRoomStage): string {
  return `${conversationRoomStageV1.locationPrefix}${stage}`;
}

export function stageFromLocation(
  location: unknown,
): ConversationRoomStage | null {
  if (typeof location !== "string") return null;
  const prefix = conversationRoomStageV1.locationPrefix;
  if (!location.startsWith(prefix)) return null;
  const stage = location.slice(prefix.length);
  return isConversationRoomStage(stage) ? stage : null;
}
