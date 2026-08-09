/**
 * KITCHEN-PRODUCTION-CERT-DESIGN-1 — synthetic visual certification fixtures.
 * CERTIFICATION FIXTURE / INTERNAL TEST — never live customer records.
 */

export const CERT_DESIGN_PACKAGE_ID = "KITCHEN-PRODUCTION-CERT-DESIGN-1" as const;

export const CERT_DESIGN_FIXTURE_LABEL =
  "CERTIFICATION FIXTURE / INTERNAL TEST — not a live customer" as const;

/** Active CONTRACT READY static visual SKUs tested in this package (no inference beyond these). */
export const CERT_DESIGN_TESTED_SKUS = [
  "v2-rtu-flyer",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
  "v2-rtu-social-posts",
  "v2-rtu-promotion-graphics",
  "v2-rtu-business-card",
  "ma-001",
] as const;

export type CertDesignTestedSku = (typeof CERT_DESIGN_TESTED_SKUS)[number];

/** Fixture A — professional service / trades (cool, restrained). */
export const designFixtureA = {
  id: "cert-design-1-fixture-a-harbor-oak",
  label: CERT_DESIGN_FIXTURE_LABEL,
  packageId: CERT_DESIGN_PACKAGE_ID,
  businessName: "Harbor & Oak Home Services",
  industry: "HVAC and plumbing",
  audience: "Homeowners 40–70 in Richmond metro who want plain, trustworthy service",
  objective: "Book Spring Tune-Up + Drain Clear Bundle appointments",
  offer: "Spring Tune-Up + Drain Clear Bundle — $189 (was $249)",
  offerWindow: "March 10 – April 15, 2026",
  cta: "Book online or call",
  ctaUrl: "https://harborandoak.example/book-tuneup",
  phone: "(804) 555-0142",
  brandPersonality: ["Plainspoken", "Steady", "Clean", "Not trendy", "No hype"],
  approvedColors: {
    primary: "#1F3A5F",
    secondary: "#C4A574",
    background: "#F7F4EF",
    text: "#1A1A1A",
  },
  logoNotes: "Wordmark preferred; simple oak leaf mark only if quiet",
  requiredContact: ["Harbor & Oak Home Services", "(804) 555-0142", "harborandoak.example"],
  requiredFacts: ["$189", "March 10", "April 15", "2026"],
  prohibitedClaims: [
    "Best in Richmond",
    "#1 rated",
    "Cut energy bills in half",
    "Same-day everywhere",
  ],
  visualDirection:
    "Restrained professional trades look — generous margins, strong headline hierarchy, no neon gradients, no stock handshake clichés.",
  dislikes: ["Corporate buzzword posters", "Crowded coupon chaos", "Tiny unreadable fine print as body copy"],
  finalUseContext: "Print handout + digital PDF/PNG for email attachment and front-desk display",
  whyDifferentFromB:
    "Cool professional service palette and anti-hype voice — must not look like a lifestyle food brand.",
} as const;

/** Fixture B — consumer food / lifestyle (warm, appetizing). */
export const designFixtureB = {
  id: "cert-design-1-fixture-b-salt-cedar",
  label: CERT_DESIGN_FIXTURE_LABEL,
  packageId: CERT_DESIGN_PACKAGE_ID,
  businessName: "Salt & Cedar Bakery",
  industry: "Neighborhood bakery / café",
  audience: "Neighbors and weekend visitors seeking fresh pastries and coffee",
  objective: "Promote Saturday Morning Bundle and weekend foot traffic",
  offer: "Saturday Morning Bundle — coffee + pastry $8 through April 30, 2026",
  offerWindow: "Saturdays through April 30, 2026",
  cta: "Visit us Saturday morning",
  ctaUrl: "https://saltandcedar.example/saturday",
  phone: "(804) 555-0198",
  address: "214 Maple Street, Richmond, VA",
  brandPersonality: ["Warm", "Handmade", "Inviting", "Neighborhood", "Appetizing"],
  approvedColors: {
    primary: "#6B3E2E",
    secondary: "#E8B86D",
    accent: "#F3E6D8",
    text: "#2B211C",
  },
  logoNotes: "Soft wordmark; cedar sprig optional; no industrial chrome",
  requiredContact: ["Salt & Cedar Bakery", "214 Maple Street", "(804) 555-0198"],
  requiredFacts: ["$8", "Saturday", "April 30", "2026"],
  prohibitedClaims: ["Michelin", "Healthiest bakery", "Sugar-free miracle", "Guaranteed weight loss"],
  visualDirection:
    "Warm bakery lifestyle — soft light, food-forward hierarchy, readable menu pricing, never cold corporate blue.",
  dislikes: ["Clip-art cupcakes", "Neon sale stickers covering food", "Tiny price text"],
  finalUseContext: "In-store menu print + social posts + counter flyer",
  whyDifferentFromA:
    "Warm consumer food personality — must not look like an HVAC trade flyer.",
} as const;

export const designCertFixtures = [designFixtureA, designFixtureB] as const;
