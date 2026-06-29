import type { CampaignRecord } from "@/config/studio-board";
import { resolveCampaignRevisionRounds } from "@/lib/approved-plan-display";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import {
  appendExceptionEvent,
  buildExceptionEvent,
  buildExceptionRecord,
  canApproveClientRequest,
  canAssignException,
  canDeclinePromotion,
  canRaiseException,
  canRaiseExceptionKind,
  canResolveException,
  canResolvePromotedException,
  exceptionActorRole,
  findExceptionById,
  upsertExceptionRecord,
  validateRaiseException,
  assignStatusForUser,
} from "./exceptions";
import type {
  AssignExceptionPayload,
  ApproveClientRequestPayload,
  CampaignExceptionRecord,
  DeclinePromotionPayload,
  RaiseExceptionPayload,
  ResolveExceptionPayload,
} from "./exceptions-types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import {
  applyPromotionToMaterials,
  contentKindForCategory,
  validateApproveClientRequestPayload,
} from "@/lib/materials/promotion";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "@/lib/materials/types";
import type { CampaignTaskItem, QaBlockCategory, QaFailCategory, QaRecord, ServerTasksEnvelope } from "./types";

export type ExceptionActionResult =
  | {
      ok: true;
      envelope: ServerTasksEnvelope;
      exception: CampaignExceptionRecord;
      materialsEnvelope?: ServerMaterialsEnvelope;
    }
  | { ok: false; error: string; status: number };

function withExceptionEnvelope(
  envelope: ServerTasksEnvelope,
  records: CampaignExceptionRecord[],
  events: ReturnType<typeof appendExceptionEvent>,
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    ...envelope,
    exceptionRecords: records,
    exceptionEvents: events,
    updatedAt: now,
    syncedAt: now,
    version: CAMPAIGN_TASKS_SCHEMA_VERSION,
  };
}

function clearTaskBlockerForResolvedException(
  task: CampaignTaskItem,
  kind: CampaignExceptionRecord["kind"],
): CampaignTaskItem {
  const reason = task.workflowBlockedReason ?? "";

  if (kind === "compliance_hold" && reason.includes("compliance_hold")) {
    return {
      ...task,
      workflowBlockedReason: undefined,
      workflowState: "ready_for_qa",
    };
  }

  if (kind === "direction_disagreement" && reason.includes("owner_escalation")) {
    return {
      ...task,
      workflowBlockedReason: undefined,
      workflowState: "ready_for_qa",
    };
  }

  if (kind === "missing_client_fact" && reason.startsWith("missing_client_fact:")) {
    return {
      ...task,
      workflowBlockedReason: undefined,
      workflowState: task.workflowState === "blocked" ? "unstarted" : task.workflowState,
    };
  }

  return task;
}

function applyTaskBlockerClears(
  envelope: ServerTasksEnvelope,
  exception: CampaignExceptionRecord,
): ServerTasksEnvelope {
  if (!exception.taskId) return envelope;

  const tasks = envelope.tasks.map((task) =>
    task.id === exception.taskId
      ? clearTaskBlockerForResolvedException(task, exception.kind)
      : task,
  );

  return { ...envelope, tasks };
}

export function applyRaiseException(
  envelope: ServerTasksEnvelope,
  payload: RaiseExceptionPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  if (!canRaiseException(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const validation = validateRaiseException(payload);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  if (!canRaiseExceptionKind(user, assignments, validation.payload.kind)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  if (payload.taskId) {
    const task = envelope.tasks.find((entry) => entry.id === payload.taskId);
    if (!task) {
      return { ok: false, error: "Task not found.", status: 404 };
    }
  }

  const actorRole = exceptionActorRole(user, assignments);
  const record = buildExceptionRecord({
    campaignId: envelope.campaignId,
    kind: validation.payload.kind,
    title: validation.payload.title,
    description: validation.payload.description,
    user,
    actorRole,
    taskId: validation.payload.taskId,
    clientRequestDraft: validation.payload.clientRequestDraft,
  });

  const event = buildExceptionEvent({
    exceptionId: record.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "raised",
    statusAfter: record.status,
    notes: validation.payload.description,
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, record);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: record,
  };
}

export function applyAssignException(
  envelope: ServerTasksEnvelope,
  payload: AssignExceptionPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignee: StudioUser,
): ExceptionActionResult {
  if (!canAssignException(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const nextStatus = assignStatusForUser(assignee, assignments);
  const now = new Date().toISOString();
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: nextStatus,
    assignedToUserId: assignee.id,
    assignedToDisplayName: assignee.displayName,
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "assigned",
    notes: payload.notes,
    assignToUserId: assignee.id,
    assignToDisplayName: assignee.displayName,
    statusAfter: nextStatus,
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function applyResolveException(
  envelope: ServerTasksEnvelope,
  payload: ResolveExceptionPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  materials: readonly CampaignMaterialItem[] = [],
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  if (!canResolveException(user, existing, assignments, materials)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  if (!canResolvePromotedException(existing, materials)) {
    return {
      ok: false,
      error: "Linked materials must be approved for use before resolving this exception.",
      status: 400,
    };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "resolved",
    resolutionNotes: payload.resolutionNotes?.trim() || undefined,
    resolvedAt: now,
    resolvedByUserId: user.id,
    resolvedByDisplayName: user.displayName,
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "resolved",
    resolutionNotes: payload.resolutionNotes,
    statusAfter: "resolved",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);
  let nextEnvelope = withExceptionEnvelope(envelope, records, events);
  nextEnvelope = applyTaskBlockerClears(nextEnvelope, updated);

  return {
    ok: true,
    envelope: nextEnvelope,
    exception: updated,
  };
}

export function applyApproveClientRequest(
  envelope: ServerTasksEnvelope,
  payload: ApproveClientRequestPayload,
  user: StudioUser,
  _assignments: CampaignAssignmentsFile,
  materialsEnvelope: ServerMaterialsEnvelope,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  if (!canApproveClientRequest(user, existing)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const validation = validateApproveClientRequestPayload(payload);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const approvedPayload = validation.payload;
  const now = new Date().toISOString();
  const actorRole = exceptionActorRole(user, _assignments);
  const contentKind =
    approvedPayload.contentKind ?? contentKindForCategory(approvedPayload.category);

  const { envelope: nextMaterials, materialItemIds } = applyPromotionToMaterials(
    materialsEnvelope,
    existing,
    { ...approvedPayload, contentKind },
    now,
  );

  const consolidatedRequestId = `${approvedPayload.category}:${contentKind}`;
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "waiting_client",
    updatedAt: now,
    promotion: {
      approvedAt: now,
      approvedByUserId: user.id,
      approvedByDisplayName: user.displayName,
      materialItemIds,
      consolidatedRequestId,
      clientFacingLabel: approvedPayload.clientFacingLabel,
      clientFacingPrompt: approvedPayload.clientFacingPrompt,
      whyNeeded: approvedPayload.whyNeeded,
      category: approvedPayload.category,
      contentKind,
      requirementLevel: approvedPayload.requirementLevel,
    },
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "approved_client_request",
    statusAfter: "waiting_client",
    notes: approvedPayload.whyNeeded,
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: updated,
    materialsEnvelope: nextMaterials,
  };
}

export function applyDeclinePromotion(
  envelope: ServerTasksEnvelope,
  payload: DeclinePromotionPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  if (!canDeclinePromotion(user, existing)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "waiting_internal",
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "declined_promotion",
    statusAfter: "waiting_internal",
    notes: payload.notes,
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function countTaskRevisionFails(
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): number {
  return (qaRecords ?? []).filter(
    (record) =>
      record.action === "qa_fail" &&
      record.category === "production_correction" &&
      (record.routedTaskId === taskId || record.taskId === taskId),
  ).length;
}

export function wouldExceedRevisionAllowance(
  campaign: CampaignRecord,
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): boolean {
  const allowed = resolveCampaignRevisionRounds(campaign);
  const currentFails = countTaskRevisionFails(qaRecords, taskId);
  return currentFails >= allowed;
}

export function bridgeExceptionFromQaBlock(
  envelope: ServerTasksEnvelope,
  qaRecord: QaRecord,
  category: QaBlockCategory,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ServerTasksEnvelope {
  const kind =
    category === "compliance_concern" ? "compliance_hold" : "direction_disagreement";

  const duplicate = (envelope.exceptionRecords ?? []).find(
    (entry) =>
      entry.qaRecordId === qaRecord.id ||
      (entry.taskId === qaRecord.taskId &&
        entry.kind === kind &&
        entry.status !== "resolved" &&
        entry.status !== "cancelled"),
  );
  if (duplicate) return envelope;

  const title =
    kind === "compliance_hold"
      ? "Compliance hold — QA block"
      : "Direction disagreement — Owner escalation";

  const actorRole = exceptionActorRole(user, assignments);
  const record = buildExceptionRecord({
    campaignId: envelope.campaignId,
    kind,
    title,
    description: qaRecord.notes,
    user,
    actorRole,
    taskId: qaRecord.taskId,
    qaRecordId: qaRecord.id,
  });

  const event = buildExceptionEvent({
    exceptionId: record.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "raised",
    statusAfter: record.status,
    notes: qaRecord.notes,
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, record);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);
  return withExceptionEnvelope(envelope, records, events);
}

export function bridgeExceptionFromMissingClientFact(
  envelope: ServerTasksEnvelope,
  qaRecord: QaRecord,
  routedTaskId: string,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ServerTasksEnvelope {
  const duplicate = (envelope.exceptionRecords ?? []).find(
    (entry) =>
      entry.qaRecordId === qaRecord.id ||
      (entry.taskId === routedTaskId &&
        entry.kind === "missing_client_fact" &&
        entry.status !== "resolved" &&
        entry.status !== "cancelled"),
  );
  if (duplicate) return envelope;

  const actorRole = exceptionActorRole(user, assignments);
  const record = buildExceptionRecord({
    campaignId: envelope.campaignId,
    kind: "missing_client_fact",
    title: "Missing client fact",
    description: qaRecord.missingFactDescription,
    user,
    actorRole,
    taskId: routedTaskId,
    qaRecordId: qaRecord.id,
  });

  const event = buildExceptionEvent({
    exceptionId: record.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "raised",
    statusAfter: record.status,
    notes: qaRecord.missingFactReason,
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, record);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);
  return withExceptionEnvelope(envelope, records, events);
}

export function bridgeExceptionFromRevisionExhausted(
  envelope: ServerTasksEnvelope,
  taskId: string,
  campaign: CampaignRecord,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ServerTasksEnvelope {
  const duplicate = (envelope.exceptionRecords ?? []).find(
    (entry) =>
      entry.taskId === taskId &&
      entry.kind === "revision_exhausted" &&
      entry.status !== "resolved" &&
      entry.status !== "cancelled",
  );
  if (duplicate) return envelope;

  const allowed = resolveCampaignRevisionRounds(campaign);
  const actorRole = exceptionActorRole(user, assignments);
  const record = buildExceptionRecord({
    campaignId: envelope.campaignId,
    kind: "revision_exhausted",
    title: "Revision allowance exhausted",
    description: `Approved plan includes ${allowed} revision round(s). Additional revision requires Owner decision.`,
    user,
    actorRole,
    taskId,
  });

  const event = buildExceptionEvent({
    exceptionId: record.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "raised",
    statusAfter: record.status,
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, record);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);
  return withExceptionEnvelope(envelope, records, events);
}
