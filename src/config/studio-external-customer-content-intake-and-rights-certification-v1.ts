/**
 * External Customer Content Intake and Rights Certification.
 * OPEN 2026-08-22. Base 5c22de9. Register Gate X execution package.
 * Closes Room 4C Scenario 3 limitation: studio fixtures did not prove the real customer route.
 * Do not merge. Do not start Room 5. Do not start mobile certification in opening.
 */

export const studioExternalCustomerContentIntakeAndRightsCertificationV1 = {
  packageId:
    "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  sectionId: "external-customer-content-intake-and-rights-certification" as const,
  title: "External Customer Content Intake and Rights Certification" as const,
  status: "OPEN" as const,
  sectionClosed: false as const,
  baseCommit: "5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88" as const,
  baseBranch: "operating/pre-launch-master-closeout-register-1" as const,
  openedAt: "2026-08-22" as const,
  registerRequirement: "EXTERNAL_CUSTOMER_CONTENT_INTAKE_AND_RIGHTS" as const,
  registerPackageId: "STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1" as const,
  registerTip: "5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88" as const,
  branch:
    "operating/external-customer-content-intake-and-rights-certification-1" as const,
  packageContractDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-PACKAGE-CONTRACT.md" as const,
  routeMapDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/EXISTING-CUSTOMER-UPLOAD-AND-ROUTING-MAP.md" as const,
  certificationMatrixDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/ACCEPTANCE-AND-CERTIFICATION-MATRIX.md" as const,
  controlledTestPlanDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/CONTROLLED-CUSTOMER-ONE-TEST-PLAN.md" as const,

  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotStartMobileCertification: true as const,
  doNotChangeLaunchNowMenu: true as const,
  doNotReopenRoom4cWithoutDefect: true as const,
  doNotUploadControlledTestFilesInOpening: true as const,
  doNotUseRealCustomerFilesInOpening: true as const,
  doNotStampCertificationResultInOpening: true as const,
  studioFixturesDoNotProvePath: true as const,
  room4RemainsOpen: true as const,
  room4cRemainsClosed: true as const,
  room4cCloseTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,

  closesLimitationFrom: {
    packageId: "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1" as const,
    scenario: "scenario-3-moss-and-thread" as const,
    limitation:
      "Studio-generated certification fixtures; externalCustomerPhotoPathProven false" as const,
  },

  requiredBeforeRoom4CloseIfPhotoLedAccepted: true as const,
  requiredBeforeMobileUploadCertification: true as const,

  routingStates: [
    "RECEIVED",
    "RIGHTS_INFORMATION_REQUIRED",
    "TECHNICAL_REVIEW_REQUIRED",
    "CLEARED_FOR_PRODUCTION",
    "CLEARED_WITH_LIMITS",
    "QUARANTINED",
    "REJECTED",
    "SUPERSEDED",
    "WITHDRAWN_BY_CUSTOMER",
  ] as const,

  productionGateRule:
    "Production must be impossible unless file is CLEARED_FOR_PRODUCTION or CLEARED_WITH_LIMITS and limits permit requested use." as const,

  frozenLaunchNowServices: {
    shortFormVideo: "READY WITH EXPLICIT LIMITS" as const,
    socialGraphics: "READY WITH EXPLICIT LIMITS" as const,
    printCollateral: "READY WITH EXPLICIT LIMITS" as const,
    marketingCopyEmail: "READY WITH EXPLICIT LIMITS" as const,
    campaignCreative: "READY WITH EXPLICIT LIMITS" as const,
    carousel: "NOT ON LAUNCH MENU" as const,
  },

  liveCustomerUploadEntry: {
    ui: "src/components/materials/MaterialsIntakePanel.tsx" as const,
    api: "PATCH /api/campaigns/{campaignId}/materials (multipart)" as const,
    customerSurfaces: ["/studio-board", "/campaign-details"] as const,
  },

  notLiveCustomerUploadPaths: [
    "src/lib/project-details-upload.ts",
    "src/lib/studio-room-4c-scenario-3/photo-pack-ingest.ts",
    "src/lib/file-storage/mock.ts",
    "JSON filename-only PATCH on file-metadata slots",
    "route-map intake text-only materials fields",
  ] as const,

  evidenceDirs: {
    packageRoot:
      "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1" as const,
    controlledTestPack:
      "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/controlled-test-pack" as const,
    certificationRuns:
      "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/certification-runs" as const,
  },

  openingArtifactsOnly: true as const,
  recommendedFirstExecutionStep:
    "Implement per-file routing states and durable rights records on the live MaterialsIntakePanel → /api/campaigns/{id}/materials path; then run the controlled Customer-One test pack." as const,
} as const;
