import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  applyCustomerOneSubmittedIntake,
  campaignProgressRank,
  isFreshNonMayaCurrentCampaign,
  isPlaceholderLocalBlockingNamedPaid,
  isProtectedMayaCampaign,
  shouldBindOwnedPaidWhenCurrentMissing,
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

  it("keeps a fresh non-Maya local campaign over Maya even when Maya is further along", () => {
    const maya = flyer({
      routeMapIntakeSubmittedAt: now,
      campaignStatus: "BUILDING_CONCEPTS",
    });
    const fresh = flyer({
      campaignId: "customer-one-fresh-board-bind",
      campaignName: "Harbor & Co.",
      campaignStatus: "PAYMENT_RECEIVED",
      paymentReceivedAt: "2026-09-12T18:00:00.000Z",
      createdAt: "2026-09-12T18:00:00.000Z",
    });
    expect(campaignProgressRank(maya)).toBeGreaterThan(campaignProgressRank(fresh));
    expect(shouldKeepLocalCampaignOverServer(fresh, maya)).toBe(true);
    expect(shouldKeepLocalCampaignOverServer(maya, fresh)).toBe(false);
  });

  it("does not keep the owner-qa-dev fixture over a paid customer campaign", () => {
    const paid = flyer({
      campaignId: "849c793b-88c1-48cd-9194-5ed95554635a",
      campaignName: "Make Me a Flyer",
    });
    const fixture = flyer({
      campaignId: "owner-qa-dev",
      campaignName: "Tagia Bakery Campaign",
      campaignStatus: "READY_FOR_REVIEW",
    });
    expect(shouldKeepLocalCampaignOverServer(fixture, paid)).toBe(false);
    expect(shouldKeepLocalCampaignOverServer(fixture, null)).toBe(false);
  });

  it("does not keep a leftover Studio Project over a named paid current", () => {
    const paidNamed = flyer({
      campaignId: "849c793b-88c1-48cd-9194-5ed95554635a",
      campaignName: "Make Me a Flyer",
    });
    const leftover = flyer({
      campaignId: "058c5ee4-4cdc-4dd2-9466-0fe5597e57a1",
      campaignName: "Studio Project",
      paymentReceivedAt: "2026-09-20T18:32:52.327Z",
    });
    expect(isPlaceholderLocalBlockingNamedPaid(leftover, paidNamed)).toBe(true);
    expect(shouldKeepLocalCampaignOverServer(leftover, paidNamed)).toBe(false);
    expect(isFreshNonMayaCurrentCampaign(leftover)).toBe(false);
  });

  it("keeps THE STUDIO local current over paid Maya (MJ-D25 phone miss)", () => {
    const maya = flyer({
      campaignStatus: "READY_FOR_REVIEW",
      routeMapIntakeSubmittedAt: now,
    });
    const theStudio = flyer({
      campaignId: "9c6c25f2-2562-4192-97a5-44536e45cd18",
      campaignName: "the Studio",
      campaignStatus: "READY_FOR_REVIEW",
      paymentReceivedAt: "2026-09-12T21:31:13.833Z",
      createdAt: "2026-09-12T21:31:13.779Z",
    });
    expect(isFreshNonMayaCurrentCampaign(theStudio)).toBe(true);
    expect(isProtectedMayaCampaign(maya)).toBe(true);
    expect(shouldKeepLocalCampaignOverServer(theStudio, maya)).toBe(true);
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
    expect(shouldBindOwnedPaidWhenCurrentMissing(null, paid)).toBe(true);
    expect(shouldBindOwnedPaidWhenCurrentMissing(unpaid, paid)).toBe(false);
    expect(shouldBindOwnedPaidWhenCurrentMissing(paid, paid)).toBe(false);
  });

  it("does not redirect a newer unpaid flyer onto a previously paid Maya job", () => {
    const paid = flyer({
      createdAt: "2026-09-06T10:00:00.000Z",
      paymentReceivedAt: "2026-09-06T22:28:33.080Z",
    });
    const unpaid = flyer({
      campaignId: "new-studio-customer-one",
      campaignName: "Make Me a Flyer",
      campaignStatus: "DISCOVERY_COMPLETE",
      createdAt: "2026-09-12T18:00:00.000Z",
    });
    delete (unpaid as { paymentReceivedAt?: string }).paymentReceivedAt;
    expect(shouldRedirectUnpaidCurrentToPaidSibling(unpaid, paid)).toBe(false);
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

  it("GET /api/campaigns/current prefers an owned paid non-Maya campaign over Maya", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/campaign-store/customer-current-campaign.ts"),
      "utf8",
    );
    expect(source).toContain("pickOwnedPaidNonMayaCampaign");
    expect(source).toContain("currentIsMaya");
  });

  it("empty current binds the owned paid flyer instead of No Active Project (MJ-D28)", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/campaign-store/customer-current-campaign.ts"),
      "utf8",
    );
    expect(source).toContain("shouldBindOwnedPaidWhenCurrentMissing");
    expect(source).toContain("pickLocalCustomerOnePaidFlyerCampaign");
    expect(source).toContain("sessionUserWithCampaign(workingUser, paid.campaignId)");
  });

  it("GET /api/campaigns/current resolves through the customer current helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/campaigns/current/route.ts"),
      "utf8",
    );
    expect(source).toContain("resolveCustomerCurrentCampaign");
    expect(source).toContain("Cache-Control");
  });

  it("Board hydrate asks the signed-in current first and does not fetch leftover local by id", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/use-current-campaign.ts"),
      "utf8",
    );
    expect(source).toContain('"/api/campaigns/current"');
    expect(source).not.toContain("bindLocalNonMaya");
    expect(source).toContain("isPlaceholderStudioBoardName");
    expect(source).toContain("shouldKeepLocalCampaignOverServer(localCampaign, nextCampaign)");
    expect(source).toContain("!requestedCampaignId &&");
  });

  it("a leftover Studio Project flyer cannot hide a named paid Clip current", () => {
    const leftover = flyer({
      campaignId: "058c5ee4-4cdc-4dd2-9466-0fe5597e57a1",
      campaignName: "Studio Project",
      routeMapIntakeSubmittedAt: now,
    });
    const clip = flyer({
      campaignId: "camp-clip-full-cust-cert-20261002",
      campaignName: "River & Reed",
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-clip-repurposing"],
        includedServiceIds: ["v2-rtu-clip-repurposing"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 54900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 54900,
        lineItems: [],
        approvedAt: now,
      },
      routeMapContext: {
        roadId: "i20",
        jobId: "v2-rtu-clip-repurposing",
        selectedServiceIds: ["v2-rtu-clip-repurposing"],
        currentStep: "intake",
        selectedAt: now,
      },
    });
    expect(isPlaceholderLocalBlockingNamedPaid(leftover, clip)).toBe(true);
    expect(shouldKeepLocalCampaignOverServer(leftover, clip)).toBe(false);
  });
});
