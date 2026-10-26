import { describe, expect, it } from "vitest";

import { studioWorkStateNotificationV1 as protocol } from "@/config/studio-work-state-notification-v1";
import {
  canEnterIdle,
  isTelemetryMaintenanceTask,
  isLeaveActive,
  isLoudOwnerRed,
  liveScreenAfterAttentionAck,
  notifyKindForTransition,
  resolveAttentionForWorkState,
  shouldKeepHeartbeatMoving,
  shouldNotifyImmediately,
  shouldPlayAudibleWorkAlert,
  shouldShowBlockingWatchPage,
  shouldShowRedInterrupt,
  workStateLabel,
} from "@/lib/studio-customer-ready/work-state-notification";

describe("work-state notification protocol", () => {
  it("forbids IDLE while safe authorized work remains", () => {
    expect(protocol.idleForbiddenWhenSafeWorkRemains).toBe(true);
    expect(protocol.finishingSliceDoesNotPermitIdle).toBe(true);
    expect(canEnterIdle(true)).toBe(false);
    expect(canEnterIdle(false)).toBe(true);
    expect(protocol.activeMeansAuthorizedPackageWork).toBe(true);
    expect(protocol.telemetryMaintenanceIsNotActiveWork).toBe(true);
    expect(isTelemetryMaintenanceTask("Work-state alerts")).toBe(true);
    expect(isTelemetryMaintenanceTask("Three-screen visual proof")).toBe(false);
  });

  it("keeps ACTIVE progress silent and notifies any leave of ACTIVE", () => {
    expect(notifyKindForTransition("ACTIVE_WORK", "ACTIVE_WORK")).toBe("none");
    expect(shouldNotifyImmediately("ACTIVE_WORK", "ACTIVE_WORK")).toBe(false);
    expect(isLeaveActive("ACTIVE_WORK", "IDLE")).toBe(true);
    expect(shouldNotifyImmediately("ACTIVE_WORK", "IDLE")).toBe(true);
    expect(shouldNotifyImmediately("ACTIVE_WORK", "WAITING_ON_SYSTEM")).toBe(true);
    expect(shouldNotifyImmediately("IDLE", "ACTIVE_WORK")).toBe(true);
    expect(notifyKindForTransition("IDLE", "ACTIVE_WORK")).toBe("visible_resume");
    expect(shouldNotifyImmediately("ACTIVE_WORK", "ACTIVE_WORK", "slice_complete")).toBe(
      true,
    );
    expect(shouldPlayAudibleWorkAlert("slice_complete")).toBe(true);
    expect(protocol.sliceCompleteMustNotify).toBe(true);
    expect(protocol.stopStallHungMustNotify).toBe(true);
    expect(protocol.watchdogDeclaresStaleActive).toBe(true);
  });

  it("maps waiting / stall / stop to the right alert class", () => {
    expect(notifyKindForTransition("ACTIVE_WORK", "WAITING_ON_OWNER")).toBe(
      "owner_red_audible",
    );
    expect(isLoudOwnerRed("owner_red_audible")).toBe(true);
    expect(shouldPlayAudibleWorkAlert("stalled_audible")).toBe(true);
    expect(shouldPlayAudibleWorkAlert("idle_alert")).toBe(false);
    expect(shouldPlayAudibleWorkAlert("stopped_alert")).toBe(false);
    expect(shouldPlayAudibleWorkAlert("none")).toBe(false);
    expect(workStateLabel("STALLED_HUNG")).toBe("STALLED / HUNG");
    expect(protocol.staleActiveBecomesStalledHung).toBe(true);
    expect(protocol.glancePage).toContain("PROJECT-ALPHA-WORK-HEARTBEAT.html");
  });

  it("keeps attention and work state independent so YELLOW cannot replace a live heartbeat", () => {
    expect(protocol.attentionAndWorkStateAreIndependent).toBe(true);
    expect(protocol.yellowDoesNotReplaceHeartbeat).toBe(true);
    expect(protocol.afterYellowAckReturnToHeartbeat).toBe(true);
    expect(shouldKeepHeartbeatMoving("ACTIVE_WORK", "YELLOW")).toBe(true);
    expect(shouldKeepHeartbeatMoving("WAITING_ON_OWNER", "RED")).toBe(false);
    expect(shouldShowBlockingWatchPage("YELLOW", true)).toBe(false);
    expect(shouldShowRedInterrupt("RED", false)).toBe(true);
    expect(shouldShowRedInterrupt("RED", true)).toBe(false);
    expect(liveScreenAfterAttentionAck()).toBe("heartbeat");
    expect(
      resolveAttentionForWorkState({
        workState: "ACTIVE_WORK",
        previousAttention: "RED",
      }),
    ).toBe("YELLOW");
    expect(
      resolveAttentionForWorkState({
        workState: "ACTIVE_WORK",
        previousAttention: "YELLOW",
      }),
    ).toBe("YELLOW");
    expect(
      resolveAttentionForWorkState({
        workState: "WAITING_ON_OWNER",
        previousAttention: "GREEN",
      }),
    ).toBe("RED");
    expect(
      resolveAttentionForWorkState({
        workState: "STALLED_HUNG",
        previousAttention: "YELLOW",
      }),
    ).toBe("RED");
    expect(
      resolveAttentionForWorkState({
        workState: "STOPPED",
        previousAttention: "GREEN",
      }),
    ).toBe("GREEN");
  });
});
