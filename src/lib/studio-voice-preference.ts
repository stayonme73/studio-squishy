/**
 * Conversation Room narration preference — session only.
 * @see src/config/studio-voice-preference-v1.ts
 */

import {
  STUDIO_VOICE_FIRST_ENTRY_CHOICE_KEY,
  STUDIO_VOICE_FIRST_ENTRY_COOKIE,
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

export function clearVoiceNarrationPreference(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STUDIO_VOICE_NARRATION_PREFERENCE_KEY);
  } catch {
    /* private mode — fail silent */
  }
}

/**
 * Welcome → Let’s Get Started. Clears leftover Voice On/Off so the first-entry
 * gate is a real choice, not a restored prior-session skip.
 */
export function markVoiceFirstEntryChoiceRequired(): void {
  clearVoiceNarrationPreference();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STUDIO_VOICE_FIRST_ENTRY_CHOICE_KEY, "required");
  } catch {
    /* private mode — fail silent */
  }
}

function readFirstEntryCookie(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const match = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${STUDIO_VOICE_FIRST_ENTRY_COOKIE}=`));
    if (!match) return false;
    const value = decodeURIComponent(
      match.slice(STUDIO_VOICE_FIRST_ENTRY_COOKIE.length + 1),
    );
    return value === "1";
  } catch {
    return false;
  }
}

function expireFirstEntryCookie(): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${STUDIO_VOICE_FIRST_ENTRY_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* private mode — fail silent */
  }
}

/** Peek only — do not consume. React Strict Mode remount must still see the gate. */
export function isVoiceFirstEntryChoiceRequired(): boolean {
  if (typeof window !== "undefined") {
    try {
      if (
        sessionStorage.getItem(STUDIO_VOICE_FIRST_ENTRY_CHOICE_KEY) ===
        "required"
      ) {
        return true;
      }
    } catch {
      /* private mode */
    }
  }
  return readFirstEntryCookie();
}

/** Call only after the customer explicitly chooses Use Voice or Fill it out myself. */
export function clearVoiceFirstEntryChoiceRequired(): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STUDIO_VOICE_FIRST_ENTRY_CHOICE_KEY);
    } catch {
      /* private mode — fail silent */
    }
  }
  expireFirstEntryCookie();
}

/**
 * Hold the first-entry gate until an explicit tap.
 * Let’s Get Started always holds. A leftover Voice On/Off must not skip
 * Before We Begin when the conversation has not actually started.
 */
export function shouldHoldVoiceFirstEntryGate(input: {
  firstEntryRequired: boolean;
  hasConversationProgress: boolean;
}): boolean {
  if (input.firstEntryRequired) return true;
  return !input.hasConversationProgress;
}

/**
 * Let’s Get Started / unanswered opening must not apply a leftover Voice On/Off.
 * Mid-conversation hard refresh may restore the saved preference.
 */
export function resolveBootVoiceNarrationPreference(input: {
  requireFirstEntryChoice: boolean;
}): StudioVoiceNarrationPreference | null {
  if (input.requireFirstEntryChoice) {
    clearVoiceNarrationPreference();
    return null;
  }
  return readVoiceNarrationPreference();
}

/** True only when the customer explicitly chose Voice guidance (or turned Voice on). */
export function isVoiceNarrationEnabled(): boolean {
  return readVoiceNarrationPreference() === "on";
}
