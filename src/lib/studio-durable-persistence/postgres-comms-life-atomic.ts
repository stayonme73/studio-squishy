import { applyClientSubmitProblemReport } from "@/lib/campaign-tasks/problem-report-actions";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CustomerLifeEnvelope } from "@/lib/studio-customer-life/communication-loop";

import { rowEnvelope, withCampaignPgAdvisoryLock, withPostgresTransaction } from "./postgres-pool";

export type PgLifeAskOwnerJudgmentInput = {
  user: StudioUser;
  idempotencyKey: string;
  message: string;
};

/**
 * Single Postgres transaction: customer-life ask row + optional owner-judgment task interaction.
 * Caller must ensure a tasks row exists (e.g. getOrGenerateTasks) before calling when task sync is required.
 */
export async function pgAtomicPersistCustomerLifeAskAndOwnerJudgmentTask(input: {
  campaignId: string;
  mutateLife: (current: CustomerLifeEnvelope) => CustomerLifeEnvelope;
  ownerJudgment?: PgLifeAskOwnerJudgmentInput;
}): Promise<{ taskSynced: boolean }> {
  return withPostgresTransaction(async (client) => {
    return withCampaignPgAdvisoryLock(client, input.campaignId, async () => {
      const campaignCheck = await client.query(
        `SELECT 1 FROM studio_campaigns WHERE campaign_id = $1`,
        [input.campaignId],
      );
      if (!campaignCheck.rowCount) {
        throw new Error(
          `Postgres persistence: campaign "${input.campaignId}" must exist before writing customer life.`,
        );
      }

      const lifeResult = await client.query(
        `SELECT envelope FROM studio_campaign_customer_life WHERE campaign_id = $1 FOR UPDATE`,
        [input.campaignId],
      );
      const currentLife =
        rowEnvelope<CustomerLifeEnvelope>(lifeResult.rows[0], "envelope") ??
        ({
          campaignId: input.campaignId,
          updatedAt: new Date().toISOString(),
          asks: [],
          mayaResponses: [],
        } satisfies CustomerLifeEnvelope);

      const nextLife = input.mutateLife(currentLife);
      await client.query(
        `INSERT INTO studio_campaign_customer_life (campaign_id, envelope, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [input.campaignId, JSON.stringify(nextLife)],
      );

      if (!input.ownerJudgment) {
        return { taskSynced: true };
      }

      const tasksResult = await client.query(
        `SELECT envelope FROM studio_campaign_tasks WHERE campaign_id = $1 FOR UPDATE`,
        [input.campaignId],
      );
      const tasks =
        rowEnvelope<ServerTasksEnvelope>(tasksResult.rows[0], "envelope") ??
        null;
      if (!tasks) {
        return { taskSynced: false };
      }

      const recorded = applyClientSubmitProblemReport(
        tasks,
        {
          message: input.ownerJudgment.message,
          idempotencyKey: input.ownerJudgment.idempotencyKey,
        },
        input.ownerJudgment.user,
      );
      if (!recorded.ok) {
        return { taskSynced: false };
      }
      if (!recorded.replayed) {
        await client.query(
          `INSERT INTO studio_campaign_tasks (campaign_id, synced_at, envelope, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (campaign_id) DO UPDATE SET
             synced_at = EXCLUDED.synced_at,
             envelope = EXCLUDED.envelope,
             updated_at = NOW()`,
          [recorded.envelope.campaignId, recorded.envelope.syncedAt, JSON.stringify(recorded.envelope)],
        );
      }
      return { taskSynced: true };
    });
  });
}
