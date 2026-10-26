/**
 * Honest production wait — customer Board + Voice use live Campaign Record /
 * job spine / lane occupancy. Do not invent a second production truth system.
 * SharedJobTruth stays tests-only.
 */

import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";

export const STUDIO_HONEST_PRODUCTION_WAIT_PACKAGE_ID =
  "STUDIO-OPERATING-HONEST-PRODUCTION-WAIT-1" as const;

export const studioHonestProductionWaitV1 = {
  packageId: STUDIO_HONEST_PRODUCTION_WAIT_PACKAGE_ID,
  authorizedAt: "2026-09-26" as const,
  sourceOfTruth: "campaign_record_job_spine_lane_views" as const,
  sharedJobTruth: "tests_only" as const,
  codedLaneCapacity: OWNER_CONTROL_ROOM_SECTION.laneCapacity,
  codedLaneCapacityCertified: false as const,
  inventStartDate: false as const,
  inventDeliveryDate: false as const,
  inventQueueNumber: false as const,
  routineWaitRoutesToOwner: false as const,
  alreadyDefinedOwnerDecisions: ["heavy_lane_full"] as const,
  doNotStartStripeLive: true as const,
  doNotStartBrandedEmail: true as const,
  doNotStartCapacityCertification: true as const,
  doNotStartWebsite: true as const,
  doNotStartBeta: true as const,
  doNotStartMarketing: true as const,
} as const;
