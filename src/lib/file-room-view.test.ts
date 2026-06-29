import { describe, expect, it } from "vitest";

import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";

import {
  resolveFileRoomCampaignView,
  resolveFileRoomListItemView,
} from "./file-room-view";
import { resolveFileRoomMaterialsView } from "@/lib/materials/materials-view";
import { resolveFileRoomProductionTasksView } from "@/lib/campaign-tasks/tasks-view";
import { resolveFileRoomExceptionsView } from "@/lib/campaign-tasks/exceptions-view";

const now = "2026-06-01T12:00:00.000Z";

function buildEnvelope(overrides: Partial<ServerCampaignEnvelope["record"]> = {}): ServerCampaignEnvelope {
  const campaignId = "live-campaign-1";
  return {
    campaignId,
    record: {
      campaignId,
      campaignName: "Acme Launch",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "",
      estimatedCompletion: "TBD",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      discoveryAnswers: {
        "your-business": "Acme Co\n---\nWidget repair",
        "your-focus": "Marketing & growth",
      },
      discoverySubmittedAt: now,
      approvedStudioPlan: {
        selectedServiceIds: ["bf-001"],
        includedServiceIds: ["bf-001"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 50000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 50000,
        lineItems: [
          {
            skuId: "bf-001",
            serviceName: "Brand Foundation",
            billingType: "one_time",
            exactPriceCents: 50000,
            priceDisplay: "$500",
            deliverables: ["Brand guide PDF"],
            exclusions: [],
            timingWindowLabel: "2 weeks",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "studio",
          },
        ],
        approvedAt: now,
      },
      paymentReceivedAt: now,
      projectDetailsSubmittedAt: now,
      projectDetails: {
        form: {
          ...EMPTY_PROJECT_DETAILS_FORM,
          workingOn: "Summer promo",
          mainOffer: "Widget tune-up special",
          callToAction: "Book now",
          destinationLink: "https://example.com",
          primaryApproverName: "Alex",
          primaryApproverEmail: "alex@example.com",
        },
        files: [],
        submittedAt: now,
      },
      selectedCampaignOption: "Option A — Bold",
      createdAt: now,
      updatedAt: now,
      ...overrides,
    },
    syncedAt: now,
    syncVersion: 3,
  };
}

describe("file-room-view", () => {
  const emptyMaterials = resolveFileRoomMaterialsView({
    campaignId: "live-campaign-1",
    items: [],
    updatedAt: now,
    version: 1,
  });

  const emptyProductionTasks = resolveFileRoomProductionTasksView({
    campaignId: "live-campaign-1",
    tasks: [],
    planFingerprint: "",
    updatedAt: now,
    version: 1,
  });

  const emptyExceptions = resolveFileRoomExceptionsView([], [], {});

  it("builds list item from server envelope only", () => {
    const view = resolveFileRoomListItemView(buildEnvelope());
    expect(view.campaignName).toBe("Acme Launch");
    expect(view.hasApprovedPlan).toBe(true);
    expect(view.syncVersion).toBe(3);
  });

  it("includes frozen plan services and approved direction", () => {
    const view = resolveFileRoomCampaignView(buildEnvelope(), emptyMaterials, emptyProductionTasks, emptyExceptions);
    expect(view.planIncludes.some((name) => name.length > 0)).toBe(true);
    expect(view.approvedDirection).toBe("Option A — Bold");
    expect(view.deliverableScope[0]?.deliverables).toContain("Brand guide PDF");
  });

  it("flags partial records when milestones are missing", () => {
    const view = resolveFileRoomCampaignView(
      buildEnvelope({
        discoverySubmittedAt: undefined,
        approvedStudioPlan: undefined,
        paymentReceivedAt: null,
        projectDetailsSubmittedAt: undefined,
      }),
      emptyMaterials,
      emptyProductionTasks,
      emptyExceptions,
    );
    expect(view.health.isPartial).toBe(true);
    expect(view.health.missing).toContain("Discovery");
    expect(view.health.missing).toContain("Approved Studio Plan");
  });

  it("does not depend on localStorage-backed intake fallback", () => {
    const view = resolveFileRoomCampaignView(
      buildEnvelope({
        intake: undefined,
        visionData: undefined,
        projectDetails: undefined,
        projectDetailsSubmittedAt: undefined,
      }),
      emptyMaterials,
      emptyProductionTasks,
      emptyExceptions,
    );
    expect(view.visionSummary).toEqual([]);
    expect(view.projectDetailsSections).toEqual([]);
  });
});
