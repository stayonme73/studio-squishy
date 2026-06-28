import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import {
  resolveDeliverableScopeFromCampaign,
  resolveDeliverableScopeFromPlan,
  scopeHasChannelSections,
  scopeIncludesSection,
} from "@/lib/deliverable-scope";
import type { ApprovedStudioPlan } from "@/config/studio-board";

function buildPlan(serviceIds: readonly ServiceId[]): ApprovedStudioPlan {
  const lineItems = buildServiceScopeSnapshot(serviceIds);
  const oneTimeTotalCents = lineItems.reduce((sum, line) => sum + line.exactPriceCents, 0);
  return {
    selectedServiceIds: [...serviceIds],
    includedServiceIds: [...serviceIds],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: oneTimeTotalCents,
    lineItems,
    approvedAt: "2026-06-28T12:00:00.000Z",
  };
}

function campaignWithPlan(serviceIds: readonly ServiceId[], overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-06-28T12:00:00.000Z";
  return {
    campaignId: "scope-test",
    campaignName: "Scope Test Campaign",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "spark",
    packageLabel: "Spark Plan",
    approvedStudioPlan: buildPlan(serviceIds),
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("deliverable-scope", () => {
  it("Brand (bf-001) + Social (sm-001): brand + social visible; no email/sms/video/calendar", () => {
    const scope = resolveDeliverableScopeFromPlan(buildPlan(["bf-001", "sm-001"]));

    expect(scope.map((s) => s.sectionId)).toEqual(["brand-direction-assets", "social"]);
    expect(scopeIncludesSection(scope, "email")).toBe(false);
    expect(scopeIncludesSection(scope, "sms")).toBe(false);
    expect(scopeIncludesSection(scope, "video")).toBe(false);
    expect(scopeIncludesSection(scope, "calendar")).toBe(false);
    expect(scope[0].title).toBe("Brand Direction & Assets");
    expect(scope[0].deliverables.length).toBeGreaterThan(0);
  });

  it("Email only (em-001): email only; no social/sms", () => {
    const scope = resolveDeliverableScopeFromPlan(buildPlan(["em-001"]));

    expect(scope.map((s) => s.sectionId)).toEqual(["email"]);
    expect(scopeHasChannelSections(scope)).toEqual({
      social: false,
      email: true,
      sms: false,
    });
  });

  it("Mixed plan 3+ families — only matching areas", () => {
    const scope = resolveDeliverableScopeFromPlan(
      buildPlan(["bf-001", "sm-001", "em-001", "ma-001"]),
    );

    expect(scope.map((s) => s.sectionId)).toEqual([
      "brand-direction-assets",
      "social",
      "email",
      "marketing-assets",
    ]);
  });

  it("Execution add-on alone does not add section", () => {
    const scope = resolveDeliverableScopeFromPlan(
      buildPlan(["social_media-execution"]),
    );
    expect(scope).toEqual([]);
  });

  it("Execution add-on with parent only adds parent creative section", () => {
    const scope = resolveDeliverableScopeFromPlan(
      buildPlan(["sm-001", "social_media-execution"]),
    );
    expect(scope.map((s) => s.sectionId)).toEqual(["social"]);
  });

  it("Unknown SKU fallback uses frozen service name and deliverables", () => {
    const plan = buildPlan([]);
    const unknownPlan: ApprovedStudioPlan = {
      ...plan,
      lineItems: [
        {
          skuId: "legacy-unknown-sku" as never,
          serviceName: "Legacy Custom Service",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["One custom deliverable from snapshot"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "One round",
          clientResponsibilities: [],
          executionResponsibility: "Client",
        },
      ],
    };

    const scope = resolveDeliverableScopeFromPlan(unknownPlan);
    expect(scope).toHaveLength(1);
    expect(scope[0].sectionId).toBe("fallback:legacy-unknown-sku");
    expect(scope[0].title).toBe("Legacy Custom Service");
    expect(scope[0].deliverables).toEqual(["One custom deliverable from snapshot"]);
  });

  it("legacy campaign without approved plan uses package quotas", () => {
    const campaign = campaignWithPlan([], { approvedStudioPlan: undefined, packageId: "momentum" });
    const scope = resolveDeliverableScopeFromCampaign(campaign);

    expect(scopeIncludesSection(scope, "social")).toBe(true);
    expect(scopeIncludesSection(scope, "email")).toBe(true);
    expect(scopeIncludesSection(scope, "sms")).toBe(true);
    expect(scopeIncludesSection(scope, "calendar")).toBe(true);
    expect(scopeIncludesSection(scope, "brand-direction-assets")).toBe(false);
  });
});
