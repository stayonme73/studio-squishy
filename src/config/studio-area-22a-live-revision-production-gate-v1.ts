/**
 * Area 22A — live flyer revision production gate.
 * Owner authorized implementation 2026-09-21.
 *
 * Proves the live Stage 0 / 3A flyer path can take a supported customer
 * revision through production → QA → Review without Owner rescue.
 * Maya stays frozen. Do not remint her. Do not repair the legacy composer.
 */

export const studioArea22aLiveRevisionProductionGateV1 = {
  packageId: "STUDIO-OPERATING-AREA-22A-LIVE-REVISION-PRODUCTION-GATE-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  areaId: "22A" as const,
  status: "PASS WITH EXPLICIT LIMITS" as const,
  authorizedAt: "2026-09-21" as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotReopenMobile: true as const,
  doNotReopenArea22b: true as const,
  doNotRemintMaya: true as const,
  doNotRewriteMayaVersion16: true as const,
  doNotFabricateReviewStateForTheater: true as const,
  doNotRepairLegacyComposer: true as const,
  doNotTouchOtherFiveStaticSkus: true as const,
  mayaCampaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959" as const,
  customerOneFlyerCampaignId: "849c793b-88c1-48cd-9194-5ed95554635a" as const,

  /**
   * Register close condition (2026-09-15) named Maya herself.
   * Owner 2026-09-21 supersedes that: prove the live path on a fresh
   * controlled customer. Do not change Maya to satisfy the old sentence.
   */
  priorCloseConditionNamedMaya: true as const,
  ownerSupersede:
    "Prove the live Stage 0 revision path on a fresh controlled supported-customer job. Maya stays frozen." as const,

  proofCustomer: {
    campaignName: "Northshore Portrait Studio",
    businessName: "Northshore Portrait Studio",
    headline: "Spring Open House",
    offerName: "Portrait session",
    priceDisplay: "$99",
    cta: "Book Your Session",
    phone: "(804) 555-0144",
    webDisplay: "northshore.example/open-house",
    revisionInstruction:
      "Please make Book Your Session more prominent as the headline.",
  } as const,

  maxSeriousAttempts: 3 as const,
  ownerRescueIsNotSuccess: true as const,

  closeoutDoc:
    "docs/launch/studio-operating-area-22a-live-revision-production-gate-1/STUDIO-OPERATING-AREA-22A-LIVE-REVISION-PRODUCTION-GATE-EVIDENCE.md" as const,
  verdict: "PASS WITH EXPLICIT LIMITS" as const,
  closedAt: "2026-09-21" as const,
  proofAttempts: 1 as const,
  proofSpendUsd: 0 as const,
  ownerRescueUsed: false as const,
  mayaReminted: false as const,
} as const;

export type StudioArea22aLiveRevisionProductionGateV1 =
  typeof studioArea22aLiveRevisionProductionGateV1;
