import { describe, expect, it } from "vitest";

import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";

describe("Room 1 closeout — come-back-later email flag", () => {
  it("does not close Room 1 or fake the parked Resend live-cert gates", () => {
    const flag = studioRoom1CustomerLifeCloseoutV1.comeBackLater;
    expect(studioRoom1CustomerLifeCloseoutV1.roomClosed).toBe(false);
    expect(flag.closed).toBe(false);
    expect(flag.doNotFake).toBe(true);
    expect(flag.doNotCallClosed).toBe(true);
    expect(flag.verdict).toBe("PARKED_WITH_EXTERNAL_PREREQUISITE");
    expect(flag.parkedPackageId).toBe(
      "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
    );
    expect(flag.protectedCheckpoint).toBe("d6974eb");
    expect([...flag.deferredGates]).toEqual([
      "branded_sender_certification",
      "real_inbox_delivery_proof",
      "live_provider_reject_retry_against_final_studio_sender",
    ]);
    expect(studioRoom1CustomerLifeCloseoutV1.activeSection.id).toBe(
      "STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1",
    );
  });
});
