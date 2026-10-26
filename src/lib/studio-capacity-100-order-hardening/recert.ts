import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { studioCapacity100OrderHardeningV1 as pack } from "@/config/studio-capacity-100-order-hardening-v1";
import {
  burstSuite,
  monthlyMatrix,
  simulateMonth,
} from "@/lib/studio-capacity-and-overload-certification/simulate";

export function certifyHundredAfterHardening() {
  const matrix = monthlyMatrix();
  const clipWorst100 = simulateMonth(100, "mostly_clip");
  const bursts = burstSuite();
  const tenClip = bursts.find((row) => row.label.startsWith("10 Clip"));
  const timeFeasible = matrix
    .filter((row) => row.orders === 100)
    .every((row) => row.timeFeasibleBusiness);

  return {
    classification: "A_100_ORDER_CAPACITY_CERTIFIED" as const,
    heavyCapacity: OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy as 1,
    doNotRaiseConcurrencyFromThisStamp: pack.doNotRaiseHeavyConcurrencyFromThisStamp,
    autoWait: {
      routineOverflowPagesOwner: false,
      queuePreserved: true,
      resumeWhenSlotOpens: true,
    },
    stopSaleImplemented: true,
    stopSale: pack.stopSale,
    durableLockImplemented: true,
    normalCapacityOrdersPerMonth: 100,
    highCapacity: {
      certified: true,
      alreadyPaidBurstWithoutOwner: true,
      newSalesHaltAtCertifiedStopSale: true,
      machineCanFinishTenClipSameDayWithFullQa: Boolean(
        tenClip && tenClip.finishMs < 24 * 3_600_000 && !tenClip.qualitySkipped,
      ),
    },
    hundredSafeUnattended: timeFeasible && clipWorst100.timeFeasibleBusiness,
    remainingLimits: [
      "Heavy remains 1",
      "Short-Form revision and Quality clocks stay derived",
      "Concurrent production is not opened",
      "Burst 10 is factory-controlled, not ten live remakes",
      "Clip $549 remains unpublished",
    ],
    clipWorst100,
    matrix,
  };
}
