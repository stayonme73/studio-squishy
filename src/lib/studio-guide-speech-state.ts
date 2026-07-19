/**
 * Guide speech state machine — pure transitions only.
 * No browser STT APIs (those live solely in studio-guide-speech.ts).
 */

export type GuideSpeechState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "processing"
  | "transcript_ready"
  | "error"
  | "unsupported";

export type GuideSpeechEvent =
  | { type: "MARK_UNSUPPORTED" }
  | { type: "MIC_TAP" }
  | { type: "PERMISSION_NEEDED" }
  | { type: "LISTENING_STARTED" }
  | { type: "PERMISSION_DENIED" }
  | { type: "ENTER_PROCESSING" }
  | {
      type: "FINAL_TRANSCRIPT";
      /** When true, do not apply transcript to the field. */
      customerEdited: boolean;
      text: string;
    }
  | { type: "ERROR" }
  | { type: "CUSTOMER_TYPED" }
  | { type: "FORCE_STOP" }
  | { type: "RETRY" };

export type GuideSpeechTransition = {
  state: GuideSpeechState;
  /** Final text to write into the answer field, if any. */
  applyFinal: string | null;
  clearInterim: boolean;
  shouldStartListening: boolean;
  shouldStopListening: boolean;
};

function base(
  state: GuideSpeechState,
  patch: Partial<GuideSpeechTransition> = {},
): GuideSpeechTransition {
  return {
    state,
    applyFinal: null,
    clearInterim: false,
    shouldStartListening: false,
    shouldStopListening: false,
    ...patch,
  };
}

/**
 * Reduce speech UI state. Side effects (start/stop recognition) are signaled
 * via flags for the caller to apply through the speech adapter.
 */
export function reduceGuideSpeechState(
  state: GuideSpeechState,
  event: GuideSpeechEvent,
): GuideSpeechTransition {
  if (state === "unsupported") {
    return base("unsupported");
  }

  switch (event.type) {
    case "MARK_UNSUPPORTED":
      return base("unsupported", { shouldStopListening: true, clearInterim: true });

    case "MIC_TAP": {
      if (state === "listening" || state === "processing" || state === "requesting_permission") {
        return base("idle", { shouldStopListening: true, clearInterim: true });
      }
      if (state === "idle" || state === "transcript_ready" || state === "error") {
        return base("requesting_permission", { shouldStartListening: true, clearInterim: true });
      }
      return base(state);
    }

    case "PERMISSION_NEEDED":
      return base("requesting_permission");

    case "LISTENING_STARTED":
      return base("listening");

    case "PERMISSION_DENIED":
      return base("error", { shouldStopListening: true, clearInterim: true });

    case "ENTER_PROCESSING":
      if (state === "listening") {
        return base("processing");
      }
      return base(state);

    case "FINAL_TRANSCRIPT": {
      if (event.customerEdited) {
        return base("idle", { shouldStopListening: true, clearInterim: true });
      }
      return base("transcript_ready", {
        applyFinal: event.text,
        clearInterim: true,
        shouldStopListening: true,
      });
    }

    case "ERROR":
      return base("error", { shouldStopListening: true, clearInterim: true });

    case "CUSTOMER_TYPED":
      if (
        state === "listening" ||
        state === "processing" ||
        state === "requesting_permission"
      ) {
        return base("idle", { shouldStopListening: true, clearInterim: true });
      }
      return base(state);

    case "FORCE_STOP":
      // unsupported is handled by the early return above
      return base("idle", { shouldStopListening: true, clearInterim: true });

    case "RETRY":
      if (state === "error") {
        return base("requesting_permission", { shouldStartListening: true, clearInterim: true });
      }
      return base(state);

    default:
      return base(state);
  }
}

/** Whether a final transcript may replace the answer field. */
export function mayApplyFinalTranscript(customerEditedSinceListen: boolean): boolean {
  return !customerEditedSinceListen;
}
