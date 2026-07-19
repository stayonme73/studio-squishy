import { NextResponse } from "next/server";

import { LOBBY_ENTRY_CHOICE_COOKIE } from "@/config/studio-lobby-entry-v1";

/**
 * Progressive-enhancement entry for "New to the Studio".
 * Sets a visit cookie and returns to Lobby unlocked — works when phone
 * React handlers never attach (SSR film / failed hydration).
 */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(LOBBY_ENTRY_CHOICE_COOKIE, "new-to-studio", {
    path: "/",
    maxAge: 60 * 60 * 12,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
