import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { socialPromoCustomerDeliverableLabels } from "@/config/studio-social-promo-current-door-contract-v1";

import {
  ProductionScopeRestoreError,
  restoreProductionScopeFromPaymentAuthority,
} from "./restore-production-scope-from-payment";

const SKU = "social_and_promo_graphics" as const;

function doorPlanLineItems(now: string) {
  return [
    {
      skuId: SKU,
      serviceName: "Social & Promo Graphics",
      billingType: "one_time" as const,
      exactPriceCents: 19900,
      priceDisplay: "$199",
      deliverables: [...socialPromoCustomerDeliverableLabels()],
      exclusions: [],
      timingWindowLabel: "Timing varies by package.",
      revisionRule: "Three revision rounds per package snapshot.",
      clientResponsibilities: ["Files are sent from My Studio after payment."],
      executionResponsibility: "The Studio",
    },
  ];
}

function paidCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  const lineItems = doorPlanLineItems(now);
  return {
    campaignId: "scope-restore-test",
    campaignName: "Scope restore",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Social & Promo",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 15920,
      confirmedAmountCents: 15920,
      checkoutSessionId: "cs_scope_test",
      selectedServiceIds: [SKU],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      confirmedAt: now,
      sandbox: true,
    },
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    condensedOffer: {
      packageId: SKU,
      name: "Social & Promo Graphics",
      priceCents: 19900,
      listPriceCents: 19900,
    },
    approvedStudioPlan: {
      selectedServiceIds: [SKU],
      includedServiceIds: [SKU],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 19900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 15920,
      lineItems,
      approvedAt: now,
    },
    ...overrides,
  };
}

describe("restoreProductionScopeFromPaymentAuthority", () => {
  it("preserves an accurate checkout plan with production line items", () => {
    const campaign = paidCampaign();
    const restored = restoreProductionScopeFromPaymentAuthority(campaign);
    expect(restored.approvedStudioPlan?.lineItems).toHaveLength(1);
    expect(restored.approvedStudioPlan?.lineItems?.[0]?.skuId).toBe(SKU);
    expect(restored).toBe(campaign);
  });

  it("reconstructs line items from payment truth when plan is missing", () => {
    const campaign = paidCampaign({ approvedStudioPlan: undefined });
    const restored = restoreProductionScopeFromPaymentAuthority(campaign);
    expect(restored.approvedStudioPlan?.lineItems?.[0]?.skuId).toBe(SKU);
    expect(restored.approvedStudioPlan?.amountDueTodayCents).toBe(15920);
  });

  it("reconstructs when plan exists but production lines are empty", () => {
    const campaign = paidCampaign({
      approvedStudioPlan: {
        selectedServiceIds: [SKU],
        includedServiceIds: [SKU],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 19900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 15920,
        lineItems: [],
        approvedAt: new Date().toISOString(),
      },
    });
    const restored = restoreProductionScopeFromPaymentAuthority(campaign);
    expect(restored.approvedStudioPlan?.lineItems?.length).toBeGreaterThan(0);
  });

  it("fails closed when payment scope is missing", () => {
    const campaign = paidCampaign({
      approvedStudioPlan: undefined,
      paymentTruth: {
        ...paidCampaign().paymentTruth!,
        selectedServiceIds: [],
      },
    });
    expect(() => restoreProductionScopeFromPaymentAuthority(campaign)).toThrow(
      ProductionScopeRestoreError,
    );
  });

  it("fails closed when plan SKUs disagree with payment truth", () => {
    const campaign = paidCampaign({
      approvedStudioPlan: {
        ...paidCampaign().approvedStudioPlan!,
        selectedServiceIds: ["v2-rtu-flyer"],
        lineItems: [],
      },
    });
    expect(() => restoreProductionScopeFromPaymentAuthority(campaign)).toThrow(
      /disagree with confirmed payment/,
    );
  });
});
