import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";
import { studioWorkStateNotificationV1 as protocol } from "@/config/studio-work-state-notification-v1";
import {
  WORK_HEARTBEAT_STALE_MS,
  renderWorkHeartbeatHtml,
  resolveDisplayedWorkState,
  shouldAnimateWorkHeartbeat,
  type WorkHeartbeatRecord,
} from "@/lib/studio-customer-ready/work-heartbeat";

const now = Date.parse("2026-09-16T20:54:00.000-04:00");

function record(
  overrides: Partial<WorkHeartbeatRecord> = {},
): WorkHeartbeatRecord {
  return {
    workState: "ACTIVE_WORK",
    previousState: "IDLE",
    changedAt: new Date(now).toISOString(),
    reason: "Resume after idle",
    packageId: guide.currentStepId,
    currentTask: "MJ-D28 Board render",
    lastMeaningfulAction: "ran Board render check",
    lastActivityAt: new Date(now).toISOString(),
    whatHappensNext: "Continue the next safe slice.",
    tagiaMustAct: false,
    waitingOn: null,
    expectedNextCheckAt: null,
    blocker: null,
    safeAuthorizedWorkRemains: true,
    stalledAt: null,
    noProgressSince: null,
    attentionState: "YELLOW",
    ...overrides,
  };
}

describe("work heartbeat", () => {
  it("animates only while ACTIVE WORK is fresh", () => {
    const live = record();
    expect(shouldAnimateWorkHeartbeat(live, now)).toBe(true);
    expect(resolveDisplayedWorkState(live, now).label).toBe("ACTIVE WORK");
    expect(guide.workHeartbeatDoNotAnimateWithoutFreshActivity).toBe(true);
    expect(guide.workHeartbeatSeparateFromAttentionColor).toBe(true);
    expect(guide.workHeartbeatStaleAfterMs).toBe(600_000);
  });

  it("stops motion and becomes STALLED / HUNG after 10 minutes without a pulse", () => {
    const stale = record({
      lastActivityAt: new Date(now - WORK_HEARTBEAT_STALE_MS).toISOString(),
    });
    expect(shouldAnimateWorkHeartbeat(stale, now)).toBe(false);
    const displayed = resolveDisplayedWorkState(stale, now);
    expect(displayed.workState).toBe("STALLED_HUNG");
    expect(displayed.stalled).toBe(true);
    expect(displayed.label).toBe("STALLED / HUNG");
    expect(displayed.stalledAt).toBe(new Date(now).toISOString());

    const html = renderWorkHeartbeatHtml(stale, now);
    expect(html).toContain('data-live="false"');
    expect(html).toContain("STALLED / HUNG");
    expect(html).toContain("No progress since");
    expect(html).toContain('data-work-state="STALLED_HUNG"');
    expect(html).toContain("Is Scout working?");
    expect(html).toContain("What you need to do");
    expect(html).toContain(">Acknowledge<");
    expect(html).not.toContain('http-equiv="refresh"');
    expect(html).not.toContain("IDLE — STALLED");
  });

  it("resumes motion when a fresh pulse arrives after stall", () => {
    const resumed = record({
      lastActivityAt: new Date(now).toISOString(),
      lastMeaningfulAction: "resumed MJ-D28 after stall",
    });
    expect(shouldAnimateWorkHeartbeat(resumed, now)).toBe(true);
    expect(resolveDisplayedWorkState(resumed, now).label).toBe("ACTIVE WORK");
    const html = renderWorkHeartbeatHtml(resumed, now);
    expect(html).toContain('data-live="true"');
    expect(html).toContain("resumed MJ-D28 after stall");
    expect(html).toContain(protocol.staleAfterMs.toString());
  });

  it("keeps the heartbeat moving on ACTIVE + YELLOW and shows an attention badge", () => {
    const liveYellow = record({
      workState: "ACTIVE_WORK",
      attentionState: "YELLOW",
      attentionAcknowledgedAt: new Date(now).toISOString(),
      reason: "Display-layer watch. Work continues.",
    });
    expect(shouldAnimateWorkHeartbeat(liveYellow, now)).toBe(true);
    const html = renderWorkHeartbeatHtml(liveYellow, now);
    expect(html).toContain('data-live="true"');
    expect(html).toContain("ACTIVE WORK");
    expect(html).toContain("ATTENTION: YELLOW — WATCH");
    expect(html).toContain("attention-badge");
    expect(html).not.toContain("<h1>WATCH</h1>");
  });

  it("does not animate WAITING, IDLE, STALLED, or STOPPED even if the timestamp is fresh", () => {
    expect(
      shouldAnimateWorkHeartbeat(
        record({ workState: "WAITING_ON_OWNER" }),
        now,
      ),
    ).toBe(false);
    expect(
      shouldAnimateWorkHeartbeat(record({ workState: "IDLE" }), now),
    ).toBe(false);
    expect(
      shouldAnimateWorkHeartbeat(record({ workState: "STALLED_HUNG" }), now),
    ).toBe(false);
    expect(
      shouldAnimateWorkHeartbeat(record({ workState: "STOPPED" }), now),
    ).toBe(false);
  });

  it("keeps the pulse script local, refuses silent idle, and freezes at 10 minutes", () => {
    const script = readFileSync(
      path.join(process.cwd(), guide.workHeartbeatScriptPath),
      "utf8",
    );
    expect(existsSync(path.join(process.cwd(), guide.workHeartbeatScriptPath))).toBe(
      true,
    );
    expect(script).toContain("STALE_MS = 600_000");
    expect(script).toContain("PROJECT-ALPHA-WORK-HEARTBEAT.html");
    expect(script).toContain("PROJECT-ALPHA-OWNER-CONSOLE.html");
    expect(script).not.toContain("window.open");
    expect(script).toContain("IDLE refused");
    expect(script).toContain("ACTIVE refused");
    expect(script).toContain("--no-authorized-work");
    expect(script).toContain("STALLED_HUNG");
    expect(script).toContain("--attention");
    expect(script).toContain("--slice-done");
    expect(script).toContain("ensureWatchdog");
    expect(script).toContain("flags.stopped || flags.listening");
    expect(script).toContain("resolveAttention");
    expect(script).toContain("YELLOW is a badge");
    expect(script).not.toContain(".cursor/hooks");
    expect(
      existsSync(path.join(process.cwd(), protocol.watchdogScript)),
    ).toBe(true);
  });
});
