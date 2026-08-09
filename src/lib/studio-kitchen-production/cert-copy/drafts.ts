import { CERT_COPY_FIXTURE_LABEL, certCopyCustomerBrief as brief } from "./fixture";

/**
 * Certification drafts — actual production artifacts for quality inspection.
 * First email-campaign draft intentionally fails substantive QA.
 */

export type CertEmailPiece = {
  subjectOptions: readonly string[];
  previewText: string;
  body: string;
  cta: string;
  layoutDirection: string;
};

export type CertSmsPiece = {
  id: string;
  body: string;
  purpose: string;
};

export type CertCopyAsset = {
  id: string;
  label: string;
  body: string;
};

/** FIRST PASS — substantive failures for em-001 QA proof. */
export const emailCampaignFirstDraft = {
  skuId: "em-001" as const,
  pass: 1,
  label: CERT_COPY_FIXTURE_LABEL,
  campaignGoal: brief.offerName,
  sendingOrder:
    "Send Email 1 Monday morning; Email 2 Thursday morning; Email 3 the following Monday (INVALID — exceeds two-email scope).",
  emails: [
    {
      subjectOptions: [
        "Unlock next-level home comfort synergy this spring",
        "Revolutionize your HVAC journey today",
      ],
      previewText: "Discover transformative savings for your lifestyle.",
      body: `Hi there,

At Harbor & Oak, we're passionate about unlocking next-level home comfort synergy for modern homeowners.

Our Spring Tune-Up + Drain Clear Bundle is designed to revolutionize your HVAC journey and help cut your energy bills in half this season. Don't miss this exclusive opportunity to elevate your living experience.

Lean into wellness-grade airflow and seamless drain performance with our expert-led ecosystem of care.`,
      cta: "Learn more when you're ready",
      layoutDirection: "Hero banner, three feature icons, soft footer — no phone number required.",
    },
    {
      subjectOptions: ["A quick reminder about comfort"],
      previewText: "Still thinking it over?",
      body: `Just a friendly note that our spring bundle is still available.

Many families are already transforming their homes. We use proprietary comfort methodologies to deliver unmatched results across the metro.

Reply if curious.`,
      // Substantive defect: no booking URL/phone CTA path.
      cta: "",
      layoutDirection: "Short reminder block only.",
    },
    {
      subjectOptions: ["Last chance for half-off energy bills"],
      previewText: "Guaranteed savings await.",
      body: `Final call — cut your energy bills in half with Harbor & Oak. Same-day service everywhere in Richmond.`,
      cta: "Act now",
      layoutDirection: "Urgency banner.",
    },
  ] satisfies readonly CertEmailPiece[],
  knownDefects: [
    "Exceeds purchased scope: three emails (limit is two)",
    "Unsupported claim: cut energy bills in half",
    "Unsupported claim: same-day service everywhere",
    "Corporate / AI-sounding tone violates plainspoken brand voice",
    "Email 2 missing booking URL or phone CTA",
    "Missing required offer price $189 and offer window dates",
  ],
} as const;

/** CORRECTED — em-001 final under contract. */
export const emailCampaignCorrectedDraft = {
  skuId: "em-001" as const,
  pass: 2,
  label: CERT_COPY_FIXTURE_LABEL,
  campaignGoal: `Book ${brief.offerName} appointments during ${brief.offerWindow}`,
  sendingOrder:
    "Email 1: Tuesday 10:00 a.m. local (offer open). Email 2: the following Tuesday 10:00 a.m. (reminder with same facts).",
  emails: [
    {
      subjectOptions: [
        "Spring tune-up + drain clear — $189 through April 15",
        "Book your Harbor & Oak spring check before summer rush",
      ],
      previewText: "HVAC tune-up + one sink drain clear. Book online or call.",
      body: `Hi {{first_name}},

Spring is when small HVAC issues turn into expensive summer calls.

Harbor & Oak is offering our Spring Tune-Up + Drain Clear Bundle for $189 (normally $249) from March 10 through April 15, 2026. It includes a seasonal HVAC tune-up and one standard sink drain clear.

We've served Chesterfield, Henrico, and Richmond homeowners since 2009. Saturday morning slots are available during the offer window.

This does not include parts, major repairs, or whole-home drain work — just the tune-up and one sink drain clear as described.

Book here: ${brief.ctaUrl}
Or call ${brief.phone}.`,
      cta: `Book your Spring Tune-Up — ${brief.ctaUrl} or ${brief.phone}`,
      layoutDirection:
        "Simple header with business name, short body, single primary button to booking URL, phone in footer. No stock 'synergy' graphics.",
    },
    {
      subjectOptions: [
        "Reminder: $189 spring tune-up ends April 15",
        "Still need your spring HVAC check?",
      ],
      previewText: "Same bundle. Same price. Easy booking.",
      body: `Hi {{first_name}},

Quick reminder — the Harbor & Oak Spring Tune-Up + Drain Clear Bundle is still $189 through April 15, 2026.

If you want the seasonal HVAC check and one sink drain clear on the books before peak AC season, we can help. Two-tech teams. Saturday mornings available.

Book: ${brief.ctaUrl}
Call: ${brief.phone}

— Harbor & Oak Home Services`,
      cta: `Book online — ${brief.ctaUrl}`,
      layoutDirection: "Reminder layout: short body, one CTA button, phone line under it.",
    },
  ] satisfies readonly CertEmailPiece[],
} as const;

/** Marketing Copy — cc-001 final (≤3 assets, ≤750 words). */
export const marketingCopyFinalDraft = {
  skuId: "cc-001" as const,
  pass: 1,
  label: CERT_COPY_FIXTURE_LABEL,
  assets: [
    {
      id: "cc-homepage-banner",
      label: "Homepage banner",
      body: `Spring Tune-Up + Drain Clear — $189 through April 15

Seasonal HVAC check + one sink drain clear. Book online or call ${brief.phone}.
${brief.ctaUrl}`,
    },
    {
      id: "cc-facebook-post",
      label: "Facebook post",
      body: `Homeowners: before summer AC season hits, grab our Spring Tune-Up + Drain Clear Bundle for $189 (was $249). Offer runs March 10–April 15, 2026.

Includes a seasonal HVAC tune-up and one standard sink drain clear. Serving Chesterfield, Henrico, and Richmond since 2009.

Book: ${brief.ctaUrl}
Call: ${brief.phone}`,
    },
    {
      id: "cc-google-business",
      label: "Google Business profile update",
      body: `Now booking: Spring Tune-Up + Drain Clear Bundle — $189 (March 10–April 15, 2026). HVAC tune-up + one sink drain clear. Book at ${brief.ctaUrl} or call ${brief.phone}.`,
    },
  ] satisfies readonly CertCopyAsset[],
} as const;

/** Email Kit — v2-rtu-email-kit (≤2 emails, paste-ready). */
export const emailKitFinalDraft = {
  skuId: "v2-rtu-email-kit" as const,
  pass: 1,
  label: CERT_COPY_FIXTURE_LABEL,
  campaignGoal: brief.offerName,
  pasteReadyNote:
    "Plain-text + simple HTML-ready blocks for the client to paste into their own email platform. Studio does not send.",
  emails: emailCampaignCorrectedDraft.emails,
  sendingOrder: emailCampaignCorrectedDraft.sendingOrder,
} as const;

/** SMS Kit — v2-rtu-sms-kit (≤4 messages). */
export const smsKitFinalDraft = {
  skuId: "v2-rtu-sms-kit" as const,
  pass: 1,
  label: CERT_COPY_FIXTURE_LABEL,
  campaignGoal: brief.offerName,
  sequenceNote:
    "Suggested order: Day 0 announce → Day 3 reminder → Day 10 mid-window → Day 28 last week. Client sends from their SMS platform.",
  messages: [
    {
      id: "sms-1",
      purpose: "Announce",
      body: `Harbor & Oak: Spring Tune-Up + Drain Clear is $189 (was $249) Mar 10–Apr 15. Book ${brief.ctaUrl} or call ${brief.phone}`,
    },
    {
      id: "sms-2",
      purpose: "Reminder",
      body: `Reminder — $189 HVAC tune-up + sink drain clear through Apr 15. Book: ${brief.ctaUrl} · ${brief.phone}`,
    },
    {
      id: "sms-3",
      purpose: "Mid-window",
      body: `Saturday morning slots open for Harbor & Oak spring checks. $189 bundle. ${brief.ctaUrl}`,
    },
    {
      id: "sms-4",
      purpose: "Last week",
      body: `Last week for the $189 Spring Tune-Up + Drain Clear (ends Apr 15). Book ${brief.ctaUrl} or ${brief.phone}`,
    },
  ] satisfies readonly CertSmsPiece[],
} as const;

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function marketingCopyTotalWords(): number {
  return marketingCopyFinalDraft.assets.reduce(
    (sum, asset) => sum + countWords(asset.body),
    0,
  );
}
