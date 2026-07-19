"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { studioGuideConversationV1 } from "@/config/studio-guide-conversation-v1";
import {
  isGuideDictationAvailable,
  logGuideSpeechDiagnostic,
  startGuideDictation,
  stopGuideDictation,
  type GuideSpeechDiagnostic,
} from "@/lib/studio-guide-speech";
import {
  reduceGuideSpeechState,
  type GuideSpeechEvent,
  type GuideSpeechState,
} from "@/lib/studio-guide-speech-state";

type Options = {
  /** When false, dictation is fully inactive (kill-switch or non-question step). */
  active: boolean;
  answerInputRef: RefObject<HTMLInputElement | null>;
  /** Changes when the Guide question step changes. */
  stepKey: string;
};

/**
 * Orchestrates Package 1 dictation via the speech adapter + pure state machine.
 * Does not import browser STT constructors.
 */
export function useGuideDictation({ active, answerInputRef, stepKey }: Options) {
  const [speechState, setSpeechState] = useState<GuideSpeechState>("idle");
  const [interimText, setInterimText] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const speechStateRef = useRef<GuideSpeechState>("idle");
  const customerEditedRef = useRef(false);
  const copy = studioGuideConversationV1.voice;

  const dispatch = useCallback((event: GuideSpeechEvent) => {
    const next = reduceGuideSpeechState(speechStateRef.current, event);
    speechStateRef.current = next.state;
    setSpeechState(next.state);
    if (next.clearInterim) setInterimText("");
    if (next.applyFinal && answerInputRef.current) {
      answerInputRef.current.value = next.applyFinal;
    }
    if (next.shouldStopListening) {
      stopGuideDictation();
    }
    return next;
  }, [answerInputRef]);

  const beginListening = useCallback(() => {
    customerEditedRef.current = false;
    setSpeechError(null);

    startGuideDictation({
      onPermissionNeeded: () => {
        dispatch({ type: "PERMISSION_NEEDED" });
      },
      onListeningStarted: () => {
        dispatch({ type: "LISTENING_STARTED" });
      },
      onInterim: (text) => {
        setInterimText(text);
      },
      onFinal: (text) => {
        const edited = customerEditedRef.current;
        if (edited) {
          logGuideSpeechDiagnostic("transcript_rejected_customer_edited");
        }
        dispatch({
          type: "FINAL_TRANSCRIPT",
          customerEdited: edited,
          text,
        });
      },
      onPermissionDenied: () => {
        setSpeechError(copy.statusPermissionDenied);
        dispatch({ type: "PERMISSION_DENIED" });
      },
      onError: (kind: GuideSpeechDiagnostic) => {
        if (kind === "unsupported") {
          setSpeechError(copy.statusUnsupported);
          dispatch({ type: "MARK_UNSUPPORTED" });
          return;
        }
        if (kind === "secure_context_missing") {
          setSpeechError(copy.statusSecureContextMissing);
          dispatch({ type: "MARK_UNSUPPORTED" });
          return;
        }
        if (kind === "timeout") {
          setSpeechError(copy.statusTimeout);
        } else {
          setSpeechError(copy.statusProviderError);
        }
        dispatch({ type: "ERROR" });
      },
      onEnded: () => {
        const current = speechStateRef.current;
        if (current === "listening" || current === "processing" || current === "requesting_permission") {
          dispatch({ type: "FORCE_STOP" });
        }
      },
    });
  }, [copy, dispatch]);

  const runStartFlags = useCallback(
    (next: ReturnType<typeof reduceGuideSpeechState>) => {
      if (next.shouldStartListening) {
        beginListening();
      }
    },
    [beginListening],
  );

  const onMicTap = useCallback(() => {
    const next = dispatch({ type: "MIC_TAP" });
    if (next.shouldStopListening) {
      logGuideSpeechDiagnostic("recognition_stopped_mic_toggle");
    }
    runStartFlags(next);
  }, [dispatch, runStartFlags]);

  const onRetry = useCallback(() => {
    const next = dispatch({ type: "RETRY" });
    runStartFlags(next);
  }, [dispatch, runStartFlags]);

  const onCustomerInput = useCallback(() => {
    customerEditedRef.current = true;
    const current = speechStateRef.current;
    if (
      current === "listening" ||
      current === "processing" ||
      current === "requesting_permission"
    ) {
      logGuideSpeechDiagnostic("transcript_rejected_customer_typed");
      dispatch({ type: "CUSTOMER_TYPED" });
    }
  }, [dispatch]);

  const stopForContinue = useCallback(() => {
    logGuideSpeechDiagnostic("recognition_stopped_continue");
    dispatch({ type: "FORCE_STOP" });
  }, [dispatch]);

  const stopForClose = useCallback(() => {
    logGuideSpeechDiagnostic("recognition_stopped_close");
    dispatch({ type: "FORCE_STOP" });
  }, [dispatch]);

  /* Availability probe — never blocks question render (Performance Doctrine). */
  useEffect(() => {
    if (!active) {
      stopGuideDictation();
      speechStateRef.current = "idle";
      setSpeechState("idle");
      setInterimText("");
      setSpeechError(null);
      return;
    }

    const availability = isGuideDictationAvailable();
    if (!availability.voiceFlagEnabled) {
      return;
    }
    if (!availability.available) {
      if (!availability.secureContext) {
        setSpeechError(copy.statusSecureContextMissing);
        logGuideSpeechDiagnostic("secure_context_missing");
      } else {
        setSpeechError(copy.statusUnsupported);
        logGuideSpeechDiagnostic("unsupported");
      }
      speechStateRef.current = "unsupported";
      setSpeechState("unsupported");
      return;
    }

    if (speechStateRef.current === "unsupported") {
      speechStateRef.current = "idle";
      setSpeechState("idle");
      setSpeechError(null);
    }
  }, [active, stepKey, copy.statusSecureContextMissing, copy.statusUnsupported]);

  /* Step change / deactivate — stop recognition. */
  useEffect(() => {
    if (!active) return;
    stopGuideDictation();
    if (speechStateRef.current !== "unsupported") {
      speechStateRef.current = "idle";
      setSpeechState("idle");
      setInterimText("");
    }
  }, [stepKey, active]);

  /* Tab / screen hide. */
  useEffect(() => {
    if (!active) return;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        logGuideSpeechDiagnostic("recognition_stopped_hidden");
        dispatch({ type: "FORCE_STOP" });
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active, dispatch]);

  /* Cleanup on unmount. */
  useEffect(() => {
    return () => {
      stopGuideDictation();
    };
  }, []);

  return {
    speechState,
    interimText,
    speechError,
    onMicTap,
    onRetry,
    onCustomerInput,
    stopForContinue,
    stopForClose,
  };
}
