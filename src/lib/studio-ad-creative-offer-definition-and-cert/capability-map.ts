export type FactoryReadiness =
  | "READY"
  | "READY_WITH_EXPLICIT_LIMITS"
  | "PARTIAL"
  | "MISSING"
  | "DO_NOT_USE";

export type FactoryCapabilityRow = {
  id: string;
  label: string;
  readiness: FactoryReadiness;
  note: string;
};

export function adCreativeFactoryCapabilityMap(): readonly FactoryCapabilityRow[] {
  return [
    {
      id: "static_graphics",
      label: "Static graphics",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Promotion-graphics factory. Square 1024×1024 + portrait 1024×1536 PNG. One theme.",
    },
    {
      id: "social_promo_graphics",
      label: "Social / promo graphics",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Social posts are four squares + captions and exclude paid ads. Promo pair is the Ad Creative V1 graphic base.",
    },
    {
      id: "short_form_video",
      label: "Short-form ad video",
      readiness: "DO_NOT_USE",
      note: "Content pack and Clip are certified as content, not ad-cutdowns. Platform-specific video variants remain out of launch.",
    },
    {
      id: "copy_headline",
      label: "Copy / headline generation",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Ad text card assembles only customer-supplied facts. Studio does not invent claims.",
    },
    {
      id: "variations",
      label: "Creative variations",
      readiness: "PARTIAL",
      note: "Two coordinated formats of one offer. Not an A/B testing matrix.",
    },
    {
      id: "sizing_export",
      label: "Sizing / export",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Certified plates only. No 1.91:1, Stories, or extra network-spec sizes.",
    },
    {
      id: "review",
      label: "Review",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Existing Review Room path. Ad Creative V1 is unpublished, so live purchase review is not opened.",
    },
    {
      id: "revision",
      label: "Revision",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "One included set revision: headline, CTA, or a supplied factual correction.",
    },
    {
      id: "delivery",
      label: "Delivery",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Per-campaign artifact root. Paste-ready text + graphic files. Customer uploads.",
    },
    {
      id: "qa",
      label: "QA",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Promo set QA for graphics. Claims gate for ad text. Quality is not skipped.",
    },
    {
      id: "ad_accounts",
      label: "Ad account / spend / targeting",
      readiness: "DO_NOT_USE",
      note: "Customer owns publishing, accounts, budgets, targeting, and campaign management.",
    },
  ];
}
