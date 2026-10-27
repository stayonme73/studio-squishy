/**
 * Quick-lane admission. Capacity stays at the coded lane cap (two).
 * A slot is held by production evidence or by a reservation written in the
 * same exclusive section as the capacity check.
 */

import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { studioCapacity100OrderHardeningV1 } from "@/config/studio-capacity-100-order-hardening-v1";

import {
  admitQuickLaneProductionPostgres,
  reconcileQuickLaneClaimsPostgres,
  releaseQuickLaneClaimPostgres,
  shouldUsePostgresLaneClaims,
} from "./postgres-lane-claims";
import {
  syncAdmitQuickLaneProduction,
  syncReconcileQuickLaneClaims,
  syncReleaseQuickLaneClaim,
} from "./postgres-lane-sync-bridge";

export const QUICK_LANE_RESERVATION_DIR = "data/studio-lane-occupancy/quick";
export const QUICK_LANE_ADMISSION_LOCK = "data/studio-lane-occupancy/quick.admission.lock";

const LOCK_WAIT_MS = 4_000;
const STALE_LOCK_MS = 15_000;

type QuickLaneReservation = {
  jobId: string;
  campaignId: string;
  claimedAt: string;
  heartbeatAt: string;
};

export type QuickLaneAdmission =
  | { ok: true; heldBy: "evidence" | "reservation" }
  | { ok: false; reason: "lane_full" | "admission_lock_unavailable" };

function reservationFileName(jobId: string): string {
  return `${encodeURIComponent(jobId)}.json`;
}

/** Desk/local filesystem locks. Vercel uses Postgres claims when persistence is enabled. */
function laneOccupancyRoot(repoRoot: string): string {
  return path.join(repoRoot, "data/studio-lane-occupancy");
}

function quickLaneDir(repoRoot: string): string {
  return path.join(laneOccupancyRoot(repoRoot), "quick");
}

function reservationPath(repoRoot: string, jobId: string): string {
  return path.join(quickLaneDir(repoRoot), reservationFileName(jobId));
}

function sleepMs(ms: number): void {
  const gate = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(gate, 0, 0, ms);
}

function readReservation(abs: string): QuickLaneReservation | null {
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as Partial<QuickLaneReservation>;
    if (!parsed.jobId || !parsed.heartbeatAt) return null;
    return {
      jobId: parsed.jobId,
      campaignId: parsed.campaignId ?? "",
      claimedAt: parsed.claimedAt ?? parsed.heartbeatAt,
      heartbeatAt: parsed.heartbeatAt,
    };
  } catch {
    return null;
  }
}

function withAdmissionLock<T>(repoRoot: string, nowMs: number, work: () => T): T | "admission_lock_unavailable" {
  const lockAbs = path.join(laneOccupancyRoot(repoRoot), "quick.admission.lock");
  mkdirSync(path.dirname(lockAbs), { recursive: true });
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const fd = openSync(lockAbs, "wx");
      closeSync(fd);
      try {
        return work();
      } finally {
        try {
          unlinkSync(lockAbs);
        } catch {
          /* The next admission recovers a leftover lock. */
        }
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "EPERM") throw error;
      try {
        const stat = statSync(lockAbs);
        if (nowMs - stat.mtimeMs > STALE_LOCK_MS) unlinkSync(lockAbs);
      } catch {
        /* Another admission removed or replaced the lock. */
      }
      sleepMs(20);
    }
  }
  return "admission_lock_unavailable";
}

function listReservationFiles(repoRoot: string): string[] {
  const dir = quickLaneDir(repoRoot);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dir, name));
}

/**
 * Drop reservations that production evidence now covers, and reservations
 * whose heartbeat is older than the Studio occupancy window.
 * Does not delete campaign, task, or audit records.
 */
export async function reconcileQuickLaneReservationsAsync(input: {
  repoRoot?: string;
  evidenceJobIds: readonly string[];
  nowMs?: number;
  staleMs?: number;
}): Promise<{ released: string[] }> {
  if (shouldUsePostgresLaneClaims()) {
    return reconcileQuickLaneClaimsPostgres({
      evidenceJobIds: input.evidenceJobIds,
      nowMs: input.nowMs,
      staleMs: input.staleMs,
    });
  }
  return reconcileQuickLaneReservations(input);
}

export function reconcileQuickLaneReservations(input: {
  repoRoot?: string;
  evidenceJobIds: readonly string[];
  nowMs?: number;
  staleMs?: number;
}): { released: string[] } {
  if (shouldUsePostgresLaneClaims()) {
    return syncReconcileQuickLaneClaims({
      evidenceJobIds: input.evidenceJobIds,
      nowMs: input.nowMs,
      staleMs: input.staleMs,
    });
  }
  const repoRoot = input.repoRoot ?? process.cwd();
  const nowMs = input.nowMs ?? Date.now();
  const staleMs = input.staleMs ?? studioCapacity100OrderHardeningV1.occupancyMs.heartbeatStaleMs;
  const evidence = new Set(input.evidenceJobIds);
  const locked = withAdmissionLock(repoRoot, nowMs, () => {
    const released: string[] = [];
    for (const abs of listReservationFiles(repoRoot)) {
      const reservation = readReservation(abs);
      const heartbeatMs = reservation ? Date.parse(reservation.heartbeatAt) : statSync(abs).mtimeMs;
      const stale = !Number.isFinite(heartbeatMs) || nowMs - heartbeatMs > staleMs;
      const covered = reservation ? evidence.has(reservation.jobId) : false;
      if (covered || stale) {
        try {
          unlinkSync(abs);
          if (reservation) released.push(reservation.jobId);
        } catch {
          /* Already released. */
        }
      }
    }
    return released;
  });
  if (locked === "admission_lock_unavailable") return { released: [] };
  return { released: locked };
}

export async function admitQuickLaneProductionAsync(input: {
  repoRoot?: string;
  jobId: string;
  campaignId: string;
  evidenceJobIds: readonly string[];
  capacity?: number;
  now?: string;
  nowMs?: number;
  staleMs?: number;
}): Promise<QuickLaneAdmission> {
  if (shouldUsePostgresLaneClaims()) {
    return admitQuickLaneProductionPostgres({
      jobId: input.jobId,
      campaignId: input.campaignId,
      evidenceJobIds: input.evidenceJobIds,
      capacity: input.capacity,
      now: input.now,
      nowMs: input.nowMs,
      staleMs: input.staleMs,
    });
  }
  return admitQuickLaneProduction(input);
}

export function admitQuickLaneProduction(input: {
  repoRoot?: string;
  jobId: string;
  campaignId: string;
  evidenceJobIds: readonly string[];
  capacity?: number;
  now?: string;
  nowMs?: number;
  staleMs?: number;
}): QuickLaneAdmission {
  if (shouldUsePostgresLaneClaims()) {
    return syncAdmitQuickLaneProduction({
      jobId: input.jobId,
      campaignId: input.campaignId,
      evidenceJobIds: input.evidenceJobIds,
      capacity: input.capacity,
      now: input.now,
      nowMs: input.nowMs,
      staleMs: input.staleMs,
    });
  }
  const repoRoot = input.repoRoot ?? process.cwd();
  const capacity = input.capacity ?? OWNER_CONTROL_ROOM_SECTION.laneCapacity.quick;
  const nowMs = input.nowMs ?? Date.now();
  const now = input.now ?? new Date(nowMs).toISOString();
  const staleMs = input.staleMs ?? studioCapacity100OrderHardeningV1.occupancyMs.heartbeatStaleMs;
  const evidence = new Set(input.evidenceJobIds);

  const locked = withAdmissionLock(repoRoot, nowMs, () => {
    mkdirSync(quickLaneDir(repoRoot), { recursive: true });
    const holders = new Set(evidence);
    for (const abs of listReservationFiles(repoRoot)) {
      const reservation = readReservation(abs);
      const heartbeatMs = reservation ? Date.parse(reservation.heartbeatAt) : statSync(abs).mtimeMs;
      const stale = !Number.isFinite(heartbeatMs) || nowMs - heartbeatMs > staleMs;
      if (!reservation || stale || evidence.has(reservation.jobId)) {
        try {
          unlinkSync(abs);
        } catch {
          if (!stale && reservation && !evidence.has(reservation.jobId)) holders.add(reservation.jobId);
        }
        continue;
      }
      holders.add(reservation.jobId);
    }

    const target = reservationPath(repoRoot, input.jobId);
    if (evidence.has(input.jobId)) {
      return { ok: true as const, heldBy: "evidence" as const };
    }
    if (holders.has(input.jobId)) {
      const existing = readReservation(target);
      writeFileSync(
        target,
        JSON.stringify({
          jobId: input.jobId,
          campaignId: input.campaignId,
          claimedAt: existing?.claimedAt ?? now,
          heartbeatAt: now,
        } satisfies QuickLaneReservation),
      );
      return { ok: true as const, heldBy: "reservation" as const };
    }
    if (holders.size >= capacity) {
      return { ok: false as const, reason: "lane_full" as const };
    }
    writeFileSync(
      target,
      JSON.stringify({
        jobId: input.jobId,
        campaignId: input.campaignId,
        claimedAt: now,
        heartbeatAt: now,
      } satisfies QuickLaneReservation),
    );
    return { ok: true as const, heldBy: "reservation" as const };
  });

  if (locked === "admission_lock_unavailable") {
    return { ok: false, reason: "admission_lock_unavailable" };
  }
  return locked;
}

export async function releaseQuickLaneReservationAsync(input: {
  repoRoot?: string;
  jobId: string;
}): Promise<boolean> {
  if (shouldUsePostgresLaneClaims()) {
    return releaseQuickLaneClaimPostgres({ jobId: input.jobId });
  }
  return releaseQuickLaneReservation(input);
}

export function releaseQuickLaneReservation(input: {
  repoRoot?: string;
  jobId: string;
}): boolean {
  if (shouldUsePostgresLaneClaims()) {
    return syncReleaseQuickLaneClaim({ jobId: input.jobId });
  }
  const repoRoot = input.repoRoot ?? process.cwd();
  const abs = reservationPath(repoRoot, input.jobId);
  if (!existsSync(abs)) return false;
  const locked = withAdmissionLock(repoRoot, Date.now(), () => {
    if (!existsSync(abs)) return false;
    unlinkSync(abs);
    return true;
  });
  return locked === "admission_lock_unavailable" ? false : locked;
}

export function readQuickLaneReservationJobIds(repoRoot: string): string[] {
  const ids: string[] = [];
  for (const abs of listReservationFiles(repoRoot)) {
    const reservation = readReservation(abs);
    if (reservation) ids.push(reservation.jobId);
  }
  return ids;
}
