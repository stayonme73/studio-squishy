import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { writeCampaignEnvelope } from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import {
  listTasksEnvelopes,
  readTasksEnvelope,
  writeTasksEnvelope,
} from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  readMaterialsEnvelope,
  writeMaterialsEnvelope,
} from "@/lib/materials/store";
import type { ServerMaterialsEnvelope } from "@/lib/materials/types";
import {
  readCheckoutSessionBinding,
  readProcessedPaymentEvent,
  writeCheckoutSessionBinding,
  writeProcessedPaymentEvent,
} from "@/lib/studio-payment/events-store";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";

const ENV = { ...process.env };
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const FS_DECOY_ID = "disposable-persistence-fs-decoy-only";

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
}

function disposableCampaignId(suffix: string): string {
  return `disposable-persistence-${Date.now()}-${suffix}`;
}

function minimalCampaignEnvelope(campaignId: string): ServerCampaignEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    clientUserId: "client-disposable",
    syncVersion: 1,
    syncedAt: now,
    record: {
      campaignId,
      campaignStatus: "active",
      updatedAt: now,
    },
  };
}

function minimalTasksEnvelope(campaignId: string, fingerprint: string): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    syncedAt: now,
    planFingerprint: fingerprint,
    tasks: [],
    updatedAt: now,
    version: 12,
    jobRecords: [],
  };
}

function minimalMaterialsEnvelope(
  campaignId: string,
  marker: string,
): ServerMaterialsEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    syncedAt: now,
    updatedAt: now,
    version: 1,
    items: [
      {
        id: `mat-${marker}`,
        label: "Disposable logo",
        reason: "Integration probe",
        category: "logo-brand",
        requirementLevel: "optional",
        reviewStatus: "not_needed",
        uploadStatus: "none",
        relatedServiceIds: [],
        contentKind: "text",
        text: marker,
      },
    ],
  };
}

async function cleanupDisposablePersistenceRows(): Promise<void> {
  useTestPostgresEnv();
  const { getStudioPostgresPool, resetStudioPostgresPoolForTests } = await import(
    "./postgres-pool"
  );
  const pool = getStudioPostgresPool();
  await pool.query(
    `DELETE FROM studio_payment_events
     WHERE event_id LIKE 'disposable-persistence-%'
        OR campaign_id LIKE 'disposable-persistence-%'`,
  );
  await pool.query(
    `DELETE FROM studio_payment_sessions
     WHERE checkout_session_id LIKE 'cs_disposable_%'
        OR campaign_id LIKE 'disposable-persistence-%'`,
  );
  await pool.query(`DELETE FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-%'`);
  await resetStudioPostgresPoolForTests();
}

afterEach(async () => {
  process.env = { ...ENV };
  vi.resetModules();
  await fs.rm(path.join(TASKS_DIR, `${FS_DECOY_ID}.json`), { force: true }).catch(() => undefined);
  try {
    await cleanupDisposablePersistenceRows();
  } catch {
    // Pool may be torn down after module reset.
  }
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "STUDIO-DURABLE-PERSISTENCE-INTEGRATION-2 store paths",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Integration target verification failed: ${verification.reason}`);
      }
    });

    it("listTasksEnvelopes uses Postgres only (ignores filesystem decoy)", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("list-tasks");

      await fs.mkdir(TASKS_DIR, { recursive: true });
      const decoyNow = new Date().toISOString();
      await fs.writeFile(
        path.join(TASKS_DIR, `${FS_DECOY_ID}.json`),
        JSON.stringify({
          campaignId: FS_DECOY_ID,
          syncedAt: decoyNow,
          planFingerprint: "filesystem-decoy",
          tasks: [],
          updatedAt: decoyNow,
          version: 1,
        }),
        "utf8",
      );

      await writeCampaignEnvelope(minimalCampaignEnvelope(campaignId));
      await writeTasksEnvelope(minimalTasksEnvelope(campaignId, "postgres-list-marker"));

      const listed = await listTasksEnvelopes();
      const ids = listed.map((row) => row.campaignId);
      expect(ids).toContain(campaignId);
      expect(ids).not.toContain(FS_DECOY_ID);
      const row = listed.find((entry) => entry.campaignId === campaignId);
      expect(row?.planFingerprint).toBe("postgres-list-marker");
    });

    it("materials store write, update, and reconnect read", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("materials");

      await writeCampaignEnvelope(minimalCampaignEnvelope(campaignId));
      await writeMaterialsEnvelope(minimalMaterialsEnvelope(campaignId, "v1"));

      const updated = minimalMaterialsEnvelope(campaignId, "v2");
      updated.version = 2;
      await writeMaterialsEnvelope(updated);

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const read = await readMaterialsEnvelope(campaignId);
      expect(read?.version).toBe(2);
      expect(read?.items[0]?.text).toBe("v2");
    });

    it("materials write fails when campaign row is missing", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("materials-orphan");

      await expect(
        writeMaterialsEnvelope(minimalMaterialsEnvelope(campaignId, "orphan")),
      ).rejects.toThrow(/must exist before writing materials/);
    });

    it("payment events and checkout bindings are idempotent across reconnect", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("payments");
      const eventId = `disposable-persistence-event-${Date.now()}`;
      const sessionId = `cs_disposable_${Date.now()}`;
      const t1 = new Date().toISOString();
      const t2 = new Date(Date.now() + 1000).toISOString();

      await writeCampaignEnvelope(minimalCampaignEnvelope(campaignId));

      await writeProcessedPaymentEvent({
        eventId,
        campaignId,
        checkoutSessionId: sessionId,
        processedAt: t1,
        kind: "sandbox",
      });
      await writeProcessedPaymentEvent({
        eventId,
        campaignId,
        checkoutSessionId: sessionId,
        processedAt: t2,
        kind: "reconcile",
      });

      await writeCheckoutSessionBinding({
        checkoutSessionId: sessionId,
        campaignId,
        expectedAmountCents: 1000,
        currency: "usd",
        selectedServiceIds: ["sm-001-monthly"],
        decisionId: "dec-disposable",
        factFingerprint: "fp-1",
        draftRevision: 1,
        createdAt: t1,
        sandbox: true,
      });
      await writeCheckoutSessionBinding({
        checkoutSessionId: sessionId,
        campaignId,
        expectedAmountCents: 2500,
        currency: "usd",
        selectedServiceIds: ["sm-001-monthly"],
        decisionId: "dec-disposable",
        factFingerprint: "fp-2",
        draftRevision: 2,
        createdAt: t2,
        sandbox: true,
      });

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const event = await readProcessedPaymentEvent(eventId);
      expect(event?.processedAt).toBe(t2);
      expect(event?.kind).toBe("reconcile");

      const session = await readCheckoutSessionBinding(sessionId);
      expect(session?.expectedAmountCents).toBe(2500);
      expect(session?.draftRevision).toBe(2);
    });

    it("tasks store read survives reconnect after writeCampaignEnvelope + writeTasksEnvelope", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("store-tasks");

      await writeCampaignEnvelope(minimalCampaignEnvelope(campaignId));
      await writeTasksEnvelope(minimalTasksEnvelope(campaignId, "store-io-fp"));

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const read = await readTasksEnvelope(campaignId);
      expect(read?.planFingerprint).toBe("store-io-fp");
    });

    it("leaves no disposable payment or campaign rows after cleanup", async () => {
      useTestPostgresEnv();
      const { getStudioPostgresPool } = await import("./postgres-pool");
      const pool = getStudioPostgresPool();
      const campaigns = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-%'`,
      );
      const events = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_payment_events
         WHERE event_id LIKE 'disposable-persistence-%' OR campaign_id LIKE 'disposable-persistence-%'`,
      );
      const sessions = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_payment_sessions
         WHERE checkout_session_id LIKE 'cs_disposable_%' OR campaign_id LIKE 'disposable-persistence-%'`,
      );
      expect(campaigns.rows[0]?.n).toBe(0);
      expect(events.rows[0]?.n).toBe(0);
      expect(sessions.rows[0]?.n).toBe(0);
    });
  },
);
