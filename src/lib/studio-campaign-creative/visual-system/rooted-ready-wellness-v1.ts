/**
 * Rooted & Ready wellness — Machine-readable CampaignVisualSystem.
 * One-time Owner creative approval happens after seeing live art — not abstract CSS.
 */

import { CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1 } from "./cedar-lane-home-organizing-v1";
import { HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1 } from "./harbor-roast-coffee-v1";
import type { CampaignVisualSystem } from "../contracts";

export const ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1: CampaignVisualSystem = {
  systemId: "rooted-ready-wellness-v1",
  palette: {
    primary: "#1F3A4D",
    secondary: "#8B7355",
    background: "#F7F3EC",
    text: "#1A1A1A",
    muted: "#6B6560",
    accent: "#C4A484",
  },
  typographyRoles: {
    wordmark: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 600 },
    headline: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 700 },
    body: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 400 },
    price: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 700 },
    dates: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 500 },
    cta: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 600 },
  },
  logoRules: {
    minClearspacePx: 24,
    maxWidthFraction: 0.28,
    allowedPlacements: ["top_left", "top_center"],
  },
  imageTreatmentRules: {
    preferredFit: "cover",
    allowFullBleed: true,
    overlayMaxOpacity: 0.62,
  },
  spacingScalePx: [16, 24, 32, 48, 64, 80],
  ctaStyle: {
    background: "rgba(247, 243, 236, 0.14)",
    textColor: "#F7F3EC",
    borderRadiusPx: 4,
    minHeightPx: 40,
  },
  hierarchy: ["photo", "logo", "headline", "body", "dates", "price", "cta"],
  approvedLayoutFamilyIds: [
    "full_bleed_hero",
    "split_hero",
    "image_panel",
  ],
};

export function loadCampaignVisualSystem(systemId: string): CampaignVisualSystem {
  if (systemId === ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1.systemId) {
    return ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1;
  }
  if (systemId === CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1.systemId) {
    return CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1;
  }
  if (systemId === HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1.systemId) {
    return HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1;
  }
  throw new Error(`UNKNOWN_CAMPAIGN_VISUAL_SYSTEM:${systemId}`);
}
