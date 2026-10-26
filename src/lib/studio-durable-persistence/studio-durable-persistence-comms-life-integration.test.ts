import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { writeCampaignEnvelope } from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import {
  createCustomerProjectMessage,
  createStudioProjectReply,
  listProjectCommunicationForCustomer,
  readProjectCommunicationEnvelope,
} from "@/lib/project-communication";
import { acknowledgeStudioReply } from "@/lib/project-communication-ack/actions";
import { readProjectCommunicationAckEnvelope } from "@/lib/project-communication-ack/store";
import {
  askCustomerLifeFromStore,
  readCustomerLifeEnvelope,
} from "@/lib/studio-customer-life/communication-loop";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";

const ENV = { ...process.env };

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
}

function disposableCampaignId(suffix: string): string {
  return `disposable-persistence-comms-${Date.now()}-${suffix}`;
}

function minimalCampaign(campaignId: string): ServerCampaignEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    clientUserId: "client-disposable-comms",
    syncVersion: 1,
    syncedAt: now,
    record: {
      campaignId,
      campaignName: "Disposable Comms Campaign",
      campaignStatus: "active",
      campaignDescription: "Integration probe",
      estimatedCompletion: now,
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      updatedAt: now,
    },
  };
}

async function seedCampaign(campaignId: string): Promise<void> {
  await writeCampaignEnvelope(minimalCampaign(campaignId));
}

afterEach(async () => {
  process.env = { ...ENV };
  vi.resetModules();
  try {
    useTestPostgresEnv();
    const { pgCleanupDisposableCommsIntegrationTestData } = await import(
      "./postgres-comms"
    );
    const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
    await pgCleanupDisposableCommsIntegrationTestData();
    await resetStudioPostgresPoolForTests();
  } catch {
    // ignore teardown errors after module reset
  }
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "STUDIO-DURABLE-PERSISTENCE-COMMS-AND-LIFE-1",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Integration target verification failed: ${verification.reason}`);
      }
    });

    it("persists customer messages and survives pool reconnect", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("message");
      await seedCampaign(campaignId);

      const created = await createCustomerProjectMessage({
        campaignId,
        customerUserId: "cust-comms-1",
        senderUserId: "cust-comms-1",
        senderDisplayName: "Disposable Customer",
        body: "When will my project update?",
        idempotencyKey: "msg-1",
      });
      expect(created.ok).toBe(true);

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const listed = await listProjectCommunicationForCustomer(campaignId);
      expect(listed.ok).toBe(true);
      if (listed.ok) {
        expect(listed.messages).toHaveLength(1);
        expect(listed.messages[0]?.body).toBe("When will my project update?");
      }
    });

    it("deduplicates customer messages by idempotency key under concurrency", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("idempotent");
      await seedCampaign(campaignId);

      const input = {
        campaignId,
        customerUserId: "cust-comms-2",
        senderUserId: "cust-comms-2",
        body: "Same question",
        idempotencyKey: "dup-key",
      };
      const [first, second] = await Promise.all([
        createCustomerProjectMessage(input),
        createCustomerProjectMessage(input),
      ]);
      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.message.id).toBe(second.message.id);
      expect([first.replayed, second.replayed].filter(Boolean).length).toBeGreaterThanOrEqual(
        1,
      );

      const envelope = await readProjectCommunicationEnvelope(campaignId);
      expect(envelope?.messages).toHaveLength(1);
    });

    it("acknowledges studio replies idempotently", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("ack");
      const customerUserId = "cust-comms-3";
      await seedCampaign(campaignId);

      await createCustomerProjectMessage({
        campaignId,
        customerUserId,
        senderUserId: customerUserId,
        body: "Need help",
        idempotencyKey: "cust-ack",
      });
      const reply = await createStudioProjectReply({
        campaignId,
        customerUserId,
        staffUserId: "staff-1",
        body: "We are on it.",
        replyToMessageId: (await readProjectCommunicationEnvelope(campaignId))!.messages[0]!
          .id,
        idempotencyKey: "staff-ack",
      });
      expect(reply.ok).toBe(true);
      if (!reply.ok) return;

      const first = await acknowledgeStudioReply({
        campaignId,
        customerUserId,
        studioReplyMessageId: reply.message.id,
        channel: "project_messages",
      });
      const second = await acknowledgeStudioReply({
        campaignId,
        customerUserId,
        studioReplyMessageId: reply.message.id,
        channel: "project_messages",
      });
      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.replayed).toBe(false);
      expect(second.replayed).toBe(true);

      const ack = await readProjectCommunicationAckEnvelope(campaignId, customerUserId);
      expect(ack?.lastAcknowledgedStudioReplyId).toBe(reply.message.id);
    });

    it("records customer-life asks and isolates campaigns", async () => {
      useTestPostgresEnv();
      const campaignA = disposableCampaignId("life-a");
      const campaignB = disposableCampaignId("life-b");
      await seedCampaign(campaignA);
      await seedCampaign(campaignB);

      await askCustomerLifeFromStore({
        campaignId: campaignA,
        question: "What phase am I in?",
      });

      const lifeA = await readCustomerLifeEnvelope(campaignA);
      const lifeB = await readCustomerLifeEnvelope(campaignB);
      expect(lifeA.asks.length).toBeGreaterThan(0);
      expect(lifeB.asks).toHaveLength(0);
    });

    it("cleans up disposable comms rows", async () => {
      useTestPostgresEnv();
      const { getStudioPostgresPool } = await import("./postgres-pool");
      const pool = getStudioPostgresPool();
      const comms = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_project_communication
         WHERE campaign_id LIKE 'disposable-persistence-comms-%'`,
      );
      const life = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_campaign_customer_life
         WHERE campaign_id LIKE 'disposable-persistence-comms-%'`,
      );
      expect(comms.rows[0]?.n).toBe(0);
      expect(life.rows[0]?.n).toBe(0);
    });
  },
);
