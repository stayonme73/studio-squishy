import { NextResponse } from "next/server";

import {
  createSessionToken,
  isSessionConfigured,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  sendSignupVerificationEmail,
  verificationDeliveryFailureMessage,
} from "@/lib/auth/email-verification";
import { createClientAccount } from "@/lib/auth/users";

const ACCOUNT_CREATE_UNAVAILABLE =
  "Account creation is temporarily unavailable. Please try again shortly.";

export async function POST(request: Request) {
  try {
    if (!isSessionConfigured()) {
      return NextResponse.json(
        { error: ACCOUNT_CREATE_UNAVAILABLE },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    if (!body.email?.trim() || !body.password || !body.displayName?.trim()) {
      return NextResponse.json(
        { error: "email, password, and displayName are required" },
        { status: 400 },
      );
    }

    const result = await createClientAccount({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });

    if (!result.ok) {
      const status =
        result.code === "email_taken"
          ? 409
          : result.code === "invalid_email" ||
              result.code === "invalid_password" ||
              result.code === "invalid_display_name"
            ? 400
            : 400;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    const { delivery } = await sendSignupVerificationEmail(result.user);
    const token = await createSessionToken(result.user);
    const response = NextResponse.json({
      user: result.user,
      verification: {
        emailSent: delivery.ok,
        ...(delivery.ok
          ? {}
          : {
              deliveryCode: delivery.code,
              message: verificationDeliveryFailureMessage(delivery.code),
            }),
      },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (caught) {
    const signupFailure =
      caught instanceof Error ? caught.message : "unknown_error";
    console.error("[api/auth/signup]", signupFailure);
    return NextResponse.json(
      { error: ACCOUNT_CREATE_UNAVAILABLE },
      { status: 500 },
    );
  }
}
