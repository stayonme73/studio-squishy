/**
 * KITCHEN-LANDING-PAGE-PRODUCTION-1 — provider-independent landing page types.
 * Customer page deliverable ≠ Studio app route.
 */

export const LANDING_PAGE_SKU = "rm-j005" as const;
export type LandingPageSku = typeof LANDING_PAGE_SKU;

export const LANDING_PAGE_STRUCTURE_ID = "studio-campaign-page-v1" as const;
export const LANDING_PAGE_MECHANISM_VERSION = "landing-page-production-1.0.0" as const;

/** Owner-sealed Kitchen status — not unlimited Customer Ready / not CERTIFIED. */
export const LANDING_PAGE_CUSTOMER_READY_STATUS =
  "CUSTOMER READY WITH LIMITS" as const;

export type LandingCtaKind =
  | "call"
  | "booking"
  | "order"
  | "directions"
  | "other_approved_link";

/** customer = deliverable page; certification_fixture may show internal disclaimers. */
export type LandingOutputMode = "customer" | "certification_fixture";

export type LandingPageSectionId =
  | "hero"
  | "offer"
  | "details"
  | "cta"
  | "footer";

export type LandingPageWorkPacket = {
  workPacketId: string;
  workPacketVersion: string;
  campaignId: string;
  skuId: LandingPageSku;
  label: string;
  fixtureId: string;
  businessName: string;
  personName?: string;
  pagePurpose: string;
  headline: string;
  subheadline: string;
  offerSummary: string;
  detailBullets: readonly string[];
  /** Customer-supplied wording (light formatting only — not invented copy). */
  bodyCopy: string;
  limitedTime: boolean;
  deadlineText?: string;
  ctaKind: LandingCtaKind;
  ctaText: string;
  /** Authoritative primary CTA href — tel:, mailto:, https:// only. No # placeholders. */
  ctaHref: string;
  /**
   * Authoritative QR payload when needsQr.
   * May differ from ctaHref (e.g. button = tel:, QR = https booking URL).
   */
  qrHref?: string;
  phoneDisplay?: string;
  emailDisplay?: string;
  addressDisplay?: string;
  footerLegal: string;
  /**
   * customer-output omits certification-only disclaimers.
   * Synthetic Kitchen fixtures use certification_fixture.
   */
  outputMode: LandingOutputMode;
  needsQr: boolean;
  brand: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  assets: readonly {
    assetId: string;
    role: "logo" | "hero";
    relativePath: string;
    contentSha256: string;
  }[];
  sectionOrder: readonly LandingPageSectionId[];
  structureId: typeof LANDING_PAGE_STRUCTURE_ID;
  publishTarget: "static_host_api";
  supersedesWorkPacketVersion?: string;
  correctionReason?: string;
  exportRelativePath: string;
  preserveV1RelativePath?: string;
};

export type LandingPageDefinition = {
  definitionVersion: string;
  structureId: typeof LANDING_PAGE_STRUCTURE_ID;
  mechanismVersion: typeof LANDING_PAGE_MECHANISM_VERSION;
  workPacketVersion: string;
  campaignId: string;
  skuId: LandingPageSku;
  sections: readonly LandingPageSectionId[];
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHref: string;
  needsQr: boolean;
};

export type LandingPageArtifactRecord = {
  artifactId: string;
  relativePath: string;
  contentSha256: string;
  byteLength: number;
  mimeType: "text/html";
  workPacketVersion: string;
  definitionVersion: string;
  structureId: typeof LANDING_PAGE_STRUCTURE_ID;
  mechanismVersion: typeof LANDING_PAGE_MECHANISM_VERSION;
  campaignId: string;
  skuId: LandingPageSku;
  assetHashes: Readonly<Record<string, string>>;
  boundAt: string;
  qaState: "qa_ready";
  customerReady: false;
  certified: false;
  qaPass: false;
  label: string;
};

export type LandingPublishResult =
  | {
      ok: true;
      provider: "netlify";
      deploymentId: string;
      publicUrl: string;
      deployedAt: string;
      status: "published";
    }
  | {
      ok: false;
      code:
        | "credentials_absent"
        | "publish_rejected"
        | "provider_network_failure"
        | "public_access_blocked";
      message: string;
      ownerSetupRequired: boolean;
    };

export type LandingQaCheck = {
  id: string;
  ok: boolean;
  detail: string;
};
