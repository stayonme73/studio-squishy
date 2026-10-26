import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import { applyClientSubmitProblemReport } from "@/lib/campaign-tasks/problem-report-actions";
import { getOrGenerateTasks, readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";

import type { CustomerLifeEnvelope, CustomerLifeReceipt } from "./communication-loop";

export type OwnerJudgmentTaskSyncState = "pending" | "synced" | "not_required";

export function buildOwnerJudgmentTaskIdempotencyKey(input: {
  campaignId: string;
  intent: string;
  commMessageId?: string;
  askedAt: string;
}): string {
  if (input.commMessageId?.trim()) {
    return `voice-${input.intent}-${input.campaignId}-${input.commMessageId.trim()}`;
  }
  return `voice-${input.intent}-${input.campaignId}-${input.askedAt}`;
}

export function ownerJudgmentTaskMessage(intent: string, question: string): string {
  return `${intent}: ${question}`.slice(0, 2000);
}

export function findAskByCommMessageId(
  envelope: CustomerLifeEnvelope,
  commMessageId: string,
): CustomerLifeReceipt | undefined {
  return envelope.asks.find((ask) => ask.commMessageId === commMessageId);
}

export function withOwnerJudgmentTaskSyncFields(
  ask: CustomerLifeReceipt,
  input: {
    idempotencyKey: string;
    syncState: OwnerJudgmentTaskSyncState;
  },
): CustomerLifeReceipt {
  return {
    ...ask,
    ownerJudgmentTaskIdempotencyKey: input.idempotencyKey,
    ownerJudgmentTaskSyncState: input.syncState,
  };
}

/**
 * Idempotent owner-judgment complaint interaction on the tasks envelope.
 * Safe to retry after a life write succeeded but tasks write failed.
 */
export async function syncOwnerJudgmentTaskForAsk(input: {
  campaignId: string;
  campaign: CampaignRecord;
  user: StudioUser;
  idempotencyKey: string;
  message: string;
}): Promise<{ ok: true; synced: boolean } | { ok: false }> {
  const tasks = await getOrGenerateTasks(input.campaignId, input.campaign);
  const existing = tasks.ownerDecisionInteractions?.find(
    (entry) =>
      entry.interactionKind === "complaint" &&
      entry.campaignId === input.campaignId &&
      entry.submissionIdempotencyKey === input.idempotencyKey,
  );
  if (existing) {
    return { ok: true, synced: true };
  }

  const recorded = applyClientSubmitProblemReport(
    tasks,
    {
      message: input.message,
      idempotencyKey: input.idempotencyKey,
    },
    input.user,
  );
  if (!recorded.ok) {
    return { ok: false };
  }
  if (!recorded.replayed) {
    await writeTasksEnvelope(recorded.envelope);
  }
  return { ok: true, synced: true };
}

export async function reconcilePendingOwnerJudgmentTaskSyncs(input: {
  campaignId: string;
  campaign: CampaignRecord | null;
  user: StudioUser | null | undefined;
  readLife: () => Promise<CustomerLifeEnvelope>;
  writeLife: (envelope: CustomerLifeEnvelope) => Promise<void>;
}): Promise<void> {
  if (!input.campaign || !input.user) return;

  const envelope = await input.readLife();
  let changed = false;
  const nextAsks: CustomerLifeReceipt[] = [];
  for (const ask of envelope.asks) {
    if (ask.ownerJudgmentTaskSyncState !== "pending" || !ask.ownerJudgmentTaskIdempotencyKey) {
      nextAsks.push(ask);
      continue;
    }
    const sync = await syncOwnerJudgmentTaskForAsk({
      campaignId: input.campaignId,
      campaign: input.campaign,
      user: input.user,
      idempotencyKey: ask.ownerJudgmentTaskIdempotencyKey,
      message: ownerJudgmentTaskMessage(ask.intent, ask.question),
    });
    if (sync.ok) {
      changed = true;
      nextAsks.push(withOwnerJudgmentTaskSyncFields(ask, {
        idempotencyKey: ask.ownerJudgmentTaskIdempotencyKey,
        syncState: "synced",
      }));
    } else {
      nextAsks.push(ask);
    }
  }

  if (changed) {
    await input.writeLife({
      ...envelope,
      asks: nextAsks,
      updatedAt: new Date().toISOString(),
    });
  }
}

/** Test hook — whether tasks already contain the idempotency key. */
export async function tasksEnvelopeHasOwnerJudgmentIdempotencyKey(
  campaignId: string,
  idempotencyKey: string,
): Promise<boolean> {
  const tasks = await readTasksEnvelope(campaignId);
  return Boolean(
    tasks?.ownerDecisionInteractions?.some(
      (entry) =>
        entry.interactionKind === "complaint" &&
        entry.campaignId === campaignId &&
        entry.submissionIdempotencyKey === idempotencyKey,
    ),
  );
}
