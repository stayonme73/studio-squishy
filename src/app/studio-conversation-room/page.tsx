import { ConversationRoomRuntime } from "@/components/studio-conversation-room";
import {
  isConversationRoomStage,
  type ConversationRoomStage,
} from "@/config/conversation-room-stage-v1";
import type { VoiceIntent } from "@/lib/studio-conversation-framework";

type StudioConversationRoomPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PRESENCE_INTENTS = new Set<VoiceIntent>([
  "idle",
  "listening",
  "speaking",
  "thinking",
  "unavailable",
  "captured",
  "awaiting",
]);

function readParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function resolvePresenceIntent(
  raw: string | undefined,
): VoiceIntent {
  if (raw && PRESENCE_INTENTS.has(raw as VoiceIntent)) {
    return raw as VoiceIntent;
  }
  return "idle";
}

/**
 * Studio Conversation Room — Discovery Question 1 live wire.
 * Question: “What are you trying to accomplish?”
 * Remaining Discovery questions stay locked until Q1 certifies.
 *
 * Presence demos: `?presence=speaking|awaiting|listening|captured|thinking`
 * Hardware inspect: `?inspect=1`
 */
export default async function StudioConversationRoomPage({
  searchParams,
}: StudioConversationRoomPageProps) {
  const params = await searchParams;
  const requestedStage = readParam(params.stage);
  const requestedLegacyStep = readParam(params.step);
  const requestedLegacyView = readParam(params.view);
  const initialStage: ConversationRoomStage | undefined =
    isConversationRoomStage(requestedStage)
      ? requestedStage
      : requestedLegacyStep === "intake"
        ? "intake"
        : requestedLegacyStep === "checkout"
          ? "checkout"
          : requestedLegacyView === "studio-plan"
            ? "plan"
            : undefined;
  const inspectRaw = readParam(params.inspect);
  const inspectHardware = inspectRaw === "1";
  const voiceIntent = resolvePresenceIntent(readParam(params.presence));
  const capturedTranscript =
    voiceIntent === "captured" || voiceIntent === "listening"
      ? (readParam(params.heard) ??
        "I need a flyer for my grand opening.")
      : null;

  return (
    <main>
      <h1 className="sr-only">Studio Conversation Room</h1>
      <ConversationRoomRuntime
        initialStage={initialStage}
        inspectHardware={inspectHardware}
        voiceIntent={voiceIntent}
        capturedTranscript={capturedTranscript}
      />
    </main>
  );
}
