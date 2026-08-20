/**
 * Cedar Lane Home Organizing — Machine-readable CampaignVisualSystem.
 * Calm / practical / no neon. Distinct from Rooted & Ready wellness.
 */

import type { CampaignVisualSystem } from "../contracts";

export const CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1: CampaignVisualSystem =
  {
    systemId: "cedar-lane-home-organizing-v1",
    palette: {
      primary: "#3D5A4C",
      secondary: "#8B7355",
      background: "#F6F1E8",
      text: "#2C2A26",
      muted: "#6B6560",
      accent: "#C4A574",
    },
    typographyRoles: {
      wordmark: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 600 },
      headline: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 700 },
      body: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 400 },
      price: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 600 },
      dates: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 500 },
      cta: { fontFamily: "Georgia, 'Times New Roman', serif", weight: 600 },
    },
    logoRules: {
      minClearspacePx: 24,
      maxWidthFraction: 0.32,
      allowedPlacements: ["top_left", "top_center"],
    },
    imageTreatmentRules: {
      preferredFit: "cover",
      allowFullBleed: true,
      overlayMaxOpacity: 0.58,
    },
    spacingScalePx: [16, 24, 32, 48, 64, 80],
    ctaStyle: {
      background: "rgba(246, 241, 232, 0.16)",
      textColor: "#F6F1E8",
      borderRadiusPx: 4,
      minHeightPx: 40,
    },
    hierarchy: ["photo", "logo", "headline", "body", "dates", "cta"],
    approvedLayoutFamilyIds: ["full_bleed_hero", "split_hero", "image_panel"],
  };
