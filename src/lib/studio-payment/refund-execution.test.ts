import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { toRefundRequestCustomerView } from "@/lib/campaign-tasks/refund-request-status-view";
import { applyOwnerApproveRefund } from "@/lib/job-control/owner-decision-job-actions";
import { applyProductionWorkspacePatch } from "@/lib/job-control/production-workspace-actions";
import { applyRefundProviderOutcome } from "@/lib/job-control/refund-execution-state";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { evaluateRefundExecutionPlan, refundOutcomeFromStripeRefund } from "./refund-execution";
import { runApprovedRefundExecution } from "./refund-execution-run";
import { handleStripeWebhook } from "./webhook";

const NOW = "2026-10-10T16:00:00.000Z";
const TEST_ENV = { STRIPE_SECRET_KEY: "sk_test_unit" } as unknown as NodeJS.ProcessEnv;
const CAMPAIGN_ID = "refund-social-1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@example.com",
  displayName: "Owner",
  roles: ["owner"],
};

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Refund Social",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Social & Promo Graphics",
    paymentReceivedAt: NOW,
    condensedOffer: {
      packageId: "social_and_promo_graphics",
      priceCents: 19900,
      listPriceCents: 19900,
      thankYouDiscountCents: 3980,
      amountDueCents: 15920,
    } as never,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 15920,
      confirmedAmountCents: 15920,
      checkoutSessionId: "cs_test_social",
      paymentIntentId: "pi_test_social",
      selectedServiceIds: ["social_and_promo_graphics"],
      decisionId: "pa",
      factFingerprint: "fp",
      draftRevision: 1,
    },
    approvedStudioPlan: {
      selectedServiceIds: [],
      includedServiceIds: [],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 19900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 15920,
      lineItems: [{ skuId: "sm-001", exactPriceCents: 19900 } as never],
      approvedAt: NOW,
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as CampaignRecord;
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    skuId: "sm-001",
    serviceName: "Social & Promo Graphics",
    spineStatus: "ready_for_queue",
    productionLane: "quick",
    intakeComplete: true,
    updatedAt: NOW,
    ...overrides,
  };
}

function envelope(jobs: PurchasedJobRecord[] = [job()]): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    tasks: [],
    planFingerprint: "fp",
    updatedAt: NOW,
    syncedAt: NOW,
    version: 11,
    jobRecords: jobs,
    jobActivityEvents: [],
    jobCommunicationRecords: [],
    ownerDecisionInteractions: [
      {
        id: "refund-request-1",
        campaignId: CAMPAIGN_ID,
        jobId: JOB_ID,
        interactionKind: "refund_request",
        status: "waiting_owner",
        clientMessage: "Please cancel.",
        createdAt: NOW,
        updatedAt: NOW,
      } as never,
    ],
  };
}

function stripeRefund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    id: "re_test_1",
    object: "refund",
    amount: 15920,
    status: "pending",
    created: 1791648000,
    currency: "usd",
    failure_reason: undefined,
    metadata: { studioCampaignId: CAMPAIGN_ID, studioJobId: JOB_ID, studioRefundAttempt: "1" },
    ...overrides,
  } as Stripe.Refund;
}

function fakeStripe(create: () => Promise<Stripe.Refund>) {
  const spy = vi.fn(create);
  return { client: { refunds: { create: spy, retrieve: vi.fn() } } as unknown as Pick<Stripe, "refunds">, spy };
}

function memoryWrite() {
  const writes: ServerTasksEnvelope[] = [];
  return {
    writes,
    write: async (next: ServerTasksEnvelope) => {
      writes.push(next);
      return next;
    },
  };
}

function approve(env: ServerTasksEnvelope, record = campaign()) {
  return applyOwnerApproveRefund(env, record, JOB_ID, { reason: "Before production." }, owner, "client-1", {
    env: TEST_ENV,
  });
}

function notices(env: ServerTasksEnvelope, eventType: string) {
  return (env.jobCommunicationRecords ?? []).filter((row) => row.eventType === eventType);
}

describe("canonical refund plan", () => {
  it("refunds the Studio Thank-You amount actually paid, not the $199 list price", () => {
    const planned = evaluateRefundExecutionPlan({ campaign: campaign(), job: job(), jobsOnPayment: 1, attempt: 1, env: TEST_ENV });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.amountCents).toBe(15920);
    expect(planned.plan.paymentIntentId).toBe("pi_test_social");
    expect(planned.plan.idempotencyKey).toBe(`refund:${CAMPAIGN_ID}:${JOB_ID}`);
  });

  it.each([
    ["sandbox payment", campaign({ paymentTruth: { ...campaign().paymentTruth!, sandbox: true } }), 1, "sandbox_payment"],
    ["missing PaymentIntent", campaign({ paymentTruth: { ...campaign().paymentTruth!, paymentIntentId: null } }), 1, "payment_intent_missing"],
    ["no processor payment", campaign({ paymentTruth: undefined }), 1, "payment_missing"],
    ["unconfirmed payment", campaign({ paymentTruth: { ...campaign().paymentTruth!, status: "pending" as never } }), 1, "payment_not_confirmed"],
    ["old multi-service plan", campaign({ condensedOffer: undefined, approvedStudioPlan: { ...campaign().approvedStudioPlan!, lineItems: [{} as never, {} as never] } }), 2, "multi_service_payment"],
    ["old single-service plan", campaign({ condensedOffer: undefined }), 1, "not_canonical_package_payment"],
  ])("refuses a %s before Stripe", (_label, record, jobsOnPayment, code) => {
    const planned = evaluateRefundExecutionPlan({ campaign: record, job: job(), jobsOnPayment, attempt: 1, env: TEST_ENV });
    expect(planned.ok).toBe(false);
    if (planned.ok) return;
    expect(planned.code).toBe(code);
  });

  it("refuses live mode in this slice and an unconfigured processor", () => {
    const live = evaluateRefundExecutionPlan({
      campaign: campaign(),
      job: job(),
      jobsOnPayment: 1,
      attempt: 1,
      env: { STRIPE_SECRET_KEY: "sk_live_unit" } as unknown as NodeJS.ProcessEnv,
    });
    expect(live.ok === false && live.code).toBe("live_mode_blocked");
    const missing = evaluateRefundExecutionPlan({ campaign: campaign(), job: job(), jobsOnPayment: 1, attempt: 1, env: {} as NodeJS.ProcessEnv });
    expect(missing.ok === false && missing.code).toBe("processor_not_configured");
  });
});

describe("Owner approval → Stripe test refund", () => {
  it("approves, sends exactly the amount paid once, and closes the job only after Stripe accepts", async () => {
    const approved = approve(envelope());
    expect(approved.ok).toBe(true);
    if (!approved.ok || !approved.refundExecutionPlan) return;
    expect(approved.job.spineStatus).toBe("ready_for_queue");
    expect(toRefundRequestCustomerView(approved.envelope.ownerDecisionInteractions![0], approved.job).statusLabel).toBe(
      "Refund approved.",
    );

    const stripe = fakeStripe(async () => stripeRefund({ status: "pending" }));
    const store = memoryWrite();
    const run = await runApprovedRefundExecution({
      envelope: approved.envelope,
      campaign: campaign(),
      clientId: "client-1",
      plan: approved.refundExecutionPlan,
      deps: { stripe: stripe.client, env: TEST_ENV, write: store.write },
    });

    expect(stripe.spy).toHaveBeenCalledTimes(1);
    const [params, options] = stripe.spy.mock.calls[0] as unknown as [Stripe.RefundCreateParams, Stripe.RequestOptions];
    expect(params.payment_intent).toBe("pi_test_social");
    expect(params.amount).toBe(15920);
    expect(options.idempotencyKey).toBe(`refund:${CAMPAIGN_ID}:${JOB_ID}`);
    expect(store.writes[0].jobRecords?.[0].refundExecution?.stage).toBe("approved");

    expect(run.stage).toBe("processing");
    expect(run.job.spineStatus).toBe("refunded_cancelled");
    expect(run.job.refundExecution?.stripeRefundId).toBe("re_test_1");
    expect(run.job.refundApprovedAmountCents).toBe(15920);
    expect(notices(run.envelope, "refund_processing")).toHaveLength(1);
    expect(notices(run.envelope, "refund_issued")).toHaveLength(0);
    expect(toRefundRequestCustomerView(run.envelope.ownerDecisionInteractions![0], run.job).statusLabel).toBe(
      "Refund processing.",
    );

    const second = approve(run.envelope);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.status).toBe(409);

    const completed = applyRefundProviderOutcome(
      run.envelope,
      campaign(),
      JOB_ID,
      refundOutcomeFromStripeRefund(stripeRefund({ status: "succeeded" })),
      { clientId: "client-1" },
    );
    expect(completed.ok && completed.stage).toBe("completed");
    if (!completed.ok) return;
    expect(notices(completed.envelope, "refund_issued")).toHaveLength(1);
    expect(notices(completed.envelope, "refund_issued")[0].messageContent).toMatch(/^Refund completed/);
    expect(toRefundRequestCustomerView(completed.envelope.ownerDecisionInteractions![0], completed.job).statusLabel).toBe(
      "Refund completed.",
    );

    const replayed = applyRefundProviderOutcome(
      completed.envelope,
      campaign(),
      JOB_ID,
      refundOutcomeFromStripeRefund(stripeRefund({ status: "succeeded" })),
      { clientId: "client-1" },
    );
    expect(replayed.ok && replayed.changed).toBe(false);
    const lateCreated = applyRefundProviderOutcome(
      completed.envelope,
      campaign(),
      JOB_ID,
      refundOutcomeFromStripeRefund(stripeRefund({ status: "pending" })),
      { clientId: "client-1" },
    );
    expect(lateCreated.ok && lateCreated.changed).toBe(false);
  });

  it("refuses a production-started job with no Stripe call", () => {
    const result = approve(envelope([job({ productionStartedAt: NOW, nonRefundable: true })]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/nonrefundable/i);
  });

  it("routes legacy issue_refund through the same plan and guards", () => {
    const legacy = applyProductionWorkspacePatch(
      envelope(),
      campaign({ paymentTruth: { ...campaign().paymentTruth!, sandbox: true } }),
      JOB_ID,
      { action: "issue_refund", reason: "Legacy" },
      owner,
      [],
      [],
      "client-1",
    );
    expect(legacy.ok).toBe(false);
    if (!legacy.ok) expect(legacy.error).toMatch(/sandbox/i);

    const started = applyProductionWorkspacePatch(
      envelope([job({ productionStartedAt: NOW, nonRefundable: true })]),
      campaign(),
      JOB_ID,
      { action: "issue_refund", reason: "Legacy" },
      owner,
      [],
      [],
      "client-1",
    );
    expect(started.ok).toBe(false);
  });

  it("records a definitive Stripe rejection without closing the job, and retries under a new key", async () => {
    const approved = approve(envelope());
    if (!approved.ok || !approved.refundExecutionPlan) throw new Error("approval failed");
    const stripe = fakeStripe(async () => {
      throw Object.assign(new Error("Charge already refunded"), {
        type: "StripeInvalidRequestError",
        code: "charge_already_refunded",
      });
    });
    const run = await runApprovedRefundExecution({
      envelope: approved.envelope,
      campaign: campaign(),
      clientId: "client-1",
      plan: approved.refundExecutionPlan,
      deps: { stripe: stripe.client, env: TEST_ENV, write: memoryWrite().write },
    });

    expect(run.stage).toBe("failed");
    expect(run.job.spineStatus).toBe("ready_for_queue");
    expect(run.job.refundOwnerDecisionAt ?? null).toBeNull();
    expect(run.job.refundExecution?.failureCode).toBe("charge_already_refunded");
    expect(notices(run.envelope, "refund_issued")).toHaveLength(0);
    expect(notices(run.envelope, "refund_review_needed")).toHaveLength(1);
    expect(run.envelope.ownerDecisionInteractions?.[0].status).toBe("waiting_owner");
    expect(toRefundRequestCustomerView(run.envelope.ownerDecisionInteractions![0], run.job).statusLabel).toBe(
      "Refund could not be completed. The Studio is reviewing it.",
    );

    const retry = approve(run.envelope);
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.refundExecutionPlan?.idempotencyKey).toBe(`refund:${CAMPAIGN_ID}:${JOB_ID}:attempt-2`);
  });

  it("keeps an ambiguous Stripe error as approved so a retry reuses the same key", async () => {
    const approved = approve(envelope());
    if (!approved.ok || !approved.refundExecutionPlan) throw new Error("approval failed");
    const stripe = fakeStripe(async () => {
      throw Object.assign(new Error("socket hang up"), { type: "StripeConnectionError" });
    });
    const run = await runApprovedRefundExecution({
      envelope: approved.envelope,
      campaign: campaign(),
      clientId: "client-1",
      plan: approved.refundExecutionPlan,
      deps: { stripe: stripe.client, env: TEST_ENV, write: memoryWrite().write },
    });
    expect(run.stage).toBe("approved");
    expect(run.job.spineStatus).toBe("ready_for_queue");
    const retry = approve(run.envelope);
    expect(retry.ok && retry.refundExecutionPlan?.idempotencyKey).toBe(`refund:${CAMPAIGN_ID}:${JOB_ID}`);
  });

  it("reopens the job for Owner review when Stripe later reports the refund failed", async () => {
    const approved = approve(envelope());
    if (!approved.ok || !approved.refundExecutionPlan) throw new Error("approval failed");
    const run = await runApprovedRefundExecution({
      envelope: approved.envelope,
      campaign: campaign(),
      clientId: "client-1",
      plan: approved.refundExecutionPlan,
      deps: { stripe: fakeStripe(async () => stripeRefund()).client, env: TEST_ENV, write: memoryWrite().write },
    });
    expect(run.job.spineStatus).toBe("refunded_cancelled");

    const failed = applyRefundProviderOutcome(
      run.envelope,
      campaign(),
      JOB_ID,
      refundOutcomeFromStripeRefund(stripeRefund({ status: "failed", failure_reason: "expired_or_canceled_card" })),
      { clientId: "client-1" },
    );
    expect(failed.ok && failed.stage).toBe("failed");
    if (!failed.ok) return;
    expect(failed.job.spineStatus).toBe("ready_for_queue");
    expect(failed.job.refundOwnerDecisionAt ?? null).toBeNull();
    expect(failed.job.refundExecution?.failureCode).toBe("expired_or_canceled_card");
    expect(notices(failed.envelope, "refund_issued")).toHaveLength(0);
    expect(failed.envelope.ownerDecisionInteractions?.[0].status).toBe("waiting_owner");
  });

  it("ignores a provider event for a different refund id", () => {
    const approved = approve(envelope());
    if (!approved.ok) throw new Error("approval failed");
    const accepted = applyRefundProviderOutcome(
      approved.envelope,
      campaign(),
      JOB_ID,
      refundOutcomeFromStripeRefund(stripeRefund()),
      { clientId: "client-1" },
    );
    if (!accepted.ok) throw new Error("accept failed");
    const other = applyRefundProviderOutcome(
      accepted.envelope,
      campaign(),
      JOB_ID,
      refundOutcomeFromStripeRefund(stripeRefund({ id: "re_other", status: "failed" })),
      { clientId: "client-1" },
    );
    expect(other.ok && other.changed).toBe(false);
  });
});

describe("Stripe refund webhook", () => {
  it("routes refund lifecycle events to refund reconciliation", async () => {
    const reconcileRefund = vi.fn(async () => ({
      applied: true as const,
      changed: true,
      stage: "completed" as const,
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
    }));
    const refund = stripeRefund({ status: "succeeded" });
    const stripe = {
      webhooks: {
        constructEvent: () => ({ id: "evt_test_refund", type: "refund.updated", data: { object: refund } }),
      },
    } as unknown as Stripe;
    const result = await handleStripeWebhook("{}", "sig", {
      stripe,
      env: { STRIPE_SECRET_KEY: "sk_test_unit", STRIPE_WEBHOOK_SECRET: "whsec_unit", NODE_ENV: "test" } as unknown as NodeJS.ProcessEnv,
      reconcileRefund,
    });
    expect(result.ok).toBe(true);
    expect(reconcileRefund).toHaveBeenCalledWith(refund);
    if (result.ok) expect(result.refund).toMatchObject({ applied: true, stage: "completed" });
  });
});
