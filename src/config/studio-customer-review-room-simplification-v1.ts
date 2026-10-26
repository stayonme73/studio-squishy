/**
 * STUDIO-OPERATING-CUSTOMER-REVIEW-ROOM-SIMPLIFICATION-1
 *
 * Phone Review Room is overbuilt. The customer needs to look at work,
 * approve or request a change, and ask The Studio. Studio machinery stays
 * in the system and behind compact details — not in the primary journey.
 */

export const studioCustomerReviewRoomSimplificationV1 = {
  packageId: "STUDIO-OPERATING-CUSTOMER-REVIEW-ROOM-SIMPLIFICATION-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  phoneOnly: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRemintMaya: true as const,
  doNotConsumeMayaRevision: true as const,
  doNotStartFinalApproval: true as const,
  doNotStartFinalDelivery: true as const,
  doNotModifyRevisionEntitlement: true as const,
  doNotModifyProductionLogic: true as const,
  primaryActions: ["Approve", "Request a Change", "Ask The Studio"] as const,
  changeTools: ["Draw on proof", "Voice feedback"] as const,
  eraseAppearsAfterDrawing: true as const,
  hideFromCustomerTools: [
    "Sticky Note",
    "Highlight",
    "Text Comment",
    "Question",
    "Idea",
    "Revision Request",
    "Mark section for changes",
    "Place note",
  ] as const,
} as const;
