/**
 * Live factory wire + one unpublished $549 Clip Repurposing job.
 * Does not publish. Does not reopen factory internals.
 */

export const STUDIO_CLIP_REPURPOSING_LIVE_UNPUBLISHED_JOB_PACKAGE_ID =
  "STUDIO-OPERATING-CLIP-REPURPOSING-LIVE-UNPUBLISHED-JOB-1" as const;

export const CLIP_REPURPOSING_LIVE_UNPUBLISHED_CAMPAIGN_ID =
  "camp-clip-live-unpublished-20260925" as const;

export const studioClipRepurposingLiveUnpublishedJobV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_LIVE_UNPUBLISHED_JOB_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-25" as const,
  skuId: "v2-rtu-clip-repurposing",
  priceCents: 54900,
  publicMenuPublished: false as const,
  doNotPublish: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotReopenCertifiedFactory: true as const,
  designatedSourceRelativePath:
    "docs/launch/studio-operating-clip-repurposing-build-1/live-sources/positive-live-source.mp4.mp4",
  designatedSourceSeconds: 815.4007,
  designatedSourceBelowSoldFloor: true as const,
  soldMinimumSeconds: 900,
  designatedSourceNote:
    "Owner-designated certification source is 13:35. Sold customer floor stays 15 minutes. This dress rehearsal may use the designated file only.",
} as const;
