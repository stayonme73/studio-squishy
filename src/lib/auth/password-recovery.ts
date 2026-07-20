/**
 * Password Recovery orchestration — request reset email + confirm new password.
 * Never logs raw tokens or passwords. Does not auto-login after reset.
 */

import {
  consumeRateLimit,
  hashRateLimitSubject,
} from "@/lib/auth/auth-rate-limit";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
  type ConsumePasswordResetResult,
} from "@/lib/auth/password-reset-tokens";
import {
  buildPasswordResetUrl,
  resolvePublicAppOrigin,
} from "@/lib/auth/public-app-url";
import {
  findUserByEmail,
  updatePasswordAfterReset,
} from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import { sendTransactionalEmail } from "@/lib/transactional-email";

/** Always the same customer-facing message — no account enumeration. */
export const PASSWORD_RESET_REQUEST_GENERIC_MESSAGE =
  "If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.";

function resetEmailCopy(resetUrl: string, displayName: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Reset your Studio password";
  const text = [
    `Hi ${displayName},`,
    "",
    "Use this link to choose a new Studio password:",
    resetUrl,
    "",
    "This link expires in about 60 minutes and can be used only once.",
    "If you did not ask to reset your password, you can ignore this email.",
    "",
    "— The Studio",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(displayName)},</p>`,
    `<p>Use this link to choose a new Studio password:</p>`,
    `<p><a href="${escapeHtml(resetUrl)}">Reset my password</a></p>`,
    `<p>This link expires in about 60 minutes and can be used only once.</p>`,
    `<p>If you did not ask to reset your password, you can ignore this email.</p>`,
    `<p>— The Studio</p>`,
  ].join("");
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendResetEmailForUser(user: StudioUser): Promise<void> {
  if (!resolvePublicAppOrigin()) {
    return;
  }

  const { rawToken } = await issuePasswordResetToken(user.id);
  const resetUrl = buildPasswordResetUrl(rawToken);
  if (!resetUrl) {
    return;
  }

  const copy = resetEmailCopy(resetUrl, user.displayName);
  await sendTransactionalEmail({
    kind: "password-reset",
    to: user.email,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
    userId: user.id,
  });
}

export type RequestPasswordResetResult = {
  message: string;
  rateLimited?: boolean;
};

/**
 * Request a reset email without revealing whether the account exists.
 * Rate-limited by normalized email and request source.
 */
export async function requestPasswordReset(options: {
  email?: string | null;
  requestSource?: string | null;
}): Promise<RequestPasswordResetResult> {
  const sourceKey = hashRateLimitSubject(
    options.requestSource?.trim() || "unknown-source",
  );
  const sourceAllowed = await consumeRateLimit({
    scope: "password-reset-source",
    subject: sourceKey,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!sourceAllowed) {
    return { message: PASSWORD_RESET_REQUEST_GENERIC_MESSAGE, rateLimited: true };
  }

  const email = options.email?.trim()
    ? normalizeEmail(options.email)
    : "";
  const accountKey = hashRateLimitSubject(email || sourceKey);
  const accountAllowed = await consumeRateLimit({
    scope: "password-reset-account",
    subject: accountKey,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!accountAllowed) {
    return { message: PASSWORD_RESET_REQUEST_GENERIC_MESSAGE, rateLimited: true };
  }

  if (email) {
    const user = await findUserByEmail(email);
    if (user) {
      await sendResetEmailForUser(user);
    }
  }

  return { message: PASSWORD_RESET_REQUEST_GENERIC_MESSAGE };
}

export type ConfirmPasswordResetResult =
  | { ok: true; user: StudioUser; passwordChangedAtMs: number }
  | {
      ok: false;
      code:
        | ConsumePasswordResetResult extends { ok: false; code: infer C }
          ? C
          : never
        | "invalid_password"
        | "mismatch";
      message: string;
    };

const RESET_ERROR_COPY: Record<
  Exclude<
    ConsumePasswordResetResult extends { ok: false; code: infer C } ? C : never,
    never
  >,
  string
> = {
  missing:
    "This password reset link is incomplete. Request a new email to continue.",
  malformed:
    "This password reset link is not valid. Request a new email to continue.",
  expired:
    "This password reset link has expired. Request a new email to continue.",
  used: "This password reset link was already used. Sign in with your new password, or request a new email.",
  superseded:
    "This password reset link is no longer active because a newer email was sent. Use the latest email, or request another.",
  unknown:
    "This password reset link is not valid. Request a new email to continue.",
};

export async function confirmPasswordReset(options: {
  token: string | null | undefined;
  password: string;
  confirmPassword: string;
}): Promise<ConfirmPasswordResetResult> {
  if (options.password !== options.confirmPassword) {
    return {
      ok: false,
      code: "mismatch",
      message: "Passwords must match.",
    };
  }

  const consumed = await consumePasswordResetToken(options.token);
  if (!consumed.ok) {
    return {
      ok: false,
      code: consumed.code,
      message: RESET_ERROR_COPY[consumed.code],
    };
  }

  const updated = await updatePasswordAfterReset(
    consumed.userId,
    options.password,
  );
  if (!updated.ok) {
    return {
      ok: false,
      code: updated.code === "invalid_password" ? "invalid_password" : "unknown",
      message: updated.message,
    };
  }

  return {
    ok: true,
    user: updated.user,
    passwordChangedAtMs: updated.passwordChangedAtMs,
  };
}
