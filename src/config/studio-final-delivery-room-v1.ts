/**
 * STUDIO-FINAL-DELIVERY-ROOM-1
 * Presentation replacement for Clip value delivery. Owner accepted the mobile visual review.
 * Does not replace live /deliverables globally. Visual polish is closed.
 */

export const STUDIO_FINAL_DELIVERY_ROOM_PACKAGE_ID =
  "STUDIO-FINAL-DELIVERY-ROOM-1" as const;

export const studioFinalDeliveryRoomV1 = {
  packageId: STUDIO_FINAL_DELIVERY_ROOM_PACKAGE_ID,
  authorizedAt: "2026-09-30" as const,
  started: true as const,
  authorizedToStart: true as const,
  ownerAcceptedMobileVisual: true as const,
  ownerAcceptedAt: "2026-10-02" as const,
  visualPolishClosed: true as const,
  doNotReopenVisualPolishUnlessRegression: true as const,
  proofSource: "STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1" as const,
  clipContentAccepted: true as const,
  tanPageRejected: true as const,
  doNotPolishTanPage: true as const,
  doNotRebuildAcceptedContent: true as const,
  roomPlateRelativePath:
    "/final-delivery-room/studio-final-delivery-room-plate-holo.jpg" as const,
  doNotRedrawPlate: true as const,
  doNotReplaceLiveDeliverables: true as const,
  liveDeliverablesUntouched: true as const,
  proofRoute: "/final-delivery-room" as const,
  unpublishedProofRoute: true as const,
  refreshReturnsClosedConveyor: true as const,
  loungeFrozen: true as const,
  ownerConsoleParked: true as const,
  doNotPublishClip: true as const,
  doNotStartMenuCleanup: true as const,
  doNotStartAdCreative: true as const,
  doNotStartAiLocalVisibility: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "B_READY_WITH_EXPLICIT_LIMITS" as const,
  sectionClosed: true as const,
  nextPackage: "STUDIO-CLIP-REPURPOSING-LIVE-DELIVERY-WIRING-1" as const,
  stampDir: "docs/launch/studio-final-delivery-room-1" as const,
} as const;
