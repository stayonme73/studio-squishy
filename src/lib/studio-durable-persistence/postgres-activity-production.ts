import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import type { ProjectActivityEnvelope } from "@/lib/project-activity/types";

import {
  getStudioPostgresPool,
  rowEnvelope,
  withCampaignPgAdvisoryLock,
  withPostgresTransaction,
} from "./postgres-pool";

async function assertCampaignRowExists(
  client: import("pg").PoolClient,
  campaignId: string,
  child: "activity" | "production",
): Promise<void> {
  const existing = await client.query(`SELECT 1 FROM studio_campaigns WHERE campaign_id = $1`, [
    campaignId,
  ]);
  if (existing.rowCount && existing.rowCount > 0) return;
  throw new Error(
    `Postgres persistence: campaign "${campaignId}" must exist before writing ${child}.`,
  );
}

export async function pgReadProjectActivityEnvelope(
  campaignId: string,
): Promise<ProjectActivityEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_project_activity WHERE campaign_id = $1`,
    [campaignId],
  );
  return rowEnvelope<ProjectActivityEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteProjectActivityEnvelope(
  envelope: ProjectActivityEnvelope,
): Promise<ProjectActivityEnvelope> {
  await withPostgresTransaction(async (client) => {
    await withCampaignPgAdvisoryLock(client, envelope.campaignId, async () => {
      await assertCampaignRowExists(client, envelope.campaignId, "activity");
      await client.query(
        `INSERT INTO studio_project_activity (campaign_id, envelope, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [envelope.campaignId, JSON.stringify(envelope)],
      );
    });
  });
  return envelope;
}

export async function pgMutateProjectActivityEnvelope<T>(
  campaignId: string,
  empty: () => ProjectActivityEnvelope,
  mutate: (current: ProjectActivityEnvelope) => {
    envelope: ProjectActivityEnvelope;
    value: T;
  },
): Promise<T> {
  return withPostgresTransaction(async (client) => {
    return withCampaignPgAdvisoryLock(client, campaignId, async () => {
      await assertCampaignRowExists(client, campaignId, "activity");
      const result = await client.query(
        `SELECT envelope FROM studio_project_activity WHERE campaign_id = $1 FOR UPDATE`,
        [campaignId],
      );
      const current =
        rowEnvelope<ProjectActivityEnvelope>(result.rows[0], "envelope") ?? empty();
      const { envelope, value } = mutate(current);
      await client.query(
        `INSERT INTO studio_project_activity (campaign_id, envelope, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [campaignId, JSON.stringify(envelope)],
      );
      return value;
    });
  });
}

export async function pgReadProductionEnvelope(
  campaignId: string,
): Promise<ServerProductionEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_campaign_production WHERE campaign_id = $1`,
    [campaignId],
  );
  return rowEnvelope<ServerProductionEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteProductionEnvelope(
  envelope: ServerProductionEnvelope,
): Promise<ServerProductionEnvelope> {
  await withPostgresTransaction(async (client) => {
    await withCampaignPgAdvisoryLock(client, envelope.campaignId, async () => {
      await assertCampaignRowExists(client, envelope.campaignId, "production");
      await client.query(
        `INSERT INTO studio_campaign_production (campaign_id, synced_at, envelope, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           synced_at = EXCLUDED.synced_at,
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [envelope.campaignId, envelope.syncedAt, JSON.stringify(envelope)],
      );
    });
  });
  return envelope;
}

export async function pgMutateProductionEnvelope<T>(
  campaignId: string,
  mutate: (current: ServerProductionEnvelope | null) => {
    envelope: ServerProductionEnvelope;
    value: T;
  },
): Promise<T> {
  return withPostgresTransaction(async (client) => {
    return withCampaignPgAdvisoryLock(client, campaignId, async () => {
      await assertCampaignRowExists(client, campaignId, "production");
      const result = await client.query(
        `SELECT envelope FROM studio_campaign_production WHERE campaign_id = $1 FOR UPDATE`,
        [campaignId],
      );
      const current = rowEnvelope<ServerProductionEnvelope>(result.rows[0], "envelope");
      const { envelope, value } = mutate(current);
      await client.query(
        `INSERT INTO studio_campaign_production (campaign_id, synced_at, envelope, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           synced_at = EXCLUDED.synced_at,
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [envelope.campaignId, envelope.syncedAt, JSON.stringify(envelope)],
      );
      return value;
    });
  });
}

/** Integration test cleanup — CASCADE removes activity/production child rows. */
export async function pgCleanupDisposableActivityProductionIntegrationTestData(): Promise<void> {
  await getStudioPostgresPool().query(
    `DELETE FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-activity-%'`,
  );
}
