import { NextResponse } from "next/server";

import { isClientUser } from "@/lib/campaign-store/access";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { updateUserCurrentCampaign } from "@/lib/auth/users";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  if (!isClientUser(user)) {
    return NextResponse.json({ error: "Client session required." }, { status: 403 });
  }

  const updatedUser = await updateUserCurrentCampaign(user.id, undefined);
  if (!updatedUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, currentCampaignId: null });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createSessionToken(updatedUser),
    sessionCookieOptions(),
  );
  return response;
}
