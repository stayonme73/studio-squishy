/**
 * Device-local preferred browser TTS voice.
 * @see src/config/studio-browser-voice-v1.ts
 *
 * Does not read or write Voice On/Off narration consent
 * (`studio-voice:narration-preference:v1`).
 */

import {
  STUDIO_BROWSER_VOICE_PREFERENCE_KEY,
  studioBrowserVoiceV1,
  type StudioBrowserVoicePreference,
} from "@/config/studio-browser-voice-v1";

const LIKELY_FEMALE =
  /female|zira|hazel|susan|samantha|karen|moira|tessa|fiona|veena|catherine|heather|linda|michelle|sara|aria|jenny|natasha|sonia|helen|paulina|nova|shimmer|coral|sage|marin|alloy|allison|ava|emma|joanna|ivy|kendra|kimberly|salli|amy/i;

const LIKELY_MALE =
  /male|\bdavid\b|\bmark\b|\bgeorge\b|\bjames\b|\bguy\b|\bdaniel\b|\bthomas\b|\bfred\b|\balex\b|\barthur\b|\baaron\b|\beric\b|\bryan\b|\bbrian\b|\bravi\b|\bsean\b|\bgordon\b|\bkevin\b|\bnathan\b|\brichard\b|\bandrew\b|\bmatthew\b|\bwilliam\b|\bjohn\b|\bmichael\b|\boliver\b|\bsam\b|\bralph\b|\bbruce\b|\bonyx\b|\becho\b|\bash\b|\bcedar\b|\bverse\b|\bballad\b/i;

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis === "undefined") return null;
    const fromGlobal = (globalThis as { localStorage?: Storage }).localStorage;
    if (fromGlobal) return fromGlobal;
    const fromWindow = (globalThis as { window?: { localStorage?: Storage } })
      .window?.localStorage;
    return fromWindow ?? null;
  } catch {
    return null;
  }
}

export function readBrowserVoicePreference(): StudioBrowserVoicePreference | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STUDIO_BROWSER_VOICE_PREFERENCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioBrowserVoicePreference>;
    if (
      typeof parsed.voiceURI !== "string" ||
      !parsed.voiceURI.trim() ||
      typeof parsed.name !== "string" ||
      typeof parsed.lang !== "string"
    ) {
      return null;
    }
    return {
      voiceURI: parsed.voiceURI,
      name: parsed.name,
      lang: parsed.lang,
      savedAt:
        typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeBrowserVoicePreference(input: {
  voiceURI: string;
  name: string;
  lang: string;
}): StudioBrowserVoicePreference | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  const preference: StudioBrowserVoicePreference = {
    voiceURI: input.voiceURI.trim(),
    name: input.name.trim(),
    lang: input.lang.trim() || "en-US",
    savedAt: new Date().toISOString(),
  };
  if (!preference.voiceURI || !preference.name) return null;
  try {
    storage.setItem(
      STUDIO_BROWSER_VOICE_PREFERENCE_KEY,
      JSON.stringify(preference),
    );
    return preference;
  } catch {
    return null;
  }
}

export function clearBrowserVoicePreference(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(STUDIO_BROWSER_VOICE_PREFERENCE_KEY);
  } catch {
    /* ignore */
  }
}

export function isLikelyMaleBrowserVoice(voice: {
  name: string;
}): boolean {
  const name = voice.name;
  if (LIKELY_FEMALE.test(name) && !/\bmark\b/i.test(name)) return false;
  if (LIKELY_MALE.test(name)) return true;
  return false;
}

/** English voices only — launch pick pool. */
export function listEnglishBrowserVoices(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
}

/**
 * Owner pick: Mark name hints first, else second English male when identifiable.
 */
export function pickSecondEnglishMaleVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const english = listEnglishBrowserVoices(voices);
  if (!english.length) return null;

  for (const hint of studioBrowserVoiceV1.launchPick.nameHints) {
    const hinted = english.find((voice) =>
      voice.name.toLowerCase().includes(hint.toLowerCase()),
    );
    if (hinted && isLikelyMaleBrowserVoice(hinted)) return hinted;
  }

  const males = english.filter((voice) => isLikelyMaleBrowserVoice(voice));
  if (males.length >= 2) return males[1] ?? null;
  if (males.length === 1) return males[0] ?? null;
  return null;
}

/** Best available English voice before bare browser default. */
export function pickBestEnglishBrowserVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const english = listEnglishBrowserVoices(voices);
  if (!english.length) return null;
  return (
    english.find((voice) => voice.default) ??
    english.find((voice) => voice.localService) ??
    english[0] ??
    null
  );
}

/**
 * Resolve a SpeechSynthesisVoice for live Studio narration when apply is on.
 *
 * Order (voices must already be loaded):
 * 1. saved device preference by voiceURI
 * 2. saved preference by name
 * 3. configured second English male / Microsoft Mark
 * 4. best available English voice
 * 5. null → caller leaves browser default
 */
export function resolveLiveBrowserVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!studioBrowserVoiceV1.liveApplyApproved) return null;

  const preference = readBrowserVoicePreference();
  if (preference) {
    const byUri = voices.find((voice) => voice.voiceURI === preference.voiceURI);
    if (byUri) return byUri;
    const byName = voices.find((voice) => voice.name === preference.name);
    if (byName) return byName;
  }

  return (
    pickSecondEnglishMaleVoice(voices) ?? pickBestEnglishBrowserVoice(voices)
  );
}

export function readBrowserVoicesNow(
  synth: Pick<SpeechSynthesis, "getVoices">,
): SpeechSynthesisVoice[] {
  try {
    return synth.getVoices() ?? [];
  } catch {
    return [];
  }
}

type VoicesChangedTarget = {
  addEventListener: (
    type: "voiceschanged",
    listener: () => void,
  ) => void;
  removeEventListener: (
    type: "voiceschanged",
    listener: () => void,
  ) => void;
  getVoices: () => SpeechSynthesisVoice[];
};

/**
 * Return voices immediately when the list is already populated.
 * Otherwise wait for `voiceschanged` or the bounded timeout — whichever first.
 * Always cleans up the listener and timer. AbortSignal cancels the wait early.
 */
export function waitForBrowserVoices(
  synth: VoicesChangedTarget,
  timeoutMs: number = studioBrowserVoiceV1.voicesReadyTimeoutMs,
  signal?: AbortSignal,
): Promise<SpeechSynthesisVoice[]> {
  const immediate = readBrowserVoicesNow(synth);
  if (immediate.length > 0) return Promise.resolve(immediate);
  if (signal?.aborted) return Promise.resolve(readBrowserVoicesNow(synth));

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      try {
        synth.removeEventListener("voiceschanged", onVoices);
      } catch {
        /* ignore */
      }
      if (signal) {
        try {
          signal.removeEventListener("abort", onAbort);
        } catch {
          /* ignore */
        }
      }
      resolve(readBrowserVoicesNow(synth));
    };

    const onVoices = () => {
      if (readBrowserVoicesNow(synth).length > 0) finish();
    };

    const onAbort = () => finish();

    try {
      synth.addEventListener("voiceschanged", onVoices);
    } catch {
      finish();
      return;
    }

    if (signal) {
      try {
        signal.addEventListener("abort", onAbort, { once: true });
      } catch {
        /* ignore */
      }
    }

    timer = setTimeout(finish, Math.max(0, timeoutMs));
  });
}
