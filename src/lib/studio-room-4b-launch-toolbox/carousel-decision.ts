/**
 * Room 4B Blocker 7 — carousel launch-menu decision (evidence-based).
 * Do not invent a carousel SKU. Do not fake certification.
 */

export const CAROUSEL_LAUNCH_DECISION = {
  choice: "B_REMOVE_FROM_LAUNCH_NOW_MENU" as const,
  classification: "NOT ON LAUNCH MENU" as const,
  packageId: "STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1",
  catalogAuthority: "src/catalog/v2/batch1-ready-to-use.ts exclusions on v2-rtu-social-posts",
  whyNotA: [
    "No multi-slide renderer contract for customer carousel sets",
    "Social RTU is square four-post static only — carousels explicitly excluded",
    "No Review Room multi-slide feedback/version spine for carousel",
    "No Delivery packaging for carousel slide sets",
    "No QA set consistency for ordered multi-slide creative",
    "Building a certifiable carousel path now would invent a new SKU mid-certification",
  ] as const,
  customerFacingHonesty:
    "Social carousels are not on The Studio Launch Now menu. We produce coordinated static social graphics (four square posts) within the social-posts service — not carousels, Stories, or Reels.",
  launchMenuWording:
    "Social graphics (static posts) — carousels, Stories, and Reels are not offered at launch",
} as const;

export type CarouselLaunchDecision = typeof CAROUSEL_LAUNCH_DECISION;
