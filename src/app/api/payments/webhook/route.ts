import { NextResponse } from "next/server";

import { handleStripeWebhook } from "@/lib/studio-payment/webhook";

/** Stripe requires the raw body for signature verification. */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = Buffer.from(await request.arrayBuffer());
  const result = await handleStripeWebhook(rawBody, signature);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    ignored: result.ignored === true,
    alreadyPaid: result.result?.ok === true ? result.result.alreadyPaid : undefined,
  });
}
