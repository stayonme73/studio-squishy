/**
 * Durable quick/heavy lane claims for Vercel (Postgres). Desk keeps filesystem locks.
 */

import type { PoolClient } from "pg";

import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";
import { studioCapacity100OrderHardeningV1 } from "@/config/studio-capacity-100-order-hardening-v1";
import {
  getStudioPostgresPool,
  withPostgresTransaction,
} from "@/lib/studio-durable-persistence/postgres-pool";

import type { QuickLaneAdmission } from "./quick-lane-admission";
import type {
  AcquireHeavyOccupancyResult,
  HeavyOccupancyLockRecord,
} from "./heavy-occupancy-lock";

const QUICK_ADVISORY = "studio_lane_quick_admission";
const HEAVY_ADVISORY = "studio_lane_heavy_lock";

export function shouldUsePostgresLaneClaims(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(source.VERCEL) && isPostgresPersistenceEnabled(source);
}

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

let tableEnsured = false;

export async function ensureStudioLaneClaimsTable(): Promise<void> {
  if (tableEnsured) return;
  const pool = getStudioPostgresPool();
  await pool.query(ENSURE_TABLE_SQL);
  tableEnsured = true;
}

async function withLaneAdvisoryLock<T>(
  client: PoolClient,
  key: string,
  work: () => Promise<T>,
): Promise<T> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [key]);
  return work();
}

function claimIdForJob(lane: "quick" | "heavy", jobId: string): string {
  return `${lane}:${encodeURIComponent(jobId)}`;
}

function heavySingletonClaimId(): string {
  return "heavy:singleton";
}

type ClaimRow = {
  claim_id: string;
  lane: string;
  job_id: string;
  campaign_id: string;
  claimed_at: Date;
  heartbeat_at: Date;
};

function rowToHeavyRecord(row: ClaimRow): HeavyOccupancyLockRecord {
  return {
    jobId: row.job_id,
    campaignId: row.campaign_id,
    claimedAt: row.claimed_at.toISOString(),
    heartbeatAt: row.heartbeat_at.toISOString(),
  };
}

function isStaleHeartbeat(iso: string, nowMs: number, staleMs: number): boolean {
  const beat = Date.parse(iso);
  if (!Number.isFinite(beat)) return true;
  return nowMs - beat > staleMs;
}

export async function reconcileQuickLaneClaimsPostgres(input: {
  evidenceJobIds: readonly string[];
  nowMs?: number;
  staleMs?: number;
}): Promise<{ released: string[] }> {
  await ensureStudioLaneClaimsTable();
  const nowMs = input.nowMs ?? Date.now();
  const staleMs =
    input.staleMs ?? studioCapacity100OrderHardeningV1.occupancyMs.heartbeatStaleMs;
  const evidence = new Set(input.evidenceJobIds);

  return withPostgresTransaction(async (client) =>
    withLaneAdvisoryLock(client, QUICK_ADVISORY, async () => {
      const { rows } = await client.query<ClaimRow>(
        `SELECT claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at
         FROM studio_lane_claims WHERE lane = 'quick'`,
      );
      const released: string[] = [];
      for (const row of rows) {
        const heartbeatIso = row.heartbeat_at.toISOString();
        const stale = isStaleHeartbeat(heartbeatIso, nowMs, staleMs);
        const covered = evidence.has(row.job_id);
        if (covered || stale) {
          await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
            row.claim_id,
          ]);
          released.push(row.job_id);
        }
      }
      return { released };
    }),
  );
}

export async function admitQuickLaneProductionPostgres(input: {
  jobId: string;
  campaignId: string;
  evidenceJobIds: readonly string[];
  capacity?: number;
  now?: string;
  nowMs?: number;
  staleMs?: number;
}): Promise<QuickLaneAdmission> {
  await ensureStudioLaneClaimsTable();
  const capacity = input.capacity ?? OWNER_CONTROL_ROOM_SECTION.laneCapacity.quick;
  const nowMs = input.nowMs ?? Date.now();
  const now = input.now ?? new Date(nowMs).toISOString();
  const staleMs =
    input.staleMs ?? studioCapacity100OrderHardeningV1.occupancyMs.heartbeatStaleMs;
  const evidence = new Set(input.evidenceJobIds);

  return withPostgresTransaction(async (client) =>
    withLaneAdvisoryLock(client, QUICK_ADVISORY, async () => {
      const { rows } = await client.query<ClaimRow>(
        `SELECT claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at
         FROM studio_lane_claims WHERE lane = 'quick'`,
      );

      const holders = new Set<string>(evidence);
      for (const row of rows) {
        const heartbeatIso = row.heartbeat_at.toISOString();
        const stale = isStaleHeartbeat(heartbeatIso, nowMs, staleMs);
        if (stale || evidence.has(row.job_id)) {
          await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
            row.claim_id,
          ]);
          continue;
        }
        holders.add(row.job_id);
      }

      if (evidence.has(input.jobId)) {
        return { ok: true as const, heldBy: "evidence" as const };
      }

      const existing = rows.find((row) => row.job_id === input.jobId);
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
            existing?.claimed_at.toISOString() ?? now,
            now,
          ],
        );
        return { ok: true as const, heldBy: "reservation" as const };
      }

      if (holders.size >= capacity) {
        return { ok: false as const, reason: "lane_full" as const };
      }

      const claimId = claimIdForJob("quick", input.jobId);
      await client.query(
        `INSERT INTO studio_lane_claims (claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at)
         VALUES ($1, 'quick', $2, $3, $4::timestamptz, $5::timestamptz)`,
        [claimId, input.jobId, input.campaignId, now, now],
      );
      return { ok: true as const, heldBy: "reservation" as const };
    }),
  );
}

export async function releaseQuickLaneClaimPostgres(input: { jobId: string }): Promise<boolean> {
  await ensureStudioLaneClaimsTable();
  const claimId = claimIdForJob("quick", input.jobId);
  return withPostgresTransaction(async (client) =>
    withLaneAdvisoryLock(client, QUICK_ADVISORY, async () => {
      const result = await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
        claimId,
      ]);
      return (result.rowCount ?? 0) > 0;
    }),
  );
}

export async function readQuickLaneClaimJobIdsPostgres(): Promise<string[]> {
  await ensureStudioLaneClaimsTable();
  const pool = getStudioPostgresPool();
  const { rows } = await pool.query<{ job_id: string }>(
    `SELECT job_id FROM studio_lane_claims WHERE lane = 'quick'`,
  );
  return rows.map((row) => row.job_id);
}

export async function readHeavyOccupancyClaimPostgres(): Promise<HeavyOccupancyLockRecord | null> {
  await ensureStudioLaneClaimsTable();
  const pool = getStudioPostgresPool();
  const { rows } = await pool.query<ClaimRow>(
    `SELECT claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at
     FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1`,
  );
  const row = rows[0];
  return row ? rowToHeavyRecord(row) : null;
}

export async function recoverStaleHeavyOccupancyClaimPostgres(input: {
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  nowMs?: number;
}): Promise<{ recovered: boolean; needsOwner: boolean }> {
  await ensureStudioLaneClaimsTable();
  const nowMs = input.nowMs ?? Date.now();
  const staleMs = studioCapacity100OrderHardeningV1.occupancyMs.heartbeatStaleMs;
  const occupying = new Set(input.occupyingJobIds ?? []);

  return withPostgresTransaction(async (client) =>
    withLaneAdvisoryLock(client, HEAVY_ADVISORY, async () => {
      const { rows } = await client.query<ClaimRow>(
        `SELECT claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at
         FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1`,
      );
      const row = rows[0];
      if (!row) return { recovered: false, needsOwner: false };

      const record = rowToHeavyRecord(row);
      if (occupying.has(record.jobId)) {
        return { recovered: false, needsOwner: false };
      }

      const stale = isStaleHeartbeat(record.heartbeatAt, nowMs, staleMs);
      const mayRecover =
        Boolean(input.viewsAuthoritative) || stale || occupying.size > 0;
      if (!mayRecover) return { recovered: false, needsOwner: false };

      const deleted = await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
        row.claim_id,
      ]);
      if ((deleted.rowCount ?? 0) > 0) return { recovered: true, needsOwner: false };
      return { recovered: false, needsOwner: true };
    }),
  );
}

export async function acquireHeavyOccupancyClaimPostgres(input: {
  jobId: string;
  campaignId: string;
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  now?: string;
}): Promise<AcquireHeavyOccupancyResult> {
  await ensureStudioLaneClaimsTable();
  const now = input.now ?? new Date().toISOString();
  const nowMs = Number.isFinite(Date.parse(now)) ? Date.parse(now) : Date.now();
  const occupying = new Set(input.occupyingJobIds ?? []);
  const staleMs = studioCapacity100OrderHardeningV1.occupancyMs.heartbeatStaleMs;

  return withPostgresTransaction(async (client) =>
    withLaneAdvisoryLock(client, HEAVY_ADVISORY, async () => {
      const { rows: staleRows } = await client.query<ClaimRow>(
        `SELECT claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at
         FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1 FOR UPDATE`,
      );
      const staleRow = staleRows[0];
      let recoveredStale = false;
      if (staleRow) {
        const heartbeatIso = staleRow.heartbeat_at.toISOString();
        const stale = isStaleHeartbeat(heartbeatIso, nowMs, staleMs);
        const mayRecover =
          Boolean(input.viewsAuthoritative) || stale || occupying.size > 0;
        if (!occupying.has(staleRow.job_id) && mayRecover) {
          const deleted = await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [
            staleRow.claim_id,
          ]);
          recoveredStale = (deleted.rowCount ?? 0) > 0;
        }
      }

      const { rows } = await client.query<ClaimRow>(
        `SELECT claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at
         FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1 FOR UPDATE`,
      );
      const existing = rows[0];

      if (existing?.job_id === input.jobId) {
        const next = {
          ...rowToHeavyRecord(existing),
          heartbeatAt: now,
        };
        await client.query(
          `UPDATE studio_lane_claims SET heartbeat_at = $2::timestamptz WHERE claim_id = $1`,
          [existing.claim_id, now],
        );
        return {
          ok: true as const,
          record: next,
          recoveredStale,
        };
      }

      if (existing) {
        return {
          ok: false as const,
          reason: "held_by_other" as const,
          heldBy: existing.job_id,
        };
      }

      const claimId = heavySingletonClaimId();
      const record: HeavyOccupancyLockRecord = {
        jobId: input.jobId,
        campaignId: input.campaignId,
        claimedAt: now,
        heartbeatAt: now,
      };
      await client.query(
        `INSERT INTO studio_lane_claims (claim_id, lane, job_id, campaign_id, claimed_at, heartbeat_at)
         VALUES ($1, 'heavy', $2, $3, $4::timestamptz, $5::timestamptz)`,
        [claimId, input.jobId, input.campaignId, now, now],
      );
      return { ok: true as const, record, recoveredStale };
    }),
  );
}

export async function releaseHeavyOccupancyClaimPostgres(input: {
  jobId: string;
}): Promise<boolean> {
  await ensureStudioLaneClaimsTable();
  return withPostgresTransaction(async (client) =>
    withLaneAdvisoryLock(client, HEAVY_ADVISORY, async () => {
      const { rows } = await client.query<ClaimRow>(
        `SELECT claim_id, job_id FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1 FOR UPDATE`,
      );
      const row = rows[0];
      if (!row) return true;
      if (row.job_id !== input.jobId) return false;
      await client.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [row.claim_id]);
      return true;
    }),
  );
}

export async function heavyOccupancyClaimNeedsOwnerPostgres(): Promise<boolean> {
  await ensureStudioLaneClaimsTable();
  const pool = getStudioPostgresPool();
  const { rows } = await pool.query<{ claim_id: string; job_id: string | null }>(
    `SELECT claim_id, job_id FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1`,
  );
  const row = rows[0];
  if (!row) return false;
  return !row.job_id;
}
