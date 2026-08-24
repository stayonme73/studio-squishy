import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type {
  StudioUser,
  StudioUserAccountClass,
  StudioUserRecord,
} from "@/lib/campaign-store/types";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email-normalize";
import {
  hashPassword,
  isPasswordHash,
  validateNewPassword,
  verifyPassword,
} from "@/lib/auth/password-hash";
import {
  PRODUCTION_CUSTOMER_IDENTITY_LIMIT,
  bundledStaffRecords,
  findBundledStaffByEmail,
  findBundledStaffById,
  isKnownPublicSeedPassword,
  isProductionRuntime,
} from "@/lib/auth/production-staff-identity";

import seedUsers from "./studio-users.seed.json";

const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

let productionUserFileIo = 0;

function rejectProductionUserFileIo(): void {
  if (!isProductionRuntime()) return;
  productionUserFileIo += 1;
  throw new Error(PRODUCTION_CUSTOMER_IDENTITY_LIMIT);
}

/** Test-facing: production staff lookup must never touch the JSON user file. */
export function productionUserFileIoCount(): number {
  return productionUserFileIo;
}

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

/** Seeds allowed to merge into the local development user file. Never used in production. */
function allowedSeedUsers(): SeedUserJson[] {
  const all = seedUsers as SeedUserJson[];
  if (isProductionRuntime()) return [];
  return all;
}

async function ensureUsersFile(): Promise<void> {
  rejectProductionUserFileIo();
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  const seeds = allowedSeedUsers();
  try {
    const raw = await fs.readFile(USERS_PATH, "utf8");
    const existing = JSON.parse(raw) as StudioUserRecord[];
    const usersById = new Map(existing.map((user) => [user.id, user]));
    let changed = false;
    for (const seedUser of seeds) {
      if (usersById.has(seedUser.id)) continue;
      const { password: _removed, ...rest } = seedUser;
      existing.push({
        ...rest,
        accountClass: seedAccountClass(seedUser),
      });
      changed = true;
    }
    if (changed) {
      await fs.writeFile(USERS_PATH, JSON.stringify(existing, null, 2), "utf8");
    }
  } catch {
    await fs.writeFile(
      USERS_PATH,
      JSON.stringify(
        seeds.map((user) => {
          const { password: _removed, ...rest } = user;
          return {
            ...rest,
            accountClass: seedAccountClass(user),
          };
        }),
        null,
        2,
      ),
      "utf8",
    );
  }
}

export async function listStudioUsers(): Promise<StudioUserRecord[]> {
  if (isProductionRuntime()) {
    return bundledStaffRecords();
  }
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_PATH, "utf8");
  return JSON.parse(raw) as StudioUserRecord[];
}

async function writeStudioUsers(users: StudioUserRecord[]): Promise<void> {
  rejectProductionUserFileIo();
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(
  email: string,
): Promise<StudioUserRecord | null> {
  if (isProductionRuntime()) {
    return findBundledStaffByEmail(email);
  }
  const normalized = normalizeEmail(email);
  const users = await listStudioUsers();
  return (
    users.find((user) => normalizeEmail(user.email) === normalized) ?? null
  );
}

export async function findUserById(id: string): Promise<StudioUserRecord | null> {
  if (isProductionRuntime()) {
    return findBundledStaffById(id);
  }
  const users = await listStudioUsers();
  return users.find((user) => user.id === id) ?? null;
}

export function toPublicUser(record: StudioUserRecord): StudioUser {
  const {
    password: _password,
    passwordHash: _passwordHash,
    ...user
  } = record;
  return user;
}

async function passwordMatches(
  record: StudioUserRecord,
  password: string,
): Promise<"hash" | "legacy" | null> {
  if (isKnownPublicSeedPassword(password)) {
    return null;
  }
  if (record.passwordHash && isPasswordHash(record.passwordHash)) {
    return (await verifyPassword(password, record.passwordHash))
      ? "hash"
      : null;
  }
  // Legacy plaintext on the local development file only — never production,
  // and never the publicly known Git-history seed password.
  if (
    !isProductionRuntime() &&
    typeof record.password === "string" &&
    record.password.length > 0 &&
    record.password === password
  ) {
    return "legacy";
  }
  return null;
}

async function upgradeLegacyPassword(
  userId: string,
  password: string,
): Promise<void> {
  if (isProductionRuntime()) return;
  const users = await listStudioUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return;
  const passwordHash = await hashPassword(password);
  const { password: _removed, ...rest } = users[index];
  users[index] = {
    ...rest,
    passwordHash,
  };
  await writeStudioUsers(users);
}

export async function verifyLogin(
  email: string,
  password: string,
): Promise<StudioUser | null> {
  if (isKnownPublicSeedPassword(password)) {
    return null;
  }
  const user = await findUserByEmail(email);
  if (!user) return null;
  const match = await passwordMatches(user, password);
  if (!match) return null;
  if (match === "legacy") {
    await upgradeLegacyPassword(user.id, password);
  }
  const refreshed = (await findUserById(user.id)) ?? user;
  return toPublicUser(refreshed);
}

export type CreateClientAccountInput = {
  email: string;
  password: string;
  displayName: string;
};

export type CreateClientAccountResult =
  | { ok: true; user: StudioUser }
  | {
      ok: false;
      code:
        | "invalid_email"
        | "invalid_password"
        | "invalid_display_name"
        | "email_taken"
        | "durable_identity_unavailable";
      message: string;
    };

/**
 * Public customer account creation — hashed password, normalized email.
 * Production is fail-closed: durable customer identity is not this JSON file.
 */
export async function createClientAccount(
  input: CreateClientAccountInput,
): Promise<CreateClientAccountResult> {
  if (isProductionRuntime()) {
    return {
      ok: false,
      code: "durable_identity_unavailable",
      message: PRODUCTION_CUSTOMER_IDENTITY_LIMIT,
    };
  }

  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const password = input.password;

  if (!isPlausibleEmail(email)) {
    return {
      ok: false,
      code: "invalid_email",
      message: "Enter a valid email address.",
    };
  }
  if (!displayName || displayName.length > 80) {
    return {
      ok: false,
      code: "invalid_display_name",
      message: "Enter the name we should use for your account.",
    };
  }
  const passwordError = validateNewPassword(password);
  if (passwordError) {
    return {
      ok: false,
      code: "invalid_password",
      message: passwordError,
    };
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return {
      ok: false,
      code: "email_taken",
      message:
        "An account with this email already exists. Sign in instead.",
    };
  }

  const passwordHash = await hashPassword(password);
  const record: StudioUserRecord = {
    id: randomUUID(),
    email,
    displayName,
    roles: ["client"],
    accountClass: "customer",
    clientCampaignIds: [],
    passwordHash,
    emailVerifiedAt: null,
  };

  const users = await listStudioUsers();
  users.push(record);
  await writeStudioUsers(users);
  return { ok: true, user: toPublicUser(record) };
}

export async function markEmailVerified(
  userId: string,
  verifiedAt: string = new Date().toISOString(),
): Promise<StudioUser | null> {
  if (isProductionRuntime()) {
    return null;
  }
  const users = await listStudioUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;

  // Idempotent — keep the first verification timestamp.
  if (users[index].emailVerifiedAt) {
    return toPublicUser(users[index]);
  }

  users[index] = {
    ...users[index],
    emailVerifiedAt: verifiedAt,
  };
  await writeStudioUsers(users);
  return toPublicUser(users[index]);
}

export type UpdatePasswordAfterResetResult =
  | { ok: true; user: StudioUser; passwordChangedAtMs: number }
  | {
      ok: false;
      code:
        | "invalid_password"
        | "unknown_user"
        | "durable_identity_unavailable";
      message: string;
    };

/**
 * Password Recovery — replace hash and stamp passwordChangedAtMs so every
 * older session (issued at <= stamp) is rejected on the next read.
 */
export async function updatePasswordAfterReset(
  userId: string,
  newPassword: string,
): Promise<UpdatePasswordAfterResetResult> {
  if (isProductionRuntime()) {
    return {
      ok: false,
      code: "durable_identity_unavailable",
      message: PRODUCTION_CUSTOMER_IDENTITY_LIMIT,
    };
  }

  const passwordError = validateNewPassword(newPassword);
  if (passwordError) {
    return {
      ok: false,
      code: "invalid_password",
      message: passwordError,
    };
  }

  const users = await listStudioUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) {
    return {
      ok: false,
      code: "unknown_user",
      message: "This reset link is not valid. Request a new email to continue.",
    };
  }

  const passwordHash = await hashPassword(newPassword);
  const passwordChangedAtMs = Date.now();
  const { password: _removed, ...rest } = users[index];
  users[index] = {
    ...rest,
    passwordHash,
    passwordChangedAtMs,
  };
  await writeStudioUsers(users);
  return {
    ok: true,
    user: toPublicUser(users[index]),
    passwordChangedAtMs,
  };
}

export async function updateUserCurrentCampaign(
  userId: string,
  campaignId: string | undefined,
): Promise<StudioUser | null> {
  if (isProductionRuntime()) {
    return null;
  }
  const users = await listStudioUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    currentCampaignId: campaignId,
  };

  await writeStudioUsers(users);
  return toPublicUser(users[index]);
}

export async function linkClientCampaign(
  userId: string,
  campaignId: string,
): Promise<StudioUser | null> {
  if (isProductionRuntime()) {
    return null;
  }
  const users = await listStudioUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;

  const existing = users[index].clientCampaignIds ?? [];
  const clientCampaignIds = existing.includes(campaignId)
    ? existing
    : [...existing, campaignId];

  users[index] = {
    ...users[index],
    currentCampaignId: campaignId,
    clientCampaignIds,
  };

  await writeStudioUsers(users);
  return toPublicUser(users[index]);
}
