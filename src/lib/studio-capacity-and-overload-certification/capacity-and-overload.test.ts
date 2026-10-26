import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { studioCapacityAndOverloadCertificationV1 as pack } from "@/config/studio-capacity-and-overload-certification-v1";
import { resolveControlLaneForSku } from "@/lib/job-control/lane-map";
import { LIVE_LANE_CAPACITY_SKIP_REASON } from "@/lib/job-control/live-lane-capacity";
import { createLiveLaneCapacityTracker } from "@/lib/job-control/live-lane-capacity";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import { resolveOwnerDeskItems } from "@/lib/job-control/owner-desk";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import {
  soldContractIsolationHolds,
} from "./isolation";
import { inspectConcurrencyLimits } from "./concurrency";
import {
  burstSuite,
  certifyCapacity,
  monthlyMatrix,
  simulateBurst,
  clusteredArrivals,
} from "./simulate";
import {
  clipRepurposingWorkload,
  scopedServicesAreHeavy,
  shortFormContentPackWorkload,
} from "./workload";

const NOW = "2026-10-03T12:00:00.000Z";

function heavyJob(campaignId: string, skuId: PurchasedJobRecord["skuId"], spine: PurchasedJobRecord["spineStatus"]): PurchasedJobRecord {
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
  } as PurchasedJobRecord;
}

describe("STUDIO-CAPACITY-AND-OVERLOAD-CERTIFICATION-1", () => {
  it("keeps both in-scope SKUs on Heavy 1 and does not invent a second slot", () => {
    expect(scopedServicesAreHeavy()).toBe(true);
    expect(resolveControlLaneForSku("v2-rtu-short-form-video-edit")).toBe("heavy");
    expect(resolveControlLaneForSku("v2-rtu-clip-repurposing")).toBe("heavy");
    expect(pack.heavyLaneCapacity).toBe(1);
    expect(OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy).toBe(1);
    expect(pack.doNotRaiseHeavyConcurrencyFromThisStamp).toBe(true);
    expect(LIVE_LANE_CAPACITY_SKIP_REASON).toBe("waiting_for_production_slot");
  });

  it("classifies Clip clocks as measured and Short-Form revision as derived", () => {
    const clip = clipRepurposingWorkload();
    const shorts = shortFormContentPackWorkload();
    expect(clip.withRevisionHeavyKind).toBe("MEASURED");
    expect(clip.withIncludedRevisionHeavyMs).toBe(1353334);
    expect(clip.lines.some((line) => line.kind === "UNKNOWN")).toBe(true);
    expect(shorts.firstCutHeavyKind).toBe("MEASURED");
    expect(shorts.firstCutHeavyMs).toBe(303974);
    expect(shorts.withRevisionHeavyKind).toBe("DERIVED_FROM_MEASURED");
    expect(shorts.withIncludedRevisionHeavyMs).toBe(464315);
    expect(shorts.vendor.ownerProductionMinutes).toBe(0);
    expect(clip.vendor.ownerProductionMinutes).toBe(0);
  });

  it("does not silently start a second Heavy job", () => {
    const live = heavyJob("cap-a", "v2-rtu-clip-repurposing", "building_concepts");
    const wait = heavyJob("cap-b", "v2-rtu-short-form-video-edit", "ready_for_queue");
    const views = resolveProductionLaneViews([
      { campaignName: "A", job: live, tasks: [] },
      { campaignName: "B", job: wait, tasks: [] },
    ]);
    const tracker = createLiveLaneCapacityTracker(views);
    expect(tracker.allows({ jobId: live.jobId, productionLane: "heavy" })).toBe(true);
    expect(tracker.allows({ jobId: wait.jobId, productionLane: "heavy" })).toBe(false);
    const desk = resolveOwnerDeskItems([
      {
        campaignId: "cap-a",
        campaignName: "A",
        jobs: [live],
        exceptions: [],
        laneViews: views,
      },
      {
        campaignId: "cap-b",
        campaignName: "B",
        jobs: [wait],
        exceptions: [],
        laneViews: views,
      },
    ]);
    expect(desk.some((item) => item.reason === "heavy_lane_full")).toBe(false);
  });

  it("keeps Cole and River artifact roots isolated", () => {
    expect(soldContractIsolationHolds()).toBe(true);
  });

  it("simulates 25/50/75/100 mixed loads without skipping Quality", () => {
    const matrix = monthlyMatrix();
    expect(matrix).toHaveLength(12);
    for (const point of matrix) {
      expect(point.orders).toBeGreaterThan(0);
      expect(point.clipOrders + point.shortFormOrders).toBe(point.orders);
      expect(point.heavyHoursRevision).toBeGreaterThan(0);
    }
    const clip100 = matrix.find((row) => row.orders === 100 && row.mix === "mostly_clip");
    expect(clip100?.timeFeasibleBusiness).toBe(true);
    expect(clip100?.ownerFreeBusiness).toBe(false);
    expect(clip100?.businessUtilizationRevision).toBeLessThan(0.5);
  });

  it("burst suite never produces two Heavy jobs at once or skips QA", () => {
    for (const burst of burstSuite()) {
      expect(burst.producingAtOnceMax).toBe(1);
      expect(burst.qualitySkipped).toBe(false);
      expect(burst.crossProjectContaminationPossibleUnderSerialHeavy).toBe(false);
    }
    const three = burstSuite().find((row) => row.label.startsWith("3 Clip"));
    expect(three?.ownerHeavyDeskEvents).toBe(2);
    expect(three?.waitMsMax).toBeGreaterThan(0);
  });

  it("10 same-day Clip arrivals finish in one business day with full QA", () => {
    const ten = simulateBurst({
      label: "check",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 10,
        sku: "v2-rtu-clip-repurposing",
        windowMs: 8 * 3_600_000,
        prefix: "day10",
      }),
    });
    expect(ten.finishMs).toBeLessThan(8 * 3_600_000 + 10 * 1_353_334);
    expect(ten.finishMs).toBeLessThan(24 * 3_600_000);
    expect(ten.qualitySkipped).toBe(false);
    expect(ten.ownerHeavyDeskEvents).toBe(9);
  });

  it("certifies below 100 because Owner overflow and missing stop-sale remain", () => {
    const result = certifyCapacity();
    expect(result.hundredSafe).toBe(false);
    expect(result.highCapacity.certified).toBe(false);
    expect(result.stopSaleImplemented).toBe(false);
    expect(result.normalCapacityOrdersPerMonth).toBe(25);
    expect(result.classification).toBe("B_CAPACITY_CERTIFIED_BELOW_100");
    expect(result.heavyLaneClassification).toBe("A_REQUIRED_FOR_CORRECTNESS_TODAY");
    expect(
      inspectConcurrencyLimits().some(
        (limit) =>
          limit.id === "stop_sale" && limit.currentLimit.startsWith("None"),
      ),
    ).toBe(true);
  });

  it("does not claim prior operating-envelope stamp was a monthly number", () => {
    const prior = readFileSync(
      path.join(
        process.cwd(),
        "docs/launch/studio-operating-capacity-queue-deadline-overload-1/proof.json",
      ),
      "utf8",
    );
    expect(prior).toContain('"numericThroughputCertified": false');
  });
});
