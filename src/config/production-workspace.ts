/** Production Workspace — internal job-level working view (File Room). */

export const PRODUCTION_WORKSPACE_ROUTE = "/file-room";

export function productionWorkspaceRoute(campaignId: string, jobId: string): string {
  return `${PRODUCTION_WORKSPACE_ROUTE}/${campaignId}/production/${encodeURIComponent(jobId)}`;
}

export const productionWorkspace = {
  pageTitle: "Production Workspace",
  pageLead: "Internal working view for one purchased job — brief, materials, deliverables, and handoff gates.",
  backToOwnerConsole: "Owner Console",
  backToControlRoom: "Control Room",
  briefTitle: "Production brief",
  briefEmpty: "No Route Map production brief for this job — scope comes from the approved plan line item.",
  scopeTitle: "Scope",
  acceptanceReviewTitle: "Acceptance Review",
  acceptanceReviewLead:
    "Before production begins, document mutual understanding of service, scope, timeline, responsibilities, risks, and required materials.",
  acceptanceReviewAcceptedLabel: "Accepted. This project may enter production.",
  acceptanceReviewBlockedLabel:
    "Blocked. Squishy and Decision Core must route the unresolved issue before production starts.",
  acceptanceReviewPendingLabel: "Pending. Production cannot start until this review is recorded.",
  recordAcceptanceReviewLabel: "Record Acceptance Review",
  deliverablesTitle: "Required deliverables",
  deliverablesLead: "Mark each deliverable prepared before submitting to client Review Room.",
  materialsTitle: "Materials received",
  materialsEmpty: "No materials linked to this job.",
  deadlineTitle: "Client deadline",
  deadlineEmpty: "No deadline set.",
  laneTitle: "Production lane",
  statusTitle: "Current status",
  activityTitle: "Activity timeline",
  activityEmpty: "No activity recorded for this job yet.",
  internalNotesTitle: "Internal notes",
  internalNotesLead: "Staff-only — never visible to the client.",
  internalNotesEmpty: "No internal notes yet.",
  workingFilesTitle: "File registry",
  workingFilesLead:
    "Reference-only Shared Drive file records for this job. No Google API connection is active in V1.",
  workingFilesEmpty: "No file registry references yet.",
  notePlaceholder: "Add an internal note…",
  fileLabelPlaceholder: "Label (e.g. Figma board)",
  fileUrlPlaceholder: "https://…",
  addNoteLabel: "Add note",
  addFileRefLabel: "Add reference",
  markPreparedLabel: "Mark prepared",
  startProductionLabel: "Start Building Concepts",
  submitApprovalLabel: "Submit to Review Room",
  ownerApproveLabel: "Send to Review Room",
  ownerFinalReleaseLabel: "Approve final release",
  markDeliveredLabel: "Mark delivered to client",
  clientDeliveryFilesTitle: "Client delivery files",
  clientDeliveryFilesLead: "Final files the client will download — not internal working refs.",
  clientDeliveryFilesEmpty: "No client delivery files yet.",
  clientFileNamePlaceholder: "File name (e.g. social-posts.zip)",
  clientFileTypePlaceholder: "Type (e.g. ZIP, PDF)",
  clientFileUrlPlaceholder: "Download URL",
  clientFileInstructionsPlaceholder: "Short client-safe use instructions (optional)",
  addClientFileLabel: "Add client file",
  finalReleasePendingLabel: "Final Release Needed — Owner approval before client sees Final Delivery.",
  gateBlockedTitle: "Action blocked",
  allPreparedLabel: "All deliverables prepared",
  clientNotesTitle: "Client-visible notes",
  clientNotesEmpty: "No client-facing notes on this campaign.",
  clientRevisionFeedbackTitle: "Client revision feedback",
  clientRevisionFeedbackLead:
    "Feedback submitted from Review Room — sticky notes, section decisions, and annotations.",
  clientRevisionFeedbackEmpty: "No client revision feedback on this job.",
} as const;
