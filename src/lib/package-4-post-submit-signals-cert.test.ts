import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { evaluateProductionTrigger } from "@/decision-core";
import { resolveActivityFeed } from "@/lib/campaign-record";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import {
  PROJECT_INTAKE_RECEIVED_LEAD,
  PROJECT_INTAKE_RECEIVED_STAGE,
  PROJECT_INTAKE_RECEIVED_STATUS,
  mayShowBuildingConceptsCustomerCopy,
  productionGatePassedFromKnownFacts,
  productionGatePassedFromOutcome,
  resolvePostSubmitCustomerMode,
  resolvePostSubmitNextActionCopy,
  resolveProductionGatePassedForCampaign,
} from "@/lib/post-submit-customer-signals";
import { resolveBoardNextStepPanelMessage } from "@/lib/studio-board-client-copy";
import { resolveCampaignProgressSteps, resolveStudioBoardView } from "@/lib/studio-board-view";
import { isIntakeComplete } from "@/lib/studio-board-campaign";

function postSubmitCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-07-13T20:00:00.000Z";
  return {
    campaignId: "pkg4-post-submit",
    campaignName: "Make My Social Media Posts",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Building concepts",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    routeMapIntakeSubmittedAt: now,
    projectDetailsSubmittedAt: now,
    createdAt: now,
    updatedAt: now,
    studioNotes: [{ date: "Today", message: "Route Map intake received." }],
    deliverablesDelivered: {},
    materialsSummary: {
      blockingRequiredCount: 0,
      updatedAt: now,
    },
    ...overrides,
  };
}

describe("Package 4 post-submit customer signals", () => {
  it("keeps internal BUILDING_CONCEPTS while showing Project Intake Received before the gate", () => {
    const campaign = postSubmitCampaign();
    expect(campaign.campaignStatus).toBe("BUILDING_CONCEPTS");
    expect(isIntakeComplete(campaign)).toBe(true);

    const facts = {
      productionGatePassed: resolveProductionGatePassedForCampaign(campaign, {
        blockingRequiredCount: 0,
        movedToProduction: false,
      }),
      blockingRequiredCount: 0,
    };
    expect(facts.productionGatePassed).toBe(false);
    expect(resolvePostSubmitCustomerMode(campaign, facts)).toBe("intake_received");

    const view = resolveStudioBoardView(campaign, {
      blockingRequiredCount: 0,
      movedToProduction: false,
    });
    expect(view.status).toBe("BUILDING_CONCEPTS");
    expect(view.statusLabel).toBe(PROJECT_INTAKE_RECEIVED_STATUS);
    expect(view.whatHappensNextSentence).toBe(PROJECT_INTAKE_RECEIVED_LEAD);
    expect(view.activityFeed.some((entry) => /building your concepts/i.test(entry.message))).toBe(
      false,
    );

    const next = resolvePostSubmitNextActionCopy("intake_received", facts);
    expect(next?.statusLabel).toBe(PROJECT_INTAKE_RECEIVED_STATUS);
    expect(next?.lead).toBe(PROJECT_INTAKE_RECEIVED_LEAD);
  });

  it("makes materials the primary next-action mode when materials are still blocking", () => {
    const campaign = postSubmitCampaign({
      materialsSummary: { blockingRequiredCount: 2, updatedAt: "2026-07-13T20:00:00.000Z" },
    });
    const facts = {
      productionGatePassed: false,
      blockingRequiredCount: 2,
      stillNeededLabel: "Destination link / CTA",
    };
    expect(resolvePostSubmitCustomerMode(campaign, facts)).toBe("materials_blocking");
    const next = resolvePostSubmitNextActionCopy("materials_blocking", facts);
    expect(next?.statusLabel).toBe("We still need your destination link.");
    expect(mayShowBuildingConceptsCustomerCopy(campaign, facts)).toBe(false);

    expect(
      resolveBoardNextStepPanelMessage({
        campaign,
        blockingRequiredCount: 2,
        stillNeededLabels: ["Destination link / CTA"],
        movedToProduction: false,
      }),
    ).toBe("We still need your destination link.");
  });

  it("allows Building Concepts customer copy only when production-gate facts all pass", () => {
    const campaign = postSubmitCampaign();
    expect(
      productionGatePassedFromKnownFacts({
        paymentReceived: true,
        projectDetailsComplete: true,
        materialsAccepted: true,
        movedToProduction: true,
      }),
    ).toBe(true);

    const facts = {
      productionGatePassed: true,
      blockingRequiredCount: 0,
    };
    expect(resolvePostSubmitCustomerMode(campaign, facts)).toBe("building_concepts_allowed");
    expect(mayShowBuildingConceptsCustomerCopy(campaign, facts)).toBe(true);

    const view = resolveStudioBoardView(campaign, {
      productionGatePassed: true,
      blockingRequiredCount: 0,
      movedToProduction: true,
    });
    expect(view.statusLabel).toBe("Building Concepts");
    expect(view.activityFeed.some((entry) => entry.message === "We're building your concepts")).toBe(
      true,
    );
  });

  it("reads allow from evaluateProductionTrigger outcomes without inventing alternate rules", () => {
    expect(
      productionGatePassedFromOutcome({
        domain: "production_trigger",
        determination: "defer",
        matchedRules: [],
        humanReviewRequired: false,
        effects: [],
        warnings: [],
        payload: { allFourMet: false },
      }),
    ).toBe(false);

    expect(
      productionGatePassedFromOutcome({
        domain: "production_trigger",
        determination: "allow",
        matchedRules: [],
        humanReviewRequired: false,
        effects: [],
        warnings: [],
        payload: { allFourMet: true },
      }),
    ).toBe(true);

    const campaign = postSubmitCampaign();
    const outcome = evaluateProductionTrigger({
      domain: "production_trigger",
      campaignId: campaign.campaignId,
      actor: "system",
      trigger: { type: "production_trigger_check" },
      occurredAt: "2026-07-13T21:00:00.000Z",
      facts: {
        campaign,
        job: {
          jobId: `${campaign.campaignId}:v2-rtu-social-posts`,
          campaignId: campaign.campaignId,
          skuId: "v2-rtu-social-posts",
          serviceName: "Social Posts",
          spineStatus: "ready_for_queue",
          productionLane: "standard",
          intakeComplete: true,
          productionStartedAt: null,
          updatedAt: "2026-07-13T21:00:00.000Z",
        },
        materials: [],
        tasks: [],
      },
    });
    expect(outcome.determination).toBe("defer");
    expect(productionGatePassedFromOutcome(outcome)).toBe(false);
  });

  it("marks Project Intake complete on the journey without claiming building until the gate", () => {
    const campaign = postSubmitCampaign();
    const steps = resolveCustomerJourneySteps(campaign);
    const intake = steps.find((step) => step.id === "intake");
    const building = steps.find((step) => step.id === "building");
    expect(intake?.state).toBe("complete");
    expect(building?.state).toBe("current");

    const progress = resolveCampaignProgressSteps(campaign, {
      productionGatePassed: false,
      blockingRequiredCount: 0,
      movedToProduction: false,
    });
    const buildingProgress = progress.find((step) => step.id === "BUILDING_CONCEPTS");
    expect(buildingProgress?.label).toBe(PROJECT_INTAKE_RECEIVED_STAGE);
    expect(buildingProgress?.label).not.toBe("Building Concepts");
    expect(buildingProgress?.detail).toBe(PROJECT_INTAKE_RECEIVED_STATUS);
  });

  it("preserves Package 1b incomplete-intake activity truth", () => {
    const campaign = postSubmitCampaign({
      campaignStatus: "PAYMENT_RECEIVED",
      routeMapIntakeSubmittedAt: undefined,
      projectDetailsSubmittedAt: undefined,
      materialsSummary: undefined,
    });
    expect(isIntakeComplete(campaign)).toBe(false);
    expect(
      resolvePostSubmitCustomerMode(campaign, {
        productionGatePassed: false,
        blockingRequiredCount: 0,
      }),
    ).toBe("pass_through");
    const feed = resolveActivityFeed(campaign);
    expect(feed.some((entry) => /We received your Project Intake/i.test(entry.message))).toBe(false);
  });
});
