import Stripe from "stripe";

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { buildServiceScopeSnapshot, computePlanPricingTotals } from "@/lib/plan-pricing";
import { isPaymentSandboxAvailable } from "@/lib/payment-sandbox";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import { isClearToAccept } from "@/lib/studio-pre-acceptance/payment-gate";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import { deriveCheckoutAmountCents, skuIdsKey } from "./amount";
import { applyCheckoutInitiatedToCampaignRecord } from "./apply-paid-record";
import {
  assertStripeSafeForTests,
  inspectStripeSecretKey,
} from "./env";
import { writeCheckoutSessionBinding } from "./events-store";
import type { CheckoutSessionCreateRequest, CheckoutSessionCreateResult } from "./types";

function ensureApprovedPlan(
  campaign: CampaignRecord,
  selectedServiceIds: readonly ServiceId[],
  roadId?: RouteMapRoadId,
): CampaignRecord {
  if (campaign.approvedStudioPlan) {
    const totals = computePlanPricingTotals(selectedServiceIds, roadId);
    if (campaign.approvedStudioPlan.amountDueTodayCents === totals.amountDueTodayCents) {
      return campaign;
    }
    return {
      ...campaign,
      approvedStudioPlan: {
        ...campaign.approvedStudioPlan,
        amountDueTodayCents: totals.amountDueTodayCents,
        oneTimeTotalCents: totals.oneTimeSubtotalCents,
        monthlyTotalCents: totals.monthlySubtotalCents,
      },
    };
  }
  const totals = computePlanPricingTotals(selectedServiceIds, roadId);
  const now = new Date().toISOString();
  return {
    ...campaign,
    approvedStudioPlan: {
      selectedServiceIds: [...selectedServiceIds],
      includedServiceIds: [...selectedServiceIds],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: totals.monthlySubtotalCents,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot(selectedServiceIds, roadId),
      approvedAt: now,
    },
  };
}

function resolveRoadId(facts: PreAcceptanceProjectFacts): RouteMapRoadId {
  const candidate = facts.routeId;
  const allowed: RouteMapRoadId[] = ["i75", "i20", "i285", "update", "random-exit"];
  if (candidate && (allowed as string[]).includes(candidate)) {
    return candidate as RouteMapRoadId;
  }
  return "random-exit";
}

function buildMinimalCampaign(
  campaignId: string,
  facts: PreAcceptanceProjectFacts,
  selectedServiceIds: readonly ServiceId[],
): CampaignRecord {
  const now = new Date().toISOString();
  const roadId = resolveRoadId(facts);
  const jobId = (selectedServiceIds[0] ?? "rm-j005") as RouteMapJobId;
  const base: CampaignRecord = {
    campaignId,
    campaignName: facts.businessName?.trim() || "Studio Project",
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Awaiting payment confirmation.",
    estimatedCompletion: "After payment and Project Intake",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    paymentReceivedAt: null,
    createdAt: now,
    updatedAt: now,
    routeMapContext: {
      selectedServiceIds: [...selectedServiceIds],
      jobId,
      roadId,
      selectedAt: now,
      currentStep: "checkout",
    },
  };
  return ensureApprovedPlan(base, selectedServiceIds, roadId);
}

/**
 * Server-side CLEAR gate — re-evaluates from posted facts.
 * Does not read browser sessionStorage decisions.
 */
function assertServerClear(facts: PreAcceptanceProjectFacts) {
  const decision = evaluatePreAcceptance(facts);
  if (!isClearToAccept(decision)) {
    return {
      allowed: false as const,
      decision,
      message:
        decision.customerMessage ?? studioPaymentV1.customerCopy.clearRequired,
    };
  }
  return { allowed: true as const, decision };
}

export async function createCheckoutSession(
  request: CheckoutSessionCreateRequest,
  options?: {
    stripe?: Pick<Stripe, "checkout">;
    env?: NodeJS.ProcessEnv;
  },
): Promise<CheckoutSessionCreateResult> {
  const env = options?.env ?? process.env;
  assertStripeSafeForTests(env);

  const facts = request.facts;
  if (!request.campaignId || !facts?.selectedServiceIds?.length) {
    return {
      ok: false,
      error: "invalid_request",
      message: "Checkout requires a campaign and selected services.",
    };
  }

  const gate = assertServerClear(facts);
  if (!gate.allowed) {
    return {
      ok: false,
      error: "clear_required",
      message: gate.message,
    };
  }

  const authorization = buildPreAcceptancePaymentAuthorization(gate.decision);
  if (!authorization) {
    return {
      ok: false,
      error: "clear_required",
      message: studioPaymentV1.customerCopy.clearRequired,
    };
  }

  const amount = deriveCheckoutAmountCents(facts.selectedServiceIds);
  if (!amount.ok) {
    return {
      ok: false,
      error: "amount_invalid",
      message: studioPaymentV1.customerCopy.amountInvalid,
    };
  }

  const existing = await readCampaignEnvelope(request.campaignId);
  if (existing?.record.paymentReceivedAt) {
    return {
      ok: false,
      error: "already_paid",
      message: "This project is already marked paid.",
    };
  }

  const roadId = resolveRoadId(facts);
  let campaign =
    existing?.record ??
    buildMinimalCampaign(request.campaignId, facts, amount.skuIds);
  if (campaign.campaignId !== request.campaignId) {
    return {
      ok: false,
      error: "campaign_mismatch",
      message: "Campaign identity mismatch.",
    };
  }

  campaign = ensureApprovedPlan(campaign, amount.skuIds, roadId);

  const meta = studioPaymentV1.metadataKeys;
  const origin = request.returnOrigin.replace(/\/$/, "");
  const successUrl = `${origin}/studio-conversation-room?stage=checkout&payment=return&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/studio-conversation-room?stage=checkout&payment=cancel`;

  /* Explicit local fixture — never mistaken for Stripe hosted Checkout. */
  if (request.preferSandbox) {
    if (!isPaymentSandboxAvailable()) {
      return {
        ok: false,
        error: "processor_not_configured",
        message: studioPaymentV1.customerCopy.processorNotConfigured,
      };
    }

    const checkoutSessionId = `cs_sandbox_${request.campaignId.slice(0, 8)}_${Date.now()}`;
    campaign = applyCheckoutInitiatedToCampaignRecord(campaign, {
      checkoutSessionId,
      expectedAmountCents: amount.amountCents,
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: authorization.evaluatedDraftRevision,
      sandbox: true,
    });
    await upsertCampaignRecord(campaign, existing?.clientUserId);
    await writeCheckoutSessionBinding({
      checkoutSessionId,
      campaignId: request.campaignId,
      expectedAmountCents: amount.amountCents,
      currency: "usd",
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: authorization.evaluatedDraftRevision,
      createdAt: new Date().toISOString(),
      sandbox: true,
    });

    return {
      ok: true,
      mode: "sandbox",
      checkoutSessionId,
      sandboxConfirmRequired: true,
      expectedAmountCents: amount.amountCents,
      currency: "usd",
      campaignId: request.campaignId,
    };
  }

  const keyStatus = inspectStripeSecretKey(env);
  if (keyStatus.status === "missing") {
    return {
      ok: false,
      error: "processor_not_configured",
      message: studioPaymentV1.customerCopy.processorNotConfigured,
    };
  }
  if (keyStatus.status === "invalid_format") {
    return {
      ok: false,
      error: "processor_credentials_invalid",
      message:
        process.env.NODE_ENV === "development"
          ? `${studioPaymentV1.customerCopy.processorCredentialsInvalid} ${keyStatus.hint}`
          : studioPaymentV1.customerCopy.processorCredentialsInvalid,
    };
  }

  const stripe =
    options?.stripe ??
    new Stripe(keyStatus.secret);

  const lineName =
    amount.skuIds.length === 1
      ? `Studio Plan · ${amount.skuIds[0]}`
      : `Studio Plan (${amount.skuIds.length} services)`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: request.customerEmail || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: studioPaymentV1.currency,
            unit_amount: amount.amountCents,
            product_data: {
              name: lineName,
              metadata: {
                [meta.skuIds]: skuIdsKey(amount.skuIds).slice(0, 450),
              },
            },
          },
        },
      ],
      metadata: {
        [meta.campaignId]: request.campaignId,
        [meta.decisionId]: authorization.decisionId,
        [meta.factFingerprint]: authorization.factFingerprint,
        [meta.amountCents]: String(amount.amountCents),
        [meta.currency]: studioPaymentV1.currency,
        [meta.skuIds]: skuIdsKey(amount.skuIds).slice(0, 450),
        [meta.draftRevision]: String(authorization.evaluatedDraftRevision),
      },
      payment_intent_data: {
        metadata: {
          [meta.campaignId]: request.campaignId,
          [meta.decisionId]: authorization.decisionId,
        },
      },
    });
  } catch (error) {
    const stripeMessage =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : null;
    return {
      ok: false,
      error: "processor_session_failed",
      message:
        process.env.NODE_ENV === "development" && stripeMessage
          ? `${studioPaymentV1.customerCopy.processorSessionFailed} (${stripeMessage})`
          : studioPaymentV1.customerCopy.processorSessionFailed,
    };
  }

  if (!session.id || !session.url) {
    return {
      ok: false,
      error: "processor_session_failed",
      message: "Stripe did not return a Checkout Session URL.",
    };
  }

  campaign = applyCheckoutInitiatedToCampaignRecord(campaign, {
    checkoutSessionId: session.id,
    expectedAmountCents: amount.amountCents,
    selectedServiceIds: amount.skuIds,
    decisionId: authorization.decisionId,
    factFingerprint: authorization.factFingerprint,
    draftRevision: authorization.evaluatedDraftRevision,
    sandbox: false,
  });
  await upsertCampaignRecord(campaign, existing?.clientUserId);
  await writeCheckoutSessionBinding({
    checkoutSessionId: session.id,
    campaignId: request.campaignId,
    expectedAmountCents: amount.amountCents,
    currency: "usd",
    selectedServiceIds: amount.skuIds,
    decisionId: authorization.decisionId,
    factFingerprint: authorization.factFingerprint,
    draftRevision: authorization.evaluatedDraftRevision,
    createdAt: new Date().toISOString(),
    sandbox: false,
  });

  return {
    ok: true,
    mode: "stripe",
    checkoutSessionId: session.id,
    url: session.url,
    expectedAmountCents: amount.amountCents,
    currency: "usd",
    campaignId: request.campaignId,
  };
}
