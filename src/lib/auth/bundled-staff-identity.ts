/**
 * Immutable bundled Owner/staff identity.
 *
 * Safe for Edge/Deno session gates: no Node filesystem, no JSON user repository.
 * This is not durable customer authentication.
 */

import type {
  StudioUser,
  StudioUserAccountClass,
  StudioUserRecord,
} from "@/lib/campaign-store/types";
import { normalizeEmail } from "@/lib/auth/email-normalize";

import seedUsers from "./studio-users.seed.json";

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

export function toPublicStaffUser(record: StudioUserRecord): StudioUser {
  const {
    password: _password,
    passwordHash: _passwordHash,
    passwordChangedAtMs: _passwordChangedAtMs,
    ...user
  } = record;
  return user;
}

export function seedHasPlaintextPasswordFields(
  users: readonly SeedUserJson[] = seedUsers as SeedUserJson[],
): boolean {
  return users.some(
    (user) => typeof user.password === "string" && user.password.length > 0,
  );
}
