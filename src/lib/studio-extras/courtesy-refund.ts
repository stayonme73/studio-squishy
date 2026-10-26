import type Stripe from "stripe";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { JobRefundExecutionStage } from "@/lib/job-control/types";
import { inferStripeMode, readStripeSecretKey } from "@/lib/studio-payment/env";
import {
  STUDIO_REFUND_METADATA_KEYS,
  createStripeRefund,
  refundOutcomeFromStripeRefund,
  withPaymentRefundLock,
  type RefundProviderOutcome,
} from "@/lib/studio-payment/refund-execution";

import { deliverStudioExtrasCourtesyEmail, type CourtesyEmailDeps } from "./courtesy-email";
import { withStudioExtrasCourtesy } from "./machine";
import type { StudioExtrasCourtesy } from "./types";

/**
 * Partial return for a Courtesy Adjustment.
 * This does not close the package and does not reuse the full-refund job path.
 * Test mode only. The customer is told the money was returned only after Stripe succeeds.
 */

const TERMINAL_NO_RETRY = new Set([
  "sandbox_payment",
  "payment_intent_missing",
  "live_mode_blocked",
  "payment_not_confirmed",
]);

export type CourtesyRefundDeps = CourtesyEmailDeps & {
  stripe?: Pick<Stripe, "refunds">;
  env?: NodeJS.ProcessEnv;
  now?: string;
  readCampaign?: (campaignId: string) => Promise<CampaignRecord | null>;
  writeCampaign?: (campaign: CampaignRecord) => Promise<CampaignRecord>;
  readTasks?: (campaignId: string) => Promise<ServerTasksEnvelope | null>;
};

export type CourtesyReconcileResult =
  | { applied: true; changed: boolean; stage: JobRefundExecutionStage; campaignId: string; jobId: string }
  | { applied: false; reason: string };

export function courtesyRefundIdempotencyKey(
  campaignId: string,
  extraIds: readonly string[],
  percent: number,
  attempt: number,
): string {
  const base = `courtesy:${campaignId}:${[...extraIds].sort().join("+")}:${percent}`;
  return attempt <= 1 ? base : `${base}:attempt-${attempt}`;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function packageRefundReservedCents(envelope: ServerTasksEnvelope | null): number {
  let reserved = 0;
  for (const job of envelope?.jobRecords ?? []) {
    const execution = job.refundExecution;
    if (!execution) continue;
    if (execution.stage === "approved" || execution.stage === "processing" || execution.stage === "completed") {
      reserved += execution.requestedAmountCents;
    }
  }
  return reserved;
}

async function loadCampaign(campaign: CampaignRecord, deps: CourtesyRefundDeps): Promise<CampaignRecord> {
  if (deps.readCampaign) return (await deps.readCampaign(campaign.campaignId)) ?? campaign;
  try {
    return (await readCampaignEnvelope(campaign.campaignId))?.record ?? campaign;
  } catch {
    return campaign;
  }
}

async function saveCampaign(campaign: CampaignRecord, deps: CourtesyRefundDeps): Promise<CampaignRecord> {
  if (deps.writeCampaign) return deps.writeCampaign(campaign);
  return (await upsertCampaignRecord(campaign)).record;
}

async function loadTasks(campaignId: string, deps: CourtesyRefundDeps): Promise<ServerTasksEnvelope | null> {
  if (deps.readTasks) return deps.readTasks(campaignId);
  try {
    return await readTasksEnvelope(campaignId);
  } catch {
    return null;
  }
}

function exception(courtesy: StudioExtrasCourtesy, reason: string, notice: string): StudioExtrasCourtesy {
  return {
    ...courtesy,
    paymentExecution: "failed",
    failureDefinitive: false,
    failureReason: reason,
    ownerAttention: "exception",
    ownerNotice: notice,
  };
}

function applyCourtesyOutcome(courtesy: StudioExtrasCourtesy, outcome: RefundProviderOutcome): StudioExtrasCourtesy {
  const attempted = courtesy.refundAmountCents ?? courtesy.dueCents;
  const label = dollars(attempted);
  if (outcome.kind === "rejected") {
    const uncertain = !outcome.definitive;
    return {
      ...courtesy,
      status: "COURTESY_ADJUSTMENT_REQUIRED",
      paymentExecution: uncertain ? "uncertain" : "failed",
      refundAmountCents: uncertain ? attempted : courtesy.refundAmountCents,
      dueCents: uncertain ? 0 : courtesy.dueCents,
      failureDefinitive: outcome.definitive,
      failureReason: outcome.message,
      providerStatus: outcome.code,
      ownerAttention: "exception",
      ownerNotice: uncertain
        ? `Tagia, the ${courtesy.percent}% Courtesy Adjustment of ${label} could not be confirmed with Stripe. Do not send it again until the existing refund is identified. This is an exception.`
        : `Tagia, the ${courtesy.percent}% Courtesy Adjustment of ${label} could not be returned. The customer has not been told the money was returned. This is an exception.`,
    };
  }

  const completed = outcome.status === "succeeded";
  const failed = outcome.status === "failed" || outcome.status === "canceled";
  const stage = completed ? "completed" : failed ? "failed" : "accepted";
  const sent = outcome.amountCents;
  const which = courtesy.exhaustedExtraIds.length <= 1 ? "one Studio Extra" : "two Studio Extras";
  return {
    ...courtesy,
    status: completed ? "issued" : "COURTESY_ADJUSTMENT_REQUIRED",
    paymentExecution: stage,
    refundAmountCents: sent,
    stripeRefundId: outcome.refundId,
    providerStatus: outcome.status,
    failureDefinitive: failed ? true : null,
    failureReason: failed ? outcome.failureReason : null,
    alreadyIssuedCents: completed ? sent : 0,
    dueCents: completed || stage === "accepted" ? 0 : courtesy.dueCents,
    ownerAttention: failed ? "exception" : "notice",
    ownerNotice: completed
      ? `Tagia, ${which} exhausted after the required recovery path. The ${courtesy.percent}% courtesy adjustment was applied and recorded. No action is needed from you.`
      : failed
        ? `Tagia, the ${courtesy.percent}% Courtesy Adjustment of ${dollars(sent)} could not be returned. The customer has not been told the money was returned. This is an exception.`
        : `Tagia, Stripe accepted the ${courtesy.percent}% Courtesy Adjustment of ${dollars(sent)}. It has not completed. No action is needed from you.`,
  };
}

function putCourtesy(campaign: CampaignRecord, courtesy: StudioExtrasCourtesy, at: string): CampaignRecord {
  if (!campaign.studioExtras) return campaign;
  return {
    ...campaign,
    studioExtras: { ...campaign.studioExtras, courtesy, updatedAt: at },
    updatedAt: at,
  };
}

/**
 * Sends the Courtesy Adjustment when all eight proofs already passed.
 * Retries reuse the stored idempotency key. A completed, accepted, or unconfirmed
 * refund is never sent again.
 */
export async function issueStudioExtrasCourtesyRefund(
  campaign: CampaignRecord,
  deps: CourtesyRefundDeps = {},
): Promise<CampaignRecord> {
  if (!campaign.studioExtras) return campaign;
  const at = deps.now ?? new Date().toISOString();
  const evaluated = withStudioExtrasCourtesy(campaign.studioExtras, campaign, at);
  const withCourtesy = { ...campaign, studioExtras: evaluated };
  const courtesy = evaluated.courtesy;
  if (!courtesy) return withCourtesy;
  if (
    courtesy.paymentExecution === "completed" ||
    courtesy.paymentExecution === "accepted" ||
    courtesy.paymentExecution === "uncertain"
  ) {
    return deliverStudioExtrasCourtesyEmail(withCourtesy, deps);
  }
  if (
    courtesy.paymentExecution === "failed" &&
    courtesy.failureDefinitive === false &&
    TERMINAL_NO_RETRY.has(courtesy.failureReason ?? "")
  ) {
    return withCourtesy;
  }
  if (courtesy.status !== "COURTESY_ADJUSTMENT_REQUIRED" || courtesy.dueCents <= 0) return withCourtesy;
  if (!Object.values(courtesy.proof).every(Boolean)) return withCourtesy;

  const payment = campaign.paymentTruth;
  if (!payment || payment.status !== "confirmed" || payment.sandbox || (payment.confirmedAmountCents ?? 0) <= 0) {
    if (payment?.sandbox) {
      return saveCampaign(
        putCourtesy(
          campaign,
          exception(
            courtesy,
            "sandbox_payment",
            "Tagia, this order was paid through the sandbox. No Stripe refund was sent. This is an exception.",
          ),
          at,
        ),
        deps,
      );
    }
    return withCourtesy;
  }

  const paymentIntentId = payment.paymentIntentId?.trim() ?? "";
  if (!paymentIntentId.startsWith("pi_") || paymentIntentId.startsWith("pi_sandbox")) {
    return saveCampaign(
      putCourtesy(
        campaign,
        exception(
          courtesy,
          "payment_intent_missing",
          "Tagia, the Stripe payment reference is missing, so the Courtesy Adjustment was not sent. This is an exception.",
        ),
        at,
      ),
      deps,
    );
  }

  const env = deps.env ?? process.env;
  if (inferStripeMode(env) !== "test") {
    return saveCampaign(
      putCourtesy(
        campaign,
        exception(
          courtesy,
          "live_mode_blocked",
          "Tagia, live Stripe refunds are not enabled. The Courtesy Adjustment was not sent. This is an exception.",
        ),
        at,
      ),
      deps,
    );
  }
  if (!deps.stripe && !readStripeSecretKey(env)) return withCourtesy;

  return withPaymentRefundLock(paymentIntentId, async () => {
    const fresh = await loadCampaign(campaign, deps);
    const live = fresh.studioExtras?.courtesy ?? courtesy;
    if (
      live.paymentExecution === "completed" ||
      live.paymentExecution === "accepted" ||
      live.paymentExecution === "uncertain"
    ) {
      return deliverStudioExtrasCourtesyEmail(fresh, deps);
    }
    const tasks = await loadTasks(fresh.campaignId, deps);
    const paid = fresh.paymentTruth?.confirmedAmountCents ?? 0;
    const room = paid - packageRefundReservedCents(tasks);
    if (!Number.isInteger(live.dueCents) || live.dueCents <= 0 || room < live.dueCents) {
      return saveCampaign(
        putCourtesy(
          fresh,
          {
            ...live,
            ownerAttention: "exception",
            ownerNotice: `Tagia, the Courtesy Adjustment of ${dollars(live.dueCents)} was not sent because it would exceed the amount still refundable. This is an exception.`,
          },
          at,
        ),
        deps,
      );
    }

    const retrying = live.paymentExecution === "failed" && live.failureDefinitive === true;
    const attempt = retrying ? Math.max(live.refundAttempt, 1) + 1 : Math.max(live.refundAttempt, 1);
    const idempotencyKey =
      !retrying && live.idempotencyKey
        ? live.idempotencyKey
        : courtesyRefundIdempotencyKey(fresh.campaignId, live.exhaustedExtraIds, live.percent, attempt);
    const prepared: StudioExtrasCourtesy = {
      ...live,
      idempotencyKey,
      refundAttempt: attempt,
      refundAmountCents: live.dueCents,
    };
    const held = await saveCampaign(putCourtesy(fresh, prepared, at), deps);
    const outcome = await createStripeRefund(
      {
        paymentIntentId,
        amountCents: live.dueCents,
        idempotencyKey,
        metadata: {
          [STUDIO_REFUND_METADATA_KEYS.campaignId]: fresh.campaignId,
          [STUDIO_REFUND_METADATA_KEYS.courtesy]: "1",
          [STUDIO_REFUND_METADATA_KEYS.attempt]: String(attempt),
        },
      },
      { stripe: deps.stripe, env },
    );
    const saved = await saveCampaign(putCourtesy(held, applyCourtesyOutcome(prepared, outcome), at), deps);
    return deliverStudioExtrasCourtesyEmail(saved, deps);
  });
}

/** Webhook replay updates the Courtesy record. It does not create a refund or close the package. */
export async function reconcileCourtesyStripeRefund(
  refund: Stripe.Refund,
  deps: CourtesyRefundDeps = {},
): Promise<CourtesyReconcileResult> {
  const campaignId = refund.metadata?.[STUDIO_REFUND_METADATA_KEYS.campaignId]?.trim();
  if (!campaignId) return { applied: false, reason: "not_a_studio_refund" };
  const campaign = deps.readCampaign
    ? await deps.readCampaign(campaignId)
    : (await readCampaignEnvelope(campaignId))?.record ?? null;
  const courtesy = campaign?.studioExtras?.courtesy;
  if (!campaign || !courtesy) return { applied: false, reason: "courtesy_missing" };
  if (courtesy.stripeRefundId && courtesy.stripeRefundId !== refund.id) {
    return { applied: false, reason: "different_courtesy_refund" };
  }
  const next = applyCourtesyOutcome(courtesy, refundOutcomeFromStripeRefund(refund));
  const changed =
    next.paymentExecution !== courtesy.paymentExecution ||
    next.stripeRefundId !== courtesy.stripeRefundId ||
    next.status !== courtesy.status;
  const saved = changed
    ? await saveCampaign(putCourtesy(campaign, next, next.computedAt), deps)
    : campaign;
  await deliverStudioExtrasCourtesyEmail(saved, deps);
  const stage: JobRefundExecutionStage =
    next.paymentExecution === "completed" ? "completed" : next.paymentExecution === "failed" ? "failed" : "processing";
  return { applied: true, changed, stage, campaignId, jobId: "courtesy" };
}
