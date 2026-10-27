/**
 * Run async Postgres lane work from synchronous admission APIs (Owner desk patches).
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { QuickLaneAdmission } from "./quick-lane-admission";
import type { AcquireHeavyOccupancyResult } from "./heavy-occupancy-lock";

const WORKER = path.join(process.cwd(), "scripts", "postgres-lane-claim-worker.mjs");

function runWorker<T>(operation: string, payload: Record<string, unknown>): T {
  const dir = mkdtempSync(path.join(os.tmpdir(), "lane-claim-"));
  const inPath = path.join(dir, "in.json");
  const outPath = path.join(dir, "out.json");
  try {
    writeFileSync(inPath, JSON.stringify({ operation, payload }), "utf8");
    const result = spawnSync(process.execPath, [WORKER, inPath, outPath], {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      timeout: 30_000,
    });
    if (result.status !== 0) {
      throw new Error(
        `postgres lane worker failed (${operation}): ${result.stderr || result.stdout || result.status}`,
      );
    }
    const raw = readFileSync(outPath, "utf8");
    const parsed = JSON.parse(raw) as { ok: boolean; result?: T; error?: string };
    if (!parsed.ok) {
      throw new Error(parsed.error ?? `postgres lane worker error (${operation})`);
    }
    return parsed.result as T;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function syncReconcileQuickLaneClaims(payload: {
  evidenceJobIds: readonly string[];
  nowMs?: number;
  staleMs?: number;
}): { released: string[] } {
  return runWorker("reconcileQuick", payload);
}

export function syncAdmitQuickLaneProduction(payload: {
  jobId: string;
  campaignId: string;
  evidenceJobIds: readonly string[];
  capacity?: number;
  now?: string;
  nowMs?: number;
  staleMs?: number;
}): QuickLaneAdmission {
  return runWorker("admitQuick", payload);
}

export function syncReleaseQuickLaneClaim(payload: { jobId: string }): boolean {
  return runWorker("releaseQuick", payload);
}

export function syncAcquireHeavyOccupancyClaim(payload: {
  jobId: string;
  campaignId: string;
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  now?: string;
}): AcquireHeavyOccupancyResult {
  return runWorker("acquireHeavy", payload);
}

export function syncReleaseHeavyOccupancyClaim(payload: { jobId: string }): boolean {
  return runWorker("releaseHeavy", payload);
}

export function syncRecoverStaleHeavyOccupancyClaim(payload: {
  occupyingJobIds?: readonly string[];
  viewsAuthoritative?: boolean;
  nowMs?: number;
}): { recovered: boolean; needsOwner: boolean } {
  return runWorker("recoverHeavy", payload);
}

export function syncReadHeavyOccupancyClaim(): import("./heavy-occupancy-lock").HeavyOccupancyLockRecord | null {
  return runWorker("readHeavy", {});
}
