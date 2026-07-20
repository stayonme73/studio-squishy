import { NextResponse } from "next/server";

import { confirmPasswordReset } from "@/lib/auth/password-recovery";
import {
  clearSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

/**
 * Consume a one-time reset token and set a new password.
 * Clears this browser’s session cookie. Does not auto-login.
 * Older sessions on other devices die via passwordChangedAtMs stamp.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
      confirmPassword?: string;
    };

    if (!body.password || !body.confirmPassword) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_password",
          error: "Enter and confirm your new password.",
        },
        { status: 400 },
      );
    }

    const result = await confirmPasswordReset({
      token: body.token,
      password: body.password,
      confirmPassword: body.confirmPassword,
    });

    if (!result.ok) {
      const status =
        result.code === "invalid_password" || result.code === "mismatch"
          ? 400
          : 400;
      return NextResponse.json(
        { ok: false, code: result.code, error: result.message },
        { status },
      );
    }

    const response = NextResponse.json({
      ok: true,
      // Do not auto-login — customer must sign in with the new password.
      signedIn: false,
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      clearSessionCookieOptions(),
    );
    return response;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "malformed",
        error:
          "This password reset link is not valid. Request a new email to continue.",
      },
      { status: 400 },
    );
  }
}
