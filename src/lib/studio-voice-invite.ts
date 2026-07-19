/**
 * Studio Voice invite — customer-triggered speech only.
 *
 * Locked rule: Studio Voice is conversational, not ambient narration.
 * Never speak just because a page loaded. Speak only when the customer
 * entered, tapped, answered, asked, or returned.
 */

export const STUDIO_VOICE_INVITE_KEY = "studio-voice:invite:v1" as const;

export type StudioVoiceInviteReason = "start" | "resume";

export function setStudioVoiceInvite(reason: StudioVoiceInviteReason): void {
  try {
    sessionStorage.setItem(STUDIO_VOICE_INVITE_KEY, reason);
  } catch {
    /* private mode — fail silent */
  }
}

/** Read and clear one invite. Null means stay quiet. */
export function consumeStudioVoiceInvite(): StudioVoiceInviteReason | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_VOICE_INVITE_KEY);
    sessionStorage.removeItem(STUDIO_VOICE_INVITE_KEY);
    if (raw === "start" || raw === "resume") return raw;
    return null;
  } catch {
    return null;
  }
}
