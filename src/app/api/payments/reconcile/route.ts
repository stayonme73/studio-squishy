import { NextResponse } from "next/server";

import { reconcileCheckoutSession } from "@/lib/studio-payment/reconcile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "session_id is required" },
      { status: 400 },
    );
  }

  const result = await reconcileCheckoutSession(sessionId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  const response = NextResponse.json(result);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
