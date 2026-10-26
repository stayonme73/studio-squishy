/**
 * Server authority for the current three condensed launch offers.
 * Prices and revision rounds come from owner-locked offer truth.
 * Historical catalog SKU rows are not read and not rewritten.
 */

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import { CUSTOM_STUDIO_PLAN_PACKAGE_ID } from "@/config/studio-board";
import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";
import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";
import { threePackageRevisionRule } from "@/config/studio-three-package-revision-truth-v1";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluateKnownMaterialRightsForAcceptance } from "@/lib/studio-pre-acceptance/evaluate-material-use";
import { evaluateMaterialRiskPolicy } from "@/lib/studio-pre-acceptance/evaluate-risk";
import { buildPreAcceptanceFactFingerprint } from "@/lib/studio-pre-acceptance/fingerprint";
import type {
  PreAcceptanceDecision,
  PreAcceptanceProjectFacts,
} from "@/lib/studio-pre-acceptance/types";
import { condensedServiceSku, PUBLIC_LAUNCH_PACKAGE_IDS } from "@/config/studio-customer-journey-condense-v1";
import {
  SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID,
  socialPromoCustomerDeliverableLabels,
} from "@/config/studio-social-promo-current-door-contract-v1";
import { clipDoorIntakeAnswers } from "@/lib/studio-dispatch/clip-door-facts";
import type { StudioExtraId } from "@/config/studio-extras-v1";
import { initialStudioExtrasTruth } from "@/lib/studio-extras/machine";
import { validateStudioExtrasSelection } from "@/lib/studio-extras/selection";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";

import { studioThankYouAmount } from "@/config/studio-thank-you-discount-v1";
import { CREATIVE_QA_DELIVERABLE_LABEL } from "@/lib/studio-creative-qa-finish/contract";

import type { CheckoutSessionCreateRequest } from "./types";

export const CONDENSED_OFFER_IDS = PUBLIC_LAUNCH_PACKAGE_IDS;

export type CondensedOfferId = (typeof CONDENSED_OFFER_IDS)[number];

export type ResolvedCondensedOffer = {
  packageId: CondensedOfferId;
  name: string;
  /** Original package list price. Not the amount charged. */
  priceCents: number;
  priceDisplay: string;
  listPriceCents: number;
  thankYouDiscountCents: number;
  /** Amount Stripe must collect. Server-derived. */
  chargeCents: number;
  revisionRounds: 3;
};

const SUPPORT_IDS = [
  "reputation_customer_proof",
  "ad_creative",
  "email_and_text",
  "menu_price_list",
  "ai_local_visibility",
] as const;

export type CondensedSupportChoice = "SELECT" | "SKIP" | "";

export function isCondensedOfferId(value: string | null | undefined): value is CondensedOfferId {
  return (CONDENSED_OFFER_IDS as readonly string[]).includes(String(value ?? ""));
}

/** Trusted price. Ignores any client-posted amount. */
export function resolveCondensedCheckoutOffer(
  packageId: string | null | undefined,
): ResolvedCondensedOffer | null {
  if (!isCondensedOfferId(packageId)) return null;
  const row = STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packages[packageId];
  const thankYou = studioThankYouAmount(row.priceCents);
  return {
    packageId,
    name: row.name,
    priceCents: row.priceCents,
    priceDisplay: row.priceDisplay,
    listPriceCents: thankYou.listPriceCents,
    thankYouDiscountCents: thankYou.discountCents,
    chargeCents: thankYou.amountDueCents,
    revisionRounds: row.revisionRounds,
  };
}

export function normalizeCondensedSupport(
  input: Readonly<Record<string, string>> | null | undefined,
): Record<string, CondensedSupportChoice> {
  const next: Record<string, CondensedSupportChoice> = {};
  for (const id of SUPPORT_IDS) {
    const raw = String(input?.[id] ?? "").trim().toUpperCase();
    next[id] = raw === "SELECT" || raw === "SKIP" ? raw : "";
  }
  return next;
}

function newDecisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pa-${crypto.randomUUID()}`;
  }
  return `pa-${Date.now().toString(36)}`;
}

/**
 * CLEAR for a known condensed offer.
 * Catalog launch-ledger and talking-head preflight are not consulted.
 * Existing risk and material-rights checks still apply to the posted text.
 */
export function assertCondensedOfferClear(facts: PreAcceptanceProjectFacts):
  | { allowed: true; decision: PreAcceptanceDecision }
  | { allowed: false; decision: PreAcceptanceDecision; message: string } {
  const copy = studioPreAcceptanceV1.customerCopy;
  const riskPolicy = evaluateMaterialRiskPolicy(facts.riskScanText ?? facts.projectNeed);
  const materialRights = evaluateKnownMaterialRightsForAcceptance(
    facts.materialRightsSignals ?? {},
  );
  const fingerprint = buildPreAcceptanceFactFingerprint(facts);
  let outcome: PreAcceptanceDecision["outcome"] =
    studioPreAcceptanceV1.outcomes.clearToAccept;
  let customerMessage: string | null = null;
  let escalationTarget: PreAcceptanceDecision["escalationTarget"] = "none";
  const blockingFacts: string[] = [];
  const reasons: string[] = [];

  if (riskPolicy.verdict === "decline" || materialRights.verdict === "decline") {
    outcome = studioPreAcceptanceV1.outcomes.decline;
    customerMessage = copy.declineLead;
    blockingFacts.push(...riskPolicy.reasons, ...materialRights.reasons);
    reasons.push(...blockingFacts);
  } else if (
    riskPolicy.verdict === "owner_policy_review" ||
    materialRights.verdict === "owner_policy_review"
  ) {
    outcome = studioPreAcceptanceV1.outcomes.ownerPolicyReview;
    customerMessage = copy.ownerPolicyLead;
    escalationTarget = "owner_policy";
    blockingFacts.push(...riskPolicy.reasons, ...materialRights.reasons);
    reasons.push(...blockingFacts);
  }

  const decision: PreAcceptanceDecision = {
    decisionId: newDecisionId(),
    schemaVersion: studioPreAcceptanceV1.decisionSchemaVersion,
    packageId: facts.selectedServiceIds[0] ?? "condensed_offer",
    draftRevision: facts.draftRevision,
    factFingerprint: fingerprint,
    selectedServiceIds: [...facts.selectedServiceIds],
    routeId: facts.routeId,
    capability: {
      verdict: "pass",
      perSku: [],
      weakestDisposition: null,
    },
    timing: {
      verdict: "NO_KNOWN_TIMING_CONFLICT",
      requestedDeadline: facts.requestedDeadline,
      deadlineStatus: facts.deadlineStatus,
      reason: "Condensed offer checkout does not use a catalog turnaround gate.",
      requiredMinBusinessDays: null,
      availableBusinessDays: null,
      evidenceSource: "none",
    },
    clarification: {
      verdict: "sufficient",
      gaps: [],
      customerPrompt: null,
    },
    riskPolicy: {
      verdict: riskPolicy.verdict,
      reasons: riskPolicy.reasons,
    },
    outcome,
    reasons,
    blockingFacts,
    nonBlockingFacts: [
      "Condensed launch offer. Catalog SKU ledger was not used for price or revisions.",
    ],
    paymentAllowed: outcome === studioPreAcceptanceV1.outcomes.clearToAccept,
    escalationTarget,
    customerMessage,
    voiceLine: null,
    evaluatedAt: new Date().toISOString(),
  };

  if (!decision.paymentAllowed) {
    return {
      allowed: false,
      decision,
      message:
        decision.outcome === studioPreAcceptanceV1.outcomes.ownerPolicyReview
          ? copy.ownerPolicyLead
          : copy.declineLead,
    };
  }
  return { allowed: true, decision };
}

export function condensedOfferFromRequest(
  request: CheckoutSessionCreateRequest,
): ResolvedCondensedOffer | null {
  return resolveCondensedCheckoutOffer(
    request.condensedOffer?.packageId ?? request.facts.selectedServiceIds[0],
  );
}

/** Validated Studio Extras on the request. Invalid selections are refused in create-session. */
export function condensedOfferExtras(
  packageId: CondensedOfferId,
  request: CheckoutSessionCreateRequest,
): readonly StudioExtraId[] {
  const result = validateStudioExtrasSelection(packageId, request.condensedOffer?.extras);
  return result.ok ? result.extras : [];
}

export function factsForCondensedOffer(
  facts: PreAcceptanceProjectFacts,
  offer: ResolvedCondensedOffer,
  request: CheckoutSessionCreateRequest,
): PreAcceptanceProjectFacts {
  const support = normalizeCondensedSupport(request.condensedOffer?.support);
  const extras = condensedOfferExtras(offer.packageId, request);
  const selected = [
    ...Object.entries(support)
      .filter(([, choice]) => choice === "SELECT")
      .map(([id]) => id),
    ...extras.map((id) => `extra:${id}`),
  ]
    .sort()
    .join(",");
  const projectNeed = (
    request.condensedOffer?.projectNeed ??
    facts.projectNeed ??
    offer.name
  ).trim();
  const materialsNote = (
    request.condensedOffer?.materialsNote ??
    facts.existingMaterialsNote ??
    ""
  ).trim();
  const businessName = (
    request.condensedOffer?.company ||
    request.condensedOffer?.customerName ||
    facts.businessName ||
    offer.name
  ).trim();
  return {
    ...facts,
    routeId: "condensed-journey",
    selectedServiceIds: [offer.packageId],
    projectNeed: projectNeed || offer.name,
    businessName,
    existingMaterialsNote: materialsNote,
    requestedDeadline: facts.requestedDeadline ?? "",
    deadlineStatus: facts.deadlineStatus || "not_requested",
    riskScanText: [projectNeed, materialsNote, selected].filter(Boolean).join("\n"),
  };
}

function condensedPlanDeliverables(packageId: string): readonly string[] {
  if (packageId === SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID) {
    return socialPromoCustomerDeliverableLabels();
  }
  if (packageId === "creative_qa_finish") return [CREATIVE_QA_DELIVERABLE_LABEL];
  return [];
}

export function buildCondensedCheckoutCampaign(args: {
  campaignId: string;
  existing: CampaignRecord | null;
  offer: ResolvedCondensedOffer;
  facts: PreAcceptanceProjectFacts;
  request: CheckoutSessionCreateRequest;
}): CampaignRecord {
  const now = new Date().toISOString();
  const support = normalizeCondensedSupport(args.request.condensedOffer?.support);
  const extras = condensedOfferExtras(args.offer.packageId, args.request);
  const doorAnswers = clipDoorIntakeAnswers(args.request.condensedOffer?.customerAnswers);
  const customerName = (args.request.condensedOffer?.customerName ?? "").trim();
  const customerEmail = (args.request.customerEmail ?? "").trim();
  const company = (args.request.condensedOffer?.company ?? args.facts.businessName).trim();
  const base = args.existing;
  const roadId: RouteMapRoadId = "random-exit";
  const campaign: CampaignRecord = {
    campaignId: args.campaignId,
    campaignName: company || customerName || args.offer.name,
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Awaiting payment confirmation.",
    estimatedCompletion: "After payment and Project Intake",
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: args.offer.name,
    revisionRoundsIncluded: args.offer.revisionRounds,
    revisionRoundsIncludedSource: "package_snapshot",
    revisionRoundsUsed: base?.revisionRoundsUsed ?? 0,
    deliverablesDelivered: base?.deliverablesDelivered ?? {},
    paymentReceivedAt: null,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    routeMapContext: {
      selectedServiceIds: [],
      jobId: args.offer.packageId as RouteMapJobId,
      roadId,
      selectedAt: base?.routeMapContext?.selectedAt ?? now,
      currentStep: "checkout",
    },
    condensedOffer: {
      packageId: args.offer.packageId,
      name: args.offer.name,
      priceCents: args.offer.listPriceCents,
      listPriceCents: args.offer.listPriceCents,
      thankYouDiscountCents: args.offer.thankYouDiscountCents,
      amountDueCents: args.offer.chargeCents,
      revisionRounds: args.offer.revisionRounds,
      customerName,
      customerEmail,
      company,
      projectNeed: args.facts.projectNeed,
      materialsNote: args.facts.existingMaterialsNote,
      support,
      ...(extras.length > 0 ? { extras } : {}),
    },
    ...(extras.length > 0
      ? { studioExtras: initialStudioExtrasTruth(args.offer.packageId, extras, now) }
      : {}),
    ...(Object.keys(doorAnswers).length > 0
      ? { routeMapIntakeDraft: { answers: doorAnswers, savedAt: now } }
      : {}),
    ...(base?.testPaymentIsolation
      ? { testPaymentIsolation: base.testPaymentIsolation }
      : {}),
    ...(base?.disposableKitStripeTestProof
      ? { disposableKitStripeTestProof: base.disposableKitStripeTestProof }
      : {}),
    approvedStudioPlan: {
      selectedServiceIds: [],
      includedServiceIds: [],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: args.offer.listPriceCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: args.offer.chargeCents,
      lineItems: [
        {
          skuId: (args.offer.packageId === SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID
            ? SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID
            : condensedServiceSku(args.offer.packageId)) as ServiceId,
          serviceName: args.offer.name,
          billingType: "one_time",
          exactPriceCents: args.offer.priceCents,
          priceDisplay: args.offer.priceDisplay,
          deliverables: condensedPlanDeliverables(args.offer.packageId),
          exclusions: [],
          timingWindowLabel: "Timing varies by package.",
          revisionRule: threePackageRevisionRule(args.offer.name),
          clientResponsibilities: [
            "Files are sent from My Studio after payment.",
          ],
          executionResponsibility: "The Studio",
        },
      ],
      approvedAt: base?.approvedStudioPlan?.approvedAt ?? now,
    },
  };
  return campaign;
}

export function condensedCheckoutUrls(origin: string, campaignId: string): {
  successUrl: string;
  cancelUrl: string;
} {
  const root = origin.replace(/\/$/, "");
  return {
    successUrl: `${root}/studio-conversation-room?stage=intake&payment=return&campaignId=${encodeURIComponent(campaignId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${root}/checkout?payment=cancel`,
  };
}

export function condensedAuthorization(
  decision: PreAcceptanceDecision,
) {
  return buildPreAcceptancePaymentAuthorization(decision);
}
