import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { applyOwnerApproveRefund } from "@/lib/job-control/owner-decision-job-actions";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { evaluateRefundExecutionPlan } from "@/lib/studio-payment/refund-execution";
import { runApprovedRefundExecution } from "@/lib/studio-payment/refund-execution-run";
import { maximumApprovedFullRefundCents } from "@/lib/studio-payment/thank-you-refund";

import { resolveStudioExtrasCustomerView } from "./customer-view";
import { issueStudioExtrasCourtesyRefund, reconcileCourtesyStripeRefund } from "./courtesy-refund";
import {
  evaluateStudioExtrasCourtesy,
  initialStudioExtrasTruth,
  recordStudioExtraAttempt,
  recordStudioExtraQuality,
  refreshStudioExtrasInputs,
} from "./machine";
import { runStudioExtrasProduction, studioExtraUnitAdapters, type UnitAdapter } from "./production";
import type { CampaignStudioExtras, StudioExtraId } from "./types";

const AT = "2026-10-18T17:00:00.000Z";
const TEST_ENV = { STRIPE_SECRET_KEY: "sk_test_unit" } as unknown as NodeJS.ProcessEnv;
const CAMPAIGN_ID = "courtesy-social-1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;
const repoRoot = mkdtempSync(path.join(tmpdir(), "courtesy-refund-"));
afterAll(() => rmSync(repoRoot, { recursive: true, force: true }));

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@example.com",
  displayName: "Owner",
  roles: ["owner"],
};

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Harbor Social",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Social & Promo Graphics",
    paymentReceivedAt: AT,
    condensedOffer: {
      packageId: "social_and_promo_graphics",
      name: "Social & Promo Graphics",
      priceCents: 19900,
      listPriceCents: 19900,
      thankYouDiscountCents: 3980,
      amountDueCents: 15920,
      revisionRounds: 3,
      customerName: "Harbor",
      customerEmail: "harbor@example.com",
      company: "Harbor and Oak",
      projectNeed: "",
      materialsNote: "",
      support: {},
      extras: ["flyer"],
    } as never,
    routeMapIntakeDraft: {
      answers: {
        "social_and_promo_graphics:purpose": "Fall pie preorders.",
        "social_and_promo_graphics:cta": "Order at anasbakery.com or call 555-123-4567",
      },
      savedAt: AT,
    },
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
      approvedAt: AT,
    },
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  } as CampaignRecord;
}

function job(): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    skuId: "sm-001",
    serviceName: "Social & Promo Graphics",
    spineStatus: "ready_for_queue",
    productionLane: "quick",
    intakeComplete: true,
    updatedAt: AT,
  };
}

function envelope(): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    tasks: [],
    planFingerprint: "fp",
    updatedAt: AT,
    syncedAt: AT,
    version: 11,
    jobRecords: [job()],
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
        createdAt: AT,
        updatedAt: AT,
      } as never,
    ],
  };
}

function stripeRefund(amount: number, status: Stripe.Refund["status"], id = "re_courtesy_1"): Stripe.Refund {
  return {
    id,
    object: "refund",
    amount,
    status,
    created: 1791648000,
    currency: "usd",
    metadata: {
      studioCampaignId: CAMPAIGN_ID,
      studioCourtesy: "1",
      studioRefundAttempt: "1",
    },
  } as Stripe.Refund;
}

function fakeStripe(create: () => Promise<Stripe.Refund>) {
  const spy = vi.fn(create);
  return { client: { refunds: { create: spy } } as unknown as Pick<Stripe, "refunds">, spy };
}

function memory(start: CampaignRecord) {
  let record = start;
  const writes: CampaignRecord[] = [];
  return {
    writes,
    current: () => record,
    deps: {
      env: TEST_ENV,
      now: AT,
      readCampaign: async () => record,
      writeCampaign: async (next: CampaignRecord) => {
        record = next;
        writes.push(next);
        return next;
      },
      readTasks: async () => null as ServerTasksEnvelope | null,
    },
  };
}

function exhaust(truth: CampaignStudioExtras, id: StudioExtraId, unitId: string): CampaignStudioExtras {
  let next = truth;
  const budget = next.records.find((record) => record.id === id)?.units.find((unit) => unit.unitId === unitId)?.budget ?? 3;
  for (let i = 0; i < budget; i += 1) {
    next = recordStudioExtraAttempt(next, id, unitId, { route: "primary", at: AT, outcome: "failed", reasons: ["QA"] });
  }
  const unit = next.records.find((record) => record.id === id)?.units.find((entry) => entry.unitId === unitId);
  if (unit?.recovery.available) {
    next = recordStudioExtraAttempt(next, id, unitId, { route: "recovery", at: AT, outcome: "failed", reasons: ["QA"] });
  }
  return recordStudioExtraQuality(next, id, unitId, { at: AT, outcome: "below_standard", summary: "Below Studio standard." });
}

function ready(extras: StudioExtraId[]): CampaignStudioExtras {
  return refreshStudioExtrasInputs(
    initialStudioExtrasTruth("social_and_promo_graphics", extras, AT),
    {
      offer: "Fall pie preorders.",
      cta: "Call 555-123-4567",
      contact: "555-123-4567",
      menu_kind: "menu",
      menu_items: "Pie | $12",
      menu_notes: "Ask about allergies.",
      logo: "logo.png",
      text_consent: "yes",
    },
    AT,
  );
}

function failingAdapter(): UnitAdapter {
  return async (ctx) => {
    const n = ctx.route === "recovery" ? 1 : ctx.remainingBudget;
    return {
      ok: false,
      attempts: Array.from({ length: n }, () => ({ outcome: "failed" as const, reasons: ["QA: text overflow"] })),
      artifacts: [],
      qualitySummary: "Text cannot fit legibly.",
    };
  };
}

async function produceExhaustedFlyer(): Promise<CampaignRecord> {
  const start = campaign({
    studioExtras: initialStudioExtrasTruth("social_and_promo_graphics", ["flyer"], AT),
  });
  const adapters = Object.fromEntries(Object.keys(studioExtraUnitAdapters).map((key) => [key, failingAdapter()])) as Record<string, UnitAdapter>;
  const run = await runStudioExtrasProduction({ repoRoot, campaign: start, materials: [], adapters });
  return { ...start, studioExtras: run.truth ?? undefined };
}

describe("Courtesy Adjustment partial refund", () => {
  it("returns 5% through Machine after one exhausted Extra, and does not say the money is back until Stripe succeeds", async () => {
    const produced = await produceExhaustedFlyer();
    expect(produced.studioExtras?.courtesy).toMatchObject({
      status: "COURTESY_ADJUSTMENT_REQUIRED",
      percent: 5,
      dueCents: 796,
      paymentExecution: "not_started",
    });
    expect(produced.studioExtras?.records[0]?.state).toBe("exhausted");
    const store = memory(produced);
    const stripe = fakeStripe(async () => stripeRefund(796, "pending"));
    const accepted = await issueStudioExtrasCourtesyRefund(produced, { ...store.deps, stripe: stripe.client });
    expect(stripe.spy).toHaveBeenCalledTimes(1);
    expect(stripe.spy.mock.calls[0]?.[0]).toMatchObject({ amount: 796, payment_intent: "pi_test_social" });
    expect(stripe.spy.mock.calls[0]?.[1]).toMatchObject({ idempotencyKey: "courtesy:courtesy-social-1:flyer:5" });
    expect(accepted.studioExtras?.courtesy).toMatchObject({
      paymentExecution: "accepted",
      status: "COURTESY_ADJUSTMENT_REQUIRED",
      stripeRefundId: "re_courtesy_1",
      ownerAttention: "notice",
    });
    expect(accepted.campaignStatus).toBe("BUILDING_CONCEPTS");
    expect(accepted.studioExtras?.records[0]?.state).toBe("exhausted");
    const pendingView = await resolveStudioExtrasCustomerView(accepted, repoRoot);
    expect(pendingView?.courtesy?.message).toBe(
      "A 5% Courtesy Adjustment of $7.96 was accepted by the payment processor. It has not completed, so it is not back on your card yet.",
    );
    expect(pendingView?.courtesy?.message).not.toContain("was returned");

    const completedRefund = stripeRefund(796, "succeeded");
    const replay = await reconcileCourtesyStripeRefund(completedRefund, store.deps);
    const again = await reconcileCourtesyStripeRefund(completedRefund, store.deps);
    expect(replay).toMatchObject({ applied: true, changed: true, jobId: "courtesy" });
    expect(again).toMatchObject({ applied: true, changed: false });
    expect(stripe.spy).toHaveBeenCalledTimes(1);
    const completed = store.current();
    expect(completed.studioExtras?.courtesy).toMatchObject({
      status: "issued",
      paymentExecution: "completed",
      ownerAttention: "notice",
    });
    expect(completed.studioExtras?.courtesy?.ownerNotice).toBe(
      "Tagia, one Studio Extra exhausted after the required recovery path. The 5% courtesy adjustment was applied and recorded. No action is needed from you.",
    );
    const doneView = await resolveStudioExtrasCustomerView(completed, repoRoot);
    expect(doneView?.courtesy?.message).toBe("A 5% Courtesy Adjustment of $7.96 was returned to your original card.");
    expect(maximumApprovedFullRefundCents(completed)).toBe(15124);
  });

  it("returns 10% for two exhausted Extras and does not send a second refund when Machine runs again", async () => {
    let truth = ready(["flyer", "menu_price_list"]);
    truth = exhaust(truth, "flyer", "flyer");
    truth = exhaust(truth, "menu_price_list", "menu");
    const start = campaign({ studioExtras: truth });
    expect(evaluateStudioExtrasCourtesy(truth, start, AT)).toMatchObject({ percent: 10, dueCents: 1592 });
    const store = memory(start);
    const stripe = fakeStripe(async () => stripeRefund(1592, "succeeded", "re_courtesy_10"));
    const first = await issueStudioExtrasCourtesyRefund(start, { ...store.deps, stripe: stripe.client });
    const second = await issueStudioExtrasCourtesyRefund(first, { ...store.deps, stripe: stripe.client });
    expect(stripe.spy).toHaveBeenCalledTimes(1);
    expect(stripe.spy.mock.calls[0]?.[0]).toMatchObject({ amount: 1592 });
    expect(second.studioExtras?.courtesy?.paymentExecution).toBe("completed");
    expect(second.studioExtras?.records.every((record) => record.state === "exhausted")).toBe(true);
  });

  it("does not refund when no Extra is exhausted", async () => {
    const start = campaign({ studioExtras: ready(["flyer"]) });
    const stripe = fakeStripe(async () => stripeRefund(796, "pending"));
    const result = await issueStudioExtrasCourtesyRefund(start, { ...memory(start).deps, stripe: stripe.client });
    expect(stripe.spy).not.toHaveBeenCalled();
    expect(result.studioExtras?.courtesy?.status).toBe("not_eligible");
  });

  it("keeps one refund when two Machine sends overlap, and a definitive failure uses a new key", async () => {
    const start = campaign({ studioExtras: exhaust(ready(["flyer"]), "flyer", "flyer") });
    const store = memory(start);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const stripe = fakeStripe(async () => {
      await gate;
      return stripeRefund(796, "pending");
    });
    const first = issueStudioExtrasCourtesyRefund(start, { ...store.deps, stripe: stripe.client });
    const second = issueStudioExtrasCourtesyRefund(start, { ...store.deps, stripe: stripe.client });
    release();
    const [left, right] = await Promise.all([first, second]);
    expect(stripe.spy).toHaveBeenCalledTimes(1);
    expect(left.studioExtras?.courtesy?.stripeRefundId).toBe("re_courtesy_1");
    expect(right.studioExtras?.courtesy?.stripeRefundId).toBe("re_courtesy_1");

    const failed = campaign({ studioExtras: exhaust(ready(["flyer"]), "flyer", "flyer") });
    const failedStore = memory(failed);
    const definite = fakeStripe(async () => {
      throw Object.assign(new Error("Charge already refunded"), { type: "StripeInvalidRequestError", code: "charge_already_refunded" });
    });
    const refused = await issueStudioExtrasCourtesyRefund(failed, { ...failedStore.deps, stripe: definite.client });
    expect(refused.studioExtras?.courtesy?.paymentExecution).toBe("failed");
    expect(refused.studioExtras?.courtesy?.ownerAttention).toBe("exception");
    const refusedView = await resolveStudioExtrasCustomerView(refused, repoRoot);
    expect(refusedView?.courtesy?.message).toContain("could not be returned");
    expect(refusedView?.courtesy?.message).not.toContain("was returned");
    const retried = fakeStripe(async () => stripeRefund(796, "pending", "re_courtesy_retry"));
    const again = await issueStudioExtrasCourtesyRefund(refused, { ...failedStore.deps, stripe: retried.client });
    expect(retried.spy.mock.calls[0]?.[1]).toMatchObject({ idempotencyKey: "courtesy:courtesy-social-1:flyer:5:attempt-2" });
    expect(again.studioExtras?.courtesy?.paymentExecution).toBe("accepted");
  });

  it("treats an ambiguous Stripe error as unconfirmed and does not create another refund", async () => {
    const start = campaign({ studioExtras: exhaust(ready(["flyer"]), "flyer", "flyer") });
    const store = memory(start);
    const stripe = fakeStripe(async () => {
      throw Object.assign(new Error("connection reset"), { type: "StripeConnectionError" });
    });
    const uncertain = await issueStudioExtrasCourtesyRefund(start, { ...store.deps, stripe: stripe.client });
    expect(uncertain.studioExtras?.courtesy?.paymentExecution).toBe("uncertain");
    expect(uncertain.studioExtras?.courtesy?.ownerAttention).toBe("exception");
    const view = await resolveStudioExtrasCustomerView(uncertain, repoRoot);
    expect(view?.courtesy?.message).toContain("could not be confirmed");
    expect(view?.courtesy?.message).not.toContain("was returned");
    await issueStudioExtrasCourtesyRefund(uncertain, { ...store.deps, stripe: stripe.client });
    expect(stripe.spy).toHaveBeenCalledTimes(1);
    const completed = await reconcileCourtesyStripeRefund(stripeRefund(796, "succeeded"), {
      ...store.deps,
      readCampaign: async () => uncertain,
    });
    expect(completed).toMatchObject({ applied: true, changed: true });
    expect(store.current().studioExtras?.courtesy?.paymentExecution).toBe("completed");
  });

  it("leaves a later package refund at $151.24 and refuses a stale refund of the original $159.20", async () => {
    const exhausted = campaign({ studioExtras: exhaust(ready(["flyer"]), "flyer", "flyer") });
    const store = memory(exhausted);
    const stripe = fakeStripe(async () => stripeRefund(796, "succeeded"));
    const adjusted = await issueStudioExtrasCourtesyRefund(exhausted, { ...store.deps, stripe: stripe.client });
    expect(maximumApprovedFullRefundCents(adjusted)).toBe(15124);

    const tooMuch = applyOwnerApproveRefund(envelope(), adjusted, JOB_ID, { reason: "Cancel.", amountCents: 15920 }, owner, "client-1", { env: TEST_ENV });
    expect(tooMuch.ok).toBe(false);

    const approved = applyOwnerApproveRefund(envelope(), adjusted, JOB_ID, { reason: "Cancel." }, owner, "client-1", { env: TEST_ENV });
    expect(approved.ok).toBe(true);
    if (!approved.ok || !approved.refundExecutionPlan) throw new Error("approval failed");
    expect(approved.refundExecutionPlan.amountCents).toBe(15124);

    const tasks = { writes: [] as ServerTasksEnvelope[], current: approved.envelope };
    const full = fakeStripe(async () => stripeRefund(15124, "pending", "re_full_1"));
    const run = await runApprovedRefundExecution({
      envelope: approved.envelope,
      campaign: adjusted,
      clientId: "client-1",
      plan: approved.refundExecutionPlan,
      deps: {
        stripe: full.client,
        env: TEST_ENV,
        write: async (next) => {
          tasks.writes.push(next);
          tasks.current = next;
          return next;
        },
        readCampaign: async () => adjusted,
      },
    });
    expect(full.spy.mock.calls[0]?.[0]).toMatchObject({ amount: 15124 });
    expect(run.stage).toBe("processing");
    expect(adjusted.studioExtras?.courtesy?.paymentExecution).toBe("completed");

    const before = campaign();
    const early = applyOwnerApproveRefund(envelope(), before, JOB_ID, { reason: "Cancel." }, owner, "client-1", { env: TEST_ENV });
    if (!early.ok || !early.refundExecutionPlan) throw new Error("early approval failed");
    expect(early.refundExecutionPlan.amountCents).toBe(15920);
    const staleStripe = fakeStripe(async () => stripeRefund(15920, "pending", "re_stale"));
    const stale = await runApprovedRefundExecution({
      envelope: early.envelope,
      campaign: before,
      clientId: "client-1",
      plan: early.refundExecutionPlan,
      deps: {
        stripe: staleStripe.client,
        env: TEST_ENV,
        write: async (next) => next,
        readCampaign: async () => adjusted,
      },
    });
    expect(staleStripe.spy).not.toHaveBeenCalled();
    expect(stale.outcome).toMatchObject({ kind: "rejected", code: "amount_invalid" });
  });

  it("does not call Stripe for sandbox, unpaid, or missing payment details, or in live mode", async () => {
    const exhausted = exhaust(ready(["flyer"]), "flyer", "flyer");
    const cases = [
      campaign({ studioExtras: exhausted, paymentTruth: { ...campaign().paymentTruth!, sandbox: true } }),
      campaign({ studioExtras: exhausted, paymentTruth: { ...campaign().paymentTruth!, status: "pending" as never, confirmedAmountCents: 0 } }),
      campaign({ studioExtras: exhausted, paymentTruth: { ...campaign().paymentTruth!, paymentIntentId: null } }),
      campaign({ studioExtras: ready(["flyer"]) }),
    ];
    for (const record of cases) {
      const stripe = fakeStripe(async () => stripeRefund(796, "pending"));
      await issueStudioExtrasCourtesyRefund(record, { ...memory(record).deps, stripe: stripe.client });
      expect(stripe.spy).not.toHaveBeenCalled();
    }
    const live = fakeStripe(async () => stripeRefund(796, "pending"));
    const blocked = await issueStudioExtrasCourtesyRefund(campaign({ studioExtras: exhausted }), {
      ...memory(campaign({ studioExtras: exhausted })).deps,
      stripe: live.client,
      env: { STRIPE_SECRET_KEY: "sk_live_unit", STRIPE_MODE: "live" } as unknown as NodeJS.ProcessEnv,
    });
    expect(live.spy).not.toHaveBeenCalled();
    expect(blocked.studioExtras?.courtesy?.failureReason).toBe("live_mode_blocked");
    expect(blocked.studioExtras?.courtesy?.ownerAttention).toBe("exception");
    const view = await resolveStudioExtrasCustomerView(blocked, repoRoot);
    expect(view?.courtesy?.message).not.toContain("was returned");
  });
});
