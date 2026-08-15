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
