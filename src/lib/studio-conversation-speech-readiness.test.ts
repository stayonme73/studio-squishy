import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STUDIO_VOICE_NARRATION_PREFERENCE_KEY } from "@/config/studio-voice-preference-v1";
import {
  cancelConversationSpeech,
  speakConversationLine,
} from "@/lib/studio-conversation-speech";

type FakeVoice = SpeechSynthesisVoice;

function voice(name: string, voiceURI: string): FakeVoice {
  return {
    name,
    voiceURI,
    lang: "en-US",
    localService: true,
    default: name.includes("David"),
  } as FakeVoice;
}

const DAVID = voice("Microsoft David - English (United States)", "uri:david");
const MARK = voice("Microsoft Mark - English (United States)", "uri:mark");

const sessionStore = new Map<string, string>();
const localStore = new Map<string, string>();

let listedVoices: FakeVoice[] = [];
let voicesListeners = new Set<() => void>();
let spoken: Array<{ text: string; voiceName: string | null }> = [];

function stubNarrationOn() {
  sessionStore.set(STUDIO_VOICE_NARRATION_PREFERENCE_KEY, "on");
}

function stubNarrationOff() {
  sessionStore.set(STUDIO_VOICE_NARRATION_PREFERENCE_KEY, "off");
}

function installSpeechMocks() {
  spoken = [];
  voicesListeners = new Set();
  listedVoices = [];

  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => sessionStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      sessionStore.set(key, value);
    },
    removeItem: (key: string) => {
      sessionStore.delete(key);
    },
  });

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => localStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStore.set(key, value);
    },
    removeItem: (key: string) => {
      localStore.delete(key);
    },
  });

  const synth = {
    paused: false,
    speaking: false,
    pending: false,
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: () => listedVoices,
    addEventListener: (type: string, listener: () => void) => {
      if (type === "voiceschanged") voicesListeners.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === "voiceschanged") voicesListeners.delete(listener);
    },
    speak: (utterance: SpeechSynthesisUtterance) => {
      spoken.push({
        text: utterance.text,
        voiceName: utterance.voice?.name ?? null,
      });
      queueMicrotask(() => {
        utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
        utterance.onend?.(new Event("end") as SpeechSynthesisEvent);
      });
    },
  };

  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", class {
    text: string;
    voice: SpeechSynthesisVoice | null = null;
    lang = "";
    rate = 1;
    onstart: ((ev: SpeechSynthesisEvent) => void) | null = null;
    onend: ((ev: SpeechSynthesisEvent) => void) | null = null;
    onerror: ((ev: SpeechSynthesisEvent) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  });
  vi.stubGlobal("window", globalThis);
}

afterEach(() => {
  cancelConversationSpeech();
  sessionStore.clear();
  localStore.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  installSpeechMocks();
  stubNarrationOn();
});

describe("studio conversation speech readiness", () => {
  it("speaks once with Mark when voices are already loaded (no David-first)", async () => {
    vi.useFakeTimers();
    listedVoices = [DAVID, MARK];
    const started = speakConversationLine("Welcome to The Studio.");
    expect(started).toBe(true);
    expect(spoken).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(40);
    expect(spoken).toEqual([
      { text: "Welcome to The Studio.", voiceName: MARK.name },
    ]);
  });

  it("empty initial voice list defers, then speaks Mark once after voiceschanged", async () => {
    vi.useFakeTimers();
    listedVoices = [];
    const started = speakConversationLine("Hello from Voice.");
    expect(started).toBe(true);
    expect(spoken).toHaveLength(0);
    expect(voicesListeners.size).toBe(1);

    listedVoices = [DAVID, MARK];
    for (const listener of [...voicesListeners]) listener();
    await vi.advanceTimersByTimeAsync(40);

    expect(spoken).toEqual([
      { text: "Hello from Voice.", voiceName: MARK.name },
    ]);
    expect(voicesListeners.size).toBe(0);
  });

  it("cancellation prevents deferred speech", async () => {
    vi.useFakeTimers();
    listedVoices = [];
    speakConversationLine("Should not speak.");
    expect(voicesListeners.size).toBe(1);
    cancelConversationSpeech();
    listedVoices = [DAVID, MARK];
    for (const listener of [...voicesListeners]) listener();
    await vi.advanceTimersByTimeAsync(100);
    expect(spoken).toHaveLength(0);
  });

  it("Voice Off prevents deferred speech", async () => {
    vi.useFakeTimers();
    listedVoices = [];
    speakConversationLine("Should stay silent.");
    stubNarrationOff();
    listedVoices = [DAVID, MARK];
    for (const listener of [...voicesListeners]) listener();
    await vi.advanceTimersByTimeAsync(100);
    expect(spoken).toHaveLength(0);
  });

  it("Voice Off at call time does not speak", () => {
    stubNarrationOff();
    listedVoices = [DAVID, MARK];
    const started = speakConversationLine("Silent.");
    expect(started).toBe(false);
    expect(spoken).toHaveLength(0);
  });

  it("a newer line replaces a pending deferred line", async () => {
    vi.useFakeTimers();
    listedVoices = [];
    speakConversationLine("First pending.");
    speakConversationLine("Second line wins.");
    listedVoices = [DAVID, MARK];
    for (const listener of [...voicesListeners]) listener();
    await vi.advanceTimersByTimeAsync(40);
    expect(spoken).toEqual([
      { text: "Second line wins.", voiceName: MARK.name },
    ]);
  });

  it("Board and Conversation Room share resolveLiveBrowserVoice via speakConversationLine", async () => {
    vi.useFakeTimers();
    listedVoices = [DAVID, MARK];
    speakConversationLine("Conversation Room line.");
    await vi.advanceTimersByTimeAsync(40);
    speakConversationLine("Board arrival welcome.");
    await vi.advanceTimersByTimeAsync(40);
    expect(spoken.map((entry) => entry.voiceName)).toEqual([
      MARK.name,
      MARK.name,
    ]);
  });
});
