/**
 * Clip Repurposing price correction only.
 * Does not change scope, quality, ranking, set selection, or publication.
 *
 * HISTORICAL — SUPERSEDED FOR LAUNCH (owner ruling 2026-10-10). Launch price is $399.
 * Launch truth: `studio-canonical-launch-truth-v1.ts`.
 */

export const STUDIO_CLIP_REPURPOSING_PRICE_CORRECTION_PACKAGE_ID =
  "STUDIO-OPERATING-CLIP-REPURPOSING-PRICE-CORRECTION-1" as const;

export const studioClipRepurposingPriceCorrectionV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_PRICE_CORRECTION_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-25" as const,
  skuId: "v2-rtu-clip-repurposing",
  priorFullPackageCents: 59900,
  priorTwoClipCents: 49900,
  oneClipConvertsToShortFormVideoEditingCents: 34900,
  twoClipOutcomeCents: 44900,
  fullPackageCents: 54900,
  doNotIncreaseClipCount: true as const,
  doNotReduceQuality: true as const,
  doNotTouchRankingOrSetSelection: true as const,
  doNotChangeUnderThreeStructure: true as const,
  doNotPublish: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  publicLaunchNowPublishedCount: 10 as const,
  internalSellNowCount: 11 as const,
} as const;
