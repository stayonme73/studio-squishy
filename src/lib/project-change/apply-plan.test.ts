import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import { buildServiceScopeSnapshot, computePlanPricingTotals } from "@/lib/plan-pricing";
import { allocateSelectedServices, computeAdditionalCostUsd } from "@/studio-plan-review";

import { computeNextApprovedStudioPlan } from "./apply-plan";

function buildPlan(selectedServiceIds: readonly ServiceId[]) {
  const { includedServiceIds, additionalServiceIds } = allocateSelectedServices(selectedServiceIds);
  const pricing = computePlanPricingTotals(selectedServiceIds);
  const { amountUsd } = computeAdditionalCostUsd(additionalServiceIds);
  return {
    selectedServiceIds: [...selectedServiceIds],
    includedServiceIds,
    additionalServiceIds,
    additionalCostUsd: amountUsd,
    oneTimeTotalCents: pricing.oneTimeSubtotalCents,
    monthlyTotalCents: pricing.monthlySubtotalCents,
    amountDueTodayCents: pricing.amountDueTodayCents,
    lineItems: buildServiceScopeSnapshot(selectedServiceIds),
    approvedAt: new Date().toISOString(),
  };
}

describe("computeNextApprovedStudioPlan", () => {
  it("blocks add_service when payment would increase", () => {
    const current = buildPlan(["v2-rtu-flyer", "v2-rtu-menu"]);
    const result = computeNextApprovedStudioPlan(current, {
      kind: "add_service",
      serviceId: "sm-001",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.paymentRequired).toBe(true);
  });

  it("remove_service preserves unaffected plan metadata", () => {
    const current = {
      ...buildPlan(["v2-rtu-flyer", "v2-rtu-menu"]),
      acknowledgmentVersion: "v1",
      acknowledgmentText: "Acknowledged",
      acknowledgedAt: "2026-01-01T00:00:00.000Z",
    };
    const result = computeNextApprovedStudioPlan(current, {
      kind: "remove_service",
      serviceId: "v2-rtu-menu",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.selectedServiceIds).toEqual(["v2-rtu-flyer"]);
    expect(result.plan.oneTimeTotalCents).toBeTypeOf("number");
    expect(result.plan.acknowledgmentVersion).toBe("v1");
    expect(result.plan.acknowledgmentText).toBe("Acknowledged");
  });
});
