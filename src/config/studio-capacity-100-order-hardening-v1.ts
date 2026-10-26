/**
 * Remove the three certified blockers to unattended 100-order operation.
 * Does not raise Heavy concurrency. Does not lower Quality.
 */

import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import {
  CLIP_SOLD_CONTRACT_MEASURED_MS,
  SHORT_FORM_PACK_MEASURED_MS,
} from "@/config/studio-capacity-and-overload-certification-v1";

export const STUDIO_CAPACITY_100_ORDER_HARDENING_PACKAGE_ID =
  "STUDIO-CAPACITY-100-ORDER-HARDENING-1" as const;

export const studioCapacity100OrderHardeningV1 = {
  packageId: STUDIO_CAPACITY_100_ORDER_HARDENING_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  doNotLowerQuality: true as const,
  doNotRaiseHeavyConcurrencyFromThisStamp: true as const,
  heavyLaneCapacity: OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangeMenu: true as const,
  doNotChangePrice: true as const,
  doNotChangeStripe: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  stopSale: {
    nextUpDepth: 3,
    waitHours: 4,
    jobsInSystemWhenDepthTriggered: 4,
  },
  customerCopy: {
    studioAtCapacity:
      "The Studio is at capacity right now. We are not accepting another project until a production slot opens. We will not invent a start date or a delivery date.",
    capacityUnknown:
      "The Studio cannot confirm a production slot right now. Your project is still saved. Please try again shortly.",
  },
  occupancyMs: {
    clipWithRevision: CLIP_SOLD_CONTRACT_MEASURED_MS.heavySlotOccupancy,
    shortFormFirstCut: SHORT_FORM_PACK_MEASURED_MS.firstCutElapsed,
    heartbeatStaleMs: 45 * 60_000,
  },
  stampDoc:
    "docs/launch/studio-capacity-100-order-hardening-1/STUDIO-CAPACITY-100-ORDER-HARDENING-1.md" as const,
  proofJson:
    "docs/launch/studio-capacity-100-order-hardening-1/STUDIO-CAPACITY-100-ORDER-HARDENING-1.json" as const,
} as const;
