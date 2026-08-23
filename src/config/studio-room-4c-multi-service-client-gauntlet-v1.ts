/**
 * Room 4C — Multi-Service Client Gauntlet.
 * CLOSED WITH EXPLICIT LIMITS 2026-08-21. Room 4B remains CLOSED. Room 5 NOT STARTED.
 * Room 4 (full business rehearsal) remains open for later packages. Do not merge.
 * Do not expand Launch Now menu. Scenarios 1–3 PASS WITH EXPLICIT LIMITS.
 */

export type FrozenLaunchNowClassification =
  | "READY WITH EXPLICIT LIMITS"
  | "NOT ON LAUNCH MENU";

export const studioRoom4cMultiServiceClientGauntletV1 = {
  packageId:
    "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  sectionId: "4c-multi-service-client-gauntlet" as const,
  title: "Multi-Service Client Gauntlet" as const,
  status: "CLOSED WITH EXPLICIT LIMITS" as const,
  sectionClosed: true as const,
  packageRecommendation: "CLOSE WITH EXPLICIT LIMITS" as const,
  baseCommit: "8c919e0d8af0c6f996c4a53792b74aef7b69c279" as const,
  openedAt: "2026-08-20" as const,
  closedAt: "2026-08-21" as const,
  closeoutDoc:
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/STUDIO-OPERATING-ROOM-4C-CLOSEOUT.md" as const,
  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotExpandLaunchMenu: true as const,
  doNotExecuteScenario1InOpeningPackage: true as const,
  room4RemainsOpen: true as const,
  priorSection: "4b-launch-toolbox-certification" as const,
  priorSectionClosed: true as const,
  room4bRemainsClosed: true as const,
  room4bCloseoutDoc:
    "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-CLOSEOUT.md" as const,
  purpose:
    "Prove The Studio can truthfully accept and fulfill realistic multi-service Launch Now requests without contradicting the brief, losing continuity, promising unsupported work, or depending on owner production labor." as const,

  frozenLaunchNowServices: {
    shortFormVideo: "READY WITH EXPLICIT LIMITS" as FrozenLaunchNowClassification,
    socialGraphics: "READY WITH EXPLICIT LIMITS" as FrozenLaunchNowClassification,
    printCollateral: "READY WITH EXPLICIT LIMITS" as FrozenLaunchNowClassification,
    marketingCopyEmail: "READY WITH EXPLICIT LIMITS" as FrozenLaunchNowClassification,
    campaignCreative: "READY WITH EXPLICIT LIMITS" as FrozenLaunchNowClassification,
    carousel: "NOT ON LAUNCH MENU" as FrozenLaunchNowClassification,
  },

  excluded: [
    "carousel",
    "ad_account_management",
    "targeting_budgets_bidding_analytics_optimization",
    "platform_appeals",
    "ongoing_campaign_operations",
    "silent_canva_adobe_placid_dependency",
    "outside_human_production",
    "owner_production_labor_disguised_as_approval",
  ] as const,

  scenarios: [
    {
      id: "scenario-1-local-business-promotion" as const,
      customer: "Cedar Lane Home Organizing" as const,
      status: "PASS WITH EXPLICIT LIMITS" as const,
      classification: "PASS WITH EXPLICIT LIMITS" as const,
      contactFactApprovalStatus: "OWNER_APPROVED_FOR_CERTIFICATION" as const,
      explicitLimits: [
        "Studio-generated photography rather than customer-supplied photography.",
        "Social graphic relies on its accompanying caption for phone and booking URL.",
        "Short video is polished template-led production using one primary photograph, not cinematic production.",
        "Mobile findings are responsive coverage only, not final Room 4 mobile certification.",
        "Frozen Launch Now service classifications remain READY WITH EXPLICIT LIMITS.",
      ] as const,
    },
    {
      id: "scenario-2-product-or-offer-launch" as const,
      customer: "Harbor Roast Coffee Co." as const,
      status: "PASS WITH EXPLICIT LIMITS" as const,
      classification: "PASS WITH EXPLICIT LIMITS" as const,
      factApprovalStatus: "OWNER_APPROVED_FOR_CERTIFICATION" as const,
      ownerApprovedForDelivery: true as const,
      explicitLimits: [
        "Studio-generated fictional product photography.",
        "Generic fictional bag packaging; campaign text carries much of the product identity.",
        "Template-led short-form video rather than cinematic production.",
        "Independent AI voice-naturalness judgment is not yet certified.",
        "Customer listening approval remains required.",
        "Mobile observations are responsive coverage, not final Room 4 mobile certification.",
        "Frozen Launch Now services remain READY WITH EXPLICIT LIMITS.",
      ] as const,
    },
    {
      id: "scenario-3-photo-led-campaign" as const,
      customer: "Moss & Thread Studio" as const,
      status: "PASS WITH EXPLICIT LIMITS" as const,
      classification: "PASS WITH EXPLICIT LIMITS" as const,
      factApprovalStatus: "OWNER_APPROVED_FOR_CERTIFICATION" as const,
      productionHold: "PRODUCTION_COMPLETE" as const,
      productionBlockedUntilPhotoRightsClear: false as const,
      ownerVerificationPending: false as const,
      ownerApprovedForDelivery: true as const,
      productionAuthorizedAt: "2026-08-21" as const,
      ownerDeliveryApprovedAt: "2026-08-21" as const,
      approvedVideoSha256:
        "638c00f4103d49c5cbcb4516cb0e4a91a79bb78742a3134099e0abbb3f99e376" as const,
      explicitLimits: [
        "Scenario 3 uses Studio-generated certification-fixture photographs, not a real external customer photo pack.",
        "The external customer-photo submission and rights-verification path remains NOT PROVEN.",
        "Eleven Music Starter is Individual Use Only under the owner-confirmed account.",
        "Music may be delivered only embedded in the finished promotional MP4.",
        "No standalone music redistribution or streaming.",
        "No music-library or reseller use.",
        "No film, television, radio, or Studio Games use.",
        "Mobile findings remain responsive coverage, not final Room 4 mobile certification.",
      ] as const,
    },
  ],

  evidenceRoot:
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1" as const,
  mediaNaturalnessCarryForward:
    "ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA" as const,
  mediaNaturalnessCarryForwardStatus: "REQUIRED_NOT_CERTIFIED" as const,
  packageContractDoc:
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/STUDIO-OPERATING-ROOM-4C-PACKAGE-CONTRACT.md" as const,
  scenarioBriefsDoc:
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/STUDIO-OPERATING-ROOM-4C-SCENARIO-BRIEFS.md" as const,
  acceptanceMatrixDoc:
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/STUDIO-OPERATING-ROOM-4C-ACCEPTANCE-AND-EXPECTED-OUTPUT-MATRIX.md" as const,

  scenarioClassificationLabels: [
    "PASS",
    "PASS WITH EXPLICIT LIMITS",
    "FAIL",
  ] as const,

  packageRecommendationLabels: [
    "CLOSE",
    "CLOSE WITH EXPLICIT LIMITS",
    "KEEP OPEN",
  ] as const,

  openGate:
    "Room 4C is open only for the approved multi-service client gauntlet." as const,

  closeGate: [
    "all_three_scenarios_executed",
    "evidence_preserved",
    "defects_and_limits_disclosed",
    "owner_production_labor_recorded_honestly",
    "mobile_observations_recorded",
    "final_classifications_supported",
    "tagia_reviews_close_recommendation",
  ] as const,

  closeGateSatisfied: true as const,
  finalReviewAuthority: "Tagia" as const,
} as const;

export type StudioRoom4cScenarioClassification =
  (typeof studioRoom4cMultiServiceClientGauntletV1.scenarioClassificationLabels)[number];

export type StudioRoom4cPackageRecommendation =
  (typeof studioRoom4cMultiServiceClientGauntletV1.packageRecommendationLabels)[number];
