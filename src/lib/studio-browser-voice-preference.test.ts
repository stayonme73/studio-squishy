import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STUDIO_BROWSER_VOICE_PREFERENCE_KEY,
  studioBrowserVoiceV1,
} from "@/config/studio-browser-voice-v1";
import { STUDIO_VOICE_NARRATION_PREFERENCE_KEY } from "@/config/studio-voice-preference-v1";
import {
  clearBrowserVoicePreference,
  pickBestEnglishBrowserVoice,
  pickSecondEnglishMaleVoice,
  readBrowserVoicePreference,
  readBrowserVoicesNow,
  resolveLiveBrowserVoice,
  waitForBrowserVoices,
  writeBrowserVoicePreference,
} from "@/lib/studio-browser-voice-preference";

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function stubStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
}

function voice(
  name: string,
  voiceURI: string,
  lang = "en-US",
  extras: Partial<SpeechSynthesisVoice> = {},
): SpeechSynthesisVoice {
  return { name, voiceURI, lang, localService: true, default: false, ...extras } as SpeechSynthesisVoice;
}

describe("studio-browser-voice-preference", () => {
  it("reads and writes device-local preference", () => {
    stubStorage();
    const saved = writeBrowserVoicePreference({
      voiceURI: "uri:mark",
      name: "Microsoft Mark",
      lang: "en-US",
    });
    expect(saved?.voiceURI).toBe("uri:mark");
    expect(readBrowserVoicePreference()?.name).toBe("Microsoft Mark");
    clearBrowserVoicePreference();
    expect(readBrowserVoicePreference()).toBeNull();
  });

  it("never writes the Voice On/Off narration-consent key", () => {
    stubStorage();
    writeBrowserVoicePreference({
      voiceURI: "uri:mark",
      name: "Microsoft Mark",
      lang: "en-US",
    });
    expect(store.has(STUDIO_BROWSER_VOICE_PREFERENCE_KEY)).toBe(true);
    expect(store.has(STUDIO_VOICE_NARRATION_PREFERENCE_KEY)).toBe(false);
    clearBrowserVoicePreference();
    expect(store.has(STUDIO_VOICE_NARRATION_PREFERENCE_KEY)).toBe(false);
  });

  it("saved voice URI wins over Mark launch pick", () => {
    stubStorage();
    writeBrowserVoicePreference({
      voiceURI: "uri:david",
      name: "Microsoft David Desktop",
      lang: "en-US",
    });
    const voices = [
      voice("Microsoft David Desktop", "uri:david"),
      voice("Microsoft Mark", "uri:mark"),
    ];
    expect(resolveLiveBrowserVoice(voices)?.voiceURI).toBe("uri:david");
  });

  it("saved voice name fallback works when URI changed", () => {
    stubStorage();
    writeBrowserVoicePreference({
      voiceURI: "uri:mark-old",
      name: "Microsoft Mark",
      lang: "en-US",
    });
    const voices = [
      voice("Microsoft David Desktop", "uri:david"),
      voice("Microsoft Mark", "uri:mark-new"),
    ];
    expect(resolveLiveBrowserVoice(voices)?.voiceURI).toBe("uri:mark-new");
  });

  it("configured Mark/second-English-male works without a saved preference", () => {
    stubStorage();
    expect(studioBrowserVoiceV1.liveApplyApproved).toBe(true);
    const voices = [
      voice("Microsoft David Desktop", "uri:david"),
      voice("Microsoft Zira Desktop", "uri:zira"),
      voice("Microsoft Mark", "uri:mark"),
    ];
    expect(pickSecondEnglishMaleVoice(voices)?.name).toBe("Microsoft Mark");
    expect(resolveLiveBrowserVoice(voices)?.name).toBe("Microsoft Mark");
  });

  it("falls back to best English voice when Mark is absent", () => {
    stubStorage();
    const voices = [
      voice("Microsoft Zira Desktop", "uri:zira", "en-US", { default: true }),
      voice("Microsoft David Desktop", "uri:david"),
    ];
    /* Zira is female — not second male; David is the only male → pick returns David */
    expect(pickSecondEnglishMaleVoice(voices)?.name).toBe(
      "Microsoft David Desktop",
    );
    expect(pickBestEnglishBrowserVoice(voices)?.name).toBe(
      "Microsoft Zira Desktop",
    );
    expect(resolveLiveBrowserVoice(voices)?.name).toBe(
      "Microsoft David Desktop",
    );
  });

  it("readBrowserVoicesNow returns empty safely", () => {
    expect(readBrowserVoicesNow({ getVoices: () => [] })).toEqual([]);
  });

  it("waitForBrowserVoices resolves immediately when voices exist", async () => {
    const listed = [voice("Microsoft Mark", "uri:mark")];
    const synth = {
      getVoices: () => listed,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    await expect(waitForBrowserVoices(synth, 750)).resolves.toEqual(listed);
    expect(synth.addEventListener).not.toHaveBeenCalled();
  });

  it("empty initial list defers until voiceschanged", async () => {
    let listed: SpeechSynthesisVoice[] = [];
    const listeners = new Set<() => void>();
    const synth = {
      getVoices: () => listed,
      addEventListener: (_type: "voiceschanged", listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: "voiceschanged", listener: () => void) => {
        listeners.delete(listener);
      },
    };

    const pending = waitForBrowserVoices(synth, 5_000);
    expect(listeners.size).toBe(1);
    listed = [
      voice("Microsoft David Desktop", "uri:david"),
      voice("Microsoft Mark", "uri:mark"),
    ];
    for (const listener of [...listeners]) listener();
    await expect(pending).resolves.toEqual(listed);
    expect(listeners.size).toBe(0);
  });

  it("timeout uses whatever voices are available (possibly empty)", async () => {
    vi.useFakeTimers();
    const listeners = new Set<() => void>();
    const synth = {
      getVoices: () => [] as SpeechSynthesisVoice[],
      addEventListener: (_type: "voiceschanged", listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: "voiceschanged", listener: () => void) => {
        listeners.delete(listener);
      },
    };
    const pending = waitForBrowserVoices(synth, 750);
    await vi.advanceTimersByTimeAsync(750);
    await expect(pending).resolves.toEqual([]);
    expect(listeners.size).toBe(0);
  });

  it("abort signal cleans up the voiceschanged listener early", async () => {
    const listeners = new Set<() => void>();
    const synth = {
      getVoices: () => [] as SpeechSynthesisVoice[],
      addEventListener: (_type: "voiceschanged", listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: "voiceschanged", listener: () => void) => {
        listeners.delete(listener);
      },
    };
    const abort = new AbortController();
    const pending = waitForBrowserVoices(synth, 5_000, abort.signal);
    expect(listeners.size).toBe(1);
    abort.abort();
    await expect(pending).resolves.toEqual([]);
    expect(listeners.size).toBe(0);
  });
});
