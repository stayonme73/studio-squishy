/**
 * Conversation Room playback for Jessica, with Microsoft Mark as the only fallback.
 * A newer request stops the previous audio before anything else starts.
 */

import {
  cancelConversationSpeech,
  speakConversationLine,
} from "@/lib/studio-conversation-speech";
import { isVoiceNarrationEnabled } from "@/lib/studio-voice-preference";

type PlaybackHandler = ((this: GlobalEventHandlers, ev: Event) => void) | null;

type PlaybackAudio = {
  src: string;
  paused: boolean;
  onended: PlaybackHandler;
  onerror: PlaybackHandler;
  play: () => Promise<void>;
  pause: () => void;
};

export type StudioVoicePlaybackRequest = {
  text: string;
  /** Checked reply audio from the conversation route. When set, the line is not fetched again. */
  audioBase64?: string | null;
  /** Audio already fetched for this line. Playback owns the URL. */
  audioUrl?: string | null;
  /** ElevenLabs already failed for this reply. Speak with Mark and do not request audio again. */
  fallbackOnly?: boolean;
  /** Homepage guidance speaks even when the Conversation Room voice choice is unset. */
  withoutRoomPreference?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
};

export type StudioVoicePlaybackDeps = {
  narrationEnabled: () => boolean;
  speakFallback: (
    text: string,
    hooks: { onStart?: () => void; onEnd?: () => void },
  ) => boolean;
  createAudio: () => PlaybackAudio;
  fetchSpeech: (text: string, signal: AbortSignal) => Promise<string | null>;
  createObjectUrl: (bytes: Uint8Array<ArrayBuffer>) => string;
  revokeObjectUrl: (url: string) => void;
  decodeBase64: (value: string) => Uint8Array<ArrayBuffer>;
};

let generation = 0;
let activeAudio: PlaybackAudio | null = null;
let activeUrl: string | null = null;
let inflight: AbortController | null = null;

function browserDeps(): StudioVoicePlaybackDeps {
  return {
    narrationEnabled: isVoiceNarrationEnabled,
    speakFallback: (text, hooks) => speakConversationLine(text, hooks),
    createAudio: () => new Audio(),
    fetchSpeech: async (text, signal) => {
      const response = await fetch("/api/studio-voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal,
      });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("audio")) return null;
      const bytes = new Uint8Array(await response.arrayBuffer());
      return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    },
    createObjectUrl: (bytes) => URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" })),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    decodeBase64: (value) => {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    },
  };
}

let deps = browserDeps();

export function setStudioVoicePlaybackDeps(next: Partial<StudioVoicePlaybackDeps> | null): void {
  deps = { ...browserDeps(), ...next };
}

function stopActiveAudio(): void {
  const audio = activeAudio;
  activeAudio = null;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
    } catch {
      /* already stopped */
    }
  }
  if (activeUrl) {
    deps.revokeObjectUrl(activeUrl);
    activeUrl = null;
  }
}

/** Stop Jessica and Mark. Used when the customer asks something new or turns Voice off. */
export function cancelStudioVoicePlayback(): void {
  generation += 1;
  inflight?.abort();
  inflight = null;
  stopActiveAudio();
  cancelConversationSpeech();
}

function stillCurrent(token: number): boolean {
  return token === generation;
}

function speakWithMark(
  text: string,
  token: number,
  hooks: { onStart?: () => void; onEnd?: () => void },
): "mark" | "silent" | "cancelled" {
  if (!stillCurrent(token)) return "cancelled";
  stopActiveAudio();
  const started = deps.speakFallback(text, hooks);
  return started ? "mark" : "silent";
}

async function playUrl(
  url: string,
  token: number,
  hooks: { onStart?: () => void; onEnd?: () => void },
): Promise<boolean> {
  if (!stillCurrent(token)) {
    deps.revokeObjectUrl(url);
    return false;
  }
  const audio = deps.createAudio();
  activeAudio = audio;
  activeUrl = url;
  audio.src = url;
  let started = false;
  const finished = () => {
    if (activeAudio === audio) {
      activeAudio = null;
      if (activeUrl) deps.revokeObjectUrl(activeUrl);
      activeUrl = null;
    }
    if (stillCurrent(token)) hooks.onEnd?.();
  };
  audio.onended = finished;
  audio.onerror = () => {
    if (!started && stillCurrent(token)) return;
    finished();
  };
  try {
    await audio.play();
  } catch {
    if (activeAudio === audio) {
      audio.onended = null;
      audio.onerror = null;
      activeAudio = null;
      if (activeUrl) deps.revokeObjectUrl(activeUrl);
      activeUrl = null;
    }
    return false;
  }
  if (!stillCurrent(token)) {
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
    } catch {
      /* replaced */
    }
    return false;
  }
  started = true;
  hooks.onStart?.();
  return true;
}

/**
 * Play Jessica when audio is already checked, or fetch one Studio line.
 * Mark speaks only when Jessica never starts.
 */
export async function playStudioVoice(
  request: StudioVoicePlaybackRequest,
): Promise<"jessica" | "mark" | "silent" | "cancelled"> {
  const text = request.text.trim();
  if (!text) return "silent";
  cancelStudioVoicePlayback();
  const token = generation;
  if (!request.withoutRoomPreference && !deps.narrationEnabled()) {
    request.onEnd?.();
    return "silent";
  }

  let url: string | null = null;
  if (request.audioBase64) {
    url = deps.createObjectUrl(deps.decodeBase64(request.audioBase64));
  } else if (request.audioUrl) {
    url = request.audioUrl;
  } else if (!request.fallbackOnly) {
    const controller = new AbortController();
    inflight = controller;
    try {
      url = await deps.fetchSpeech(text, controller.signal);
    } catch {
      url = null;
    }
    if (inflight === controller) inflight = null;
  }

  if (!stillCurrent(token)) {
    if (url) deps.revokeObjectUrl(url);
    return "cancelled";
  }
  if (url) {
    const played = await playUrl(url, token, {
      onStart: request.onStart,
      onEnd: request.onEnd,
    });
    if (played) return "jessica";
    if (!stillCurrent(token)) return "cancelled";
  }
  return speakWithMark(text, token, {
    onStart: request.onStart,
    onEnd: request.onEnd,
  });
}
