import { NextResponse } from "next/server";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { resolveLocalCustomerOneUser } from "@/lib/auth/local-customer-one-fixture";
import {
  createSessionToken,
  isSessionConfigured,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const ACCOUNT_SESSION_UNAVAILABLE =
  "Sign-in is temporarily unavailable. Please try again shortly.";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET() {
  return notFound();
}

export async function POST() {
  try {
    if (!isLocalAuthFixtureAvailable()) {
      return notFound();
    }
    if (!isSessionConfigured()) {
      return NextResponse.json(
        { error: ACCOUNT_SESSION_UNAVAILABLE },
        { status: 503 },
      );
    }

    const user = await resolveLocalCustomerOneUser();
    if (!user) {
      return notFound();
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({
      user,
      fixture: "local-developer-test",
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
