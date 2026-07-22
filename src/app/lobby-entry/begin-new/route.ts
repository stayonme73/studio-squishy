import { NextResponse } from "next/server";

import { LOBBY_ENTRY_CHOICE_COOKIE } from "@/config/studio-lobby-entry-v1";
import { browserSafeRedirectUrl } from "@/lib/browser-safe-redirect-url";

/**
 * Progressive-enhancement entry for "New to the Studio".
 * Sets a visit cookie and returns to Lobby unlocked — works when phone
 * React handlers never attach (SSR film / failed hydration).
 * `lobbyEntry=new` is required so a stale cookie alone cannot unlock.
 */
export async function GET(request: Request) {
  const destination = browserSafeRedirectUrl(request, "/studio-conversation-room");
  const response = NextResponse.redirect(destination);
  response.cookies.set(LOBBY_ENTRY_CHOICE_COOKIE, "new-to-studio", {
    path: "/",
    maxAge: 60 * 60 * 12,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
