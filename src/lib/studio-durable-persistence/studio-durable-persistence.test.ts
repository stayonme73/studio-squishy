import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  isPostgresPersistenceEnabled,
  resolveStudioPersistenceBackend,
} from "@/config/studio-durable-persistence-v1";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";

const ENV = { ...process.env };

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
}

afterEach(() => {
  process.env = { ...ENV };
  vi.resetModules();
});

describe("STUDIO-DURABLE-PERSISTENCE-IMPLEMENT-1 config", () => {
  it("defaults to filesystem when backend unset", () => {
    delete process.env.STUDIO_PERSISTENCE_BACKEND;
    expect(resolveStudioPersistenceBackend(process.env)).toBe("filesystem");
    expect(isPostgresPersistenceEnabled(process.env)).toBe(false);
  });

  it("requires DATABASE_URL when postgres backend is selected", () => {
    process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
    delete process.env.DATABASE_URL;
    delete process.env.STUDIO_DATABASE_URL;
    delete process.env.SUPABASE_DB_URL;
    expect(isPostgresPersistenceEnabled(process.env)).toBe(false);
  });

  it("enables postgres only when backend and url are both present", () => {
    process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
    process.env.STUDIO_DATABASE_URL = "postgresql://example.test/studio";
    expect(isPostgresPersistenceEnabled(process.env)).toBe(true);
  });
});

describe("STUDIO-DURABLE-PERSISTENCE-INTEGRATION-1 target verification", () => {
  it("rejects missing test project ref", () => {
    const result = verifyStudioPersistenceTestTarget({
      STUDIO_PERSISTENCE_TEST_DATABASE_URL:
        "postgresql://postgres.abc123:secret@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts matching pooler ref", () => {
    const result = verifyStudioPersistenceTestTarget({
      STUDIO_PERSISTENCE_TEST_DATABASE_URL:
        "postgresql://postgres.abc123:secret@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
      STUDIO_PERSISTENCE_TEST_PROJECT_REF: "abc123",
      STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF: "prod999",
    });
    expect(result.ok).toBe(true);
    expect(result.projectRef).toBe("abc123");
  });

  it("rejects when URL ref matches forbidden production ref", () => {
    const result = verifyStudioPersistenceTestTarget({
      STUDIO_PERSISTENCE_TEST_DATABASE_URL:
        "postgresql://postgres.prod999:secret@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
      STUDIO_PERSISTENCE_TEST_PROJECT_REF: "prod999",
      STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF: "prod999",
    });
    expect(result.ok).toBe(false);
  });
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "Postgres spine (disposable integration)",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Integration target verification failed: ${verification.reason}`);
      }
    });

    afterEach(async () => {
      useTestPostgresEnv();
      const { getStudioPostgresPool, resetStudioPostgresPoolForTests } = await import(
        "./postgres-pool"
      );
      await getStudioPostgresPool().query(
        `DELETE FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-%'`,
      );
      await resetStudioPostgresPoolForTests();
    });

    it("writes and reads campaign spine bundle transactionally", async () => {
      useTestPostgresEnv();
      const campaignId = `disposable-persistence-${Date.now()}-bundle`;

      const { pgWriteCampaignSpineBundle, pgReadCampaignEnvelope, pgReadTasksEnvelope } =
        await import("./postgres-spine");

      const now = new Date().toISOString();
      const campaign = {
        campaignId,
        clientUserId: "client-disposable",
        syncVersion: 1,
        syncedAt: now,
        record: {
          campaignId,
          campaignStatus: "active" as const,
          updatedAt: now,
        },
      };
      const tasks = {
        campaignId,
        syncedAt: now,
        planFingerprint: "disposable-fp",
        tasks: [],
        updatedAt: now,
        version: 12,
        jobRecords: [],
      };

      await pgWriteCampaignSpineBundle({ campaign, tasks });

      const readCampaign = await pgReadCampaignEnvelope(campaignId);
      const readTasks = await pgReadTasksEnvelope(campaignId);
      expect(readCampaign?.campaignId).toBe(campaignId);
      expect(readTasks?.planFingerprint).toBe("disposable-fp");
    });

    it("survives pool reset (database reconnection)", async () => {
      useTestPostgresEnv();
      const campaignId = `disposable-persistence-${Date.now()}-reconnect`;

      const { pgWriteCampaignSpineBundle, pgReadCampaignEnvelope, pgReadTasksEnvelope } =
        await import("./postgres-spine");
      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");

      const now = new Date().toISOString();
      await pgWriteCampaignSpineBundle({
        campaign: {
          campaignId,
          clientUserId: "client-disposable",
          syncVersion: 2,
          syncedAt: now,
          record: {
            campaignId,
            campaignStatus: "active" as const,
            updatedAt: now,
          },
        },
        tasks: {
          campaignId,
          syncedAt: now,
          planFingerprint: "reconnect-fp",
          tasks: [],
          updatedAt: now,
          version: 3,
          jobRecords: [],
        },
      });

      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const readCampaign = await pgReadCampaignEnvelope(campaignId);
      const readTasks = await pgReadTasksEnvelope(campaignId);
      expect(readCampaign?.syncVersion).toBe(2);
      expect(readTasks?.planFingerprint).toBe("reconnect-fp");
    });

    it("rolls back failed transactions (no partial campaign row)", async () => {
      useTestPostgresEnv();
      const campaignId = `disposable-persistence-${Date.now()}-rollback`;

      const { pgReadCampaignEnvelope, pgReadTasksEnvelope } = await import("./postgres-spine");
      const { withPostgresTransaction } = await import("./postgres-pool");

      const now = new Date().toISOString();
      const envelope = {
        campaignId,
        clientUserId: "client-disposable",
        syncVersion: 1,
        syncedAt: now,
        record: {
          campaignId,
          campaignStatus: "active" as const,
          updatedAt: now,
        },
      };

      await expect(
        withPostgresTransaction(async (client) => {
          await client.query(
            `INSERT INTO studio_campaigns (campaign_id, client_user_id, sync_version, synced_at, envelope, updated_at)
             VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
            [
              envelope.campaignId,
              envelope.clientUserId,
              envelope.syncVersion,
              envelope.syncedAt,
              JSON.stringify(envelope),
            ],
          );
          throw new Error("disposable rollback probe");
        }),
      ).rejects.toThrow(/disposable rollback probe/);

      expect(await pgReadCampaignEnvelope(campaignId)).toBeNull();
      expect(await pgReadTasksEnvelope(campaignId)).toBeNull();
    });

    it("rolls back spine bundle when a follow-up statement fails", async () => {
      useTestPostgresEnv();
      const campaignId = `disposable-persistence-${Date.now()}-bundle-rollback`;

      const { pgReadCampaignEnvelope, pgReadTasksEnvelope } = await import("./postgres-spine");
      const { withPostgresTransaction, withCampaignPgAdvisoryLock } = await import(
        "./postgres-pool"
      );

      const now = new Date().toISOString();
      await expect(
        withPostgresTransaction(async (client) => {
          await withCampaignPgAdvisoryLock(client, campaignId, async () => {
            await client.query(
              `INSERT INTO studio_campaigns (campaign_id, client_user_id, sync_version, synced_at, envelope, updated_at)
               VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
              [
                campaignId,
                "client-disposable",
                1,
                now,
                JSON.stringify({
                  campaignId,
                  syncVersion: 1,
                  syncedAt: now,
                  record: { campaignId, campaignStatus: "active", updatedAt: now },
                }),
              ],
            );
            await client.query(`INSERT INTO studio_campaign_tasks (campaign_id) VALUES ($1)`, [
              campaignId,
            ]);
          });
        }),
      ).rejects.toThrow();

      expect(await pgReadCampaignEnvelope(campaignId)).toBeNull();
      expect(await pgReadTasksEnvelope(campaignId)).toBeNull();
    });

    it("leaves no disposable campaign rows after cleanup", async () => {
      useTestPostgresEnv();
      const { getStudioPostgresPool } = await import("./postgres-pool");
      const result = await getStudioPostgresPool().query(
        `SELECT COUNT(*)::int AS n FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-%'`,
      );
      expect(result.rows[0]?.n).toBe(0);
    });
  },
);
