/**
 * STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1
 *
 * Durable project claim receipts — hashed tokens only.
 * Minted when payment confirms; consumed once by a verified client.
 */

import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { normalizeEmail } from "@/lib/auth/email-normalize";
import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";
import {
  pgConsumeProjectClaimReceipt,
  pgFindActiveReceiptForCampaign,
  pgFindClaimReceiptByTokenHash,
  pgListClaimReceipts,
  pgSupersedeClaimReceiptsForCheckout,
  pgWriteProjectClaimReceipt,
} from "@/lib/studio-durable-persistence/postgres-identity";

const RECEIPTS_PATH = path.join(
  process.cwd(),
  "data",
  "project-claim-receipts.json",
);

export const PROJECT_CLAIM_PACKAGE_ID =
  "STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1" as const;

/** 32 bytes → 256 bits entropy, base64url. */
export const PROJECT_CLAIM_TOKEN_BYTES = 32;

/** Default 30 days — enough for guest pay → verify → claim. */
const DEFAULT_TTL_DAYS = 30;

export type ProjectClaimReceiptRecord = {
  id: string;
  campaignId: string;
  checkoutSessionId: string;
  customerEmailNormalized: string | null;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  claimedByUserId: string | null;
  supersededAt: string | null;
  /**
   * Set when the raw token was returned to the paying browser.
   * Absent or null means the receipt exists only on the server (webhook / mail).
   * The raw token is never stored.
   */
  deliveredToBrowserAt?: string | null;
};

function getTtlMs(): number {
  const raw = process.env.PROJECT_CLAIM_RECEIPT_TTL_DAYS;
  const days = raw ? Number(raw) : DEFAULT_TTL_DAYS;
  const safe =
    Number.isFinite(days) && days > 0 ? Math.min(days, 90) : DEFAULT_TTL_DAYS;
  return safe * 24 * 60 * 60 * 1000;
}

export function hashProjectClaimToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateProjectClaimRawToken(): string {
  return randomBytes(PROJECT_CLAIM_TOKEN_BYTES).toString("base64url");
}

async function readReceipts(): Promise<ProjectClaimReceiptRecord[]> {
  if (isPostgresPersistenceEnabled()) {
    return pgListClaimReceipts();
  }
  try {
    const raw = await fs.readFile(RECEIPTS_PATH, "utf8");
    return JSON.parse(raw) as ProjectClaimReceiptRecord[];
  } catch {
    return [];
  }
}

async function writeReceipts(
  receipts: ProjectClaimReceiptRecord[],
): Promise<void> {
  await fs.mkdir(path.dirname(RECEIPTS_PATH), { recursive: true });
  await fs.writeFile(RECEIPTS_PATH, JSON.stringify(receipts, null, 2), "utf8");
}

/**
 * Issue a claim receipt for a paid campaign. Supersedes prior unused receipts
 * for the same campaignId + checkoutSessionId.
 * Returns raw token once — never persist or log it.
 */
export async function issueProjectClaimReceipt(input: {
  campaignId: string;
  checkoutSessionId: string;
  customerEmail?: string | null;
  deliveredToBrowserAt?: string | null;
}): Promise<{ rawToken: string; record: ProjectClaimReceiptRecord }> {
  const now = new Date();
  const receipts = await readReceipts();
  const email = input.customerEmail?.trim()
    ? normalizeEmail(input.customerEmail.trim())
    : null;

  for (const r of receipts) {
    if (
      r.campaignId === input.campaignId &&
      r.checkoutSessionId === input.checkoutSessionId &&
      !r.usedAt &&
      !r.supersededAt
    ) {
      r.supersededAt = now.toISOString();
    }
  }

  const rawToken = generateProjectClaimRawToken();
  const record: ProjectClaimReceiptRecord = {
    id: randomBytes(16).toString("hex"),
    campaignId: input.campaignId,
    checkoutSessionId: input.checkoutSessionId,
    customerEmailNormalized: email,
    tokenHash: hashProjectClaimToken(rawToken),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + getTtlMs()).toISOString(),
    usedAt: null,
    claimedByUserId: null,
    supersededAt: null,
    deliveredToBrowserAt: input.deliveredToBrowserAt ?? null,
  };
  if (isPostgresPersistenceEnabled()) {
    await pgSupersedeClaimReceiptsForCheckout({
      campaignId: input.campaignId,
      checkoutSessionId: input.checkoutSessionId,
      supersededAt: now.toISOString(),
    });
    await pgWriteProjectClaimReceipt(record);
    return { rawToken, record };
  }
  receipts.push(record);
  await writeReceipts(receipts);
  return { rawToken, record };
}

export type ConsumeClaimReceiptResult =
  | {
      ok: true;
      receipt: ProjectClaimReceiptRecord;
      alreadyConsumedBySameUser: boolean;
    }
  | {
      ok: false;
      code:
        | "missing_token"
        | "unknown_token"
        | "expired"
        | "superseded"
        | "used_by_other"
        | "campaign_mismatch";
      message: string;
    };

/**
 * Validate and consume a claim receipt for a verified user.
 * Idempotent if the same user already consumed it.
 */
export async function consumeProjectClaimReceipt(input: {
  rawToken: string;
  userId: string;
  expectedCampaignId?: string;
}): Promise<ConsumeClaimReceiptResult> {
  const trimmed = input.rawToken.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "missing_token",
      message: "Claim token is required.",
    };
  }
  const tokenHash = hashProjectClaimToken(trimmed);
  if (isPostgresPersistenceEnabled()) {
    const receipt = await pgFindClaimReceiptByTokenHash(tokenHash);
    if (!receipt) {
      return {
        ok: false,
        code: "unknown_token",
        message: "Claim token is not recognized.",
      };
    }
    if (
      input.expectedCampaignId &&
      receipt.campaignId !== input.expectedCampaignId
    ) {
      return {
        ok: false,
        code: "campaign_mismatch",
        message: "Claim token does not match this project.",
      };
    }
    const consumed = await pgConsumeProjectClaimReceipt({
      tokenHash,
      userId: input.userId,
    });
    if (!consumed.ok) {
      const code =
        consumed.code === "unknown"
          ? "unknown_token"
          : consumed.code === "used_by_other"
            ? "used_by_other"
            : consumed.code;
      return {
        ok: false,
        code,
        message:
          consumed.code === "expired"
            ? "Claim token has expired."
            : consumed.code === "superseded"
              ? "Claim token was replaced. Use the latest claim link."
              : consumed.code === "used_by_other"
                ? "Claim token was already used."
                : "Claim token is not recognized.",
      };
    }
    return {
      ok: true,
      receipt: consumed.receipt,
      alreadyConsumedBySameUser: consumed.alreadyConsumedBySameUser,
    };
  }
  const receipts = await readReceipts();
  const index = receipts.findIndex((r) => r.tokenHash === tokenHash);
  if (index < 0) {
    return {
      ok: false,
      code: "unknown_token",
      message: "Claim token is not recognized.",
    };
  }
  const receipt = receipts[index]!;
  if (
    input.expectedCampaignId &&
    receipt.campaignId !== input.expectedCampaignId
  ) {
    return {
      ok: false,
      code: "campaign_mismatch",
      message: "Claim token does not match this project.",
    };
  }
  if (receipt.supersededAt) {
    return {
      ok: false,
      code: "superseded",
      message: "Claim token was replaced. Use the latest claim link.",
    };
  }
  if (receipt.usedAt) {
    if (receipt.claimedByUserId === input.userId) {
      return { ok: true, receipt, alreadyConsumedBySameUser: true };
    }
    return {
      ok: false,
      code: "used_by_other",
      message: "Claim token was already used.",
    };
  }
  if (new Date(receipt.expiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      code: "expired",
      message: "Claim token has expired.",
    };
  }

  const now = new Date().toISOString();
  receipts[index] = {
    ...receipt,
    usedAt: now,
    claimedByUserId: input.userId,
  };
  await writeReceipts(receipts);
  return {
    ok: true,
    receipt: receipts[index]!,
    alreadyConsumedBySameUser: false,
  };
}

/** Mark the receipt for this raw token as already handed to the paying browser. */
export async function markProjectClaimReceiptDeliveredToBrowser(
  rawToken: string,
): Promise<boolean> {
  const trimmed = rawToken.trim();
  if (!trimmed) return false;
  const tokenHash = hashProjectClaimToken(trimmed);
  const receipts = await readReceipts();
  const index = receipts.findIndex(
    (receipt) =>
      receipt.tokenHash === tokenHash &&
      !receipt.usedAt &&
      !receipt.supersededAt,
  );
  if (index < 0) return false;
  if (receipts[index]?.deliveredToBrowserAt) return true;
  const next = {
    ...receipts[index]!,
    deliveredToBrowserAt: new Date().toISOString(),
  };
  if (isPostgresPersistenceEnabled()) {
    await pgWriteProjectClaimReceipt(next);
    return true;
  }
  receipts[index] = next;
  await writeReceipts(receipts);
  return true;
}

/**
 * Hand the paying browser a one-time claim token for an unowned checkout.
 * A checkout session that already delivered a token does not get another.
 * Campaign id alone cannot call this — the caller must already hold the
 * checkout session id bound to that campaign.
 */
export async function releaseUnclaimedBrowserClaimToken(input: {
  campaignId: string;
  checkoutSessionId: string;
  customerEmail?: string | null;
}): Promise<string | null> {
  const receipts = await readReceipts();
  const alreadyDelivered = receipts.some(
    (receipt) =>
      receipt.campaignId === input.campaignId &&
      receipt.checkoutSessionId === input.checkoutSessionId &&
      !receipt.usedAt &&
      !receipt.supersededAt &&
      Boolean(receipt.deliveredToBrowserAt),
  );
  if (alreadyDelivered) return null;

  const issued = await issueProjectClaimReceipt({
    campaignId: input.campaignId,
    checkoutSessionId: input.checkoutSessionId,
    customerEmail: input.customerEmail,
    deliveredToBrowserAt: new Date().toISOString(),
  });
  return issued.rawToken;
}

export async function findActiveReceiptForCampaign(
  campaignId: string,
): Promise<ProjectClaimReceiptRecord | null> {
  if (isPostgresPersistenceEnabled()) {
    return pgFindActiveReceiptForCampaign(campaignId);
  }
  const receipts = await readReceipts();
  const now = Date.now();
  return (
    receipts.find(
      (r) =>
        r.campaignId === campaignId &&
        !r.usedAt &&
        !r.supersededAt &&
        new Date(r.expiresAt).getTime() > now,
    ) ?? null
  );
}
