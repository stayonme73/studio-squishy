import { describe, expect, it } from "vitest";

import { studioRoom4FullBusinessRehearsalV1 as cfg } from "@/config/studio-room-4-full-business-rehearsal-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { shouldExceptionKindAppearOnSequentialDesk } from "@/lib/campaign-tasks/owner-console-decision-boundary";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer";

describe("STUDIO-OPERATING-ROOM-4-FULL-BUSINESS-REHEARSAL-1", () => {
  it("locks Room 4A closed and keeps Room 4 active without starting Room 5", () => {
    expect(cfg.packageId).toBe("STUDIO-OPERATING-ROOM-4-FULL-BUSINESS-REHEARSAL-1");
    expect(cfg.room).toBe(4);
    expect(cfg.sectionClosed).toBe(true);
    expect(cfg.closeTip).toBe("9f9ac7c");
    expect(cfg.doNotStartRoom5).toBe(true);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.priorRooms.room3CloseTip).toBe("cd2a1e2");
    expect(cfg.priorRooms.room2Closed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(4);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoomId).toBe(
      "full-business-rehearsal",
    );
    expect(studioLaunchReadinessExecutionOrderV1.room3Section3.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room3Section3.closeTip).toBe("cd2a1e2");
    expect(studioLaunchReadinessExecutionOrderV1.room4A.packageId).toBe(cfg.packageId);
    expect(studioLaunchReadinessExecutionOrderV1.room4A.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room4A.closeTip).toBe("9f9ac7c");
    expect(studioLaunchReadinessExecutionOrderV1.room4.packageId).toBe(
      "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1",
    );
    expect(studioLaunchReadinessExecutionOrderV1.room4B.packageId).toBe(
      "STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1",
    );
    expect(studioLaunchReadinessExecutionOrderV1.room4.doNotStartRoom5).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room4.room4AClosedAt).toBe("9f9ac7c");
    expect(studioLaunchReadinessExecutionOrderV1.room4C.status).toBe(
      "CLOSED WITH EXPLICIT LIMITS",
    );
    expect(studioLaunchReadinessExecutionOrderV1.room4C.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room4C.scenario1Status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(studioLaunchReadinessExecutionOrderV1.room4C.scenario2Status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(studioLaunchReadinessExecutionOrderV1.room4C.scenario3Status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(
      studioLaunchReadinessExecutionOrderV1.room4C.mediaNaturalnessCarryForwardStatus,
    ).toBe("REQUIRED_NOT_CERTIFIED");
  });

  it("reuses Maya flyer on the certified renderer path and keeps Owner as judgment only", () => {
    expect(cfg.customerFixture.skuId).toBe(DESIGN_RENDERER_PROOF_SKU);
    expect(cfg.customerFixture.productionPath).toBe("certified_design_renderer_v2_rtu_flyer");
    expect(cfg.ownerRoutine).toBe("NONE");
    expect(shouldExceptionKindAppearOnSequentialDesk("pricing_exception")).toBe(true);
    expect(shouldExceptionKindAppearOnSequentialDesk("routine_internal")).toBe(false);
    expect(cfg.comeBackLaterEmail.protectedCheckpoint).toBe("d6974eb");
    expect(cfg.outOfScope).toEqual(
      expect.arrayContaining(["room_5", "unapproved_production_tools", "branded_sender_certification"]),
    );
  });
});
