import type { FieldChangeToken } from "./types";

/** Normalize official field values for fingerprint comparison. */
export function normalizeOfficialValue(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase() === "not provided yet") return "";
  return trimmed;
}

export function valueFingerprint(value: string | null | undefined): string {
  return normalizeOfficialValue(value);
}

export function fieldChangeTokenString(token: FieldChangeToken): string {
  return `${token.revision}:${token.valueFingerprint}`;
}
