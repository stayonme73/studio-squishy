import { randomUUID } from "node:crypto";

import { payloadContainsSecrets } from "@/lib/materials/payload-validation";

import type {
  HandoffPayload,
  ProductionRole,
  ReassignmentFlags,
  TaskHandoffAction,
  TaskHandoffRecord,
  TaskWorkflowState,
} from "./types";

const MAX_HANDOFF_FIELD_LENGTH = 2000;

export type HandoffValidationResult =
  | { ok: true; payload: HandoffPayload }
  | { ok: false; error: string };

function trimField(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateRequiredText(value: string | undefined, label: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return `${label} is required.`;
  }
  if (trimmed.length > MAX_HANDOFF_FIELD_LENGTH) {
    return `${label} must be at most ${MAX_HANDOFF_FIELD_LENGTH} characters.`;
  }
  return null;
}

function validateOptionalText(value: string | undefined, label: string): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_HANDOFF_FIELD_LENGTH) {
    return `${label} must be at most ${MAX_HANDOFF_FIELD_LENGTH} characters.`;
  }
  return null;
}

export function validateHandoffPayload(payload: HandoffPayload | undefined): HandoffValidationResult {
  if (!payload) {
    return { ok: false, error: "Handoff payload is required." };
  }

  const errors: string[] = [];
  const summaryError = validateRequiredText(payload.completedSummary, "Completed summary");
  if (summaryError) errors.push(summaryError);
  const contextError = validateRequiredText(payload.sourceContext, "Source context");
  if (contextError) errors.push(contextError);
  const nextStepsError = validateRequiredText(payload.nextSteps, "Next steps");
  if (nextStepsError) errors.push(nextStepsError);

  for (const [field, label] of [
    [payload.openQuestions, "Open questions"],
    [payload.risks, "Risks"],
    [payload.workRef, "Work reference"],
    [payload.internalNotes, "Internal notes"],
  ] as const) {
    const optionalError = validateOptionalText(field, label);
    if (optionalError) errors.push(optionalError);
  }

  if (
    payloadContainsSecrets({
      text: [payload.completedSummary, payload.sourceContext, payload.nextSteps, payload.internalNotes]
        .filter(Boolean)
        .join("\n"),
      note: payload.openQuestions ?? payload.risks,
    })
  ) {
    errors.push("Handoff notes must not contain secrets or credentials.");
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join(" ") };
  }

  return {
    ok: true,
    payload: {
      completedSummary: payload.completedSummary.trim(),
      sourceContext: payload.sourceContext.trim(),
      nextSteps: payload.nextSteps.trim(),
      openQuestions: trimField(payload.openQuestions),
      risks: trimField(payload.risks),
      workRef: trimField(payload.workRef),
      internalNotes: trimField(payload.internalNotes),
    },
  };
}

export function validateReassignmentReason(
  flags: ReassignmentFlags | undefined,
  reason: string | undefined,
): string | null {
  const needsReason =
    flags?.changesPriority ||
    flags?.changesDeadlineCommitment ||
    flags?.changesClientFacingScope ||
    flags?.createsMaterialRisk;

  if (!needsReason) return null;
  if (!reason?.trim()) {
    return "Reassignment reason is required when changing priority, deadline, client-facing scope, or material risk.";
  }
  if (reason.trim().length > MAX_HANDOFF_FIELD_LENGTH) {
    return `Reassignment reason must be at most ${MAX_HANDOFF_FIELD_LENGTH} characters.`;
  }
  return null;
}

export type BuildHandoffInput = {
  campaignId: string;
  taskId: string;
  fromUserId: string;
  fromDisplayName: string;
  fromRole: ProductionRole;
  toRole: ProductionRole;
  fromState: TaskWorkflowState;
  toState: TaskWorkflowState;
  action: TaskHandoffAction;
  payload: HandoffPayload;
  reassignmentReason?: string;
  reassignmentFlags?: ReassignmentFlags;
};

export function buildHandoffRecord(input: BuildHandoffInput): TaskHandoffRecord {
  return {
    id: randomUUID(),
    campaignId: input.campaignId,
    taskId: input.taskId,
    createdAt: new Date().toISOString(),
    fromUserId: input.fromUserId,
    fromDisplayName: input.fromDisplayName,
    fromRole: input.fromRole,
    toRole: input.toRole,
    transition: {
      from: input.fromState,
      to: input.toState,
    },
    completedSummary: input.payload.completedSummary,
    sourceContext: input.payload.sourceContext,
    nextSteps: input.payload.nextSteps,
    openQuestions: input.payload.openQuestions,
    risks: input.payload.risks,
    workRef: input.payload.workRef,
    internalNotes: input.payload.internalNotes,
    action: input.action,
    reassignmentReason: input.reassignmentReason?.trim() || undefined,
    reassignmentFlags: input.reassignmentFlags,
  };
}

export function appendHandoff(
  handoffs: readonly TaskHandoffRecord[] | undefined,
  record: TaskHandoffRecord,
): TaskHandoffRecord[] {
  const existing = handoffs ?? [];
  if (existing.some((entry) => entry.id === record.id)) {
    throw new Error("Duplicate handoff id.");
  }
  return [...existing, record];
}
