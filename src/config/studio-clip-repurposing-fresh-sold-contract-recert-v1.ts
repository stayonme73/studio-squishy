/**
 * STUDIO-CLIP-REPURPOSING-FRESH-SOLD-CONTRACT-RECERT-1
 * Fresh signed-in $549 Clip walk on the eligible 15–60 source.
 * Does not publish. Does not change the menu or price.
 */

export const STUDIO_CLIP_REPURPOSING_FRESH_SOLD_CONTRACT_RECERT_PACKAGE_ID =
  "STUDIO-CLIP-REPURPOSING-FRESH-SOLD-CONTRACT-RECERT-1" as const;

export const CLIP_SOLD_RECERT_CAMPAIGN_ID =
  "camp-clip-sold-recert-20261003" as const;

export const CLIP_SOLD_RECERT_USER_ID = "local-clip-sold-recert" as const;

export const CLIP_SOLD_RECERT_EMAIL = "clip-sold-recert@local.dev" as const;

export const CLIP_SOLD_RECERT_REVISED_CTA =
  "Book Cole & Kindred this week" as const;

export const studioClipRepurposingFreshSoldContractRecertV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_FRESH_SOLD_CONTRACT_RECERT_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  started: true as const,
  skuId: "v2-rtu-clip-repurposing" as const,
  campaignId: CLIP_SOLD_RECERT_CAMPAIGN_ID,
  customerDisplayName: "Avery Cole" as const,
  customerBusinessName: "Cole & Kindred" as const,
  customerEmail: CLIP_SOLD_RECERT_EMAIL,
  ctaText: "Book a Cole & Kindred consult" as const,
  revisedCtaText: CLIP_SOLD_RECERT_REVISED_CTA,
  videoPurpose:
    "Help clients hear distinct ideas from one long talking-head recording." as const,
  doNotPublish: true as const,
  doNotChangeMenu: true as const,
  doNotChangePrice: true as const,
  doNotChangeStripe: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  designatedSourceRelativePath:
    "docs/launch/studio-clip-source-ingest-1/The Studio Long Video.mp4" as const,
  designatedSourceBelowSoldFloor: false as const,
  soldMinimumSeconds: 900 as const,
  soldMaximumSeconds: 3600 as const,
  verifiedDurationSeconds: 1403.455396 as const,
  stampDir:
    "docs/launch/studio-clip-repurposing-fresh-sold-contract-recert-1" as const,
} as const;
