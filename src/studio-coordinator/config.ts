import type { CustomerInteractionKind } from "@/decision-core";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";

import type { ClientCoordinatorEventType, InteractionExceptionMapping } from "./types";

/** Squishy acts through existing staff-capable mutators — not a new actor role. */
export const COORDINATOR_SYSTEM_USER: StudioUser = {
  id: "studio-coordinator",
  email: "coordinator@studio.local",
  displayName: "Squishy",
  roles: ["staff"],
};

/** Routes client events to Decision Core domains — no new rules. */
export const CLIENT_EVENT_DOMAIN: Record<
  ClientCoordinatorEventType,
  "customer_interaction" | "communication"
> = {
  project_question: "customer_interaction",
  clarification_request: "customer_interaction",
  status_inquiry: "customer_interaction",
  missing_file_upload: "customer_interaction",
  revision_message: "customer_interaction",
  revision_request: "customer_interaction",
  delivery_approval: "customer_interaction",
  payment_question: "customer_interaction",
  scope_request: "customer_interaction",
  refund_request: "customer_interaction",
  complaint: "customer_interaction",
  support_request: "customer_interaction",
  general_inquiry: "customer_interaction",
  communication_sync: "communication",
};

/** Maps classified interactions to existing exception kinds when Core plans raise_exception. */
export const INTERACTION_EXCEPTION_MAPPINGS: readonly InteractionExceptionMapping[] = [
  {
    interactionKind: "scope_request",
    exceptionKind: "scope_change",
    title: "Client scope request",
  },
  {
    interactionKind: "refund_request",
    exceptionKind: "client_request",
    title: "Client refund request",
  },
  {
    interactionKind: "complaint",
    exceptionKind: "client_request",
    title: "Client complaint",
  },
] as const;

export function resolveExceptionKindForEffect(input: {
  exceptionKind?: string;
  interactionKind?: string;
}): CampaignExceptionKind | null {
  if (input.exceptionKind === "revision_exhausted") return "revision_exhausted";
  if (input.exceptionKind && isCampaignExceptionKind(input.exceptionKind)) {
    return input.exceptionKind;
  }
  const mapping = INTERACTION_EXCEPTION_MAPPINGS.find(
    (entry) => entry.interactionKind === input.interactionKind,
  );
  return mapping?.exceptionKind ?? null;
}

function isCampaignExceptionKind(value: string): value is CampaignExceptionKind {
  return [
    "compliance_hold",
    "direction_disagreement",
    "missing_client_fact",
    "scope_change",
    "pricing_exception",
    "deadline_commitment",
    "deadline_risk",
    "revision_exhausted",
    "client_request",
    "routine_internal",
  ].includes(value);
}

export const CONFUSION_INTERACTION_KINDS = new Set<CustomerInteractionKind>([
  "clarification_request",
  "status_inquiry",
  "project_question",
]);

export const ELEVATED_TONE_INTERACTION_KINDS = new Set<CustomerInteractionKind>([
  "complaint",
  "refund_request",
]);

/** Owner outcomes that may produce learning candidates — store only, never auto-apply. */
export const NOTEWORTHY_OWNER_EXCEPTION_KINDS = new Set<CampaignExceptionKind>([
  "scope_change",
  "pricing_exception",
  "client_request",
  "deadline_commitment",
  "deadline_risk",
  "revision_exhausted",
]);
