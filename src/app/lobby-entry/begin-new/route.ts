import { NextResponse } from "next/server";

import { LOBBY_ENTRY_CHOICE_COOKIE } from "@/config/studio-lobby-entry-v1";
import { STUDIO_VOICE_FIRST_ENTRY_COOKIE } from "@/config/studio-voice-preference-v1";
import { browserSafeRedirectUrl } from "@/lib/browser-safe-redirect-url";
import { withStudioPaymentSandboxQuery } from "@/lib/studio-payment/sandbox-query";

/**
 * Progressive-enhancement entry for "New to the Studio".
 * Sets a visit cookie and returns to Lobby unlocked — works when phone
 * React handlers never attach (SSR film / failed hydration).
 * `lobbyEntry=new` is required so a stale cookie alone cannot unlock.
 */
export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const conversationPath = withStudioPaymentSandboxQuery(
    "/studio-conversation-room",
    incoming.search,
  );
  const destination = browserSafeRedirectUrl(request, conversationPath);
  const response = NextResponse.redirect(destination);
  response.cookies.set(LOBBY_ENTRY_CHOICE_COOKIE, "new-to-studio", {
    path: "/",
    maxAge: 60 * 60 * 12,
    sameSite: "lax",
    httpOnly: false,
  });
  response.cookies.set(STUDIO_VOICE_FIRST_ENTRY_COOKIE, "1", {
    path: "/",
    maxAge: 120,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
