import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import {
  buildRefundRequestSnapshot,
  isRefundIntakeComplete,
  type RefundIntakePayload,
} from "./refund-request-intake";
import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import type { ServerTasksEnvelope } from "./types";

export type RefundRequestActionResult =
  | { ok: true; envelope: ServerTasksEnvelope; interaction: OwnerDecisionInteractionRecord }
  | { ok: false; error: string; status: number };

function findJob(envelope: ServerTasksEnvelope, jobId: string): PurchasedJobRecord | undefined {
  return envelope.jobRecords?.find((entry) => entry.jobId === jobId);
}

/**
 * Align refund-request job lookup with project-status / Board: jobs may be
 * plan-synced even when not yet persisted on the tasks envelope.
 */
export function withSyncedJobRecordsForRefund(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[],
): ServerTasksEnvelope {
  const synced = syncJobRecordsFromCampaign(
    campaign,
    envelope.tasks ?? [],
    materials,
    envelope.exceptionRecords ?? [],
    envelope.jobRecords,
  );
  return {
    ...envelope,
    jobRecords: synced,
  };
}

function openRefundInteraction(
  envelope: ServerTasksEnvelope,
  jobId: string,
): OwnerDecisionInteractionRecord | undefined {
  return envelope.ownerDecisionInteractions?.find(
    (entry) =>
      entry.interactionKind === "refund_request" &&
      entry.jobId === jobId &&
      entry.status === "waiting_owner",
  );
}

function withInteractions(
  envelope: ServerTasksEnvelope,
  interactions: OwnerDecisionInteractionRecord[],
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    ...envelope,
    ownerDecisionInteractions: interactions,
    updatedAt: now,
    syncedAt: now,
    version: CAMPAIGN_TASKS_SCHEMA_VERSION,
  };
}

export function applyClientSubmitRefundRequest(
  envelope: ServerTasksEnvelope,
  payload: { jobId: string } & RefundIntakePayload,
  user: StudioUser,
): RefundRequestActionResult {
  if (!payload.jobId?.trim()) {
    return { ok: false, error: "jobId is required.", status: 400 };
  }
  if (!isRefundIntakeComplete(payload)) {
    return { ok: false, error: "Refund reason and requested outcome are required.", status: 400 };
  }

  const job = findJob(envelope, payload.jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };

  if (job.refundOwnerDecisionAt) {
    return { ok: false, error: "Owner has already decided on this refund.", status: 422 };
  }

  const existing = openRefundInteraction(envelope, payload.jobId);
  if (existing) {
    return { ok: false, error: "A refund request is already on Tagia's desk for this job.", status: 409 };
  }

  const snapshot = buildRefundRequestSnapshot(job, {
    reason: payload.reason!.trim(),
    requestedOutcome: payload.requestedOutcome!.trim(),
    supportingDetails: payload.supportingDetails,
    sourceChannel: payload.sourceChannel,
  });
  const now = snapshot.submittedAt;
  const interaction: OwnerDecisionInteractionRecord = {
    id: `interaction-refund-${payload.jobId}-${now}`,
    campaignId: envelope.campaignId,
    jobId: payload.jobId,
    interactionKind: "refund_request",
    status: "waiting_owner",
    clientMessage: snapshot.reason,
    refundSnapshot: snapshot,
    createdAt: now,
    updatedAt: now,
    resolutionNotes: `Submitted by ${user.displayName ?? user.email}`,
  };

  const interactions = [...(envelope.ownerDecisionInteractions ?? []), interaction];
  return {
    ok: true,
    envelope: withInteractions(envelope, interactions),
    interaction,
  };
}

export function resolveRefundRequestInteractionForJob(
  envelope: ServerTasksEnvelope,
  jobId: string,
): OwnerDecisionInteractionRecord | undefined {
  return envelope.ownerDecisionInteractions?.find(
    (entry) =>
      entry.interactionKind === "refund_request" &&
      entry.jobId === jobId &&
      entry.status === "waiting_owner",
  );
}

export function transitionRefundRequestInteraction(
  envelope: ServerTasksEnvelope,
  jobId: string,
  status: OwnerDecisionInteractionRecord["status"],
  resolutionNotes: string,
): ServerTasksEnvelope {
  const interaction = resolveRefundRequestInteractionForJob(envelope, jobId);
  if (!interaction) return envelope;

  const now = new Date().toISOString();
  const updated: OwnerDecisionInteractionRecord = {
    ...interaction,
    status,
    updatedAt: now,
    resolutionNotes,
  };
  const interactions = (envelope.ownerDecisionInteractions ?? []).map((entry) =>
    entry.id === interaction.id ? updated : entry,
  );
  return withInteractions(envelope, interactions);
}

export function resolveRefundRequestInteractionOnOwnerDecision(
  envelope: ServerTasksEnvelope,
  jobId: string,
  resolutionNotes: string,
): ServerTasksEnvelope {
  return transitionRefundRequestInteraction(envelope, jobId, "resolved", resolutionNotes);
}

/** Latest refund_request interaction for a job — customer-safe status read. */
export function findLatestRefundRequestForJob(
  envelope: ServerTasksEnvelope | null,
  jobId: string,
): OwnerDecisionInteractionRecord | undefined {
  const matches = (envelope?.ownerDecisionInteractions ?? []).filter(
    (entry) => entry.interactionKind === "refund_request" && entry.jobId === jobId,
  );
  if (matches.length === 0) return undefined;
  return matches.reduce((latest, entry) =>
    entry.updatedAt.localeCompare(latest.updatedAt) >= 0 ? entry : latest,
  );
}
