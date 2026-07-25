/**
 * Email Verification orchestration — issue, send, consume.
 * Never logs raw tokens. Does not implement Board claim or route gates.
 */

import {
  consumeRateLimit,
  hashRateLimitSubject,
} from "@/lib/auth/auth-rate-limit";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
  type ConsumeEmailVerificationResult,
} from "@/lib/auth/email-verification-tokens";
import { buildEmailVerificationUrl, resolvePublicAppOrigin } from "@/lib/auth/public-app-url";
import {
  findUserByEmail,
  findUserById,
  markEmailVerified,
} from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import type { SendTransactionalEmailResult } from "@/lib/transactional-email/types";

export type VerificationSendResult = {
  delivery: SendTransactionalEmailResult;
};

const RESEND_GENERIC_MESSAGE =
  "If an account needs verification, we sent a new email. Check your inbox and spam folder.";

function verificationEmailCopy(verifyUrl: string, displayName: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Verify your Studio account";
  const text = [
    `Hi ${displayName},`,
    "",
    "Please verify your Studio account by opening this link:",
    verifyUrl,
    "",
    "This link expires soon and can be used only once.",
    "If you did not create a Studio account, you can ignore this email.",
    "",
    "— The Studio",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(displayName)},</p>`,
    `<p>Please verify your Studio account by opening this link:</p>`,
    `<p><a href="${escapeHtml(verifyUrl)}">Verify my email</a></p>`,
    `<p>This link expires soon and can be used only once.</p>`,
    `<p>If you did not create a Studio account, you can ignore this email.</p>`,
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

async function sendVerificationForUser(
  user: StudioUser,
  kind: "email-verification" | "email-verification-resend",
): Promise<VerificationSendResult> {
  // Refuse to mint a token when the public origin is not allowlisted / configured.
  if (!resolvePublicAppOrigin()) {
    return {
      delivery: {
        ok: false,
        provider: "none",
        code: "not_configured",
      },
    };
  }

  const { rawToken } = await issueEmailVerificationToken(user.id);
  const verifyUrl = buildEmailVerificationUrl(rawToken);
  if (!verifyUrl) {
    return {
      delivery: {
        ok: false,
        provider: "none",
        code: "not_configured",
      },
    };
  }

  const copy = verificationEmailCopy(verifyUrl, user.displayName);
  const delivery = await sendTransactionalEmail({
    kind,
    to: user.email,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
    userId: user.id,
  });
  return { delivery };
}

/** Called after soft account creation. Account stays intact if delivery fails. */
export async function sendSignupVerificationEmail(
  user: StudioUser,
): Promise<VerificationSendResult> {
  if (user.emailVerifiedAt) {
    return {
      delivery: { ok: true, provider: "none", providerMessageId: "already-verified" },
    };
  }
  return sendVerificationForUser(user, "email-verification");
}

export type ResendVerificationResult = {
  /** Always the same customer-facing message — no account enumeration. */
  message: string;
  /** Internal-only delivery outcome for authenticated retry UI. */
  deliveryOk?: boolean;
  rateLimited?: boolean;
};

/**
 * Resend verification without revealing whether the account exists.
 * Rate-limited by normalized email (or user id) and request source.
 */
export async function resendVerificationEmail(options: {
  email?: string | null;
  userId?: string | null;
  requestSource?: string | null;
}): Promise<ResendVerificationResult> {
  const sourceKey = hashRateLimitSubject(
    options.requestSource?.trim() || "unknown-source",
  );
  const sourceAllowed = await consumeRateLimit({
    scope: "verify-resend-source",
    subject: sourceKey,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!sourceAllowed) {
    return { message: RESEND_GENERIC_MESSAGE, rateLimited: true };
  }

  let user: StudioUser | null = null;
  if (options.userId) {
    user = await findUserById(options.userId);
  } else if (options.email?.trim()) {
    user = await findUserByEmail(normalizeEmail(options.email));
  }

  const accountSubject =
    user?.id ??
    (options.email?.trim() ? normalizeEmail(options.email) : sourceKey);
  const accountKey = hashRateLimitSubject(accountSubject);
  const accountAllowed = await consumeRateLimit({
    scope: "verify-resend-account",
    subject: accountKey,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!accountAllowed) {
    return { message: RESEND_GENERIC_MESSAGE, rateLimited: true };
  }

  // Already verified or unknown — same generic message (no enumeration).
  if (!user || user.emailVerifiedAt) {
    return { message: RESEND_GENERIC_MESSAGE, deliveryOk: true };
  }

  const { delivery } = await sendVerificationForUser(
    user,
    "email-verification-resend",
  );
  return {
    message: RESEND_GENERIC_MESSAGE,
    deliveryOk: delivery.ok,
  };
}

export type VerifyEmailFailureCode = Extract<
  ConsumeEmailVerificationResult,
  { ok: false }
>["code"];

export type VerifyEmailResult =
  | { ok: true; user: StudioUser }
  | {
      ok: false;
      code: VerifyEmailFailureCode;
      message: string;
    };

const VERIFY_ERROR_COPY: Record<VerifyEmailFailureCode, string> = {
  missing: "This verification link is incomplete. Request a new email to continue.",
  malformed:
    "This verification link is not valid. Request a new email to continue.",
  expired:
    "This verification link has expired. Request a new email to continue.",
  used: "This verification link was already used. Sign in if your email is verified, or request a new email.",
  superseded:
    "This verification link is no longer active because a newer email was sent. Use the latest email, or request another.",
  unknown:
    "This verification link is not valid. Request a new email to continue.",
};

export async function verifyEmailWithToken(
  rawToken: string | null | undefined,
): Promise<VerifyEmailResult> {
  const consumed = await consumeEmailVerificationToken(rawToken);
  if (!consumed.ok) {
    return {
      ok: false,
      code: consumed.code,
      message: VERIFY_ERROR_COPY[consumed.code],
    };
  }

  const user = await markEmailVerified(consumed.userId);
  if (!user) {
    return {
      ok: false,
      code: "unknown",
      message: VERIFY_ERROR_COPY.unknown,
    };
  }
  return { ok: true, user };
}

/** Safe customer copy when delivery fails at signup. */
export function verificationDeliveryFailureMessage(
  code: SendTransactionalEmailResult extends { ok: false; code: infer C }
    ? C
    : string,
): string {
  if (code === "not_configured") {
    return "We created your account, but could not send the verification email yet. Please try resending in a moment.";
  }
  return "We created your account, but the verification email did not send. Please try resending in a moment.";
}
