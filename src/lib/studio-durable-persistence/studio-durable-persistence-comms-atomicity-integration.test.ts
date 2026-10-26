import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { writeCampaignEnvelope } from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  createCustomerProjectMessage,
  createStudioProjectReply,
  readProjectCommunicationEnvelope,
} from "@/lib/project-communication";
import {
  askCustomerLifeFromStore,
  handleCustomerBoardQuestion,
  readCustomerLifeEnvelope,
} from "@/lib/studio-customer-life/communication-loop";
import {
  buildOwnerJudgmentTaskIdempotencyKey,
  tasksEnvelopeHasOwnerJudgmentIdempotencyKey,
} from "@/lib/studio-customer-life/owner-judgment-task-sync";
import type { StudioUser } from "@/lib/campaign-store/types";

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

const testUser: StudioUser = {
  id: "cust-atomic-1",
  email: "atomic@test.local",
  displayName: "Atomic Customer",
  roles: ["client"],
};

async function seedCampaign(campaignId: string): Promise<void> {
  await writeCampaignEnvelope(minimalCampaign(campaignId));
}

afterEach(async () => {
  vi.restoreAllMocks();
  process.env = { ...ENV };
  vi.resetModules();
  try {
    useTestPostgresEnv();
    const { pgCleanupDisposableCommsIntegrationTestData } = await import("./postgres-comms");
    const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
    await pgCleanupDisposableCommsIntegrationTestData();
    await resetStudioPostgresPoolForTests();
  } catch {
    // ignore teardown errors after module reset
  }
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "STUDIO-DURABLE-PERSISTENCE-COMMS-ATOMICITY-1",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Integration target verification failed: ${verification.reason}`);
      }
    });

    it("deduplicates studio replies by idempotency key under concurrency", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("staff-reply-dup");
      const customerUserId = "cust-reply-dup";
      await seedCampaign(campaignId);

      await createCustomerProjectMessage({
        campaignId,
        customerUserId,
        senderUserId: customerUserId,
        body: "Help me",
        idempotencyKey: "cust-for-reply",
      });
      const customerMessageId = (await readProjectCommunicationEnvelope(campaignId))!.messages[0]!
        .id;

      const replyInput = {
        campaignId,
        customerUserId,
        staffUserId: "staff-atomic-1",
        body: "We received this.",
        replyToMessageId: customerMessageId,
        idempotencyKey: "staff-reply-dup-key",
      };
      const [first, second] = await Promise.all([
        createStudioProjectReply(replyInput),
        createStudioProjectReply(replyInput),
      ]);
      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.message.id).toBe(second.message.id);
      expect([first.replayed, second.replayed].filter(Boolean).length).toBeGreaterThanOrEqual(1);

      const envelope = await readProjectCommunicationEnvelope(campaignId);
      expect(envelope?.messages.filter((m) => m.senderRole === "studio_staff")).toHaveLength(1);
    });

    it("persists owner-judgment ask and complaint task atomically on Postgres", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("owner-judgment");
      await seedCampaign(campaignId);

      const commMessageId = "comm-msg-owner-judgment-1";
      await askCustomerLifeFromStore({
        campaignId,
        question: "I want to file a complaint.",
        commMessageId,
        user: testUser,
      });

      const life = await readCustomerLifeEnvelope(campaignId);
      expect(life.asks.some((ask) => ask.commMessageId === commMessageId)).toBe(true);
      const ask = life.asks.find((entry) => entry.commMessageId === commMessageId)!;
      expect(ask.ownerJudgmentTaskSyncState).toBe("synced");

      const key =
        ask.ownerJudgmentTaskIdempotencyKey ??
        buildOwnerJudgmentTaskIdempotencyKey({
          campaignId,
          intent: ask.intent,
          commMessageId,
          askedAt: ask.askedAt,
        });
      expect(await tasksEnvelopeHasOwnerJudgmentIdempotencyKey(campaignId, key)).toBe(true);

      const tasks = await readTasksEnvelope(campaignId);
      expect(tasks?.ownerDecisionInteractions?.some((i) => i.submissionIdempotencyKey === key)).toBe(
        true,
      );
    });

    it(
      "reconciles pending owner-judgment task sync without duplicating interactions",
      async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("owner-judgment-recover");
      await seedCampaign(campaignId);

      const commMessageId = "comm-msg-recover-1";
      await askCustomerLifeFromStore({
        campaignId,
        question: "I want a refund.",
        commMessageId,
        user: testUser,
      });

      const lifeBefore = await readCustomerLifeEnvelope(campaignId);
      const askBefore = lifeBefore.asks.find((entry) => entry.commMessageId === commMessageId)!;
      const key = askBefore.ownerJudgmentTaskIdempotencyKey!;
      expect(await tasksEnvelopeHasOwnerJudgmentIdempotencyKey(campaignId, key)).toBe(true);

      const { reconcilePendingOwnerJudgmentTaskSyncs } = await import(
        "@/lib/studio-customer-life/owner-judgment-task-sync"
      );
      const { pgWriteCustomerLifeEnvelope } = await import("./postgres-comms");
      await pgWriteCustomerLifeEnvelope({
        ...lifeBefore,
        asks: lifeBefore.asks.map((ask) =>
          ask.commMessageId === commMessageId
            ? { ...ask, ownerJudgmentTaskSyncState: "pending" as const }
            : ask,
        ),
      });

      const campaignEnvelope = minimalCampaign(campaignId);
      await reconcilePendingOwnerJudgmentTaskSyncs({
        campaignId,
        campaign: campaignEnvelope.record,
        user: testUser,
        readLife: () => readCustomerLifeEnvelope(campaignId),
        writeLife: async (envelope) => {
          await pgWriteCustomerLifeEnvelope(envelope);
        },
      });

      const lifeAfter = await readCustomerLifeEnvelope(campaignId);
      const askAfter = lifeAfter.asks.find((entry) => entry.commMessageId === commMessageId)!;
      expect(askAfter.ownerJudgmentTaskSyncState).toBe("synced");
      const tasks = await readTasksEnvelope(campaignId);
      const matches = tasks?.ownerDecisionInteractions?.filter(
        (entry) => entry.submissionIdempotencyKey === key,
      );
      expect(matches?.length).toBe(1);
      },
      20_000,
    );

    it("does not duplicate customer-life asks when commMessageId is retried", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("comm-idempotent");
      await seedCampaign(campaignId);

      const commMessageId = "comm-msg-idempotent";
      await askCustomerLifeFromStore({
        campaignId,
        question: "What phase am I in?",
        commMessageId,
      });
      await askCustomerLifeFromStore({
        campaignId,
        question: "What phase am I in?",
        commMessageId,
      });

      const life = await readCustomerLifeEnvelope(campaignId);
      expect(life.asks.filter((ask) => ask.commMessageId === commMessageId)).toHaveLength(1);
    });

    it("keeps comms durable when customer-life lookup runs after message create", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("multi-store");
      await seedCampaign(campaignId);

      const created = await createCustomerProjectMessage({
        campaignId,
        customerUserId: testUser.id,
        senderUserId: testUser.id,
        body: "When is my delivery?",
        idempotencyKey: "multi-store-msg",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      await handleCustomerBoardQuestion({
        campaignId,
        question: created.message.body,
        commMessageId: created.message.id,
        user: testUser,
      });

      const comm = await readProjectCommunicationEnvelope(campaignId);
      expect(comm?.messages).toHaveLength(1);
      const life = await readCustomerLifeEnvelope(campaignId);
      expect(life.asks.some((ask) => ask.commMessageId === created.message.id)).toBe(true);
    });
  },
);
