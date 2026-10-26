/**
 * Flyer production Intake contract — live form keys vs renderer requirements.
 * Does not invent customer copy. Does not mark a campaign review-ready.
 */

import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import type { CampaignRecord } from "@/config/studio-board";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer/types";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import {
  projectIntakeServiceFieldKey,
  readProjectIntakeAnswer,
} from "@/lib/project-intake-plan";

export const FLYER_PRODUCTION_INTAKE_FIELD_IDS = [
  "flyerPurpose",
  "mustInclude",
  "intendedUse",
] as const;

export type FlyerProductionIntakeFieldId =
  (typeof FLYER_PRODUCTION_INTAKE_FIELD_IDS)[number];

const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;

export const FLYER_MUST_INCLUDE_PRODUCTION_HINT =
  "Include the offer you want on the flyer: the offer price, a phone number, and a website or destination. Do not use The Studio’s service fee as the flyer price unless that is the offer you are promoting.";

/**
 * A flyer that asks the reader to act and gives them no way to act cannot convert.
 * The Studio does not invent a phone number, address, or URL to fill the gap — it
 * asks once, and accepts "informational, no contact" as a valid answer.
 */
export const FLYER_CONVERSION_ROUTE_HINT =
  "This flyer asks the reader to take action, but it does not include a way to reach you. Add a phone number, website, or destination — or tell us this piece is informational with no contact details.";

/** Action routes The Studio recognises in customer copy. Text only; nothing inferred. */
const CONVERSION_URL_RE =
  /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9][-a-z0-9]*\.(?:com|net|org|io|co|shop|studio|store|us|biz|info|ca|uk|example)\b(?:\/[^\s]*)?/i;
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const STREET_ADDRESS_RE =
  /\b\d{1,6}\s+[A-Za-z][\w'.-]*(?:\s+[A-Za-z][\w'.-]*)*\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|hwy|highway|pkwy|parkway|suite|ste|unit)\b/i;
const QR_RE = /\bqr\s?code\b/i;

/**
 * Customer said, in their own words, that this piece carries no contact route.
 * Only explicit statements count — silence is not consent to publish a dead end.
 */
const INFORMATIONAL_ONLY_RE =
  /\b(?:informational(?: only| piece)?|information only|for information only|no contact (?:details|info|information|needed|required)?|no phone or website|no phone number|without contact (?:details|info)|do not include contact|don'?t include contact|no call to action|no cta|internal (?:use|notice|announcement|memo|only)|staff only|save the date only|announcement only|notice only|hours (?:change|update) only)\b/i;

/**
 * A route the reader can actually act on.
 *
 * Asking for a QR code is not one. A QR code is a container: it needs a
 * destination to encode, and "put a QR code on it" supplies none. Counting the
 * phrase let a flyer through with nothing behind the square, so a QR request only
 * satisfies this when the customer also gave somewhere for it to point.
 */
export function textCarriesConversionRoute(text: string): boolean {
  const value = String(text ?? "");
  if (!value.trim()) return false;
  return (
    PHONE_RE.test(value) ||
    CONVERSION_URL_RE.test(value) ||
    EMAIL_RE.test(value) ||
    STREET_ADDRESS_RE.test(value)
  );
}

/** Customer asked for a QR code but gave nothing for it to point at. */
export function textRequestsQrWithoutDestination(text: string): boolean {
  const value = String(text ?? "");
  return QR_RE.test(value) && !textCarriesConversionRoute(value);
}

function flyerIntakeText(
  answers: RouteMapIntakeAnswers | null | undefined,
): { mustInclude: string; purpose: string; intendedUse: string } {
  return {
    mustInclude: String(
      readProjectIntakeAnswer(answers, "mustInclude", DESIGN_RENDERER_PROOF_SKU) ?? "",
    ),
    purpose: String(
      readProjectIntakeAnswer(answers, "flyerPurpose", DESIGN_RENDERER_PROOF_SKU) ?? "",
    ),
    intendedUse: String(
      readProjectIntakeAnswer(answers, "intendedUse", DESIGN_RENDERER_PROOF_SKU) ?? "",
    ),
  };
}

export function flyerIntakeHasConversionRoute(
  answers: RouteMapIntakeAnswers | null | undefined,
): boolean {
  const text = flyerIntakeText(answers);
  return (
    textCarriesConversionRoute(text.mustInclude) ||
    textCarriesConversionRoute(text.purpose)
  );
}

export function flyerIntakePermitsNoConversionRoute(
  answers: RouteMapIntakeAnswers | null | undefined,
): boolean {
  const text = flyerIntakeText(answers);
  return (
    INFORMATIONAL_ONLY_RE.test(text.purpose) ||
    INFORMATIONAL_ONLY_RE.test(text.mustInclude) ||
    INFORMATIONAL_ONLY_RE.test(text.intendedUse)
  );
}

/**
 * Promotional flyer with no way for the reader to act, and no customer statement
 * that it is informational. Production must ask before it spends.
 */
export function missingFlyerConversionRoute(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaignIncludesFlyerSku(campaign)) return false;
  const answers = campaign?.routeMapIntake?.answers;
  if (missingFlyerProductionIntakeFieldIds(answers).length > 0) return false;
  if (flyerIntakePermitsNoConversionRoute(answers)) return false;
  return !flyerIntakeHasConversionRoute(answers);
}

export function flyerIntakeAnswerKey(
  fieldId: FlyerProductionIntakeFieldId,
): string {
  return projectIntakeServiceFieldKey(DESIGN_RENDERER_PROOF_SKU, fieldId);
}

export const FLYER_PRODUCTION_INTAKE_ANSWER_KEYS = FLYER_PRODUCTION_INTAKE_FIELD_IDS.map(
  flyerIntakeAnswerKey,
) as readonly string[];

/**
 * Flyer production facts apply only to the flyer correction.
 * Another service's own questions must not turn this on.
 */
export function visibleKeysUseFlyerCorrection(
  keys: readonly string[] | null | undefined,
): boolean {
  return Boolean(keys?.some((key) => key.endsWith(":mustInclude")));
}

export function campaignIncludesFlyerSku(
  campaign: CampaignRecord | null | undefined,
): boolean {
  const ids = campaign?.approvedStudioPlan?.selectedServiceIds ?? [];
  return ids.includes(DESIGN_RENDERER_PROOF_SKU);
}

export function flyerMustIncludeHasProductionFacts(text: string): boolean {
  const mustInclude = text.trim();
  if (!mustInclude) return false;
  return (
    PHONE_RE.test(mustInclude) &&
    URL_RE.test(mustInclude) &&
    PRICE_RE.test(mustInclude)
  );
}

export function pickFlyerProductionIntakeAnswers(
  answers: RouteMapIntakeAnswers | null | undefined,
): RouteMapIntakeAnswers {
  const next: RouteMapIntakeAnswers = {};
  if (!answers) return next;
  for (const key of FLYER_PRODUCTION_INTAKE_ANSWER_KEYS) {
    const value = String(answers[key] ?? "").trim();
    if (value) next[key] = value;
  }
  return next;
}

export function missingFlyerProductionIntakeFieldIds(
  answers: RouteMapIntakeAnswers | null | undefined,
): FlyerProductionIntakeFieldId[] {
  const missing: FlyerProductionIntakeFieldId[] = [];
  for (const fieldId of FLYER_PRODUCTION_INTAKE_FIELD_IDS) {
    const value = readProjectIntakeAnswer(
      answers,
      fieldId,
      DESIGN_RENDERER_PROOF_SKU,
    );
    if (!value) {
      missing.push(fieldId);
    }
  }
  return missing;
}

export function isFlyerProductionIntakeReady(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaignIncludesFlyerSku(campaign)) return true;
  return missingFlyerProductionIntakeFieldIds(campaign?.routeMapIntake?.answers).length === 0;
}

/**
 * Submitted flyer Intake that still cannot satisfy the renderer.
 * Board may still treat Intake as submitted; production must not invent
 * missing flyerPurpose / mustInclude / intendedUse answers.
 */
export function needsFlyerProductionIntakeCorrection(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaign?.paymentReceivedAt) return false;
  if (!campaignIncludesFlyerSku(campaign)) return false;
  if (!isIntakeComplete(campaign)) return false;
  if (!isFlyerProductionIntakeReady(campaign)) return true;
  // Ask once for an action route rather than printing a flyer nobody can respond
  // to. Never satisfied by inventing a phone number, address, or URL.
  if (missingFlyerConversionRoute(campaign)) return true;
  const flyerResult = campaign.dispatchExecution?.designRendererObserver?.results?.find(
    (result) => result.skuId === DESIGN_RENDERER_PROOF_SKU,
  );
  return Boolean(
    flyerResult &&
      flyerResult.ok === false &&
      flyerResult.failureCode === "INVALID_DESIGN_SPEC",
  );
}

/**
 * Dispatch identity already exists, but the last flyer observer pass could
 * not render because production Intake fields were missing. Re-run only then.
 * Does not retry unrelated material/QA failures.
 */
export function needsFlyerProductionObserverRetry(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaignIncludesFlyerSku(campaign)) return false;
  if (
    campaign?.productionFreeze?.status === "FROZEN" &&
    campaign.productionFreeze.doNotRemint &&
    campaign.productionFreeze.skuIds.includes(DESIGN_RENDERER_PROOF_SKU)
  ) {
    return false;
  }
  if (!isFlyerProductionIntakeReady(campaign)) return false;
  const flyerResult = campaign?.dispatchExecution?.designRendererObserver?.results?.find(
    (result) => result.skuId === DESIGN_RENDERER_PROOF_SKU,
  );
  if (missingFlyerConversionRoute(campaign)) return false;
  if (!flyerResult) return true;
  if (
    flyerResult.skipReason === "flyer_intake_production_fields_missing" ||
    flyerResult.skipReason === "flyer_conversion_route_missing"
  ) {
    return true;
  }
  if (flyerResult.ok) return false;
  return flyerResult.failureCode === "INVALID_DESIGN_SPEC";
}

/**
 * Merge the three flyer production fields onto an already-submitted Intake.
 * Preserves original submittedAt, materials, payment, and every other answer.
 */
export function applyFlyerProductionIntakeCorrectionToRecord(
  campaign: CampaignRecord,
  incoming: RouteMapIntakeAnswers,
  correctedAt = new Date().toISOString(),
): CampaignRecord | null {
  if (!needsFlyerProductionIntakeCorrection(campaign)) return null;
  const submittedAt = campaign.routeMapIntakeSubmittedAt;
  if (!submittedAt) return null;

  const mergedAnswers = mergeFlyerProductionIntakeAnswers(
    campaign.routeMapIntake?.answers,
    incoming,
  );
  if (missingFlyerProductionIntakeFieldIds(mergedAnswers).length > 0) {
    return null;
  }
  // The correction stays open until there is either an action route or the
  // customer's own word that this piece is informational.
  if (
    !flyerIntakeHasConversionRoute(mergedAnswers) &&
    !flyerIntakePermitsNoConversionRoute(mergedAnswers)
  ) {
    return null;
  }

  return {
    ...campaign,
    routeMapIntake: {
      answers: mergedAnswers,
      submittedAt,
    },
    routeMapIntakeDraft: undefined,
    routeMapIntakeSubmittedAt: submittedAt,
    routeMapContext: campaign.routeMapContext
      ? { ...campaign.routeMapContext, currentStep: "intake" }
      : campaign.routeMapContext,
    updatedAt: correctedAt,
    studioNotes: [
      ...(campaign.studioNotes ?? []),
      { date: "Today", message: "Flyer production details received." },
    ],
  };
}

export function mergeFlyerProductionIntakeAnswers(
  existing: RouteMapIntakeAnswers | null | undefined,
  incoming: RouteMapIntakeAnswers,
): RouteMapIntakeAnswers {
  const allowed = pickFlyerProductionIntakeAnswers(incoming);
  return { ...(existing ?? {}), ...allowed };
}
