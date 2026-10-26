/**
 * REVIEW ROOM NAVIGATION SIMPLIFICATION
 *
 * One customer-facing Review Room. Do not keep a Review gateway that then
 * asks the customer to Open Review. Multi-service selection stays inside
 * this same room. Authorization, QA, File Room, job-spine, and
 * partial-readiness logic stay in place.
 */

export const studioReviewRoomNavigationSimplificationV1 = {
  packageId: "STUDIO-OPERATING-REVIEW-ROOM-NAVIGATION-SIMPLIFICATION-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRemintMaya: true as const,
  doNotConsumeMayaRevision: true as const,
  doNotStartFinalApproval: true as const,
  doNotStartFinalDelivery: true as const,
  oneReviewRoom: true as const,
  singleReadyDeliverableOpensProof: true as const,
  multiServiceSelectionStaysInRoom: true as const,
  copy: {
    readyHeading: "Ready for your review",
    stillWorkingHeading: "Still being worked on",
  },
} as const;
