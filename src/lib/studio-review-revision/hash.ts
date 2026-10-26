export function normalizeContentSha256(value: string): string {
  const hex = value.trim().replace(/^sha256:/i, "").toLowerCase();
  return hex ? `sha256:${hex}` : "";
}

export function contentSha256Hex(value: string): string {
  return value.trim().replace(/^sha256:/i, "").toLowerCase();
}

export function sameContentSha256(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return contentSha256Hex(a) === contentSha256Hex(b);
}

/** Pin hashes may be raw hex while CDF rows store `sha256:` — treat them as the same identity. */
export function approvalIncludesContentSha256(
  approvalHashes: readonly string[],
  hash: string | undefined,
): boolean {
  if (!hash?.trim()) return false;
  return approvalHashes.some((entry) => sameContentSha256(entry, hash));
}

export function sameContentSha256Set(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = [...new Set(left.map((value) => contentSha256Hex(value)).filter(Boolean))].sort();
  const b = [...new Set(right.map((value) => contentSha256Hex(value)).filter(Boolean))].sort();
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}
