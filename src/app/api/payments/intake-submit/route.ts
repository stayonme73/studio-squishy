import { NextResponse } from "next/server";

import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { submitPaidIntakeByCheckoutSession } from "@/lib/studio-payment/intake-submit";

export async function POST(request: Request) {
  let body: {
    checkoutSessionId?: string;
    answers?: RouteMapIntakeAnswers;
    submittedAt?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.checkoutSessionId || !body.answers || typeof body.answers !== "object") {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
        message: "checkoutSessionId and answers are required.",
      },
      { status: 400 },
    );
  }

  const result = await submitPaidIntakeByCheckoutSession({
    checkoutSessionId: body.checkoutSessionId,
    answers: body.answers,
    submittedAt: body.submittedAt,
  });
  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "payment_not_confirmed"
          ? 409
          : result.error === "invalid_evidence"
            ? 403
            : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({
    ok: true,
    alreadySubmitted: result.alreadySubmitted,
    campaign: result.campaign,
  });
}
