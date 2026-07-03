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
  deliverablesTitle: "Required deliverables",
  deliverablesLead: "Mark each deliverable prepared before submitting for Owner approval.",
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
  workingFilesTitle: "Working files",
  workingFilesLead: "Internal links to working files — not client deliverables.",
  workingFilesEmpty: "No working file references yet.",
  notePlaceholder: "Add an internal note…",
  fileLabelPlaceholder: "Label (e.g. Figma board)",
  fileUrlPlaceholder: "https://…",
  addNoteLabel: "Add note",
  addFileRefLabel: "Add reference",
  markPreparedLabel: "Mark prepared",
  startProductionLabel: "Start Building Concepts",
  submitApprovalLabel: "Submit for Owner approval",
  ownerApproveLabel: "Approve for client review",
  gateBlockedTitle: "Action blocked",
  allPreparedLabel: "All deliverables prepared",
  clientNotesTitle: "Client-visible notes",
  clientNotesEmpty: "No client-facing notes on this campaign.",
} as const;
