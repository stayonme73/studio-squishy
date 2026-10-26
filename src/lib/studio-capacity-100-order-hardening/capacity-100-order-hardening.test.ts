import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioCapacity100OrderHardeningV1 as pack } from "@/config/studio-capacity-100-order-hardening-v1";
import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { buildJobId } from "@/lib/job-control/lane-map";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import { resolveOwnerDeskItems } from "@/lib/job-control/owner-desk";
import {
  acquireHeavyOccupancyLock,
  readHeavyOccupancyLock,
  recoverStaleHeavyOccupancyLock,
  releaseHeavyOccupancyLock,
} from "@/lib/job-control/heavy-occupancy-lock";
import { createLiveLaneCapacityTracker } from "@/lib/job-control/live-lane-capacity";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { soldContractIsolationHolds } from "@/lib/studio-capacity-and-overload-certification/isolation";
import {
  burstSuite,
  clusteredArrivals,
  simulateBurst,
} from "@/lib/studio-capacity-and-overload-certification/simulate";
import { evaluateHeavyStopSale, STOP_SALE_NEXT_UP_DEPTH } from "./stop-sale";
import { certifyHundredAfterHardening } from "./recert";

const NOW = "2026-10-03T13:00:00.000Z";

function heavyJob(
  campaignId: string,
  skuId: PurchasedJobRecord["skuId"],
  spine: PurchasedJobRecord["spineStatus"],
  extra?: Partial<PurchasedJobRecord>,
): PurchasedJobRecord {
  return {
    jobId: buildJobId(campaignId, skuId),
    campaignId,
    skuId,
    serviceName: skuId,
    spineStatus: spine,
    productionLane: "heavy",
    intakeComplete: true,
    productionStartedAt: spine === "building_concepts" ? NOW : null,
    laneQueuedAt: NOW,
    updatedAt: NOW,
    acceptanceReview: {
      status: "accepted",
      acceptedAt: NOW,
      acceptedBy: "system",
    },
    ...extra,
  } as PurchasedJobRecord;
}

function viewsForQueue(waiting: number) {
  const live = heavyJob("cap-live", "v2-rtu-clip-repurposing", "building_concepts");
  const queued = Array.from({ length: waiting }, (_, index) =>
    heavyJob(
      `cap-wait-${index + 1}`,
      "v2-rtu-short-form-video-edit",
      "ready_for_queue",
    ),
  );
  return resolveProductionLaneViews(
    [live, ...queued].map((job) => ({
      campaignName: job.campaignId,
      job,
      tasks: [],
    })),
  );
}

describe("STUDIO-CAPACITY-100-ORDER-HARDENING-1", () => {
  it("does not page Owner for routine Heavy overflow and keeps the waiter in line", () => {
    const views = viewsForQueue(1);
    const wait = heavyJob("cap-wait-1", "v2-rtu-short-form-video-edit", "ready_for_queue");
    const live = heavyJob("cap-live", "v2-rtu-clip-repurposing", "building_concepts");
    const desk = resolveOwnerDeskItems([
      { campaignId: live.campaignId, campaignName: "Live", jobs: [live], exceptions: [], laneViews: views },
      { campaignId: wait.campaignId, campaignName: "Wait", jobs: [wait], exceptions: [], laneViews: views },
    ]);
    expect(desk.some((item) => item.reason === "heavy_lane_full")).toBe(false);
    const tracker = createLiveLaneCapacityTracker(views);
    expect(tracker.allows({ jobId: live.jobId, productionLane: "heavy" })).toBe(true);
    expect(tracker.allows({ jobId: wait.jobId, productionLane: "heavy" })).toBe(false);
    expect(OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy).toBe(1);
    expect(pack.doNotRaiseHeavyConcurrencyFromThisStamp).toBe(true);
  });

  it("pages Owner only for an explicit Heavy priority bump", () => {
    const live = heavyJob("cap-live", "v2-rtu-clip-repurposing", "building_concepts");
    const wait = heavyJob("cap-wait-1", "v2-rtu-short-form-video-edit", "ready_for_queue", {
      heavyLaneBumpRequested: true,
    });
    const views = resolveProductionLaneViews([
      { campaignName: "Live", job: live, tasks: [] },
      { campaignName: "Wait", job: wait, tasks: [] },
    ]);
    const desk = resolveOwnerDeskItems([
      { campaignId: wait.campaignId, campaignName: "Wait", jobs: [wait], exceptions: [], laneViews: views },
    ]);
    expect(desk.some((item) => item.reason === "heavy_lane_full")).toBe(true);
  });

  it("activates stop-sale at next-up depth 3 and clears below it", () => {
    const blocked = evaluateHeavyStopSale({
      selectedServiceIds: ["v2-rtu-clip-repurposing"],
      laneViews: viewsForQueue(STOP_SALE_NEXT_UP_DEPTH),
    });
    expect(blocked.blocked).toBe(true);
    expect(blocked.reason).toBe("next_up_depth");
    expect(blocked.customerCopy).toBe(pack.customerCopy.studioAtCapacity);
    expect(blocked.customerCopy).not.toMatch(/\d{4}-\d{2}-\d{2}|queue position|Tuesday|Friday/i);

    const open = evaluateHeavyStopSale({
      selectedServiceIds: ["v2-rtu-clip-repurposing"],
      laneViews: viewsForQueue(2),
    });
    expect(open.blocked).toBe(false);

    const flyer = evaluateHeavyStopSale({
      selectedServiceIds: ["v2-rtu-flyer"],
      laneViews: viewsForQueue(STOP_SALE_NEXT_UP_DEPTH),
    });
    expect(flyer.blocked).toBe(false);

    const paidProtected = evaluateHeavyStopSale({
      selectedServiceIds: ["v2-rtu-clip-repurposing"],
      laneViews: viewsForQueue(STOP_SALE_NEXT_UP_DEPTH),
      alreadyPaidProtected: true,
    });
    expect(paidProtected.blocked).toBe(false);
  });

  it("activates stop-sale when predicted wait exceeds 4 hours", () => {
    const many = viewsForQueue(12);
    const decision = evaluateHeavyStopSale({
      selectedServiceIds: ["v2-rtu-clip-repurposing"],
      laneViews: many,
    });
    expect(decision.blocked).toBe(true);
    expect(["wait", "next_up_depth"]).toContain(decision.reason);
  });

  it("gives the durable Heavy lock to exactly one job and recovers a stale leftover", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "heavy-lock-"));
    try {
      const first = acquireHeavyOccupancyLock({
        repoRoot,
        jobId: "camp-a:v2-rtu-clip-repurposing",
        campaignId: "camp-a",
        now: NOW,
      });
      const second = acquireHeavyOccupancyLock({
        repoRoot,
        jobId: "camp-b:v2-rtu-short-form-video-edit",
        campaignId: "camp-b",
        now: NOW,
      });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.reason).toBe("held_by_other");
      expect(readHeavyOccupancyLock(repoRoot)?.jobId).toBe(
        "camp-a:v2-rtu-clip-repurposing",
      );

      expect(
        releaseHeavyOccupancyLock({
          repoRoot,
          jobId: "camp-a:v2-rtu-clip-repurposing",
        }),
      ).toBe(true);
      const afterRelease = acquireHeavyOccupancyLock({
        repoRoot,
        jobId: "camp-b:v2-rtu-short-form-video-edit",
        campaignId: "camp-b",
        now: NOW,
      });
      expect(afterRelease.ok).toBe(true);

      const stale = recoverStaleHeavyOccupancyLock({
        repoRoot,
        occupyingJobIds: [],
        viewsAuthoritative: true,
      });
      expect(stale.recovered).toBe(true);
      expect(readHeavyOccupancyLock(repoRoot)).toBeNull();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("keeps Cole and River isolated and does not skip Quality in burst recert", () => {
    expect(soldContractIsolationHolds()).toBe(true);
    for (const burst of burstSuite()) {
      expect(burst.producingAtOnceMax).toBe(1);
      expect(burst.qualitySkipped).toBe(false);
      expect(burst.crossProjectContaminationPossibleUnderSerialHeavy).toBe(false);
    }
  });

  it("re-runs 3 / 5 / 10 bursts under Heavy=1 with no duplicate starts", () => {
    const three = simulateBurst({
      label: "3",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 3,
        sku: "v2-rtu-clip-repurposing",
        windowMs: 3_600_000,
        prefix: "hard-3",
      }),
    });
    const five = simulateBurst({
      label: "5",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 5,
        sku: "v2-rtu-clip-repurposing",
        windowMs: 8 * 3_600_000,
        prefix: "hard-5",
      }),
    });
    const ten = simulateBurst({
      label: "10",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 10,
        sku: "v2-rtu-clip-repurposing",
        windowMs: 8 * 3_600_000,
        prefix: "hard-10",
      }),
    });
    expect(three.producingAtOnceMax).toBe(1);
    expect(five.producingAtOnceMax).toBe(1);
    expect(ten.producingAtOnceMax).toBe(1);
    expect(ten.finishMs).toBeLessThan(24 * 3_600_000);
    expect(ten.qualitySkipped).toBe(false);
    expect(three.waitMsMax).toBeGreaterThan(0);
  });

  it("certifies 100 as safe unattended after the three factory fixes", () => {
    const result = certifyHundredAfterHardening();
    expect(result.classification).toBe("A_100_ORDER_CAPACITY_CERTIFIED");
    expect(result.hundredSafeUnattended).toBe(true);
    expect(result.normalCapacityOrdersPerMonth).toBe(100);
    expect(result.highCapacity.certified).toBe(true);
    expect(result.stopSaleImplemented).toBe(true);
    expect(result.durableLockImplemented).toBe(true);
    expect(result.autoWait.routineOverflowPagesOwner).toBe(false);
    expect(result.heavyCapacity).toBe(1);
  });
});
