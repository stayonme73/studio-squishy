import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { needsPaidOperatingRecovery } from "@/lib/studio-paid-activation-recovery/needs-recovery";

function paidFlyer(
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  const now = "2026-09-12T21:35:31.590Z";
  return {
    campaignId: "camp-intake-activate",
    campaignName: "the Studio",
    campaignStatus: "BUILDING_CONCEPTS",
    paymentReceivedAt: "2026-09-12T21:31:13.833Z",
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: "cs_sandbox_test",
      paymentIntentId: null,
      stripeEventId: null,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      confirmedAt: now,
      sandbox: true,
    },
    routeMapContext: {
      selectedServiceIds: ["v2-rtu-flyer"],
      jobId: "v2-rtu-flyer",
      roadId: "i20",
      selectedAt: now,
      currentStep: "intake",
    },
    postPayActivation: {
      schemaVersion: 1,
      status: "activated",
      phase: "awaiting_intake",
      activatedAt: now,
      lastAttemptAt: now,
      checkoutSessionId: "cs_sandbox_test",
      paymentIntentId: null,
      stripeEventId: null,
      jobIds: ["camp-intake-activate:v2-rtu-flyer"],
      taskCount: 4,
      intakeComplete: false,
      blockingRequiredMaterialsCount: 0,
      ownerActionRequired: false,
      lastError: null,
    },
    ...overrides,
  } as CampaignRecord;
}

describe("needsPaidOperatingRecovery — submitted Intake", () => {
  it("does not recover while paid campaign is still waiting for Intake", () => {
    expect(needsPaidOperatingRecovery(paidFlyer())).toBe(false);
  });

  it("recovers when submitted Intake is still frozen as awaiting_intake", () => {
    expect(
      needsPaidOperatingRecovery(
        paidFlyer({
          routeMapIntakeSubmittedAt: "2026-09-12T21:35:31.590Z",
        }),
      ),
    ).toBe(true);
  });
});
