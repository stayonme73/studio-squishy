/**
 * Durable Heavy occupancy lock. occupy() in memory is not enough.
 * Exclusive file create decides the race. Failure must not deadlock the lane.
 */

import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "fs";
import path from "path";

import { studioCapacity100OrderHardeningV1 as pack } from "@/config/studio-capacity-100-order-hardening-v1";

import {
  acquireHeavyOccupancyClaimPostgres,
  heavyOccupancyClaimNeedsOwnerPostgres,
  readHeavyOccupancyClaimPostgres,
  recoverStaleHeavyOccupancyClaimPostgres,
  releaseHeavyOccupancyClaimPostgres,
  shouldUsePostgresLaneClaims,
} from "./postgres-lane-claims";
import {
  syncAcquireHeavyOccupancyClaim,
  syncReadHeavyOccupancyClaim,
  syncRecoverStaleHeavyOccupancyClaim,
  syncReleaseHeavyOccupancyClaim,
} from "./postgres-lane-sync-bridge";

export const HEAVY_OCCUPANCY_LOCK_REL =
  "data/studio-lane-occupancy/heavy.lock.json" as const;

export type HeavyOccupancyLockRecord = {
  jobId: string;
  campaignId: string;
  claimedAt: string;
  heartbeatAt: string;
};

export type AcquireHeavyOccupancyResult =
  | { ok: true; record: HeavyOccupancyLockRecord; recoveredStale: boolean }
  | {
      ok: false;
      reason: "held_by_other" | "deadlock_needs_owner";
      heldBy?: string;
    };

function lockAbs(repoRoot: string): string {
  return path.join(repoRoot, HEAVY_OCCUPANCY_LOCK_REL);
}

export async function readHeavyOccupancyLockAsync(
  repoRoot: string,
): Promise<HeavyOccupancyLockRecord | null> {
  if (shouldUsePostgresLaneClaims()) {
    return readHeavyOccupancyClaimPostgres();
  }
  return readHeavyOccupancyLock(repoRoot);
}

export function readHeavyOccupancyLock(
  repoRoot: string,
): HeavyOccupancyLockRecord | null {
  if (shouldUsePostgresLaneClaims()) {
    return syncReadHeavyOccupancyClaim();
  }
  const abs = lockAbs(repoRoot);
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as HeavyOccupancyLockRecord;
    if (!parsed?.jobId || !parsed.campaignId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLockAtomic(abs: string, record: HeavyOccupancyLockRecord): boolean {
  mkdirSync(path.dirname(abs), { recursive: true });
  try {
    const fd = openSync(abs, "wx");
    try {
      writeSync(fd, `${JSON.stringify(record, null, 2)}\n`, null, "utf8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EEXIST" ? false : false;
  }
}

function unlinkLock(abs: string): boolean {
  try {
    unlinkSync(abs);
    return true;
  } catch {
    return false;
  }
}

function isHeartbeatStale(record: HeavyOccupancyLockRecord, nowMs: number): boolean {
  const beat = Date.parse(record.heartbeatAt || record.claimedAt);
  if (!Number.isFinite(beat)) return true;
  return nowMs - beat > pack.occupancyMs.heartbeatStaleMs;
}

export async function recoverStaleHeavyOccupancyLockAsync(input: {
  repoRoot: string;
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  nowMs?: number;
}): Promise<{ recovered: boolean; needsOwner: boolean }> {
  if (shouldUsePostgresLaneClaims()) {
    return recoverStaleHeavyOccupancyClaimPostgres({
      occupyingJobIds: input.occupyingJobIds,
      viewsAuthoritative: input.viewsAuthoritative,
      nowMs: input.nowMs,
    });
  }
  return recoverStaleHeavyOccupancyLock(input);
}

export function recoverStaleHeavyOccupancyLock(input: {
  repoRoot: string;
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  nowMs?: number;
}): { recovered: boolean; needsOwner: boolean } {
  if (shouldUsePostgresLaneClaims()) {
    return syncRecoverStaleHeavyOccupancyClaim({
      occupyingJobIds: input.occupyingJobIds,
      viewsAuthoritative: input.viewsAuthoritative,
      nowMs: input.nowMs,
    });
  }
  const abs = lockAbs(input.repoRoot);
  const existing = readHeavyOccupancyLock(input.repoRoot);
  if (!existing) {
    if (existsSync(abs) && unlinkLock(abs)) {
      return { recovered: true, needsOwner: false };
    }
    if (existsSync(abs)) return { recovered: false, needsOwner: true };
    return { recovered: false, needsOwner: false };
  }

  const occupying = new Set(input.occupyingJobIds ?? []);
  const nowMs = input.nowMs ?? Date.now();
  const ownerOccupying = occupying.has(existing.jobId);
  if (ownerOccupying) return { recovered: false, needsOwner: false };

  const stale = isHeartbeatStale(existing, nowMs);
  const mayRecover =
    Boolean(input.viewsAuthoritative) || stale || occupying.size > 0;
  if (!mayRecover) return { recovered: false, needsOwner: false };
  if (unlinkLock(abs)) return { recovered: true, needsOwner: false };
  return { recovered: false, needsOwner: true };
}

export async function acquireHeavyOccupancyLockAsync(input: {
  repoRoot: string;
  jobId: string;
  campaignId: string;
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  now?: string;
}): Promise<AcquireHeavyOccupancyResult> {
  if (shouldUsePostgresLaneClaims()) {
    return acquireHeavyOccupancyClaimPostgres({
      jobId: input.jobId,
      campaignId: input.campaignId,
      occupyingJobIds: input.occupyingJobIds,
      viewsAuthoritative: input.viewsAuthoritative,
      now: input.now,
    });
  }
  return acquireHeavyOccupancyLock(input);
}

export function acquireHeavyOccupancyLock(input: {
  repoRoot: string;
  jobId: string;
  campaignId: string;
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  now?: string;
}): AcquireHeavyOccupancyResult {
  if (shouldUsePostgresLaneClaims()) {
    return syncAcquireHeavyOccupancyClaim({
      jobId: input.jobId,
      campaignId: input.campaignId,
      occupyingJobIds: input.occupyingJobIds,
      viewsAuthoritative: input.viewsAuthoritative,
      now: input.now,
    });
  }
  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const recovered = recoverStaleHeavyOccupancyLock({
    repoRoot: input.repoRoot,
    occupyingJobIds: input.occupyingJobIds,
    viewsAuthoritative: input.viewsAuthoritative,
    nowMs: Number.isFinite(nowMs) ? nowMs : Date.now(),
  });
  if (recovered.needsOwner) {
    return { ok: false, reason: "deadlock_needs_owner" };
  }

  const existing = readHeavyOccupancyLock(input.repoRoot);
  if (existing?.jobId === input.jobId) {
    const next = { ...existing, heartbeatAt: now };
    writeFileSync(lockAbs(input.repoRoot), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return { ok: true, record: next, recoveredStale: recovered.recovered };
  }
  if (existing) {
    return { ok: false, reason: "held_by_other", heldBy: existing.jobId };
  }

  const record: HeavyOccupancyLockRecord = {
    jobId: input.jobId,
    campaignId: input.campaignId,
    claimedAt: now,
    heartbeatAt: now,
  };
  if (writeLockAtomic(lockAbs(input.repoRoot), record)) {
    return { ok: true, record, recoveredStale: recovered.recovered };
  }

  const raced = readHeavyOccupancyLock(input.repoRoot);
  if (raced?.jobId === input.jobId) {
    return { ok: true, record: raced, recoveredStale: recovered.recovered };
  }
  if (raced) {
    return { ok: false, reason: "held_by_other", heldBy: raced.jobId };
  }
  return { ok: false, reason: "deadlock_needs_owner" };
}

export async function releaseHeavyOccupancyLockAsync(input: {
  repoRoot: string;
  jobId: string;
}): Promise<boolean> {
  if (shouldUsePostgresLaneClaims()) {
    return releaseHeavyOccupancyClaimPostgres({ jobId: input.jobId });
  }
  return releaseHeavyOccupancyLock(input);
}

export function releaseHeavyOccupancyLock(input: {
  repoRoot: string;
  jobId: string;
}): boolean {
  if (shouldUsePostgresLaneClaims()) {
    return syncReleaseHeavyOccupancyClaim({ jobId: input.jobId });
  }
  const existing = readHeavyOccupancyLock(input.repoRoot);
  if (!existing) return true;
  if (existing.jobId !== input.jobId) return false;
  return unlinkLock(lockAbs(input.repoRoot));
}

export async function heavyOccupancyLockNeedsOwnerAsync(repoRoot: string): Promise<boolean> {
  if (shouldUsePostgresLaneClaims()) {
    return heavyOccupancyClaimNeedsOwnerPostgres();
  }
  return heavyOccupancyLockNeedsOwner(repoRoot);
}

export function heavyOccupancyLockNeedsOwner(repoRoot: string): boolean {
  if (shouldUsePostgresLaneClaims()) {
    void repoRoot;
    return false;
  }
  const abs = lockAbs(repoRoot);
  if (!existsSync(abs)) return false;
  return readHeavyOccupancyLock(repoRoot) === null;
}
