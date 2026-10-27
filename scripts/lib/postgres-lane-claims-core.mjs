/**
 * Postgres lane claims for subprocess worker (mirrors postgres-lane-claims.ts).
 */
import pg from "pg";

const QUICK_ADVISORY = "studio_lane_quick_admission";
const HEAVY_ADVISORY = "studio_lane_heavy_lock";
const HEARTBEAT_STALE_MS = 900_000;
const QUICK_CAPACITY = 2;

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS studio_lane_claims (
  claim_id TEXT PRIMARY KEY,
  lane TEXT NOT NULL CHECK (lane IN ('quick', 'heavy')),
  job_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL,
  heartbeat_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_lane_claims_lane_heartbeat_idx
  ON studio_lane_claims (lane, heartbeat_at);
CREATE UNIQUE INDEX IF NOT EXISTS studio_lane_claims_lane_job_idx
  ON studio_lane_claims (lane, job_id);
`;

function claimIdForJob(lane, jobId) {
  return `${lane}:${encodeURIComponent(jobId)}`;
}

function isStale(iso, nowMs, staleMs) {
  const beat = Date.parse(iso);
  if (!Number.isFinite(beat)) return true;
  return nowMs - beat > staleMs;
}

function poolFromEnv() {
  const connectionString =
    process.env.STUDIO_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL required");
  return new pg.Pool({
    connectionString,
    max: 2,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
}

let ensured = false;
async function ensureTable(client) {
  if (ensured) return;
  await client.query(ENSURE_TABLE_SQL);
  ensured = true;
}

async function withTx(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function withAdvisory(client, key, work) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [key]);
  return work();
}

export async function runOperation(operation, payload) {
  const pool = poolFromEnv();
  try {
    switch (operation) {
      case "reconcileQuick":
        return reconcileQuick(pool, payload);
      case "admitQuick":
        return admitQuick(pool, payload);
      case "releaseQuick":
        return releaseQuick(pool, payload);
      case "acquireHeavy":
        return acquireHeavy(pool, payload);
      case "releaseHeavy":
        return releaseHeavy(pool, payload);
      case "recoverHeavy":
        return recoverHeavy(pool, payload);
      case "readHeavy":
        return readHeavy(pool);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } finally {
    await pool.end();
  }
}

async function reconcileQuick(pool, input) {
  const nowMs = input.nowMs ?? Date.now();
  const staleMs = input.staleMs ?? HEARTBEAT_STALE_MS;
  const evidence = new Set(input.evidenceJobIds ?? []);
  return withTx(pool, async (client) => {
    await ensureTable(client);
    return withAdvisory(client, QUICK_ADVISORY, async () => {
      const { rows } = await client.query(
        `SELECT claim_id, job_id, heartbeat_at FROM studio_lane_claims WHERE lane = 'quick'`,
      );
      const released = [];
      for (const row of rows) {
        const heartbeatIso = row.heartbeat_at.toISOString();
        if (evidence.has(row.job_id) || isStale(heartbeatIso, nowMs, staleMs)) {
          await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [row.claim_id]);
          released.push(row.job_id);
        }
      }
      return { released };
    });
  });
}

async function admitQuick(pool, input) {
  const capacity = input.capacity ?? QUICK_CAPACITY;
  const nowMs = input.nowMs ?? Date.now();
  const now = input.now ?? new Date(nowMs).toISOString();
  const staleMs = input.staleMs ?? HEARTBEAT_STALE_MS;
  const evidence = new Set(input.evidenceJobIds ?? []);

  return withTx(pool, async (client) => {
    await ensureTable(client);
    return withAdvisory(client, QUICK_ADVISORY, async () => {
      const { rows } = await client.query(
        `SELECT claim_id, job_id, campaign_id, claimed_at, heartbeat_at
         FROM studio_lane_claims WHERE lane = 'quick'`,
      );
      const holders = new Set(evidence);
      for (const row of rows) {
        const heartbeatIso = row.heartbeat_at.toISOString();
        if (isStale(heartbeatIso, nowMs, staleMs) || evidence.has(row.job_id)) {
          await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [row.claim_id]);
          continue;
        }
        holders.add(row.job_id);
      }

      if (evidence.has(input.jobId)) {
        return { ok: true, heldBy: "evidence" };
      }

      const existing = rows.find((r) => r.job_id === input.jobId);
      if (holders.has(input.jobId)) {
        const claimId = claimIdForJob("quick", input.jobId);
        await client.query(
          `INSERT INTO studio_lane_claims (claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at)
           VALUES ($1, 'quick', $2, $3, $4::timestamptz, $5::timestamptz)
           ON CONFLICT (claim_id) DO UPDATE SET heartbeat_at = EXCLUDED.heartbeat_at`,
          [
            claimId,
            input.jobId,
            input.campaignId,
            existing?.claimed_at?.toISOString?.() ?? now,
            now,
          ],
        );
        return { ok: true, heldBy: "reservation" };
      }

      if (holders.size >= capacity) {
        return { ok: false, reason: "lane_full" };
      }

      const claimId = claimIdForJob("quick", input.jobId);
      await client.query(
        `INSERT INTO studio_lane_claims (claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at)
         VALUES ($1, 'quick', $2, $3, $4::timestamptz, $5::timestamptz)`,
        [claimId, input.jobId, input.campaignId, now, now],
      );
      return { ok: true, heldBy: "reservation" };
    });
  });
}

async function releaseQuick(pool, input) {
  const claimId = claimIdForJob("quick", input.jobId);
  return withTx(pool, async (client) => {
    await ensureTable(client);
    return withAdvisory(client, QUICK_ADVISORY, async () => {
      const result = await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
        claimId,
      ]);
      return (result.rowCount ?? 0) > 0;
    });
  });
}

async function readHeavy(pool) {
  const client = await pool.connect();
  try {
    await ensureTable(client);
  } finally {
    client.release();
  }
  const { rows } = await pool.query(
    `SELECT job_id, campaign_id, claimed_at, heartbeat_at FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1`,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    jobId: row.job_id,
    campaignId: row.campaign_id,
    claimedAt: row.claimed_at.toISOString(),
    heartbeatAt: row.heartbeat_at.toISOString(),
  };
}

async function recoverHeavy(pool, input) {
  const nowMs = input.nowMs ?? Date.now();
  const occupying = new Set(input.occupyingJobIds ?? []);
  return withTx(pool, async (client) => {
    await ensureTable(client);
    return withAdvisory(client, HEAVY_ADVISORY, async () => {
      const { rows } = await client.query(
        `SELECT claim_id, job_id, heartbeat_at FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1`,
      );
      const row = rows[0];
      if (!row) return { recovered: false, needsOwner: false };
      const heartbeatIso = row.heartbeat_at.toISOString();
      if (occupying.has(row.job_id)) return { recovered: false, needsOwner: false };
      const stale = isStale(heartbeatIso, nowMs, HEARTBEAT_STALE_MS);
      const mayRecover = Boolean(input.viewsAuthoritative) || stale || occupying.size > 0;
      if (!mayRecover) return { recovered: false, needsOwner: false };
      const deleted = await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
        row.claim_id,
      ]);
      if ((deleted.rowCount ?? 0) > 0) return { recovered: true, needsOwner: false };
      return { recovered: false, needsOwner: true };
    });
  });
}

async function acquireHeavy(pool, input) {
  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const occupying = new Set(input.occupyingJobIds ?? []);

  return withTx(pool, async (client) => {
    await ensureTable(client);
    return withAdvisory(client, HEAVY_ADVISORY, async () => {
      const { rows: staleRows } = await client.query(
        `SELECT claim_id, job_id, heartbeat_at FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1 FOR UPDATE`,
      );
      const staleRow = staleRows[0];
      let recoveredStale = false;
      if (staleRow) {
        const heartbeatIso = staleRow.heartbeat_at.toISOString();
        const stale = isStale(heartbeatIso, nowMs, HEARTBEAT_STALE_MS);
        const mayRecover =
          Boolean(input.viewsAuthoritative) || stale || occupying.size > 0;
        if (!occupying.has(staleRow.job_id) && mayRecover) {
          const deleted = await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
            staleRow.claim_id,
          ]);
          recoveredStale = (deleted.rowCount ?? 0) > 0;
        }
      }
      const { rows } = await client.query(
        `SELECT claim_id, job_id, campaign_id, claimed_at, heartbeat_at
         FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1 FOR UPDATE`,
      );
      const existing = rows[0];
      if (existing?.job_id === input.jobId) {
        await client.query(
          `UPDATE studio_lane_claims SET heartbeat_at = $2::timestamptz WHERE claim_id = $1`,
          [existing.claim_id, now],
        );
        return {
          ok: true,
          record: {
            jobId: existing.job_id,
            campaignId: existing.campaign_id,
            claimedAt: existing.claimed_at.toISOString(),
            heartbeatAt: now,
          },
          recoveredStale,
        };
      }
      if (existing) {
        return { ok: false, reason: "held_by_other", heldBy: existing.job_id };
      }
      const record = {
        jobId: input.jobId,
        campaignId: input.campaignId,
        claimedAt: now,
        heartbeatAt: now,
      };
      await client.query(
        `INSERT INTO studio_lane_claims (claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at)
         VALUES ('heavy:singleton', 'heavy', $1, $2, $3::timestamptz, $4::timestamptz)`,
        [input.jobId, input.campaignId, now, now],
      );
      return { ok: true, record, recoveredStale };
    });
  });
}

async function releaseHeavy(pool, input) {
  return withTx(pool, async (client) => {
    await ensureTable(client);
    return withAdvisory(client, HEAVY_ADVISORY, async () => {
      const { rows } = await client.query(
        `SELECT claim_id, job_id FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1 FOR UPDATE`,
      );
      const row = rows[0];
      if (!row) return true;
      if (row.job_id !== input.jobId) return false;
      await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [row.claim_id]);
      return true;
    });
  });
}
