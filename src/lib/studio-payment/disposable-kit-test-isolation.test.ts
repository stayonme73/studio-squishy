import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import { watchdogSweepMayDeliverCampaign } from "@/lib/studio-lifecycle-email/watchdog-sweep-eligibility";

const recoverPaidOperatingChain = vi.fn(async (campaign: CampaignRecord) => ({
  ok: true,
  campaign,
}));
const sweepPaidActivationRecovery = vi.fn(async () => ({ swept: 0 }));
const ensureDispatchExecution = vi.fn(async (campaign: CampaignRecord) => ({
  ok: true,
  campaign,
  dispatch: null,
}));
const ensurePostPayActivation = vi.fn(async (campaign: CampaignRecord) => ({
  campaign,
}));
const ensureRoutingHandoff = vi.fn(async (campaign: CampaignRecord) => ({
  campaign,
}));
const readCampaignEnvelope = vi.fn();
const upsertCampaignRecord = vi.fn(
  async (record: CampaignRecord, clientUserId: string | null) => ({
    record,
    clientUserId,
  }),
);
const listCampaignEnvelopes = vi.fn(async () => [] as Array<{ record: CampaignRecord }>);
const readCheckoutSessionBinding = vi.fn();

vi.mock("@/lib/studio-paid-activation-recovery", () => ({
  recoverPaidOperatingChain: (...args: unknown[]) =>
    recoverPaidOperatingChain(...(args as [CampaignRecord])),
  sweepPaidActivationRecovery: (...args: unknown[]) =>
    sweepPaidActivationRecovery(...args),
}));

vi.mock("@/lib/studio-dispatch/ensure", () => ({
  ensureDispatchExecution: (...args: unknown[]) =>
    ensureDispatchExecution(...(args as [CampaignRecord])),
}));

vi.mock("@/lib/studio-post-pay-activation", () => ({
  ensurePostPayActivation: (...args: unknown[]) =>
    ensurePostPayActivation(...(args as [CampaignRecord])),
}));

vi.mock("@/lib/studio-routing-handoff", () => ({
  ensureRoutingHandoff: (...args: unknown[]) =>
    ensureRoutingHandoff(...(args as [CampaignRecord])),
}));

vi.mock("@/lib/campaign-store/store", () => ({
  readCampaignEnvelope: (...args: unknown[]) => readCampaignEnvelope(...args),
  upsertCampaignRecord: (...args: unknown[]) => upsertCampaignRecord(...args),
  listCampaignEnvelopes: (...args: unknown[]) => listCampaignEnvelopes(...args),
}));

vi.mock("@/lib/studio-payment/events-store", () => ({
  readCheckoutSessionBinding: (...args: unknown[]) =>
    readCheckoutSessionBinding(...args),
}));

import { activateAfterPayment } from "./confirm";
import {
  buildCondensedCheckoutCampaign,
  resolveCondensedCheckoutOffer,
} from "./condensed-offer";
import {
  assertDisposableKitTestCheckout,
  bindDisposableKitTestCheckoutSession,
  createDisposableCampaignLaunchKitTestProject,
  disposableKitTestIsolationMarker,
  disposableKitTestMustStayIsolated,
  sealDisposableKitStripeTestProof,
  skipsProductionForDisposableKitTest,
  DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS,
  DISPOSABLE_KIT_TEST_CLIENT_USER_ID,
  DISPOSABLE_KIT_TEST_LIST_PRICE_CENTS,
} from "./disposable-kit-test-isolation";
import { submitPaidIntakeByCheckoutSession } from "./intake-submit";

const TEST_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
  STRIPE_MODE: "test",
  STRIPE_SECRET_KEY: "sk_test_isolation_not_a_real_key",
};

function kitCampaign(
  extra: Partial<CampaignRecord> = {},
): CampaignRecord {
  return {
    campaignId: "disposable-kit-pay-intake-isolation",
    campaignName: "Disposable kit isolation",
    campaignStatus: "INTAKE",
    campaignDescription: "Disposable.",
    estimatedCompletion: "",
    packageId: "campaign_launch_kit",
    packageLabel: "Campaign Launch Kit",
    paymentReceivedAt: "2026-10-21T12:00:00.000Z",
    condensedOffer: {
      packageId: "campaign_launch_kit",
      name: "Campaign Launch Kit",
      priceCents: 34900,
      listPriceCents: 34900,
      thankYouDiscountCents: 6980,
      amountDueCents: 27920,
      revisionRounds: 3,
      customerName: "Disposable Kit",
      customerEmail: "kit-isolation@local.dev",
      company: "Isolation Check",
      projectNeed: "Prove intake.",
      materialsNote: "",
      support: {},
    },
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 27920,
      confirmedAmountCents: 27920,
      checkoutSessionId: "cs_test_isolation",
      selectedServiceIds: ["campaign_launch_kit"],
      decisionId: "decision-isolation",
      factFingerprint: "fingerprint",
      draftRevision: 1,
      confirmedAt: "2026-10-21T12:00:00.000Z",
      sandbox: false,
    },
    testPaymentIsolation: disposableKitTestIsolationMarker(),
    ...extra,
  } as CampaignRecord;
}

function sealedKit(extra: Partial<CampaignRecord> = {}): CampaignRecord {
  const sealed = sealDisposableKitStripeTestProof({
    campaign: kitCampaign(extra),
    checkoutSessionId: "cs_test_isolation",
    source: "stripe_webhook",
    livemode: false,
    paymentStatus: "paid",
    env: TEST_ENV,
    verifiedAt: "2026-10-21T12:01:00.000Z",
  });
  if (!sealed) throw new Error("expected the Stripe test proof to seal");
  return sealed;
}

describe("disposable kit test isolation", () => {
  const previousStripeKey = process.env.STRIPE_SECRET_KEY;
  const previousStripeMode = process.env.STRIPE_MODE;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_isolation_not_a_real_key";
    process.env.STRIPE_MODE = "test";
    recoverPaidOperatingChain.mockClear();
    sweepPaidActivationRecovery.mockClear();
    ensureDispatchExecution.mockClear();
    ensurePostPayActivation.mockClear();
    ensureRoutingHandoff.mockClear();
    readCampaignEnvelope.mockReset();
    upsertCampaignRecord.mockClear();
    listCampaignEnvelopes.mockReset();
    listCampaignEnvelopes.mockResolvedValue([]);
    readCheckoutSessionBinding.mockReset();
  });

  afterAll(() => {
    if (previousStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripeKey;
    if (previousStripeMode === undefined) delete process.env.STRIPE_MODE;
    else process.env.STRIPE_MODE = previousStripeMode;
  });

  it("skips production only when every test-only proof is present", () => {
    expect(skipsProductionForDisposableKitTest(kitCampaign(), TEST_ENV)).toBe(false);
    expect(skipsProductionForDisposableKitTest(sealedKit(), TEST_ENV)).toBe(true);
    const tampered = sealedKit();
    tampered.disposableKitStripeTestProof = {
      ...tampered.disposableKitStripeTestProof!,
      mac: "forged",
    };
    expect(skipsProductionForDisposableKitTest(tampered, TEST_ENV)).toBe(false);
    expect(
      sealDisposableKitStripeTestProof({
        campaign: kitCampaign(),
        checkoutSessionId: "cs_test_isolation",
        source: "stripe_webhook",
        livemode: true,
        paymentStatus: "paid",
        env: TEST_ENV,
      }),
    ).toBeNull();
    expect(
      sealDisposableKitStripeTestProof({
        campaign: kitCampaign(),
        checkoutSessionId: "cs_test_isolation",
        source: "stripe_retrieve",
        livemode: false,
        paymentStatus: "unpaid",
        env: TEST_ENV,
      }),
    ).toBeNull();
    expect(
      skipsProductionForDisposableKitTest(
        kitCampaign({ testPaymentIsolation: undefined }),
        TEST_ENV,
      ),
    ).toBe(false);
    expect(
      skipsProductionForDisposableKitTest(kitCampaign(), {
        ...TEST_ENV,
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      skipsProductionForDisposableKitTest(kitCampaign(), {
        ...TEST_ENV,
        STRIPE_SECRET_KEY: "sk_live_isolation_not_a_real_key",
      }),
    ).toBe(false);
    expect(
      skipsProductionForDisposableKitTest(kitCampaign(), {
        NODE_ENV: "development",
        STRIPE_MODE: "test",
      }),
    ).toBe(false);
    expect(
      skipsProductionForDisposableKitTest(
        kitCampaign({ campaignId: "harbor-oak-campaign-launch-kit" }),
        TEST_ENV,
      ),
    ).toBe(false);
    expect(
      skipsProductionForDisposableKitTest(
        kitCampaign({
          paymentTruth: {
            ...kitCampaign().paymentTruth!,
            sandbox: true,
          },
        }),
        TEST_ENV,
      ),
    ).toBe(false);
    expect(
      skipsProductionForDisposableKitTest(
        kitCampaign({
          paymentTruth: {
            ...kitCampaign().paymentTruth!,
            selectedServiceIds: ["social_and_promo_graphics"],
          },
        }),
        TEST_ENV,
      ),
    ).toBe(false);
    const mismatched = sealedKit();
    mismatched.paymentTruth = {
      ...mismatched.paymentTruth!,
      checkoutSessionId: "cs_other",
    };
    expect(skipsProductionForDisposableKitTest(mismatched, TEST_ENV)).toBe(false);
  });

  it("keeps paid recovery and the other-project sweep on a normal payment", async () => {
    const campaign = kitCampaign({ testPaymentIsolation: undefined });
    await activateAfterPayment(campaign, TEST_ENV);
    expect(recoverPaidOperatingChain).toHaveBeenCalledOnce();
    expect(sweepPaidActivationRecovery).toHaveBeenCalledOnce();
  });

  it("does not dispatch or sweep a proven disposable kit test payment", async () => {
    const campaign = sealedKit();
    const result = await activateAfterPayment(campaign, TEST_ENV);
    expect(result).toBe(campaign);
    expect(recoverPaidOperatingChain).not.toHaveBeenCalled();
    expect(sweepPaidActivationRecovery).not.toHaveBeenCalled();
    expect(ensureDispatchExecution).not.toHaveBeenCalled();
  });

  it("saves kit intake without dispatch when isolation is proven", async () => {
    const campaign = sealedKit();
    readCheckoutSessionBinding.mockResolvedValue({
      campaignId: campaign.campaignId,
    });
    readCampaignEnvelope.mockResolvedValue({
      record: campaign,
      clientUserId: "local-disposable-kit",
    });
    const result = await submitPaidIntakeByCheckoutSession({
      checkoutSessionId: "cs_test_isolation",
      answers: {
        "campaign_launch_kit:purpose": "Spring tune-up.",
      },
      submittedAt: "2026-10-21T12:05:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.campaign.routeMapIntake?.answers["campaign_launch_kit:purpose"]).toBe(
      "Spring tune-up.",
    );
    expect(recoverPaidOperatingChain).not.toHaveBeenCalled();
    expect(ensureDispatchExecution).not.toHaveBeenCalled();
    expect(ensurePostPayActivation).not.toHaveBeenCalled();
  });

  it("still recovers an owned kit when the isolation marker is absent", async () => {
    const campaign = kitCampaign({ testPaymentIsolation: undefined });
    readCheckoutSessionBinding.mockResolvedValue({
      campaignId: campaign.campaignId,
    });
    readCampaignEnvelope.mockResolvedValue({
      record: campaign,
      clientUserId: "local-disposable-kit",
    });
    const result = await submitPaidIntakeByCheckoutSession({
      checkoutSessionId: "cs_test_isolation",
      answers: { "campaign_launch_kit:purpose": "Spring tune-up." },
    });
    expect(result.ok).toBe(true);
    expect(recoverPaidOperatingChain).toHaveBeenCalledOnce();
  });

  it("refuses a customer sync that tries to turn isolation on", () => {
    const server = kitCampaign({ testPaymentIsolation: undefined });
    const incoming = kitCampaign();
    const merged = mergeCustomerOwnedCampaignSync(server, incoming);
    expect(merged.testPaymentIsolation).toBeUndefined();
    const kept = mergeCustomerOwnedCampaignSync(kitCampaign(), {
      ...kitCampaign({ testPaymentIsolation: undefined }),
      campaignName: "Renamed by customer",
    });
    expect(kept.testPaymentIsolation).toEqual(disposableKitTestIsolationMarker());
    expect(kept.campaignName).toBe("Renamed by customer");
    const spoofed = mergeCustomerOwnedCampaignSync(kitCampaign(), sealedKit());
    expect(spoofed.disposableKitStripeTestProof).toBeUndefined();
    const keptProof = mergeCustomerOwnedCampaignSync(sealedKit(), {
      ...kitCampaign(),
      campaignName: "Renamed by customer",
    });
    expect(keptProof.disposableKitStripeTestProof?.source).toBe("stripe_webhook");
  });

  it("does not recover or sweep when the marker is present and the proof is missing", async () => {
    await activateAfterPayment(kitCampaign(), TEST_ENV);
    expect(recoverPaidOperatingChain).not.toHaveBeenCalled();
    expect(sweepPaidActivationRecovery).not.toHaveBeenCalled();
    expect(ensureDispatchExecution).not.toHaveBeenCalled();
  });

  it("saves intake without production when the marker is present and the proof is missing", async () => {
    const campaign = kitCampaign();
    readCheckoutSessionBinding.mockResolvedValue({ campaignId: campaign.campaignId });
    readCampaignEnvelope.mockResolvedValue({
      record: campaign,
      clientUserId: DISPOSABLE_KIT_TEST_CLIENT_USER_ID,
    });
    const result = await submitPaidIntakeByCheckoutSession({
      checkoutSessionId: "cs_test_isolation",
      answers: { "campaign_launch_kit:purpose": "Spring tune-up." },
    });
    expect(result.ok).toBe(true);
    expect(recoverPaidOperatingChain).not.toHaveBeenCalled();
    expect(ensureDispatchExecution).not.toHaveBeenCalled();
    expect(ensurePostPayActivation).not.toHaveBeenCalled();
  });

  it("rejects a missing, forged, or mismatched marker and payment proof", () => {
    const unmarked = kitCampaign({ testPaymentIsolation: undefined });
    expect(disposableKitTestMustStayIsolated(unmarked)).toBe(false);
    expect(
      sealDisposableKitStripeTestProof({
        campaign: unmarked,
        checkoutSessionId: "cs_test_isolation",
        source: "stripe_webhook",
        livemode: false,
        paymentStatus: "paid",
        env: TEST_ENV,
      }),
    ).toBeNull();
    const forged = kitCampaign({
      testPaymentIsolation: {
        schemaVersion: "forged",
        purpose: "campaign_launch_kit_pay_intake",
        stripeMode: "test",
        disposable: true,
      } as CampaignRecord["testPaymentIsolation"],
    });
    expect(disposableKitTestMustStayIsolated(forged)).toBe(false);
    const bound = bindDisposableKitTestCheckoutSession(kitCampaign(), "cs_test_bound");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    expect(
      sealDisposableKitStripeTestProof({
        campaign: bound.campaign,
        checkoutSessionId: "cs_test_other",
        source: "stripe_webhook",
        livemode: false,
        paymentStatus: "paid",
        env: TEST_ENV,
      }),
    ).toBeNull();
    const rebound = bindDisposableKitTestCheckoutSession(bound.campaign, "cs_test_other");
    expect(rebound.ok).toBe(false);
  });

  it("keeps the server marker through checkout and ignores a customer project", () => {
    const offer = resolveCondensedCheckoutOffer("campaign_launch_kit");
    expect(offer?.listPriceCents).toBe(DISPOSABLE_KIT_TEST_LIST_PRICE_CENTS);
    expect(offer?.chargeCents).toBe(DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS);
    if (!offer) return;
    const campaignId = "disposable-kit-pay-intake-check";
    const request = {
      campaignId,
      returnOrigin: "http://127.0.0.1:3475",
      facts: {
        draftRevision: 1,
        routeId: null,
        selectedServiceIds: ["campaign_launch_kit" as const],
        projectNeed: "Check",
        businessName: "Disposable Kit",
        requestedDeadline: "",
        deadlineStatus: "not_requested" as const,
        existingMaterialsNote: "",
      },
      purchaseKind: "condensed_offer" as const,
      condensedOffer: {
        packageId: "campaign_launch_kit",
        customerName: "Disposable Kit Check",
        company: "Disposable Kit",
        projectNeed: "Check",
        materialsNote: "",
        support: {},
      },
    };
    const kept = buildCondensedCheckoutCampaign({
      campaignId,
      existing: kitCampaign({ campaignId }),
      offer,
      facts: request.facts,
      request,
    });
    expect(kept.testPaymentIsolation).toEqual(disposableKitTestIsolationMarker());
    const ordinary = buildCondensedCheckoutCampaign({
      campaignId: "ordinary-customer-checkout",
      existing: null,
      offer,
      facts: request.facts,
      request: { ...request, campaignId: "ordinary-customer-checkout" },
    });
    expect(ordinary.testPaymentIsolation).toBeUndefined();
    expect(ordinary.disposableKitStripeTestProof).toBeUndefined();
  });

  it("refuses sandbox, live mode, and the wrong price for a marked kit", () => {
    const campaign = kitCampaign({
      campaignId: "disposable-kit-pay-intake-check",
      paymentReceivedAt: null,
      paymentTruth: undefined,
    });
    expect(
      assertDisposableKitTestCheckout({
        campaign,
        amountCents: DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS,
        selectedServiceIds: ["campaign_launch_kit"],
        sandbox: false,
        env: TEST_ENV,
      }).ok,
    ).toBe(true);
    expect(
      assertDisposableKitTestCheckout({
        campaign,
        amountCents: DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS,
        selectedServiceIds: ["campaign_launch_kit"],
        sandbox: true,
        env: TEST_ENV,
      }).ok,
    ).toBe(false);
    expect(
      assertDisposableKitTestCheckout({
        campaign,
        amountCents: 34900,
        selectedServiceIds: ["campaign_launch_kit"],
        sandbox: false,
        env: TEST_ENV,
      }).ok,
    ).toBe(false);
    expect(
      assertDisposableKitTestCheckout({
        campaign,
        amountCents: DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS,
        selectedServiceIds: ["campaign_launch_kit"],
        sandbox: false,
        env: { ...TEST_ENV, STRIPE_SECRET_KEY: "sk_live_not_a_real_key", STRIPE_MODE: "live" },
      }).ok,
    ).toBe(false);
    expect(
      assertDisposableKitTestCheckout({
        campaign: kitCampaign({ testPaymentIsolation: undefined }),
        amountCents: 100,
        selectedServiceIds: ["clip_repurposing"],
        sandbox: true,
        env: TEST_ENV,
      }).ok,
    ).toBe(true);
  });

  it("creates one marked kit and refuses a second, a protected id, or a live key", async () => {
    readCampaignEnvelope.mockResolvedValue(null);
    const created = await createDisposableCampaignLaunchKitTestProject({
      campaignId: "disposable-kit-pay-intake-check",
      env: TEST_ENV,
      now: "2026-10-22T01:30:00.000Z",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.campaign.testPaymentIsolation).toEqual(disposableKitTestIsolationMarker());
    expect(created.campaign.disposableKitStripeTestProof).toBeUndefined();
    expect(created.campaign.condensedOffer?.listPriceCents).toBe(34900);
    expect(created.campaign.condensedOffer?.amountDueCents).toBe(27920);
    expect(created.campaign.campaignId.includes("harbor")).toBe(false);
    expect(upsertCampaignRecord).toHaveBeenCalledOnce();
    expect(upsertCampaignRecord.mock.calls[0]?.[1]).toBe(DISPOSABLE_KIT_TEST_CLIENT_USER_ID);
    expect(
      watchdogSweepMayDeliverCampaign({
        campaignId: created.campaign.campaignId,
        createdAt: "2026-10-22T01:30:00.000Z",
        testPaymentIsolation: created.campaign.testPaymentIsolation,
      }),
    ).toBe(false);

    listCampaignEnvelopes.mockResolvedValue([{ record: created.campaign }]);
    const second = await createDisposableCampaignLaunchKitTestProject({
      campaignId: "disposable-kit-pay-intake-next",
      env: TEST_ENV,
    });
    expect(second.ok).toBe(false);

    const protectedId = await createDisposableCampaignLaunchKitTestProject({
      campaignId: "harbor-oak-campaign-launch-kit",
      env: TEST_ENV,
    });
    expect(protectedId.ok).toBe(false);

    const live = await createDisposableCampaignLaunchKitTestProject({
      campaignId: "disposable-kit-pay-intake-live",
      env: { ...TEST_ENV, STRIPE_SECRET_KEY: "sk_live_not_a_real_key", STRIPE_MODE: "live" },
    });
    expect(live.ok).toBe(false);
    expect(upsertCampaignRecord).toHaveBeenCalledOnce();
  });
});
