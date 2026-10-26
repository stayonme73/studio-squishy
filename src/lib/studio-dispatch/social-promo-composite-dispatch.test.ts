import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import { shouldObserveDesignRenderer } from "@/lib/studio-dispatch/design-renderer-observer";

import {
  resolveSocialPromoCompositeDispatch,
  SOCIAL_PROMO_COMPOSITE_RENDER_HOLD,
} from "./social-promo-composite-dispatch";

const CAMPAIGN_ID = "social-promo-dispatch-proof";
const THEME = "Spring open house for Cedar Lane.";
const RIGHTS = "I have permission to use the materials I am supplying.";

function campaign(extra: Record<string, string> = {}): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Cedar Lane",
    routeMapIntakeSubmittedAt: "2026-10-10T08:00:00.000Z",
    routeMapIntake: {
      answers: {
        "social_and_promo_graphics:purpose": THEME,
        "social_and_promo_graphics:rights": RIGHTS,
        ...extra,
      },
      submittedAt: "2026-10-10T08:00:00.000Z",
    },
    postPayActivation: {
      status: "activated",
      phase: "ready_for_routing",
    },
    approvedStudioPlan: {
      selectedServiceIds: [],
      includedServiceIds: [],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 19900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 15920,
      lineItems: [
        {
          skuId: "social_and_promo_graphics" as ServiceId,
          serviceName: "Social & Promo Graphics",
          billingType: "one_time",
          exactPriceCents: 19900,
          priceDisplay: "$199",
          deliverables: [],
          exclusions: [],
          timingWindowLabel: "Timing varies by package.",
          revisionRule: "Three revision rounds are included.",
          clientResponsibilities: [],
          executionResponsibility: "The Studio",
        },
      ],
      approvedAt: "2026-10-10T08:00:00.000Z",
    },
    condensedOffer: {
      packageId: "social_and_promo_graphics",
      name: "Social & Promo Graphics",
      priceCents: 19900,
      listPriceCents: 19900,
      thankYouDiscountCents: 3980,
      amountDueCents: 15920,
      revisionRounds: 3,
      customerName: "Ada Stone",
      customerEmail: "ada@example.com",
      company: "Cedar Lane",
      projectNeed: THEME,
      materialsNote: "",
      support: {},
    },
    paymentReceivedAt: null,
  } as unknown as CampaignRecord;
}

const parentJob = {
  jobId: `${CAMPAIGN_ID}:social_and_promo_graphics`,
  campaignId: CAMPAIGN_ID,
  skuId: "social_and_promo_graphics" as ServiceId,
  intakeComplete: true,
  ownerApprovalPending: null,
};

describe("Social & Promo composite dispatch", () => {
  it("makes both branches execution-ready when CTA, dates, and contact are blank", () => {
    const result = resolveSocialPromoCompositeDispatch({
      campaign: campaign(),
      job: parentJob,
      materials: [],
      evaluatedAt: "2026-10-10T08:05:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composite.customerJobCount).toBe(1);
    expect(result.composite.parentJobId).toBe(parentJob.jobId);
    expect(result.composite.listPriceCents).toBe(19900);
    expect(result.composite.thankYouDiscountCents).toBe(3980);
    expect(result.composite.amountDueCents).toBe(15920);
    expect(result.composite.job.revisionLedger).toEqual({
      included: 3,
      used: 0,
      remaining: 3,
      exhausted: false,
      scope: "purchased_package",
    });
    expect(result.composite.revisionLedgerCount).toBe(1);
    expect(result.composite.optionalFacts.cta).toEqual({
      supplied: false,
      text: null,
      treatment: "none",
    });
    expect(result.composite.optionalFacts.dates).toBeNull();
    expect(result.composite.optionalFacts.phone).toBeNull();
    expect(result.composite.optionalFacts.website).toBeNull();
    expect(result.composite.paymentStarted).toBe(false);
    expect(result.composite.productionStarted).toBe(false);
    expect(result.composite.renderHeld).toBe(true);
    expect(result.composite.branches.map((branch) => branch.capabilitySku)).toEqual([
      "v2-rtu-social-posts",
      "v2-rtu-promotion-graphics",
    ]);
    for (const branch of result.composite.branches) {
      expect(branch.customerOrder).toBe(false);
      expect(branch.routing.readyForDispatch).toBe(true);
      expect(branch.dispatch.executionIdentityReady).toBe(true);
      expect(branch.dispatch.status).toBe("EXECUTION_IDENTITY_READY");
      expect(branch.dispatch.jobId.startsWith(`${parentJob.jobId}:branch:`)).toBe(true);
      expect(shouldObserveDesignRenderer(branch.dispatch)).toEqual({
        invoke: false,
        reason: SOCIAL_PROMO_COMPOSITE_RENDER_HOLD,
      });
    }
    const social = result.composite.branches[0]!;
    const graphics = result.composite.branches[1]!;
    expect(social.dispatch.productionFamilyId).toBe("social");
    expect(graphics.dispatch.productionFamilyId).toBe("marketing_assets");
    expect(social.dispatch.controlLane).toBe("standard");
    expect(graphics.dispatch.controlLane).toBe("standard");
    expect(
      `${result.composite.customerFacingName} ${result.composite.listPriceCents} ${result.composite.amountDueCents} ${result.composite.job.revisionRounds}`,
    ).not.toMatch(/\$99|\$79|one revision/);
  });

  it("keeps a supplied call to action and still holds rendering", () => {
    const cta = "Visit cedarlane.example — bring this note.";
    const result = resolveSocialPromoCompositeDispatch({
      campaign: campaign({ "social_and_promo_graphics:cta": cta }),
      job: parentJob,
      materials: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composite.optionalFacts.cta).toEqual({
      supplied: true,
      text: cta,
      treatment: "customer_words",
    });
    expect(result.composite.branches).toHaveLength(2);
    expect(result.composite.branches.every((branch) => branch.dispatch.executionIdentityReady)).toBe(
      true,
    );
  });

  it("does not mark either branch ready when the theme is missing", () => {
    const incomplete = campaign();
    incomplete.routeMapIntake = {
      answers: { "social_and_promo_graphics:rights": RIGHTS },
      submittedAt: "2026-10-10T08:00:00.000Z",
    };
    const result = resolveSocialPromoCompositeDispatch({
      campaign: incomplete,
      job: parentJob,
      materials: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.branches).toHaveLength(2);
    expect(result.branches?.every((branch) => branch.dispatch.executionIdentityReady)).toBe(false);
  });

  it("still allows a standalone legacy social-posts job to be observed", () => {
    const held = resolveSocialPromoCompositeDispatch({
      campaign: campaign(),
      job: parentJob,
      materials: [],
    });
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    const legacy = {
      ...held.composite.branches[0]!.dispatch,
      jobId: `${CAMPAIGN_ID}:v2-rtu-social-posts`,
    };
    expect(shouldObserveDesignRenderer(legacy)).toEqual({ invoke: true });
  });
});
