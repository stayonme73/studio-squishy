/**
 * Authoritative certification-fixture brand + campaign truth.
 * CERTIFICATION FIXTURE / INTERNAL TEST — not live customer records.
 *
 * Approved variation = layouts, crop, hierarchy emphasis within the same identity.
 * Unauthorized drift = different logo system, descriptor, or offer facts.
 */

import { designFixtureA, designFixtureB } from "./fixtures";

/** Harbor & Oak — lock derived from fixture A + Flyer V2 owner-approved direction. */
export const harborOakIdentityLock = {
  fixtureId: designFixtureA.id,
  businessName: "Harbor & Oak Home Services",
  requiredWordmark: "Harbor & Oak",
  approvedDescriptors: ["Home Services"] as const,
  /** Unauthorized if present as the business descriptor. */
  prohibitedDescriptors: ["Trades", "Harbor & Oak Trades"] as const,
  /**
   * Single approved mark for this cert fixture.
   * Anchor + quiet oak leaf in oval — matching Flyer V2 direction.
   * No lighthouse / house / standalone-anchor alternate systems.
   */
  approvedLogoVariantIds: ["harbor-oak-anchor-oak-oval-v1"] as const,
  approvedColors: designFixtureA.approvedColors,
  campaign: {
    offerName: "Spring Tune-Up + Drain Clear",
    offerNameRequiredTokens: ["Tune-Up", "Drain Clear"] as const,
    priceToken: "$189",
    dateTokens: ["March 10", "April 15", "2026"] as const,
    phone: designFixtureA.phone,
    urlTokens: ["harborandoak.example", "book-tuneup"] as const,
    /** Renames / invented urgency that mutate purchased offer without authority. */
    prohibitedOfferAliases: [
      "Spring Check",
      "SPRING CHECK",
      "Before Summer AC Rush",
      "AC Rush",
      "Saturday morning slots",
      "Saturday morning",
      "limited availability",
      "book early",
      "slots filling",
      "LIMITED AVAILABILITY",
      "BOOK EARLY",
    ] as const,
  },
  contactSemantics: [
    { value: "(804) 555-0142", expectedKind: "phone" as const },
    { value: "harborandoak.example", expectedKind: "web" as const },
  ],
} as const;

/** Salt & Cedar — bakery identity; coffee + one pastry bundle. */
export const saltCedarIdentityLock = {
  fixtureId: designFixtureB.id,
  businessName: "Salt & Cedar Bakery",
  requiredWordmark: "Salt & Cedar",
  approvedDescriptors: ["Bakery"] as const,
  prohibitedDescriptors: [
    "Bakery & Provisions",
    "Provisions",
    "Salt & Cedar Bakery & Provisions",
  ] as const,
  approvedLogoVariantIds: ["salt-cedar-wordmark-sprig-v1"] as const,
  approvedColors: designFixtureB.approvedColors,
  campaign: {
    offerName: "Saturday Morning Bundle",
    offerNameRequiredTokens: ["Saturday", "Bundle"] as const,
    priceToken: "$8",
    dateTokens: ["April 30", "2026"] as const,
    phone: designFixtureB.phone,
    urlTokens: ["saltandcedar.example", "saturday"] as const,
    /** Exact sellable inclusion set — coffee + one pastry, not a pastry flight. */
    bundleInclusionsExact: ["coffee", "pastry"] as const,
    prohibitedOfferAliases: [] as const,
  },
  contactSemantics: [
    { value: "(804) 555-0198", expectedKind: "phone" as const },
    { value: "214 Maple Street", expectedKind: "address" as const },
    { value: "saltandcedar.example", expectedKind: "web" as const },
  ],
  /** Imagery must read as bakery / food / café — not home goods. */
  imageryIndustry: "bakery" as const,
  prohibitedImageryThemes: ["candle", "soap", "knit blanket", "home goods"] as const,
} as const;
