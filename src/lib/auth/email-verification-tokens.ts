/**
 * Email verification challenges — store hashed tokens only.
 *
 * Resend policy: issuing a new token supersedes all prior unused tokens
 * for that user (single active challenge).
 */

import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const TOKENS_PATH = path.join(
  process.cwd(),
  "data",
  "email-verification-tokens.json",
);

/** 32 bytes → 256 bits of entropy, base64url (~43 chars). */
export const EMAIL_VERIFY_TOKEN_BYTES = 32;

const DEFAULT_TTL_MINUTES = 60;

export type EmailVerificationTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  supersededAt: string | null;
};

function getTtlMinutes(): number {
  const raw = process.env.AUTH_EMAIL_VERIFY_TOKEN_TTL_MINUTES;
  const parsed = raw ? Number(raw) : DEFAULT_TTL_MINUTES;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_MINUTES;
  return Math.min(parsed, 24 * 60);
}

export function hashEmailVerificationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateEmailVerificationRawToken(): string {
  return randomBytes(EMAIL_VERIFY_TOKEN_BYTES).toString("base64url");
}

async function readTokens(): Promise<EmailVerificationTokenRecord[]> {
  try {
    const raw = await fs.readFile(TOKENS_PATH, "utf8");
    return JSON.parse(raw) as EmailVerificationTokenRecord[];
  } catch {
    return [];
  }
}

async function writeTokens(tokens: EmailVerificationTokenRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(TOKENS_PATH), { recursive: true });
  await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf8");
}

/**
 * Create a new challenge and supersede prior unused tokens for the user.
 * Returns the raw token once — never persist or log it.
 */
export async function issueEmailVerificationToken(
  userId: string,
): Promise<{ rawToken: string; record: EmailVerificationTokenRecord }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getTtlMinutes() * 60_000);
  const rawToken = generateEmailVerificationRawToken();
  const record: EmailVerificationTokenRecord = {
    id: randomBytes(16).toString("hex"),
    userId,
    tokenHash: hashEmailVerificationToken(rawToken),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    supersededAt: null,
  };

  const tokens = await readTokens();
  const stamped = now.toISOString();
  for (const token of tokens) {
    if (
      token.userId === userId &&
      token.usedAt === null &&
      token.supersededAt === null
    ) {
      token.supersededAt = stamped;
    }
  }
  tokens.push(record);
  await writeTokens(tokens);
  return { rawToken, record };
}

export type ConsumeEmailVerificationResult =
  | { ok: true; userId: string; record: EmailVerificationTokenRecord }
  | {
      ok: false;
      code: "missing" | "malformed" | "expired" | "used" | "superseded" | "unknown";
    };

export async function consumeEmailVerificationToken(
  rawToken: string | null | undefined,
): Promise<ConsumeEmailVerificationResult> {
  if (rawToken == null || typeof rawToken !== "string") {
    return { ok: false, code: "missing" };
  }
  const trimmed = rawToken.trim();
  if (!trimmed || trimmed.length < 20 || trimmed.length > 200) {
    return { ok: false, code: "malformed" };
  }
  // Reject obvious non-base64url noise without echoing the value.
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return { ok: false, code: "malformed" };
  }

  const tokenHash = hashEmailVerificationToken(trimmed);
  const tokens = await readTokens();
  const index = tokens.findIndex((token) => token.tokenHash === tokenHash);
  if (index === -1) {
    return { ok: false, code: "unknown" };
  }

  const record = tokens[index];
  if (record.usedAt) {
    return { ok: false, code: "used" };
  }
  if (record.supersededAt) {
    return { ok: false, code: "superseded" };
  }
  if (Date.parse(record.expiresAt) <= Date.now()) {
    return { ok: false, code: "expired" };
  }

  const usedAt = new Date().toISOString();
  tokens[index] = { ...record, usedAt };
  await writeTokens(tokens);
  return { ok: true, userId: record.userId, record: tokens[index] };
}
