/**
 * Conversation Room narration preference — session only.
 * @see src/config/studio-voice-preference-v1.ts
 */

import {
  STUDIO_VOICE_NARRATION_PREFERENCE_KEY,
  type StudioVoiceNarrationPreference,
} from "@/config/studio-voice-preference-v1";

/** `null` = unset — show the first-entry choice; do not narrate yet. */
export function readVoiceNarrationPreference(): StudioVoiceNarrationPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STUDIO_VOICE_NARRATION_PREFERENCE_KEY);
    if (raw === "on" || raw === "off") return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeVoiceNarrationPreference(
  value: StudioVoiceNarrationPreference,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STUDIO_VOICE_NARRATION_PREFERENCE_KEY, value);
  } catch {
    /* private mode — fail silent */
  }
}

/** True only when the customer explicitly chose Voice guidance (or turned Voice on). */
export function isVoiceNarrationEnabled(): boolean {
  return readVoiceNarrationPreference() === "on";
}
