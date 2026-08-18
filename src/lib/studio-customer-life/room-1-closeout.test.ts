import { describe, expect, it } from "vitest";

import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";

describe("Room 1 closeout — come-back-later email flag", () => {
  it("does not fully close Room 1 or fake the parked Resend live-cert gates", () => {
    const flag = studioRoom1CustomerLifeCloseoutV1.comeBackLater;
    expect(studioRoom1CustomerLifeCloseoutV1.roomClosed).toBe(false);
    expect(studioRoom1CustomerLifeCloseoutV1.status).toBe(
      "complete_except_deferred_external_domain_email",
    );
    expect(flag.closed).toBe(false);
    expect(flag.doNotFake).toBe(true);
    expect(flag.doNotCallClosed).toBe(true);
    expect(flag.verdict).toBe("PARKED_WITH_EXTERNAL_PREREQUISITE");
    expect(flag.parkedPackageId).toBe(
      "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
    );
    expect(flag.protectedCheckpoint).toBe("d6974eb");
    expect(flag.doesNotBlockRoom2).toBe(true);
    expect([...flag.deferredGates]).toEqual([
      "branded_sender_certification",
      "real_inbox_delivery_proof",
      "live_provider_reject_retry_against_final_studio_sender",
    ]);
  });

  it("keeps the torture-test result authoritative and does not count abandoned 3067 attempts", () => {
    const torture = studioRoom1CustomerLifeCloseoutV1.tortureSection;
    expect(torture.id).toBe(
      "STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1",
    );
    expect(torture.status).toBe("complete_executable_authoritative");
    expect(torture.authoritativeTip).toBe("a49efd7");
    expect(torture.abandonedNonAuthoritative).toBe("3067-startup-attempts");
    expect(torture.doNotReopenUnlessNewDefect).toBe(true);
    expect(
      studioRoom1CustomerLifeCloseoutV1.preservedCheckpoints
        .wholeCustomerTortureAuthoritative,
    ).toBe("a49efd7");
    expect(
      studioRoom1CustomerLifeCloseoutV1.preservedCheckpoints.resendLifecycleAndWatchdog,
    ).toBe("d6974eb");
  });

  it("authorizes Room 2 without a full Room 1 CLOSED stamp", () => {
    expect(studioRoom1CustomerLifeCloseoutV1.room2Authorized).toBe(true);
    expect(studioRoom1CustomerLifeCloseoutV1.emailDoesNotBlockRoom2).toBe(true);
    expect(studioRoom1CustomerLifeCloseoutV1.doNotStartRoom2).toBe(false);
    expect(studioRoom1CustomerLifeCloseoutV1.doNotStartRooms2to5).toBe(false);
    expect(studioRoom1CustomerLifeCloseoutV1.doNotStartOwnerConsole).toBe(false);
    expect(studioRoom1CustomerLifeCloseoutV1.doNotStartRooms3to5).toBe(false);
    expect(studioRoom1CustomerLifeCloseoutV1.room3Authorized).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(3);
    expect(studioLaunchReadinessExecutionOrderV1.room1Closeout.room2Authorized).toBe(
      true,
    );
    expect(
      studioRoom1CustomerLifeCloseoutV1.activeSection.id,
    ).toBe("STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1");
    expect(studioRoom1CustomerLifeCloseoutV1.activeSection.status).toBe(
      "parked_with_external_prerequisite",
    );
    expect(studioRoom1CustomerLifeCloseoutV1.activeSection.roomClosed).toBe(false);
  });
});
