/**
 * Studio Board first-minute greeting — session display name only.
 * Never fall back to config userName / "Tagia".
 *
 * Initial SSR + first client paint use the neutral greeting so markup is stable.
 * After mount, session resolution upgrades to a named time-of-day greeting.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { isLocalCustomerOnePaidFlyerCampaign } from "@/lib/auth/local-customer-one-campaign";

export const BOARD_NEUTRAL_GREETING = "Welcome to your Studio Board.";

/** Trimmed non-empty display name, or null. */
export function resolveBoardCustomerDisplayName(
  displayName: string | null | undefined,
): string | null {
  if (typeof displayName !== "string") return null;
  const trimmed = displayName.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type BoardHeaderGreeting =
  | { kind: "neutral"; text: string; busy: boolean }
  | { kind: "named"; period: "morning" | "afternoon" | "evening"; name: string; busy: false };

/**
 * Always returns visible greeting text — never an empty loading shell.
 * - Session not resolved yet → neutral (optionally busy)
 * - Session resolved, blank/missing name → neutral
 * - Session resolved, valid name + period → named time-aware greeting
 * - Session resolved, valid name, period not ready yet → neutral (brief)
 */
export function resolveBoardHeaderGreeting(input: {
  displayName: string | null | undefined;
  greetingPeriod: "morning" | "afternoon" | "evening" | null;
  sessionResolved: boolean;
}): BoardHeaderGreeting {
  if (!input.sessionResolved) {
    return { kind: "neutral", text: BOARD_NEUTRAL_GREETING, busy: true };
  }

  const name = resolveBoardCustomerDisplayName(input.displayName);
  if (!name) {
    return { kind: "neutral", text: BOARD_NEUTRAL_GREETING, busy: false };
  }

  if (!input.greetingPeriod) {
    return { kind: "neutral", text: BOARD_NEUTRAL_GREETING, busy: true };
  }

  return {
    kind: "named",
    period: input.greetingPeriod,
    name,
    busy: false,
  };
}

/**
 * Greeting follows the Board-bound campaign. A leftover Maya session name
 * must not greet a fresh non-Maya current project.
 */
export function resolveBoardBoundCustomerDisplayName(input: {
  sessionDisplayName: string | null | undefined;
  campaign: CampaignRecord | null | undefined;
}): string | null {
  const sessionName = resolveBoardCustomerDisplayName(input.sessionDisplayName);
  const campaign = input.campaign ?? null;
  if (!campaign) return sessionName;

  const boundToMaya =
    campaign.campaignId === MAYA_PROTECTED_CAMPAIGN_ID ||
    isLocalCustomerOnePaidFlyerCampaign(campaign);
  if (!boundToMaya && sessionName && /^maya$/i.test(sessionName)) {
    return null;
  }
  return sessionName;
}

/** First line of Studio Note letter — never uses a hardcoded customer name. */
export function resolveStudioNoteGreetingLine(
  displayName: string | null | undefined,
  greetingPrefix = "Hi",
): string {
  const name = resolveBoardCustomerDisplayName(displayName);
  if (!name) return "Hello,";
  return `${greetingPrefix} ${name},`;
}
