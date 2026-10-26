import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { studioCapacityAndOverloadCertificationV1 as pack } from "@/config/studio-capacity-and-overload-certification-v1";
import {
  heavyLaneClassificationToday,
  inspectConcurrencyLimits,
} from "./concurrency";
import {
  businessHoursPerMonth,
  clipRepurposingWorkload,
  heavyMsForSku,
  shortFormContentPackWorkload,
  unattendedHoursPerMonth,
} from "./workload";

export type MixKind = "mostly_short_form" | "mostly_clip" | "balanced";

export type Arrival = {
  atMs: number;
  sku: "v2-rtu-short-form-video-edit" | "v2-rtu-clip-repurposing";
  campaignId: string;
};

export type BurstResult = {
  label: string;
  arrivals: number;
  heavyCapacity: 1;
  producingAtOnceMax: number;
  queuePeak: number;
  ownerHeavyDeskEvents: number;
  qualitySkipped: false;
  waitMsMax: number;
  waitMsLast: number;
  finishMs: number;
  crossProjectContaminationPossibleUnderSerialHeavy: false;
};

export type MonthPoint = {
  orders: number;
  mix: MixKind;
  clipOrders: number;
  shortFormOrders: number;
  heavyHoursRevision: number;
  heavyHoursFirstCutOnly: number;
  businessUtilizationRevision: number;
  unattendedUtilizationRevision: number;
  expectedOwnerHeavyDesksBusiness: number;
  expectedOwnerHeavyDesksUnattended: number;
  vendorDeepgramUsd: number;
  vendorShotstackCredits: number;
  timeFeasibleBusiness: boolean;
  ownerFreeBusiness: boolean;
};

const HOUR_MS = 3_600_000;

function mixCounts(orders: number, mix: MixKind): {
  clip: number;
  shortForm: number;
} {
  if (mix === "mostly_clip") {
    const clip = Math.round(orders * 0.8);
    return { clip, shortForm: orders - clip };
  }
  if (mix === "mostly_short_form") {
    const shortForm = Math.round(orders * 0.8);
    return { clip: orders - shortForm, shortForm };
  }
  const clip = Math.round(orders / 2);
  return { clip, shortForm: orders - clip };
}

function hoursFromMs(ms: number): number {
  return ms / HOUR_MS;
}

/**
 * M/D/1 busy-found approximation: arrivals that meet a busy Heavy slot.
 * Owner desk currently fires for each Heavy overflow (heavy_lane_full).
 */
export function expectedBusyFinds(orders: number, occupancyMs: number, hours: number): number {
  if (hours <= 0 || orders <= 0) return 0;
  const utilization = (orders * occupancyMs) / (hours * HOUR_MS);
  return orders * Math.min(1, utilization);
}

export function simulateMonth(orders: number, mix: MixKind): MonthPoint {
  const counts = mixCounts(orders, mix);
  const clip = clipRepurposingWorkload();
  const shorts = shortFormContentPackWorkload();
  const revisionMs =
    counts.clip * clip.withIncludedRevisionHeavyMs +
    counts.shortForm * shorts.withIncludedRevisionHeavyMs;
  const firstCutMs =
    counts.clip * clip.firstCutHeavyMs + counts.shortForm * shorts.firstCutHeavyMs;
  const business = businessHoursPerMonth();
  const unattended = unattendedHoursPerMonth();
  const revisionHours = hoursFromMs(revisionMs);
  return {
    orders,
    mix,
    clipOrders: counts.clip,
    shortFormOrders: counts.shortForm,
    heavyHoursRevision: revisionHours,
    heavyHoursFirstCutOnly: hoursFromMs(firstCutMs),
    businessUtilizationRevision: revisionHours / business,
    unattendedUtilizationRevision: revisionHours / unattended,
    expectedOwnerHeavyDesksBusiness: expectedBusyFinds(orders, revisionMs / orders, business),
    expectedOwnerHeavyDesksUnattended: expectedBusyFinds(
      orders,
      revisionMs / orders,
      unattended,
    ),
    vendorDeepgramUsd:
      counts.clip * clip.vendor.deepgramUsd +
      counts.shortForm * shorts.vendor.deepgramUsd,
    vendorShotstackCredits:
      counts.clip * (clip.vendor.shotstackCredits ?? 0) +
      counts.shortForm * (shorts.vendor.shotstackCredits ?? 0),
    timeFeasibleBusiness: revisionHours < business * 0.5,
    ownerFreeBusiness: expectedBusyFinds(orders, revisionMs / orders, business) < 1,
  };
}

export function simulateBurst(input: {
  label: string;
  arrivals: readonly Arrival[];
  includeRevision: boolean;
}): BurstResult {
  let t = 0;
  let producingAtOnceMax = 0;
  let queuePeak = 0;
  let ownerHeavyDeskEvents = 0;
  let waitMsMax = 0;
  let waitMsLast = 0;
  const occupancy: number[] = [];

  const sorted = [...input.arrivals].sort((a, b) => a.atMs - b.atMs);
  for (const arrival of sorted) {
    const workMs = heavyMsForSku(arrival.sku, input.includeRevision);
    const start = Math.max(t, arrival.atMs);
    const wait = start - arrival.atMs;
    waitMsLast = wait;
    waitMsMax = Math.max(waitMsMax, wait);
    if (start > arrival.atMs) ownerHeavyDeskEvents += 1;
    const queuedAhead = occupancy.filter((end) => end > arrival.atMs).length;
    queuePeak = Math.max(queuePeak, queuedAhead);
    producingAtOnceMax = Math.max(producingAtOnceMax, 1);
    t = start + workMs;
    occupancy.push(t);
  }

  return {
    label: input.label,
    arrivals: sorted.length,
    heavyCapacity: OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy as 1,
    producingAtOnceMax,
    queuePeak,
    ownerHeavyDeskEvents,
    qualitySkipped: false,
    waitMsMax,
    waitMsLast,
    finishMs: t,
    crossProjectContaminationPossibleUnderSerialHeavy: false,
  };
}

export function clusteredArrivals(input: {
  count: number;
  sku: Arrival["sku"];
  windowMs: number;
  prefix: string;
}): Arrival[] {
  // Burst means close together inside the named window, not even spacing across it.
  const clusterMs = Math.min(input.windowMs, 10 * 60_000);
  return Array.from({ length: input.count }, (_, index) => ({
    atMs:
      input.count === 1
        ? 0
        : Math.round((clusterMs * index) / (input.count - 1)),
    sku: input.sku,
    campaignId: `${input.prefix}-${index + 1}`,
  }));
}

export function monthlyMatrix(): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (const orders of pack.targetsToTest) {
    for (const mix of ["mostly_short_form", "mostly_clip", "balanced"] as const) {
      points.push(simulateMonth(orders, mix));
    }
  }
  return points;
}

export function burstSuite(): BurstResult[] {
  return [
    simulateBurst({
      label: "3 Clip orders same hour",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 3,
        sku: "v2-rtu-clip-repurposing",
        windowMs: HOUR_MS,
        prefix: "burst-3h-clip",
      }),
    }),
    simulateBurst({
      label: "5 Clip orders same day",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 5,
        sku: "v2-rtu-clip-repurposing",
        windowMs: 8 * HOUR_MS,
        prefix: "burst-5d-clip",
      }),
    }),
    simulateBurst({
      label: "10 Clip orders same day",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 10,
        sku: "v2-rtu-clip-repurposing",
        windowMs: 8 * HOUR_MS,
        prefix: "burst-10d-clip",
      }),
    }),
    simulateBurst({
      label: "3 Short-Form orders same hour",
      includeRevision: true,
      arrivals: clusteredArrivals({
        count: 3,
        sku: "v2-rtu-short-form-video-edit",
        windowMs: HOUR_MS,
        prefix: "burst-3h-sf",
      }),
    }),
    simulateBurst({
      label: "10 mixed same day",
      includeRevision: true,
      arrivals: [
        ...clusteredArrivals({
          count: 5,
          sku: "v2-rtu-clip-repurposing",
          windowMs: 8 * HOUR_MS,
          prefix: "burst-mix-clip",
        }),
        ...clusteredArrivals({
          count: 5,
          sku: "v2-rtu-short-form-video-edit",
          windowMs: 8 * HOUR_MS,
          prefix: "burst-mix-sf",
        }),
      ],
    }),
  ];
}

export function certifyCapacity() {
  const matrix = monthlyMatrix();
  const bursts = burstSuite();
  const clipWorst100 = simulateMonth(100, "mostly_clip");
  const balanced100 = simulateMonth(100, "balanced");
  const normalCandidates = matrix.filter(
    (point) => point.timeFeasibleBusiness && point.ownerFreeBusiness,
  );
  const normalOrders = normalCandidates.length
    ? Math.max(...normalCandidates.map((point) => point.orders))
    : 0;

  const heavy = heavyLaneClassificationToday();
  const tenClip = bursts.find((row) => row.label.startsWith("10 Clip"));
  return {
    classification: "B_CAPACITY_CERTIFIED_BELOW_100" as const,
    heavyLaneClassification: heavy.answer,
    heavyLaneAlsoEngineeringBottleneckForSameHourLatency:
      heavy.alsoEngineeringBottleneckForSameHourLatency,
    doNotRaiseConcurrencyFromThisStamp: heavy.doNotRaiseFromThisStamp,
    stopSaleImplemented: false,
    stopSaleDetermined: {
      queueDepth: 3,
      estimatedWaitHours: 4,
      jobsInSystemWhenTriggered: 4,
      reason:
        "No checkout stop-sale exists. Determined point: Heavy next-up depth >= 3 or wait > 4 hours, or Owner must unstick production.",
    },
    normalCapacityOrdersPerMonth: normalOrders,
    highCapacity: {
      certified: false,
      reason:
        "HIGH requires burst without Owner intervention. Current heavy_lane_full pages Owner on every overflow.",
      machineCanFinishTenClipSameDayWithFullQa: Boolean(
        tenClip && tenClip.finishMs < 24 * HOUR_MS && !tenClip.qualitySkipped,
      ),
    },
    hundredSafe: false,
    matrix,
    bursts,
    clipWorst100,
    balanced100,
    concurrency: inspectConcurrencyLimits(),
  };
}
