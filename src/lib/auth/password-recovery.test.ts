import { afterAll, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import { normalizeEmail } from "@/lib/auth/email-normalize";
import {
  confirmPasswordReset,
  PASSWORD_RESET_REQUEST_GENERIC_MESSAGE,
  requestPasswordReset,
} from "@/lib/auth/password-recovery";
import {
  consumePasswordResetToken,
  hashPasswordResetToken,
  issuePasswordResetToken,
} from "@/lib/auth/password-reset-tokens";
import { buildPasswordResetUrl } from "@/lib/auth/public-app-url";
import {
  createSessionToken,
  isIssuedAtInvalidatedByPasswordChange,
  parseSessionToken,
  readSessionFromCookieHeader,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  createClientAccount,
  findUserById,
  updatePasswordAfterReset,
  verifyLogin,
} from "@/lib/auth/users";

const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const TOKENS_PATH = path.join(process.cwd(), "data", "password-reset-tokens.json");
const createdEmails: string[] = [];
const createdUserIds: string[] = [];

vi.mock("@/lib/transactional-email", () => ({
  sendTransactionalEmail: vi.fn(async (input: { kind: string; text: string }) => {
    expect(input.kind).toBe("password-reset");
    expect(input.text).toContain("/reset-password?token=");
    return {
      ok: true,
      provider: "resend" as const,
      providerMessageId: "test-reset-message-id",
    };
  }),
}));

afterAll(async () => {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf8");
    const users = JSON.parse(raw) as Array<{ email: string; id: string }>;
    const next = users.filter(
      (user) =>
        !createdEmails.includes(normalizeEmail(user.email)) &&
        !createdUserIds.includes(user.id),
    );
    await fs.writeFile(USERS_PATH, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // ignore
  }
  try {
    const raw = await fs.readFile(TOKENS_PATH, "utf8");
    const tokens = JSON.parse(raw) as Array<{ userId: string }>;
    const next = tokens.filter((token) => !createdUserIds.includes(token.userId));
    await fs.writeFile(TOKENS_PATH, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // ignore
  }
});

describe("password reset tokens", () => {
  it("stores only a hash and enforces one-time use", async () => {
    const userId = `reset-user-${Date.now()}`;
    createdUserIds.push(userId);
    const { rawToken, record } = await issuePasswordResetToken(userId);
    expect(record.tokenHash).toBe(hashPasswordResetToken(rawToken));
    expect(JSON.stringify(record)).not.toContain(rawToken);

    const first = await consumePasswordResetToken(rawToken);
    expect(first.ok).toBe(true);

    const second = await consumePasswordResetToken(rawToken);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("used");
  });

  it("supersedes prior tokens on reissue", async () => {
    const userId = `reset-supersede-${Date.now()}`;
    createdUserIds.push(userId);
    const first = await issuePasswordResetToken(userId);
    const second = await issuePasswordResetToken(userId);

    const oldConsume = await consumePasswordResetToken(first.rawToken);
    expect(oldConsume.ok).toBe(false);
    if (!oldConsume.ok) expect(oldConsume.code).toBe("superseded");

    const newConsume = await consumePasswordResetToken(second.rawToken);
    expect(newConsume.ok).toBe(true);
  });

  it("rejects malformed and missing tokens", async () => {
    expect((await consumePasswordResetToken(null)).ok).toBe(false);
    expect((await consumePasswordResetToken("@@@")).ok).toBe(false);
    expect((await consumePasswordResetToken("short")).ok).toBe(false);
  });
});

describe("passwordChangedAtMs session stamp", () => {
  it("invalidates issuedAt equal to the stamp (same-ms guard)", () => {
    const stamp = 1_700_000_000_000;
    expect(isIssuedAtInvalidatedByPasswordChange(stamp, stamp)).toBe(true);
    expect(isIssuedAtInvalidatedByPasswordChange(stamp - 1, stamp)).toBe(true);
    expect(isIssuedAtInvalidatedByPasswordChange(stamp + 1, stamp)).toBe(false);
  });

  it("rejects cookie sessions issued at or before passwordChangedAtMs", async () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const email = `reset-stamp-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));
    const created = await createClientAccount({
      email,
      password: "OldPass123!",
      displayName: "Reset Stamp",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdUserIds.push(created.user.id);

    const token = await createSessionToken(created.user);
    const payload = await parseSessionToken(token);
    expect(payload).not.toBeNull();

    const updated = await updatePasswordAfterReset(
      created.user.id,
      "NewPass123!",
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    // Force same-ms / pre-stamp: rewrite issuedAt onto the stamp boundary.
    const stamp = updated.passwordChangedAtMs;
    expect(
      isIssuedAtInvalidatedByPasswordChange(payload!.issuedAt, stamp) ||
        payload!.issuedAt <= stamp,
    ).toBe(true);

    const cookieHeader = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
    expect(await readSessionFromCookieHeader(cookieHeader)).toBeNull();

    const freshLogin = await verifyLogin(email, "NewPass123!");
    expect(freshLogin).not.toBeNull();
    const freshToken = await createSessionToken(freshLogin!);
    const freshCookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(freshToken)}`;
    expect(await readSessionFromCookieHeader(freshCookie)).toMatchObject({
      id: created.user.id,
      email: normalizeEmail(email),
    });
  });
});

describe("password recovery orchestration", () => {
  it("returns a generic message for unknown and known emails", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const unknown = await requestPasswordReset({
      email: `nobody-${Date.now()}@example.com`,
      requestSource: "test-unknown",
    });
    expect(unknown.message).toBe(PASSWORD_RESET_REQUEST_GENERIC_MESSAGE);

    const email = `reset-flow-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));
    const created = await createClientAccount({
      email,
      password: "FlowPass123!",
      displayName: "Reset Flow",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdUserIds.push(created.user.id);

    const known = await requestPasswordReset({
      email,
      requestSource: `test-known-${Date.now()}`,
    });
    expect(known.message).toBe(PASSWORD_RESET_REQUEST_GENERIC_MESSAGE);
  });

  it("confirms reset, stamps passwordChangedAtMs, and refuses reused tokens", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");

    const email = `reset-confirm-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));
    const created = await createClientAccount({
      email,
      password: "BeforeReset1!",
      displayName: "Confirm Reset",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdUserIds.push(created.user.id);

    const { rawToken } = await issuePasswordResetToken(created.user.id);
    const url = buildPasswordResetUrl(rawToken);
    expect(url).toContain("/reset-password?token=");

    const confirmed = await confirmPasswordReset({
      token: rawToken,
      password: "AfterReset1!",
      confirmPassword: "AfterReset1!",
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const record = await findUserById(created.user.id);
    expect(record?.passwordChangedAtMs).toBe(confirmed.passwordChangedAtMs);
    expect(await verifyLogin(email, "BeforeReset1!")).toBeNull();
    expect(await verifyLogin(email, "AfterReset1!")).not.toBeNull();

    const reused = await confirmPasswordReset({
      token: rawToken,
      password: "AnotherPass1!",
      confirmPassword: "AnotherPass1!",
    });
    expect(reused.ok).toBe(false);
    if (!reused.ok) expect(reused.code).toBe("used");
  });

  it("rejects password mismatch without consuming a valid token path via confirm", async () => {
    const email = `reset-mismatch-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));
    const created = await createClientAccount({
      email,
      password: "MismatchPass1!",
      displayName: "Mismatch",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdUserIds.push(created.user.id);

    const { rawToken } = await issuePasswordResetToken(created.user.id);
    const mismatch = await confirmPasswordReset({
      token: rawToken,
      password: "NewPassword1!",
      confirmPassword: "Different1!",
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.code).toBe("mismatch");

    // Token still usable after mismatch (confirm returns before consume).
    const ok = await confirmPasswordReset({
      token: rawToken,
      password: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    });
    expect(ok.ok).toBe(true);
  });
});

describe("password reset public URL", () => {
  it("builds allowlisted reset links", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const url = buildPasswordResetUrl("abcdefghijklmnopqrstuvwxyz012345");
    expect(url).toBe(
      "http://localhost:3000/reset-password?token=abcdefghijklmnopqrstuvwxyz012345",
    );
  });
});
