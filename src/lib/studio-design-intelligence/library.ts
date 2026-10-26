/**
 * Callable Design Reference Library — visual knowledge, not copy-paste templates.
 * Reason from these families. Do not paste them as finished customer artwork.
 */

import type {
  DesignGeometryId,
  DesignIndustryFamily,
  DesignLayoutFamilyId,
  DesignPalette,
  DesignPaletteFamilyId,
  DesignTypeSystemId,
} from "./types";

export const DESIGN_PALETTE_FAMILIES: Record<DesignPaletteFamilyId, DesignPalette> =
  {
    ink_ember: {
      familyId: "ink_ember",
      primary: "#1C1917",
      secondary: "#C45C26",
      background: "#F4EFE6",
      text: "#1C1917",
      muted: "#6B6459",
    },
    steel_amber: {
      familyId: "steel_amber",
      primary: "#2B3138",
      secondary: "#D08A1A",
      background: "#F3F1EA",
      text: "#1A1C1E",
      muted: "#5E646C",
    },
    wine_cream: {
      familyId: "wine_cream",
      primary: "#5C1520",
      secondary: "#D4B896",
      background: "#F7EFE4",
      text: "#2A1418",
      muted: "#7A5A58",
    },
    botanical_sage: {
      familyId: "botanical_sage",
      primary: "#3F5A4A",
      secondary: "#B89A6A",
      background: "#F4F0E6",
      text: "#2A2824",
      muted: "#6A655C",
    },
    porcelain_blush: {
      familyId: "porcelain_blush",
      primary: "#3D2A32",
      secondary: "#C9899A",
      background: "#F6F1F2",
      text: "#2C2226",
      muted: "#7A646C",
    },
    graphite_paper: {
      familyId: "graphite_paper",
      primary: "#2A2A28",
      secondary: "#8A8680",
      background: "#F2EFE8",
      text: "#1F1F1D",
      muted: "#6F6C66",
    },
    cocoa_ink: {
      familyId: "cocoa_ink",
      primary: "#2C1810",
      secondary: "#A67C52",
      background: "#EDE4D4",
      text: "#2A211C",
      muted: "#6A5C52",
    },
    harvest_terracotta: {
      familyId: "harvest_terracotta",
      primary: "#7A3419",
      secondary: "#E0A36A",
      background: "#F6EBDD",
      text: "#2A1C12",
      muted: "#8A6550",
    },
    navy_gold_house: {
      familyId: "navy_gold_house",
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5A6570",
    },
  };

export const FONT_STACKS: Record<DesignTypeSystemId, string> = {
  editorial_serif:
    'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif',
  tracked_display_serif:
    'Georgia, "Times New Roman", Times, serif',
  grotesque_sans: 'Arial, Helvetica, "Segoe UI", sans-serif',
  condensed_sans: '"Arial Narrow", Arial, Helvetica, sans-serif',
};

export type LayoutArchetype = {
  id: DesignLayoutFamilyId;
  geometryId: DesignGeometryId;
  hierarchy: string;
  spacing: string;
  imageTreatment: string;
  ctaTreatment: "pill" | "bar" | "text_rule";
  editorialNote: string;
};

export const LAYOUT_ARCHETYPES: Record<DesignLayoutFamilyId, LayoutArchetype> = {
  editorial_split: {
    id: "editorial_split",
    geometryId: "vertical_split",
    hierarchy: "Left type column leads; right color field is atmosphere, not a logo substitute.",
    spacing: "Asymmetric margins; intentional negative space in the field.",
    imageTreatment: "Wordmark/type only unless a licensed customer image exists.",
    ctaTreatment: "text_rule",
    editorialNote: "Magazine cover logic for launch, luxury, and editorial brands.",
  },
  bold_asymmetric: {
    id: "bold_asymmetric",
    geometryId: "left_slab",
    hierarchy: "A heavy left slab carries identity; offer and price sit on the open field.",
    spacing: "Flush slab, open right margin, CTA as a bar not a centered pill.",
    imageTreatment: "No decorative circle. Slab is the hero device.",
    ctaTreatment: "bar",
    editorialNote: "Promotional energy for trades, events, and high-contrast offers.",
  },
  type_led_premium: {
    id: "type_led_premium",
    geometryId: "type_field",
    hierarchy: "Oversized wordmark is the focal point; supporting copy is secondary.",
    spacing: "Hairline rules; mid-canvas information band; designed lower dock.",
    imageTreatment: "No medallion. Type is the ornament; a paper band carries facts.",
    ctaTreatment: "bar",
    editorialNote: "Architecture, studios, and premium professional services.",
  },
  service_rail: {
    id: "service_rail",
    geometryId: "left_rail",
    hierarchy: "Left rail marks the brand edge; facts stack left-aligned.",
    spacing: "Tight professional rhythm; footer dock, never a centered seal.",
    imageTreatment: "Rail + rule, not a circular badge.",
    ctaTreatment: "bar",
    editorialNote: "B2B, logistics, and service businesses that need calm authority.",
  },
  modular_thirds: {
    id: "modular_thirds",
    geometryId: "thirds_dock",
    hierarchy: "Explicit top identity, mid offer, lower CTA dock.",
    spacing: "Three designed bands. Empty leftover canvas is not a band.",
    imageTreatment: "Bands are the visual system; customer imagery sits in mid if supplied.",
    ctaTreatment: "bar",
    editorialNote: "Structured information design for launches and professional services.",
  },
  centered_promotional_plate: {
    id: "centered_promotional_plate",
    geometryId: "centered_circle",
    hierarchy: "Centered identity over a promotional price seal.",
    spacing: "Framed paper mat with top and bottom bars.",
    imageTreatment: "Circular medallion only when a promotional price independently requires a seal.",
    ctaTreatment: "pill",
    editorialNote:
      "Legacy CERT / priced-retail plate. Not the Studio default. Use only when the brief independently supports a promotional seal.",
  },
};

export const INDUSTRY_STRUCTURE_NOTES: Record<DesignIndustryFamily, string> = {
  service_business:
    "Lead with the named service and a clear next step. Avoid fashion-atelier ornaments.",
  retail_fashion:
    "Editorial crop, type as identity, restrained palette. A circle is not a boutique requirement.",
  food_hospitality:
    "Warmth and appetite cues through color and type, not clip-art plates.",
  professional_b2b:
    "Quiet authority. Left alignment. No carnival seals.",
  beauty_wellness:
    "Soft contrast, generous space, no trucking-slab energy.",
  creative_technology:
    "Slightly edgy editorial. Ink, ember, or graphite — not house navy/gold.",
  trades_logistics:
    "High-contrast, readable at arm's length, industrial palette.",
  unknown:
    "Choose from audience and mood, not from the last successful job.",
};

export function paletteById(id: DesignPaletteFamilyId): DesignPalette {
  return DESIGN_PALETTE_FAMILIES[id];
}

export function preferredPaletteFor(input: {
  industryFamily: DesignIndustryFamily;
  moodId: string;
  chooseForMe: boolean;
}): DesignPaletteFamilyId {
  if (input.industryFamily === "trades_logistics") return "steel_amber";
  if (input.industryFamily === "food_hospitality") return "harvest_terracotta";
  if (input.industryFamily === "beauty_wellness") return "porcelain_blush";
  if (input.industryFamily === "retail_fashion") return "cocoa_ink";
  if (input.industryFamily === "professional_b2b") return "graphite_paper";
  if (input.industryFamily === "creative_technology") {
    if (input.moodId === "elegant_premium") return "graphite_paper";
    return "ink_ember";
  }
  if (input.industryFamily === "service_business") {
    if (input.moodId === "warm_welcoming") return "botanical_sage";
    return "graphite_paper";
  }
  if (input.moodId === "warm_welcoming") return "harvest_terracotta";
  if (input.moodId === "elegant_premium") return "wine_cream";
  if (input.moodId === "bold_energetic") return "steel_amber";
  if (input.moodId === "creative_edgy") return "ink_ember";
  if (input.moodId === "professional_polished") return "graphite_paper";
  return "graphite_paper";
}

export function preferredLayoutsFor(
  industryFamily: DesignIndustryFamily,
): readonly DesignLayoutFamilyId[] {
  if (industryFamily === "trades_logistics") {
    return ["service_rail", "bold_asymmetric", "modular_thirds"];
  }
  if (industryFamily === "food_hospitality") {
    return ["bold_asymmetric", "modular_thirds", "editorial_split"];
  }
  if (industryFamily === "retail_fashion" || industryFamily === "beauty_wellness") {
    return ["editorial_split", "modular_thirds", "type_led_premium"];
  }
  if (industryFamily === "creative_technology") {
    return ["type_led_premium", "modular_thirds", "editorial_split"];
  }
  if (industryFamily === "professional_b2b") {
    return ["modular_thirds", "type_led_premium", "service_rail"];
  }
  return ["modular_thirds", "service_rail", "editorial_split"];
}
