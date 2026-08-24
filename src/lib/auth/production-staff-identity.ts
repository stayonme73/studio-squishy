/**
 * Production Owner/staff identity for private-host certification.
 *
 * Staff records come from the immutable bundled seed in memory.
 * This is not durable customer authentication. Customer signup and
 * mutable JSON user storage stay fail-closed in production.
 */

import { isPasswordHash } from "@/lib/auth/password-hash";

export {
  OWNER_CERT_STAFF_EMAIL,
  OWNER_CERT_STAFF_ID,
  PRODUCTION_CUSTOMER_IDENTITY_LIMIT,
  bundledStaffRecords,
  findBundledStaffByEmail,
  findBundledStaffById,
  seedHasPlaintextPasswordFields,
  toPublicStaffUser,
} from "@/lib/auth/bundled-staff-identity";

import {
  OWNER_CERT_STAFF_ID,
  findBundledStaffById,
} from "@/lib/auth/bundled-staff-identity";

/** Plaintext that appeared in Git history. Publicly known. Never accept. */
const KNOWN_PUBLIC_SEED_PASSWORDS = ["dev-only"] as const;

let vitestProductionIdentity = false;

/** Vitest-only. Each test file has an isolated module instance. */
export function setVitestProductionIdentity(enabled: boolean): void {
  if (process.env.VITEST !== "true") {
    throw new Error("This test hook is not available outside Vitest.");
  }
  vitestProductionIdentity = enabled;
}

export function isProductionRuntime(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.VITEST === "true") {
    return vitestProductionIdentity;
  }
  return env.NODE_ENV === "production";
}

export function isKnownPublicSeedPassword(password: string): boolean {
  return (KNOWN_PUBLIC_SEED_PASSWORDS as readonly string[]).includes(password);
}

export function ownerCertStaffRecord() {
  const record = findBundledStaffById(OWNER_CERT_STAFF_ID);
  if (!record) return null;
  if (!record.passwordHash || !isPasswordHash(record.passwordHash)) return null;
  return record;
}
