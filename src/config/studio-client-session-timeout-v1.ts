/**
 * Client Session Timeout Standard — inactivity sign-out for authenticated customers.
 *
 * Cookie max age remains seven days (`session-lifetime.ts`). Inactivity ends the
 * session much sooner so a shared computer does not leave Board unlocked.
 *
 * @see docs/auth-implementation-evidence-ledger.md (Package 4)
 */

/** Default: sign out after 30 minutes with no activity. */
export const CLIENT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** Default: warn when 5 minutes remain (at 25 minutes idle). */
export const CLIENT_INACTIVITY_WARNING_LEAD_MS = 5 * 60 * 1000;

export const studioClientSessionTimeoutV1 = {
  storageKey: "studioClientLastActivityAt",
  channelName: "studio-client-session",
  staySignedInLabel: "Stay signed in",
  signOutNowLabel: "Sign out now",
  warningTitle: "Still there?",
  /** Lobby destination after inactivity timeout or Sign out now. */
  timeoutDestination: "/studio-lobby",
} as const;

function parsePositiveMs(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/**
 * Inactivity timeout. Override with NEXT_PUBLIC_AUTH_INACTIVITY_TIMEOUT_MS
 * for short certification runs (e.g. 120000 = 2 minutes).
 */
export function resolveClientInactivityTimeoutMs(): number {
  return parsePositiveMs(
    process.env.NEXT_PUBLIC_AUTH_INACTIVITY_TIMEOUT_MS,
    CLIENT_INACTIVITY_TIMEOUT_MS,
  );
}

/**
 * How long before timeout the warning appears.
 * Override with NEXT_PUBLIC_AUTH_INACTIVITY_WARNING_LEAD_MS (e.g. 30000).
 */
export function resolveClientInactivityWarningLeadMs(): number {
  const timeout = resolveClientInactivityTimeoutMs();
  const lead = parsePositiveMs(
    process.env.NEXT_PUBLIC_AUTH_INACTIVITY_WARNING_LEAD_MS,
    CLIENT_INACTIVITY_WARNING_LEAD_MS,
  );
  // Warning must fire before timeout; keep at least 1s of lead when possible.
  return Math.min(lead, Math.max(1000, timeout - 1000));
}

/** Customer-facing warning body from the configured lead time. */
export function inactivityWarningCopy(warningLeadMs: number): string {
  if (warningLeadMs >= 60_000) {
    const minutes = Math.round(warningLeadMs / 60_000);
    return `For your security, you'll be signed out in ${minutes} minute${
      minutes === 1 ? "" : "s"
    }.`;
  }
  const seconds = Math.max(1, Math.round(warningLeadMs / 1000));
  return `For your security, you'll be signed out in ${seconds} second${
    seconds === 1 ? "" : "s"
  }.`;
}
