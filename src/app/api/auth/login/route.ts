import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  hashRateLimitSubject,
} from "@/lib/auth/auth-rate-limit";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { verifyLogin } from "@/lib/auth/users";

function requestSource(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

const SAFE_LOGIN_FAILURE = "Invalid credentials";
const SAFE_RATE_LIMIT =
  "Too many sign-in attempts. Please wait a bit and try again.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email?.trim() || !body.password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    const emailKey = hashRateLimitSubject(normalizeEmail(body.email));
    const sourceKey = hashRateLimitSubject(requestSource(request));

    const emailAllowed = await consumeRateLimit({
      scope: "login-email",
      subject: emailKey,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    const sourceAllowed = await consumeRateLimit({
      scope: "login-source",
      subject: sourceKey,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailAllowed || !sourceAllowed) {
      return NextResponse.json({ error: SAFE_RATE_LIMIT }, { status: 429 });
    }

    const user = await verifyLogin(body.email, body.password);
    if (!user) {
      return NextResponse.json({ error: SAFE_LOGIN_FAILURE }, { status: 401 });
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { error: "Sign-in failed. Please try again." },
      { status: 500 },
    );
  }
}
