import type Stripe from "stripe";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import { applyRefundProviderOutcome } from "@/lib/job-control/refund-execution-state";
import type { JobRefundExecutionStage, PurchasedJobRecord } from "@/lib/job-control/types";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";

import { reconcileCourtesyStripeRefund } from "@/lib/studio-extras/courtesy-refund";
import { courtesyReservedCents } from "./thank-you-refund";

import {
  STUDIO_REFUND_METADATA_KEYS,
  executeStripeRefund,
  refundOutcomeFromStripeRefund,
  retrieveStripeRefund,
  withPaymentRefundLock,
  type RefundExecutionPlan,
  type RefundProviderOutcome,
} from "./refund-execution";

type RefundDeps = {
  stripe?: Pick<Stripe, "refunds">;
  env?: NodeJS.ProcessEnv;
  write?: (envelope: ServerTasksEnvelope) => Promise<ServerTasksEnvelope>;
  readCampaign?: (campaignId: string) => Promise<CampaignRecord | null>;
  writeCampaign?: (campaign: CampaignRecord) => Promise<CampaignRecord>;
};

export type RefundRunResult = {
  envelope: ServerTasksEnvelope;
  job: PurchasedJobRecord;
  stage: JobRefundExecutionStage;
  outcome: RefundProviderOutcome;
};

/**
 * Persists the Owner approval before calling Stripe, then persists Stripe's answer.
 * A crash between the two leaves "approved" with the same idempotency key, so a retry
 * returns the existing Stripe refund instead of creating a second one.
 */
export async function runApprovedRefundExecution(input: {
  envelope: ServerTasksEnvelope;
  campaign: CampaignRecord;
  clientId: string;
  plan: RefundExecutionPlan;
  deps?: RefundDeps;
}): Promise<RefundRunResult> {
  const write = input.deps?.write ?? writeTasksEnvelope;
  const approved = await write(input.envelope);
  const outcome = await withPaymentRefundLock(input.plan.paymentIntentId, async () => {
    const fresh = await campaignForRefundGuard(input.campaign, input.deps);
    const paid = fresh.paymentTruth?.confirmedAmountCents;
    const reserved = courtesyReservedCents(fresh);
    if (typeof paid === "number" && input.plan.amountCents + reserved > paid) {
      return {
        kind: "rejected" as const,
        code: "amount_invalid",
        message: "This refund would exceed the amount still refundable after the Courtesy Adjustment.",
        definitive: true,
      };
    }
    return executeStripeRefund(input.plan, {
      stripe: input.deps?.stripe,
      env: input.deps?.env,
    });
  });
  const applied = applyRefundProviderOutcome(
    approved,
    input.campaign,
    input.plan.jobId,
    outcome,
    { clientId: input.clientId },
  );
  if (!applied.ok) {
    const job = approved.jobRecords?.find((entry) => entry.jobId === input.plan.jobId);
    if (!job) throw new Error(applied.error);
    return { envelope: approved, job, stage: job.refundExecution?.stage ?? "approved", outcome };
  }
  const saved = applied.changed ? await write(applied.envelope) : approved;
  return { envelope: saved, job: applied.job, stage: applied.stage, outcome };
}

export type RefundReconcileResult =
  | { applied: true; changed: boolean; stage: JobRefundExecutionStage; campaignId: string; jobId: string }
  | { applied: false; reason: string };

async function applyProviderOutcomeToStoredJob(
  campaignId: string,
  jobId: string,
  outcome: RefundProviderOutcome,
  deps?: RefundDeps,
): Promise<RefundReconcileResult> {
  const [campaignEnvelope, tasksEnvelope] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readTasksEnvelope(campaignId),
  ]);
  if (!campaignEnvelope || !tasksEnvelope) return { applied: false, reason: "project_not_found" };
  const clientId = resolveCampaignCommunicationClientId(
    campaignEnvelope.clientUserId,
    campaignEnvelope.campaignId,
  );
  const applied = applyRefundProviderOutcome(
    tasksEnvelope,
    campaignEnvelope.record,
    jobId,
    outcome,
    { clientId },
  );
  if (!applied.ok) return { applied: false, reason: applied.error };
  if (applied.changed) {
    await (deps?.write ?? writeTasksEnvelope)(applied.envelope);
    if (!deps?.write) await deliverLifecycleNoticesForCampaign(campaignId);
  }
  return { applied: true, changed: applied.changed, stage: applied.stage, campaignId, jobId };
}

async function campaignForRefundGuard(
  fallback: CampaignRecord,
  deps?: RefundDeps,
): Promise<CampaignRecord> {
  if (deps?.readCampaign) return (await deps.readCampaign(fallback.campaignId)) ?? fallback;
  try {
    return (await readCampaignEnvelope(fallback.campaignId))?.record ?? fallback;
  } catch {
    return fallback;
  }
}

/** Stripe `refund.created` / `refund.updated` / `refund.failed` → Studio job or Courtesy truth. */
export async function reconcileStripeRefundEvent(
  refund: Stripe.Refund,
  deps?: RefundDeps,
): Promise<RefundReconcileResult> {
  if (refund.metadata?.[STUDIO_REFUND_METADATA_KEYS.courtesy] === "1") {
    return reconcileCourtesyStripeRefund(refund, deps);
  }
  const campaignId = refund.metadata?.[STUDIO_REFUND_METADATA_KEYS.campaignId]?.trim();
  const jobId = refund.metadata?.[STUDIO_REFUND_METADATA_KEYS.jobId]?.trim();
  if (!campaignId || !jobId) return { applied: false, reason: "not_a_studio_refund" };
  return applyProviderOutcomeToStoredJob(campaignId, jobId, refundOutcomeFromStripeRefund(refund), deps);
}

/** Reads the stored Stripe refund for a job and applies its current status. */
export async function reconcileJobRefundFromStripe(
  campaignId: string,
  jobId: string,
  deps?: RefundDeps,
): Promise<RefundReconcileResult> {
  const tasksEnvelope = await readTasksEnvelope(campaignId);
  const refundId = tasksEnvelope?.jobRecords?.find((entry) => entry.jobId === jobId)?.refundExecution
    ?.stripeRefundId;
  if (!refundId) return { applied: false, reason: "no_stripe_refund_recorded" };
  const outcome = await retrieveStripeRefund(refundId, { stripe: deps?.stripe, env: deps?.env });
  return applyProviderOutcomeToStoredJob(campaignId, jobId, outcome, deps);
}
