import { NextResponse } from "next/server";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { resolveLocalCedarLaneReviewUser } from "@/lib/auth/local-cedar-lane-review-fixture";
import {
  createSessionToken,
  isSessionConfigured,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET() {
  return notFound();
}

export async function POST() {
  try {
    if (!isLocalAuthFixtureAvailable()) return notFound();
    if (!isSessionConfigured()) {
      return NextResponse.json(
        { error: "Sign-in is temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }

    const user = await resolveLocalCedarLaneReviewUser();
    if (!user) return notFound();

    const token = await createSessionToken(user);
    const response = NextResponse.json({
      user,
      fixture: "local-cedar-lane-review",
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { error: "Sign-in failed. Please try again." },
      { status: 500 },
    );
  }
}
