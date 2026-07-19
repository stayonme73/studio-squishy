import { NextResponse } from "next/server";

import { resendVerificationEmail } from "@/lib/auth/email-verification";
import { readSessionFromRequest } from "@/lib/auth/session";

function requestSource(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Resend verification email.
 * Response message is always generic — no account enumeration.
 */
export async function POST(request: Request) {
  try {
    const session = await readSessionFromRequest(request);
    let email: string | undefined;
    try {
      const body = (await request.json()) as { email?: string };
      email = body.email;
    } catch {
      email = undefined;
    }

    const result = await resendVerificationEmail({
      userId: session?.id ?? null,
      email: session ? null : email,
      requestSource: requestSource(request),
    });

    return NextResponse.json({
      ok: true,
      message: result.message,
      ...(session && result.deliveryOk === false
        ? {
            deliveryFailed: true,
            retryHint:
              "We could not send the email just now. Please try again in a moment.",
          }
        : {}),
      ...(result.rateLimited && session
        ? {
            rateLimited: true,
            retryHint:
              "Please wait a bit before requesting another verification email.",
          }
        : {}),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      message:
        "If an account needs verification, we sent a new email. Check your inbox and spam folder.",
    });
  }
}
