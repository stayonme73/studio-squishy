/**
 * Room 4C Scenario 2 — Harbor Roast Coffee Co.
 * Authoritative campaign facts. Only owner-authorized package-brief facts.
 * No shop URL or contact email was supplied — do not invent one.
 */

export const ROOM_4C_SCENARIO_2_PACKAGE_ID =
  "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1" as const;

export const ROOM_4C_SCENARIO_2_ID =
  "scenario-2-product-or-offer-launch" as const;

export const ROOM_4C_SCENARIO_2_CAMPAIGN_ID =
  "room-4c-s2-harbor-roast-coffee" as const;

export const HARBOR_ROAST_ASSET_IDS = {
  logo: "harbor-roast-logo",
  heroBox: "harbor-roast-hero-box",
} as const;

export const studioRoom4cScenario2HarborRoastV1 = {
  schemaVersion: 1 as const,
  packageId: ROOM_4C_SCENARIO_2_PACKAGE_ID,
  scenarioId: ROOM_4C_SCENARIO_2_ID,
  campaignId: ROOM_4C_SCENARIO_2_CAMPAIGN_ID,
  fictional: true as const,
  customer: {
    businessName: "Harbor Roast Coffee Co.",
  },
  offer: {
    name: "Autumn Single-Origin Box",
    description:
      "A limited autumn coffee box from Harbor Roast Coffee Co.",
    windowDisplay: "October 1 – October 31, 2026",
    windowStartIso: "2026-10-01",
    windowEndIso: "2026-10-31",
    priceDisplay: "$48",
    contentsDisplay: "Autumn Single-Origin Box",
  },
  tone: {
    voice: "Warm, grounded, no neon",
    noNeon: true,
    noBeforeAfterBody: true,
    calmWellness: false,
  },
  cta: {
    label: "Limited autumn box",
  },
  requestedDeliverables: [
    {
      id: "campaign-direction",
      launchNowService: "campaign-creative",
      output: "written direction bound to one brief",
    },
    {
      id: "social-square",
      launchNowService: "social-graphics",
      output: "square PNG 1080x1080",
    },
    {
      id: "social-vertical",
      launchNowService: "social-graphics",
      output: "vertical PNG 1080x1920",
    },
    {
      id: "short-vertical-video",
      launchNowService: "short-form-video",
      output: "vertical MP4 ~20-30s",
    },
    {
      id: "promo-email",
      launchNowService: "marketing-copy-email",
      output: "paste-ready email + captions",
    },
    {
      id: "print-counter-card",
      launchNowService: "print-collateral",
      output: "5x7 in; PNG 1500x2100 at 300 DPI; PDF 360x504 pt",
    },
  ],
  refusedIfAsked: [
    "carousel",
    "ad_account_ops",
    "unsupported_sizes_outside_studio_contracts",
  ],
  visualSystemId: "harbor-roast-coffee-v1" as const,
  facts: {
    headline: "Autumn Single-Origin Box",
    supportingCopy:
      "A limited autumn coffee box.",
    datesDisplay: "October 1 – October 31, 2026",
    priceDisplay: "$48",
    cta: "Limited autumn box",
    bookingContact: "",
    contentsDisplay: "Autumn Single-Origin Box",
  },
  printCounterCardContractId: "campaign-print-counter-card-v1-5x7" as const,
} as const;

export type StudioRoom4cScenario2HarborRoastBrief =
  typeof studioRoom4cScenario2HarborRoastV1;
