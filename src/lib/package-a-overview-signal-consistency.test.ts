import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import {
  PROJECT_INTAKE_RECEIVED_STAGE,
  PROJECT_INTAKE_RECEIVED_STATUS,
  resolveHonestBuildingStepLabel,
  resolvePostSubmitCustomerMode,
} from "@/lib/post-submit-customer-signals";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import { resolveBoardNextStepPanelMessage } from "@/lib/studio-board-client-copy";
import {
  resolveCampaignProgressSteps,
  resolveStudioBoardView,
  resolveStudioNoteView,
  resolveWhatHappensNextSentence,
} from "@/lib/studio-board-view";

function paidIncompleteIntakeCampaign(): CampaignRecord {
  const now = "2026-07-14T18:00:00.000Z";
  return {
    campaignId: "pkg-a-incomplete-intake",
    campaignName: "Social Posts Probe",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "We received your payment.",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    studioNotes: [{ date: "Today", message: "Payment received." }],
    deliverablesDelivered: {},
    routeMapContext: {
      roadId: "i20",
      jobId: "v2-rtu-social-posts",
      selectedServiceIds: ["v2-rtu-social-posts"],
      selectedAt: now,
      currentStep: "intake",
    },
  };
}

function postSubmitAwaitingProduction(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-07-14T18:00:00.000Z";
  return {
    campaignId: "pkg-a-post-submit",
    campaignName: "Social Posts Probe",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Internal building status.",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    routeMapIntakeSubmittedAt: now,
    projectDetailsSubmittedAt: now,
    createdAt: now,
    updatedAt: now,
    studioNotes: [{ date: "Today", message: "Project Intake received." }],
    deliverablesDelivered: {},
    materialsSummary: { blockingRequiredCount: 0, updatedAt: now },
    routeMapContext: {
      roadId: "i20",
      jobId: "v2-rtu-social-posts",
      selectedServiceIds: ["v2-rtu-social-posts"],
      selectedAt: now,
      currentStep: "intake",
    },
    ...overrides,
  };
}

describe("Package A — Overview Signal Consistency", () => {
  it("Scenario 1: paid incomplete Intake does not claim queued/building/production", () => {
    const campaign = paidIncompleteIntakeCampaign();
    const view = resolveStudioBoardView(campaign);

    expect(view.statusLabel).toBe("Waiting on Project Intake");
    expect(view.campaignProgressLabel).toBe(studioBoard.nextAction.waitingOnProjectIntakeLabel);
    expect(view.campaignProgressLabel).not.toBe("Campaign Queued");
    expect(view.campaignDescription).toBe(studioBoard.nextAction.completeProjectDetailsHint);
    expect(view.campaignDescription).not.toMatch(/creative work|entering production|in production/i);
    expect(resolveWhatHappensNextSentence(campaign)).toBe(
      studioBoard.nextAction.completeProjectDetailsHint,
    );

    const progress = resolveCampaignProgressSteps(campaign);
    const paymentStep = progress.find((step) => step.id === "PAYMENT_RECEIVED");
    expect(paymentStep?.detail).toBe(studioBoard.nextAction.waitingOnProjectIntakeLabel);
    expect(paymentStep?.detail).not.toBe("Queued");

    const note = resolveStudioNoteView(campaign);
    expect(note?.lines.join(" ")).toMatch(/We received your payment/);
    expect(note?.lines.join(" ")).toMatch(/Production has not begun/);
    expect(note?.lines.join(" ")).not.toMatch(/now in production|creative team/i);

    expect(studioBoard.nextAction.waitingOnProjectIntakeLabel).toBe("Waiting on Project Intake");
    expect(studioBoard.campaignBrief.openRecordLabel).toBe("View submitted project details");
  });

  it("Scenario 2: Intake submitted before production uses Preparing Next Stage labels", () => {
    const campaign = postSubmitAwaitingProduction();
    const facts = { productionGatePassed: false, blockingRequiredCount: 0, movedToProduction: false };
    const view = resolveStudioBoardView(campaign, facts);

    expect(view.statusLabel).toBe(PROJECT_INTAKE_RECEIVED_STATUS);
    expect(view.campaignProgressLabel).toBe(PROJECT_INTAKE_RECEIVED_STAGE);
    expect(view.campaignProgressLabel).not.toBe("Campaign in Progress");
    expect(view.statusLabel).not.toBe("Building Concepts");

    const progress = resolveCampaignProgressSteps(campaign, facts);
    const building = progress.find((step) => step.id === "BUILDING_CONCEPTS");
    expect(building?.state).toBe("current");
    expect(building?.label).toBe(PROJECT_INTAKE_RECEIVED_STAGE);
    expect(building?.label).not.toBe("Building Concepts");
    expect(building?.detail).toBe(PROJECT_INTAKE_RECEIVED_STATUS);

    const journey = resolveCustomerJourneySteps(campaign);
    const journeyBuilding = journey.find((step) => step.id === "building");
    expect(journeyBuilding?.state).toBe("current");
    expect(
      resolveHonestBuildingStepLabel(campaign, facts, journeyBuilding?.label ?? "Building Concepts"),
    ).toBe(PROJECT_INTAKE_RECEIVED_STAGE);
  });

  it("Scenario 3: materials blockers stay primary and stage stays preparing", () => {
    const campaign = postSubmitAwaitingProduction({
      materialsSummary: { blockingRequiredCount: 1, updatedAt: "2026-07-14T18:00:00.000Z" },
    });
    const facts = {
      productionGatePassed: false,
      blockingRequiredCount: 1,
      movedToProduction: false,
      stillNeededLabel: "Campaign goal/message",
    };
    expect(resolvePostSubmitCustomerMode(campaign, facts)).toBe("materials_blocking");

    const view = resolveStudioBoardView(campaign, facts);
    expect(view.campaignProgressLabel).toBe(PROJECT_INTAKE_RECEIVED_STAGE);
    expect(view.statusLabel).toBe(PROJECT_INTAKE_RECEIVED_STATUS);

    const materialsNext = resolveBoardNextStepPanelMessage({
      campaign,
      blockingRequiredCount: 1,
      stillNeededLabels: ["Campaign goal/message"],
      movedToProduction: false,
    });
    expect(materialsNext).toMatch(/still need/i);
  });

  it("Scenario 4: production-gate-passed keeps Building Concepts progress language", () => {
    const campaign = postSubmitAwaitingProduction();
    const facts = { productionGatePassed: true, blockingRequiredCount: 0, movedToProduction: true };
    const view = resolveStudioBoardView(campaign, facts);

    expect(view.statusLabel).toBe("Building Concepts");
    expect(view.campaignProgressLabel).toBe(
      studioBoard.statusContent.BUILDING_CONCEPTS.campaignProgressLabel,
    );

    const progress = resolveCampaignProgressSteps(campaign, facts);
    const building = progress.find((step) => step.id === "BUILDING_CONCEPTS");
    expect(building?.label).toBe("Building Concepts");
  });

  it("Scenario 5–6: Review and Delivery overview signals remain intact", () => {
    const now = "2026-07-14T18:00:00.000Z";
    const review = postSubmitAwaitingProduction({
      campaignStatus: "READY_FOR_REVIEW",
      routeMapIntakeSubmittedAt: now,
    });
    const reviewView = resolveStudioBoardView(review);
    expect(reviewView.statusLabel).toBe(studioBoard.statusContent.READY_FOR_REVIEW.statusLabel);
    expect(reviewView.campaignProgressLabel).toBe(
      studioBoard.statusContent.READY_FOR_REVIEW.campaignProgressLabel,
    );

    const delivered = postSubmitAwaitingProduction({
      campaignStatus: "DELIVERED",
      routeMapIntakeSubmittedAt: now,
      selectedCampaignOption: "Option B",
    });
    const deliveredView = resolveStudioBoardView(delivered);
    expect(deliveredView.statusLabel).toBe(studioBoard.statusContent.DELIVERED.statusLabel);
    expect(deliveredView.campaignProgressLabel).toBe(
      studioBoard.statusContent.DELIVERED.campaignProgressLabel,
    );
  });

  it("Scenario 7: empty board overview remains unchanged for Package A", () => {
    const view = resolveStudioBoardView(null);
    expect(view.hasCampaign).toBe(false);
    expect(view.campaignProgressLabel).toBeNull();
    expect(view.statusLabel).toBe("Not started");
    expect(view.campaignTitle).toBe(studioBoard.empty.campaignNamePlaceholder);
  });
});
