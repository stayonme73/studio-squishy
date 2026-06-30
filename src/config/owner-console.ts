import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";

/** Studio-wide Owner Console — primary decision desk route. */
export const OWNER_CONSOLE_ROUTE = "/file-room/owner-console";

/** Campaign drill-down (Slice 2 — not built in Slice 1). */
export function ownerConsoleCampaignRoute(campaignId: string): string {
  return `/file-room/${campaignId}/owner-console`;
}

/**
 * Slice 4 (locked before Owner Console V1 complete): task reassign from console
 * using existing `reassign` PATCH + `resolveReassignCandidatesForTask` — not Slice 1.
 */
export const OWNER_CONSOLE_SLICE4_LOCKED = "task-reassign" as const;

export const ownerConsole = {
  pageTitle: "Owner Console",
  pageLead:
    "Decisions waiting on you across active campaigns. Act here so production does not stand still.",
  waitingSectionTitle: "Waiting on you",
  waitingEmptyTitle: "Nothing waiting on you",
  waitingEmptyBody:
    "Open exceptions that need Owner review will appear here across all campaigns.",
  allCampaignsLink: "All campaigns",
  refreshedLabel: "Refreshed",
  campaignLabel: "Campaign",
  ageLabel: "Waiting since",
  selectedCardHint: "Select a decision to review context and act.",
  confirmApprove:
    "Approve and send this client materials request? The client will see the wording you confirmed.",
  confirmDecline:
    "Decline this promotion? The request stays internal — it will not go to the client.",
  confirmResolve:
    "Resolve this exception? Linked workflow blockers will clear when applicable.",
  fieldLabels: {
    whatHappened: "What happened",
    whyOwner: "Why Owner",
    recommendedNextAction: "Recommended next action",
    impactIfNoAction: "Impact if no action",
    availableActions: "Actions",
    whereWorkGoesAfter: "Where work goes after",
  },
  promotableWhyOwner:
    "Client material requires Owner approval before anything is sent to the client.",
  ownerHeldWhySuffix: "Owner review required before work continues.",
  slice4Note:
    "Task reassign from Owner Console is locked for Slice 4 — reuse existing reassign PATCH when built.",
} as const;

/** Presentation-only — does not change exception business rules. */
export const ownerConsoleImpactByKind: Record<CampaignExceptionKind, string> = {
  compliance_hold:
    "Linked task stays blocked; QA cannot pass until the compliance concern is cleared.",
  direction_disagreement:
    "Production stays blocked until direction is confirmed or revised.",
  missing_client_fact:
    "Work on the linked task stays blocked until facts are resolved or promoted to the client.",
  scope_change:
    "Scope cannot change until Owner approves or declines the requested change.",
  deadline_commitment:
    "Deadline commitments cannot proceed without Owner sign-off.",
  deadline_risk:
    "At-risk deadlines need Owner judgment before the team commits further.",
  revision_exhausted:
    "Revision allowance is exhausted — further client rounds need Owner approval.",
  client_request:
    "Client-facing requests cannot go out until Owner approves the promotion wording.",
  routine_internal:
    "Internal blocker stays open until Owner or assignee resolves it.",
};

/** Presentation-only — typical outcome after Owner acts (see exceptions-actions.ts). */
export const ownerConsoleOutcomeByKind: Record<CampaignExceptionKind, string> = {
  compliance_hold: "After resolve → QA reviews the linked task.",
  direction_disagreement: "After resolve → responsible production role continues or QA reviews.",
  missing_client_fact:
    "After approve → client materials queue; after hold/decline → internal team follows up.",
  scope_change: "After resolve → Producer adjusts plan or work resumes within approved scope.",
  deadline_commitment: "After resolve → Producer updates timeline and dispatch.",
  deadline_risk: "After resolve → team adjusts schedule or scope with Owner guidance.",
  revision_exhausted:
    "After resolve → Producer and client-facing roles follow approved revision path.",
  client_request:
    "After approve → client materials queue; after hold → internal assignee verifies.",
  routine_internal: "After resolve or assign → assignee acts in their Team Office.",
};
