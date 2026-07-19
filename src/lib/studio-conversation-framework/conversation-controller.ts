/**
 * Conversation Controller — channel stub.
 * Later: Claude / GPT / voice / typing / memory.
 * Now: exists and can output "Hello."
 */

import { studioConversationFrameworkV1 } from "@/config/studio-conversation-framework-v1";
import type { ConversationControllerOutput } from "@/lib/studio-conversation-framework/types";
import type { ConversationRoomState } from "@/lib/studio-conversation-framework/types";

export function runConversationController(
  state: ConversationRoomState,
): ConversationControllerOutput {
  if (
    state.journeyPhase === "conversation" &&
    state.flowStep === "greeting"
  ) {
    return { text: studioConversationFrameworkV1.stubGreeting };
  }

  /* Framework placeholder — Package 4 supplies real dialogue. */
  return { text: "" };
}
