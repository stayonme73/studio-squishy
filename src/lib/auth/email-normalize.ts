/**
 * Email normalization for Studio account lookup and storage.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  // Practical check — not a full RFC validator.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
