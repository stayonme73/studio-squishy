import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { hashPassword } from "@/lib/auth/password-hash";
import {
  createClientAccount,
  listStudioUsers,
  verifyLogin,
} from "@/lib/auth/users";
import seedUsers from "@/lib/auth/studio-users.seed.json";

const REAL_USERS = path.join(process.cwd(), "data", "studio-users.json");
const ORIGINAL_CWD = process.cwd();
const seedIds = new Set(seedUsers.map((user) => user.id));

let realUsersHash = "";

function fileHash(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function inTempDir<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(path.join(tmpdir(), "studio-auth-bootstrap-"));
  const previousEnv = process.env.NODE_ENV;
  try {
    process.chdir(directory);
    return await run(directory);
  } finally {
    process.chdir(ORIGINAL_CWD);
    process.env.NODE_ENV = previousEnv;
    rmSync(directory, { recursive: true, force: true });
  }
}

beforeAll(() => {
  realUsersHash = fileHash(REAL_USERS);
});

afterAll(() => {
  expect(fileHash(REAL_USERS)).toBe(realUsersHash);
  expect(process.cwd()).toBe(ORIGINAL_CWD);
});

describe("production account bootstrap", () => {
  it("does not create development accounts from a missing production file", async () => {
    await inTempDir(async (directory) => {
      process.env.NODE_ENV = "production";
      const users = await listStudioUsers();
      expect(users).toEqual([]);
      const written = JSON.parse(
        readFileSync(path.join(directory, "data", "studio-users.json"), "utf8"),
      ) as Array<{ id: string; password?: string; roles: string[] }>;
      expect(written).toEqual([]);
      for (const seed of seedUsers) {
        expect(written.some((user) => user.id === seed.id)).toBe(false);
        expect(await verifyLogin(seed.email, String(seed.password))).toBeNull();
      }
    });
  });

  it("does not add development accounts to an empty production file or a private owner record", async () => {
    await inTempDir(async () => {
      process.env.NODE_ENV = "production";
      await listStudioUsers();
      const ownerPassword = "isolated-owner-pass-99";
      const owner = {
        id: "production-owner-isolated",
        email: "owner-isolated@example.com",
        displayName: "Isolated Owner",
        roles: ["owner"],
        accountClass: "staff",
        passwordHash: await hashPassword(ownerPassword),
        emailVerifiedAt: null,
      };
      const { writeFileSync, mkdirSync } = await import("node:fs");
      mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
      writeFileSync(
        path.join(process.cwd(), "data", "studio-users.json"),
        JSON.stringify([owner], null, 2),
      );

      const users = await listStudioUsers();
      expect(users.map((user) => user.id)).toEqual([owner.id]);
      expect(users.some((user) => seedIds.has(user.id))).toBe(false);
      expect(users.some((user) => user.password)).toBe(false);
      expect((await verifyLogin(owner.email, ownerPassword))?.roles).toEqual([
        "owner",
      ]);
      for (const seed of seedUsers) {
        expect(await verifyLogin(seed.email, String(seed.password))).toBeNull();
      }
    });
  });

  it("rejects a plaintext password in production", async () => {
    await inTempDir(async () => {
      process.env.NODE_ENV = "production";
      const { writeFileSync, mkdirSync } = await import("node:fs");
      mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
      writeFileSync(
        path.join(process.cwd(), "data", "studio-users.json"),
        JSON.stringify(
          [
            {
              id: "plaintext-isolated",
              email: "plaintext-isolated@example.com",
              displayName: "Plaintext",
              roles: ["staff"],
              accountClass: "staff",
              password: "plaintext-should-fail",
            },
          ],
          null,
          2,
        ),
      );
      expect(
        await verifyLogin("plaintext-isolated@example.com", "plaintext-should-fail"),
      ).toBeNull();
      const users = await listStudioUsers();
      expect(users.find((user) => user.id === "plaintext-isolated")?.passwordHash).toBeUndefined();
    });
  });

  it("still creates only a customer from public signup fields", async () => {
    await inTempDir(async () => {
      process.env.NODE_ENV = "production";
      const created = await createClientAccount({
        email: "new-customer-isolated@example.com",
        password: "customer-pass-99",
        displayName: "New Customer",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.user.roles).toEqual(["client"]);
      expect(created.user.accountClass).toBe("customer");
      const users = await listStudioUsers();
      expect(users.some((user) => user.roles.includes("owner"))).toBe(false);
      expect(users.some((user) => user.roles.includes("staff"))).toBe(false);
      expect(users.some((user) => seedIds.has(user.id))).toBe(false);
    });
  });

  it("keeps development seeding for a local empty file", async () => {
    await inTempDir(async () => {
      process.env.NODE_ENV = "development";
      const users = await listStudioUsers();
      expect(users.map((user) => user.id)).toEqual(
        expect.arrayContaining(["tagia", "staff-dev"]),
      );
    });
  });

  it("keeps local fixture sign-in unavailable in production", () => {
    expect(isLocalAuthFixtureAvailable({ env: { NODE_ENV: "production" } })).toBe(
      false,
    );
    expect(isLocalAuthFixtureAvailable({ env: { NODE_ENV: "development" } })).toBe(
      true,
    );
    expect(isLocalAuthFixtureAvailable({ env: { NODE_ENV: "test" } })).toBe(true);
  });
});
