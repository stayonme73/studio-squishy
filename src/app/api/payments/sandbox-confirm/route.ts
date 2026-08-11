import { NextResponse } from "next/server";

import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";

export async function POST(request: Request) {
  let body: { checkoutSessionId?: string };
  try {
    body = (await request.json()) as { checkoutSessionId?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.checkoutSessionId) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
        message: "checkoutSessionId is required",
      },
      { status: 400 },
    );
  }

  const result = await confirmSandboxCheckoutSession(body.checkoutSessionId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json({
    ok: true,
    alreadyPaid: result.alreadyPaid,
    campaign: result.campaign,
  });
}
