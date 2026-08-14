import { NextResponse } from "next/server";

import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import type { CheckoutSessionCreateRequest } from "@/lib/studio-payment/types";

export async function POST(request: Request) {
  let body: Partial<CheckoutSessionCreateRequest>;
  try {
    body = (await request.json()) as Partial<CheckoutSessionCreateRequest>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.campaignId || !body.facts || !body.returnOrigin) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
        message: "campaignId, facts, and returnOrigin are required",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createCheckoutSession({
      campaignId: body.campaignId,
      facts: body.facts,
      returnOrigin: body.returnOrigin,
      customerEmail: body.customerEmail,
      authorization: body.authorization,
      preferSandbox: body.preferSandbox === true,
      purchaseKind: body.purchaseKind,
      ma001PackComposition: body.ma001PackComposition ?? null,
      rmj002KitLock: body.rmj002KitLock ?? null,
      rmj008KitLock: body.rmj008KitLock ?? null,
    });

    if (!result.ok) {
      const status =
        result.error === "clear_required"
          ? 403
          : result.error === "processor_not_configured" ||
              result.error === "processor_credentials_invalid"
            ? 503
            : result.error === "processor_session_failed"
              ? 502
              : result.error === "already_paid"
                ? 409
                : result.error === "ma001_composition_required" ||
                    result.error === "rmj002_kit_lock_required"
                  ? 422
                  : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "processor_session_failed",
        message:
          "Checkout could not start. Your project is still saved — try again shortly.",
      },
      { status: 502 },
    );
  }
}
