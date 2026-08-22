export function newContentCertificationId(evaluatedAt?: string): string {
  const stamp = (evaluatedAt ?? new Date().toISOString()).replace(/[:.]/g, "");
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ccert-${stamp}-${crypto.randomUUID()}`;
  }
  return `ccert-${stamp}-${Math.random().toString(36).slice(2, 10)}`;
}
