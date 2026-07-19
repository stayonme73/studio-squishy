/**
 * Conversation Room speech adapter — STT + TTS for Discovery Q1 live wire.
 * UI must not import SpeechRecognition constructors directly.
 */

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

export type ConversationSpeechAvailability = {
  recognitionSupported: boolean;
  synthesisSupported: boolean;
  secureContext: boolean;
  canListen: boolean;
  canSpeak: boolean;
};

export type ConversationDictationHandlers = {
  onListeningStarted: () => void;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onPermissionDenied: () => void;
  onError: (kind: "unsupported" | "timeout" | "provider_error" | "secure_context_missing") => void;
  onEnded: () => void;
};

let activeRecognition: BrowserSpeechRecognitionLike | null = null;

function getRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function getConversationSpeechAvailability(): ConversationSpeechAvailability {
  if (typeof window === "undefined") {
    return {
      recognitionSupported: false,
      synthesisSupported: false,
      secureContext: false,
      canListen: false,
      canSpeak: false,
    };
  }
  const secureContext = window.isSecureContext === true;
  const recognitionSupported = getRecognitionConstructor() !== null;
  const synthesisSupported =
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined";
  return {
    recognitionSupported,
    synthesisSupported,
    secureContext,
    canListen: secureContext && recognitionSupported,
    canSpeak: synthesisSupported,
  };
}

export function stopConversationDictation(): void {
  const rec = activeRecognition;
  activeRecognition = null;
  if (!rec) return;
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

export function startConversationDictation(
  handlers: ConversationDictationHandlers,
): void {
  const availability = getConversationSpeechAvailability();
  if (!availability.recognitionSupported) {
    handlers.onError("unsupported");
    return;
  }
  if (!availability.secureContext) {
    handlers.onError("secure_context_missing");
    return;
  }

  const Ctor = getRecognitionConstructor();
  if (!Ctor) {
    handlers.onError("unsupported");
    return;
  }

  stopConversationDictation();
  cancelConversationSpeech();

  const recognition = new Ctor();
  activeRecognition = recognition;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => handlers.onListeningStarted();

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const piece = result?.[0]?.transcript ?? "";
      if (result.isFinal) finalText += piece;
      else interim += piece;
    }
    if (interim) handlers.onInterim(interim.trim());
    if (finalText.trim()) handlers.onFinal(finalText.trim());
  };

  recognition.onerror = (event) => {
    const code = event.error ?? "provider_error";
    if (code === "not-allowed" || code === "service-not-allowed") {
      handlers.onPermissionDenied();
      return;
    }
    if (code === "no-speech") {
      handlers.onError("timeout");
      return;
    }
    handlers.onError("provider_error");
  };

  recognition.onend = () => {
    if (activeRecognition === recognition) activeRecognition = null;
    handlers.onEnded();
  };

  try {
    recognition.start();
  } catch {
    activeRecognition = null;
    handlers.onError("provider_error");
  }
}

export function cancelConversationSpeech(): void {
  try {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
  } catch {
    /* fail silent */
  }
}

export function speakConversationLine(
  text: string,
  options?: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
  },
): boolean {
  try {
    if (typeof window === "undefined") return false;
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;
    cancelConversationSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1;
    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => options?.onEnd?.();
    utterance.onerror = () => options?.onEnd?.();
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** Resolves when speech ends (or immediately if synthesis unavailable). Real duration — no fake delay. */
export function speakConversationLineAsync(
  text: string,
  options?: { rate?: number; onStart?: () => void },
): Promise<"spoken" | "unavailable"> {
  return new Promise((resolve) => {
    const started = speakConversationLine(text, {
      rate: options?.rate,
      onStart: options?.onStart,
      onEnd: () => resolve("spoken"),
    });
    if (!started) resolve("unavailable");
  });
}
