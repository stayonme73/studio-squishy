import type {
  CampaignExceptionKind,
  CampaignExceptionStatus,
} from "@/lib/campaign-tasks/exceptions-types";

/** Green-and-Lean gate — which exception kinds require Owner resolution or approval. */
export const OWNER_HELD_EXCEPTION_KINDS: readonly CampaignExceptionKind[] = [
  "compliance_hold",
  "direction_disagreement",
  "scope_change",
  "pricing_exception",
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
  sectionLead:
    "Track blockers and escalations that need team attention. Resolving an exception clears workflow blockers only — it does not complete the linked task.",
  raiseLabel: "Raise exception",
  assignLabel: "Assign",
  resolveLabel: "Resolve",
  approveClientRequestLabel: "Approve client request",
  promotionPanelTitle: "Owner client-material review",
  promotionInternalZoneLabel: "Internal context",
  promotionClientZoneLabel: "Client-facing wording",
  promotionDecisionZoneLabel: "Owner decision",
  promotionHoldLabel: "Hold for internal review",
  promotionDeclineLabel: "Decline promotion",
  promotionApproveLabel: "Approve & send to client",
  promotionViewDetailsLabel: "View details",
  promotionHoldInstructionLabel: "Internal instruction",
  promotionHoldInstructionPlaceholder: "What should the internal team verify or resolve?",
  promotionHoldAssignLabel: "Assign to (optional)",
  promotionDeclineReasonLabel: "Internal decline reason",
  promotionDeclineReasonPlaceholder: "Why this should not go to the client",
  promotionClientLabelField: "Client-facing label",
  promotionClientPromptField: "Client-facing prompt",
  promotionWhyNeededField: "Why we need this",
  promotionCategoryField: "Material category",
  promotionSlotPreviewLabel: "Materials slot mapping",
  promotionSlotAttachLabel: "Will attach to existing slots",
  promotionSlotCreateLabel: "Will create ad-hoc slot",
  promotionPromotedSummaryTitle: "Promoted to client materials",
  promotionDeclinedBadge: "Promotion declined — internal only",
  promotionHoldBadge: "On hold — internal review",
  promotionNoInternalContext: "No structured internal context recorded.",
  filterOpenLabel: "Open",
  filterResolvedLabel: "Resolved",
  emptyOpenTitle: "No open exceptions",
  emptyOpenBody: "Raise an exception when work is blocked or needs escalation.",
  emptyResolvedTitle: "No resolved exceptions",
  emptyResolvedBody: "Resolved exceptions appear here for reference.",
  ownerReviewRequiredLabel: "Owner review required",
  sentToClientBadge: "Sent to client",
  promotedWaitingClientStatusLabel: "Waiting for client response",
  autoCreatedFromQaLabel: "Auto-created from QA",
  linkedTaskLabel: "Linked task",
  assigneeLabel: "Assigned to",
  raisedByLabel: "Raised by",
  unassignedLabel: "Unassigned",
  internalNotesLabel: "Internal notes",
  resolveDisclaimer:
    "Resolving clears or updates the workflow blocker on the linked task when applicable. It does not mark the linked task complete.",
  resolveNotesLabel: "Resolution notes",
  resolveNotesPlaceholder: "What changed or how this was handled (optional)",
  assignNotesLabel: "Assignment notes",
  assignNotesPlaceholder: "Context for the assignee (optional)",
  raiseTitleLabel: "Title",
  raiseTitlePlaceholder: "Short summary of the blocker",
  raiseDescriptionLabel: "Description",
  raiseDescriptionPlaceholder: "What happened and what is blocked (optional)",
  raiseKindLabel: "Exception type",
  raiseTaskLabel: "Linked task (optional)",
  raiseTaskNone: "No linked task",
  assignToLabel: "Assign to",
  conflictMessage: "This exception was updated elsewhere. Refresh and try again.",
  updateFailedMessage: "Could not update exception.",
  openExceptionBadge: (count: number) =>
    count === 1 ? "1 Open Exception" : `${count} Open Exceptions`,
  nextActionLabels: {
    ownerReview: "Owner must review and resolve",
    clientResponseNeeded: "Client response needed",
    waitingClient: "Waiting on client input",
    waitingInternal: "Assigned — internal follow-up",
    openUnassigned: "Assign owner or resolve",
    openAssigned: "Assignee to act or resolve",
    resolved: "Resolved — no action required",
    cancelled: "Cancelled",
  },
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
    pricing_exception: "Pricing exception",
    deadline_commitment: "Deadline commitment",
    deadline_risk: "Deadline risk",
    revision_exhausted: "Client boundary review",
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
