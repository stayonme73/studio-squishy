/**
 * Room 4C — Multi-Service Client Gauntlet.
 * OPEN at baseCommit 8c919e0. Room 4B remains CLOSED. Room 5 NOT STARTED.
 * Do not merge. Do not expand Launch Now menu. Scenario 1 executed; owner decision pending.
 */

export const studioRoom4cMultiServiceClientGauntletV1 = {
  packageId:
    "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  sectionId: "4c-multi-service-client-gauntlet" as const,
  title: "Multi-Service Client Gauntlet" as const,
  status: "OPEN" as const,
  sectionClosed: false as const,
  baseCommit: "8c919e0d8af0c6f996c4a53792b74aef7b69c279" as const,
  openedAt: "2026-08-20" as const,
  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotExpandLaunchMenu: true as const,
  doNotExecuteScenario1InOpeningPackage: true as const,
  priorSection: "4b-launch-toolbox-certification" as const,
  priorSectionClosed: true as const,
  room4bRemainsClosed: true as const,
  room4bCloseoutDoc:
    "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-CLOSEOUT.md" as const,
  purpose:
    "Prove The Studio can truthfully accept and fulfill realistic multi-service Launch Now requests without contradicting the brief, losing continuity, promising unsupported work, or depending on owner production labor." as const,

  frozenLaunchNowServices: {
    shortFormVideo: "READY WITH EXPLICIT LIMITS" as const,
    socialGraphics: "READY WITH EXPLICIT LIMITS" as const,
    printCollateral: "READY WITH EXPLICIT LIMITS" as const,
    marketingCopyEmail: "READY WITH EXPLICIT LIMITS" as const,
    campaignCreative: "READY WITH EXPLICIT LIMITS" as const,
    carousel: "NOT ON LAUNCH MENU" as const,
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
      status: "EXECUTED_OWNER_DECISION_PENDING" as const,
    },
    {
      id: "scenario-2-product-or-offer-launch" as const,
      customer: "Harbor Roast Coffee Co." as const,
      status: "NOT_STARTED" as const,
    },
    {
      id: "scenario-3-photo-led-campaign" as const,
      customer: "Moss & Thread Studio" as const,
      status: "NOT_STARTED" as const,
    },
  ],

  evidenceRoot:
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1" as const,
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

  finalReviewAuthority: "Tagia" as const,
} as const;

export type StudioRoom4cScenarioClassification =
  (typeof studioRoom4cMultiServiceClientGauntletV1.scenarioClassificationLabels)[number];

export type StudioRoom4cPackageRecommendation =
  (typeof studioRoom4cMultiServiceClientGauntletV1.packageRecommendationLabels)[number];
