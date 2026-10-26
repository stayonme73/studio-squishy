import { studioCapacity100OrderHardeningV1 as pack } from "@/config/studio-capacity-100-order-hardening-v1";
import type { ServiceId } from "@/catalog/types";
import type { ProductionLaneView } from "@/lib/job-control/capacity";
import { parseJobId, resolveControlLaneForSku } from "@/lib/job-control/lane-map";
import { CLIP_SOLD_CONTRACT_MEASURED_MS } from "@/config/studio-capacity-and-overload-certification-v1";
import { shortFormContentPackWorkload } from "@/lib/studio-capacity-and-overload-certification/workload";

export const STOP_SALE_NEXT_UP_DEPTH = pack.stopSale.nextUpDepth;
export const STOP_SALE_WAIT_MS = pack.stopSale.waitHours * 3_600_000;

export type HeavyStopSaleDecision = {
  blocked: boolean;
  reason: "next_up_depth" | "wait" | "capacity_unknown" | null;
  nextUpDepth: number;
  predictedWaitMs: number;
  customerCopy: string;
};

export function cartIncludesHeavySku(
  selectedServiceIds: readonly string[],
): boolean {
  return selectedServiceIds.some(
    (sku) => resolveControlLaneForSku(sku as ServiceId) === "heavy",
  );
}

export function occupancyMsForSku(skuId: string): number {
  if (skuId === "v2-rtu-short-form-video-edit") {
    return shortFormContentPackWorkload().withIncludedRevisionHeavyMs;
  }
  if (skuId === "v2-rtu-clip-repurposing") {
    return CLIP_SOLD_CONTRACT_MEASURED_MS.heavySlotOccupancy;
  }
  return CLIP_SOLD_CONTRACT_MEASURED_MS.heavySlotOccupancy;
}

export function predictedHeavyWaitMs(laneViews: readonly ProductionLaneView[]): number {
  const heavy = laneViews.find((lane) => lane.lane === "heavy");
  if (!heavy) return 0;
  const queued = [...heavy.activeJobs, ...heavy.nextUpJobs];
  return queued.reduce((sum, job) => {
    const parsed = parseJobId(job.jobId);
    return sum + occupancyMsForSku(parsed?.skuId ?? "v2-rtu-clip-repurposing");
  }, 0);
}

export function evaluateHeavyStopSale(input: {
  selectedServiceIds: readonly string[];
  laneViews: readonly ProductionLaneView[] | null;
  alreadyPaidProtected?: boolean;
}): HeavyStopSaleDecision {
  if (input.alreadyPaidProtected) {
    return {
      blocked: false,
      reason: null,
      nextUpDepth: 0,
      predictedWaitMs: 0,
      customerCopy: "",
    };
  }
  if (!cartIncludesHeavySku(input.selectedServiceIds)) {
    return {
      blocked: false,
      reason: null,
      nextUpDepth: 0,
      predictedWaitMs: 0,
      customerCopy: "",
    };
  }
  if (input.laneViews == null) {
    return {
      blocked: true,
      reason: "capacity_unknown",
      nextUpDepth: 0,
      predictedWaitMs: 0,
      customerCopy: pack.customerCopy.capacityUnknown,
    };
  }

  const heavy = input.laneViews.find((lane) => lane.lane === "heavy");
  const nextUpDepth = heavy?.nextUpJobs.length ?? 0;
  const predictedWaitMs = predictedHeavyWaitMs(input.laneViews);
  if (nextUpDepth >= STOP_SALE_NEXT_UP_DEPTH) {
    return {
      blocked: true,
      reason: "next_up_depth",
      nextUpDepth,
      predictedWaitMs,
      customerCopy: pack.customerCopy.studioAtCapacity,
    };
  }
  if (predictedWaitMs > STOP_SALE_WAIT_MS) {
    return {
      blocked: true,
      reason: "wait",
      nextUpDepth,
      predictedWaitMs,
      customerCopy: pack.customerCopy.studioAtCapacity,
    };
  }
  return {
    blocked: false,
    reason: null,
    nextUpDepth,
    predictedWaitMs,
    customerCopy: "",
  };
}
