import { randomUUID } from "crypto";

import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import {
  exceptionKindProducerResolvable,
  exceptionKindRequiresOwner,
} from "@/config/campaign-exceptions";
import { isPromotableExceptionKind } from "./exceptions-types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { userIsProducer } from "./capabilities";
import type {
  CampaignExceptionEvent,
  CampaignExceptionKind,
  CampaignExceptionRecord,
  CampaignExceptionStatus,
  RaiseExceptionPayload,
} from "./exceptions-types";
import type { ProductionRole } from "./types";

export const TERMINAL_EXCEPTION_STATUSES: readonly CampaignExceptionStatus[] = [
  "resolved",
  "cancelled",
] as const;

export function isOpenExceptionStatus(status: CampaignExceptionStatus): boolean {
  return !TERMINAL_EXCEPTION_STATUSES.includes(status);
}

export function initialStatusForKind(kind: CampaignExceptionKind): CampaignExceptionStatus {
  if (exceptionKindRequiresOwner(kind)) return "waiting_owner";
  if (kind === "missing_client_fact") return "waiting_owner";
  if (kind === "client_request") return "waiting_owner";
  return "open";
}

export function appendExceptionEvent(
  existing: readonly CampaignExceptionEvent[] | undefined,
  event: CampaignExceptionEvent,
): CampaignExceptionEvent[] {
  return [...(existing ?? []), event];
}

export function upsertExceptionRecord(
  existing: readonly CampaignExceptionRecord[] | undefined,
  record: CampaignExceptionRecord,
): CampaignExceptionRecord[] {
  const list = [...(existing ?? [])];
  const index = list.findIndex((entry) => entry.id === record.id);
  if (index === -1) {
    list.push(record);
  } else {
    list[index] = record;
  }
  return list;
}

export function findExceptionById(
  records: readonly CampaignExceptionRecord[] | undefined,
  exceptionId: string,
): CampaignExceptionRecord | undefined {
  return (records ?? []).find((entry) => entry.id === exceptionId);
}

export function findOpenException(
  records: readonly CampaignExceptionRecord[] | undefined,
  predicate: (record: CampaignExceptionRecord) => boolean,
): CampaignExceptionRecord | undefined {
  return (records ?? []).find(
    (record) => isOpenExceptionStatus(record.status) && predicate(record),
  );
}

export function buildExceptionEvent(input: {
  exceptionId: string;
  campaignId: string;
  user: StudioUser;
  actorRole: ProductionRole;
  action: CampaignExceptionEvent["action"];
  notes?: string;
  assignToUserId?: string;
  assignToDisplayName?: string;
  statusAfter?: CampaignExceptionStatus;
  resolutionNotes?: string;
}): CampaignExceptionEvent {
  return {
    id: randomUUID(),
    exceptionId: input.exceptionId,
    campaignId: input.campaignId,
    createdAt: new Date().toISOString(),
    actorUserId: input.user.id,
    actorDisplayName: input.user.displayName,
    actorRole: input.actorRole,
    action: input.action,
    notes: input.notes,
    assignToUserId: input.assignToUserId,
    assignToDisplayName: input.assignToDisplayName,
    statusAfter: input.statusAfter,
    resolutionNotes: input.resolutionNotes,
  };
}

export function buildExceptionRecord(input: {
  campaignId: string;
  kind: CampaignExceptionKind;
  title: string;
  description?: string;
  user: StudioUser;
  actorRole: ProductionRole;
  taskId?: string;
  qaRecordId?: string;
  clientRequestDraft?: RaiseExceptionPayload["clientRequestDraft"];
}): CampaignExceptionRecord {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    campaignId: input.campaignId,
    kind: input.kind,
    status: initialStatusForKind(input.kind),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    raisedByUserId: input.user.id,
    raisedByDisplayName: input.user.displayName,
    raisedByRole: input.actorRole,
    taskId: input.taskId,
    qaRecordId: input.qaRecordId,
    clientRequestDraft: input.clientRequestDraft,
  };
}

export function validateRaiseException(
  payload: RaiseExceptionPayload,
): { ok: true; payload: RaiseExceptionPayload } | { ok: false; error: string } {
  if (!payload.title?.trim()) {
    return { ok: false, error: "Exception title is required." };
  }

  if (payload.kind === "client_request" && payload.clientRequestDraft) {
    const draft = payload.clientRequestDraft;
    const hasField =
      draft.whyTeamCannotSolveInternally?.trim() ||
      draft.exactClientOnlyItem?.trim() ||
      draft.whyBlocksWork?.trim();
    if (!hasField) {
      return {
        ok: false,
        error: "Client request draft requires at least one field.",
      };
    }
  }

  return {
    ok: true,
    payload: {
      ...payload,
      title: payload.title.trim(),
      description: payload.description?.trim() || undefined,
    },
  };
}

export function exceptionActorRole(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ProductionRole {
  if (isOwnerUser(user)) return "owner";
  if (userIsProducer(user, assignments)) return "producer_dispatcher";
  return "qa";
}

export function canRaiseException(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (isOwnerUser(user)) return true;
  if (userIsProducer(user, assignments)) return true;
  return (assignments.staffCapabilities?.[user.id]?.length ?? 0) > 0;
}

/** Client-request exceptions may only be raised by Owner or Producer. */
export function canRaiseExceptionKind(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  kind: CampaignExceptionKind,
): boolean {
  if (!canRaiseException(user, assignments)) return false;
  if (kind === "client_request") {
    return isOwnerUser(user) || userIsProducer(user, assignments);
  }
  return true;
}

export function canAssignException(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (isOwnerUser(user)) return true;
  return userIsProducer(user, assignments);
}

export function canResolvePromotedException(
  exception: CampaignExceptionRecord,
  materials: readonly CampaignMaterialItem[],
): boolean {
  if (!exception.promotion) return true;
  const linked = materials.filter((item) =>
    exception.promotion!.materialItemIds.includes(item.id),
  );
  if (linked.length === 0) return false;
  return linked.every((item) => item.reviewStatus === "approved_for_use");
}

export function canResolveException(
  user: StudioUser,
  record: CampaignExceptionRecord,
  assignments: CampaignAssignmentsFile,
  materials: readonly CampaignMaterialItem[] = [],
): boolean {
  if (!isOpenExceptionStatus(record.status)) return false;

  if (record.promotion && !canResolvePromotedException(record, materials)) {
    return false;
  }

  if (exceptionKindRequiresOwner(record.kind)) {
    return isOwnerUser(user);
  }

  if (record.kind === "missing_client_fact") {
    if (record.promotion) return isOwnerUser(user) || userIsProducer(user, assignments);
    return isOwnerUser(user) || userIsProducer(user, assignments);
  }

  if (exceptionKindProducerResolvable(record.kind)) {
    return isOwnerUser(user) || userIsProducer(user, assignments);
  }

  return isOwnerUser(user);
}

export const APPROVABLE_EXCEPTION_STATUSES: readonly CampaignExceptionStatus[] = [
  "open",
  "waiting_owner",
] as const;

export function canApproveClientRequest(
  user: StudioUser,
  record: CampaignExceptionRecord,
): boolean {
  if (!isPromotableExceptionKind(record.kind)) return false;
  if (!APPROVABLE_EXCEPTION_STATUSES.includes(record.status)) return false;
  if (record.promotion) return false;
  return isOwnerUser(user);
}

export function canDeclinePromotion(
  user: StudioUser,
  record: CampaignExceptionRecord,
): boolean {
  if (record.kind !== "missing_client_fact") return false;
  if (!APPROVABLE_EXCEPTION_STATUSES.includes(record.status)) return false;
  if (record.promotion) return false;
  return isOwnerUser(user);
}

export function assignStatusForUser(
  assignee: StudioUser,
  assignments: CampaignAssignmentsFile,
): CampaignExceptionStatus {
  if (isOwnerUser(assignee)) return "waiting_owner";
  if (userIsProducer(assignee, assignments)) return "waiting_internal";
  return "waiting_internal";
}

export function resolveExceptionSummary(
  records: readonly CampaignExceptionRecord[] | undefined,
) {
  const list = records ?? [];
  const open = list.filter((entry) => isOpenExceptionStatus(entry.status));
  return {
    total: list.length,
    open: open.length,
    waitingOwner: open.filter((entry) => entry.status === "waiting_owner").length,
    waitingClient: open.filter((entry) => entry.status === "waiting_client").length,
  };
}
