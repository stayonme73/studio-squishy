/**
 * Narrow security gates for social-profile credentials.
 * Not a full security redesign.
 */

const PASSWORD_LIKE =
  /^(password|passwd|pwd|login_password)\s*[:=]/i;

export function assertNoRawPasswordStored(
  credentialHandle: string,
  errors: string[],
): void {
  if (PASSWORD_LIKE.test(credentialHandle)) {
    errors.push("raw password storage forbidden — use OAuth credential handles only");
  }
  // Opaque handles should not look like pasted Facebook passwords in cleartext forms.
  if (/^pass:/i.test(credentialHandle)) {
    errors.push("credentialHandle must not encode raw passwords");
  }
}

export function redactSecretsForLog(message: string): string {
  return message
    .replace(/access_token=[^&\s]+/gi, "access_token=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/EAA[A-Za-z0-9]+/g, "[redacted-meta-token]")
    .replace(/act\.[A-Za-z0-9]+/g, "[redacted-tiktok-token]");
}

export function assertAccountIdSeparatedFromCredential(
  platformAccountId: string,
  credentialHandle: string,
): boolean {
  return (
    platformAccountId.trim().length > 0 &&
    credentialHandle.trim().length > 0 &&
    platformAccountId !== credentialHandle
  );
}

export const SOCIAL_SECURITY_RULES = [
  "OAuth/token secrets server-side only",
  "No raw platform passwords in Campaign Record",
  "Tokens excluded from logs",
  "Tokens excluded from Git",
  "Least privilege scopes where possible",
  "Customer authorization revocable",
  "Account IDs separated from credentials",
  "No cross-customer credential reuse",
] as const;
