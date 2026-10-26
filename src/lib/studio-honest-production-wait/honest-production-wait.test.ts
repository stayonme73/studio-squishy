import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerCurrentStatusV1 as statusCopy } from "@/config/studio-customer-current-status-v1";
import { studioCustomerLifeV1 as lifeCopy } from "@/config/studio-customer-life-v1";
import { studioHonestProductionWaitV1 } from "@/config/studio-honest-production-wait-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import { buildJobId } from "@/lib/job-control/lane-map";
import { resolveOwnerDeskItems } from "@/lib/job-control/owner-desk";
import { applyProductionWorkspacePatch } from "@/lib/job-control/production-workspace-actions";
import { canTransitionToBuildingConcepts } from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import { buildCustomerJobStatusSummary } from "@/lib/project-record-status";
import { resolveWhatHappensNextSentence, resolveStudioBoardView } from "@/lib/studio-board-view";
import { resolveCustomerCurrentStatusOverlay } from "@/lib/studio-customer-current-status";
import {
  answerCustomerLifeQuestion,
  assembleCustomerLifeTruth,
  classifyCustomerLifeQuestion,
} from "@/lib/studio-customer-life";

const FLYER = ["v2-rtu-flyer"] as const;
const NOW = "2026-09-26T18:00:00.000Z";

const DATE_OR_QUEUE = /\b(#\s*\d+|number \d+|tomorrow|friday|monday|estimate|by \w+day|\d{4}-\d{2}-\d{2})\b/i;

function paidCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const totals = computePlanPricingTotals([...FLYER]);
  return {
    campaignId: "camp-wait",
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: NOW,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: "cs_wait",
      selectedServiceIds: [...FLYER],
      decisionId: "dec_wait",
      factFingerprint: "fp_wait",
      draftRevision: 1,
      confirmedAt: NOW,
    },
    projectDetailsSubmittedAt: NOW,
    routeMapIntakeSubmittedAt: NOW,
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: NOW,
    updatedAt: NOW,
    approvedStudioPlan: {
      selectedServiceIds: [...FLYER],
      includedServiceIds: [...FLYER],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([...FLYER]),
      approvedAt: NOW,
    },
    ...overrides,
  };
}

function jobRecord(
  campaignId: string,
  overrides: Partial<PurchasedJobRecord> = {},
): PurchasedJobRecord {
  return {
    jobId: buildJobId(campaignId, "v2-rtu-flyer"),
    campaignId,
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    spineStatus: "ready_for_queue",
    productionLane: "quick",
    intakeComplete: true,
    laneQueuedAt: NOW,
    updatedAt: NOW,
    acceptanceReview: {
      status: "accepted",
      reviewedAt: NOW,
      reviewedBy: { role: "staff", displayName: "Staff" },
      clientConfirmed: [],
      studioConfirmed: [],
      missingMaterials: [],
      risks: [],
      assumptions: [],
      routeTo: "production",
    },
    ...overrides,
  } as PurchasedJobRecord;
}

function tasksFor(job: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: job.campaignId,
    version: 12,
    planFingerprint: "fp",
    updatedAt: NOW,
    syncedAt: NOW,
    tasks: [],
    jobRecords: [job],
    qaRecords: [],
    jobCommunicationRecords: [],
  };
}

function blockingLogo(skuId: string): CampaignMaterialItem {
  return {
    id: "logo",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo",
    reason: "Needed",
    relatedServiceIds: [skuId as never],
    uploadStatus: "none",
  };
}

function staffUser() {
  return {
    id: "staff-dev",
    email: "staff@local.dev",
    displayName: "Staff",
    roles: ["staff"] as const,
  };
}

describe("STUDIO-OPERATING-HONEST-PRODUCTION-WAIT-1", () => {
  it("keeps coded lane caps as uncertified factory numbers", () => {
    expect(studioHonestProductionWaitV1.codedLaneCapacity).toEqual({
      quick: 2,
      standard: 2,
      heavy: 1,
    });
    expect(studioHonestProductionWaitV1.codedLaneCapacityCertified).toBe(false);
    expect(studioHonestProductionWaitV1.sharedJobTruth).toBe("tests_only");
    expect(studioHonestProductionWaitV1.inventQueueNumber).toBe(false);
  });

  it("Board overlay splits slot wait from production, materials, and Review", () => {
    const campaign = paidCampaign({ campaignStatus: "BUILDING_CONCEPTS" });
    const facts = {
      productionGatePassed: true,
      blockingRequiredCount: 0,
      movedToProduction: false,
    };

    const queued = resolveCustomerCurrentStatusOverlay(campaign, facts, [
      buildCustomerJobStatusSummary(jobRecord(campaign.campaignId)),
    ]);
    expect(queued?.kind).toBe("waiting_for_production_slot");
    expect(queued?.statusLabel).toBe(statusCopy.labels.preparingToStart);
    expect(queued?.lead).toBe(statusCopy.leads.waitingForProductionSlot);
    expect(queued?.lead).not.toMatch(/preparing/i);
    expect(queued?.lead).not.toMatch(DATE_OR_QUEUE);

    const producing = resolveCustomerCurrentStatusOverlay(campaign, facts, [
      buildCustomerJobStatusSummary(
        jobRecord(campaign.campaignId, {
          spineStatus: "building_concepts",
          productionStartedAt: NOW,
        }),
      ),
    ]);
    expect(producing?.kind).toBe("producing");
    expect(producing?.statusLabel).toBe(statusCopy.labels.producing);
    expect(producing?.lead).toMatch(/building your concepts/i);

    const materials = resolveCustomerCurrentStatusOverlay(
      paidCampaign({
        campaignStatus: "BUILDING_CONCEPTS",
        materialsSummary: { blockingRequiredCount: 1, updatedAt: NOW },
      }),
      { productionGatePassed: false, blockingRequiredCount: 1, movedToProduction: false },
      [
        buildCustomerJobStatusSummary(
          jobRecord("camp-wait", { spineStatus: "waiting_on_client" }),
        ),
      ],
    );
    expect(materials?.kind).toBe("waiting_on_you");
    expect(materials?.statusLabel).toBe(statusCopy.labels.waitingOnYou);
    expect(materials?.kind).not.toBe(queued?.kind);
    expect(materials?.kind).not.toBe(producing?.kind);

    const review = resolveCustomerCurrentStatusOverlay(campaign, facts, [
      buildCustomerJobStatusSummary(
        jobRecord(campaign.campaignId, { spineStatus: "ready_for_review" }),
      ),
    ]);
    expect(review?.kind).toBe("review_ready");
    expect(review?.statusLabel).toBe(statusCopy.labels.reviewReady);
    expect(review?.kind).not.toBe(queued?.kind);
    expect(review?.kind).not.toBe(materials?.kind);
  });

  it("Voice answers the four wait questions from Machine spine, with no invented dates", () => {
    const campaign = paidCampaign();
    const queued = jobRecord(campaign.campaignId);
    const input = { campaign, tasks: tasksFor(queued) };

    expect(classifyCustomerLifeQuestion("Has anyone started my project?")).toBe("work_started");
    expect(classifyCustomerLifeQuestion("Why is it still waiting?")).toBe("holding_up");
    expect(classifyCustomerLifeQuestion("Do you need anything from me?")).toBe("need_anything");
    expect(classifyCustomerLifeQuestion("When will you start?")).toBe("when_start");

    const started = answerCustomerLifeQuestion("Has anyone started my project?", input);
    const why = answerCustomerLifeQuestion("Why is it still waiting?", input);
    const need = answerCustomerLifeQuestion("Do you need anything from me?", input);
    const when = answerCustomerLifeQuestion("When will you start?", input);
    const status = answerCustomerLifeQuestion("What is happening with my project?", input);

    expect(started.phase).toBe("awaiting_production_slot");
    expect(started.text).toBe(lifeCopy.customerCopy.workWaitingForSlot);
    expect(why.text).toBe(lifeCopy.customerCopy.holdingProductionSlot);
    expect(need.text).toBe(lifeCopy.customerCopy.nothingNeededInLine);
    expect(when.text).toBe(lifeCopy.customerCopy.whenStartInLine);
    expect(status.text).toBe(lifeCopy.customerCopy.statusWaitingForProductionSlot);

    for (const text of [started.text, why.text, need.text, when.text, status.text]) {
      expect(text).not.toMatch(/preparing/i);
      expect(text).not.toMatch(DATE_OR_QUEUE);
    }

    const truth = assembleCustomerLifeTruth(input);
    expect(truth.ownerActionRequired).toBe(false);
    expect(truth.waitingOn).toBe("studio");
    expect(truth.spineStatus).toBe("ready_for_queue");
  });

  it("materials wait asks the customer; slot wait does not; Review wait is a third state", () => {
    const campaign = paidCampaign({
      materialsSummary: { blockingRequiredCount: 1, updatedAt: NOW },
    });
    const materialsInput = {
      campaign,
      tasks: tasksFor(jobRecord(campaign.campaignId, { spineStatus: "waiting_on_client" })),
      materials: [blockingLogo("v2-rtu-flyer")],
    };
    const need = answerCustomerLifeQuestion("Do you need anything from me?", materialsInput);
    const why = answerCustomerLifeQuestion("Why is it still waiting?", materialsInput);
    expect(need.text).toBe(lifeCopy.customerCopy.materialsNeeded);
    expect(why.text).toBe(lifeCopy.customerCopy.holdingMaterials);
    expect(assembleCustomerLifeTruth(materialsInput).waitingOn).toBe("customer");

    const reviewInput = {
      campaign: paidCampaign({ campaignStatus: "READY_FOR_REVIEW" }),
      tasks: tasksFor(
        jobRecord("camp-wait", {
          spineStatus: "ready_for_review",
          productionStartedAt: NOW,
          internalQaReviewAuthorization: {
            status: "ELIGIBLE_FOR_REVIEW",
            workVersionId: "flyer-v1",
            contentSha256s: ["abc"],
            artifactIds: ["flyer-v1"],
            authorizedAt: NOW,
          },
        } as Partial<PurchasedJobRecord>),
      ),
    };
    const reviewWhy = answerCustomerLifeQuestion("Why is it still waiting?", reviewInput);
    expect(reviewWhy.text).toBe(lifeCopy.customerCopy.holdingReview);
    expect(reviewWhy.phase).toBe("ready_for_review");
  });

  it("occupied quick lane keeps extra valid work as next-up, not actively producing", () => {
    const activeA = jobRecord("camp-a", {
      spineStatus: "building_concepts",
      productionStartedAt: NOW,
    });
    const activeB = jobRecord("camp-b", {
      spineStatus: "building_concepts",
      productionStartedAt: NOW,
    });
    const waiting = jobRecord("camp-c");
    const lanes = resolveProductionLaneViews([
      { campaignName: "A", job: activeA, tasks: [] },
      { campaignName: "B", job: activeB, tasks: [] },
      { campaignName: "C", job: waiting, tasks: [] },
    ]);
    const quick = lanes.find((lane) => lane.lane === "quick");
    expect(quick?.capacity).toBe(2);
    expect(quick?.activeCount).toBe(2);
    expect(quick?.availableSlots).toBe(0);
    expect(quick?.isFull).toBe(true);
    expect(quick?.nextUpJobs.map((entry) => entry.jobId)).toEqual([waiting.jobId]);
    expect(quick?.activeJobs.some((entry) => entry.jobId === waiting.jobId)).toBe(false);

    const gate = canTransitionToBuildingConcepts(waiting, [], lanes);
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((reason) => reason.code === "lane_full")).toBe(true);

    const waitingOverlay = resolveCustomerCurrentStatusOverlay(
      paidCampaign({ campaignId: "camp-c", campaignStatus: "BUILDING_CONCEPTS" }),
      { productionGatePassed: true, blockingRequiredCount: 0, movedToProduction: false },
      [buildCustomerJobStatusSummary(waiting)],
    );
    const activeOverlay = resolveCustomerCurrentStatusOverlay(
      paidCampaign({ campaignId: "camp-a", campaignStatus: "BUILDING_CONCEPTS" }),
      { productionGatePassed: true, blockingRequiredCount: 0, movedToProduction: true },
      [buildCustomerJobStatusSummary(activeA)],
    );
    expect(waitingOverlay?.kind).toBe("waiting_for_production_slot");
    expect(activeOverlay?.kind).toBe("producing");
    expect(waitingOverlay?.statusLabel).not.toBe(activeOverlay?.statusLabel);
  });

  it("proves paid+valid → slot wait → slot frees → production begins", () => {
    const waiting = jobRecord("camp-c");
    const activeA = jobRecord("camp-a", {
      spineStatus: "building_concepts",
      productionStartedAt: NOW,
    });
    const activeB = jobRecord("camp-b", {
      spineStatus: "building_concepts",
      productionStartedAt: NOW,
    });

    const fullLanes = resolveProductionLaneViews([
      { campaignName: "A", job: activeA, tasks: [] },
      { campaignName: "B", job: activeB, tasks: [] },
      { campaignName: "C", job: waiting, tasks: [] },
    ]);
    expect(canTransitionToBuildingConcepts(waiting, [], fullLanes).allowed).toBe(false);

    const openLanes = resolveProductionLaneViews([
      { campaignName: "A", job: activeA, tasks: [] },
      { campaignName: "C", job: waiting, tasks: [] },
    ]);
    expect(openLanes.find((lane) => lane.lane === "quick")?.availableSlots).toBe(1);
    expect(canTransitionToBuildingConcepts(waiting, [], openLanes).allowed).toBe(true);

    const started = applyProductionWorkspacePatch(
      tasksFor(waiting),
      paidCampaign({ campaignId: "camp-c", campaignStatus: "BUILDING_CONCEPTS" }),
      waiting.jobId,
      { action: "start_building_concepts" },
      staffUser(),
      [],
      openLanes,
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.job.spineStatus).toBe("building_concepts");
    expect(started.job.productionStartedAt).toBeTruthy();

    const after = resolveCustomerCurrentStatusOverlay(
      paidCampaign({ campaignId: "camp-c", campaignStatus: "BUILDING_CONCEPTS" }),
      { productionGatePassed: true, blockingRequiredCount: 0, movedToProduction: true },
      [buildCustomerJobStatusSummary(started.job)],
    );
    expect(after?.kind).toBe("producing");
    expect(after?.statusLabel).toBe(statusCopy.labels.producing);

    const voice = answerCustomerLifeQuestion("Has anyone started my project?", {
      campaign: paidCampaign({ campaignId: "camp-c" }),
      tasks: { ...tasksFor(started.job), jobRecords: [started.job] },
    });
    expect(voice.text).toBe(lifeCopy.customerCopy.workStarted);
    expect(voice.phase).toBe("producing");
  });

  it("does not route ordinary quick/standard slot wait to Owner Desk", () => {
    const waiting = jobRecord("camp-c");
    const activeA = jobRecord("camp-a", {
      spineStatus: "building_concepts",
      productionStartedAt: NOW,
    });
    const activeB = jobRecord("camp-b", {
      spineStatus: "building_concepts",
      productionStartedAt: NOW,
    });
    const lanes = resolveProductionLaneViews([
      { campaignName: "A", job: activeA, tasks: [] },
      { campaignName: "B", job: activeB, tasks: [] },
      { campaignName: "C", job: waiting, tasks: [] },
    ]);
    const desk = resolveOwnerDeskItems([
      { campaignId: "camp-c", campaignName: "C", jobs: [waiting], exceptions: [], laneViews: lanes },
      { campaignId: "camp-a", campaignName: "A", jobs: [activeA], exceptions: [], laneViews: lanes },
      { campaignId: "camp-b", campaignName: "B", jobs: [activeB], exceptions: [], laneViews: lanes },
    ]);
    expect(desk).toEqual([]);
    expect(studioHonestProductionWaitV1.alreadyDefinedOwnerDecisions).toEqual(["heavy_lane_full"]);
  });

  it("Board sentence and Voice status use the same slot-wait truth", () => {
    const campaign = paidCampaign({ campaignStatus: "BUILDING_CONCEPTS" });
    const jobs = [buildCustomerJobStatusSummary(jobRecord(campaign.campaignId))];
    const next = resolveWhatHappensNextSentence(campaign, {
      productionGatePassed: true,
      blockingRequiredCount: 0,
      movedToProduction: false,
      jobs,
    });
    expect(next).toBe(statusCopy.leads.waitingForProductionSlot);
    const board = resolveStudioBoardView(campaign, {
      productionGatePassed: true,
      blockingRequiredCount: 0,
      movedToProduction: false,
      jobs,
    });
    expect(board.statusLabel).toBe(statusCopy.labels.preparingToStart);
    expect(board.statusLabel).not.toBe(statusCopy.labels.producing);
    const building = board.progressSteps.find((step) => step.id === "BUILDING_CONCEPTS");
    expect(building?.label).toBe(statusCopy.labels.preparingToStart);
    expect(building?.label).not.toBe("Building Concepts");
  });
});
