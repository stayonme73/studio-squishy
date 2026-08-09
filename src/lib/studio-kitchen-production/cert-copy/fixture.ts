/**
 * KITCHEN-PRODUCTION-CERT-COPY-1 — synthetic certification fixture.
 *
 * CERTIFICATION FIXTURE / INTERNAL TEST — never a real customer record.
 */

export const CERT_COPY_PACKAGE_ID = "KITCHEN-PRODUCTION-CERT-COPY-1" as const;

export const CERT_COPY_SKUS = [
  "em-001",
  "cc-001",
  "v2-rtu-email-kit",
  "v2-rtu-sms-kit",
] as const;

export const CERT_COPY_FIXTURE_LABEL =
  "CERTIFICATION FIXTURE / INTERNAL TEST — not a live customer" as const;

export const CERT_COPY_CAMPAIGN_ID = "cert-copy-1-harbor-oak" as const;

/**
 * Challenging brief: plainspoken local trade voice + hard factual constraints.
 * Generic AI corporate copy and unsupported savings claims should fail QA.
 */
export const certCopyCustomerBrief = {
  label: CERT_COPY_FIXTURE_LABEL,
  packageId: CERT_COPY_PACKAGE_ID,
  campaignId: CERT_COPY_CAMPAIGN_ID,
  businessName: "Harbor & Oak Home Services",
  businessType: "Family-owned HVAC and plumbing service company",
  market: "Richmond, VA metro (Chesterfield, Henrico, City of Richmond)",
  yearsInBusiness: 2009,
  targetAudience:
    "Homeowners roughly 40–70 who want plain answers, hate surprise repair bills, and prefer booking without sales pressure",
  offerName: "Spring Tune-Up + Drain Clear Bundle",
  offerPrice: "$189",
  offerCompareAt: "$249",
  offerWindow: "March 10 – April 15, 2026",
  offerIncludes: [
    "Seasonal HVAC tune-up (filter check, thermostat check, basic safety inspection)",
    "One standard sink drain clear",
  ],
  objective:
    "Book tune-up appointments for March–April before peak summer AC calls",
  brandVoice: [
    "Plainspoken",
    "Neighborly",
    "Specific",
    "No corporate buzzwords",
    "No hype",
    "Never talk down to the customer",
  ],
  customerFacts: [
    "Licensed HVAC and plumbing company serving the Richmond metro since 2009",
    "Two-tech teams; Saturday morning slots available during the offer window",
    "Customers book online or by phone — no hard-sell call script",
    "Bundle does not include parts replacement, major repairs, or whole-home drain work",
  ],
  ctaPrimary: "Book your Spring Tune-Up online",
  ctaUrl: "https://harborandoak.example/book-tuneup",
  phone: "(804) 555-0142",
  constraints: [
    "One campaign goal only: promote the Spring Tune-Up + Drain Clear Bundle",
    "Stay inside each SKU asset/count/word limit",
    "Client sends email/SMS from their own accounts — Studio delivers paste-ready copy only",
  ],
  prohibitedClaims: [
    "Best in Richmond / #1 rated / guaranteed reviews",
    "Cut energy bills in half / guaranteed savings",
    "Same-day service everywhere in the metro",
    "Free forever / lifetime warranties not provided by the customer",
    "Invented license numbers, awards, or customer counts",
  ],
  requiredLanguage: [
    "Offer price $189 (was $249)",
    "Offer window March 10 – April 15, 2026",
    "Include booking URL or phone in every CTA path",
  ],
  whyChallenging:
    "Voice is anti-corporate and facts are tight. Generic AI copy, vague CTAs, or unsupported savings claims should fail substantive QA — not pass on polish alone.",
} as const;

export type CertCopyCustomerBrief = typeof certCopyCustomerBrief;
