/**
 * Convenience-only browser stash for project claim receipts.
 * Server hashed receipts remain authoritative — this is not correctness.
 */

const STORAGE_KEY = "studio-squishy:project-claim-receipt";

export type StoredProjectClaimReceipt = {
  campaignId: string;
  claimToken: string;
  checkoutSessionId: string;
  savedAt: string;
};

export function readStoredProjectClaimReceipt(): StoredProjectClaimReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProjectClaimReceipt;
    if (
      !parsed?.campaignId ||
      !parsed?.claimToken ||
      !parsed?.checkoutSessionId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredProjectClaimReceipt(
  receipt: StoredProjectClaimReceipt,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
  } catch {
    // Convenience only — ignore quota / private mode.
  }
}

export function clearStoredProjectClaimReceipt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
