/**
 * STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1
 * ACTIVE_REGISTER · NOT_AN_EXECUTION_PACKAGE
 * Base tip: 92f47e200ab59979a2c8b16e813abfef9e067765
 * Does not authorize execution of future packages.
 */

export const studioPreLaunchMasterCloseoutRegisterV1 = {
  packageId: "STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1" as const,
  schemaVersion: 1 as const,
  status: "ACTIVE_REGISTER" as const,
  notAnExecutionPackage: true as const,
  baseTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
  branch: "operating/pre-launch-master-closeout-register-1" as const,
  registerDoc:
    "docs/launch/studio-pre-launch-master-closeout-register-1/STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1.md" as const,
  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotExecuteRoadmapFromRegister: true as const,
  doNotReopenRoom4bOrRoom4cWithoutDefect: true as const,
  doNotExpandLaunchMenu: true as const,
  carousel: "NOT ON LAUNCH MENU" as const,

  protectedControlPoint: {
    room4b: "CLOSED" as const,
    room4c: "CLOSED WITH EXPLICIT LIMITS" as const,
    room4cTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
    room4: "OPEN" as const,
    room5: "NOT_STARTED" as const,
    scenario1: "PASS WITH EXPLICIT LIMITS" as const,
    scenario2: "PASS WITH EXPLICIT LIMITS" as const,
    scenario3: "PASS WITH EXPLICIT LIMITS" as const,
  },

  classificationLabels: [
    "COMPLETE_AND_FROZEN",
    "COMPLETE_WITH_EXPLICIT_LIMITS",
    "PARTIALLY_PROVEN",
    "REQUIRED_NOT_STARTED",
    "PARKED_BY_SEQUENCE",
    "BLOCKED_OWNER_DECISION",
    "BLOCKED_EXTERNAL_DEPENDENCY",
    "NOT_REQUIRED_FOR_LAUNCH",
  ] as const,

  /** Cross-cutting gate — required before Room 4 closes if customer-photo-led remains on Launch Now. */
  externalCustomerContentIntakeAndRights: {
    id: "external-customer-content-intake-and-rights" as const,
    title: "External Customer Content Intake and Rights Certification" as const,
    classification: "COMPLETE_WITH_EXPLICIT_LIMITS" as const,
    ownerDecision: "ACCEPTED" as const,
    closedAt: "2026-08-22" as const,
    doNotStartWithoutOwnerAuthorization: true as const,
    requiredBeforeRoom4CloseIfPhotoLedAccepted: true as const,
    requiredBeforeMobileUploadCertification: true as const,
    studioFixturesDoNotProvePath: true as const,
    proposedPackageId:
      "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1" as const,
    closeoutDoc:
      "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CLOSEOUT.md" as const,
  },

  areas: {
    room4cMultiServiceClientGauntlet: {
      id: 1 as const,
      classification: "COMPLETE_WITH_EXPLICIT_LIMITS" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      doNotReopenCasually: true as const,
    },
    fullMobileCustomerJourneyCertification: {
      id: 2 as const,
      classification: "PARKED_BY_SEQUENCE" as const,
      executionPackageStatus: "PARKED" as const,
      parkedAt: "2026-08-23" as const,
      parkedBecause:
        "BLOCKED BY MISSING INDEPENDENT SUPERVISION AND INCIDENT ESCALATION" as const,
      resumeAfterPackageId:
        "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
      openedAt: "2026-08-22" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      dependsOnExternalContentRights: true as const,
      requiredBeforeRoom4Close: true as const,
      proposedPackageId:
        "STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1" as const,
      avoidAutoRoom4d4eLabel: true as const,
    },
    studioNameAndCoreIdentity: {
      id: "3a" as const,
      classification: "BLOCKED_OWNER_DECISION" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOwnerAsCustomerCampaign: true as const,
      requiredBeforePublicPromotion: true as const,
      requiredBeforePublicWebsite: true as const,
      requiredBeforeBrandedEmailActivation: true as const,
    },
    domainBrandedEmailSenderVerification: {
      id: "3b" as const,
      classification: "BLOCKED_EXTERNAL_DEPENDENCY" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      parkedPackageId:
        "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1" as const,
      requiredBeforeControlledSoftOpening: true as const,
    },
    customerFacingPublicWebsiteTransition: {
      id: 4 as const,
      classification: "PARKED_BY_SEQUENCE" as const,
      parkedAs: "ROOM_5" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeControlledSoftOpening: true as const,
      notPostLaunchMaturity: true as const,
      room5RemainsNotStarted: true as const,
    },
    paymentPricingRefundsProfitability: {
      id: 5 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOutsideCustomerTrial: true as const,
    },
    studioVoiceCustomerServiceCertification: {
      id: 6 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOwnerAsCustomerCampaign: true as const,
    },
    machineFullFunctionWithinLaunchNowLimits: {
      id: 7 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOwnerAsCustomerCampaign: true as const,
    },
    voiceMachineTeamStressTesting: {
      id: 8 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOwnerAsCustomerCampaign: true as const,
    },
    aiTeamRosterAndRoleBoundaries: {
      id: 9 as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOwnerAsCustomerCampaign: true as const,
    },
    teamOrientationBeforeLiveCustomers: {
      id: 10 as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOwnerAsCustomerCampaign: true as const,
    },
    failureRecoveryEscalationTesting: {
      id: 11 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOutsideCustomerTrial: true as const,
    },
    securityDataBackupRecovery: {
      id: 12 as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      launchMinimumBeforeOwnerAsCustomer: true as const,
      requiredBeforeOutsideCustomerTrial: true as const,
      broaderMaturityIsPostLaunch: true as const,
    },
    termsPrivacyIpOperationalPolicies: {
      id: 13 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOutsideCustomerTrial: true as const,
    },
    standardizedFinalFileDeliveryAndCustomerRecords: {
      id: 14 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      contractBeforeOwnerAsCustomer: true as const,
      requiredBeforeOutsideCustomerTrial: true as const,
    },
    capacityQueueDeadlineOverloadRules: {
      id: 15 as const,
      classification: "PARTIALLY_PROVEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeOutsideCustomerTrial: true as const,
    },
    /** Frozen journey baseline — do not reopen or relabel incomplete. */
    customerOneE2e: {
      id: "16a" as const,
      title: "Customer-One E2E" as const,
      classification: "COMPLETE_AND_FROZEN" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      doNotReopen: true as const,
      doNotRelabelIncomplete: true as const,
      notOwnerAsCustomerRealCampaign: true as const,
      evidenceDoc: "docs/launch/CUSTOMER-ONE-E2E-CERT-1.md" as const,
    },
    /** Tagia hiring the Studio for the genuine pre-launch campaign. */
    ownerAsCustomerRealStudioCampaign: {
      id: "16b" as const,
      title: "Owner-as-Customer Real Studio Campaign" as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      notAReplacementForCustomerOneE2e: true as const,
      proposedPackageId:
        "STUDIO-OPERATING-OWNER-AS-CUSTOMER-REAL-STUDIO-CAMPAIGN-1" as const,
      requiredBeforeOutsideCustomerTrial: true as const,
    },
    controlledOutsideCustomerTrial: {
      id: 17 as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeControlledSoftOpening: true as const,
    },
    preLaunchPromotion: {
      id: 18 as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      planningMayRunInParallelAfterRegister: true as const,
      mustNotClaimStudioOpen: true as const,
      mustNotUseUnsettledName: true as const,
      creativeViaOwnerAsCustomerCampaign: true as const,
    },
    finalEndToEndLaunchRehearsal: {
      id: 19 as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeControlledSoftOpening: true as const,
    },
    evidenceBasedLaunchNoLaunchDecision: {
      id: 20 as const,
      classification: "REQUIRED_NOT_STARTED" as const,
      doNotStartWithoutOwnerAuthorization: true as const,
      requiredBeforeControlledSoftOpening: true as const,
    },
  },

  recommendedNextSinglePackage: {
    packageId:
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
    status: "OPEN" as const,
    openingArtifactsOnly: true as const,
    doNotStartInThisPackage: false as const,
    doNotOpenNextPackage: true as const,
    reason:
      "Owner authorized parking mobile certification and opening one Room 4 supervision package. Opening artifacts only. Do not implement in this pass. Do not assign Room 4D/4E. Do not start Room 5. Mobile resumes after this package closes." as const,
  },

  sequenceGates: {
    beforeRoom4Close: [
      "external-customer-content-intake-and-rights",
      "full-mobile-customer-journey-certification",
    ] as const,
    beforeOwnerAsCustomerRealCampaign: [
      "studio-name-and-core-identity",
      "ai-team-roster-and-role-boundaries",
      "team-orientation",
      "studio-voice-customer-service-readiness",
      "machine-readiness-within-launch-now-limits",
      "voice-machine-team-stress",
      "external-content-intake-rights",
      "full-mobile-journey-certification",
      "minimum-security-data-backup",
      "standard-final-file-customer-record-contract",
    ] as const,
    beforeControlledOutsideCustomerTrial: [
      "owner-as-customer-real-studio-campaign",
      "payment-pricing-truth",
      "refund-cancellation-handling",
      "profitability-cost-floor",
      "minimum-terms-privacy-ip-customer-content-policies",
      "failure-recovery-escalation",
      "capacity-queue-deadline-overload",
      "standardized-delivery-and-customer-records",
      "security-backup-minimum",
      "studio-voice-machine-team-readiness",
      "no-unresolved-critical-customer-one-e2e-defect",
    ] as const,
    beforeControlledSoftOpening: [
      "controlled-outside-customer-trial",
      "room-5-customer-facing-public-website-transition",
      "branded-domain-email-launch-requirements",
      "final-end-to-end-launch-rehearsal",
      "evidence-based-launch-no-launch-decision",
    ] as const,
    postLaunchMaturityOnly: [
      "broader-security-beyond-launch-minimum",
      "optional-brand-refinements",
      "higher-capacity-automation",
      "advanced-media-naturalness-if-listening-limits-remain-truthful",
      "non-launch-now-services",
    ] as const,
  },
} as const;

export type StudioPreLaunchMasterCloseoutRegisterV1 =
  typeof studioPreLaunchMasterCloseoutRegisterV1;
