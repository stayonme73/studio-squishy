/**
 * STUDIO-CLIP-REPURPOSING-LIVE-DELIVERY-WIRING-1
 * Connect the approved Final Delivery Room to $549 Clip Repurposing only.
 * Does not replace live delivery globally. Does not publish Clip.
 */

export const STUDIO_CLIP_REPURPOSING_LIVE_DELIVERY_WIRING_PACKAGE_ID =
  "STUDIO-CLIP-REPURPOSING-LIVE-DELIVERY-WIRING-1" as const;

export const studioClipRepurposingLiveDeliveryWiringV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_LIVE_DELIVERY_WIRING_PACKAGE_ID,
  authorizedAt: "2026-10-02" as const,
  started: true as const,
  authorizedToStart: true as const,
  skuId: "v2-rtu-clip-repurposing" as const,
  customerFacingName: "Clip Repurposing" as const,
  closedRoomPackage: "STUDIO-FINAL-DELIVERY-ROOM-1" as const,
  proofRouteRemainsUnpublished: true as const,
  proofRoute: "/final-delivery-room" as const,
  doNotReplaceLiveDeliverablesGlobally: true as const,
  doNotReopenVisualPolishUnlessRegression: true as const,
  doNotPublishClip: true as const,
  clipRemainsUnpublishedUntilFullCustomerCertification: true as const,
  loungeFrozen: true as const,
  ownerConsoleParked: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  ownerAcceptedAt: "2026-10-02" as const,
  classification: "B_READY_WITH_EXPLICIT_LIMITS" as const,
  sectionClosed: true as const,
  doNotReopenUnlessCertificationDefect: true as const,
  nextPackage: "STUDIO-CLIP-REPURPOSING-FULL-CUSTOMER-CERTIFICATION-1" as const,
  stampDir: "docs/launch/studio-clip-repurposing-live-delivery-wiring-1" as const,
} as const;
