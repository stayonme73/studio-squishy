import { randomUUID } from "crypto";

import { JOB_CONTROL_POLICY } from "@/config/job-control";
import { resolveWaitingOnClientReminderStatus } from "@/lib/job-control/waiting-on-client";

import { CONFUSION_INTERACTION_KINDS } from "./config";
import type {
  CoordinatorExecutionState,
  CoordinatorObservation,
  CoordinatorSession,
  IncomingInteractionRecord,
} from "./types";

function hoursSince(iso: string, nowMs: number): number {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return 0;
  return (nowMs - ms) / (60 * 60 * 1000);
}

function withinPolicyHours(iso: string, nowMs: number, policyHours: number): boolean {
  return hoursSince(iso, nowMs) <= policyHours;
}

function appendObservation(
  session: CoordinatorSession,
  observation: Omit<CoordinatorObservation, "id">,
): { session: CoordinatorSession; observation: CoordinatorObservation } {
  const record: CoordinatorObservation = { ...observation, id: randomUUID() };
  return {
    session: {
      ...session,
      observations: [...session.observations, record],
    },
    observation: record,
  };
}

function countRecentInteractions(
  interactions: readonly IncomingInteractionRecord[],
  campaignId: string,
  predicate: (entry: IncomingInteractionRecord) => boolean,
  nowMs: number,
): number {
  const windowHours = JOB_CONTROL_POLICY.moveToWaitingOnClientHours;
  return interactions.filter(
    (entry) =>
      entry.campaignId === campaignId &&
      predicate(entry) &&
      withinPolicyHours(entry.occurredAt, nowMs, windowHours),
  ).length;
}

function detectStalled(
  state: CoordinatorExecutionState,
  nowMs: number,
): Omit<CoordinatorObservation, "id"> | null {
  for (const job of state.jobs) {
    if (job.spineStatus !== "waiting_on_client" || !job.waitingOnClientSince) continue;
    const hours = hoursSince(job.waitingOnClientSince, nowMs);
    if (hours < JOB_CONTROL_POLICY.moveToWaitingOnClientHours) continue;
    return {
      campaignId: state.campaign.campaignId,
      jobId: job.jobId,
      kind: "stalled",
      summary: `Job has been waiting on client beyond ${JOB_CONTROL_POLICY.moveToWaitingOnClientHours} hours.`,
      signalRef: "job-control:JOB_CONTROL_POLICY.moveToWaitingOnClientHours",
      occurredAt: new Date(nowMs).toISOString(),
    };
  }
  return null;
}

function detectRepeatedConfusion(
  session: CoordinatorSession,
  campaignId: string,
  nowMs: number,
): Omit<CoordinatorObservation, "id"> | null {
  const count = countRecentInteractions(
    session.incomingInteractions,
    campaignId,
    (entry) => CONFUSION_INTERACTION_KINDS.has(entry.interactionKind),
    nowMs,
  );
  if (count < 3) return null;
  return {
    campaignId,
    kind: "repeated_confusion",
    summary: `${count} clarification or status interactions within the waiting-on-client policy window.`,
    signalRef: "studio-coordinator:repeated_confusion",
    occurredAt: new Date(nowMs).toISOString(),
  };
}

function detectElevatedClientTone(
  session: CoordinatorSession,
  campaignId: string,
  nowMs: number,
): Omit<CoordinatorObservation, "id"> | null {
  const complaints = countRecentInteractions(
    session.incomingInteractions,
    campaignId,
    (entry) => entry.interactionKind === "complaint",
    nowMs,
  );
  const refunds = countRecentInteractions(
    session.incomingInteractions,
    campaignId,
    (entry) => entry.interactionKind === "refund_request",
    nowMs,
  );

  if (complaints === 0 && refunds < 2) return null;

  return {
    campaignId,
    kind: "elevated_client_tone",
    summary:
      complaints > 0
        ? "Client complaint interaction recorded."
        : "Multiple refund requests recorded within the policy window.",
    signalRef: "studio-coordinator:elevated_client_tone",
    occurredAt: new Date(nowMs).toISOString(),
  };
}

function detectRecurringProductionIssue(
  state: CoordinatorExecutionState,
  nowMs: number,
): Omit<CoordinatorObservation, "id"> | null {
  const records = state.envelope.exceptionRecords ?? [];
  const byKind = new Map<string, number>();
  for (const record of records) {
    if (record.status === "resolved" || record.status === "cancelled") continue;
    byKind.set(record.kind, (byKind.get(record.kind) ?? 0) + 1);
  }

  for (const [kind, count] of byKind) {
    if (count < 2) continue;
    return {
      campaignId: state.campaign.campaignId,
      kind: "recurring_production_issue",
      summary: `${count} open exceptions of kind ${kind} on this campaign.`,
      signalRef: `campaign-exceptions:kind:${kind}`,
      occurredAt: new Date(nowMs).toISOString(),
    };
  }
  return null;
}

function detectUnusualDelay(
  state: CoordinatorExecutionState,
  nowMs: number,
): Omit<CoordinatorObservation, "id"> | null {
  const deadlineRisk = (state.envelope.exceptionRecords ?? []).some(
    (record) => record.kind === "deadline_risk" && record.status !== "resolved",
  );
  const waitingJob = state.jobs.find((job) => job.spineStatus === "waiting_on_client");
  if (!deadlineRisk || !waitingJob?.waitingOnClientSince) return null;

  const reminderStatus = resolveWaitingOnClientReminderStatus(
    waitingJob.waitingOnClientSince,
    waitingJob.lastClientResponseAt ?? null,
    nowMs,
  );
  if (reminderStatus === "none") return null;

  return {
    campaignId: state.campaign.campaignId,
    jobId: waitingJob.jobId,
    kind: "unusual_delay",
    summary: `Deadline risk overlaps with client waiting state (${reminderStatus}).`,
    signalRef: "job-control:waiting-on-client",
    occurredAt: new Date(nowMs).toISOString(),
  };
}

export function recordIncomingInteraction(
  session: CoordinatorSession,
  record: IncomingInteractionRecord,
): CoordinatorSession {
  return {
    ...session,
    incomingInteractions: [...session.incomingInteractions, record],
  };
}

/** Deterministic issue detection — observations only, no state changes. */
export function detectCoordinatorObservations(
  session: CoordinatorSession,
  state: CoordinatorExecutionState,
  nowMs = Date.now(),
): { session: CoordinatorSession; observations: CoordinatorObservation[] } {
  const campaignId = state.campaign.campaignId;
  const candidates = [
    detectStalled(state, nowMs),
    detectRepeatedConfusion(session, campaignId, nowMs),
    detectElevatedClientTone(session, campaignId, nowMs),
    detectRecurringProductionIssue(state, nowMs),
    detectUnusualDelay(state, nowMs),
  ].filter((entry): entry is Omit<CoordinatorObservation, "id"> => Boolean(entry));

  let nextSession = session;
  const observations: CoordinatorObservation[] = [];

  for (const candidate of candidates) {
    const duplicate = nextSession.observations.some(
      (entry) =>
        entry.campaignId === candidate.campaignId &&
        entry.kind === candidate.kind &&
        entry.jobId === candidate.jobId,
    );
    if (duplicate) continue;
    const appended = appendObservation(nextSession, candidate);
    nextSession = appended.session;
    observations.push(appended.observation);
  }

  return { session: nextSession, observations };
}
