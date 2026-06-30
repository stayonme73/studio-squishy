import { containsSecretLikeContent } from "./payload-validation";

/** Phrases that must not appear in client-visible promotion wording. */
const INTERNAL_ONLY_PATTERNS: readonly RegExp[] = [
  /\binternal team\b/i,
  /\bbefore client send\b/i,
  /\bqa\b/i,
  /\bexception\b/i,
  /\bdo not send to client\b/i,
  /\bresolve internally\b/i,
  /\bstaff\b/i,
  /\bproducer\b/i,
  /\bdispatcher\b/i,
];

export const BLOCKLISTED_WHY_NEEDED: readonly string[] = [
  "Needed for your approved Studio Plan services",
];

export function containsInternalOnlyPhrasing(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return INTERNAL_ONLY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isBlocklistedWhyNeeded(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return BLOCKLISTED_WHY_NEEDED.some(
    (blocked) => blocked.localeCompare(normalized, undefined, { sensitivity: "accent" }) === 0,
  );
}

export function validateClientFacingPromotionField(
  value: string | undefined,
  fieldName: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { ok: false, error: `${fieldName} is required.` };
  }
  if (containsSecretLikeContent(trimmed)) {
    return {
      ok: false,
      error: `${fieldName} cannot include passwords, credentials, or secrets.`,
    };
  }
  if (containsInternalOnlyPhrasing(trimmed)) {
    return {
      ok: false,
      error: `${fieldName} cannot include internal-only language.`,
    };
  }
  if (fieldName === "whyNeeded" && isBlocklistedWhyNeeded(trimmed)) {
    return {
      ok: false,
      error: "Why we need this must be specific to the request — not a generic plan placeholder.",
    };
  }
  return { ok: true, value: trimmed };
}
