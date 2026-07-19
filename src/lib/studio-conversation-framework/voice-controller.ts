/**
 * Voice Controller — intent → Communication Light + Presence System.
 * Later: microphone, speech recognition, spoken output.
 */

import type { ConversationDriver } from "@/config/studio-conversation-driver-v1";
import type {
  ConversationRoomState,
  VoiceControllerOutput,
} from "@/lib/studio-conversation-framework/types";
import { resolveStudioPresence } from "@/lib/studio-conversation-framework/presence";

export type VoiceIntent =
  | "idle"
  | "listening"
  | "speaking"
  | "thinking"
  | "unavailable"
  | "captured"
  /** Customer's turn — Voice finished asking; room waits for speak/type. */
  | "awaiting";

export function resolveVoiceController(
  state: ConversationRoomState,
  intent: VoiceIntent = "idle",
  capturedTranscript: string | null = null,
  driver: ConversationDriver = state.conversationDriver,
): VoiceControllerOutput {
  const presence = resolveStudioPresence({
    intent,
    capturedTranscript,
    driver,
  });
  return {
    lightState: presence.lightState,
    presence,
  };
}
