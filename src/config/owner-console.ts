import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";

/** Studio-wide Owner Console — primary decision desk route. */
export const OWNER_CONSOLE_ROUTE = "/file-room/owner-console";

/** Campaign drill-down — optional `item` pre-selects an exception. */
export function ownerConsoleCampaignRoute(campaignId: string, itemId?: string): string {
  const base = `/file-room/${campaignId}/owner-console`;
  if (!itemId) return base;
  return `${base}?item=${encodeURIComponent(itemId)}`;
}

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
  campaignDrillDownLead:
    "Full campaign context for the decision you selected. Act here or jump to File Room / Team Office.",
  backToStudioQueue: "Owner Console",
  openCampaignLabel: "Open campaign",
  fullFileRoomLabel: "Full File Room",
  contextSectionTitle: "Linked context",
  linkedTaskTitle: "Linked task",
  linkedServiceTitle: "Service",
  materialsTitle: "Materials (read-only)",
  qaTitle: "QA history",
  productionTitle: "Production (read-only)",
  teamOfficeTitle: "Team Office",
  noLinkedTask: "No task linked to this exception.",
  noMaterials: "No linked materials for this exception.",
  noQaHistory: "No QA records for the linked task.",
  noProduction: "No Kitchen V1 production work saved for this task yet.",
  reassignSectionTitle: "Reassign task",
  reassignLead:
    "Send stuck work to the right AI role without opening multiple offices. Uses existing task reassign.",
  reassignTaskLabel: "Reassign linked task",
  reassignSuccessHint: "Task reassigned — assignee can continue in their Team Office.",
  scanSectionTitle: "Scan",
  scanSectionLead: "Triage only — no duplicate team actions here. Open drill-down or File Room to act.",
  scanBuckets: {
    blocked: {
      title: "Blocked work",
      description: "Tasks blocked without an open Owner decision on the same path.",
    },
    waiting_client: {
      title: "Waiting on client",
      description: "Promoted requests and blocking materials awaiting client response.",
    },
    waiting_internal: {
      title: "Waiting on internal team",
      description: "Exceptions assigned to staff or held for internal review.",
    },
    ready_to_move: {
      title: "Ready to move",
      description: "Tasks unblocked and ready for claim, production, or QA.",
    },
    recently_resolved: {
      title: "Recently resolved",
      description: "Exceptions resolved in the last 14 days.",
    },
  },
  scanEmptyBucket: "Nothing in this bucket.",
} as const;

export const OWNER_CONSOLE_RECENTLY_RESOLVED_DAYS = 14;
export const OWNER_CONSOLE_RECENTLY_RESOLVED_MAX = 20;

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
