import { NextResponse } from "next/server";

import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  sendSignupVerificationEmail,
  verificationDeliveryFailureMessage,
} from "@/lib/auth/email-verification";
import { createClientAccount } from "@/lib/auth/users";

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Account creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
