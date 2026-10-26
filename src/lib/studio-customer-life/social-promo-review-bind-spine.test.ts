import { describe, expect, it } from "vitest";

import { assembleCustomerLifeTruth } from "@/lib/studio-customer-life/assemble-truth";

describe("Social & Promo review spine gate", () => {
  it("uses live materials for blocking count, not stale campaign.materialsSummary alone", () => {
    const campaign = {
      campaignId: "spine-gate-test",
      paymentReceivedAt: "2026-10-25T00:00:00.000Z",
      paymentTruth: { status: "confirmed", sandbox: true },
      materialsSummary: { blockingRequiredCount: 1 },
      routeMapIntakeSubmittedAt: "2026-10-25T00:00:00.000Z",
    } as never;

    const withoutMaterials = assembleCustomerLifeTruth({
      campaign,
      tasks: { tasks: [], jobRecords: [], jobActivityEvents: [] },
    });
    expect(withoutMaterials.blockingMaterialsCount).toBe(1);

    const withApprovedMaterials = assembleCustomerLifeTruth({
      campaign,
      tasks: { tasks: [], jobRecords: [], jobActivityEvents: [] },
      materials: [
        {
          id: "logo",
          requirementLevel: "required",
          reviewStatus: "approved_for_use",
          category: "logo-brand",
        },
      ] as never,
    });
    expect(withApprovedMaterials.blockingMaterialsCount).toBe(0);
  });
});
