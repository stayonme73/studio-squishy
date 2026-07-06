import { randomUUID } from "crypto";

import type { DecisionContext, DecisionOutcome, PlannedEffect } from "@/decision-core";

import type { CoordinatorAuditEntry, CoordinatorAuditStep, CoordinatorSession } from "./types";

export function createCoordinatorSession(): CoordinatorSession {
  return {
    auditLog: [],
    observations: [],
    learningCandidates: [],
    incomingInteractions: [],
  };
}

export function appendCoordinatorAuditEntry(
  session: CoordinatorSession,
  input: {
    campaignId: string;
    step: CoordinatorAuditStep;
    occurredAt: string;
    summary: string;
    context?: DecisionContext;
    outcome?: DecisionOutcome;
    effects?: readonly PlannedEffect[];
    observationId?: string;
    learningCandidateId?: string;
  },
): CoordinatorSession {
  const entry: CoordinatorAuditEntry = {
    id: randomUUID(),
    campaignId: input.campaignId,
    step: input.step,
    occurredAt: input.occurredAt,
    summary: input.summary,
    context: input.context,
    outcome: input.outcome,
    effects: input.effects,
    observationId: input.observationId,
    learningCandidateId: input.learningCandidateId,
  };

  return {
    ...session,
    auditLog: [...session.auditLog, entry],
  };
}

/** Dev trace — mirrors Decision Core trace for coordinator steps. */
export function traceCoordinatorAudit(session: CoordinatorSession): void {
  if (process.env.NODE_ENV === "production") return;
  for (const entry of session.auditLog) {
    const rules = entry.outcome?.matchedRules?.map((rule) => rule.ruleId).join(", ") ?? "";
    console.info(
      `[studio-coordinator] ${entry.step} · ${entry.campaignId} · ${entry.summary}${
        rules ? ` · rules: ${rules}` : ""
      }`,
    );
  }
}
