import { randomUUID } from "crypto";

import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";

import { NOTEWORTHY_OWNER_EXCEPTION_KINDS } from "./config";
import type {
  CoordinatorSession,
  LearningCandidate,
  OwnerCoordinatorAction,
  OwnerCoordinatorOutcome,
} from "./types";

export function isNoteworthyOwnerOutcome(
  action: OwnerCoordinatorAction,
  exceptionKind: CampaignExceptionKind,
): boolean {
  if (!NOTEWORTHY_OWNER_EXCEPTION_KINDS.has(exceptionKind)) return false;
  return (
    action === "resolve_exception" ||
    action === "approve_client_request" ||
    action === "decline_promotion"
  );
}

export function appendLearningCandidate(
  session: CoordinatorSession,
  candidate: Omit<LearningCandidate, "id" | "status">,
): { session: CoordinatorSession; candidate: LearningCandidate } {
  const record: LearningCandidate = {
    ...candidate,
    id: randomUUID(),
    status: "pending_review",
  };

  return {
    session: {
      ...session,
      learningCandidates: [...session.learningCandidates, record],
    },
    candidate: record,
  };
}

export function maybeRecordLearningCandidate(
  session: CoordinatorSession,
  outcome: OwnerCoordinatorOutcome,
  exceptionKind: CampaignExceptionKind,
): { session: CoordinatorSession; candidate: LearningCandidate | null } {
  if (!isNoteworthyOwnerOutcome(outcome.action, exceptionKind)) {
    return { session, candidate: null };
  }

  return appendLearningCandidate(session, {
    campaignId: outcome.campaignId,
    exceptionId: outcome.exceptionId,
    situationSummary: `Owner ${outcome.action} on ${exceptionKind} exception.`,
    ownerOutcome: outcome.action,
    occurredAt: outcome.occurredAt,
  });
}
