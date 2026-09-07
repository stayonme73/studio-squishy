/**
 * Truthful Intake → Account choice → Board handoff.
 * Session decides Account handoff vs Board; passport, Voice, CTA, and navigation stay aligned.
 * Signed-out does not assume new vs returning — Create Account and Sign In are both offered.
 */

import {
  markStudioVoiceBoardHandoffAwaitingSignIn,
  markStudioVoiceBoardHandoffAwaitingWelcome,
} from "@/lib/studio-voice-board-handoff";
import { studioBoard } from "@/config/studio-board";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";

export type IntakeHandoffAuthState = "signed-in" | "signed-out";

export type IntakeHandoffPlan = {
  auth: IntakeHandoffAuthState;
  /** Absolute path for navigation (hard assign). */
  destination: string;
  /** Internal passport — awaiting-signin means auth before Board (choice, not Sign-In-only). */
  passport: "awaiting-signin" | "awaiting-board-welcome";
  voiceLine: string;
  submitCtaLabel: string;
  nextStepBlurb: string;
  tabletNextReady: string;
  tabletNextReadyMaterialsLater: string;
};

/** Signed-out Intake land — dual-path account choice, not Sign In alone. */
export const ACCOUNT_HANDOFF_FROM_BOARD = `/account-handoff?from=${encodeURIComponent(
  studioBoard.routes.studioBoard,
)}`;

export function resolveIntakeHandoffPlan(
  signedIn: boolean,
): IntakeHandoffPlan {
  const v = conversationRoomGuideV1;
  if (signedIn) {
    return {
      auth: "signed-in",
      destination: studioBoard.routes.studioBoard,
      passport: "awaiting-board-welcome",
      voiceLine: v.intakeSubmitSuccessVoiceSignedIn,
      submitCtaLabel: v.intakeSubmitCtaSignedIn,
      nextStepBlurb: v.intakeNextStepBlurbSignedIn,
      tabletNextReady: v.intakeTabletNextReadySignedIn,
      tabletNextReadyMaterialsLater: v.intakeTabletNextReadyMaterialsLaterSignedIn,
    };
  }
  return {
    auth: "signed-out",
    destination: ACCOUNT_HANDOFF_FROM_BOARD,
    passport: "awaiting-signin",
    voiceLine: v.intakeSubmitSuccessVoiceSignedOut,
    submitCtaLabel: v.intakeSubmitCtaSignedOut,
    nextStepBlurb: v.intakeNextStepBlurbSignedOut,
    tabletNextReady: v.intakeTabletNextReadySignedOut,
    tabletNextReadyMaterialsLater: v.intakeTabletNextReadyMaterialsLaterSignedOut,
  };
}

/** Apply passport for the chosen auth branch — never leave signed-in stuck on awaiting-signin. */
export function applyIntakeHandoffPassport(signedIn: boolean): void {
  if (signedIn) {
    markStudioVoiceBoardHandoffAwaitingWelcome();
    return;
  }
  markStudioVoiceBoardHandoffAwaitingSignIn();
}

/**
 * Probe customer session. Fail-closed to signed-out so we never skip Sign In by accident.
 * Timeboxed so a hung session call cannot strand Intake on Samsung.
 */
export const INTAKE_HANDOFF_SESSION_PROBE_TIMEOUT_MS = 2500;

export async function probeCustomerSessionSignedIn(
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    INTAKE_HANDOFF_SESSION_PROBE_TIMEOUT_MS,
  );
  try {
    const response = await fetchImpl("/api/auth/session", {
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const body = (await response.json().catch(() => ({}))) as {
      user?: { id?: string } | null;
    };
    return Boolean(body.user?.id);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function navigateIntakeHandoff(destination: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(destination, window.location.origin).href;
  /* Origin-absolute href forces a full document load. Same-origin relative
   * navigation can be intercepted as a Next client transition and leave
   * Conversation Room painted until a manual refresh. */
  window.location.href = url;
}

/**
 * Full post-submit handoff: re-probe session, stamp passport, return plan for Voice + nav.
 */
export async function completeIntakeHandoff(options?: {
  fetchImpl?: typeof fetch;
}): Promise<IntakeHandoffPlan> {
  const signedIn = await probeCustomerSessionSignedIn(options?.fetchImpl);
  const plan = resolveIntakeHandoffPlan(signedIn);
  applyIntakeHandoffPassport(signedIn);
  return plan;
}
