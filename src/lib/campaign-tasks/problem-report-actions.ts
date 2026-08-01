import { classifyIncomingCustomerEvent } from "@/decision-core";
import type { StudioUser } from "@/lib/campaign-store/types";
import { PROJECT_COMMUNICATION_BODY_MAX_LENGTH } from "@/lib/project-communication/types";

import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import type { ServerTasksEnvelope } from "./types";

/**
 * ISSUE-ENTRY-1 — Customer Problem Reporting Through Project Communication.
 *
 * Client-side submission adapter for the existing complaint authority
 * (`OwnerDecisionInteractionRecord`, `interactionKind: "complaint"`). Mirrors
 * `applyClientSubmitRefundRequest` (refund-request-actions.ts) so the problem-report
 * path reuses the same Owner Desk record shape and Owner-side tooling
 * (owner-decision-complaint-actions.ts) without inventing a new ticketing model.
 */
export type ProblemReportActionResult =
  | {
      ok: true;
      envelope: ServerTasksEnvelope;
      interaction: OwnerDecisionInteractionRecord;
      replayed: boolean;
    }
  | { ok: false; error: string; status: number };

function findJob(envelope: ServerTasksEnvelope, jobId: string) {
  return envelope.jobRecords?.find((entry) => entry.jobId === jobId);
}

/** Existing, non-resolved complaint for this campaign — at most one open report at a time. */
function findOpenComplaint(
  envelope: ServerTasksEnvelope,
  campaignId: string,
): OwnerDecisionInteractionRecord | undefined {
  return envelope.ownerDecisionInteractions?.find(
    (entry) =>
      entry.interactionKind === "complaint" &&
      entry.campaignId === campaignId &&
      entry.status !== "resolved",
  );
}

function findByIdempotencyKey(
  envelope: ServerTasksEnvelope,
  campaignId: string,
  idempotencyKey: string,
): OwnerDecisionInteractionRecord | undefined {
  return envelope.ownerDecisionInteractions?.find(
    (entry) =>
      entry.interactionKind === "complaint" &&
      entry.campaignId === campaignId &&
      entry.submissionIdempotencyKey === idempotencyKey,
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

export type ProblemReportIntakePayload = {
  jobId?: string;
  message: string;
  idempotencyKey: string;
};

/**
 * Persist a customer-authored problem report as an Owner Desk complaint interaction.
 * Truthful record only — creation here never implies human review; status starts
 * at "waiting_owner" (received by the Studio system, not yet acted on).
 */
export function applyClientSubmitProblemReport(
  envelope: ServerTasksEnvelope,
  payload: ProblemReportIntakePayload,
  user: StudioUser,
): ProblemReportActionResult {
  const idempotencyKey = payload.idempotencyKey?.trim();
  if (!idempotencyKey) {
    return { ok: false, error: "idempotencyKey is required.", status: 400 };
  }

  const message = payload.message?.trim();
  if (!message) {
    return { ok: false, error: "A description of the problem is required.", status: 400 };
  }
  if (message.length > PROJECT_COMMUNICATION_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `Problem description must be at most ${PROJECT_COMMUNICATION_BODY_MAX_LENGTH} characters.`,
      status: 400,
    };
  }

  if (payload.jobId) {
    const job = findJob(envelope, payload.jobId);
    if (!job) return { ok: false, error: "Job not found.", status: 404 };
  }

  const existingByKey = findByIdempotencyKey(envelope, envelope.campaignId, idempotencyKey);
  if (existingByKey) {
    if (existingByKey.clientMessage !== message) {
      return {
        ok: false,
        error: "Idempotency key already used with a different problem report.",
        status: 409,
      };
    }
    return { ok: true, envelope, interaction: existingByKey, replayed: true };
  }

  const open = findOpenComplaint(envelope, envelope.campaignId);
  if (open) {
    return {
      ok: false,
      error: "A problem report is already open for this project.",
      status: 409,
    };
  }

  const now = new Date().toISOString();
  const interaction: OwnerDecisionInteractionRecord = {
    id: `interaction-complaint-${envelope.campaignId}-${now}`,
    campaignId: envelope.campaignId,
    jobId: payload.jobId,
    interactionKind: classifyIncomingCustomerEvent("complaint"),
    status: "waiting_owner",
    clientMessage: message,
    createdAt: now,
    updatedAt: now,
    resolutionNotes: `Submitted by ${user.displayName ?? user.email}`,
    submissionIdempotencyKey: idempotencyKey,
  };

  const interactions = [...(envelope.ownerDecisionInteractions ?? []), interaction];
  return {
    ok: true,
    envelope: withInteractions(envelope, interactions),
    interaction,
    replayed: false,
  };
}

/** Latest complaint interaction for a campaign — used for the customer-safe status view. */
export function findLatestComplaintForCampaign(
  envelope: ServerTasksEnvelope | null,
  campaignId: string,
): OwnerDecisionInteractionRecord | undefined {
  const matches = (envelope?.ownerDecisionInteractions ?? []).filter(
    (entry) => entry.interactionKind === "complaint" && entry.campaignId === campaignId,
  );
  if (matches.length === 0) return undefined;
  return matches.reduce((latest, entry) =>
    entry.createdAt.localeCompare(latest.createdAt) >= 0 ? entry : latest,
  );
}
