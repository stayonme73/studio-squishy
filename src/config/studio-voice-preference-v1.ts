/**
 * Conversation Room Voice narration preference — launch fix.
 * Presentation preference only (sessionStorage). Not working-draft / purchase data.
 * Lobby Voice is out of scope — this gates Conversation Room narration only.
 */

export const STUDIO_VOICE_NARRATION_PREFERENCE_KEY =
  "studio-voice:narration-preference:v1" as const;

/** One-shot Let’s Get Started flag — do not restore leftover Voice On/Off. */
export const STUDIO_VOICE_FIRST_ENTRY_CHOICE_KEY =
  "studio-voice:first-entry-choice:v1" as const;

/** No-JS begin-new mirror so the gate still holds when Lobby JS never attaches. */
export const STUDIO_VOICE_FIRST_ENTRY_COOKIE =
  "studio_voice_first_entry" as const;

export type StudioVoiceNarrationPreference = "on" | "off";

export const studioVoicePreferenceV1 = {
  version: 1 as const,
  copy: {
    howToContinue: "How would you like to continue?",
    useVoiceGuidance: "Use Voice guidance",
    fillItOutMyself: "Fill it out myself",
    voiceOn: "Voice: On",
    voiceOff: "Voice: Off",
    persistentGroupAria: "Studio Voice narration",
  },
} as const;
