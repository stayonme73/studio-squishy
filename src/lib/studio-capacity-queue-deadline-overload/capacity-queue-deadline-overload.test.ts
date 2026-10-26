/**
 * STUDIO-OPERATING-CAPACITY-QUEUE-DEADLINE-OVERLOAD-1
 * Operating envelope only. No invented jobs-per-day.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { INTERNAL_SELL_NOW_SKUS } from "@/config/studio-internal-sell-now-register-v1";
import { LAUNCH_MENU_HONEST_TIMING_LABEL } from "@/config/studio-menu-readiness-and-demand-freeze-v1";
import { studioCustomerLifeV1 as lifeCopy } from "@/config/studio-customer-life-v1";
import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioPreLaunchMasterCloseoutRegisterV1 } from "@/config/studio-pre-launch-master-closeout-register-v1";
import { studioCapacityQueueDeadlineOverloadV1 as stamp } from "@/config/studio-capacity-queue-deadline-overload-v1";
import { getRouteMapTurnaroundLabel } from "@/catalog/route-map-display";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import {
  LIVE_LANE_CAPACITY_SKIP_REASON,
  createLiveLaneCapacityTracker,
  liveLaneForDispatchRecord,
} from "@/lib/job-control/live-lane-capacity";
import { buildJobId, resolveControlLaneForSku } from "@/lib/job-control/lane-map";
import { resolveOwnerDeskItems } from "@/lib/job-control/owner-desk";
import {
  canSubmitForOwnerApproval,
  canTransitionToBuildingConcepts,
} from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { shouldObserveDesignRenderer } from "@/lib/studio-dispatch/design-renderer-observer";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

const REPO = path.resolve(__dirname, "../../..");
const NOW = "2026-09-27T15:00:00.000Z";
const DATE_OR_QUEUE =
  /\b(#\s*\d+|number \d+|tomorrow|friday|monday|2–3 business days|3–5 business days|estimate|by \w+day|\d{4}-\d{2}-\d{2})\b/i;

function job(input: {
  campaignId: string;
  skuId: PurchasedJobRecord["skuId"];
  lane: PurchasedJobRecord["productionLane"];
  spine: PurchasedJobRecord["spineStatus"];
}): PurchasedJobRecord {
  return {
    jobId: buildJobId(input.campaignId, input.skuId),
    campaignId: input.campaignId,
    skuId: input.skuId,
    serviceName: input.skuId,
    spineStatus: input.spine,
    productionLane: input.lane,
    intakeComplete: true,
    productionStartedAt: input.spine === "building_concepts" ? NOW : null,
    laneQueuedAt: NOW,
    updatedAt: NOW,
    acceptanceReview: {
      status: "accepted",
      acceptedAt: NOW,
      acceptedBy: "system",
    },
  } as PurchasedJobRecord;
}

function dispatchRecord(
  campaignId: string,
  skuId: JobDispatchRecord["skuId"],
  lane: NonNullable<JobDispatchRecord["controlLane"]>,
): JobDispatchRecord {
  return {
    dispatchId: `dd:${campaignId}:${skuId}`,
    routingDecisionId: "rd",
    jobId: buildJobId(campaignId, skuId),
    campaignId,
    skuId,
    evaluatedAt: NOW,
    ownerActionRequired: false,
    status: "EXECUTION_IDENTITY_READY",
    productionFamilyId: "design",
    controlLane: lane,
    routingFactFingerprint: "fp",
    requirements: {
      productionFamilyId: "design",
      catalogFamilyId: "design",
      producerRole: "design",
      supportingRoles: [],
      requiredCustomerInputs: [],
      requiredStudioInputs: [],
      optionalInputs: [],
      productionSteps: [],
      qaItemIds: ["qa-1"],
      deliverables: ["one"],
      formatExportRequirements: [],
      limitations: [],
      primaryTool: {
        toolId: "studio_design_renderer",
        label: "Design renderer",
        integrationState: "ready",
        toolReadiness: "ready",
        required: true,
      },
      optionalTools: [],
      capabilityReadiness: "contract_ready",
      readinessNotes: [],
    },
    reason: "ready",
    blocker: null,
    executionIdentityReady: true,
  } as JobDispatchRecord;
}

describe("STUDIO-OPERATING-CAPACITY-QUEUE-DEADLINE-OVERLOAD-1", () => {
  it("certifies the operating rule, not a jobs-per-day number", () => {
    expect(stamp.verdict).toBe("PASS_WITH_EXPLICIT_LIMITS");
    expect(stamp.operatingRuleCertified).toBe(true);
    expect(stamp.numericThroughputCertified).toBe(false);
    expect(stamp.codedLaneCapacity).toEqual({ quick: 2, standard: 2, heavy: 1 });
    expect(stamp.doNotInventJobsPerDay).toBe(true);
    expect(stamp.doNotLowerQualityToAbsorbDemand).toBe(true);
    expect(stamp.nextPackageStarted).toBe(false);
    expect(stamp.nextPackageId).toBe(
      "STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1",
    );
    expect(guide.nextUnfinishedStepId).toBe("controlled_outside_customer_trial");
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.areas
        .capacityQueueDeadlineOverloadRules.classification,
    ).toBe("COMPLETE_WITH_EXPLICIT_LIMITS");
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.recommendedNextSinglePackage
        .packageId,
    ).toBe("STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1");
    expect(
      studioLaunchReadinessExecutionOrderV1.preLaunchMasterCloseoutRegister
        .recommendedNextPackageId,
    ).toBe("STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1");
    expect(existsSync(path.join(REPO, stamp.stampDoc))).toBe(true);
    expect(existsSync(path.join(REPO, stamp.proofJson))).toBe(true);
  });

  it("maps the frozen public 11 onto coded Quick / Standard / Heavy lanes", () => {
    const lanes = INTERNAL_SELL_NOW_SKUS.map((skuId) => ({
      skuId,
      catalogLane: getServiceById(skuId)?.productionLane,
      controlLane: resolveControlLaneForSku(skuId),
    }));
    expect(lanes).toHaveLength(11);
    expect(lanes.every((row) => row.catalogLane)).toBe(true);
    expect(new Set(lanes.map((row) => row.controlLane))).toEqual(
      new Set(["quick", "standard", "heavy"]),
    );
    expect(
      lanes.filter((row) => row.controlLane === "heavy").map((row) => row.skuId),
    ).toEqual(
      expect.arrayContaining([
        "v2-rtu-short-video",
        "v2-rtu-short-form-video-edit",
        "v2-rtu-clip-repurposing",
      ]),
    );
  });

  it("keeps two lanes isolated and queues overflow instead of overcommitting", () => {
    const quickA = job({
      campaignId: "cap-q-a",
      skuId: "v2-rtu-flyer",
      lane: "quick",
      spine: "building_concepts",
    });
    const quickB = job({
      campaignId: "cap-q-b",
      skuId: "v2-rtu-business-card",
      lane: "quick",
      spine: "building_concepts",
    });
    const quickWait = job({
      campaignId: "cap-q-c",
      skuId: "v2-rtu-flyer",
      lane: "quick",
      spine: "ready_for_queue",
    });
    const standardA = job({
      campaignId: "cap-s-a",
      skuId: "v2-rtu-social-posts",
      lane: "standard",
      spine: "building_concepts",
    });
    const standardWait = job({
      campaignId: "cap-s-b",
      skuId: "v2-rtu-menu",
      lane: "standard",
      spine: "ready_for_queue",
    });

    const views = resolveProductionLaneViews([
      { campaignName: "QA", job: quickA, tasks: [] },
      { campaignName: "QB", job: quickB, tasks: [] },
      { campaignName: "QC", job: quickWait, tasks: [] },
      { campaignName: "SA", job: standardA, tasks: [] },
      { campaignName: "SB", job: standardWait, tasks: [] },
    ]);
    const quick = views.find((lane) => lane.lane === "quick");
    const standard = views.find((lane) => lane.lane === "standard");
    expect(quick?.activeCount).toBe(2);
    expect(quick?.isFull).toBe(true);
    expect(quick?.nextUpJobs.map((entry) => entry.jobId)).toEqual([quickWait.jobId]);
    expect(standard?.activeCount).toBe(1);
    expect(standard?.availableSlots).toBe(1);
    expect(standard?.nextUpJobs.map((entry) => entry.jobId)).toEqual([
      standardWait.jobId,
    ]);
    expect(canTransitionToBuildingConcepts(quickWait, [], views).allowed).toBe(
      false,
    );
    expect(canTransitionToBuildingConcepts(standardWait, [], views).allowed).toBe(
      true,
    );

    const desk = resolveOwnerDeskItems([
      {
        campaignId: "cap-q-c",
        campaignName: "QC",
        jobs: [quickWait],
        exceptions: [],
        laneViews: views,
      },
    ]);
    expect(desk.some((item) => item.reason === "heavy_lane_full")).toBe(false);
  });

  it("keeps Heavy overflow waiting without an Owner page; live Machine skip uses the same cap", () => {
    const heavyLive = job({
      campaignId: "cap-h-a",
      skuId: "v2-rtu-short-video",
      lane: "heavy",
      spine: "building_concepts",
    });
    const heavyWait = job({
      campaignId: "cap-h-b",
      skuId: "v2-rtu-clip-repurposing",
      lane: "heavy",
      spine: "ready_for_queue",
    });
    const views = resolveProductionLaneViews([
      { campaignName: "HA", job: heavyLive, tasks: [] },
      { campaignName: "HB", job: heavyWait, tasks: [] },
    ]);
    const desk = resolveOwnerDeskItems([
      {
        campaignId: "cap-h-b",
        campaignName: "HB",
        jobs: [heavyWait],
        exceptions: [],
        laneViews: views,
      },
    ]);
    expect(desk.some((item) => item.reason === "heavy_lane_full")).toBe(false);

    const tracker = createLiveLaneCapacityTracker(views);
    const waiting = liveLaneForDispatchRecord(
      dispatchRecord("cap-h-b", "v2-rtu-clip-repurposing", "heavy"),
    );
    const live = liveLaneForDispatchRecord(
      dispatchRecord("cap-h-a", "v2-rtu-short-video", "heavy"),
    );
    expect(tracker.allows(live)).toBe(true);
    expect(tracker.allows(waiting)).toBe(false);
    expect(LIVE_LANE_CAPACITY_SKIP_REASON).toBe("waiting_for_production_slot");
  });

  it("does not let a third same-pass job slip around a full Quick lane", () => {
    const open = resolveProductionLaneViews([]);
    const tracker = createLiveLaneCapacityTracker(open);
    const first = liveLaneForDispatchRecord(
      dispatchRecord("cap-pass-a", "v2-rtu-flyer", "quick"),
    );
    const second = liveLaneForDispatchRecord(
      dispatchRecord("cap-pass-b", "v2-rtu-business-card", "quick"),
    );
    const third = liveLaneForDispatchRecord(
      dispatchRecord("cap-pass-c", "v2-rtu-flyer", "quick"),
    );
    expect(tracker.allows(first)).toBe(true);
    tracker.occupy(first);
    expect(tracker.allows(second)).toBe(true);
    tracker.occupy(second);
    expect(tracker.allows(third)).toBe(false);
  });

  it("keeps public timing and Voice slot-wait free of invented dates or queue numbers", () => {
    for (const skuId of INTERNAL_SELL_NOW_SKUS) {
      const service = getServiceById(skuId);
      expect(service).toBeTruthy();
      if (!service) continue;
      const label = getRouteMapTurnaroundLabel(service);
      expect(label).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
      expect(label).not.toMatch(DATE_OR_QUEUE);
    }
    expect(lifeCopy.customerCopy.whenStartInLine).not.toMatch(DATE_OR_QUEUE);
    expect(lifeCopy.customerCopy.workWaitingForSlot).not.toMatch(DATE_OR_QUEUE);
    expect(lifeCopy.customerCopy.whenStartInLine.toLowerCase()).toContain(
      "production slot",
    );
  });

  it("does not drop QA because the lane is busy", () => {
    const busy = job({
      campaignId: "cap-qa-a",
      skuId: "v2-rtu-social-posts",
      lane: "standard",
      spine: "building_concepts",
    });
    const gate = canSubmitForOwnerApproval(busy, ["Post 1", "Post 2"]);
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((reason) => reason.code !== "wrong_status")).toBe(
      true,
    );
    const observed = shouldObserveDesignRenderer(
      dispatchRecord("cap-qa-b", "v2-rtu-social-posts", "standard"),
    );
    expect(observed.invoke).toBe(true);
  });
});
