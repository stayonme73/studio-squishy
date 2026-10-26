import type { StudioCustomerMoodId } from "@/config/studio-design-intelligence-v1";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";

import { DESIGN_PALETTE_FAMILIES, preferredPaletteFor } from "./library";
import type {
  DesignCreativeBrief,
  DesignIndustryFamily,
  DesignPalette,
} from "./types";

const HEX_RE = /#([0-9A-Fa-f]{6})\b/g;

export type CreativeBriefSource = {
  businessName: string;
  flyerPurpose: string;
  mustInclude: string;
  materials: string;
  intendedUse: string;
  sizeNotes: string;
  cta: string;
  headline: string;
  offerName: string;
  body: string;
  logoAvailable: boolean;
  suppliedImagery: boolean;
  requiredFacts: readonly string[];
};

export function industryFamilyFromText(text: string): DesignIndustryFamily {
  const hay = text.toLowerCase();
  if (
    /\b(truck|freight|logistics|hauling|diesel|warehouse|fleet|shipping)\b/.test(
      hay,
    )
  ) {
    return "trades_logistics";
  }
  if (
    /\b(bakery|restaurant|cafe|café|bistro|catering|kitchen|hospitality|dining)\b/.test(
      hay,
    )
  ) {
    return "food_hospitality";
  }
  if (
    /\b(salon|spa|wellness|beauty|esthetic|massage|skincare|facial)\b/.test(hay)
  ) {
    return "beauty_wellness";
  }
  if (
    /\b(boutique|fashion|styling|stylist|apparel|clothing|couture|atelier)\b/.test(
      hay,
    )
  ) {
    return "retail_fashion";
  }
  if (
    /\b(architect|law|account|consult|b2b|insurance|finance|engineering)\b/.test(
      hay,
    )
  ) {
    return "professional_b2b";
  }
  if (
    /\b(studio|design|creative|software|technology|media|production|ai)\b/.test(
      hay,
    )
  ) {
    return "creative_technology";
  }
  if (
    /\b(organiz|plumber|hvac|home service|repair|cleaning|landscap)\b/.test(
      hay,
    )
  ) {
    return "service_business";
  }
  return "unknown";
}

export function moodFromCustomerLanguage(text: string): {
  moodId: StudioCustomerMoodId;
  source: DesignCreativeBrief["moodSource"];
} {
  const hay = text.toLowerCase();
  if (/edgy|slightly edgy/.test(hay)) {
    return { moodId: "creative_edgy", source: "customer_language" };
  }
  if (/editorial|elevated|elevated, polished|premium|elegant|sophisticated/.test(hay)) {
    if (/modern|minimal/.test(hay)) {
      return { moodId: "modern_minimal", source: "customer_language" };
    }
    return { moodId: "elegant_premium", source: "customer_language" };
  }
  if (/warm|welcoming|calm|uncluttered|botanical/.test(hay)) {
    return { moodId: "warm_welcoming", source: "customer_language" };
  }
  if (/bold|energetic|loud|high.?energy/.test(hay)) {
    return { moodId: "bold_energetic", source: "customer_language" };
  }
  if (/professional|polished|clean and professional/.test(hay)) {
    return { moodId: "professional_polished", source: "customer_language" };
  }
  if (/modern|minimal/.test(hay)) {
    return { moodId: "modern_minimal", source: "customer_language" };
  }
  return { moodId: "choose_for_me", source: "choose_for_me" };
}

function extractHexPalette(text: string): DesignPalette | null {
  const found = [...text.matchAll(HEX_RE)].map((m) => `#${m[1]!.toUpperCase()}`);
  const unique = [...new Set(found)];
  if (unique.length < 2) return null;
  return {
    familyId: "graphite_paper",
    primary: unique[0]!,
    secondary: unique[1]!,
    background: unique[2] ?? "#F4EFE6",
    text: unique[0]!,
    muted: "#6B6459",
  };
}

function suppliedKeywordPalette(text: string): DesignPalette | null {
  if (/botanical|soft neutral|warm,\s*clean,\s*calm/.test(text)) {
    return DESIGN_PALETTE_FAMILIES.botanical_sage;
  }
  if (/\bnavy\b.*\bgold\b|\bgold\b.*\bnavy\b/.test(text.toLowerCase())) {
    return DESIGN_PALETTE_FAMILIES.navy_gold_house;
  }
  return null;
}

export function deriveCreativeBrief(source: CreativeBriefSource): DesignCreativeBrief {
  const hay = [
    source.businessName,
    source.flyerPurpose,
    source.mustInclude,
    source.materials,
    source.headline,
    source.offerName,
    source.body,
  ].join("\n");
  const industryFamily = industryFamilyFromText(hay);
  const mood = moodFromCustomerLanguage(source.materials || hay);
  const existing =
    extractHexPalette(hay) ?? suppliedKeywordPalette(hay);
  const chooseForMe = !existing && mood.source === "choose_for_me";
  const resolvedMood: StudioCustomerMoodId = chooseForMe
    ? preferredMoodForIndustry(industryFamily)
    : mood.moodId;
  return {
    businessType: source.businessName,
    industryFamily,
    businessPurpose: source.flyerPurpose.slice(0, 240),
    targetAudience: audienceFromText(hay, industryFamily),
    whatIsPromoted: source.offerName || source.headline,
    primaryMessage: source.headline || source.offerName,
    cta: source.cta,
    desiredBrandFeeling: source.materials.slice(0, 280),
    moodId: resolvedMood,
    moodSource: mood.source,
    existingBrandColors: existing,
    dislikedNotes: dislikedFromText(hay),
    logoAvailable: source.logoAvailable,
    wordmarkOnly: !source.logoAvailable,
    suppliedImagery: source.suppliedImagery,
    intendedUse: source.intendedUse,
    format: source.sizeNotes || "studio_certified_flyer",
    requiredFacts: source.requiredFacts,
    chooseForMe,
  };
}

export function deriveCreativeBriefFromTruth(
  truth: FlyerProjectTruth,
  extras?: { flyerPurpose?: string; materials?: string },
): DesignCreativeBrief {
  return deriveCreativeBrief({
    businessName: truth.businessName,
    flyerPurpose: extras?.flyerPurpose ?? truth.headline,
    mustInclude: [truth.offerName, truth.body, truth.dateWindow, truth.cta].join(
      "\n",
    ),
    materials: extras?.materials ?? "",
    intendedUse: truth.intendedUse ?? "",
    sizeNotes: truth.sizeNotes ?? "",
    cta: truth.cta,
    headline: truth.headline,
    offerName: truth.offerName,
    body: truth.body,
    logoAvailable: Boolean(truth.approvedLogoVariantId),
    suppliedImagery: truth.materials.some((m) => m.role === "hero"),
    requiredFacts: truth.requiredTextTokens,
  });
}

export function paletteForBrief(brief: DesignCreativeBrief): DesignPalette {
  if (brief.existingBrandColors) return brief.existingBrandColors;
  const familyId = preferredPaletteFor({
    industryFamily: brief.industryFamily,
    moodId: brief.moodId,
    chooseForMe: brief.chooseForMe,
  });
  return DESIGN_PALETTE_FAMILIES[familyId];
}

function preferredMoodForIndustry(
  industry: DesignIndustryFamily,
): StudioCustomerMoodId {
  if (industry === "trades_logistics") return "bold_energetic";
  if (industry === "food_hospitality") return "warm_welcoming";
  if (industry === "beauty_wellness") return "elegant_premium";
  if (industry === "retail_fashion") return "elegant_premium";
  if (industry === "creative_technology") return "creative_edgy";
  if (industry === "professional_b2b") return "professional_polished";
  return "professional_polished";
}

function audienceFromText(text: string, industry: DesignIndustryFamily): string {
  const match = text.match(
    /(?:invite|for|owners|entrepreneurs|homeowners|customers)[^\n.]{0,80}/i,
  );
  if (match) return match[0]!.slice(0, 160);
  if (industry === "creative_technology") {
    return "Small-business owners and entrepreneurs";
  }
  if (industry === "trades_logistics") return "Businesses that ship and haul";
  if (industry === "food_hospitality") return "Neighborhood guests";
  return "The customer's stated audience";
}

function dislikedFromText(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /do not|don't|no childish|not playful|not cartoon/i.test(line));
  return lines.join(" ").slice(0, 280);
}
