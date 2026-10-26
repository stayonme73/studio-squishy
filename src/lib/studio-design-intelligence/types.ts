import type { StudioCustomerMoodId } from "@/config/studio-design-intelligence-v1";

export type DesignIndustryFamily =
  | "service_business"
  | "retail_fashion"
  | "food_hospitality"
  | "professional_b2b"
  | "beauty_wellness"
  | "creative_technology"
  | "trades_logistics"
  | "unknown";

export type DesignLayoutFamilyId =
  | "editorial_split"
  | "bold_asymmetric"
  | "type_led_premium"
  | "service_rail"
  | "modular_thirds"
  | "centered_promotional_plate";

export type DesignPaletteFamilyId =
  | "ink_ember"
  | "steel_amber"
  | "wine_cream"
  | "botanical_sage"
  | "porcelain_blush"
  | "graphite_paper"
  | "cocoa_ink"
  | "harvest_terracotta"
  | "navy_gold_house";

export type DesignTypeSystemId =
  | "editorial_serif"
  | "grotesque_sans"
  | "tracked_display_serif"
  | "condensed_sans";

export type DesignGeometryId =
  | "vertical_split"
  | "left_slab"
  | "type_field"
  | "left_rail"
  | "thirds_dock"
  | "centered_circle"
  | "none";

export type DesignPalette = {
  familyId: DesignPaletteFamilyId;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  muted: string;
};

export type DesignCreativeBrief = {
  businessType: string;
  industryFamily: DesignIndustryFamily;
  businessPurpose: string;
  targetAudience: string;
  whatIsPromoted: string;
  primaryMessage: string;
  cta: string;
  desiredBrandFeeling: string;
  moodId: StudioCustomerMoodId;
  moodSource: "customer_language" | "choose_for_me";
  existingBrandColors: DesignPalette | null;
  dislikedNotes: string;
  logoAvailable: boolean;
  wordmarkOnly: boolean;
  suppliedImagery: boolean;
  intendedUse: string;
  format: string;
  requiredFacts: readonly string[];
  chooseForMe: boolean;
};

export type DesignCreativeRoute = {
  routeId: string;
  label: string;
  layoutFamilyId: DesignLayoutFamilyId;
  paletteFamilyId: DesignPaletteFamilyId;
  typeSystemId: DesignTypeSystemId;
  geometryId: DesignGeometryId;
  rationale: string;
};

export type FlyerCreativeDirection = {
  intelligenceVersion: string;
  brief: DesignCreativeBrief;
  selectedRoute: DesignCreativeRoute;
  candidateRoutes: readonly DesignCreativeRoute[];
  selectionMode: "anthropic_route_select" | "deterministic_score";
  chosenForCustomer: boolean;
};

export type VisualSignature = {
  campaignId: string;
  source: "successful_customer_job" | "blocked_seed";
  paletteFamilyId: DesignPaletteFamilyId | "unknown";
  primaryHex: string;
  secondaryHex: string;
  layoutFamilyId: DesignLayoutFamilyId | "unknown";
  geometryId: DesignGeometryId;
  typeSystemId: DesignTypeSystemId | "unknown";
  headlineAlign: "left" | "center" | "right" | "unknown";
  ctaTreatment: "pill" | "bar" | "text_rule" | "unknown";
  contentDistribution: "top_third" | "balanced_thirds" | "unknown";
  recordedAt: string;
};

export type AntiCopyVerdict =
  | { ok: true }
  | {
      ok: false;
      id: "derivative_visual_signature" | "maya_like_default";
      message: string;
      matchedAgainst: string;
    };
