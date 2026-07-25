/**
 * Launch Studio Voice — free browser TTS, device-local preferred voice.
 * Tagia 2026-07-21: stay on browser voices for launch; no paid cloud TTS.
 *
 * Owner pick (2026-07-21): use the **second male** browser voice.
 * On Windows OneCore that is typically Microsoft Mark (after David).
 *
 * Live journey resolves Mark via launch pick without requiring the
 * developer audition page. Audition remains optional for saving a custom preference.
 */

export const STUDIO_BROWSER_VOICE_PREFERENCE_KEY =
  "studio-voice:browser-preferred:v1" as const;

export type StudioBrowserVoicePreference = {
  voiceURI: string;
  name: string;
  lang: string;
  savedAt: string;
};

export const studioBrowserVoiceV1 = {
  version: 1 as const,
  storageKey: STUDIO_BROWSER_VOICE_PREFERENCE_KEY,

  /**
   * Owner approved applying the preferred browser voice in Conversation Room.
   * Still free browser TTS — not cloud. Voice Off remains available.
   */
  liveApplyApproved: true as boolean,

  /**
   * Bounded wait for `speechSynthesis.getVoices()` / `voiceschanged`.
   * Starting point — not sacred. Prefer a brief delay over speaking in
   * the wrong voice and switching mid-line.
   */
  voicesReadyTimeoutMs: 750,

  /**
   * Owner pick: second English male voice on the device.
   * Name hints favor Microsoft Mark when present (Windows second male).
   */
  launchPick: {
    strategy: "second-english-male" as const,
    nameHints: ["Microsoft Mark", "Mark"] as const,
    note: "Second male voice — typically Microsoft Mark on Windows.",
  },

  copy: {
    savePreferred: "Save as preferred voice on this device",
    clearPreferred: "Clear preferred voice on this device",
    preferredSaved:
      "Saved for this device. Conversation Room will use it when Voice is On (if this voice exists here).",
    preferredCleared: "Preferred voice cleared on this device.",
    liveGateOff:
      "Live apply is OFF. Saving here does not change customer Conversation Room speech yet.",
    liveGateOn:
      "Live apply is ON. Preferred / second-male pick is used when Voice guidance is On.",
  },
} as const;
