import Stripe from "stripe";

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";
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

import { getServiceById } from "@/catalog/accessors";

import { deriveCheckoutAmountCents, skuIdsKey } from "./amount";
import {
  assertDisposableKitTestCheckout,
  bindDisposableKitTestCheckoutSession,
} from "./disposable-kit-test-isolation";
import { applyCheckoutInitiatedToCampaignRecord } from "./apply-paid-record";
import {
  assertStripeSafeForTests,
  inspectStripeSecretKey,
} from "./env";
import { writeCheckoutSessionBinding } from "./events-store";
import { derivePaidCycleCheckoutAmountCents } from "./paid-cycle-amount";
import {
  mintPaidCyclePurchaseId,
  upsertPaidCyclePurchase,
} from "./paid-cycle-ledger";
import type { PaidCyclePurchaseRecord } from "./paid-cycle-types";
import type {
  CheckoutPurchaseKind,
  CheckoutSessionCreateRequest,
  CheckoutSessionCreateResult,
} from "./types";
import { evaluateMa001CompositionPaymentGate } from "@/lib/studio-design-renderer/ma-001-composition-payment-gate";
import type { Ma001CompositionPaymentSeal } from "@/lib/studio-design-renderer/ma-001-composition-payment-gate";
import { evaluateRmJ002KitPaymentGate } from "@/lib/studio-design-renderer/rm-j002-kit-payment-gate";
import type { RmJ002KitPaymentSeal } from "@/lib/studio-design-renderer/rm-j002-kit-payment-gate";
import { evaluateRmJ008KitPaymentGate } from "@/lib/studio-design-renderer/rm-j008-kit-payment-gate";
import type { RmJ008KitPaymentSeal } from "@/lib/studio-design-renderer/rm-j008-kit-payment-gate";
import { evaluateBf001PackagePaymentGate } from "@/lib/studio-design-renderer/bf-001-kit-payment-gate";
import type { Bf001PackagePaymentSeal } from "@/lib/studio-design-renderer/bf-001-kit-payment-gate";
import { evaluateRmJ007UpdatePaymentGate } from "@/lib/studio-design-renderer/rm-j007-kit-payment-gate";
import type { RmJ007UpdatePaymentSeal } from "@/lib/studio-design-renderer/rm-j007-kit-payment-gate";
import { evaluateSourceAudioCheckoutGate } from "@/lib/studio-source-audio-preflight";
import {
  assertCondensedOfferClear,
  buildCondensedCheckoutCampaign,
  condensedCheckoutUrls,
  condensedOfferFromRequest,
  factsForCondensedOffer,
  type CondensedOfferId,
} from "./condensed-offer";
import { validateStudioExtrasSelection } from "@/lib/studio-extras/selection";
import { loadStudioLaneViews, type ProductionLaneView } from "@/lib/job-control";
import { evaluateHeavyStopSale } from "@/lib/studio-capacity-100-order-hardening/stop-sale";

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
    campaignName:
      facts.businessName?.trim() ||
      getServiceById(selectedServiceIds[0])?.name?.trim() ||
      "Studio Project",
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

type ResolvedCheckoutAmount =
  | {
      amountCents: number;
      skuIds: ServiceId[];
      purchaseKind: "studio_plan";
    }
  | {
      amountCents: number;
      skuIds: ServiceId[];
      purchaseKind: "paid_cycle";
      paidCyclePurchaseId: string;
      cyclePriceCents: number;
      cycleSkuId: typeof studioPaidCyclePaymentV1.skuId;
    }
  | {
      amountCents: number;
      skuIds: readonly CondensedOfferId[];
      purchaseKind: "condensed_offer";
    };

function resolveCheckoutAmount(
  purchaseKind: CheckoutPurchaseKind,
  selectedServiceIds: readonly string[],
):
  | { ok: true; value: ResolvedCheckoutAmount }
  | { ok: false; error: "amount_invalid" | "paid_cycle_invalid"; message: string } {
  if (purchaseKind === "paid_cycle") {
    const amount = derivePaidCycleCheckoutAmountCents(selectedServiceIds);
    if (!amount.ok) {
      return {
        ok: false,
        error: "paid_cycle_invalid",
        message:
          amount.reason === "missing_cycle_sku" || amount.reason === "wrong_cycle_sku"
            ? "Paid-cycle checkout requires sm-001-monthly."
            : studioPaymentV1.customerCopy.amountInvalid,
      };
    }
    return {
      ok: true,
      value: {
        amountCents: amount.amountCents,
        skuIds: amount.skuIds,
        purchaseKind: "paid_cycle",
        paidCyclePurchaseId: mintPaidCyclePurchaseId(),
        cyclePriceCents: amount.cyclePriceCents,
        cycleSkuId: amount.cycleSkuId,
      },
    };
  }

  const amount = deriveCheckoutAmountCents(selectedServiceIds);
  if (!amount.ok) {
    return {
      ok: false,
      error: "amount_invalid",
      message: studioPaymentV1.customerCopy.amountInvalid,
    };
  }
  return {
    ok: true,
    value: {
      amountCents: amount.amountCents,
      skuIds: amount.skuIds,
      purchaseKind: "studio_plan",
    },
  };
}

function withInitiatedPaidCycle(
  campaign: CampaignRecord,
  args: {
    paidCyclePurchaseId: string;
    checkoutSessionId: string;
    expectedAmountCents: number;
    cyclePriceCents: number;
    selectedServiceIds: readonly ServiceId[];
    decisionId: string;
    factFingerprint: string;
    draftRevision: number;
    sandbox?: boolean;
  },
): CampaignRecord {
  const now = new Date().toISOString();
  const record: PaidCyclePurchaseRecord = {
    schemaVersion: studioPaidCyclePaymentV1.schemaVersion,
    paidCyclePurchaseId: args.paidCyclePurchaseId,
    campaignId: campaign.campaignId,
    skuId: studioPaidCyclePaymentV1.skuId,
    purchaseKind: studioPaidCyclePaymentV1.purchaseKind,
    status: "initiated",
    expectedAmountCents: args.expectedAmountCents,
    cyclePriceCents: args.cyclePriceCents,
    currency: "usd",
    checkoutSessionId: args.checkoutSessionId,
    selectedServiceIds: [...args.selectedServiceIds],
    decisionId: args.decisionId,
    factFingerprint: args.factFingerprint,
    draftRevision: args.draftRevision,
    initiatedAt: now,
    sandbox: args.sandbox === true,
  };
  return upsertPaidCyclePurchase(campaign, record);
}

export async function createCheckoutSession(
  request: CheckoutSessionCreateRequest,
  options?: {
    stripe?: Pick<Stripe, "checkout">;
    env?: NodeJS.ProcessEnv;
    /**
     * Server-session client user id only — never accept from request body.
     * Binds ownership on payment confirm when the campaign is still unowned.
     */
    payerClientUserId?: string;
    laneViews?: readonly ProductionLaneView[] | null;
  },
): Promise<CheckoutSessionCreateResult> {
  const env = options?.env ?? process.env;
  assertStripeSafeForTests(env);
  const payerClientUserId = options?.payerClientUserId?.trim() || undefined;

  let facts = request.facts;
  if (!request.campaignId || !facts) {
    return {
      ok: false,
      error: "invalid_request",
      message: "Checkout requires a campaign and selected services.",
    };
  }

  const purchaseKind: CheckoutPurchaseKind =
    request.purchaseKind === "paid_cycle"
      ? "paid_cycle"
      : request.purchaseKind === "condensed_offer"
        ? "condensed_offer"
        : "studio_plan";
  const condensedOffer =
    purchaseKind === "condensed_offer" ? condensedOfferFromRequest(request) : null;
  if (purchaseKind === "condensed_offer" && !condensedOffer) {
    return {
      ok: false,
      error: "condensed_offer_invalid",
      message: "Checkout could not match this order to a current Studio package.",
    };
  }
  if (condensedOffer) {
    const extras = validateStudioExtrasSelection(
      condensedOffer.packageId,
      request.condensedOffer?.extras,
    );
    if (!extras.ok) {
      return {
        ok: false,
        error: "condensed_offer_invalid",
        message: extras.message,
      };
    }
    facts = factsForCondensedOffer(facts, condensedOffer, request);
  }
  if (!facts.selectedServiceIds?.length) {
    return {
      ok: false,
      error: "invalid_request",
      message: "Checkout requires a campaign and selected services.",
    };
  }

  const gate = condensedOffer ? assertCondensedOfferClear(facts) : assertServerClear(facts);
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

  const ma001Gate = evaluateMa001CompositionPaymentGate({
    selectedServiceIds: facts.selectedServiceIds.map(String),
    composition: request.ma001PackComposition ?? null,
  });
  if (!ma001Gate.ok) {
    return {
      ok: false,
      error: "ma001_composition_required",
      message: ma001Gate.message,
    };
  }
  const ma001CompositionSeal: Ma001CompositionPaymentSeal | undefined =
    ma001Gate.applicable ? ma001Gate.seal : undefined;

  const rmj002Gate = evaluateRmJ002KitPaymentGate({
    selectedServiceIds: facts.selectedServiceIds.map(String),
    kitLock: request.rmj002KitLock ?? null,
  });
  if (!rmj002Gate.ok) {
    return {
      ok: false,
      error: "rmj002_kit_lock_required",
      message: rmj002Gate.message,
    };
  }
  const rmj002KitSeal: RmJ002KitPaymentSeal | undefined =
    rmj002Gate.applicable ? rmj002Gate.seal : undefined;

  const rmj008Gate = evaluateRmJ008KitPaymentGate({
    selectedServiceIds: facts.selectedServiceIds.map(String),
    kitLock: request.rmj008KitLock ?? null,
  });
  if (!rmj008Gate.ok) {
    return {
      ok: false,
      error: "rmj008_kit_lock_required",
      message: rmj008Gate.message,
    };
  }
  const rmj008KitSeal: RmJ008KitPaymentSeal | undefined =
    rmj008Gate.applicable ? rmj008Gate.seal : undefined;

  const bf001Gate = evaluateBf001PackagePaymentGate({
    selectedServiceIds: facts.selectedServiceIds.map(String),
    packageLock: request.bf001PackageLock ?? null,
  });
  if (!bf001Gate.ok) {
    return {
      ok: false,
      error: "bf001_package_lock_required",
      message: bf001Gate.message,
    };
  }
  const bf001PackageSeal: Bf001PackagePaymentSeal | undefined =
    bf001Gate.applicable ? bf001Gate.seal : undefined;

  const rmj007Gate = evaluateRmJ007UpdatePaymentGate({
    selectedServiceIds: facts.selectedServiceIds.map(String),
    updateLock: request.rmj007UpdateLock ?? null,
  });
  if (!rmj007Gate.ok) {
    return {
      ok: false,
      error: "rmj007_update_lock_required",
      message: rmj007Gate.message,
    };
  }
  const rmj007UpdateSeal: RmJ007UpdatePaymentSeal | undefined =
    rmj007Gate.applicable ? rmj007Gate.seal : undefined;

  const resolved = condensedOffer
    ? {
        ok: true as const,
        value: {
          amountCents: condensedOffer.chargeCents,
          skuIds: [condensedOffer.packageId],
          purchaseKind: "condensed_offer" as const,
        },
      }
    : resolveCheckoutAmount(purchaseKind, facts.selectedServiceIds);
  if (!resolved.ok) {
    return {
      ok: false,
      error: resolved.error,
      message: resolved.message,
    };
  }
  const amount = resolved.value;

  const existing = await readCampaignEnvelope(request.campaignId);
  // Studio-plan checkout remains one-shot. Paid-cycle N+1 may open on an already plan-paid campaign.
  if (existing?.record.paymentReceivedAt && purchaseKind !== "paid_cycle") {
    return {
      ok: false,
      error: "already_paid",
      message: "This project is already marked paid.",
    };
  }

  let stopSaleViews = options?.laneViews;
  if (stopSaleViews === undefined) {
    if (process.env.NODE_ENV === "test") {
      stopSaleViews = [];
    } else {
      try {
        stopSaleViews = await loadStudioLaneViews();
      } catch {
        stopSaleViews = null;
      }
    }
  }
  const stopSale = evaluateHeavyStopSale({
    selectedServiceIds: facts.selectedServiceIds,
    laneViews: stopSaleViews ?? null,
  });
  if (stopSale.blocked) {
    return {
      ok: false,
      error: "studio_at_capacity",
      message: stopSale.customerCopy,
    };
  }

  const roadId = resolveRoadId(facts);
  if (
    condensedOffer &&
    existing?.record &&
    !existing.record.condensedOffer &&
    !existing.record.paymentReceivedAt
  ) {
    return {
      ok: false,
      error: "campaign_mismatch",
      message: "Campaign identity mismatch.",
    };
  }
  let campaign: CampaignRecord;
  if (condensedOffer) {
    campaign = buildCondensedCheckoutCampaign({
      campaignId: request.campaignId,
      existing: existing?.record ?? null,
      offer: condensedOffer,
      facts,
      request,
    });
  } else if (amount.purchaseKind === "condensed_offer") {
    return {
      ok: false,
      error: "condensed_offer_invalid",
      message: "Checkout could not match this order to a current Studio package.",
    };
  } else {
    campaign =
      existing?.record ??
      buildMinimalCampaign(request.campaignId, facts, amount.skuIds);
  }
  if (campaign.campaignId !== request.campaignId) {
    return {
      ok: false,
      error: "campaign_mismatch",
      message: "Campaign identity mismatch.",
    };
  }

  const isolationGate = assertDisposableKitTestCheckout({
    campaign,
    amountCents: amount.amountCents,
    selectedServiceIds: amount.skuIds,
    sandbox: request.preferSandbox === true,
    env,
  });
  if (!isolationGate.ok) {
    return {
      ok: false,
      error: "invalid_request",
      message: isolationGate.message,
    };
  }

  if (!condensedOffer) {
    const sourceAudioGate = await evaluateSourceAudioCheckoutGate({
      repoRoot: process.cwd(),
      campaign,
      selectedServiceIds: facts.selectedServiceIds,
    });
    if (!sourceAudioGate.ok) {
      return {
        ok: false,
        error: sourceAudioGate.error,
        message: sourceAudioGate.message,
      };
    }
  }

  // Do not rewrite an already-approved plan during N+1 cycle repurchase.
  // Condensed offers keep the server offer price. Catalog totals are not applied.
  if (
    amount.purchaseKind !== "condensed_offer" &&
    !(purchaseKind === "paid_cycle" && campaign.approvedStudioPlan)
  ) {
    campaign = ensureApprovedPlan(campaign, amount.skuIds, roadId);
  }

  const meta = studioPaymentV1.metadataKeys;
  const origin = request.returnOrigin.replace(/\/$/, "");
  const condensedUrls = condensedOffer
    ? condensedCheckoutUrls(origin, request.campaignId)
    : null;
  const successUrl =
    condensedUrls?.successUrl ??
    `${origin}/studio-conversation-room?stage=checkout&payment=return&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    condensedUrls?.cancelUrl ??
    `${origin}/studio-conversation-room?stage=checkout&payment=cancel`;

  const paidCyclePurchaseId =
    amount.purchaseKind === "paid_cycle" ? amount.paidCyclePurchaseId : undefined;
  const cycleSkuId = amount.purchaseKind === "paid_cycle" ? amount.cycleSkuId : undefined;
  const cyclePriceCents =
    amount.purchaseKind === "paid_cycle" ? amount.cyclePriceCents : undefined;
  const paidCycleMeta: Stripe.MetadataParam =
    paidCyclePurchaseId && cyclePriceCents != null && cycleSkuId
      ? {
          [meta.purchaseKind]: studioPaidCyclePaymentV1.purchaseKind,
          [meta.paidCyclePurchaseId]: paidCyclePurchaseId,
          [meta.cycleSkuId]: cycleSkuId,
          [meta.cyclePriceCents]: String(cyclePriceCents),
        }
      : {};

  const bindPaidCycle = (checkoutSessionId: string, sandbox: boolean) => {
    if (amount.purchaseKind !== "paid_cycle" || amount.cyclePriceCents == null) {
      return;
    }
    campaign = withInitiatedPaidCycle(campaign, {
      paidCyclePurchaseId: amount.paidCyclePurchaseId,
      checkoutSessionId,
      expectedAmountCents: amount.amountCents,
      cyclePriceCents: amount.cyclePriceCents,
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: authorization.evaluatedDraftRevision,
      sandbox,
    });
  };

  const writeBinding = async (checkoutSessionId: string, sandbox: boolean) => {
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
      sandbox,
      ...(payerClientUserId ? { payerClientUserId } : {}),
      ...(request.customerEmail?.trim()
        ? { customerEmail: request.customerEmail.trim() }
        : {}),
      ...(ma001CompositionSeal
        ? { ma001CompositionSeal }
        : {}),
      ...(rmj002KitSeal ? { rmj002KitSeal } : {}),
      ...(rmj008KitSeal ? { rmj008KitSeal } : {}),
      ...(bf001PackageSeal ? { bf001PackageSeal } : {}),
      ...(rmj007UpdateSeal ? { rmj007UpdateSeal } : {}),
      ...(amount.purchaseKind === "paid_cycle"
        ? {
            purchaseKind: "paid_cycle" as const,
            paidCyclePurchaseId: amount.paidCyclePurchaseId,
            cycleSkuId: amount.cycleSkuId,
            cyclePriceCents: amount.cyclePriceCents,
          }
        : amount.purchaseKind === "condensed_offer"
          ? { purchaseKind: "condensed_offer" as const }
          : { purchaseKind: "studio_plan" as const }),
    });
  };

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
    // Mint purchase id + initiated ledger BEFORE confirming any payment.
    bindPaidCycle(checkoutSessionId, true);
    if (purchaseKind === "studio_plan" || !campaign.paymentReceivedAt) {
      campaign = applyCheckoutInitiatedToCampaignRecord(campaign, {
        checkoutSessionId,
        expectedAmountCents: amount.amountCents,
        selectedServiceIds: amount.skuIds,
        decisionId: authorization.decisionId,
        factFingerprint: authorization.factFingerprint,
        draftRevision: authorization.evaluatedDraftRevision,
        sandbox: true,
      });
    }
    await upsertCampaignRecord(campaign, existing?.clientUserId);
    await writeBinding(checkoutSessionId, true);

    return {
      ok: true,
      mode: "sandbox",
      checkoutSessionId,
      sandboxConfirmRequired: true,
      expectedAmountCents: amount.amountCents,
      currency: "usd",
      campaignId: request.campaignId,
      purchaseKind,
      paidCyclePurchaseId:
        amount.purchaseKind === "paid_cycle"
          ? amount.paidCyclePurchaseId
          : undefined,
      cyclePriceCents:
        amount.purchaseKind === "paid_cycle" ? amount.cyclePriceCents : undefined,
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
      message: studioPaymentV1.customerCopy.processorCredentialsInvalid,
    };
  }

  const stripe = options?.stripe ?? new Stripe(keyStatus.secret);

  const lineName = condensedOffer
    ? condensedOffer.name
    : purchaseKind === "paid_cycle"
      ? amount.skuIds.length === 1
        ? `Monthly cycle · ${amount.skuIds[0]}`
        : `Monthly cycle + plan (${amount.skuIds.length} services)`
      : amount.skuIds.length === 1
        ? `Studio Plan · ${amount.skuIds[0]}`
        : `Studio Plan (${amount.skuIds.length} services)`;

  const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
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
                ...paidCycleMeta,
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
        ...paidCycleMeta,
      },
      payment_intent_data: {
        metadata: {
          [meta.campaignId]: request.campaignId,
          [meta.decisionId]: authorization.decisionId,
          ...(paidCyclePurchaseId
            ? { [meta.paidCyclePurchaseId]: paidCyclePurchaseId }
            : {}),
        },
      },
  };
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(checkoutSessionParams);
  } catch {
    return {
      ok: false,
      error: "processor_session_failed",
      message: studioPaymentV1.customerCopy.processorSessionFailed,
    };
  }

  if (!session.id || !session.url) {
    return {
      ok: false,
      error: "processor_session_failed",
      message: studioPaymentV1.customerCopy.processorSessionFailed,
    };
  }

  bindPaidCycle(session.id, false);
  if (purchaseKind === "studio_plan" || !campaign.paymentReceivedAt) {
    campaign = applyCheckoutInitiatedToCampaignRecord(campaign, {
      checkoutSessionId: session.id,
      expectedAmountCents: amount.amountCents,
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: authorization.evaluatedDraftRevision,
      sandbox: false,
    });
  }
  const bound = bindDisposableKitTestCheckoutSession(campaign, session.id);
  if (!bound.ok) {
    return {
      ok: false,
      error: "campaign_mismatch",
      message: bound.message,
    };
  }
  campaign = bound.campaign;
  await upsertCampaignRecord(campaign, existing?.clientUserId);
  await writeBinding(session.id, false);

  return {
    ok: true,
    mode: "stripe",
    checkoutSessionId: session.id,
    url: session.url,
    expectedAmountCents: amount.amountCents,
    currency: "usd",
    campaignId: request.campaignId,
    purchaseKind,
    paidCyclePurchaseId:
      amount.purchaseKind === "paid_cycle"
        ? amount.paidCyclePurchaseId
        : undefined,
    cyclePriceCents:
      amount.purchaseKind === "paid_cycle" ? amount.cyclePriceCents : undefined,
  };
}
