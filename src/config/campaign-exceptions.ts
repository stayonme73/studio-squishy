import type {
  CampaignExceptionKind,
  CampaignExceptionStatus,
} from "@/lib/campaign-tasks/exceptions-types";

/** Green-and-Lean gate — which exception kinds require Owner resolution or approval. */
export const OWNER_HELD_EXCEPTION_KINDS: readonly CampaignExceptionKind[] = [
  "compliance_hold",
  "direction_disagreement",
  "scope_change",
  "deadline_commitment",
  "deadline_risk",
  "revision_exhausted",
  "client_request",
] as const;

/** Producer may resolve only routine internal exceptions with no owner-held dimensions. */
export const PRODUCER_RESOLVABLE_KINDS: readonly CampaignExceptionKind[] = [
  "routine_internal",
] as const;

export const campaignExceptionsConfig = {
  sectionTitle: "Exceptions",
  raiseLabel: "Raise exception",
  assignLabel: "Assign",
  resolveLabel: "Resolve",
  approveClientRequestLabel: "Approve client request",
  deferredClientPromotionMessage:
    "Client materials promotion is deferred to slice 3d-c.",
  statusLabels: {
    open: "Open",
    waiting_internal: "Waiting — internal",
    waiting_owner: "Waiting — Owner",
    waiting_client: "Waiting — client",
    resolved: "Resolved",
    cancelled: "Cancelled",
  } satisfies Record<CampaignExceptionStatus, string>,
  kindLabels: {
    compliance_hold: "Compliance hold",
    direction_disagreement: "Direction disagreement",
    missing_client_fact: "Missing client fact",
    scope_change: "Scope change",
    deadline_commitment: "Deadline commitment",
    deadline_risk: "Deadline risk",
    revision_exhausted: "Revision allowance exhausted",
    client_request: "Client request",
    routine_internal: "Routine internal",
  } satisfies Record<CampaignExceptionKind, string>,
} as const;

export function exceptionKindRequiresOwner(kind: CampaignExceptionKind): boolean {
  return OWNER_HELD_EXCEPTION_KINDS.includes(kind);
}

export function exceptionKindProducerResolvable(kind: CampaignExceptionKind): boolean {
  return PRODUCER_RESOLVABLE_KINDS.includes(kind);
}
