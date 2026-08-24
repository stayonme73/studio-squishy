import { afterAll, describe, expect, it } from "vitest";

import {
  createClientAccount,
  findUserByEmail,
  listStudioUsers,
  toPublicUser,
  verifyLogin,
} from "@/lib/auth/users";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import { isPasswordHash } from "@/lib/auth/password-hash";
import { promises as fs } from "fs";
import path from "path";

const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const createdEmails: string[] = [];

afterAll(async () => {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf8");
    const users = JSON.parse(raw) as Array<{ email: string }>;
    const next = users.filter(
      (user) => !createdEmails.includes(normalizeEmail(user.email)),
    );
    await fs.writeFile(USERS_PATH, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // ignore cleanup failures
  }
});

describe("createClientAccount", () => {
  it("creates a hashed customer account and allows login", async () => {
    const email = `cedric-create-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));

    const created = await createClientAccount({
      email: `  ${email.toUpperCase()}  `,
      password: "secure-pass-99",
      displayName: "Cedric Create",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.user.email).toBe(normalizeEmail(email));
    expect(created.user.roles).toEqual(["client"]);
    expect(created.user.accountClass).toBe("customer");
    expect(created.user.emailVerifiedAt).toBeNull();
    expect(
      (created.user as { password?: string; passwordHash?: string }).password,
    ).toBeUndefined();

    const stored = await findUserByEmail(email);
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash && isPasswordHash(stored.passwordHash)).toBe(
      true,
    );
    expect(stored?.password).toBeUndefined();
    expect(toPublicUser(stored!).email).toBe(normalizeEmail(email));

    const loggedIn = await verifyLogin(email, "secure-pass-99");
    expect(loggedIn?.id).toBe(created.user.id);
  });

  it("rejects duplicate emails", async () => {
    const email = `cedric-dup-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));

    const first = await createClientAccount({
      email,
      password: "secure-pass-99",
      displayName: "First",
    });
    expect(first.ok).toBe(true);

    const second = await createClientAccount({
      email,
      password: "secure-pass-99",
      displayName: "Second",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("email_taken");
  });

  it("rejects weak passwords", async () => {
    const result = await createClientAccount({
      email: `cedric-weak-${Date.now()}@example.com`,
      password: "short",
      displayName: "Weak",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_password");
  });

  it("does not merge customer seeds into production classification list as staff", async () => {
    const users = await listStudioUsers();
    const clients = users.filter(
      (user) =>
        user.accountClass === "test" ||
        user.accountClass === "customer" ||
        (user.email.endsWith("@local.dev") &&
          user.roles.includes("client") &&
          !user.roles.includes("owner") &&
          !user.roles.includes("staff")),
    );
    // In development, test seeds may exist — ensure they are not labeled staff.
    for (const user of clients) {
      expect(user.accountClass).not.toBe("staff");
    }
  });
});
