import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { ServerMaterialsEnvelope } from "@/lib/materials/types";
import type {
  CheckoutSessionBinding,
  ProcessedPaymentEvent,
} from "@/lib/studio-payment/events-store";

import {
  getStudioPostgresPool,
  rowEnvelope,
  withCampaignPgAdvisoryLock,
  withPostgresTransaction,
} from "./postgres-pool";

export async function pgReadCampaignEnvelope(
  campaignId: string,
): Promise<ServerCampaignEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`,
    [campaignId],
  );
  return rowEnvelope<ServerCampaignEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteCampaignEnvelope(
  envelope: ServerCampaignEnvelope,
): Promise<ServerCampaignEnvelope> {
  await withPostgresTransaction(async (client) => {
    await withCampaignPgAdvisoryLock(client, envelope.campaignId, async () => {
      await client.query(
        `INSERT INTO studio_campaigns (campaign_id, client_user_id, sync_version, synced_at, envelope, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           client_user_id = EXCLUDED.client_user_id,
           sync_version = EXCLUDED.sync_version,
           synced_at = EXCLUDED.synced_at,
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [
          envelope.campaignId,
          envelope.clientUserId ?? null,
          envelope.syncVersion,
          envelope.syncedAt,
          JSON.stringify(envelope),
        ],
      );
    });
  });
  return envelope;
}

export async function pgListCampaignEnvelopes(): Promise<ServerCampaignEnvelope[]> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_campaigns ORDER BY synced_at DESC`,
  );
  return result.rows
    .map((row) => rowEnvelope<ServerCampaignEnvelope>(row, "envelope"))
    .filter((row): row is ServerCampaignEnvelope => row != null);
}

export async function pgListTasksEnvelopes(): Promise<ServerTasksEnvelope[]> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_campaign_tasks ORDER BY synced_at DESC`,
  );
  return result.rows
    .map((row) => rowEnvelope<ServerTasksEnvelope>(row, "envelope"))
    .filter((row): row is ServerTasksEnvelope => row != null);
}

export async function pgReadTasksEnvelope(
  campaignId: string,
): Promise<ServerTasksEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_campaign_tasks WHERE campaign_id = $1`,
    [campaignId],
  );
  return rowEnvelope<ServerTasksEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteTasksEnvelope(
  envelope: ServerTasksEnvelope,
): Promise<ServerTasksEnvelope> {
  await withPostgresTransaction(async (client) => {
    await withCampaignPgAdvisoryLock(client, envelope.campaignId, async () => {
      await assertCampaignRowExists(client, envelope.campaignId, "tasks");
      await client.query(
        `INSERT INTO studio_campaign_tasks (campaign_id, synced_at, envelope, updated_at)
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

export async function pgReadMaterialsEnvelope(
  campaignId: string,
): Promise<ServerMaterialsEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_campaign_materials WHERE campaign_id = $1`,
    [campaignId],
  );
  return rowEnvelope<ServerMaterialsEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteMaterialsEnvelope(
  envelope: ServerMaterialsEnvelope,
): Promise<ServerMaterialsEnvelope> {
  await withPostgresTransaction(async (client) => {
    await withCampaignPgAdvisoryLock(client, envelope.campaignId, async () => {
      await assertCampaignRowExists(client, envelope.campaignId, "materials");
      await client.query(
        `INSERT INTO studio_campaign_materials (campaign_id, synced_at, envelope, updated_at)
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

export async function pgReadProcessedPaymentEvent(
  eventId: string,
): Promise<ProcessedPaymentEvent | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_payment_events WHERE event_id = $1`,
    [eventId],
  );
  return rowEnvelope<ProcessedPaymentEvent>(result.rows[0], "envelope");
}

export async function pgWriteProcessedPaymentEvent(
  event: ProcessedPaymentEvent,
): Promise<ProcessedPaymentEvent> {
  await withPostgresTransaction(async (client) => {
    await client.query(
      `INSERT INTO studio_payment_events (event_id, campaign_id, processed_at, envelope, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (event_id) DO UPDATE SET
         campaign_id = EXCLUDED.campaign_id,
         processed_at = EXCLUDED.processed_at,
         envelope = EXCLUDED.envelope,
         updated_at = NOW()`,
      [event.eventId, event.campaignId, event.processedAt, JSON.stringify(event)],
    );
  });
  return event;
}

export async function pgReadCheckoutSessionBinding(
  checkoutSessionId: string,
): Promise<CheckoutSessionBinding | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_payment_sessions WHERE checkout_session_id = $1`,
    [checkoutSessionId],
  );
  return rowEnvelope<CheckoutSessionBinding>(result.rows[0], "envelope");
}

export async function pgWriteCheckoutSessionBinding(
  binding: CheckoutSessionBinding,
): Promise<CheckoutSessionBinding> {
  await withPostgresTransaction(async (client) => {
    await client.query(
      `INSERT INTO studio_payment_sessions (checkout_session_id, campaign_id, created_at, envelope, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (checkout_session_id) DO UPDATE SET
         campaign_id = EXCLUDED.campaign_id,
         created_at = EXCLUDED.created_at,
         envelope = EXCLUDED.envelope,
         updated_at = NOW()`,
      [
        binding.checkoutSessionId,
        binding.campaignId,
        binding.createdAt,
        JSON.stringify(binding),
      ],
    );
  });
  return binding;
}

/** Atomic campaign + optional tasks + optional materials (shared job truth spine). */
export async function pgWriteCampaignSpineBundle(input: {
  campaign: ServerCampaignEnvelope;
  tasks?: ServerTasksEnvelope;
  materials?: ServerMaterialsEnvelope;
}): Promise<void> {
  await withPostgresTransaction(async (client) => {
    await withCampaignPgAdvisoryLock(client, input.campaign.campaignId, async () => {
      await client.query(
        `INSERT INTO studio_campaigns (campaign_id, client_user_id, sync_version, synced_at, envelope, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           client_user_id = EXCLUDED.client_user_id,
           sync_version = EXCLUDED.sync_version,
           synced_at = EXCLUDED.synced_at,
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [
          input.campaign.campaignId,
          input.campaign.clientUserId ?? null,
          input.campaign.syncVersion,
          input.campaign.syncedAt,
          JSON.stringify(input.campaign),
        ],
      );

      if (input.tasks) {
        await client.query(
          `INSERT INTO studio_campaign_tasks (campaign_id, synced_at, envelope, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (campaign_id) DO UPDATE SET
             synced_at = EXCLUDED.synced_at,
             envelope = EXCLUDED.envelope,
             updated_at = NOW()`,
          [input.tasks.campaignId, input.tasks.syncedAt, JSON.stringify(input.tasks)],
        );
      }

      if (input.materials) {
        await client.query(
          `INSERT INTO studio_campaign_materials (campaign_id, synced_at, envelope, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (campaign_id) DO UPDATE SET
             synced_at = EXCLUDED.synced_at,
             envelope = EXCLUDED.envelope,
             updated_at = NOW()`,
          [
            input.materials.campaignId,
            input.materials.syncedAt,
            JSON.stringify(input.materials),
          ],
        );
      }
    });
  });
}

async function assertCampaignRowExists(
  client: import("pg").PoolClient,
  campaignId: string,
  child: "tasks" | "materials",
): Promise<void> {
  const existing = await client.query(
    `SELECT 1 FROM studio_campaigns WHERE campaign_id = $1`,
    [campaignId],
  );
  if (existing.rowCount && existing.rowCount > 0) return;
  throw new Error(
    `Postgres persistence: campaign "${campaignId}" must exist before writing ${child}.`,
  );
}
