/**
 * Mobile Customer Journey Certification.
 * OPEN 2026-08-22. Base 15ee699c (Gate X close). Register area 2 execution package.
 * Room 4 only. Do not assign Room 4D / 4E. Do not merge. Do not start Room 5.
 */

export const studioMobileCustomerJourneyCertificationV1 = {
  packageId:
    "STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  sectionId: "mobile-customer-journey-certification" as const,
  title: "Mobile Customer Journey Certification" as const,
  status: "OPEN" as const,
  sectionClosed: false as const,
  baseCommit: "15ee699c7d16331b3f410871f02555841fddd4d6" as const,
  baseBranch:
    "operating/external-customer-content-intake-and-rights-certification-1" as const,
  openedAt: "2026-08-22" as const,
  registerRequirement: "FULL_MOBILE_CUSTOMER_JOURNEY_CERTIFICATION" as const,
  registerPackageId: "STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1" as const,
  registerAreaId: 2 as const,
  registerTip: "5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88" as const,
  gateXCloseTip: "15ee699c7d16331b3f410871f02555841fddd4d6" as const,
  branch: "operating/mobile-customer-journey-certification-1" as const,
  avoidRoom4dLabel: true as const,
  avoidRoom4eLabel: true as const,
  packageContractDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-PACKAGE-CONTRACT.md" as const,
  coverageMapDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/EXISTING-MOBILE-COVERAGE-MAP.md" as const,
  certificationMatrixDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/ACCEPTANCE-AND-CERTIFICATION-MATRIX.md" as const,
  controlledTestPlanDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/CONTROLLED-CUSTOMER-ONE-TEST-PLAN.md" as const,

  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotAssignRoom4dOr4eLabel: true as const,
  doNotChangeLaunchNowMenu: true as const,
  doNotReopenRoom4bWithoutDefect: true as const,
  doNotReopenRoom4cWithoutDefect: true as const,
  doNotReopenGateXWithoutDefect: true as const,
  doNotExecuteLivePhoneJourneyInOpening: true as const,
  doNotStampCertificationResultInOpening: true as const,
  responsiveCoverageDoesNotProvePath: true as const,
  room4RemainsOpen: true as const,
  room4cRemainsClosed: true as const,
  room4cCloseTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
  gateXRemainsClosed: true as const,
  gateXStatus: "CLOSED WITH EXPLICIT LIMITS" as const,

  requiredBeforeRoom4Close: true as const,
  dependsOnGateX: true as const,
  gateXPackageId:
    "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1" as const,

  frozenLaunchNowServices: {
    shortFormVideo: "READY WITH EXPLICIT LIMITS" as const,
    socialGraphics: "READY WITH EXPLICIT LIMITS" as const,
    printCollateral: "READY WITH EXPLICIT LIMITS" as const,
    marketingCopyEmail: "READY WITH EXPLICIT LIMITS" as const,
    campaignCreative: "READY WITH EXPLICIT LIMITS" as const,
    carousel: "NOT ON LAUNCH MENU" as const,
  },

  proofMustInclude: [
    "hire_and_sandbox_payment",
    "intake_and_file_upload",
    "rights_certification",
    "communicate_and_track_status",
    "review_and_usable_feedback",
    "approve_final_work",
    "receive_and_download_delivery",
    "recover_from_errors_or_blocked_actions",
  ] as const,

  deviceBar: [
    "real_phone",
    "touch_controls",
    "readable_text",
    "usable_forms",
    "clear_status_messages",
    "no_desktop_only_dependency",
    "no_required_browser_zoom",
  ] as const,

  notThisPackage: [
    "viewport_shrink_only",
    "room_4c_responsive_observations",
    "desktop_emulation_as_sole_proof",
    "room_5_soft_opening",
  ] as const,

  customerSpine: [
    "studio-lobby",
    "studio-conversation-room",
    "checkout",
    "intake",
    "studio-board",
    "review-room",
    "final-delivery",
  ] as const,

  evidenceDirs: {
    packageRoot:
      "docs/launch/studio-operating-mobile-customer-journey-certification-1" as const,
    certificationRuns:
      "docs/launch/studio-operating-mobile-customer-journey-certification-1/certification-runs" as const,
  },

  openingArtifactsOnly: true as const,
  recommendedFirstExecutionStep:
    "After opening, design the live real-phone Customer-One journey against the eight required proofs; do not stamp certification from Room 4C responsive notes or desktop-only runs." as const,
} as const;
