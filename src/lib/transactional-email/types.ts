/**
 * Transactional email adapter — verify, password-reset, project-claim recovery.
 * Auth packages must call this layer, never the Resend SDK directly.
 */

export type TransactionalEmailKind =
  | "email-verification"
  | "email-verification-resend"
  | "password-reset"
  | "project-claim-recovery";

export type SendTransactionalEmailInput = {
  kind: TransactionalEmailKind;
  to: string;
  subject: string;
  /** Plain-text body (tokens already interpolated — do not log this). */
  text: string;
  html?: string;
  /** Correlation id for safe delivery metadata (user id), not the token. */
  userId?: string;
};

export type SendTransactionalEmailSuccess = {
  ok: true;
  provider: "resend" | "postmark" | "none";
  providerMessageId?: string;
};

export type SendTransactionalEmailFailure = {
  ok: false;
  provider: "resend" | "postmark" | "none";
  /** Stable internal code — never show raw provider messages to customers. */
  code: "not_configured" | "delivery_failed" | "provider_error";
};

export type SendTransactionalEmailResult =
  | SendTransactionalEmailSuccess
  | SendTransactionalEmailFailure;

export type TransactionalEmailAdapter = {
  readonly providerId: "resend" | "postmark" | "none";
  send(input: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult>;
};
