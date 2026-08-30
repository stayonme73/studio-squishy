/**
 * Mobile Customer Journey Certification.
 * Unparked 2026-08-25 for a live Samsung run. OPEN / IN PROGRESS.
 * Not closed. Real-phone certification not stamped.
 * Stopping point: 2026-08-25-STOPPING-POINT-CHECKPOINT.md.
 * Readiness tip b35c8aa2. Room 4 only. Do not assign Room 4D / 4E.
 * Do not merge. Do not start Room 5.
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
  parkClassification:
    "BLOCKED BY MISSING INDEPENDENT SUPERVISION AND INCIDENT ESCALATION" as const,
  sectionClosed: false as const,
  parkedAt: "2026-08-23" as const,
  unparkedAt: "2026-08-25" as const,
  livePhoneCertification: "IN_PROGRESS_NOT_CERTIFIED" as const,
  readinessTip: "b35c8aa2c2fdc7b1f1f5161d38479fdded0e5361" as const,
  resumeAfterPackageId:
    "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
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
  doNotExecuteLivePhoneJourneyUntilOwnerAuthorization: true as const,
  doNotStampCertificationResult: true as const,
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

  openingArtifactsOnly: false as const,
  readinessPassComplete: true as const,
  readinessStatus: "LIVE_PHONE_RUN_STOPPED_AT_CHECKPOINT" as const,
  stoppingPointCheckpointDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/2026-08-25-STOPPING-POINT-CHECKPOINT.md" as const,
  nextPhoneAction:
    "Close and reopen Choose your services → scroll → Add to Project on Make My Social Media Posts" as const,
  parkAndResumeDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/PARK-AND-RESUME.md" as const,
  supervisionDependencyAuditDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/SUPERVISION-DEPENDENCY-AUDIT.md" as const,
  ownerPhoneRunGuideDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/OWNER-PHONE-RUN-GUIDE.md" as const,
  phoneAccessMethod: "local_https_lan" as const,
  phoneAccessDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/PHONE-ACCESS-METHOD.md" as const,
  journeyRouteMapDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/JOURNEY-ROUTE-AND-CONTROL-MAP.md" as const,
  recommendedFirstExecutionStep:
    "Close and reopen Choose your services → scroll → Add to Project on Make My Social Media Posts. Do not restart the hire. Package is not closed." as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  voiceChoiceStatus: "OWNER_ACCEPTED" as const,
  voiceChoiceAcceptedAt: "2026-08-29" as const,
  voiceChoiceLockDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/VOICE-CHOICE-OWNER-ACCEPTED-LOCK.md" as const,
  nameQuestionStatus: "OWNER_ACCEPTED" as const,
  nameQuestionAcceptedAt: "2026-08-29" as const,
  nameQuestionLockDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/NAME-QUESTION-OWNER-ACCEPTED-LOCK.md" as const,
  projectNeedStatus: "OWNER_ACCEPTED" as const,
  projectNeedAcceptedAt: "2026-08-29" as const,
  businessNameStatus: "OWNER_ACCEPTED" as const,
  businessNameAcceptedAt: "2026-08-29" as const,
  visualSystemCheckpointDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/MOBILE-VISUAL-SYSTEM-CHECKPOINT.md" as const,
  nextMobileScreen: "services" as const,
  reuseLockedMobileVisualSystem: true as const,
  tonightMobileVisualCheckpointDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/2026-08-29-TONIGHT-MOBILE-VISUAL-CHECKPOINT.md" as const,
  tonightMobileVisualCheckpointAt: "2026-08-29" as const,
  materialsConfirmationCheckpointDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/2026-08-30-MATERIALS-CONFIRMATION-CHECKPOINT.md" as const,
  materialsConfirmationCheckpointAt: "2026-08-30" as const,
  chooseYourRouteStatus: "OWNER_ACCEPTED" as const,
  chooseYourRouteAcceptedAt: "2026-08-30" as const,
  chooseYourRouteCheckpointDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/2026-08-30-CHOOSE-YOUR-ROUTE-CHECKPOINT.md" as const,
} as const;
