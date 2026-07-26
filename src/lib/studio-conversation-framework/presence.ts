/**
 * Studio Presence — coordinated Activity Bar + conversational baton (halo).
 * @see docs/studio-presence-system-v1-locked.md
 */

import type { ConversationDriver } from "@/config/studio-conversation-driver-v1";
import {
  presenceActivityLabel,
  studioPresenceSystemV1,
  type StudioPresenceActivity,
} from "@/config/studio-presence-system-v1";
import type { StudioCommunicationLightState } from "@/config/studio-conversation-room-v1";
import type { VoiceIntent } from "@/lib/studio-conversation-framework/voice-controller";

export type StudioPresenceSnapshot = {
  activity: StudioPresenceActivity;
  lightState: StudioCommunicationLightState;
  activityLabel: string | null;
  /** Latest customer utterance shown for listening confidence. */
  capturedTranscript: string | null;
  capturedConfirmed: boolean;
  /** Whose turn the room is lighting — the conversational baton. */
  floor: PresenceFloor;
};

export type ResolvePresenceInput = {
  intent: VoiceIntent;
  capturedTranscript?: string | null;
  /** Active Conversation Driver — shapes customer-mode Activity Bar. */
  driver?: ConversationDriver;
};

/** Who holds the conversational floor (visual baton). */
export type PresenceFloor = "studio" | "customer" | "neutral";

/**
 * Halo strength on a surface.
 * primary = has the floor; soft = matching edge while the other leads; dim = yielded.
 */
export type PresenceHaloStrength = "primary" | "soft" | "dim" | "neutral";

const INTENT_TO_LIGHT: Record<VoiceIntent, StudioCommunicationLightState> = {
  idle: "idle",
  listening: "listening",
  speaking: "speaking",
  thinking: "thinking",
  unavailable: "unavailable",
  captured: "listening",
  /* Waiting for the customer — calm light, not a speaking pulse. */
  awaiting: "idle",
};

const INTENT_TO_ACTIVITY: Record<VoiceIntent, StudioPresenceActivity> = {
  idle: "idle",
  listening: "customer-speaking",
  speaking: "studio-speaking",
  thinking: "thinking",
  unavailable: "waiting",
  captured: "captured",
  /*
   * Customer’s turn — teal floor cue stays, but the wave is static
   * (animation only for live mic / Studio speaking).
   */
  awaiting: "customer-answering",
};

export function resolveStudioPresence(
  input: ResolvePresenceInput,
): StudioPresenceSnapshot {
  const transcript = input.capturedTranscript?.trim() || null;
  const driver = input.driver ?? "studio-voice";

  /*
   * Customer typing / answering without Voice listening still holds the floor —
   * unless Studio is doing real post-capture work (thinking / speaking / captured beat).
   */
  if (
    driver === "customer" &&
    input.intent !== "captured" &&
    input.intent !== "thinking" &&
    input.intent !== "speaking" &&
    input.intent !== "listening"
  ) {
    /* Customer holds the floor without mic — static cue, not a speaking wave. */
    const activity = "customer-answering" as const;
    return {
      activity,
      lightState: "idle",
      activityLabel: presenceActivityLabel(activity),
      capturedTranscript: transcript,
      capturedConfirmed: false,
      floor: "customer",
    };
  }

  const lightState = INTENT_TO_LIGHT[input.intent];
  const activity = INTENT_TO_ACTIVITY[input.intent];
  const floor = presenceFloor(activity);

  return {
    activity,
    lightState,
    activityLabel:
      activity === "captured"
        ? studioPresenceSystemV1.listeningConfidence.capturedCheckmark
          ? "Captured"
          : presenceActivityLabel(activity)
        : presenceActivityLabel(activity),
    capturedTranscript:
      activity === "captured" ||
      activity === "customer-speaking" ||
      activity === "customer-answering"
        ? transcript
        : null,
    capturedConfirmed: activity === "captured",
    floor,
  };
}

/** Room-level glow bias (Activity Bar / ambient). Thinking maps to studio floor gold. */
export function presenceGlowBias(
  activity: StudioPresenceActivity,
): "neutral" | "studio" | "customer" | "thinking" | "dim" {
  switch (activity) {
    case "studio-speaking":
    case "thinking":
      return "studio";
    case "customer-speaking":
    case "customer-answering":
    case "captured":
      return "customer";
    case "waiting":
      return "dim";
    default:
      return "neutral";
  }
}

/** Conversational baton — who the room is looking at. */
export function presenceFloor(activity: StudioPresenceActivity): PresenceFloor {
  switch (activity) {
    case "studio-speaking":
    case "thinking":
      return "studio";
    case "customer-speaking":
    case "customer-answering":
    case "captured":
      return "customer";
    default:
      return "neutral";
  }
}

/**
 * One-tablet halo — lit whenever someone holds the floor.
 * Color comes from `data-presence-floor` (gold = Studio, teal = customer).
 */
export function tabletHaloStrength(floor: PresenceFloor): PresenceHaloStrength {
  if (floor === "studio" || floor === "customer") return "primary";
  return "neutral";
}

/** @deprecated Dual-surface retired — use tabletHaloStrength. */
export function workspaceHaloStrength(floor: PresenceFloor): PresenceHaloStrength {
  return tabletHaloStrength(floor);
}

/** @deprecated Dual-surface retired — use tabletHaloStrength. */
export function presentationHaloStrength(
  floor: PresenceFloor,
): PresenceHaloStrength {
  return tabletHaloStrength(floor);
}
