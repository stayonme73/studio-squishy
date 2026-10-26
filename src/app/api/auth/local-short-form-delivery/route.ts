import { NextResponse } from "next/server";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { linkClientCampaign, listStudioUsers, toPublicUser } from "@/lib/auth/users";
import {
  createSessionToken,
  isSessionConfigured,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const CAMPAIGN_ID = "route-proof-short-form-1791594132912";
const CUSTOMER_EMAIL = "route-proof-short-form@local.dev";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET() {
  return notFound();
}

/** Local/test session for the existing Short-Form customer. Does not change the password. */
export async function POST() {
  try {
    if (!isLocalAuthFixtureAvailable()) return notFound();
    if (!isSessionConfigured()) {
      return NextResponse.json(
        { error: "Sign-in is temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }
    const users = await listStudioUsers();
    const existing = users.find((user) => user.email === CUSTOMER_EMAIL);
    if (!existing) return notFound();
    const linked = (await linkClientCampaign(existing.id, CAMPAIGN_ID)) ?? toPublicUser(existing);
    const token = await createSessionToken(linked);
    const response = NextResponse.json({ user: linked, fixture: "local-short-form-delivery" });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Sign-in failed. Please try again." }, { status: 500 });
  }
}
