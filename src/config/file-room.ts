/** File Room — internal read-only campaign workspace (Slice 1b). */

export const fileRoom = {
  pageTitle: "File Room",
  listLead: "Server-backed campaign records for internal review.",
  detailBackLabel: "All campaigns",
  emptyListTitle: "No campaigns yet",
  emptyListBody: "When a client syncs a campaign to the server, it will appear here.",
  notFoundTitle: "Campaign not found",
  notFoundBody: "No server record exists for this campaign ID.",
  forbiddenTitle: "Access restricted",
  forbiddenBody: "You do not have permission to view this campaign.",
  partialRecordTitle: "Partial server record",
  partialRecordBody:
    "This campaign file is missing expected milestones. Data shown reflects what has synced so far.",
  syncSourceLabel: "Source",
  syncSourceValue: "data/campaigns/",
  fixtureHiddenNote: "Fixture and test campaigns are hidden from this list.",
} as const;

export const FILE_ROOM_ROUTE = "/file-room";
