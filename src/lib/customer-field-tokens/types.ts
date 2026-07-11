/** Monotonic revision per direct-apply field — avoids clock precision issues. */
export type FieldChangeToken = {
  revision: number;
  valueFingerprint: string;
};

/** V1 direct-apply targets with one exact storage path each. */
export const DIRECT_APPLY_TARGET_KEYS = [
  "primary_approver_name",
  "primary_approver_email",
  "secondary_approver_name",
  "secondary_approver_email",
  "destination_url",
  "social_account_links",
  "email_sender_name",
  "email_platform",
] as const;

export type DirectApplyTargetKey = (typeof DIRECT_APPLY_TARGET_KEYS)[number];

export type CustomerFieldTokenMap = Partial<Record<DirectApplyTargetKey, FieldChangeToken>>;
