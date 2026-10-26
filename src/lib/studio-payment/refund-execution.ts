import Stripe from "stripe";

import type { CampaignRecord } from "@/config/studio-board";
import type {
  JobRefundExecutionStage,
  PurchasedJobRecord,
} from "@/lib/job-control/types";

import { inferStripeMode, readStripeSecretKey } from "./env";
import { maximumApprovedFullRefundCents } from "./thank-you-refund";

/**
 * Canonical full-refund execution. One payment, one job, the amount Stripe collected.
 * Test mode only until live refunds are separately authorized.
 */

export const STUDIO_REFUND_METADATA_KEYS = {
  campaignId: "studioCampaignId",
  jobId: "studioJobId",
  attempt: "studioRefundAttempt",
  courtesy: "studioCourtesy",
} as const;

export type RefundExecutionPlan = {
  campaignId: string;
  jobId: string;
  paymentIntentId: string;
  amountCents: number;
  currency: "usd";
  attempt: number;
  idempotencyKey: string;
};

export type RefundExecutionBlockCode =
  | "payment_missing"
  | "payment_not_confirmed"
  | "sandbox_payment"
  | "payment_intent_missing"
  | "amount_invalid"
  | "multi_service_payment"
  | "not_canonical_package_payment"
  | "processor_not_configured"
  | "live_mode_blocked";

export const REFUND_EXECUTION_BLOCK_MESSAGES: Record<RefundExecutionBlockCode, string> = {
  payment_missing: "No processor payment is recorded for this project, so there is nothing to refund through Stripe.",
  payment_not_confirmed: "The payment for this project is not confirmed, so it cannot be refunded.",
  sandbox_payment: "This project was paid through the sandbox, not Stripe. No Stripe refund can be sent.",
  payment_intent_missing: "The Stripe payment reference is missing for this project, so the refund cannot be sent safely.",
  amount_invalid: "The amount paid for this project is missing or invalid, so the refund cannot be sent safely.",
  multi_service_payment:
    "This payment covers multiple services. It cannot be safely auto-refunded at the single-service level. Owner review is required.",
  not_canonical_package_payment:
    "This payment is not a current single-package order. It cannot be safely auto-refunded. Owner review is required.",
  processor_not_configured: "Stripe is not configured, so the refund cannot be sent.",
  live_mode_blocked: "Live Stripe refunds are not enabled yet. Only test-mode refunds can be sent.",
};

export function refundIdempotencyKey(campaignId: string, jobId: string, attempt: number): string {
  const base = `refund:${campaignId}:${jobId}`;
  return attempt <= 1 ? base : `${base}:attempt-${attempt}`;
}

function blocked(code: RefundExecutionBlockCode) {
  return { ok: false as const, code, message: REFUND_EXECUTION_BLOCK_MESSAGES[code] };
}

export function evaluateRefundExecutionPlan(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  jobsOnPayment: number;
  attempt: number;
  env?: NodeJS.ProcessEnv;
}):
  | { ok: true; plan: RefundExecutionPlan }
  | { ok: false; code: RefundExecutionBlockCode; message: string } {
  const env = input.env ?? process.env;
  const truth = input.campaign.paymentTruth;
  if (!truth || truth.processor !== "stripe") return blocked("payment_missing");
  if (truth.status !== "confirmed") return blocked("payment_not_confirmed");
  if (truth.sandbox) return blocked("sandbox_payment");
  const paymentIntentId = truth.paymentIntentId?.trim();
  if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) return blocked("payment_intent_missing");

  const lineItems = input.campaign.approvedStudioPlan?.lineItems ?? [];
  if (lineItems.length > 1 || input.jobsOnPayment > 1) return blocked("multi_service_payment");
  if (!input.campaign.condensedOffer || lineItems.length !== 1 || input.jobsOnPayment !== 1) {
    return blocked("not_canonical_package_payment");
  }

  const amountCents = maximumApprovedFullRefundCents(input.campaign);
  if (amountCents == null || amountCents <= 0 || !Number.isInteger(amountCents)) {
    return blocked("amount_invalid");
  }

  if (!readStripeSecretKey(env)) return blocked("processor_not_configured");
  if (inferStripeMode(env) !== "test") return blocked("live_mode_blocked");

  return {
    ok: true,
    plan: {
      campaignId: input.campaign.campaignId,
      jobId: input.job.jobId,
      paymentIntentId,
      amountCents,
      currency: "usd",
      attempt: input.attempt,
      idempotencyKey: refundIdempotencyKey(input.campaign.campaignId, input.job.jobId, input.attempt),
    },
  };
}

export type RefundProviderOutcome =
  | {
      kind: "provider_refund";
      refundId: string;
      status: string;
      amountCents: number;
      createdAt: string | null;
      failureReason: string | null;
    }
  | {
      kind: "rejected";
      code: string;
      message: string;
      /**
       * True only when Stripe definitively refused (no refund exists). Connection or
       * server errors are ambiguous: the refund may exist, so retries must reuse the key.
       */
      definitive: boolean;
    };

const DEFINITIVE_STRIPE_ERROR_TYPES = new Set([
  "StripeInvalidRequestError",
  "StripeCardError",
  "invalid_request_error",
  "card_error",
]);

function rejectedFromStripeError(
  error: unknown,
  message: string,
): Extract<RefundProviderOutcome, { kind: "rejected" }> {
  const stripeError = error as { code?: string; type?: string; rawType?: string };
  const type = stripeError.type ?? stripeError.rawType ?? "";
  return {
    kind: "rejected",
    code: stripeError.code ?? (type || "stripe_error"),
    message,
    definitive: DEFINITIVE_STRIPE_ERROR_TYPES.has(type),
  };
}

export function mapStripeRefundStatus(status: string | null | undefined): JobRefundExecutionStage {
  if (status === "succeeded") return "completed";
  if (status === "failed" || status === "canceled") return "failed";
  return "processing";
}

export function refundOutcomeFromStripeRefund(refund: Stripe.Refund): RefundProviderOutcome {
  return {
    kind: "provider_refund",
    refundId: refund.id,
    status: refund.status ?? "pending",
    amountCents: refund.amount,
    createdAt: refund.created ? new Date(refund.created * 1000).toISOString() : null,
    failureReason: refund.failure_reason ?? null,
  };
}

type RefundsClient = Pick<Stripe, "refunds">;

const refundLocks = new Map<string, Promise<unknown>>();

/** One Stripe refund create at a time for a payment, so courtesy and package refunds cannot overlap. */
export function withPaymentRefundLock<T>(paymentIntentId: string, work: () => Promise<T>): Promise<T> {
  const previous = refundLocks.get(paymentIntentId) ?? Promise.resolve();
  const run = previous.then(work, work);
  refundLocks.set(
    paymentIntentId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function stripeClient(env: NodeJS.ProcessEnv, stripe?: RefundsClient): RefundsClient | null {
  if (stripe) return stripe;
  const secret = readStripeSecretKey(env);
  return secret ? new Stripe(secret) : null;
}

export async function createStripeRefund(
  input: {
    paymentIntentId: string;
    amountCents: number;
    idempotencyKey: string;
    metadata: Record<string, string>;
  },
  options: { stripe?: RefundsClient; env?: NodeJS.ProcessEnv } = {},
): Promise<RefundProviderOutcome> {
  const env = options.env ?? process.env;
  if (inferStripeMode(env) !== "test") {
    return {
      kind: "rejected",
      code: "live_mode_blocked",
      message: REFUND_EXECUTION_BLOCK_MESSAGES.live_mode_blocked,
      definitive: false,
    };
  }
  const client = stripeClient(env, options.stripe);
  if (!client) {
    return {
      kind: "rejected",
      code: "processor_not_configured",
      message: REFUND_EXECUTION_BLOCK_MESSAGES.processor_not_configured,
      definitive: false,
    };
  }

  try {
    const refund = await client.refunds.create(
      {
        payment_intent: input.paymentIntentId,
        amount: input.amountCents,
        reason: "requested_by_customer",
        metadata: input.metadata,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return refundOutcomeFromStripeRefund(refund);
  } catch (error) {
    return rejectedFromStripeError(error, "Stripe did not accept the refund.");
  }
}

export async function executeStripeRefund(
  plan: RefundExecutionPlan,
  options: { stripe?: RefundsClient; env?: NodeJS.ProcessEnv } = {},
): Promise<RefundProviderOutcome> {
  return createStripeRefund(
    {
      paymentIntentId: plan.paymentIntentId,
      amountCents: plan.amountCents,
      idempotencyKey: plan.idempotencyKey,
      metadata: {
        [STUDIO_REFUND_METADATA_KEYS.campaignId]: plan.campaignId,
        [STUDIO_REFUND_METADATA_KEYS.jobId]: plan.jobId,
        [STUDIO_REFUND_METADATA_KEYS.attempt]: String(plan.attempt),
      },
    },
    options,
  );
}

export async function retrieveStripeRefund(
  refundId: string,
  options: { stripe?: RefundsClient; env?: NodeJS.ProcessEnv } = {},
): Promise<RefundProviderOutcome> {
  const env = options.env ?? process.env;
  const client = stripeClient(env, options.stripe);
  if (!client) {
    return {
      kind: "rejected",
      code: "processor_not_configured",
      message: REFUND_EXECUTION_BLOCK_MESSAGES.processor_not_configured,
      definitive: false,
    };
  }
  try {
    return refundOutcomeFromStripeRefund(await client.refunds.retrieve(refundId));
  } catch (error) {
    // A failed status read is never evidence that the refund failed.
    return { ...rejectedFromStripeError(error, "Stripe refund status could not be read."), definitive: false };
  }
}
