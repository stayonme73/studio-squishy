import type {
  MaterialCategory,
  MaterialContentKind,
  MaterialRequirementLevel,
} from "@/lib/materials/types";

import type { ProductionRole } from "./types";
import type { ServiceId } from "@/catalog/types";

/** Current disposition of an exception — updated by new events, never rewritten in history. */
export type CampaignExceptionStatus =
  | "open"
  | "waiting_internal"
  | "waiting_owner"
  | "waiting_client"
  | "resolved"
  | "cancelled";

export type CampaignExceptionKind =
  | "compliance_hold"
  | "direction_disagreement"
  | "missing_client_fact"
  | "scope_change"
  | "deadline_commitment"
  | "deadline_risk"
  | "revision_exhausted"
  | "client_request"
  | "routine_internal";

export type CampaignExceptionEventAction =
  | "raised"
  | "assigned"
  | "resolved"
  | "cancelled"
  | "approved_client_request"
  | "declined_promotion"
  | "client_material_submitted";

export type CampaignExceptionPromotion = {
  approvedAt: string;
  approvedByUserId: string;
  approvedByDisplayName: string;
  materialItemIds: readonly string[];
  consolidatedRequestId: string;
  clientFacingLabel: string;
  clientFacingPrompt: string;
  whyNeeded: string;
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  requirementLevel: MaterialRequirementLevel;
};

export const PROMOTABLE_EXCEPTION_KINDS: readonly CampaignExceptionKind[] = [
  "missing_client_fact",
  "client_request",
] as const;

export function isPromotableExceptionKind(kind: CampaignExceptionKind): boolean {
  return PROMOTABLE_EXCEPTION_KINDS.includes(kind);
}

export type CampaignExceptionClientRequestDraft = {
  whyTeamCannotSolveInternally?: string;
  exactClientOnlyItem?: string;
  whyBlocksWork?: string;
};

/** Append-only audit trail — history never changes. */
export type CampaignExceptionEvent = {
  id: string;
  exceptionId: string;
  campaignId: string;
  createdAt: string;
  actorUserId: string;
  actorDisplayName: string;
  actorRole: ProductionRole;
  action: CampaignExceptionEventAction;
  notes?: string;
  assignToUserId?: string;
  assignToDisplayName?: string;
  statusAfter?: CampaignExceptionStatus;
  resolutionNotes?: string;
};

/** One exception entity — status may update; entries are never removed. */
export type CampaignExceptionRecord = {
  id: string;
  campaignId: string;
  kind: CampaignExceptionKind;
  status: CampaignExceptionStatus;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  raisedByUserId: string;
  raisedByDisplayName: string;
  raisedByRole: ProductionRole;
  taskId?: string;
  qaRecordId?: string;
  assignedToUserId?: string;
  assignedToDisplayName?: string;
  clientRequestDraft?: CampaignExceptionClientRequestDraft;
  /** Set when Owner approves client-material promotion (schema v6). */
  promotion?: CampaignExceptionPromotion;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByDisplayName?: string;
};

export type RaiseExceptionPayload = {
  kind: CampaignExceptionKind;
  title: string;
  description?: string;
  taskId?: string;
  clientRequestDraft?: CampaignExceptionClientRequestDraft;
};

export type AssignExceptionPayload = {
  exceptionId: string;
  assignToUserId?: string;
  notes?: string;
};

export type ResolveExceptionPayload = {
  exceptionId: string;
  resolutionNotes?: string;
};

export type ApproveClientRequestPayload = {
  exceptionId: string;
  category: MaterialCategory;
  contentKind?: MaterialContentKind;
  clientFacingLabel: string;
  clientFacingPrompt: string;
  whyNeeded: string;
  requirementLevel: MaterialRequirementLevel;
  relatedServiceIds?: readonly ServiceId[];
  existingMaterialItemIds?: readonly string[];
};

export type DeclinePromotionPayload = {
  exceptionId: string;
  notes?: string;
};
