/**
 * Production Owner/staff identity for private-host certification.
 *
 * Staff records come from the immutable bundled seed in memory.
 * This is not durable customer authentication. Customer signup and
 * mutable JSON user storage stay fail-closed in production.
 */

import type {
  StudioUserAccountClass,
  StudioUserRecord,
} from "@/lib/campaign-store/types";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import { isPasswordHash } from "@/lib/auth/password-hash";

import seedUsers from "./studio-users.seed.json";

/** Plaintext that appeared in Git history. Publicly known. Never accept. */
const KNOWN_PUBLIC_SEED_PASSWORDS = ["dev-only"] as const;

export const PRODUCTION_CUSTOMER_IDENTITY_LIMIT =
  "Durable customer identity is outside this Owner-auth certification path. Production does not store customer accounts on the local JSON user file.";

export const OWNER_CERT_STAFF_ID = "tagia";
export const OWNER_CERT_STAFF_EMAIL = "tagia@local.dev";

type SeedUserJson = StudioUserRecord & {
  accountClass?: StudioUserAccountClass;
};

function seedAccountClass(user: SeedUserJson): StudioUserAccountClass {
  if (user.accountClass) return user.accountClass;
  if (user.roles.includes("owner") || user.roles.includes("staff")) {
    return "staff";
  }
  return "test";
}

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

export function bundledStaffRecords(): StudioUserRecord[] {
  return (seedUsers as SeedUserJson[])
    .filter((user) => seedAccountClass(user) === "staff")
    .map((user) => {
      const { password: _removed, ...rest } = user;
      return {
        ...rest,
        accountClass: seedAccountClass(user),
      };
    });
}

export function findBundledStaffByEmail(
  email: string,
): StudioUserRecord | null {
  const normalized = normalizeEmail(email);
  return (
    bundledStaffRecords().find(
      (user) => normalizeEmail(user.email) === normalized,
    ) ?? null
  );
}

export function findBundledStaffById(id: string): StudioUserRecord | null {
  return bundledStaffRecords().find((user) => user.id === id) ?? null;
}

export function ownerCertStaffRecord(): StudioUserRecord | null {
  const record = findBundledStaffById(OWNER_CERT_STAFF_ID);
  if (!record) return null;
  if (!record.passwordHash || !isPasswordHash(record.passwordHash)) return null;
  return record;
}

export function seedHasPlaintextPasswordFields(
  users: readonly SeedUserJson[] = seedUsers as SeedUserJson[],
): boolean {
  return users.some(
    (user) => typeof user.password === "string" && user.password.length > 0,
  );
}
