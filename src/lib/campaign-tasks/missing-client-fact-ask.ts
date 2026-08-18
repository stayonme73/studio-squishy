import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import {
  applyPromotionToMaterials,
  contentKindForCategory,
  validateApproveClientRequestPayload,
} from "@/lib/materials/promotion";
import type { ServerMaterialsEnvelope } from "@/lib/materials/types";

import {
  appendExceptionEvent,
  buildExceptionEvent,
  exceptionActorRole,
  findExceptionById,
  isOpenExceptionStatus,
  upsertExceptionRecord,
} from "./exceptions";
import { resolveDefaultClientWording } from "./exceptions-promotion-view";
import type { ExceptionActionResult } from "./exceptions-actions";
import type { CampaignExceptionRecord } from "./exceptions-types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import type { ServerTasksEnvelope } from "./types";

function emptyMaterialsEnvelope(campaignId: string): ServerMaterialsEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    items: [],
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

function withExceptionEnvelope(
  envelope: ServerTasksEnvelope,
  records: CampaignExceptionRecord[],
  events: NonNullable<ServerTasksEnvelope["exceptionEvents"]>,
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

/**
 * Ordinary missing customer information is Machine work, not Owner work.
 * Send the templated client request immediately and wait on the customer.
 */
export function applyOrdinaryMissingClientFactAsk(
  envelope: ServerTasksEnvelope,
  exceptionId: string,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  materialsEnvelope: ServerMaterialsEnvelope,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }
  if (existing.kind !== "missing_client_fact") {
    return { ok: false, error: "Exception is not a missing client fact.", status: 422 };
  }
  if (!isOpenExceptionStatus(existing.status)) {
    return { ok: false, error: "Exception is not open.", status: 422 };
  }
  if (existing.promotion) {
    return { ok: true, envelope, exception: existing, materialsEnvelope };
  }

  const wording = resolveDefaultClientWording(
    existing,
    envelope.tasks,
    materialsEnvelope.items,
  );
  const payload = {
    exceptionId: existing.id,
    category: wording.category,
    contentKind: wording.contentKind,
    clientFacingLabel: wording.clientFacingLabel,
    clientFacingPrompt: wording.clientFacingPrompt,
    whyNeeded: wording.whyNeeded,
    requirementLevel: wording.requirementLevel,
    relatedServiceIds: wording.relatedServiceIds,
  };
  const validation = validateApproveClientRequestPayload(payload);
  const now = new Date().toISOString();
  const actorRole = exceptionActorRole(user, assignments);

  if (!validation.ok) {
    const updated: CampaignExceptionRecord = {
      ...existing,
      status: "waiting_client",
      updatedAt: now,
    };
    const event = buildExceptionEvent({
      exceptionId: updated.id,
      campaignId: envelope.campaignId,
      user,
      actorRole,
      action: "raised",
      statusAfter: "waiting_client",
      notes: existing.description ?? existing.title,
    });
    return {
      ok: true,
      envelope: withExceptionEnvelope(
        envelope,
        upsertExceptionRecord(envelope.exceptionRecords, updated),
        appendExceptionEvent(envelope.exceptionEvents, event),
      ),
      exception: updated,
      materialsEnvelope,
    };
  }

  const approvedPayload = validation.payload;
  const contentKind = approvedPayload.contentKind ?? contentKindForCategory(approvedPayload.category);
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
    notes: "Machine sent the templated customer request. Owner judgment was not required.",
  });

  return {
    ok: true,
    envelope: withExceptionEnvelope(
      envelope,
      upsertExceptionRecord(envelope.exceptionRecords, updated),
      appendExceptionEvent(envelope.exceptionEvents, event),
    ),
    exception: updated,
    materialsEnvelope: nextMaterials,
  };
}

export function applyOrdinaryMissingClientFactsInEnvelope(
  envelope: ServerTasksEnvelope,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  materialsEnvelope?: ServerMaterialsEnvelope,
): {
  envelope: ServerTasksEnvelope;
  materialsEnvelope: ServerMaterialsEnvelope;
  askedIds: readonly string[];
} {
  let workingEnvelope = envelope;
  let workingMaterials = materialsEnvelope ?? emptyMaterialsEnvelope(envelope.campaignId);
  const askedIds: string[] = [];

  for (const record of envelope.exceptionRecords ?? []) {
    if (record.kind !== "missing_client_fact") continue;
    if (!isOpenExceptionStatus(record.status)) continue;
    if (record.promotion && record.status === "waiting_client") continue;

    const asked = applyOrdinaryMissingClientFactAsk(
      workingEnvelope,
      record.id,
      user,
      assignments,
      workingMaterials,
    );
    if (!asked.ok) continue;
    workingEnvelope = asked.envelope;
    if (asked.materialsEnvelope) workingMaterials = asked.materialsEnvelope;
    askedIds.push(record.id);
  }

  return { envelope: workingEnvelope, materialsEnvelope: workingMaterials, askedIds };
}
