/**
 * Capacity before volume. Numeric monthly capacity — not a publish or price change.
 * Does not raise Heavy concurrency. Does not lower Quality.
 */

import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";

export const STUDIO_CAPACITY_AND_OVERLOAD_CERTIFICATION_PACKAGE_ID =
  "STUDIO-CAPACITY-AND-OVERLOAD-CERTIFICATION-1" as const;

export const CLIP_SOLD_CONTRACT_SOURCE_SECONDS = 1403.455396;
export const CLIP_SOLD_CONTRACT_SOURCE_LABEL = "23:23" as const;

/** Preserved sold-contract Clip clocks. Do not rewrite as estimates. */
export const CLIP_SOLD_CONTRACT_MEASURED_MS = {
  sourceAudioGate: 16076,
  firstCutDispatch: 926844,
  remake: 410414,
  qualityFirstCut: 21127,
  qualityRevision: 30351,
  factoryElapsed: 1337163,
  heavySlotOccupancy: 1353334,
} as const;

export const CLIP_SOLD_CONTRACT_VENDOR = {
  deepgramUsdList: 0.1006,
  shotstackCredits: 0.62,
  shotstackRenders: 6,
  elevenLabsCredits: 0,
  anthropicPerformanceWatchUsd: 0.098679,
  ownerProductionMinutes: 0,
} as const;

/** Stamped $349 Short-Form Content Pack first-cut spend. */
export const SHORT_FORM_PACK_MEASURED_MS = {
  firstCutElapsed: 303974,
} as const;

export const SHORT_FORM_PACK_VENDOR = {
  deepgramUsd: 0.0042,
  elevenCredits: 0,
  stockMediaUsd: 0,
  shotstackRenders: 0,
  ownerRoutineLaborRequired: false,
} as const;

export const studioCapacityAndOverloadCertificationV1 = {
  packageId: STUDIO_CAPACITY_AND_OVERLOAD_CERTIFICATION_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  rule: "CAPACITY_BEFORE_VOLUME" as const,
  doNotLowerQuality: true as const,
  doNotRaiseHeavyConcurrencyFromThisStamp: true as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangeMenu: true as const,
  doNotChangePrice: true as const,
  doNotChangeStripe: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  ownerIsNotRoutineProductionLabor: true as const,
  servicesInScope: [
    "v2-rtu-short-form-video-edit",
    "v2-rtu-clip-repurposing",
  ] as const,
  codedLaneCapacity: OWNER_CONTROL_ROOM_SECTION.laneCapacity,
  bothSkusShareHeavyLane: true as const,
  heavyLaneCapacity: OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy,
  targetsToTest: [25, 50, 75, 100] as const,
  hundredIsATargetNotACapability: true as const,
  operatingHours: {
    businessDaysPerMonth: 22,
    businessHoursPerDay: 8,
    calendarDaysPerMonth: 30,
    unattendedHoursPerDay: 24,
  },
  revisionAllowance: {
    includedRounds: 1,
    planAsIfEveryOrderUsesIncludedRound: true as const,
    realizedUseRateUnknown: true as const,
  },
  stampDoc:
    "docs/launch/studio-capacity-and-overload-certification-1/STUDIO-CAPACITY-AND-OVERLOAD-CERTIFICATION-1.md" as const,
  proofJson:
    "docs/launch/studio-capacity-and-overload-certification-1/STUDIO-CAPACITY-AND-OVERLOAD-CERTIFICATION-1.json" as const,
} as const;
