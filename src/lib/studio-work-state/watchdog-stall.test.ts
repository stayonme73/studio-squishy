import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioWorkStateNotificationV1 } from "@/config/studio-work-state-notification-v1";
import {
  applyScoutProgressPulse,
  applyScoutWorkingStance,
  refreshDisplayedWorkState,
  resolveDisplayedWorkState,
  shouldDeclareWatchdogStall,
  shouldPlayWatchdogAudible,
  WATCHDOG_STALE_MS,
} from "../../../scripts/work-heartbeat-watchdog-rules.mjs";

const NOW = Date.parse("2026-09-22T23:00:00.000Z");

function record(overrides: Record<string, unknown> = {}) {
  return {
    workState: "ACTIVE_WORK",
    lastActivityAt: new Date(NOW - WATCHDOG_STALE_MS - 1).toISOString(),
    scoutListening: false,
    scoutTrouble: false,
    expectedToContinue: true,
    intentionalStop: false,
    ...overrides,
  };
}

describe("Watchdog false-alarm fix", () => {
  it("locks that an intentional STOP is not a stall", () => {
    expect(studioWorkStateNotificationV1.intentionalStopIsNotAStall).toBe(true);
    expect(studioWorkStateNotificationV1.watchdogOnlyWhenExpectedToContinue).toBe(
      true,
    );
    expect(studioWorkStateNotificationV1.listeningAfterStopIsWhite).toBe(true);
    expect(studioWorkStateNotificationV1.quietAfterListeningIsNotTrouble).toBe(
      true,
    );
  });

  it("does not stall after an intentional STOP or listening handoff", () => {
    expect(
      shouldDeclareWatchdogStall(record({ scoutListening: true }), NOW),
    ).toBe(false);
    expect(
      shouldDeclareWatchdogStall(record({ intentionalStop: true }), NOW),
    ).toBe(false);
    expect(
      shouldDeclareWatchdogStall(record({ expectedToContinue: false }), NOW),
    ).toBe(false);
    expect(shouldDeclareWatchdogStall(record({ workState: "STOPPED" }), NOW)).toBe(
      false,
    );
  });

  it("does not call a stale pulse Scout-in-trouble without a recorded failure", () => {
    expect(shouldDeclareWatchdogStall(record(), NOW)).toBe(false);
    expect(
      shouldDeclareWatchdogStall(
        record({
          scoutTrouble: true,
          lastActivityAt: new Date(NOW - 60_000).toISOString(),
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      shouldDeclareWatchdogStall(
        record({
          scoutTrouble: true,
        }),
        NOW,
      ),
    ).toBe(true);
  });

  it("does not show Scout-in-trouble after a quiet listening handoff", () => {
    expect(
      resolveDisplayedWorkState(
        record({
          scoutListening: true,
          expectedToContinue: false,
          intentionalStop: true,
        }),
        NOW,
      ),
    ).toBe("ACTIVE_WORK");
    expect(
      resolveDisplayedWorkState(
        record({
          workState: "STALLED_HUNG",
          scoutListening: true,
          expectedToContinue: false,
          intentionalStop: true,
        }),
        NOW,
      ),
    ).toBe("ACTIVE_WORK");
    expect(resolveDisplayedWorkState(record(), NOW)).toBe("ACTIVE_WORK");
  });

  it("does not treat a failed tool call as Scout-in-trouble", () => {
    expect(studioWorkStateNotificationV1.failedToolCallIsNotScoutTrouble).toBe(true);
    expect(studioWorkStateNotificationV1.progressPulseDoesNotRearmListening).toBe(true);
    const hooks = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../../.cursor/hooks.json"), "utf8"),
    );
    expect(hooks.hooks.postToolUseFailure?.[0]?.command).toMatch(/--tool-fail/);
    expect(hooks.hooks.postToolUseFailure?.[0]?.command).not.toMatch(/--trouble/);
    expect(hooks.hooks.preToolUse?.[0]?.command).toMatch(/--tool-start/);
    expect(hooks.hooks.beforeSubmitPrompt?.[0]?.command).toMatch(/--message/);
    expect(hooks.hooks.beforeSubmitPrompt?.[0]?.command).not.toMatch(/--working/);
    expect(hooks.hooks.afterAgentThought?.[0]?.command).toMatch(/--progress/);
    expect(hooks.hooks.afterAgentThought?.[0]?.command).not.toMatch(/--working|--trouble/);
  });

  it("a thought does not refresh WORKING or re-arm listening", () => {
    const later = "2026-09-23T23:05:00.000Z";
    const live = applyScoutProgressPulse(record({ lastActivityAt: "2026-09-23T22:50:00.000Z" }), later);
    expect(live.lastActivityAt).toBe("2026-09-23T22:50:00.000Z");
    expect(live.workState).toBe("ACTIVE_WORK");

    const recovered = applyScoutProgressPulse(
      record({ workState: "STALLED_HUNG", scoutTrouble: true, blocker: "Scout is in trouble" }),
      later,
    );
    expect(recovered.workState).toBe("STALLED_HUNG");
    expect(recovered.scoutTrouble).toBe(true);

    const idleOnActive = applyScoutProgressPulse(
      record({
        workState: "ACTIVE_WORK",
        scoutListening: true,
        expectedToContinue: true,
        intentionalStop: false,
        lastActivityAt: "2026-09-23T22:50:00.000Z",
        reason: "Scout is listening",
        lastMeaningfulAction: "Scout is listening",
        whatHappensNext: "Scout is listening. Nothing is needed.",
      }),
      later,
    );
    expect(idleOnActive.lastActivityAt).toBe("2026-09-23T22:50:00.000Z");
    expect(idleOnActive.scoutListening).toBe(true);
    expect(idleOnActive.workState).toBe("ACTIVE_WORK");
    expect(shouldDeclareWatchdogStall(idleOnActive, Date.parse(later))).toBe(false);

    const packageStop = applyScoutProgressPulse(
      record({
        workState: "STOPPED",
        scoutListening: true,
        expectedToContinue: false,
        intentionalStop: true,
        lastActivityAt: "2026-09-23T22:50:00.000Z",
        reason: "Scout is listening",
        lastMeaningfulAction: "Scout is listening",
        whatHappensNext: "Scout is listening. Nothing is needed.",
      }),
      later,
    );
    expect(packageStop.workState).toBe("STOPPED");
    expect(packageStop.scoutListening).toBe(true);
    expect(packageStop.intentionalStop).toBe(true);
    expect(packageStop.lastActivityAt).toBe("2026-09-23T22:50:00.000Z");
    expect(shouldDeclareWatchdogStall(packageStop, Date.parse(later))).toBe(false);
  });

  it("working stance does not leave an intentional package STOP", () => {
    expect(studioWorkStateNotificationV1.progressAfterListeningShowsWorking).toBe(
      true,
    );
    expect(studioWorkStateNotificationV1.workingStanceAlwaysSetsActiveWork).toBe(
      false,
    );
    expect(
      studioWorkStateNotificationV1.workingStanceSetsActiveUnlessPackageStopped,
    ).toBe(true);
    expect(studioWorkStateNotificationV1.chatHooksDoNotLeavePackageStop).toBe(
      true,
    );
    const stopped = applyScoutWorkingStance(
      record({
        workState: "STOPPED",
        scoutListening: true,
        expectedToContinue: false,
        intentionalStop: true,
        reason: "Scout is listening",
      }),
      "2026-09-24T11:40:00.000Z",
    );
    expect(stopped.workState).toBe("STOPPED");
    expect(stopped.scoutListening).toBe(true);
    expect(stopped.intentionalStop).toBe(true);
    expect(shouldDeclareWatchdogStall(stopped, Date.parse("2026-09-24T11:40:00.000Z"))).toBe(
      false,
    );

    const started = applyScoutWorkingStance(
      record({
        workState: "ACTIVE_WORK",
        scoutListening: true,
        expectedToContinue: true,
        intentionalStop: false,
        reason: "Scout is listening",
        currentTask: "Owner Console consistency certification",
      }),
      "2026-09-24T11:40:00.000Z",
    );
    expect(started.workState).toBe("ACTIVE_WORK");
    expect(started.scoutListening).toBe(true);
    expect(started.currentTask).toBe("Owner Console consistency certification");
    expect(started.activityTruth).toBeUndefined();
  });

  it("working stance does not remap Owner wait to ACTIVE", () => {
    expect(studioWorkStateNotificationV1.chatHooksDoNotLeaveOwnerWait).toBe(true);
    const waiting = applyScoutWorkingStance(
      record({
        workState: "WAITING_ON_OWNER",
        scoutListening: false,
        expectedToContinue: false,
        intentionalStop: false,
        tagiaMustAct: true,
        attentionState: "RED",
        reason: "ACTIVE WORK → WAITING ON OWNER",
      }),
      "2026-09-24T11:40:00.000Z",
    );
    expect(waiting.workState).toBe("WAITING_ON_OWNER");
    expect(waiting.reason).toBe("ACTIVE WORK → WAITING ON OWNER");
    expect(waiting.expectedToContinue).toBe(false);
  });

  it("does not raise a watchdog alarm when monitoring is off or the alarm is muted", () => {
    expect(studioWorkStateNotificationV1.watchdogMonitoringOwnerControlled).toBe(true);
    expect(studioWorkStateNotificationV1.muteAlarmDoesNotChangeColor).toBe(true);
    expect(studioWorkStateNotificationV1.refreshDoesNotManufactureAlert).toBe(true);
    expect(studioWorkStateNotificationV1.stopListeningNeverAlarms).toBe(true);
    expect(
      shouldDeclareWatchdogStall(record({ watchdogMonitoring: false })),
    ).toBe(false);
    expect(shouldPlayWatchdogAudible(record({ alarmMuted: true }))).toBe(false);
    expect(
      shouldPlayWatchdogAudible(
        record({ scoutListening: true, expectedToContinue: false, intentionalStop: true }),
      ),
    ).toBe(false);
    expect(shouldPlayWatchdogAudible(record())).toBe(false);
    expect(
      shouldPlayWatchdogAudible(
        record({ workState: "STALLED_HUNG", scoutTrouble: true, expectedToContinue: true }),
      ),
    ).toBe(true);
  });

  it("refresh re-reads state and does not invent a stall after STOP or listening", () => {
    const listening = record({
      scoutListening: true,
      expectedToContinue: false,
      intentionalStop: true,
    });
    expect(refreshDisplayedWorkState(listening, NOW)).toBe("ACTIVE_WORK");
    expect(shouldDeclareWatchdogStall(listening, NOW)).toBe(false);
    expect(shouldPlayWatchdogAudible(listening, NOW)).toBe(false);

    const off = record({ watchdogMonitoring: false });
    expect(refreshDisplayedWorkState(off, NOW)).toBe("ACTIVE_WORK");
    expect(shouldDeclareWatchdogStall(off, NOW)).toBe(false);
  });
});
