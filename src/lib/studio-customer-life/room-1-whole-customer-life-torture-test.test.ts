import { describe, expect, it } from "vitest";

import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom1WholeCustomerLifeTortureTestV1 as cfg } from "@/config/studio-room-1-whole-customer-life-torture-test-v1";
import { studioCustomerCommunicationEmailMapV1 } from "@/lib/studio-customer-life";

describe("Room 1 whole-customer life torture test contract", () => {
  it("stays on the already-open package and does not close Room 1", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1",
    );
    expect(cfg.room).toBe(1);
    expect(studioRoom1CustomerLifeCloseoutV1.roomClosed).toBe(false);
    expect(cfg.ownerRoutine).toBe("NONE");
    expect(cfg.merge).toBe("separately_authorized");
  });

  it("keeps branded email as an external prerequisite, not a drill pass or fail", () => {
    const email = cfg.comeBackLaterEmail;
    expect(email.closed).toBe(false);
    expect(email.doNotFake).toBe(true);
    expect(email.verdict).toBe("PARKED_WITH_EXTERNAL_PREREQUISITE");
    expect(email.protectedCheckpoint).toBe("d6974eb");
    expect(cfg.chaoticDrills).not.toContain("branded_sender_certification");
    expect(cfg.outOfScope).toEqual(
      expect.arrayContaining([
        "branded_sender_certification",
        "real_inbox_delivery_proof",
        "live_provider_reject_retry_against_final_studio_sender",
        "owner_console",
        "room_2",
      ]),
    );
    expect(studioCustomerCommunicationEmailMapV1.missingWiringForLaterEmailSection[0]).toMatch(
      /COME BACK LATER/,
    );
  });

  it("names the locked Room 1 cracks for one Maya project", () => {
    expect(cfg.mayaFixture.customerName).toBe("Maya Brooks");
    expect(cfg.mayaFixture.skuId).toBe("v2-rtu-flyer");
    expect(cfg.mayaFixture.studioFeeUsd).toBe(69);
    expect(cfg.chaoticDrills).toEqual([
      "wrong_upload",
      "duplicate_upload",
      "timeout_or_stall_recover",
      "qa_failure_then_pass",
      "stale_version_attempt",
      "return_later",
      "failed_notification_board_and_voice_still_honest",
    ]);
  });
});
