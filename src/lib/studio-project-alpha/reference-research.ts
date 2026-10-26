/**
 * Category aesthetic research — patterns, not copied artwork.
 * Provenance is recorded when a principle materially informs a job.
 */

import type { DesignCreativeBrief, DesignIndustryFamily } from "@/lib/studio-design-intelligence/types";

export type CategoryVisualPrinciple = {
  industryFamily: DesignIndustryFamily;
  summary: string;
  principles: readonly string[];
  source: "studio_reference_library";
};

export const CATEGORY_VISUAL_PRINCIPLES: Record<
  DesignIndustryFamily,
  CategoryVisualPrinciple
> = {
  beauty_wellness: {
    industryFamily: "beauty_wellness",
    summary:
      "Current premium beauty creative commonly uses restrained color systems, high-quality product or atmosphere fields, large editorial typography, controlled whitespace, and a quiet CTA.",
    principles: [
      "Restrained palette",
      "Editorial type scale",
      "Controlled whitespace",
      "Minimal CTA",
    ],
    source: "studio_reference_library",
  },
  retail_fashion: {
    industryFamily: "retail_fashion",
    summary:
      "Fashion-forward work leans editorial: crop, type as identity, asymmetry, and a single strong visual anchor rather than a promotional seal.",
    principles: [
      "Editorial crop / split field",
      "Type as identity",
      "Asymmetry",
      "One visual anchor",
    ],
    source: "studio_reference_library",
  },
  food_hospitality: {
    industryFamily: "food_hospitality",
    summary:
      "Hospitality creative uses warmth, appetite through color and texture, generous type for the named offer, and a clear next step.",
    principles: [
      "Warm palette",
      "Named offer as hero",
      "Texture or slab as appetite cue",
      "Clear next step",
    ],
    source: "studio_reference_library",
  },
  trades_logistics: {
    industryFamily: "trades_logistics",
    summary:
      "Industrial service creative is high-contrast, readable at arm's length, structured, and free of boutique ornaments.",
    principles: [
      "High contrast",
      "Left rail or slab",
      "Large price/offer",
      "Contact as footer, not decoration",
    ],
    source: "studio_reference_library",
  },
  professional_b2b: {
    industryFamily: "professional_b2b",
    summary:
      "Professional services use quiet authority, structured information design, generous margins, and type-led identity.",
    principles: [
      "Structured thirds",
      "Type-led identity",
      "Quiet palette",
      "Footer as designed dock, not leftover",
    ],
    source: "studio_reference_library",
  },
  creative_technology: {
    industryFamily: "creative_technology",
    summary:
      "Modern creative studios use cinematic fields, oversized identity, a mid-canvas editorial band, and a decisive lower CTA dock — not a photocopied promotional plate.",
    principles: [
      "Cinematic field",
      "Oversized identity",
      "Mid-canvas information band",
      "Designed lower dock",
    ],
    source: "studio_reference_library",
  },
  service_business: {
    industryFamily: "service_business",
    summary:
      "Home and local services need crisp trust: bright or botanical calm, named service, price grouped with offer, and a bottom-edge next step.",
    principles: [
      "Named service leads",
      "Trustworthy contrast",
      "Offer and price grouped",
      "Bottom-edge CTA",
    ],
    source: "studio_reference_library",
  },
  unknown: {
    industryFamily: "unknown",
    summary:
      "When industry is unclear, reason from audience and mood. Do not reuse the last successful job.",
    principles: [
      "Audience first",
      "Mood from customer language or Choose for me",
      "No inherited signature",
    ],
    source: "studio_reference_library",
  },
};

export function researchCategoryPrinciples(
  brief: DesignCreativeBrief,
): CategoryVisualPrinciple {
  return CATEGORY_VISUAL_PRINCIPLES[brief.industryFamily];
}
