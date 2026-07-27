/**
 * Presentation Manager — sole gate for customer-facing display content.
 * Hardware stays empty; everything meaningful is runtime surface.
 */

import type {
  ConversationControllerOutput,
  ConversationRoomState,
  DiscoveryPresentationPayload,
  PresentationSurface,
} from "@/lib/studio-conversation-framework/types";

export function resolvePresentationSurface(
  state: ConversationRoomState,
  conversation: ConversationControllerOutput,
  discovery?: DiscoveryPresentationPayload | null,
): PresentationSurface {
  if (state.helpOpen) {
    return { kind: "help" };
  }

  if (
    state.journeyPhase === "conversation" &&
    discovery &&
    (state.flowStep === "understanding" ||
      state.flowStep === "deadline-check" ||
      state.flowStep === "greeting")
  ) {
    return { kind: "discovery", discovery };
  }

  if (state.journeyPhase === "conversation" && conversation.text.trim()) {
    return { kind: "message", message: conversation.text };
  }

  return { kind: "empty" };
}
