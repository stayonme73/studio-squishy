/**
 * Customer sign-out → Lobby Entry Film.
 * Clears auth only — does not touch pre-payment working draft storage.
 */

import { clearLobbyEntryVisitState } from "@/config/studio-lobby-entry-v1";
import { studioClientSessionTimeoutV1 } from "@/config/studio-client-session-timeout-v1";

export type CustomerSignOutOptions = {
  /** Hard navigation — preferred after timeout so soft router state cannot stick. */
  hardNavigate?: boolean;
  /** Optional replace after soft nav (Sign out button). */
  softNavigate?: (path: string) => void;
};

/**
 * POST logout, clear Lobby visit gate, go to Studio Lobby.
 * Working draft localStorage is intentionally left alone.
 */
export async function customerSignOutToLobby(
  options: CustomerSignOutOptions = {},
): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Still leave — cookie clear may have succeeded server-side.
  }
  clearLobbyEntryVisitState();
  const destination = studioClientSessionTimeoutV1.timeoutDestination;
  if (options.hardNavigate || !options.softNavigate) {
    window.location.assign(destination);
    return;
  }
  options.softNavigate(destination);
}
