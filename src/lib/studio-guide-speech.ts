/**
 * GuideSpeechAdapter — sole home of browser STT APIs for Lobby Guide Package 1.
 * UI and state machine must never import SpeechRecognition / webkitSpeechRecognition.
 */

import { isStudioGuideVoiceEnabled } from "@/config/studio-guide-conversation-v1";

export type GuideDictationAvailability = {
  available: boolean;
  secureContext: boolean;
  recognitionSupported: boolean;
  voiceFlagEnabled: boolean;
};

export type GuideDictationHandlers = {
  onListeningStarted: () => void;
  onPermissionNeeded?: () => void;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onPermissionDenied: () => void;
  onError: (kind: GuideSpeechDiagnostic) => void;
  onEnded: () => void;
};

export type GuideSpeechDiagnostic =
  | "unsupported"
  | "permission_denied"
  | "secure_context_missing"
  | "timeout"
  | "provider_error"
  | "transcript_received"
  | "transcript_rejected_customer_edited"
  | "transcript_rejected_customer_typed"
  | "recognition_stopped_continue"
  | "recognition_stopped_close"
  | "recognition_stopped_hidden"
  | "recognition_stopped_mic_toggle";

type BrowserSpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type BrowserSpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResultLike>;
};

type BrowserSpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: BrowserSpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognitionLike;

let activeRecognition: BrowserSpeechRecognitionLike | null = null;

function guideSpeechLog(event: GuideSpeechDiagnostic, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  if (detail) {
    console.info("[studio-guide-speech]", event, detail);
  } else {
    console.info("[studio-guide-speech]", event);
  }
}

export function logGuideSpeechDiagnostic(
  event: GuideSpeechDiagnostic,
  detail?: Record<string, unknown>,
): void {
  guideSpeechLog(event, detail);
}

function getRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isGuideSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

export function isGuideDictationAvailable(): GuideDictationAvailability {
  const voiceFlagEnabled = isStudioGuideVoiceEnabled();
  const secureContext = isGuideSecureContext();
  const recognitionSupported = getRecognitionConstructor() !== null;
  const available = voiceFlagEnabled && secureContext && recognitionSupported;
  return { available, secureContext, recognitionSupported, voiceFlagEnabled };
}

export function stopGuideDictation(reason?: GuideSpeechDiagnostic): void {
  const rec = activeRecognition;
  activeRecognition = null;
  if (!rec) return;
  if (reason) guideSpeechLog(reason);
  try {
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    rec.onstart = null;
    rec.abort();
  } catch {
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Start browser dictation. Lazy — call only on mic tap (Performance Doctrine).
 */
export function startGuideDictation(handlers: GuideDictationHandlers): void {
  const availability = isGuideDictationAvailable();
  if (!availability.voiceFlagEnabled || !availability.recognitionSupported) {
    guideSpeechLog("unsupported");
    handlers.onError("unsupported");
    return;
  }
  if (!availability.secureContext) {
    guideSpeechLog("secure_context_missing");
    handlers.onError("secure_context_missing");
    return;
  }

  const Ctor = getRecognitionConstructor();
  if (!Ctor) {
    guideSpeechLog("unsupported");
    handlers.onError("unsupported");
    return;
  }

  stopGuideDictation();

  const recognition = new Ctor();
  activeRecognition = recognition;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  handlers.onPermissionNeeded?.();

  recognition.onstart = () => {
    handlers.onListeningStarted();
  };

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const piece = result?.[0]?.transcript ?? "";
      if (result.isFinal) {
        finalText += piece;
      } else {
        interim += piece;
      }
    }
    if (interim) handlers.onInterim(interim.trim());
    if (finalText.trim()) {
      const text = finalText.trim();
      guideSpeechLog("transcript_received", { length: text.length });
      handlers.onFinal(text);
    }
  };

  recognition.onerror = (event) => {
    const code = event.error ?? "provider_error";
    if (code === "not-allowed" || code === "service-not-allowed") {
      guideSpeechLog("permission_denied");
      handlers.onPermissionDenied();
      return;
    }
    if (code === "no-speech") {
      guideSpeechLog("timeout");
      handlers.onError("timeout");
      return;
    }
    guideSpeechLog("provider_error", { code });
    handlers.onError("provider_error");
  };

  recognition.onend = () => {
    if (activeRecognition === recognition) {
      activeRecognition = null;
    }
    handlers.onEnded();
  };

  try {
    recognition.start();
  } catch {
    guideSpeechLog("provider_error", { code: "start_failed" });
    activeRecognition = null;
    handlers.onError("provider_error");
  }
}
