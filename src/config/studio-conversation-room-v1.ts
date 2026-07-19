/**
 * Studio Conversation Room — foundation constants (physical workspace only).
 * @see docs/studio-conversation-room-foundation-v1-locked.md
 */

export const STUDIO_COMMUNICATION_LIGHT_STATES = [
  "idle",
  "listening",
  "speaking",
  "thinking",
  "unavailable",
] as const;

export type StudioCommunicationLightState =
  (typeof STUDIO_COMMUNICATION_LIGHT_STATES)[number];

export const studioConversationRoomV1 = {
  route: "/studio-conversation-room",
  legacyTabletRoute: "/studio-tablet",

  /** Portrait Studio Workspace — logical screen opening (CSS px). */
  workspaceViewport: { width: 834, height: 1112 },
  workspaceInset: { top: 56, bottom: 72, x: 24 },
  workspaceBezelOutsideMin: 16,

  /** Landscape Presentation Display — logical opening (CSS px). */
  presentationViewport: { width: 1280, height: 720 },
  presentationBezelOutsideMin: 14,

  /** Foundation cert page — empty shells; no behavior wiring. */
  foundationLightState: "idle" as StudioCommunicationLightState,

  /**
   * Quiet caption below the one conversation tablet.
   * Halo color marks the turn — gold Studio / teal customer.
   */
  surfaceCaptions: {
    tablet: "Studio Tablet",
    /** @deprecated Dual-surface retired. */
    workspace: "Studio Tablet",
    /** @deprecated Dual-surface retired. */
    presentation: "Studio Tablet",
  } as const,

  /**
   * One interactive tablet (owner direction 2026-07-18).
   * Dual equal-width Workspace + Presentation retired — too confusing.
   */
  equalSurfaceWidth: false,
  oneTabletLayout: true,

  lightStateLabels: {
    idle: "Studio quiet",
    listening: "Studio listening",
    speaking: "Studio speaking",
    thinking: "Studio thinking",
    unavailable: "Studio unavailable",
  } as const satisfies Record<StudioCommunicationLightState, string>,
} as const;

export function isStudioCommunicationLightState(
  value: string,
): value is StudioCommunicationLightState {
  return (STUDIO_COMMUNICATION_LIGHT_STATES as readonly string[]).includes(
    value,
  );
}
