import type { CustomerLifeEnvelope } from "@/lib/studio-customer-life/communication-loop";
import type { ProjectCommunicationAckEnvelope } from "@/lib/project-communication-ack/types";
import type { ProjectCommunicationEnvelope } from "@/lib/project-communication/types";

import { getStudioPostgresPool, rowEnvelope, withPostgresTransaction } from "./postgres-pool";

export async function pgReadProjectCommunicationEnvelope(
  campaignId: string,
): Promise<ProjectCommunicationEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_project_communication WHERE campaign_id = $1`,
    [campaignId],
  );
  return rowEnvelope<ProjectCommunicationEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteProjectCommunicationEnvelope(
  envelope: ProjectCommunicationEnvelope,
): Promise<ProjectCommunicationEnvelope> {
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `comms:${envelope.campaignId}`,
    ]);
    await client.query(
      `INSERT INTO studio_project_communication (campaign_id, envelope, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (campaign_id) DO UPDATE SET
         envelope = EXCLUDED.envelope,
         updated_at = NOW()`,
      [envelope.campaignId, JSON.stringify(envelope)],
    );
  });
  return envelope;
}

export async function pgReadProjectCommunicationAckEnvelope(
  campaignId: string,
  customerUserId: string,
): Promise<ProjectCommunicationAckEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_project_communication_ack
     WHERE campaign_id = $1 AND customer_user_id = $2`,
    [campaignId, customerUserId],
  );
  return rowEnvelope<ProjectCommunicationAckEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteProjectCommunicationAckEnvelope(
  envelope: ProjectCommunicationAckEnvelope,
): Promise<ProjectCommunicationAckEnvelope> {
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `comm-ack:${envelope.campaignId}:${envelope.customerUserId}`,
    ]);
    await client.query(
      `INSERT INTO studio_project_communication_ack
         (campaign_id, customer_user_id, envelope, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (campaign_id, customer_user_id) DO UPDATE SET
         envelope = EXCLUDED.envelope,
         updated_at = NOW()`,
      [envelope.campaignId, envelope.customerUserId, JSON.stringify(envelope)],
    );
  });
  return envelope;
}

export async function pgReadCustomerLifeEnvelope(
  campaignId: string,
): Promise<CustomerLifeEnvelope | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_campaign_customer_life WHERE campaign_id = $1`,
    [campaignId],
  );
  return rowEnvelope<CustomerLifeEnvelope>(result.rows[0], "envelope");
}

export async function pgWriteCustomerLifeEnvelope(
  envelope: CustomerLifeEnvelope,
): Promise<CustomerLifeEnvelope> {
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `customer-life:${envelope.campaignId}`,
    ]);
    await client.query(
      `INSERT INTO studio_campaign_customer_life (campaign_id, envelope, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (campaign_id) DO UPDATE SET
         envelope = EXCLUDED.envelope,
         updated_at = NOW()`,
      [envelope.campaignId, JSON.stringify(envelope)],
    );
  });
  return envelope;
}

/** Integration test cleanup — CASCADE removes comms/life child rows. */
export async function pgCleanupDisposableCommsIntegrationTestData(): Promise<void> {
  await getStudioPostgresPool().query(
    `DELETE FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-comms-%'`,
  );
}
