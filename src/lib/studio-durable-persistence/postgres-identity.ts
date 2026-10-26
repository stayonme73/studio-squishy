import type { StudioUserRecord } from "@/lib/campaign-store/types";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import type { EmailVerificationTokenRecord } from "@/lib/auth/email-verification-tokens";
import type { PasswordResetTokenRecord } from "@/lib/auth/password-reset-tokens";
import type { ProjectClaimReceiptRecord } from "@/lib/studio-project-claim/claim-receipts";

import { getStudioPostgresPool, rowEnvelope, withPostgresTransaction } from "./postgres-pool";

function mapEmailVerificationRow(row: Record<string, unknown>): EmailVerificationTokenRecord {
  return {
    id: String(row.token_id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    createdAt: new Date(String(row.created_at)).toISOString(),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    usedAt: row.used_at ? new Date(String(row.used_at)).toISOString() : null,
    supersededAt: row.superseded_at
      ? new Date(String(row.superseded_at)).toISOString()
      : null,
  };
}

function mapPasswordResetRow(row: Record<string, unknown>): PasswordResetTokenRecord {
  return {
    id: String(row.token_id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    createdAt: new Date(String(row.created_at)).toISOString(),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    usedAt: row.used_at ? new Date(String(row.used_at)).toISOString() : null,
    supersededAt: row.superseded_at
      ? new Date(String(row.superseded_at)).toISOString()
      : null,
  };
}

export async function pgListStudioUsers(): Promise<StudioUserRecord[]> {
  const result = await getStudioPostgresPool().query(`SELECT envelope FROM studio_users ORDER BY user_id`);
  return result.rows
    .map((row) => rowEnvelope<StudioUserRecord>(row, "envelope"))
    .filter((row): row is StudioUserRecord => row != null);
}

export async function pgFindUserByEmail(email: string): Promise<StudioUserRecord | null> {
  const normalized = normalizeEmail(email);
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_users WHERE email_normalized = $1`,
    [normalized],
  );
  return rowEnvelope<StudioUserRecord>(result.rows[0], "envelope");
}

export async function pgFindUserById(userId: string): Promise<StudioUserRecord | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_users WHERE user_id = $1`,
    [userId],
  );
  return rowEnvelope<StudioUserRecord>(result.rows[0], "envelope");
}

export async function pgWriteStudioUser(record: StudioUserRecord): Promise<StudioUserRecord> {
  const emailNormalized = normalizeEmail(record.email);
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`user:${record.id}`]);
    await client.query(
      `INSERT INTO studio_users (user_id, email_normalized, envelope, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         email_normalized = EXCLUDED.email_normalized,
         envelope = EXCLUDED.envelope,
         updated_at = NOW()`,
      [record.id, emailNormalized, JSON.stringify(record)],
    );
  });
  return record;
}

export async function pgInsertStudioUserIfAbsent(record: StudioUserRecord): Promise<boolean> {
  const emailNormalized = normalizeEmail(record.email);
  const result = await getStudioPostgresPool().query(
    `INSERT INTO studio_users (user_id, email_normalized, envelope, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (email_normalized) DO NOTHING
     RETURNING user_id`,
    [record.id, emailNormalized, JSON.stringify(record)],
  );
  if ((result.rowCount ?? 0) > 0) return true;
  const byId = await pgFindUserById(record.id);
  return byId != null;
}

export async function pgIssueEmailVerificationToken(
  record: EmailVerificationTokenRecord,
): Promise<EmailVerificationTokenRecord> {
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `email-verify:${record.userId}`,
    ]);
    const stamped = new Date().toISOString();
    await client.query(
      `UPDATE studio_email_verification_tokens
       SET superseded_at = $1
       WHERE user_id = $2 AND used_at IS NULL AND superseded_at IS NULL`,
      [stamped, record.userId],
    );
    await client.query(
      `INSERT INTO studio_email_verification_tokens
         (token_id, user_id, token_hash, created_at, expires_at, used_at, superseded_at)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL)`,
      [
        record.id,
        record.userId,
        record.tokenHash,
        record.createdAt,
        record.expiresAt,
      ],
    );
  });
  return record;
}

export async function pgConsumeEmailVerificationToken(
  tokenHash: string,
): Promise<
  | { ok: true; record: EmailVerificationTokenRecord }
  | { ok: false; code: "unknown" | "used" | "superseded" | "expired" }
> {
  return withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`email-verify-hash:${tokenHash}`]);
    const peek = await client.query(
      `SELECT * FROM studio_email_verification_tokens WHERE token_hash = $1`,
      [tokenHash],
    );
    if (peek.rowCount === 0) return { ok: false, code: "unknown" };
    const row = peek.rows[0] as Record<string, unknown>;
    if (row.used_at) return { ok: false, code: "used" };
    if (row.superseded_at) return { ok: false, code: "superseded" };
    if (Date.parse(String(row.expires_at)) <= Date.now()) {
      return { ok: false, code: "expired" };
    }
    const usedAt = new Date().toISOString();
    const updated = await client.query(
      `UPDATE studio_email_verification_tokens
       SET used_at = $1
       WHERE token_hash = $2 AND used_at IS NULL AND superseded_at IS NULL AND expires_at > NOW()
       RETURNING *`,
      [usedAt, tokenHash],
    );
    if (updated.rowCount === 0) {
      return { ok: false, code: "used" };
    }
    return {
      ok: true,
      record: mapEmailVerificationRow(updated.rows[0] as Record<string, unknown>),
    };
  });
}

export async function pgIssuePasswordResetToken(
  record: PasswordResetTokenRecord,
): Promise<PasswordResetTokenRecord> {
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `password-reset:${record.userId}`,
    ]);
    const stamped = new Date().toISOString();
    await client.query(
      `UPDATE studio_password_reset_tokens
       SET superseded_at = $1
       WHERE user_id = $2 AND used_at IS NULL AND superseded_at IS NULL`,
      [stamped, record.userId],
    );
    await client.query(
      `INSERT INTO studio_password_reset_tokens
         (token_id, user_id, token_hash, created_at, expires_at, used_at, superseded_at)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL)`,
      [
        record.id,
        record.userId,
        record.tokenHash,
        record.createdAt,
        record.expiresAt,
      ],
    );
  });
  return record;
}

export async function pgConsumePasswordResetToken(
  tokenHash: string,
): Promise<
  | { ok: true; record: PasswordResetTokenRecord }
  | { ok: false; code: "unknown" | "used" | "superseded" | "expired" }
> {
  return withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `password-reset-hash:${tokenHash}`,
    ]);
    const peek = await client.query(
      `SELECT * FROM studio_password_reset_tokens WHERE token_hash = $1`,
      [tokenHash],
    );
    if (peek.rowCount === 0) return { ok: false, code: "unknown" };
    const row = peek.rows[0] as Record<string, unknown>;
    if (row.used_at) return { ok: false, code: "used" };
    if (row.superseded_at) return { ok: false, code: "superseded" };
    if (Date.parse(String(row.expires_at)) <= Date.now()) {
      return { ok: false, code: "expired" };
    }
    const usedAt = new Date().toISOString();
    const updated = await client.query(
      `UPDATE studio_password_reset_tokens
       SET used_at = $1
       WHERE token_hash = $2 AND used_at IS NULL AND superseded_at IS NULL AND expires_at > NOW()
       RETURNING *`,
      [usedAt, tokenHash],
    );
    if (updated.rowCount === 0) return { ok: false, code: "used" };
    return {
      ok: true,
      record: mapPasswordResetRow(updated.rows[0] as Record<string, unknown>),
    };
  });
}

export async function pgConsumeRateLimit(input: {
  rateKey: string;
  limit: number;
  windowMs: number;
  nowMs: number;
}): Promise<boolean> {
  return withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`rate:${input.rateKey}`]);
    const existing = await client.query(
      `SELECT bucket_count, window_started_at_ms FROM studio_auth_rate_limits WHERE rate_key = $1`,
      [input.rateKey],
    );
    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO studio_auth_rate_limits (rate_key, bucket_count, window_started_at_ms, updated_at)
         VALUES ($1, 1, $2, NOW())`,
        [input.rateKey, input.nowMs],
      );
      return true;
    }
    const row = existing.rows[0] as { bucket_count: number; window_started_at_ms: string };
    const windowStart = Number(row.window_started_at_ms);
    if (input.nowMs - windowStart >= input.windowMs) {
      await client.query(
        `UPDATE studio_auth_rate_limits
         SET bucket_count = 1, window_started_at_ms = $2, updated_at = NOW()
         WHERE rate_key = $1`,
        [input.rateKey, input.nowMs],
      );
      return true;
    }
    if (row.bucket_count >= input.limit) {
      return false;
    }
    await client.query(
      `UPDATE studio_auth_rate_limits
       SET bucket_count = bucket_count + 1, updated_at = NOW()
       WHERE rate_key = $1`,
      [input.rateKey],
    );
    return true;
  });
}

function mapClaimReceiptRow(row: Record<string, unknown>): ProjectClaimReceiptRecord {
  const envelope = rowEnvelope<ProjectClaimReceiptRecord>(row, "envelope");
  if (envelope) return envelope;
  throw new Error("Claim receipt envelope missing.");
}

export async function pgWriteProjectClaimReceipt(
  record: ProjectClaimReceiptRecord,
): Promise<ProjectClaimReceiptRecord> {
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `claim:${record.campaignId}:${record.checkoutSessionId}`,
    ]);
    await client.query(
      `INSERT INTO studio_project_claim_receipts
         (receipt_id, campaign_id, checkout_session_id, token_hash, envelope, created_at, expires_at, used_at, superseded_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, NOW())
       ON CONFLICT (receipt_id) DO UPDATE SET
         envelope = EXCLUDED.envelope,
         used_at = EXCLUDED.used_at,
         superseded_at = EXCLUDED.superseded_at,
         updated_at = NOW()`,
      [
        record.id,
        record.campaignId,
        record.checkoutSessionId,
        record.tokenHash,
        JSON.stringify(record),
        record.createdAt,
        record.expiresAt,
        record.usedAt,
        record.supersededAt,
      ],
    );
  });
  return record;
}

export async function pgSupersedeClaimReceiptsForCheckout(input: {
  campaignId: string;
  checkoutSessionId: string;
  supersededAt: string;
}): Promise<void> {
  await getStudioPostgresPool().query(
    `UPDATE studio_project_claim_receipts
     SET superseded_at = $1::timestamptz,
         updated_at = NOW(),
         envelope = jsonb_set(envelope, '{supersededAt}', to_jsonb($2::text), true)
     WHERE campaign_id = $3 AND checkout_session_id = $4 AND used_at IS NULL AND superseded_at IS NULL`,
    [input.supersededAt, input.supersededAt, input.campaignId, input.checkoutSessionId],
  );
}

export async function pgFindActiveReceiptForCampaign(
  campaignId: string,
): Promise<ProjectClaimReceiptRecord | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_project_claim_receipts
     WHERE campaign_id = $1 AND used_at IS NULL AND superseded_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [campaignId],
  );
  return rowEnvelope<ProjectClaimReceiptRecord>(result.rows[0], "envelope");
}

export async function pgFindClaimReceiptByTokenHash(
  tokenHash: string,
): Promise<ProjectClaimReceiptRecord | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_project_claim_receipts WHERE token_hash = $1`,
    [tokenHash],
  );
  return rowEnvelope<ProjectClaimReceiptRecord>(result.rows[0], "envelope");
}

export async function pgListClaimReceipts(): Promise<ProjectClaimReceiptRecord[]> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_project_claim_receipts`,
  );
  return result.rows
    .map((row) => rowEnvelope<ProjectClaimReceiptRecord>(row, "envelope"))
    .filter((row): row is ProjectClaimReceiptRecord => row != null);
}

export async function pgConsumeProjectClaimReceipt(input: {
  tokenHash: string;
  userId: string;
}): Promise<
  | { ok: true; receipt: ProjectClaimReceiptRecord; alreadyConsumedBySameUser: boolean }
  | { ok: false; code: "unknown" | "superseded" | "used_by_other" | "expired" }
> {
  return withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `claim-hash:${input.tokenHash}`,
    ]);
    const peek = await client.query(
      `SELECT envelope, used_at, superseded_at, expires_at FROM studio_project_claim_receipts WHERE token_hash = $1`,
      [input.tokenHash],
    );
    if (peek.rowCount === 0) return { ok: false, code: "unknown" };
    const receipt = rowEnvelope<ProjectClaimReceiptRecord>(peek.rows[0], "envelope");
    if (!receipt) return { ok: false, code: "unknown" };
    if (receipt.supersededAt) return { ok: false, code: "superseded" };
    if (receipt.usedAt) {
      if (receipt.claimedByUserId === input.userId) {
        return { ok: true, receipt, alreadyConsumedBySameUser: true };
      }
      return { ok: false, code: "used_by_other" };
    }
    if (Date.parse(receipt.expiresAt) <= Date.now()) {
      return { ok: false, code: "expired" };
    }
    const now = new Date().toISOString();
    const next: ProjectClaimReceiptRecord = {
      ...receipt,
      usedAt: now,
      claimedByUserId: input.userId,
    };
    const updated = await client.query(
      `UPDATE studio_project_claim_receipts
       SET used_at = $1, envelope = $2::jsonb, updated_at = NOW()
       WHERE token_hash = $3 AND used_at IS NULL AND superseded_at IS NULL AND expires_at > NOW()
       RETURNING envelope`,
      [now, JSON.stringify(next), input.tokenHash],
    );
    if (updated.rowCount === 0) {
      const again = await pgFindClaimReceiptByTokenHash(input.tokenHash);
      if (again?.usedAt && again.claimedByUserId === input.userId) {
        return { ok: true, receipt: again, alreadyConsumedBySameUser: true };
      }
      return { ok: false, code: "used_by_other" };
    }
    const consumed = rowEnvelope<ProjectClaimReceiptRecord>(updated.rows[0], "envelope");
    if (!consumed) return { ok: false, code: "unknown" };
    return { ok: true, receipt: consumed, alreadyConsumedBySameUser: false };
  });
}

export async function pgDeleteDisposableIdentityRows(prefix: string): Promise<void> {
  const pool = getStudioPostgresPool();
  await pool.query(
    `DELETE FROM studio_email_verification_tokens
     WHERE user_id IN (SELECT user_id FROM studio_users WHERE user_id LIKE $1)`,
    [prefix],
  );
  await pool.query(
    `DELETE FROM studio_password_reset_tokens
     WHERE user_id IN (SELECT user_id FROM studio_users WHERE user_id LIKE $1)`,
    [prefix],
  );
  await pool.query(`DELETE FROM studio_users WHERE user_id LIKE $1`, [prefix]);
  await pool.query(`DELETE FROM studio_project_claim_receipts WHERE campaign_id LIKE $1`, [prefix]);
  await pool.query(`DELETE FROM studio_auth_rate_limits WHERE rate_key LIKE $1`, [prefix]);
}

/** Integration test cleanup — synthetic emails only. */
export async function pgCleanupDisposableIdentityIntegrationTestData(): Promise<void> {
  const pool = getStudioPostgresPool();
  const emailPattern = "disposable.identity.%@example.test";
  await pool.query(
    `DELETE FROM studio_email_verification_tokens
     WHERE user_id IN (SELECT user_id FROM studio_users WHERE email_normalized LIKE $1)`,
    [emailPattern],
  );
  await pool.query(
    `DELETE FROM studio_password_reset_tokens
     WHERE user_id IN (SELECT user_id FROM studio_users WHERE email_normalized LIKE $1)`,
    [emailPattern],
  );
  await pool.query(`DELETE FROM studio_users WHERE email_normalized LIKE $1`, [emailPattern]);
  await pool.query(
    `DELETE FROM studio_project_claim_receipts WHERE campaign_id LIKE 'disposable-persistence-identity-%'`,
  );
  await pool.query(
    `DELETE FROM studio_auth_rate_limits WHERE rate_key LIKE 'disposable-verify-resend:%'`,
  );
}
