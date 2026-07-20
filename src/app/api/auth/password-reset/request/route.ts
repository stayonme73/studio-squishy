import { NextResponse } from "next/server";

import { requestPasswordReset } from "@/lib/auth/password-recovery";

function requestSource(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Request a password-reset email.
 * Always returns the same generic message (no email enumeration).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const result = await requestPasswordReset({
      email: body.email,
      requestSource: requestSource(request),
    });
    return NextResponse.json({
      ok: true,
      message: result.message,
      ...(result.rateLimited ? { rateLimited: true } : {}),
    });
  } catch {
    return NextResponse.json(
      {
        ok: true,
        message:
          "If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.",
      },
      { status: 200 },
    );
  }
}
