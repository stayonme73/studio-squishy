/** File Room — internal read-only campaign workspace (Slice 1b). */

export const fileRoom = {
  pageTitle: "File Room",
  listLead: "Server-backed campaign records for internal review.",
  detailBackLabel: "All campaigns",
  emptyListTitle: "No campaigns yet",
  emptyListBody: "When a client syncs a campaign to the server, it will appear here.",
  notFoundTitle: "Campaign not found",
  notFoundBody: "No server record exists for this campaign ID.",
  partialRecordTitle: "Partial server record",
  partialRecordBody:
    "This campaign file is missing expected milestones. Data shown reflects what has synced so far.",
  syncSourceLabel: "Source",
  syncSourceValue: "data/campaigns/",
  fixtureHiddenNote: "Fixture and test campaigns are hidden from this list.",
  customerRequests: {
    title: "Customer requests",
    loading: "Loading customer requests...",
    empty: "No open customer requests for this campaign.",
    classifyInformationUpdate: "Classify — Information Update",
    classifyProjectChange: "Classify — Project Change",
    applyLabel: "Apply update",
    rejectLabel: "Reject request",
    rejectReasonLabel: "Reason for customer",
  },
} as const;

export const FILE_ROOM_ROUTE = "/file-room";
