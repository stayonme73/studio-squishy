/**
 * Studio Lobby podium hesitation guidance — helpers.
 * Authority: docs/studio-guidance-doctrine-v1-locked.md
 */

import { studioLobbyPodiumGuidanceV1 } from "@/config/studio-lobby-podium-guidance-v1";

export type LobbyGuidanceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function shouldArmLobbyHesitationGuidance(hasVisitedLobby: boolean): boolean {
  return !hasVisitedLobby;
}

export function shouldOfferLobbyGuidance(input: {
  armed: boolean;
  progressed: boolean;
  offeredThisVisit: boolean;
  elapsedMs: number;
  hesitationMs: number;
}): boolean {
  if (!input.armed) return false;
  if (input.progressed) return false;
  if (input.offeredThisVisit) return false;
  return input.elapsedMs >= input.hesitationMs;
}

export function readStudioLobbyVisited(
  storage: LobbyGuidanceStorage | null | undefined = getBrowserLocalStorage(),
): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(studioLobbyPodiumGuidanceV1.storageKey) === "1";
  } catch {
    return false;
  }
}

export function markStudioLobbyVisited(
  storage: LobbyGuidanceStorage | null | undefined = getBrowserLocalStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(studioLobbyPodiumGuidanceV1.storageKey, "1");
  } catch {
    /* private mode / quota — treat as best-effort */
  }
}

/** Clears first-visit flag so Lobby guidance can arm again (dev / cert retest). */
export function clearStudioLobbyVisited(
  storage: LobbyGuidanceStorage | null | undefined = getBrowserLocalStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(studioLobbyPodiumGuidanceV1.storageKey);
  } catch {
    /* ignore */
  }
}

/**
 * Clears a stale first-visit flag when guidance behavior changes (epoch bump).
 * Keeps return visitors quiet after a real podium start; unsticks Chrome tabs
 * that were marked visited by earlier failed TTS attempts.
 */
export function reconcileLobbyGuidanceEpoch(
  storage: LobbyGuidanceStorage | null | undefined = getBrowserLocalStorage(),
): void {
  if (!storage) return;
  try {
    const { guidanceEpochKey, guidanceEpoch } = studioLobbyPodiumGuidanceV1;
    if (storage.getItem(guidanceEpochKey) === guidanceEpoch) return;
    storage.removeItem(studioLobbyPodiumGuidanceV1.storageKey);
    storage.setItem(guidanceEpochKey, guidanceEpoch);
  } catch {
    /* ignore */
  }
}

export function cancelLobbyPodiumGuidanceSpeech(
  speech: SpeechSynthesis | null | undefined = getBrowserSpeechSynthesis(),
): void {
  if (!speech) return;
  try {
    speech.cancel();
  } catch {
    /* ignore */
  }
}

export type SpeakLobbyGuidanceResult = "started" | "unsupported" | "blocked";

/**
 * Speaks the Lobby guidance line.
 * Must be invoked synchronously from a click/tap handler (browser autoplay).
 */
export function speakLobbyPodiumGuidance(
  text: string,
  speech: SpeechSynthesis | null | undefined = getBrowserSpeechSynthesis(),
): Promise<SpeakLobbyGuidanceResult> {
  const line = text.trim();
  if (!line || !speech || typeof SpeechSynthesisUtterance === "undefined") {
    return Promise.resolve("unsupported");
  }

  return new Promise((resolve) => {
    let settled = false;
    let failSafe = 0;
    const finish = (result: SpeakLobbyGuidanceResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(failSafe);
      resolve(result);
    };

    try {
      /* Drop any queued lines so tips never play back-to-back. */
      try {
        speech.cancel();
      } catch {
        /* ignore */
      }
      try {
        speech.resume();
      } catch {
        /* ignore */
      }

      const utter = new SpeechSynthesisUtterance(line);
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      const voice = pickPreferredLobbyVoice(speech.getVoices());
      if (voice) {
        utter.voice = voice;
        if (voice.lang) utter.lang = voice.lang;
      }

      utter.onstart = () => finish("started");
      utter.onerror = () => finish("blocked");
      utter.onend = () => {
        if (!settled) finish("started");
      };

      failSafe = window.setTimeout(() => {
        if (speech.speaking || speech.pending) finish("started");
        else finish("blocked");
      }, 3000);

      speech.speak(utter);
      try {
        if (speech.paused) speech.resume();
      } catch {
        /* ignore */
      }
    } catch {
      finish("blocked");
    }
  });
}

function pickPreferredLobbyVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  return (
    pool.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ??
    pool.find((v) => v.localService) ??
    pool[0] ??
    null
  );
}

function getBrowserLocalStorage(): LobbyGuidanceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getBrowserSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}
