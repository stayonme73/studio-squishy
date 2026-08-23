/**
 * Map authoritative campaign/job truth → SocialPostsProjectTruth (customer mode).
 * Consumes INTAKE-TRUTH-1 structure mapper — Studio layout templates, not Harbor
 * customer-role menus. Square-only execution. Captions remain Studio-written later.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  assertSocialPostsStructureExecutableForDispatch,
  mapSocialPostsSetStructureFromIntakeAnswers,
} from "@/lib/studio-design-renderer";
import type { SocialPostsProjectTruth } from "@/lib/studio-design-renderer";
import {
  resolveCustomerBusinessName,
  resolveCustomerOfferHeadline,
  shortenCustomerFacingCta,
  stripCustomerFacingCta,
} from "@/lib/studio-design-renderer/customer-facing-creative-copy";

import {
  requireApprovedLogoFile,
  resolveApprovedLogoMaterial,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export type SocialPostsTruthMapResult =
  | { ok: true; truth: SocialPostsProjectTruth }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "INVALID_DESIGN_SPEC"
        | "MISSING_REQUIRED_TRUTH"
        | "INVALID_PLATE"
        | "INVALID_PLATFORM"
        | "UNSUPPORTED_PLATE_EXECUTION"
        | "SKU_NOT_SUPPORTED";
      message: string;
    };

const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?|(?:example|book|shop)\.[a-z0-9][-a-z0-9.]*/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;
const DATE_WINDOW_RE =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\s*[–—-]\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4}\s*[–—-]\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i;

const FIXTURE_CONTENT_RE =
  /CERTIFICATION FIXTURE|INTERNAL TEST|harborandoak\.example/i;

function firstMatch(re: RegExp, text: string): string {
  const m = text.match(re);
  return m?.[0]?.trim() ?? "";
}

function stringAnswers(
  answers: Record<string, unknown>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (v == null) out[k] = undefined;
    else out[k] = String(v);
  }
  return out;
}

function extractContactPriceDates(input: {
  postsAbout: string;
  callToAction: string;
  wordingHashtags: string;
}): {
  phone: string;
  webDisplay: string;
  webUrl: string;
  priceDisplay: string;
  dateWindow: string;
} {
  const combined = `${input.postsAbout}\n${input.callToAction}\n${input.wordingHashtags}`;
  const phone = firstMatch(PHONE_RE, combined);
  const webRaw = firstMatch(URL_RE, combined);
  const webDisplay = webRaw.replace(/^https?:\/\//i, "");
  const webUrl = webRaw
    ? webRaw.startsWith("http")
      ? webRaw
      : `https://${webRaw}`
    : "";
  const priceDisplay = firstMatch(PRICE_RE, combined).replace(/\s+/g, "");
  const dateWindow = firstMatch(DATE_WINDOW_RE, combined);
  return { phone, webDisplay, webUrl, priceDisplay, dateWindow };
}

/** Body used on brand-trust layout must not restate campaign price. */
function brandSafeBody(postsAbout: string): string {
  const cleaned = postsAbout
    .replace(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "")
    .replace(/\bwas\b/gi, "")
    .replace(/\s*[–—-]\s*/g, " — ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
  return (
    cleaned.slice(0, 220) ||
    "Plain, steady service for homeowners who want clear help."
  );
}

/**
 * Build customer SocialPostsProjectTruth from live intake + materials.
 * Structure (IDs / order / Studio layout templates / square plate) from
 * mapSocialPostsSetStructureFromIntakeAnswers — never invents Harbor customer roles.
 */
export function mapSocialPostsProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): SocialPostsTruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_SOCIAL_POSTS_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `Social-posts dispatch hook only supports ${DESIGN_RENDERER_SOCIAL_POSTS_SKU}`,
    };
  }

  const rawAnswers = input.campaign.routeMapIntake?.answers ?? {};
  const answers = stringAnswers(rawAnswers);

  const postsAbout = String(
    answers.postsAbout ?? answers.socialPostsPurposeChoice ?? "",
  ).trim();
  const callToAction = String(
    answers.callToAction ?? answers.socialPostsActionChoice ?? "",
  ).trim();
  const wordingHashtags = String(answers.wordingHashtags ?? "").trim();
  const mustNotSay = String(answers.mustNotSay ?? "").trim();

  const missing: string[] = [];
  if (!postsAbout) missing.push("postsAbout / socialPostsPurposeChoice");
  if (!callToAction) missing.push("callToAction / socialPostsActionChoice");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `Authoritative Route Map social-posts intake missing: ${missing.join(", ")}`,
    };
  }

  const contentScan = [postsAbout, callToAction, wordingHashtags, mustNotSay].join(
    " ",
  );
  if (FIXTURE_CONTENT_RE.test(contentScan)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer job truth must not contain certification fixture content",
    };
  }

  const structureMapped = mapSocialPostsSetStructureFromIntakeAnswers(answers);
  if (!structureMapped.ok) {
    return {
      ok: false,
      code: structureMapped.code,
      message: structureMapped.message,
    };
  }

  const executable = assertSocialPostsStructureExecutableForDispatch(
    structureMapped.structure,
  );
  if (!executable.ok) {
    return {
      ok: false,
      code: executable.code,
      message: executable.message,
    };
  }

  const extracted = extractContactPriceDates({
    postsAbout,
    callToAction,
    wordingHashtags,
  });
  if (!extracted.phone || !extracted.webDisplay) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "postsAbout and/or callToAction must provide phone and website/destination for contact fields",
    };
  }
  if (!extracted.priceDisplay) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Authoritative intake must provide a price token (e.g. $189) for current social layout library — do not invent",
    };
  }
  if (!extracted.dateWindow) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Authoritative intake must provide a date window for current social layout library — do not invent",
    };
  }

  const logo = requireApprovedLogoFile(
    resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  }),
  );
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const businessName = resolveCustomerBusinessName({
    campaignName: input.campaign.campaignName,
    mustInclude: String(answers.mustInclude ?? postsAbout),
    businessNameAnswer: String(answers.businessName ?? "").trim() || undefined,
  });
  const wordmark = businessName;
  const offerNameRaw = resolveCustomerOfferHeadline({
    postsAbout,
    mustInclude: String(answers.mustInclude ?? ""),
    fallback:
      postsAbout
        .replace(
          /^(Promote an offer|Share an update|Build awareness|Something else)\s*[—–-]\s*/i,
          "",
        )
        .split(/[.\n—–-]/)[0]
        ?.trim()
        .slice(0, 80) || postsAbout.slice(0, 80),
  });
  // Offer name/headline must not embed price — trust_brand paints headline and
  // set QA forbids campaign price on the brand-only post.
  const offerName =
    brandSafeBody(offerNameRaw)
      .replace(/\s*[—–.]\s*$/g, "")
      .trim()
      .slice(0, 80) || "Your offer";
  // Prefer offer language — never paint bare intake chips alone.
  const descriptor =
    String(answers.businessType ?? "").trim() || "Wellness studio";
  const strippedCta = shortenCustomerFacingCta(
    stripCustomerFacingCta(callToAction),
  );
  const cta = strippedCta.slice(0, 48);
  // Customer art: mustNotSay constraints stay out of PNG; no distribution footnotes.
  const disclaimer = "";
  const bodyRaw = brandSafeBody(postsAbout)
    .replace(
      /^(Promote an offer|Share an update|Build awareness|Something else)\s*[—–-]\s*/i,
      "",
    )
    .replace(/\s*[—–-]\s*/g, " — ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  const requiredTextTokens = [
    extracted.priceDisplay,
    wordmark.split(/\s+/)[0]!,
    ...extracted.dateWindow
      .split(/[–—,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 3),
  ].filter(Boolean);

  const truth: SocialPostsProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: "CUSTOMER JOB — authoritative intake",
    outputMode: "customer",
    businessName,
    wordmark,
    descriptor,
    headline: offerName.slice(0, 90) || "Service you can trust",
    offerName,
    priceDisplay: extracted.priceDisplay,
    dateWindow: extracted.dateWindow.slice(0, 120),
    body: bodyRaw.slice(0, 160),
    cta,
    phone: extracted.phone,
    webDisplay: extracted.webDisplay,
    webUrl: extracted.webUrl,
    disclaimer,
    platformLabel: structureMapped.structure.platformLabel,
    brandColors: {
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5A6570",
    },
    approvedLogoVariantId: logo.material.approvedIdentitySourceId!,
    materials: [
      {
        materialId: logo.material.materialId,
        role: "logo",
        relativePath: logo.material.relativePath,
        contentSha256: logo.material.contentSha256,
        approvedIdentitySourceId: logo.material.approvedIdentitySourceId,
      },
    ],
    requiredTextTokens,
    prohibitedClaimPatterns: [
      "CERTIFICATION FIXTURE",
      "Best in Richmond",
      "#1 rated",
      "Destination:",
      "Voice brief",
      "MISSING FACT",
      "You post and schedule",
      "offer_lead",
      "Post 1 of 4",
      ...(mustNotSay ? [mustNotSay.slice(0, 80)] : []),
    ],
    assets: structureMapped.structure.assets,
    dispatchWiringScopeNote:
      "STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1 — Machine path. " +
      "Layout templates assigned by Studio production (INTAKE-TRUTH-1); not customer role menus. " +
      "Square cert-square-1024 only; captions Studio-written; Owner routine NONE.",
  };

  return { ok: true, truth };
}
