/**
 * Truthful verification-pending copy — branch on trusted project context only.
 * Do not infer a project from account creation alone.
 */

import { peekStudioVoiceBoardHandoffAwaitingSignIn } from "@/lib/studio-voice-board-handoff";
import { readCurrentCampaign } from "@/lib/studio-board-campaign";

/** Intake / Voice handoff or an existing local project campaign. */
export const VERIFY_PENDING_LEAD_WITH_PROJECT =
  "Check your email to verify your account. Your project is safe while verification is pending.";

/** Direct signup with no trusted project/handoff state. */
export const VERIFY_PENDING_LEAD_DIRECT =
  "Check your email to verify your account. Once verified, you can continue into The Studio.";

/**
 * True only when a trusted handoff/passport or local project campaign exists.
 * Signup alone must not return true.
 */
export function hasTrustedProjectContextForVerificationPending(): boolean {
  if (typeof window === "undefined") return false;

  // Voice Intake → auth passport (set on Intake submit before sign-in/sign-up).
  if (peekStudioVoiceBoardHandoffAwaitingSignIn()) return true;

  // Host / Conversation project already present in this browser.
  const campaign = readCurrentCampaign();
  return Boolean(campaign?.campaignId);
}

export function resolveVerificationPendingLead(
  hasTrustedProject: boolean,
): string {
  return hasTrustedProject
    ? VERIFY_PENDING_LEAD_WITH_PROJECT
    : VERIFY_PENDING_LEAD_DIRECT;
}
