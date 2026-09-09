import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  applyCustomerOneSubmittedIntake,
  campaignProgressRank,
  shouldKeepLocalCampaignOverServer,
  shouldRedirectUnpaidCurrentToPaidSibling,
} from "@/lib/campaign-store/customer-current-campaign-progress";
import { INTAKE_MATERIALS_NONE_YET } from "@/lib/route-map-intake-materials";

const now = "2026-09-06T22:28:33.080Z";

function flyer(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
    campaignName: "Maya’s Mobile Boutique",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Awaiting payment confirmation.",
    estimatedCompletion: "After payment and Project Intake",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    deliverablesDelivered: {},
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 6900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 6900,
      lineItems: [],
      approvedAt: now,
    },
    routeMapContext: {
      roadId: "i20",
      jobId: "v2-rtu-flyer",
      selectedServiceIds: ["v2-rtu-flyer"],
      currentStep: "checkout",
      selectedAt: now,
    },
    ...overrides,
  };
}

describe("customer current campaign resolution", () => {
  it("ranks paid + Intake above an unpaid plan draft", () => {
    const paid = flyer();
    const unpaid: CampaignRecord = {
      ...flyer({
        campaignId: "76d184e1-3d4a-4c95-aad4-dff20902edca",
        campaignName: "Make Me a Flyer",
        campaignStatus: "DISCOVERY_COMPLETE",
        paymentReceivedAt: undefined,
      }),
    };
    delete (unpaid as { paymentReceivedAt?: string }).paymentReceivedAt;
    expect(campaignProgressRank(paid)).toBeGreaterThan(campaignProgressRank(unpaid));
    expect(shouldKeepLocalCampaignOverServer(paid, unpaid)).toBe(true);
    expect(shouldKeepLocalCampaignOverServer(unpaid, paid)).toBe(false);
  });

  it("does not keep local over the same campaign id (merge handles that)", () => {
    const server = flyer();
    const local = flyer({ routeMapIntakeSubmittedAt: now });
    expect(shouldKeepLocalCampaignOverServer(local, server)).toBe(false);
  });

  it("redirects an unpaid same-service current onto the paid sibling", () => {
    const paid = flyer();
    const unpaid = flyer({
      campaignId: "76d184e1-3d4a-4c95-aad4-dff20902edca",
      campaignName: "Make Me a Flyer",
      campaignStatus: "DISCOVERY_COMPLETE",
    });
    delete (unpaid as { paymentReceivedAt?: string }).paymentReceivedAt;
    expect(shouldRedirectUnpaidCurrentToPaidSibling(unpaid, paid)).toBe(true);
    expect(shouldRedirectUnpaidCurrentToPaidSibling(paid, paid)).toBe(false);
    expect(shouldRedirectUnpaidCurrentToPaidSibling(null, paid)).toBe(false);
  });

  it("does not redirect a different service unpaid draft onto the flyer", () => {
    const paid = flyer();
    const unpaid = flyer({
      campaignId: "other",
      campaignStatus: "DISCOVERY_COMPLETE",
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-social-posts"],
        includedServiceIds: ["v2-rtu-social-posts"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 9900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 9900,
        lineItems: [],
        approvedAt: now,
      },
    });
    delete (unpaid as { paymentReceivedAt?: string }).paymentReceivedAt;
    expect(shouldRedirectUnpaidCurrentToPaidSibling(unpaid, paid)).toBe(false);
  });

  it("persists accepted Customer-One Intake on the paid Maya flyer only", () => {
    const submittedAt = "2026-09-08T20:00:00.000Z";
    const next = applyCustomerOneSubmittedIntake(flyer(), submittedAt);
    expect(next.routeMapIntakeSubmittedAt).toBe(submittedAt);
    expect(next.routeMapIntake?.answers["shared:materials"]).toBe(
      INTAKE_MATERIALS_NONE_YET,
    );
    expect(next.campaignStatus).toBe("BUILDING_CONCEPTS");
    expect(next.paymentReceivedAt).toBe(now);

    const already = applyCustomerOneSubmittedIntake(next, "later");
    expect(already.routeMapIntakeSubmittedAt).toBe(submittedAt);
  });

  it("does not invent Intake on a non-Maya campaign", () => {
    const other = flyer({ campaignName: "Cedar Lane" });
    expect(applyCustomerOneSubmittedIntake(other).routeMapIntakeSubmittedAt).toBeUndefined();
  });

  it("GET /api/campaigns/current resolves through the customer current helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/campaigns/current/route.ts"),
      "utf8",
    );
    expect(source).toContain("resolveCustomerCurrentCampaign");
    expect(source).toContain("Cache-Control");
  });
});
