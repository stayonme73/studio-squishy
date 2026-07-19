/**
 * Lightweight file-backed rate limits for auth email flows.
 * Keys must never include raw tokens or passwords.
 */

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "data", "auth-rate-limit.json");

type RateBucket = {
  count: number;
  windowStartedAt: number;
};

type RateStore = Record<string, RateBucket>;

export type RateLimitRule = {
  /** Stable namespace, e.g. "verify-resend". */
  scope: string;
  /** Opaque subject (hashed email, user id, or IP). */
  subject: string;
  limit: number;
  windowMs: number;
};

async function readStore(): Promise<RateStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as RateStore;
  } catch {
    return {};
  }
}

async function writeStore(store: RateStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function hashRateLimitSubject(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * Returns true when the request is allowed and increments the counter.
 * Fail-open on store I/O errors so auth delivery is not bricked by disk issues.
 */
export async function consumeRateLimit(rule: RateLimitRule): Promise<boolean> {
  const key = `${rule.scope}:${rule.subject}`;
  const now = Date.now();
  try {
    const store = await readStore();
    const existing = store[key];
    if (!existing || now - existing.windowStartedAt >= rule.windowMs) {
      store[key] = { count: 1, windowStartedAt: now };
      await writeStore(store);
      return true;
    }
    if (existing.count >= rule.limit) {
      return false;
    }
    existing.count += 1;
    store[key] = existing;
    await writeStore(store);
    return true;
  } catch {
    return true;
  }
}
