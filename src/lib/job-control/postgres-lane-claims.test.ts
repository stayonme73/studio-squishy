import { existsSync, readFileSync } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyStudioPersistenceTestTarget } from "@/lib/studio-durable-persistence/test-target-verify";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    process.env[k] ??= v;
  }
}
import {
  getStudioPostgresPool,
  resetStudioPostgresPoolForTests,
} from "@/lib/studio-durable-persistence/postgres-pool";

const ENV = { ...process.env };

afterEach(async () => {
  process.env = { ...ENV };
  await resetStudioPostgresPoolForTests();
  vi.resetModules();
});

describe.runIf(() => {
  loadEnvLocal();
  return Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL);
})("Postgres lane claims (hosted cert)", () => {
  function useHostedLaneEnv(): void {
    loadEnvLocal();
    const verification = verifyStudioPersistenceTestTarget(process.env);
    if (!verification.ok) {
      throw new Error(verification.message ?? "Test Postgres target rejected");
    }
    process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
    process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
    process.env.VERCEL = "1";
  }

  beforeEach(async () => {
    useHostedLaneEnv();
    const { ensureStudioLaneClaimsTable } = await import("./postgres-lane-claims");
    await ensureStudioLaneClaimsTable();
    const pool = getStudioPostgresPool();
    await pool.query(`DELETE FROM studio_lane_claims WHERE lane IN ('quick', 'heavy')`);
  });

    it("allows only one heavy claim across concurrent transactions", async () => {
      const {
        acquireHeavyOccupancyClaimPostgres,
        ensureStudioLaneClaimsTable,
        releaseHeavyOccupancyClaimPostgres,
      } = await import("./postgres-lane-claims");

      await ensureStudioLaneClaimsTable();
      await releaseHeavyOccupancyClaimPostgres({ jobId: "camp-a:v2-rtu-clip-repurposing" });
      await releaseHeavyOccupancyClaimPostgres({ jobId: "camp-b:v2-rtu-short-form-video-edit" });

      const fixedNow = "2026-10-27T12:00:00.000Z";
      const nowMs = Date.parse(fixedNow);

      const [first, second] = await Promise.all([
        acquireHeavyOccupancyClaimPostgres({
          jobId: "camp-a:v2-rtu-clip-repurposing",
          campaignId: "camp-a",
          now: fixedNow,
          nowMs,
        }),
        acquireHeavyOccupancyClaimPostgres({
          jobId: "camp-b:v2-rtu-short-form-video-edit",
          campaignId: "camp-b",
          now: fixedNow,
          nowMs,
        }),
      ]);

      const wins = [first, second].filter((r) => r.ok);
      expect(wins).toHaveLength(1);
      const loss = [first, second].find((r) => !r.ok);
      expect(loss?.ok).toBe(false);
      if (loss && !loss.ok) expect(loss.reason).toBe("held_by_other");

      await releaseHeavyOccupancyClaimPostgres({
        jobId: wins[0]!.ok ? wins[0]!.record.jobId : "",
      });
    });

    it("enforces quick lane capacity of two in Postgres", async () => {
      const {
        admitQuickLaneProductionPostgres,
        ensureStudioLaneClaimsTable,
        releaseQuickLaneClaimPostgres,
      } = await import("./postgres-lane-claims");

      await ensureStudioLaneClaimsTable();
      const fixedNow = "2026-10-27T12:00:00.000Z";
      const nowMs = Date.parse(fixedNow);
      const testJobIds = [
        "postgres-lane-claims-test-j1",
        "postgres-lane-claims-test-j2",
        "postgres-lane-claims-test-j3",
      ];
      for (const jobId of testJobIds) {
        await releaseQuickLaneClaimPostgres({ jobId });
      }

      const a = await admitQuickLaneProductionPostgres({
        jobId: testJobIds[0]!,
        campaignId: "postgres-lane-claims-test-c1",
        evidenceJobIds: [],
        capacity: 2,
        now: fixedNow,
        nowMs,
      });
      const b = await admitQuickLaneProductionPostgres({
        jobId: testJobIds[1]!,
        campaignId: "postgres-lane-claims-test-c2",
        evidenceJobIds: [],
        capacity: 2,
        now: fixedNow,
        nowMs,
      });
      const c = await admitQuickLaneProductionPostgres({
        jobId: testJobIds[2]!,
        campaignId: "postgres-lane-claims-test-c3",
        evidenceJobIds: [],
        capacity: 2,
        now: fixedNow,
        nowMs,
      });

      expect(a.ok).toBe(true);
      expect(b.ok).toBe(true);
      expect(c.ok).toBe(false);
      if (!c.ok) expect(c.reason).toBe("lane_full");

      await releaseQuickLaneClaimPostgres({ jobId: testJobIds[0]! });
      await releaseQuickLaneClaimPostgres({ jobId: testJobIds[1]! });
    });
  },
);
