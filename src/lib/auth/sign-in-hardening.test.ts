import { afterAll, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import { normalizeEmail } from "@/lib/auth/email-normalize";
import {
  createClientAccount,
  findUserByEmail,
  verifyLogin,
} from "@/lib/auth/users";
import { isStaffOrOwner } from "@/lib/auth/roles";

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
    // ignore
  }
});

describe("sign-in hardening invariants", () => {
  it("accepts correct credentials and rejects wrong password uniformly", async () => {
    const email = `cedric-signin-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));
    const created = await createClientAccount({
      email,
      password: "secure-pass-99",
      displayName: "Cedric Signin",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const ok = await verifyLogin(email, "secure-pass-99");
    expect(ok?.id).toBe(created.user.id);

    const bad = await verifyLogin(email, "wrong-password");
    expect(bad).toBeNull();

    const missing = await verifyLogin(
      `missing-${Date.now()}@example.com`,
      "secure-pass-99",
    );
    expect(missing).toBeNull();
  });

  it("keeps customer accounts off staff permissions", async () => {
    const email = `cedric-role-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));
    const created = await createClientAccount({
      email,
      password: "secure-pass-99",
      displayName: "Cedric Role",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.user.roles).toEqual(["client"]);
    expect(created.user.accountClass).toBe("customer");
    expect(isStaffOrOwner(created.user)).toBe(false);

    const stored = await findUserByEmail(email);
    expect(stored?.roles).toEqual(["client"]);
    expect(stored?.accountClass).toBe("customer");
  });
});
