/**
 * Room 4C Scenario 1 — Cedar Lane Home Organizing
 * Authoritative campaign facts. Deliverables must bind to this record's hash.
 */

export const ROOM_4C_SCENARIO_1_PACKAGE_ID =
  "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1" as const;

export const ROOM_4C_SCENARIO_1_ID =
  "scenario-1-local-business-promotion" as const;

export const ROOM_4C_SCENARIO_1_CAMPAIGN_ID =
  "room-4c-s1-cedar-lane-home-organizing" as const;

export const CEDAR_LANE_ASSET_IDS = {
  logo: "cedar-lane-logo",
  heroCloset: "cedar-lane-hero-closet",
  supportEntry: "cedar-lane-support-entry",
} as const;

export const studioRoom4cScenario1CedarLaneV1 = {
  schemaVersion: 1 as const,
  packageId: ROOM_4C_SCENARIO_1_PACKAGE_ID,
  scenarioId: ROOM_4C_SCENARIO_1_ID,
  campaignId: ROOM_4C_SCENARIO_1_CAMPAIGN_ID,
  fictional: true as const,
  customer: {
    businessName: "Cedar Lane Home Organizing",
    location: "Richmond, VA",
  },
  offer: {
    name: "Fall Closet Reset",
    description:
      "A calm, practical closet reset for Richmond homes. Keep what you use. Let the rest go.",
    windowDisplay: "September 15 – October 15, 2026",
    windowStartIso: "2026-09-15",
    windowEndIso: "2026-10-15",
    /** No price was supplied. Do not invent one. */
    priceDisplay: "",
  },
  tone: {
    voice: "Calm, practical, no neon",
    noNeon: true,
    noBeforeAfterBody: true,
    calmWellness: false,
  },
  cta: {
    label: "Book a consult",
    phoneDisplay: "(804) 555-0172",
    phoneSpoken:
      "eight zero four, five five five, zero one seven two",
    bookingUrl: "cedarlaneorganizing.example/fall-reset",
    bookingUrlSpoken: "cedar lane organizing dot example slash fall reset",
  },
  requestedDeliverables: [
    {
      id: "social-square",
      launchNowService: "social-graphics",
      output: "square PNG 1080x1080",
    },
    {
      id: "short-vertical-video",
      launchNowService: "short-form-video",
      output: "vertical MP4 ~20-30s",
    },
    {
      id: "promo-caption",
      launchNowService: "marketing-copy-email",
      output: "paste-ready caption",
    },
    {
      id: "print-handout",
      launchNowService: "print-collateral",
      output: "US Letter 8.5x11 in; PNG 2550x3300 at 300 DPI; PDF 612x792 pt",
    },
  ],
  refusedIfAsked: [
    "carousel",
    "ad_account_ops",
    "unsupported_sizes_outside_studio_contracts",
  ],
  visualSystemId: "cedar-lane-home-organizing-v1" as const,
  facts: {
    headline: "Fall Closet Reset",
    supportingCopy:
      "A calm, practical closet reset for Richmond homes. Keep what you use. Let the rest go.",
    datesDisplay: "September 15 – October 15, 2026",
    priceDisplay: "",
    cta: "Book a consult",
    bookingContact:
      "(804) 555-0172 · cedarlaneorganizing.example/fall-reset",
  },
} as const;

export type StudioRoom4cScenario1CedarLaneBrief =
  typeof studioRoom4cScenario1CedarLaneV1;
