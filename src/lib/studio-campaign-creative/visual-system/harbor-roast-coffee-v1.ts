/**
 * Harbor Roast Coffee Co. — Machine-readable CampaignVisualSystem.
 * Warm roast brown / cream / copper. Distinct from Cedar sage and Nia wellness.
 */

import type { CampaignVisualSystem } from "../contracts";

export const HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1: CampaignVisualSystem = {
  systemId: "harbor-roast-coffee-v1",
  palette: {
    primary: "#4A2C2A",
    secondary: "#8C5A3C",
    background: "#F4EDE3",
    text: "#241714",
    muted: "#6E5348",
    accent: "#C4844A",
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
    maxWidthFraction: 0.34,
    allowedPlacements: ["top_left", "top_center"],
  },
  imageTreatmentRules: {
    preferredFit: "cover",
    allowFullBleed: true,
    overlayMaxOpacity: 0.72,
  },
  spacingScalePx: [16, 24, 32, 48, 64, 80],
  ctaStyle: {
    background: "rgba(244, 237, 227, 0.16)",
    textColor: "#F4EDE3",
    borderRadiusPx: 4,
    minHeightPx: 40,
  },
  hierarchy: ["photo", "logo", "headline", "body", "dates", "price", "cta"],
  approvedLayoutFamilyIds: ["full_bleed_hero", "split_hero", "image_panel"],
  fullBleedDateColor: "#F4EDE3",
};
