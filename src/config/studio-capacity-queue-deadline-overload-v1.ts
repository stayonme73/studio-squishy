/**
 * Capacity / queue / deadline / overload launch certification.
 * Certifies the operating envelope. Does not invent jobs-per-day.
 */

import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";

export const STUDIO_CAPACITY_QUEUE_DEADLINE_OVERLOAD_PACKAGE_ID =
  "STUDIO-OPERATING-CAPACITY-QUEUE-DEADLINE-OVERLOAD-1" as const;

export const studioCapacityQueueDeadlineOverloadV1 = {
  packageId: STUDIO_CAPACITY_QUEUE_DEADLINE_OVERLOAD_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  verdict: "PASS_WITH_EXPLICIT_LIMITS" as const,
  operatingRuleCertified: true as const,
  numericThroughputCertified: false as const,
  codedLaneCapacity: OWNER_CONTROL_ROOM_SECTION.laneCapacity,
  certifiedLanguage: [
    "Production begins when a Studio production slot is available after you submit Project Details and required materials.",
    "The Studio will not invent a start date, a delivery date, or a queue position.",
    "Coded launch lanes are Quick 2, Standard 2, and Heavy 1 concurrent active jobs.",
    "Overflow waits for a slot. It is not silently started. Routine wait does not reach Owner.",
    "Heavy-lane overflow remains an Owner decision (heavy_lane_full).",
  ] as const,
  doNotInventJobsPerDay: true as const,
  doNotLowerQualityToAbsorbDemand: true as const,
  ownerConsoleParked: true as const,
  room3Closed: true as const,
  doNotStartOutsideTrial: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  defectFixed: "live_machine_dispatch_now_respects_coded_lane_caps" as const,
  nextPackageId:
    "STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1" as const,
  nextPackageStarted: false as const,
  doNotStartNextFromThisStamp: true as const,
  guideSectionTNextRemains: "controlled_outside_customer_trial" as const,
  outsideTrialGateAfterThisStamp: "NOT_READY_REQUIRED_PACKAGE_FIRST" as const,
  stampDoc:
    "docs/launch/studio-operating-capacity-queue-deadline-overload-1/STUDIO-OPERATING-CAPACITY-QUEUE-DEADLINE-OVERLOAD.md" as const,
  proofJson:
    "docs/launch/studio-operating-capacity-queue-deadline-overload-1/proof.json" as const,
} as const;
