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
  pageLead: "Your decision desk — one folder at a time.",
  coordinatorName: "Squishy",
  squishySaysLabel: "Squishy says:",
  todaysDeskLabel: "Today's Desk",
  foldersOnDeskLabel: (count: number) => (count === 1 ? "1 folder" : `${count} folders`),
  todaysDecisionsLabel: "Today's Decisions",
  currentFolderLabel: "Current Folder",
  reviewFolderLabel: "Review Folder",
  closeFolderLabel: "Close Folder",
  fileCabinetLabel: "File cabinet",
  fileCabinetCloseLabel: "Back to desk",
  jumpToFolderLabel: "Review this folder",
  emptyDeskTitle: "Your desk is clear",
  emptyDeskBody:
    "No decisions need you right now. Check the file cabinet for client awareness or recently handled items.",
  deskOnlyActionHint: "Open the linked workspace to complete this gate.",
  openWorkspaceLabel: "Open workspace",
  reviewGate: {
    decisionQuestion: "Is this creative ready for the client to see in Review Room?",
    whatTagiaReviews:
      "Review concepts, prepared deliverables, and internal production notes. The client cannot open Review Room until you approve.",
    confirmApproveForReview:
      "Approve and send this job to the client Review Room? The client will be notified that review is ready.",
    confirmSendBack:
      "Send this work back to production? The client will not see it until you approve again.",
    confirmHold:
      "Hold this review gate for internal clarification? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAskClient:
      "Send this approved client message and pause for client response? The folder will leave your desk.",
    approveForReviewLabel: "Approve for client review",
    sendBackLabel: "Send back to production",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    askClientLabel: "Ask client",
    teamNoteLabel: "Note for production / team",
    teamNotePlaceholder: "What needs to change or be clarified before the client can review?",
    clientMessageLabel: "Approved client-facing message",
    clientMessagePlaceholder: "Write the exact wording the client should see.",
    openProductionWorkspaceLabel: "Open Production Workspace",
    availableActions: [
      {
        id: "approve",
        label: "Approve for client review",
        wired: true,
        whereAfter: "Client Review Room — folder leaves your desk immediately.",
      },
      {
        id: "send_back",
        label: "Send back for revision",
        wired: true,
        whereAfter: "Production rework — client does not see this work; folder may return when production resubmits.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal QA hold; stays off the client path.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to assignee — internal notes attached.",
      },
      {
        id: "ask_client",
        label: "Ask client",
        wired: true,
        whereAfter: "Waiting on Client — client input requested with your approved wording.",
      },
    ],
  },
  releaseGate: {
    decisionQuestion: "Can the client receive this final delivery?",
    whatTagiaReviews:
      "Confirm QA is complete, all deliverables are attached, production is finished, and every client delivery file is client-safe. The client cannot open Final Delivery until you release.",
    confirmRelease:
      "Release this package to the client? The client will be notified that Final Delivery is ready.",
    confirmSendBack:
      "Send this package back to production? The client will not see Final Delivery until you release again.",
    confirmHold:
      "Hold this release for internal clarification? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    releaseLabel: "Release to client",
    sendBackLabel: "Send back to production",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    teamNoteLabel: "Note for production / QA",
    teamNotePlaceholder:
      "What still needs to be fixed or verified before the client can receive this package?",
    openProductionWorkspaceLabel: "Open Production Workspace",
    availableActions: [
      {
        id: "release",
        label: "Release to client",
        wired: true,
        whereAfter: "Final Delivery — folder leaves your desk immediately.",
      },
      {
        id: "send_back",
        label: "Send back for revision",
        wired: true,
        whereAfter:
          "Production rework — client does not see delivery; folder may return when production resubmits.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal final QA hold; stays off the client path.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to assignee — internal notes for final QA.",
      },
    ],
  },
  complianceHold: {
    decisionQuestion: "Is this work cleared to continue, or does it need a different path?",
    whatTagiaReviews:
      "Review the QA compliance flag and notes before you clear the hold or send it back for investigation.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for QA / production",
    teamNotePlaceholder: "What needs to be verified or investigated?",
    assignToLabel: "Assign to",
    confirmClear:
      "Clear this compliance hold and return work to production? Linked QA blockers will clear when applicable.",
    confirmHold:
      "Hold this compliance review for internal follow-up? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAssign:
      "Assign this compliance hold to the selected team member? The folder will leave your desk.",
    clearLabel: "Clear / resolve",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    assignLabel: "Assign",
    openFileRoomLabel: "Open File Room",
    availableActions: [
      {
        id: "clear",
        label: "Clear / resolve",
        wired: true,
        whereAfter: "Production — QA continues; folder leaves your desk immediately.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal QA hold; task stays blocked.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to QA or production — internal investigation.",
      },
      {
        id: "assign",
        label: "Assign",
        wired: true,
        whereAfter: "Back to assignee — folder leaves your desk.",
      },
    ],
  },
  directionDisagreement: {
    decisionQuestion: "Which creative direction stands?",
    whatTagiaReviews:
      "Review strategy and production notes before you confirm which direction stands.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for QA / production",
    teamNotePlaceholder: "What needs to be reconciled or investigated?",
    assignToLabel: "Assign to",
    confirmDirection:
      "Confirm the creative direction and return work to production? Linked QA blockers will clear when applicable.",
    confirmHold:
      "Hold this direction review for internal follow-up? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAssign:
      "Assign this direction disagreement to the selected team member? The folder will leave your desk.",
    confirmDirectionLabel: "Confirm direction",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    assignLabel: "Assign",
    openFileRoomLabel: "Open File Room",
    availableActions: [
      {
        id: "confirm",
        label: "Confirm direction",
        wired: true,
        whereAfter: "Production — work continues; folder leaves your desk immediately.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal review; task stays blocked.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to QA or production — internal investigation.",
      },
      {
        id: "assign",
        label: "Assign",
        wired: true,
        whereAfter: "Back to assignee — folder leaves your desk.",
      },
    ],
  },
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
  reassignContextTitle: "Current assignment",
  reassignTaskIdLabel: "Task ID",
  reassignRequiredRoleLabel: "Required role",
  reassignClaimantLabel: "Current claimant",
  reassignUnclaimedLabel: "Unclaimed",
  reassignWhyLabel: "Why reassign",
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
