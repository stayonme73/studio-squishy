/**
 * Approved Studio campaign page structure — reusable, not fixture-hardcoded.
 */

import {
  LANDING_PAGE_STRUCTURE_ID,
  type LandingPageSectionId,
} from "./types";

export const APPROVED_SECTION_ORDER: readonly LandingPageSectionId[] = [
  "hero",
  "offer",
  "details",
  "cta",
  "footer",
] as const;

export const STUDIO_CAMPAIGN_PAGE_STRUCTURE = {
  structureId: LANDING_PAGE_STRUCTURE_ID,
  label: "Approved Studio campaign page structure v1",
  maxPages: 1,
  maxOffers: 1,
  maxCtas: 1,
  sections: APPROVED_SECTION_ORDER,
  responsive: {
    desktopMinWidthPx: 1024,
    tabletWidthPx: 768,
    mobileWidthPx: 390,
    maxContentWidthPx: 720,
    forbidHorizontalOverflow: true,
  },
  designRules: {
    typography: {
      heroHeadlinePx: 40,
      subheadlinePx: 20,
      bodyPx: 17,
      ctaPx: 18,
    },
    spacing: {
      sectionYPx: 48,
      contentPadXPx: 24,
    },
    button: {
      minHeightPx: 48,
      borderRadiusPx: 12,
      fontWeight: 700,
    },
  },
  forbidden: [
    "blog",
    "ecommerce",
    "membership",
    "dashboard",
    "multi_page_nav",
    "custom_backend",
    "multiple_independent_ctas",
  ],
} as const;

export function assertSectionOrder(
  order: readonly LandingPageSectionId[],
): { ok: true } | { ok: false; findings: string[] } {
  const findings: string[] = [];
  if (order.length !== APPROVED_SECTION_ORDER.length) {
    findings.push("section_count_mismatch");
  }
  for (let i = 0; i < APPROVED_SECTION_ORDER.length; i++) {
    if (order[i] !== APPROVED_SECTION_ORDER[i]) {
      findings.push(`section_order_mismatch_at_${i}`);
    }
  }
  return findings.length ? { ok: false, findings } : { ok: true };
}
