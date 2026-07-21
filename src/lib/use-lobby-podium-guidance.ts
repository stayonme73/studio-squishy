"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { studioLobbyPodiumGuidanceV1 } from "@/config/studio-lobby-podium-guidance-v1";
import {
  cancelLobbyPodiumGuidanceSpeech,
  clearStudioLobbyVisited,
  markStudioLobbyVisited,
  readStudioLobbyVisited,
  reconcileLobbyGuidanceEpoch,
  shouldArmLobbyHesitationGuidance,
  speakLobbyPodiumGuidance,
} from "@/lib/studio-lobby-podium-guidance";

function shouldResetLobbyGuidanceFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = new URLSearchParams(window.location.search).get("lobbyGuidance");
    return value === "reset" || value === "1";
  } catch {
    return false;
  }
}

function lobbyGuidanceLog(message: string): void {
  if (process.env.NODE_ENV !== "development") return;
  try {
    console.info(`[lobby-guidance] ${message}`);
  } catch {
    /* ignore */
  }
}

function isPodiumTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        ".hall-kiosk-hotspot, .hall-mobile-dock-panel__cta, [data-studio-guide-cta]",
      ),
    )
  );
}

function isGuidanceLabelTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(".hall-hesitation-prompt"))
  );
}

/**
 * First-visit Lobby guidance — eye-level chrome label + spoken tip.
 * Hard cooldown: at most one spoken line every speakCooldownMs.
 */
export function useLobbyPodiumGuidance(options: { enabled: boolean }) {
  const progressedRef = useRef(false);
  const offeringRef = useRef(false);
  const readyRef = useRef(false);
  const lastSpokenAtRef = useRef(0);
  /** Set by announceUnlockFromGesture before enabled flips true — preserve speech. */
  const unlockFromGestureRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remindTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerNowRef = useRef<(fromGesture: boolean) => void>(() => {});
  const [promptVisible, setPromptVisible] = useState(false);

  const clearRemindLoop = useCallback(() => {
    if (remindTimerRef.current != null) {
      clearInterval(remindTimerRef.current);
      remindTimerRef.current = null;
    }
  }, []);

  const offerNow = useCallback((fromGesture: boolean) => {
    if (progressedRef.current || offeringRef.current) return;

    const now = Date.now();
    if (
      lastSpokenAtRef.current > 0 &&
      now - lastSpokenAtRef.current < studioLobbyPodiumGuidanceV1.speakCooldownMs
    ) {
      lobbyGuidanceLog("voice cooldown — skip");
      return;
    }

    /*
     * Stamp cooldown BEFORE speak() so pointerdown+click / label+window
     * handlers cannot queue a second line in the same moment.
     */
    lastSpokenAtRef.current = now;
    offeringRef.current = true;
    lobbyGuidanceLog(fromGesture ? "speaking from tap" : "speaking with label");

    void speakLobbyPodiumGuidance(studioLobbyPodiumGuidanceV1.spokenLine).then((result) => {
      offeringRef.current = false;
      lobbyGuidanceLog(`speak result: ${result}`);
      if (!progressedRef.current) setPromptVisible(true);
      /*
       * If autoplay blocked and this was not a gesture, clear the stamp so the
       * next real tap can unlock voice — without waiting a full 30s for silence.
       */
      if (result !== "started" && !fromGesture) {
        lastSpokenAtRef.current = 0;
      }
    });
  }, []);

  offerNowRef.current = offerNow;

  const askGuide = useCallback(() => {
    if (progressedRef.current) return;
    setPromptVisible(true);
    readyRef.current = true;
    offerNowRef.current(true);
  }, []);

  /**
   * Call from New-to-the-Studio click (same user gesture).
   * Clears stale “visited” so Voice can arm, and speaks while the browser allows it.
   */
  const announceUnlockFromGesture = useCallback(() => {
    clearStudioLobbyVisited();
    progressedRef.current = false;
    readyRef.current = true;
    offeringRef.current = true;
    unlockFromGestureRef.current = true;
    lastSpokenAtRef.current = Date.now();
    setPromptVisible(true);
    lobbyGuidanceLog("speaking from New unlock gesture");
    void speakLobbyPodiumGuidance(studioLobbyPodiumGuidanceV1.spokenLine).then(
      (result) => {
        offeringRef.current = false;
        lobbyGuidanceLog(`unlock speak result: ${result}`);
        if (result !== "started") {
          lastSpokenAtRef.current = 0;
        }
      },
    );
  }, []);

  const noteProgress = useCallback(() => {
    progressedRef.current = true;
    readyRef.current = false;
    unlockFromGestureRef.current = false;
    setPromptVisible(false);
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearRemindLoop();
    cancelLobbyPodiumGuidanceSpeech();
    markStudioLobbyVisited();
  }, [clearRemindLoop]);

  useEffect(() => {
    if (!options.enabled) return;

    reconcileLobbyGuidanceEpoch();
    if (shouldResetLobbyGuidanceFromUrl()) {
      clearStudioLobbyVisited();
    }

    const recentUnlockSpeak =
      lastSpokenAtRef.current > 0 &&
      Date.now() - lastSpokenAtRef.current < 5000;
    const fromUnlockGesture =
      unlockFromGestureRef.current || recentUnlockSpeak;
    unlockFromGestureRef.current = false;

    if (!fromUnlockGesture) {
      progressedRef.current = false;
      offeringRef.current = false;
      readyRef.current = false;
      lastSpokenAtRef.current = 0;
      setPromptVisible(false);
    } else {
      /* Keep prompt + speak stamp from New click; do not cancel in-flight TTS. */
      progressedRef.current = false;
      readyRef.current = true;
      setPromptVisible(true);
    }
    clearRemindLoop();

    if (!shouldArmLobbyHesitationGuidance(readStudioLobbyVisited())) {
      lobbyGuidanceLog("not armed — already started from Lobby before");
      return;
    }

    lobbyGuidanceLog(
      fromUnlockGesture
        ? "armed after New unlock — preserve gesture speech"
        : "armed — chrome label + voice",
    );

    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* ignore */
    }

    timerRef.current = setTimeout(() => {
      if (progressedRef.current) return;
      readyRef.current = true;
      setPromptVisible(true);
      lobbyGuidanceLog("showing chrome label + attempting voice");
      if (lastSpokenAtRef.current === 0) {
        offerNowRef.current(false);
      }

      remindTimerRef.current = setInterval(() => {
        if (progressedRef.current) {
          clearRemindLoop();
          return;
        }
        offerNowRef.current(false);
      }, studioLobbyPodiumGuidanceV1.speakCooldownMs);
    }, studioLobbyPodiumGuidanceV1.hesitationMs);

    const onRetryVoice = (event: Event) => {
      if (progressedRef.current) return;
      if (!readyRef.current) return;
      if (isPodiumTarget(event.target)) return;
      if (isGuidanceLabelTarget(event.target)) return;
      offerNowRef.current(true);
    };

    window.addEventListener("click", onRetryVoice, true);

    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      clearRemindLoop();
      window.removeEventListener("click", onRetryVoice, true);
      const keepSpeech =
        lastSpokenAtRef.current > 0 &&
        Date.now() - lastSpokenAtRef.current < 5000;
      if (!keepSpeech) {
        cancelLobbyPodiumGuidanceSpeech();
      }
    };
  }, [clearRemindLoop, options.enabled]);

  return {
    noteProgress,
    askGuide,
    announceUnlockFromGesture,
    promptVisible,
    promptCopy: studioLobbyPodiumGuidanceV1.hesitationPrompt,
    onPromptActivate: () => {
      if (progressedRef.current) return;
      readyRef.current = true;
      setPromptVisible(true);
      offerNowRef.current(true);
    },
  };
}
