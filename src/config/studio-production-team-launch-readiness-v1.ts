/**
 * STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1
 *
 * Package G: coordination fire drill for certified launch lanes.
 * Not a new producer. Do not expand the launch menu. Do not start Voice.
 * Do not touch Maya. Review proof is not Final Delivery.
 */

export const studioProductionTeamLaunchReadinessV1 = {
  packageId: "STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotTouchMaya: true as const,
  doNotStartVoice: true as const,
  doNotExpandLaunchMenu: true as const,
  doNotRedesignBoard: true as const,
  doNotRedesignReviewRoom: true as const,
  doNotModifyRefundPolicy: true as const,
  doNotModifyCustomerRevisionPolicy: true as const,
  scoutIsNotProjectManager: true as const,
  ownerRoutineCoordination: "NONE" as const,
  designSku: "v2-rtu-menu" as const,
  copySku: "v2-rtu-email-kit" as const,
  videoSku: "v2-rtu-short-video" as const,
} as const;

export const PRODUCTION_TEAM_CERT_SKUS = [
  studioProductionTeamLaunchReadinessV1.designSku,
  studioProductionTeamLaunchReadinessV1.copySku,
  studioProductionTeamLaunchReadinessV1.videoSku,
] as const;

/** Customer-facing campaign aggregation. Complete sentences. Not engineering jargon. */
export const productionTeamCustomerCopy = {
  producingLabel: "The Studio is working",
  producingLead:
    "The Studio is working on your project. Review will open for each item when it is ready.",
  partialReviewReadyLabel: "Some work is ready",
  partialReviewReadyLead:
    "Some of your work is ready to review. Other items are still being prepared, or still need something from you.",
  blockedOnServiceLabel: "Some work is ready",
  blockedOnServiceLead:
    "Some of your work is ready to review. The Studio still needs something from you on another service before that item can continue.",
  allReviewReadyLabel: "Ready for Review",
  allReviewReadyLead:
    "Your project is ready to review. Open the Review Room when you have a moment.",
  escalationLabel: "The Studio is checking something",
  escalationLead:
    "The Studio is still working on part of your project. Work that is already ready is available in the Review Room.",
} as const;
