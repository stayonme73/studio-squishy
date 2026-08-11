import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveCheckoutAmountCents, skuSetsMatch } from "./amount";
import { applyPaidTruthToCampaignRecord } from "./apply-paid-record";
import { confirmPaymentFromProcessor } from "./confirm";
import { createCheckoutSession } from "./create-session";
import {
  assertStripeSafeForTests,
  inferStripeMode,
  inspectStripeSecretKey,
  isStripeConfigured,
} from "./env";
import { isDeveloperCheckoutSandboxVisible } from "./hosted-checkout-ui";
import { writeCheckoutSessionBinding } from "./events-store";
import { confirmSandboxCheckoutSession } from "./sandbox-confirm";
import { handleStripeWebhook } from "./webhook";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";
import type { CampaignRecord } from "@/config/studio-board";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { markPaymentReceived } from "@/lib/studio-board-campaign";

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: ["v2-rtu-flyer"],
    projectNeed: "Need a flyer for our spring open house",
    businessName: "Cedar Lane",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
    ...overrides,
  };
}

function unpaidCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
  return {
    campaignId,
    campaignName: "Cedar Lane",
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Awaiting payment",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: null,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: [],
      approvedAt: now,
    },
  };
}

describe("STUDIO-OPERATING-PAYMENT-TRUTH-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps sandbox fixture out of the normal customer checkout journey", () => {
    expect(
      isDeveloperCheckoutSandboxVisible({
        env: { NODE_ENV: "development" } as NodeJS.ProcessEnv,
        search: "",
      }),
    ).toBe(false);
  });

  it("derives amount server-side from selected SKUs", () => {
    const derived = deriveCheckoutAmountCents(["v2-rtu-flyer"]);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
    expect(derived.amountCents).toBe(totals.amountDueTodayCents);
    expect(derived.amountCents).toBeGreaterThan(0);
  });

  it("rejects checkout without CLEAR", async () => {
    const result = await createCheckoutSession({
      campaignId: `pay-truth-clear-${Date.now()}`,
      facts: clearFacts({ projectNeed: "" }),
      returnOrigin: "http://localhost:3000",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("clear_required");
  });

  it("Complete Checkout without Stripe keys does not invent a sandbox session", async () => {
    const result = await createCheckoutSession({
      campaignId: `pay-truth-no-stripe-${Date.now()}`,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("processor_not_configured");
  });

  it("rejects non-secret Stripe key formats (e.g. mk_) before calling Stripe", async () => {
    expect(
      inspectStripeSecretKey({
        STRIPE_SECRET_KEY: "mk_1U32K_not_a_secret",
      } as NodeJS.ProcessEnv).status,
    ).toBe("invalid_format");
    expect(
      isStripeConfigured({
        STRIPE_SECRET_KEY: "mk_1U32K_not_a_secret",
      } as NodeJS.ProcessEnv),
    ).toBe(false);

    const result = await createCheckoutSession(
      {
        campaignId: `pay-truth-bad-key-${Date.now()}`,
        facts: clearFacts(),
        returnOrigin: "http://localhost:3000",
      },
      {
        env: {
          ...process.env,
          STRIPE_SECRET_KEY: "mk_1U32K_not_a_secret",
          NODE_ENV: "test",
        } as NodeJS.ProcessEnv,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("processor_credentials_invalid");
  });

  it("creates sandbox session then confirms paid truth only when preferSandbox", async () => {
    const campaignId = `pay-truth-sandbox-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));

    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.mode).toBe("sandbox");

    const before = await readCampaignEnvelope(campaignId);
    expect(before?.record.paymentReceivedAt).toBeFalsy();

    const confirmed = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentReceivedAt).toBeTruthy();
    expect(confirmed.campaign.paymentTruth?.status).toBe("confirmed");
    expect(confirmed.campaign.paymentTruth?.sandbox).toBe(true);
    expect(confirmed.campaign.paymentTruth?.expectedAmountCents).toBe(
      started.expectedAmountCents,
    );
    expect(confirmed.campaign.preAcceptancePaymentAuthorization?.outcome).toBe(
      "CLEAR_TO_ACCEPT",
    );
    // Post-pay activation consumer — paid wakes without File Room visit.
    expect(confirmed.campaign.postPayActivation?.status).toBe("activated");
    expect(confirmed.campaign.postPayActivation?.ownerActionRequired).toBe(false);

    const again = await confirmSandboxCheckoutSession(started.checkoutSessionId);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.alreadyPaid).toBe(true);
  });

  it("rejects amount mismatch fail-closed", async () => {
    const campaignId = `pay-truth-amt-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const decision = evaluatePreAcceptance(clearFacts());
    const authorization = buildPreAcceptancePaymentAuthorization(decision)!;
    const amount = deriveCheckoutAmountCents(["v2-rtu-flyer"]);
    if (!amount.ok) throw new Error("expected amount");

    await writeCheckoutSessionBinding({
      checkoutSessionId: "cs_test_mismatch",
      campaignId,
      expectedAmountCents: amount.amountCents,
      currency: "usd",
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      createdAt: new Date().toISOString(),
    });

    const result = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: "cs_test_mismatch",
      expectedAmountCents: amount.amountCents,
      confirmedAmountCents: amount.amountCents + 50,
      currency: "usd",
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      authorization,
      stripeEventId: "evt_mismatch",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("amount_mismatch");
  });

  it("rejects transaction reuse across projects", async () => {
    const a = `pay-truth-reuse-a-${Date.now()}`;
    const b = `pay-truth-reuse-b-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(a));
    await upsertCampaignRecord(unpaidCampaign(b));
    const decision = evaluatePreAcceptance(clearFacts());
    const authorization = buildPreAcceptancePaymentAuthorization(decision)!;
    const amount = deriveCheckoutAmountCents(["v2-rtu-flyer"]);
    if (!amount.ok) throw new Error("expected amount");

    await writeCheckoutSessionBinding({
      checkoutSessionId: "cs_test_reuse",
      campaignId: a,
      expectedAmountCents: amount.amountCents,
      currency: "usd",
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      createdAt: new Date().toISOString(),
    });

    const result = await confirmPaymentFromProcessor({
      campaignId: b,
      checkoutSessionId: "cs_test_reuse",
      expectedAmountCents: amount.amountCents,
      confirmedAmountCents: amount.amountCents,
      currency: "usd",
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      authorization,
      stripeEventId: "evt_reuse",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("transaction_reuse");
  });

  it("rejects invalid webhook signature", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
    const result = await handleStripeWebhook(
      Buffer.from("{}"),
      "t=1,v1=bad",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_signature");
  });

  it("client sync cannot invent paymentReceivedAt", () => {
    const existing = unpaidCampaign("sync-lock");
    const forged = {
      ...existing,
      paymentReceivedAt: new Date().toISOString(),
    };
    const merged = mergeCustomerOwnedCampaignSync(existing, forged);
    expect(merged.paymentReceivedAt).toBeFalsy();
  });

  it("legacy markPaymentReceived without authority does not pay", () => {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => storage.get(k) ?? null,
          setItem: (k: string, v: string) => storage.set(k, v),
          removeItem: (k: string) => storage.delete(k),
        },
        dispatchEvent: () => true,
      },
    });
    storage.set(
      "studio-squishy:current-campaign",
      JSON.stringify(unpaidCampaign("local-block")),
    );
    expect(markPaymentReceived()).toBeNull();
  });

  it("forbids live Stripe mode during tests", () => {
    expect(() =>
      assertStripeSafeForTests({
        NODE_ENV: "test",
        STRIPE_SECRET_KEY: "sk_live_should_never_run_in_tests",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/live mode is forbidden/);
    expect(
      inferStripeMode({
        STRIPE_SECRET_KEY: "sk_test_abc",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("test");
  });

  it("applyPaidTruth records reconstructable payment fields", () => {
    const decision = evaluatePreAcceptance(clearFacts());
    const authorization = buildPreAcceptancePaymentAuthorization(decision)!;
    const amount = deriveCheckoutAmountCents(["v2-rtu-flyer"]);
    if (!amount.ok) throw new Error("expected amount");
    const paid = applyPaidTruthToCampaignRecord(unpaidCampaign("rec"), {
      campaignId: "rec",
      checkoutSessionId: "cs_x",
      paymentIntentId: "pi_x",
      expectedAmountCents: amount.amountCents,
      confirmedAmountCents: amount.amountCents,
      currency: "usd",
      selectedServiceIds: amount.skuIds,
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: 1,
      authorization,
      stripeEventId: "evt_x",
    });
    expect(paid.paymentReceivedAt).toBeTruthy();
    expect(paid.paymentTruth?.processor).toBe("stripe");
    expect(paid.paymentTruth?.checkoutSessionId).toBe("cs_x");
    expect(paid.paymentTruth?.paymentIntentId).toBe("pi_x");
    expect(skuSetsMatch(paid.paymentTruth!.selectedServiceIds, ["v2-rtu-flyer"])).toBe(
      true,
    );
  });

  it("surfaces Stripe API failures as processor_session_failed (no throw)", async () => {
    const campaignId = `pay-truth-stripe-fail-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const create = vi.fn(async () => {
      throw Object.assign(new Error("Invalid API Key provided"), {
        type: "StripeAuthenticationError",
      });
    });
    const result = await createCheckoutSession(
      {
        campaignId,
        facts: clearFacts(),
        returnOrigin: "http://localhost:3000",
      },
      {
        stripe: { checkout: { sessions: { create } } } as never,
        env: {
          ...process.env,
          STRIPE_SECRET_KEY: "sk_test_dummy_for_unit",
          NODE_ENV: "test",
        } as NodeJS.ProcessEnv,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("processor_session_failed");
    expect(create).toHaveBeenCalledOnce();
  });

  it("mocked Stripe session create binds metadata and returns hosted URL", async () => {
    const campaignId = `pay-truth-stripe-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const amount = deriveCheckoutAmountCents(["v2-rtu-flyer"]);
    if (!amount.ok) throw new Error("expected amount");

    const create = vi.fn(async () => ({
      id: "cs_test_hosted",
      url: "https://checkout.stripe.com/c/pay/cs_test_hosted",
    }));
    const stripe = { checkout: { sessions: { create } } };

    const result = await createCheckoutSession(
      {
        campaignId,
        facts: clearFacts(),
        returnOrigin: "http://localhost:3000",
      },
      {
        stripe: stripe as never,
        env: {
          ...process.env,
          STRIPE_SECRET_KEY: "sk_test_dummy_for_unit",
          NODE_ENV: "test",
        } as NodeJS.ProcessEnv,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.mode !== "stripe") return;
    expect(result.url).toContain("checkout.stripe.com");
    expect(create).toHaveBeenCalledOnce();
    const call = create.mock.calls[0] as
      | [{ line_items: { price_data: { unit_amount: number } }[]; metadata: Record<string, string> }]
      | undefined;
    expect(call?.[0]?.line_items[0]?.price_data.unit_amount).toBe(amount.amountCents);
    expect(call?.[0]?.metadata.studio_campaign_id).toBe(campaignId);
    expect(call?.[0]?.metadata.studio_amount_cents).toBe(String(amount.amountCents));
  });
});
