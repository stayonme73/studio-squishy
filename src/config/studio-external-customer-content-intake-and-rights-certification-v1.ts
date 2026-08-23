/**
 * External Customer Content Intake and Rights Certification.
 * CLOSED WITH EXPLICIT LIMITS 2026-08-22. Owner decision ACCEPTED.
 * Base 5c22de9 remains an untouched ancestor. Register Gate X execution package.
 * Do not merge. Do not start Room 5. Do not start mobile certification. Do not open the next package.
 */

export const studioExternalCustomerContentIntakeAndRightsCertificationV1 = {
  packageId:
    "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  sectionId: "external-customer-content-intake-and-rights-certification" as const,
  title: "External Customer Content Intake and Rights Certification" as const,
  status: "CLOSED WITH EXPLICIT LIMITS" as const,
  sectionClosed: true as const,
  ownerDecision: "ACCEPTED" as const,
  packageRecommendation: "CLOSE WITH EXPLICIT LIMITS" as const,
  baseCommit: "5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88" as const,
  baseBranch: "operating/pre-launch-master-closeout-register-1" as const,
  openedAt: "2026-08-22" as const,
  closedAt: "2026-08-22" as const,
  registerRequirement: "EXTERNAL_CUSTOMER_CONTENT_INTAKE_AND_RIGHTS" as const,
  registerPackageId: "STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1" as const,
  registerTip: "5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88" as const,
  branch:
    "operating/external-customer-content-intake-and-rights-certification-1" as const,
  packageContractDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-PACKAGE-CONTRACT.md" as const,
  closeoutDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CLOSEOUT.md" as const,
  routeMapDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/EXISTING-CUSTOMER-UPLOAD-AND-ROUTING-MAP.md" as const,
  certificationMatrixDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/ACCEPTANCE-AND-CERTIFICATION-MATRIX.md" as const,
  controlledTestPlanDoc:
    "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/CONTROLLED-CUSTOMER-ONE-TEST-PLAN.md" as const,

  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotStartMobileCertification: true as const,
  doNotOpenNextPackage: true as const,
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

  sealedEvidenceRuns: [
    {
      id: "gate-x-run-2026-08-22T230059190Z" as const,
      role: "original" as const,
      manifestSha256:
        "04c34166c92efe0b6f241033bff7f391e5ee98e2b12782d812def7b61412a14c" as const,
    },
    {
      id: "gate-x-run-2026-08-22T232853529Z" as const,
      role: "cases-2-and-4-supplemental" as const,
      manifestSha256:
        "77f1dbf62b634bc5d695476f855d2dccf8e4bcd273260078bcf39b4f4d1073ab" as const,
    },
    {
      id: "gate-x-run-2026-08-22T235349346Z" as const,
      role: "case-3-likeness-supplemental" as const,
      manifestSha256:
        "ebd769003e7527fd906b627390f6804d71fe6b50fef68ae36bbdbc2be433f1d2" as const,
    },
  ] as const,

  defectDisposition: {
    "GX-D2": "CORRECTED_AND_CERTIFIED" as const,
    "GX-D4": "CORRECTED_AND_CERTIFIED" as const,
    originalFailuresPreserved: true as const,
  },

  explicitLimits: [
    "Likeness and third-party detection uses customer declarations and filename hints; it does not perform image-content recognition.",
    "Rights certification records customer representations and Studio controls; it is not an independent legal ownership determination.",
    "Malware scanning is not included or claimed.",
    "A superseded prior file is preserved internally but is not displayed to the customer with a separate “Superseded” banner.",
    "The customer sees outstanding-material status rather than the internal `materials_incomplete` production-gate code.",
  ] as const,

  /** Canonical owner raw-file staging. Covered by existing `tmp/` gitignore. Never commit contents. */
  ownerRawFileStagingDir: "tmp/gate-x-controlled-test-owner-staging" as const,

  /** Launch Now capability / Room 4C routing id — not a catalog checkout ServiceId. */
  launchNowCampaignCreativeSku: "campaign-creative" as const,
  /** Live Route Map V2 shelf SKU for campaign graphics hire/pay. Case 9 job.skuId. */
  customerFacingCampaignGraphicsShelfSku: "v2-rtu-promotion-graphics" as const,

  openingArtifactsOnly: false as const,
  recommendedFirstExecutionStep:
    "Package closed. Do not open the next package from this closeout." as const,
} as const;
