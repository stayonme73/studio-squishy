const PROJECT_CHANGE_BLOCKLIST: readonly RegExp[] = [
  /\badd\s+service\b/i,
  /\bremove\s+service\b/i,
  /\bmore\s+posts?\b/i,
  /\bextra\s+deliverable/i,
  /\brefund\b/i,
  /\bcheaper\b/i,
  /\bdeadline\b/i,
  /\brush\b/i,
  /\bsooner\b/i,
  /\bdeliverable\b/i,
  /\brevision\s+round/i,
  /\bchange\s+scope\b/i,
  /\bchange\s+price\b/i,
  /\bcancel\b/i,
];

export function assessSuggestedClassification(
  requestedValue: string,
  note?: string,
): "project_change" | null {
  const text = [requestedValue, note].filter(Boolean).join(" ");
  if (!text.trim()) return null;
  return PROJECT_CHANGE_BLOCKLIST.some((pattern) => pattern.test(text)) ? "project_change" : null;
}
