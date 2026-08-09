/**
 * Synthetic Cedar Lane fixture for rm-j005 Kitchen proof.
 * CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";

import { lightEditLandingBodyCopy } from "./copy-edit";
import { APPROVED_SECTION_ORDER } from "./structure";
import type { LandingPageWorkPacket } from "./types";
import { LANDING_PAGE_STRUCTURE_ID } from "./types";

export const LANDING_FIXTURE_LABEL =
  "CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE" as const;

export const LANDING_FIXTURE_ID = "landing-1-cedar-lane" as const;
export const LANDING_CAMPAIGN_ID = "landing-prod-1-cedar-lane" as const;

/** Authoritative booking destination from fixture detail truth. */
export const LANDING_BOOKING_URL = "https://cedar-lane-studio.example/book" as const;

const LOGO_REL =
  "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-logo.png";
/** Desk/workspace still — used only for historical V1/V2 packets. */
const HERO_DESK_REL =
  "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-still-01.png";
/** Studio-controlled portrait hero for V3+ desktop QA correction. */
const HERO_PORTRAIT_REL =
  "docs/launch/kitchen-landing-page-production-1/source-assets/cedar-lane-portrait-hero-v1.png";

const RAW_BODY_COPY =
  "Cedar Lane Studio invites you to a Portrait Refresh for ninety-nine dollars. Bring your best self — we will handle the calm, clear portrait story.";

function hashRel(repoRoot: string, rel: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(repoRoot, rel)))
    .digest("hex");
}

export function buildCedarLaneLandingPacketV1(
  repoRoot: string,
): LandingPageWorkPacket {
  return {
    workPacketId: LANDING_CAMPAIGN_ID,
    workPacketVersion: "wp-v1",
    campaignId: LANDING_CAMPAIGN_ID,
    skuId: "rm-j005",
    label: LANDING_FIXTURE_LABEL,
    fixtureId: LANDING_FIXTURE_ID,
    businessName: "Cedar Lane Studio",
    personName: "Mira Chen",
    pagePurpose: "One campaign page for Portrait Refresh booking offer.",
    headline: "Portrait Refresh — $99",
    subheadline: "Book by May 3rd, 2026. Sessions from 10:30 AM.",
    offerSummary:
      "Refresh your portrait for $99 when you book by May 3rd, 2026.",
    detailBullets: [
      "Sessions begin at 10:30 AM",
      "Call (555) 018-4421",
      "Visit cedar-lane-studio.example/book",
    ],
    bodyCopy: RAW_BODY_COPY,
    limitedTime: true,
    deadlineText: "Before May 3rd, 2026",
    ctaKind: "call",
    ctaText: "Call to book",
    ctaHref: "tel:+15550184421",
    qrHref: "tel:+15550184421",
    phoneDisplay: "(555) 018-4421",
    emailDisplay: undefined,
    addressDisplay: undefined,
    footerLegal:
      "Internal Studio certification fixture — not a customer deliverable. Offer facts are synthetic.",
    outputMode: "certification_fixture",
    needsQr: true,
    brand: {
      primary: "#1F4A44",
      accent: "#8A6A4B",
      background: "#F7F1E8",
      text: "#1A1A1A",
      muted: "#5C6B66",
    },
    assets: [
      {
        assetId: "logo",
        role: "logo",
        relativePath: LOGO_REL,
        contentSha256: hashRel(repoRoot, LOGO_REL),
      },
      {
        assetId: "hero",
        role: "hero",
        relativePath: HERO_DESK_REL,
        contentSha256: hashRel(repoRoot, HERO_DESK_REL),
      },
    ],
    sectionOrder: APPROVED_SECTION_ORDER,
    structureId: LANDING_PAGE_STRUCTURE_ID,
    publishTarget: "static_host_api",
    exportRelativePath:
      "docs/launch/kitchen-landing-page-production-1/artifacts/v1/rm-j005_landing-prod-1-cedar-lane_wp-v1.html",
  };
}

/** V2 correction: CTA wording + destination clarity (still authoritative fixture facts). */
export function buildCedarLaneLandingPacketV2(
  repoRoot: string,
): LandingPageWorkPacket {
  const v1 = buildCedarLaneLandingPacketV1(repoRoot);
  return {
    ...v1,
    workPacketVersion: "wp-v2",
    supersedesWorkPacketVersion: "wp-v1",
    correctionReason:
      "V1 CORRECTION: CTA text must match fixture booking language — Call to book → Book your visit today; keep tel: destination exact.",
    ctaText: "Book your visit today",
    ctaHref: "tel:+15550184421",
    qrHref: "tel:+15550184421",
    headline: "Portrait Refresh — $99",
    exportRelativePath:
      "docs/launch/kitchen-landing-page-production-1/artifacts/v2/rm-j005_landing-prod-1-cedar-lane_wp-v2.html",
    preserveV1RelativePath: v1.exportRelativePath,
  };
}

/**
 * V3 desktop QA correction — preserve layout/system; fix hero relevance, repetition,
 * light-edited body copy, and QR → authoritative booking URL.
 */
export function buildCedarLaneLandingPacketV3(
  repoRoot: string,
): LandingPageWorkPacket {
  const v2 = buildCedarLaneLandingPacketV2(repoRoot);
  const body = lightEditLandingBodyCopy(RAW_BODY_COPY);
  if (!body.changed) {
    throw new Error(
      `V3 expected light-edit of awkward body copy; findings=${body.findings.join(",")}`,
    );
  }

  return {
    ...v2,
    workPacketVersion: "wp-v3",
    supersedesWorkPacketVersion: "wp-v2",
    correctionReason:
      "DESKTOP QA CORRECTION: portrait-relevant hero; remove deadline/session repetition; light-edit awkward body copy via copy-edit rules; QR encodes authoritative booking URL; preserve layout/typography/colors/CTA architecture.",
    subheadline: "Book by May 3rd, 2026 · Sessions from 10:30 AM",
    offerSummary: "Refresh your portrait for $99.",
    detailBullets: [
      "Call (555) 018-4421",
      "Visit cedar-lane-studio.example/book",
    ],
    bodyCopy: body.text,
    limitedTime: true,
    deadlineText: "Before May 3rd, 2026",
    ctaText: "Book your visit today",
    ctaHref: "tel:+15550184421",
    qrHref: LANDING_BOOKING_URL,
    assets: [
      {
        assetId: "logo",
        role: "logo",
        relativePath: LOGO_REL,
        contentSha256: hashRel(repoRoot, LOGO_REL),
      },
      {
        assetId: "hero",
        role: "hero",
        relativePath: HERO_PORTRAIT_REL,
        contentSha256: hashRel(repoRoot, HERO_PORTRAIT_REL),
      },
    ],
    exportRelativePath:
      "docs/launch/kitchen-landing-page-production-1/artifacts/v3/rm-j005_landing-prod-1-cedar-lane_wp-v3.html",
    preserveV1RelativePath: v2.exportRelativePath,
  };
}

/**
 * V4 mobile QA correction — same content as V3; mechanism wraps hero subline on narrow screens.
 */
export function buildCedarLaneLandingPacketV4(
  repoRoot: string,
): LandingPageWorkPacket {
  const v3 = buildCedarLaneLandingPacketV3(repoRoot);
  return {
    ...v3,
    workPacketVersion: "wp-v4",
    supersedesWorkPacketVersion: "wp-v3",
    correctionReason:
      "MOBILE QA CORRECTION: hero deadline/session subline wraps to two centered lines under 480px; no wording change; no redesign.",
    exportRelativePath:
      "docs/launch/kitchen-landing-page-production-1/artifacts/v4/rm-j005_landing-prod-1-cedar-lane_wp-v4.html",
    preserveV1RelativePath: v3.exportRelativePath,
  };
}
