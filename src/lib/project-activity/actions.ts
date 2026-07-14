import { randomUUID } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { StudioUser } from "@/lib/campaign-store/types";
import {
  canDirectApplyToRecord,
  ensureCustomerFieldTokensBackfill,
  fieldTokensMatch,
  isDirectApplyTargetKey,
  isFreeformRequestTargetKey,
  readFieldToken,
  readOfficialFieldValue,
  requestTargetLabel,
  updateCustomerField,
  withAuthorizedCustomerFieldWrite,
  normalizeOfficialValue,
  type DirectApplyTargetKey,
  type RequestTargetKey,
} from "@/lib/customer-field-tokens";

import { assessSuggestedClassification } from "./classify";
import { bridgeProjectChangeToOwnerDesk } from "@/lib/project-change/escalate";
import { getOrInitializeProjectActivity, writeProjectActivityEnvelope } from "./store";
import type {
  ActivitySourceType,
  InformationUpdateRequest,
  ProjectActivityAuditEvent,
  ProjectActivityAuditEventKind,
  ProjectActivityEnvelope,
  RequestClassification,
} from "./types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

function nowIso() {
  return new Date().toISOString();
}

function actorFromUser(user: StudioUser) {
  return {
    role: user.roles.includes("client") ? ("customer" as const) : ("staff" as const),
    userId: user.id,
    displayName: user.displayName,
  };
}

function eventExists(
  envelope: ProjectActivityEnvelope,
  sourceType: ActivitySourceType,
  sourceId: string,
): ProjectActivityAuditEvent | undefined {
  return envelope.events.find((e) => e.sourceType === sourceType && e.sourceId === sourceId);
}

export function appendActivityEvent(
  envelope: ProjectActivityEnvelope,
  event: Omit<ProjectActivityAuditEvent, "id" | "occurredAt" | "campaignId"> & {
    id?: string;
    occurredAt?: string;
  },
): ProjectActivityEnvelope {
  const duplicate = eventExists(envelope, event.sourceType, event.sourceId);
  if (duplicate) return envelope;

  const occurredAt = event.occurredAt ?? nowIso();
  const next: ProjectActivityAuditEvent = {
    id: event.id ?? randomUUID(),
    campaignId: envelope.campaignId,
    occurredAt,
    kind: event.kind,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    actor: event.actor,
    requestId: event.requestId,
    headline: event.headline,
    detail: event.detail,
    payload: event.payload,
  };

  return {
    ...envelope,
    events: [...envelope.events, next],
    updatedAt: occurredAt,
    version: envelope.version + 1,
  };
}

function findRequestByIdempotency(
  envelope: ProjectActivityEnvelope,
  idempotencyKey: string,
): InformationUpdateRequest | undefined {
  return envelope.requests.find((r) => r.idempotencyKey === idempotencyKey);
}

function idempotencyPayloadMatches(
  existing: InformationUpdateRequest,
  targetKey: RequestTargetKey,
  requestedValue: string,
  note?: string,
): boolean {
  return (
    existing.targetKey === targetKey &&
    existing.requestedValue === requestedValue.trim() &&
    (existing.note ?? undefined) === (note?.trim() || undefined)
  );
}

export async function submitInformationUpdateRequest(params: {
  campaignId: string;
  user: StudioUser;
  idempotencyKey: string;
  targetKey: RequestTargetKey;
  requestedValue: string;
  note?: string;
  campaign: CampaignRecord;
}): Promise<
  | { ok: true; request: InformationUpdateRequest; envelope: ProjectActivityEnvelope }
  | { ok: false; error: string; status: number }
> {
  const { campaignId, user, idempotencyKey, targetKey, requestedValue, note, campaign } = params;

  if (!campaign.paymentReceivedAt) {
    return { ok: false, error: "Project requests are available after payment is confirmed.", status: 403 };
  }

  if (isDirectApplyTargetKey(targetKey) && !canDirectApplyToRecord(campaign)) {
    return {
      ok: false,
      error: "This project does not have Project Details on record for that update.",
      status: 400,
    };
  }

  let envelope = await getOrInitializeProjectActivity(campaignId);
  const existing = findRequestByIdempotency(envelope, idempotencyKey);
  if (existing) {
    if (!idempotencyPayloadMatches(existing, targetKey, requestedValue, note)) {
      return {
        ok: false,
        error: "Idempotency key already used with a different payload.",
        status: 409,
      };
    }
    return { ok: true, request: existing, envelope };
  }

  const requestId = randomUUID();
  const submittedAt = nowIso();
  const suggested = assessSuggestedClassification(requestedValue, note);
  const isFreeform = isFreeformRequestTargetKey(targetKey);

  let previousValue: string | null = null;
  let fieldTokenAtCapture = null;
  if (isDirectApplyTargetKey(targetKey)) {
    const campaignWithTokens = ensureCustomerFieldTokensBackfill(campaign);
    previousValue = readOfficialFieldValue(campaignWithTokens, targetKey);
    fieldTokenAtCapture = readFieldToken(campaignWithTokens, targetKey);
  }

  const status = isFreeform || suggested ? "needs_studio_review" : "request_received";

  const request: InformationUpdateRequest = {
    id: requestId,
    campaignId,
    idempotencyKey,
    targetKey,
    targetLabel: requestTargetLabel(targetKey),
    previousValueCaptured: previousValue,
    requestedValue: requestedValue.trim(),
    note: note?.trim() || undefined,
    fieldTokenAtCapture,
    status,
    classification: null,
    suggestedClassification: suggested ?? undefined,
    submittedBy: { userId: user.id, displayName: user.displayName },
    submittedAt,
  };

  envelope = {
    ...envelope,
    requests: [...envelope.requests, request],
    updatedAt: submittedAt,
    version: envelope.version + 1,
  };

  const detailParts = [
    request.targetLabel,
    previousValue ? `${previousValue} → ${request.requestedValue}` : request.requestedValue,
  ].filter(Boolean);

  envelope = appendActivityEvent(envelope, {
    kind: "request_received",
    sourceType: "information_update_request",
    sourceId: requestId,
    actor: actorFromUser(user),
    requestId,
    headline: "Request received",
    detail: detailParts.join(" — "),
    payload: {
      targetLabel: request.targetLabel,
      previousValue: previousValue,
      requestedValue: request.requestedValue,
      status: request.status,
    },
  });

  const saved = await writeProjectActivityEnvelope(envelope);
  return { ok: true, request, envelope: saved };
}

export async function classifyInformationUpdateRequest(params: {
  campaignId: string;
  requestId: string;
  user: StudioUser;
  classification: RequestClassification;
}): Promise<
  | { ok: true; request: InformationUpdateRequest; envelope: ProjectActivityEnvelope }
  | { ok: false; error: string; status: number }
> {
  const envelope = await getOrInitializeProjectActivity(params.campaignId);
  const index = envelope.requests.findIndex((r) => r.id === params.requestId);
  if (index === -1) return { ok: false, error: "Request not found.", status: 404 };

  const current = envelope.requests[index]!;
  if (!params.classification) {
    return { ok: false, error: "Classification is required.", status: 400 };
  }

  const classifiedAt = nowIso();
  let status = current.status;
  if (params.classification === "information_update") status = "approved_for_apply";
  if (params.classification === "project_change") status = "held";

  const updated: InformationUpdateRequest = {
    ...current,
    classification: params.classification,
    status,
    classifiedAt,
    classifiedBy: params.user.id,
  };

  let next: ProjectActivityEnvelope = {
    ...envelope,
    requests: envelope.requests.map((r, i) => (i === index ? updated : r)),
    updatedAt: classifiedAt,
    version: envelope.version + 1,
  };

  next = appendActivityEvent(next, {
    kind: "request_classified",
    sourceType: "staff_classify",
    sourceId: `${params.requestId}:${classifiedAt}`,
    actor: actorFromUser(params.user),
    requestId: params.requestId,
    headline: "Request classified",
    payload: { classification: params.classification, status },
  });

  if (params.classification === "project_change") {
    next = appendActivityEvent(next, {
      kind: "escalated_to_project_change",
      sourceType: "staff_classify",
      sourceId: `${params.requestId}:escalated:${classifiedAt}`,
      actor: actorFromUser(params.user),
      requestId: params.requestId,
      headline: "Held for Studio review",
      detail: "This request may affect project scope and is not applied through the lightweight path.",
    });
  }

  const saved = await writeProjectActivityEnvelope(next);
  return { ok: true, request: updated, envelope: saved };
}

export async function applyInformationUpdateRequest(params: {
  campaignId: string;
  requestId: string;
  user: StudioUser;
}): Promise<
  | { ok: true; request: InformationUpdateRequest; envelope: ProjectActivityEnvelope }
  | { ok: false; error: string; status: number; conflict?: boolean }
> {
  const campaignEnvelope = await readCampaignEnvelope(params.campaignId);
  if (!campaignEnvelope) return { ok: false, error: "Campaign not found.", status: 404 };

  let activity = await getOrInitializeProjectActivity(params.campaignId);
  const index = activity.requests.findIndex((r) => r.id === params.requestId);
  if (index === -1) return { ok: false, error: "Request not found.", status: 404 };

  const request = activity.requests[index]!;
  if (request.classification !== "information_update") {
    return { ok: false, error: "Only classified Information Updates can be applied.", status: 400 };
  }
  if (request.status !== "approved_for_apply") {
    return { ok: false, error: "Request is not approved for apply.", status: 400 };
  }
  if (!isDirectApplyTargetKey(request.targetKey)) {
    return { ok: false, error: "Freeform requests cannot be applied to a project field automatically.", status: 400 };
  }

  const key = request.targetKey as DirectApplyTargetKey;
  const record = ensureCustomerFieldTokensBackfill(campaignEnvelope.record);
  const currentToken = readFieldToken(record, key);
  const currentValue = readOfficialFieldValue(record, key);

  const tokenMismatch = !fieldTokensMatch(request.fieldTokenAtCapture, currentToken);
  const valueMismatch =
    normalizeOfficialValue(currentValue) !== normalizeOfficialValue(request.previousValueCaptured);

  if (tokenMismatch || valueMismatch) {
    const conflictAt = nowIso();
    const conflicted: InformationUpdateRequest = {
      ...request,
      status: "needs_studio_review",
    };
    activity = {
      ...activity,
      requests: activity.requests.map((r, i) => (i === index ? conflicted : r)),
      updatedAt: conflictAt,
      version: activity.version + 1,
    };
    activity = appendActivityEvent(activity, {
      kind: "stale_field_token_conflict",
      sourceType: "staff_apply",
      sourceId: `${params.requestId}:conflict:${conflictAt}`,
      actor: actorFromUser(params.user),
      requestId: params.requestId,
      headline: "This request needs Studio review",
      detail: "The official project value changed since this request was submitted.",
      payload: {
        capturedRevision: request.fieldTokenAtCapture?.revision,
        currentRevision: currentToken?.revision,
        previousValueCaptured: request.previousValueCaptured,
        currentValue,
        requestedValue: request.requestedValue,
      },
    });
    await writeProjectActivityEnvelope(activity);
    return {
      ok: false,
      error: "Official value changed since request was submitted.",
      status: 409,
      conflict: true,
    };
  }

  const appliedAt = nowIso();
  const updatedRecord = updateCustomerField(record, key, request.requestedValue);
  await withAuthorizedCustomerFieldWrite(() =>
    upsertCampaignRecord(updatedRecord, campaignEnvelope.clientUserId),
  );

  const applied: InformationUpdateRequest = {
    ...request,
    status: "applied",
    appliedAt,
    appliedBy: params.user.id,
  };

  activity = {
    ...activity,
    requests: activity.requests.map((r, i) => (i === index ? applied : r)),
    updatedAt: appliedAt,
    version: activity.version + 1,
  };

  activity = appendActivityEvent(activity, {
    kind: "update_applied",
    sourceType: "staff_apply",
    sourceId: `${params.requestId}:applied:${appliedAt}`,
    actor: actorFromUser(params.user),
    requestId: params.requestId,
    headline: `Update applied — ${request.targetLabel}`,
    detail:
      request.previousValueCaptured != null
        ? `${request.previousValueCaptured} → ${request.requestedValue}`
        : request.requestedValue,
    payload: {
      targetLabel: request.targetLabel,
      previousValue: request.previousValueCaptured,
      requestedValue: request.requestedValue,
      status: "applied",
    },
  });

  const saved = await writeProjectActivityEnvelope(activity);
  return { ok: true, request: applied, envelope: saved };
}

export async function rejectInformationUpdateRequest(params: {
  campaignId: string;
  requestId: string;
  user: StudioUser;
  customerReason: string;
}): Promise<
  | { ok: true; request: InformationUpdateRequest; envelope: ProjectActivityEnvelope }
  | { ok: false; error: string; status: number }
> {
  let envelope = await getOrInitializeProjectActivity(params.campaignId);
  const index = envelope.requests.findIndex((r) => r.id === params.requestId);
  if (index === -1) return { ok: false, error: "Request not found.", status: 404 };

  const rejectedAt = nowIso();
  const updated: InformationUpdateRequest = {
    ...envelope.requests[index]!,
    status: "rejected",
    rejectionReason: params.customerReason.trim(),
  };

  envelope = {
    ...envelope,
    requests: envelope.requests.map((r, i) => (i === index ? updated : r)),
    updatedAt: rejectedAt,
    version: envelope.version + 1,
  };

  envelope = appendActivityEvent(envelope, {
    kind: "update_rejected",
    sourceType: "staff_reject",
    sourceId: `${params.requestId}:rejected:${rejectedAt}`,
    actor: actorFromUser(params.user),
    requestId: params.requestId,
    headline: "Request could not be applied",
    detail: params.customerReason.trim(),
  });

  const saved = await writeProjectActivityEnvelope(envelope);
  return { ok: true, request: updated, envelope: saved };
}

export async function escalateProjectChangeRequest(params: {
  campaignId: string;
  requestId: string;
  user: StudioUser;
  assignments: CampaignAssignmentsFile;
  campaign: CampaignRecord;
}): Promise<
  | {
      ok: true;
      request: InformationUpdateRequest;
      envelope: ProjectActivityEnvelope;
      exceptionId: string;
      alreadyEscalated: boolean;
    }
  | { ok: false; error: string; status: number }
> {
  let envelope = await getOrInitializeProjectActivity(params.campaignId);
  const index = envelope.requests.findIndex((r) => r.id === params.requestId);
  if (index === -1) return { ok: false, error: "Request not found.", status: 404 };

  const current = envelope.requests[index]!;
  const bridge = await bridgeProjectChangeToOwnerDesk({
    campaignId: params.campaignId,
    request: current,
    user: params.user,
    assignments: params.assignments,
    campaign: params.campaign,
  });

  if (!bridge.ok) return bridge;

  if (
    bridge.alreadyEscalated &&
    current.projectChangeExceptionId === bridge.exceptionId &&
    current.escalatedAt
  ) {
    return {
      ok: true,
      request: current,
      envelope,
      exceptionId: bridge.exceptionId,
      alreadyEscalated: true,
    };
  }

  const linkedAt = current.escalatedAt ?? nowIso();
  const updated: InformationUpdateRequest = {
    ...current,
    projectChangeExceptionId: bridge.exceptionId,
    escalatedAt: linkedAt,
  };

  let next: ProjectActivityEnvelope = {
    ...envelope,
    requests: envelope.requests.map((r, i) => (i === index ? updated : r)),
    updatedAt: linkedAt,
    version: envelope.version + 1,
  };

  if (!bridge.alreadyEscalated) {
    next = appendActivityEvent(next, {
      kind: "project_change_escalated",
      sourceType: "staff_escalate",
      sourceId: `${params.requestId}:project_change_escalated`,
      actor: actorFromUser(params.user),
      requestId: params.requestId,
      headline: "Submitted for Studio review",
      detail: "This request is on the Owner Desk for scope review.",
      payload: { exceptionId: bridge.exceptionId },
    });
  }

  const saved = await writeProjectActivityEnvelope(next);
  return {
    ok: true,
    request: updated,
    envelope: saved,
    exceptionId: bridge.exceptionId,
    alreadyEscalated: bridge.alreadyEscalated,
  };
}

export async function appendMaterialActivityEvent(params: {
  campaignId: string;
  kind: Extract<ProjectActivityAuditEventKind, "material_submitted" | "material_approved" | "material_needs_clarification">;
  sourceId: string;
  headline: string;
  detail?: string;
  actor: ProjectActivityAuditEvent["actor"];
}): Promise<ProjectActivityEnvelope> {
  let envelope = await getOrInitializeProjectActivity(params.campaignId);
  envelope = appendActivityEvent(envelope, {
    kind: params.kind,
    sourceType: "materials_submit",
    sourceId: params.sourceId,
    actor: params.actor,
    headline: params.headline,
    detail: params.detail,
  });
  return writeProjectActivityEnvelope(envelope);
}
