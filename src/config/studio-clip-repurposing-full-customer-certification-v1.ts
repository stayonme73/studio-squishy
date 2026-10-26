/**
 * STUDIO-CLIP-REPURPOSING-FULL-CUSTOMER-CERTIFICATION-1
 * One signed-in $549 Clip customer walk on the wired Final Delivery Room.
 * Does not publish. Does not change the menu.
 */

export const STUDIO_CLIP_REPURPOSING_FULL_CUSTOMER_CERTIFICATION_PACKAGE_ID =
  "STUDIO-CLIP-REPURPOSING-FULL-CUSTOMER-CERTIFICATION-1" as const;

export const CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID =
  "camp-clip-full-cust-cert-20261002" as const;

export const CLIP_FULL_CUSTOMER_CERT_USER_ID =
  "local-clip-full-customer-cert" as const;

export const CLIP_FULL_CUSTOMER_CERT_EMAIL = "clip-cert@local.dev" as const;

export const studioClipRepurposingFullCustomerCertificationV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_FULL_CUSTOMER_CERTIFICATION_PACKAGE_ID,
  authorizedAt: "2026-10-02" as const,
  started: true as const,
  skuId: "v2-rtu-clip-repurposing" as const,
  campaignId: CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID,
  customerDisplayName: "Jordan Reed" as const,
  customerBusinessName: "River & Reed" as const,
  customerEmail: CLIP_FULL_CUSTOMER_CERT_EMAIL,
  ctaText: "Book a River & Reed table" as const,
  videoPurpose:
    "Help guests hear three distinct ideas from one workshop recording." as const,
  doNotPublish: true as const,
  doNotChangeMenu: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotReopenWiringUnlessDefect: true as const,
  designatedSourceRelativePath:
    "docs/launch/studio-operating-clip-repurposing-build-1/live-sources/positive-live-source.mp4.mp4" as const,
  designatedSourceBelowSoldFloor: true as const,
  soldMinimumSeconds: 900 as const,
  stampDir: "docs/launch/studio-clip-repurposing-full-customer-certification-1" as const,
} as const;
