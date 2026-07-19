import { afterAll, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import {
  consumeEmailVerificationToken,
  hashEmailVerificationToken,
  issueEmailVerificationToken,
} from "@/lib/auth/email-verification-tokens";
import {
  resendVerificationEmail,
  sendSignupVerificationEmail,
  verifyEmailWithToken,
} from "@/lib/auth/email-verification";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import { buildEmailVerificationUrl, resolvePublicAppOrigin } from "@/lib/auth/public-app-url";
import {
  createClientAccount,
  findUserByEmail,
} from "@/lib/auth/users";
import { sendTransactionalEmail } from "@/lib/transactional-email";

const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const TOKENS_PATH = path.join(
  process.cwd(),
  "data",
  "email-verification-tokens.json",
);
const createdEmails: string[] = [];
const createdUserIds: string[] = [];

vi.mock("@/lib/transactional-email", () => ({
  sendTransactionalEmail: vi.fn(async (input: { text: string; userId?: string }) => {
    // Capture that raw tokens stay out of delivery-log path by never asserting text in logs.
    expect(input.text).toContain("http");
    return {
      ok: true,
      provider: "resend" as const,
      providerMessageId: "test-message-id",
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
    const tokens = JSON.parse(raw) as Array<{ userId: string; tokenHash: string }>;
    const next = tokens.filter((token) => !createdUserIds.includes(token.userId));
    await fs.writeFile(TOKENS_PATH, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // ignore
  }
});

describe("email verification tokens", () => {
  it("stores only a hash and enforces one-time use", async () => {
    const userId = `verify-user-${Date.now()}`;
    createdUserIds.push(userId);
    const { rawToken, record } = await issueEmailVerificationToken(userId);
    expect(record.tokenHash).toBe(hashEmailVerificationToken(rawToken));
    expect(JSON.stringify(record)).not.toContain(rawToken);

    const first = await consumeEmailVerificationToken(rawToken);
    expect(first.ok).toBe(true);

    const second = await consumeEmailVerificationToken(rawToken);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("used");
  });

  it("supersedes prior tokens on reissue", async () => {
    const userId = `verify-supersede-${Date.now()}`;
    createdUserIds.push(userId);
    const first = await issueEmailVerificationToken(userId);
    const second = await issueEmailVerificationToken(userId);

    const oldConsume = await consumeEmailVerificationToken(first.rawToken);
    expect(oldConsume.ok).toBe(false);
    if (!oldConsume.ok) expect(oldConsume.code).toBe("superseded");

    const newConsume = await consumeEmailVerificationToken(second.rawToken);
    expect(newConsume.ok).toBe(true);
  });

  it("rejects malformed and missing tokens", async () => {
    expect((await consumeEmailVerificationToken(null)).ok).toBe(false);
    expect((await consumeEmailVerificationToken("@@@")).ok).toBe(false);
    expect((await consumeEmailVerificationToken("short")).ok).toBe(false);
  });
});

describe("email verification flow", () => {
  it("verifies the correct account and persists emailVerifiedAt", async () => {
    const email = `cedric-verify-${Date.now()}@example.com`;
    createdEmails.push(normalizeEmail(email));

    const created = await createClientAccount({
      email,
      password: "secure-pass-99",
      displayName: "Cedric Verify",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdUserIds.push(created.user.id);
    expect(created.user.emailVerifiedAt).toBeNull();

    const send = await sendSignupVerificationEmail(created.user);
    expect(send.delivery.ok).toBe(true);

    const mocked = vi.mocked(sendTransactionalEmail);
    const lastCall = mocked.mock.calls.at(-1)?.[0];
    expect(lastCall?.text).toBeTruthy();
    const match = lastCall?.text.match(/token=([A-Za-z0-9_-]+)/);
    expect(match?.[1]).toBeTruthy();
    const rawToken = match![1];

    const tokensRaw = await fs.readFile(TOKENS_PATH, "utf8");
    expect(tokensRaw).not.toContain(rawToken);

    const verified = await verifyEmailWithToken(rawToken);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.user.email).toBe(normalizeEmail(email));
    expect(verified.user.emailVerifiedAt).toBeTruthy();

    const stored = await findUserByEmail(email);
    expect(stored?.emailVerifiedAt).toBeTruthy();

    const reuse = await verifyEmailWithToken(rawToken);
    expect(reuse.ok).toBe(false);
  });

  it("resend returns a non-enumerating message for unknown emails", async () => {
    const result = await resendVerificationEmail({
      email: `missing-${Date.now()}@example.com`,
      requestSource: "test-source",
    });
    expect(result.message.toLowerCase()).toContain("if an account needs verification");
  });

  it("builds verification links from the allowlisted public origin", () => {
    const origin = resolvePublicAppOrigin();
    expect(origin).toBeTruthy();
    const url = buildEmailVerificationUrl("abcdefghijklmnopqrstuvwxyz0123456789ABCD");
    expect(url).toBeTruthy();
    expect(url?.startsWith(`${origin}/verify-email?token=`)).toBe(true);
    expect(url).not.toContain("evil.example");
  });
});
