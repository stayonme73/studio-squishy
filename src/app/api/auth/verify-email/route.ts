import { NextResponse } from "next/server";

import { verifyEmailWithToken } from "@/lib/auth/email-verification";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

/**
 * Consume a one-time verification token.
 * Accepts GET ?token= (email link) or POST { token }.
 * Remints a session for the verified account (soft session; Board claim is later).
 */
async function handleVerify(rawToken: string | null) {
  const result = await verifyEmailWithToken(rawToken);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.message },
      { status: 400 },
    );
  }

  const token = await createSessionToken(result.user);
  const response = NextResponse.json({
    ok: true,
    user: result.user,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleVerify(url.searchParams.get("token"));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    return handleVerify(body.token ?? null);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "malformed",
        error:
          "This verification link is not valid. Request a new email to continue.",
      },
      { status: 400 },
    );
  }
}
