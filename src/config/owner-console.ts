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
  deadlineDecision: {
    decisionQuestion: "What date or path should the team and client rely on?",
    whatTagiaReviews:
      "Review lane capacity and job state before you commit a client-facing date. Internal-only updates do not need client notification.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for Producer / scheduling",
    teamNotePlaceholder: "What options or constraints should the team consider?",
    clientMessageLabel: "Approved client-facing message",
    clientMessagePlaceholder: "Write the exact wording for date or priority confirmation.",
    assignToLabel: "Assign to",
    confirmCommit:
      "Commit this timeline and return work to production? Dispatch will update accordingly.",
    confirmHold:
      "Hold this deadline review for internal follow-up? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAskClient:
      "Send this approved client message and pause for client confirmation? The folder will leave your desk.",
    confirmAssign:
      "Assign this deadline decision to the selected team member? The folder will leave your desk.",
    commitLabel: "Commit timeline",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    askClientLabel: "Ask client — need approval",
    assignLabel: "Assign",
    openFileRoomLabel: "Open File Room",
    availableActions: [
      {
        id: "commit",
        label: "Commit timeline",
        wired: true,
        whereAfter: "Production — dispatch updated; folder leaves your desk immediately.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal scheduling review.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to Producer — schedule options gathering.",
      },
      {
        id: "ask_client",
        label: "Ask client — need approval",
        wired: true,
        whereAfter: "Waiting on Client — paused pending client confirm.",
      },
      {
        id: "assign",
        label: "Assign",
        wired: true,
        whereAfter: "Back to assignee — folder leaves your desk.",
      },
    ],
  },
  revisionDecision: {
    decisionQuestion: "Should this job receive another revision round, and on what terms?",
    whatTagiaReviews:
      "Included revision rounds are exhausted. Review the client request and production notes before you allow another round or hold firm.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for production / QA",
    teamNotePlaceholder: "What effort or scope context should production assess?",
    clientMessageLabel: "Approved client-facing message",
    clientMessagePlaceholder: "Write the exact wording for term confirmation.",
    assignToLabel: "Assign to",
    confirmAllow:
      "Allow an extra revision round and return work to production? The client will be notified.",
    confirmHoldFirm:
      "Hold the revision limit firm and send the policy-bound message to the client?",
    confirmHold:
      "Hold this revision review for internal follow-up? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAskClient:
      "Send this approved client message and pause for term confirmation? The folder will leave your desk.",
    confirmAssign:
      "Assign this revision decision to the selected team member? The folder will leave your desk.",
    allowLabel: "Allow extra round",
    holdFirmLabel: "Hold firm",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    askClientLabel: "Ask client — need approval",
    assignLabel: "Assign",
    openFileRoomLabel: "Open File Room",
    availableActions: [
      {
        id: "allow",
        label: "Allow extra round",
        wired: true,
        whereAfter: "Production — revision round opens; folder leaves your desk immediately.",
      },
      {
        id: "hold_firm",
        label: "Hold firm",
        wired: true,
        whereAfter: "Waiting on Client or Recently Handled — client informed per policy.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal revision review.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to production — revision assessment.",
      },
      {
        id: "ask_client",
        label: "Ask client — need approval",
        wired: true,
        whereAfter: "Waiting on Client — pending client accept or decline of terms.",
      },
      {
        id: "assign",
        label: "Assign",
        wired: true,
        whereAfter: "Back to assignee — folder leaves your desk.",
      },
    ],
  },
  scopeDecision: {
    decisionQuestion: "Should this work proceed outside the approved plan?",
    whatTagiaReviews:
      "The team cannot expand scope without your approval. Review what was purchased and what is being requested now.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for Producer / planning",
    teamNotePlaceholder: "What scope analysis or facts are needed?",
    clientMessageLabel: "Approved client-facing message",
    clientMessagePlaceholder: "Write the exact wording the client should see.",
    assignToLabel: "Assign to",
    confirmApprove:
      "Approve this scope change? Production will replan and continue.",
    confirmDecline:
      "Decline this scope change? Work stays within the approved plan.",
    confirmHold:
      "Hold this scope review for internal follow-up? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAskClientInfo:
      "Send this approved client message and pause for missing information? The folder will leave your desk.",
    confirmAskClientApproval:
      "Send this approved client message and pause for scope confirmation? The folder will leave your desk.",
    confirmAssign:
      "Assign this scope decision to the selected team member? The folder will leave your desk.",
    approveLabel: "Approve scope change",
    declineLabel: "Decline",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    askClientInfoLabel: "Ask client — need information",
    askClientApprovalLabel: "Ask client — need approval",
    assignLabel: "Assign",
    openFileRoomLabel: "Open File Room",
    availableActions: [
      {
        id: "approve",
        label: "Approve scope change",
        wired: true,
        whereAfter: "Production — replan logged; folder leaves your desk immediately.",
      },
      {
        id: "decline",
        label: "Decline",
        wired: true,
        whereAfter: "Recently Handled — work stays within approved plan.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal scope review.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to team — scope analysis.",
      },
      {
        id: "ask_client_info",
        label: "Ask client — need information",
        wired: true,
        whereAfter: "Waiting on Client — awaiting fact or file.",
      },
      {
        id: "ask_client_approval",
        label: "Ask client — need approval",
        wired: true,
        whereAfter: "Waiting on Client — awaiting scope confirmation.",
      },
      {
        id: "assign",
        label: "Assign",
        wired: true,
        whereAfter: "Back to assignee — folder leaves your desk.",
      },
    ],
  },
  refundDecision: {
    decisionQuestion: "Should this job receive a refund, continue, or need more internal review?",
    whatTagiaReviews:
      "Review production status and waiting-on-client history before you approve or deny. Production-started jobs cannot be refunded through this desk.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for Producer / finance",
    teamNotePlaceholder: "What payment or materials evidence is needed?",
    clientMessageLabel: "Approved client-facing message",
    clientMessagePlaceholder: "Write the exact wording for documentation request.",
    refundReasonLabel: "Refund reason",
    refundReasonPlaceholder: "Why you approved this refund — required for approve.",
    confirmApprove:
      "Approve this refund and close the job? The client will receive the approved template.",
    confirmDeny:
      "Deny this refund? The job continues under policy and the client will be notified.",
    confirmHold:
      "Hold this refund for internal review? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAskClient:
      "Send this approved client message and pause for documentation? The folder will leave your desk.",
    approveLabel: "Approve refund",
    denyLabel: "Deny refund",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    askClientLabel: "Ask client — need information",
    openProductionWorkspaceLabel: "Open Production Workspace",
    availableActions: [
      {
        id: "approve",
        label: "Approve refund",
        wired: true,
        whereAfter: "Job closed — refunded; folder leaves your desk immediately.",
      },
      {
        id: "deny",
        label: "Deny refund",
        wired: true,
        whereAfter: "Production or Waiting on Client — job continues under policy.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal refund review.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to team — payment and materials review.",
      },
      {
        id: "ask_client",
        label: "Ask client — need information",
        wired: true,
        whereAfter: "Waiting on Client — awaiting documentation.",
      },
    ],
  },
  complaintDecision: {
    decisionQuestion:
      "What is the Studio response to this complaint — and does it require a separate refund, scope, or revision folder?",
    whatTagiaReviews:
      "This is a complaint folder — not a refund folder. If the real issue is refund, scope, or revisions, escalate to a new folder.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for Producer / QA",
    teamNotePlaceholder: "What context is needed for an accurate reply?",
    clientMessageLabel: "Approved client reply",
    clientMessagePlaceholder: "Write the exact reply or policy-bound response the client should see.",
    assignToLabel: "Assign to",
    confirmResolve:
      "Send this approved reply to the client? This complaint folder will leave your desk.",
    confirmEscalate:
      "Hand off to a new decision folder? This complaint folder will close with handoff recorded.",
    confirmDecline:
      "Send this policy-bound response? This complaint folder will leave your desk.",
    confirmHold:
      "Hold this complaint for internal review? The folder will leave your desk.",
    confirmAskTeam:
      "Send this back to the team with your note? The folder will leave your desk.",
    confirmAskClient:
      "Send this approved client message and pause for more information? The folder will leave your desk.",
    confirmAssign:
      "Assign this complaint to the selected team member? The folder will leave your desk.",
    resolveLabel: "Resolve with reply",
    escalateRefundLabel: "Escalate to refund folder",
    escalateScopeLabel: "Escalate to scope folder",
    escalateRevisionLabel: "Escalate to revision folder",
    declineLabel: "Decline escalation",
    holdLabel: "Hold",
    askTeamLabel: "Ask team",
    askClientLabel: "Ask client — need information",
    assignLabel: "Assign",
    openFileRoomLabel: "Open File Room",
    availableActions: [
      {
        id: "resolve",
        label: "Resolve with reply",
        wired: true,
        whereAfter: "Recently Handled — client reply queued from approved text.",
      },
      {
        id: "escalate_refund",
        label: "Escalate to refund folder",
        wired: true,
        whereAfter: "Recently Handled — new refund folder appears on desk.",
      },
      {
        id: "escalate_scope",
        label: "Escalate to scope folder",
        wired: true,
        whereAfter: "Recently Handled — new scope folder appears on desk.",
      },
      {
        id: "escalate_revision",
        label: "Escalate to revision folder",
        wired: true,
        whereAfter: "Recently Handled — new revision folder appears on desk.",
      },
      {
        id: "decline",
        label: "Decline escalation",
        wired: true,
        whereAfter: "Recently Handled — policy-bound reply recorded.",
      },
      {
        id: "hold",
        label: "Hold",
        wired: true,
        whereAfter: "Needs Clarification — internal investigation.",
      },
      {
        id: "ask_team",
        label: "Ask team",
        wired: true,
        whereAfter: "Back to team — internal draft.",
      },
      {
        id: "ask_client",
        label: "Ask client — need information",
        wired: true,
        whereAfter: "Waiting on Client — awaiting client reply.",
      },
      {
        id: "assign",
        label: "Assign",
        wired: true,
        whereAfter: "Back to assignee — folder leaves your desk.",
      },
    ],
  },
  heavyLaneDecision: {
    decisionQuestion: "Which job should run next in the heavy lane?",
    whatTagiaReviews:
      "Heavy lane is at capacity. Review queued job versus active job and client deadlines before you decide bump or wait.",
    ownerNotesLabel: "Owner Notes",
    ownerNotesPlaceholder:
      "Your reasoning for this decision — saved to the historical record.",
    teamNoteLabel: "Note for Producer",
    teamNotePlaceholder: "Queue reorder instructions for Producer.",
    confirmResolveWait: "Wait — keep current active job in the heavy lane?",
    confirmResolveBump: "Bump — prioritize the queued job in the heavy lane?",
    confirmAssign:
      "Route queue reorder to Producer? The folder will leave your desk.",
    waitLabel: "Wait",
    bumpLabel: "Bump queued job",
    assignLabel: "Assign to Producer",
    openFileRoomLabel: "Open File Room",
    availableActions: [
      {
        id: "wait",
        label: "Wait",
        wired: true,
        whereAfter: "Production — lane order updated; folder leaves your desk.",
      },
      {
        id: "bump",
        label: "Bump queued job",
        wired: true,
        whereAfter: "Production — lane assignment updated; folder leaves your desk.",
      },
      {
        id: "assign",
        label: "Assign to Producer",
        wired: true,
        whereAfter: "Back to Producer — they will reorder the queue.",
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
