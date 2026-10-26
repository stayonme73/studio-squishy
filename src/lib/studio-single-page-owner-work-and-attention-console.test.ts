import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { studioArea22aLiveRevisionProductionGateV1 } from "@/config/studio-area-22a-live-revision-production-gate-v1";
import { studioMobileCustomerJourneyCertificationV1 } from "@/config/studio-mobile-customer-journey-certification-v1";
import { studioSinglePageOwnerWorkAndAttentionConsoleV1 } from "@/config/studio-single-page-owner-work-and-attention-console-v1";
import { studioWorkStateNotificationV1 as protocol } from "@/config/studio-work-state-notification-v1";
import {
  ownerAcknowledgeKeepsRedCard,
  ownerChoiceWithoutContinueIsRed,
  ownerConsoleAckLabel,
  ownerConsoleAckPhase,
  ownerFrontDoorMessage,
  ownerFrontDoorColorIsSeparateFromTileColor,
  ownerFrontDoorShowsAcknowledge,
  ownerFrontDoorSteps,
  ownerHeldBlockingMatterStaysRed,
  ownerMatterTileAttention,
  ownerMatterTileColorFollowsMatterStateNotTray,
  ownerMatterTileScanLine,
  ownerYellowMeansWatchOnly,
  shouldOpenExtraBrowserTab,
  shouldSoundOwnerConsoleAlert,
} from "@/lib/studio-customer-ready/owner-console";
import { renderWorkHeartbeatHtml } from "@/lib/studio-customer-ready/work-heartbeat";

describe("Single-Page Owner Work & Attention Console", () => {
  it("Owner Console remains later after Area 22A; do not start it from this stamp", () => {
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.status).toBe(
      "PARKED / HOLD",
    );
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.ownerOverrideStartsWhileMobileOpen,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.ownerOverrideAuthorizedWhileMobileOpenAt,
    ).toBe("2026-09-19");
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.beginsOnlyAfterPackageId,
    ).toBe(studioMobileCustomerJourneyCertificationV1.packageId);
    expect(studioMobileCustomerJourneyCertificationV1.status).toBe(
      "CLOSED WITH EXPLICIT LIMITS",
    );
    expect(
      studioMobileCustomerJourneyCertificationV1.nextPackageAfterClose,
    ).toBe("STUDIO-OPERATING-REVISION-TO-REVIEW-ROUND-TRIP-CERTIFICATION-1");
    expect(studioArea22aLiveRevisionProductionGateV1.status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(studioArea22aLiveRevisionProductionGateV1.doNotRemintMaya).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.acknowledgeStopsSoundImmediately,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.acknowledgedIsNotResolved,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.acknowledgeDoesNotRemoveRequiredAction,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.redCardStaysUntilActionCompletesOrConditionClears,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.yellowMeansWatchOnly,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.ownerChoiceWithoutContinueIsRed,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.frontDoorStatus,
    ).toBe("HOLD / DONE");
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.doNotReopenFrontDoorUnlessRegression,
    ).toBe(true);
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.frontDoorOnly).toBe(
      false,
    );
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.nextSlice).toBe(
      "owner_console_end_to_end_operating_system",
    );
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.nextSliceStatus,
    ).toBe("PASS WITH EXPLICIT LIMITS");
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.endToEndResult,
    ).toBe("PASS WITH EXPLICIT LIMITS");
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.trayStatus).toBe(
      "HOLD / DONE",
    );
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.doNotReopenTrayUnlessRegression,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.doNotImplementTrayYet,
    ).toBe(false);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.useExistingCustomerProjectRecords,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.matterTilePriorityIndicator,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.matterTileColorFollowsMatterStateNotTray,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.frontDoorColorSeparateFromTileColor,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.heldBlockingMatterStaysRed,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.deskIsExceptionDeskNotActivityFeed,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.escalationRuleLocked,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.alertSystemSeparateFromFileSystem,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.alertUsesRedLettersNotRedBackground,
    ).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.matterTileMustShow,
    ).toEqual([
      "company_or_customer",
      "specific_matter",
      "red_yellow_green_indicator",
      "short_plain_language_status",
      "how_long_in_that_state",
    ]);
    expect(ownerFrontDoorColorIsSeparateFromTileColor()).toBe(true);
    expect(ownerMatterTileColorFollowsMatterStateNotTray()).toBe(true);
    expect(ownerHeldBlockingMatterStaysRed()).toBe(true);
    expect(
      ownerMatterTileAttention({
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
      }),
    ).toBe("RED");
    expect(
      ownerMatterTileAttention({
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: true,
      }),
    ).toBe("RED");
    expect(
      ownerMatterTileAttention({
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: false,
      }),
    ).toBe("YELLOW");
    expect(
      ownerMatterTileAttention({
        movingNormally: true,
      }),
    ).toBe("GREEN");
    expect(
      ownerMatterTileScanLine({
        company: "Al's Diner",
        matter: "Refund request",
        attention: "RED",
        status: "Held · Scout still blocked",
        howLong: "2 hr",
      }),
    ).toBe(
      "RED · Al's Diner — Refund request · Held · Scout still blocked · 2 hr",
    );
    expect(ownerAcknowledgeKeepsRedCard()).toBe(true);
    expect(ownerYellowMeansWatchOnly()).toBe(true);
    expect(ownerChoiceWithoutContinueIsRed()).toBe(true);
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.noAcknowledgementDeadEnd,
    ).toBe(true);
    expect(shouldOpenExtraBrowserTab()).toBe(false);
    expect(protocol.oneOwnerPage).toBe(true);
    expect(protocol.noNewTabsForAlerts).toBe(true);
  });

  it("keeps Acknowledge distinct from Resolved and never opens a second tab", () => {
    expect(
      shouldSoundOwnerConsoleAlert({
        attentionState: "RED",
        tagiaMustAct: true,
        acknowledged: false,
      }),
    ).toBe(true);
    expect(
      shouldSoundOwnerConsoleAlert({
        attentionState: "RED",
        tagiaMustAct: true,
        acknowledged: true,
      }),
    ).toBe(false);
    expect(
      shouldSoundOwnerConsoleAlert({
        attentionState: "GREEN",
        tagiaMustAct: false,
        acknowledged: false,
      }),
    ).toBe(false);
    expect(
      ownerConsoleAckLabel(
        ownerConsoleAckPhase({
          attentionState: "RED",
          tagiaMustAct: true,
          acknowledged: true,
        }),
      ),
    ).toBe("ACKNOWLEDGED · ACTION STILL REQUIRED");
    expect(
      ownerConsoleAckLabel(
        ownerConsoleAckPhase({
          attentionState: "GREEN",
          tagiaMustAct: false,
          acknowledged: true,
        }),
      ),
    ).toBe("RESOLVED");

    const html = renderWorkHeartbeatHtml({
      workState: "WAITING_ON_OWNER",
      previousState: "ACTIVE_WORK",
      changedAt: "2026-09-19T21:00:00.000Z",
      reason: "Owner must review the one desk.",
      packageId: studioSinglePageOwnerWorkAndAttentionConsoleV1.packageId,
      currentTask: "Owner desk review",
      lastMeaningfulAction: "Built the one Owner page",
      lastActivityAt: "2026-09-19T21:00:00.000Z",
      whatHappensNext: "Say if the hydra is dead.",
      tagiaMustAct: true,
      waitingOn: null,
      expectedNextCheckAt: null,
      blocker: null,
      safeAuthorizedWorkRemains: true,
      stalledAt: null,
      noProgressSince: null,
      attentionState: "RED",
    });
    expect(html).toContain("Current work state");
    expect(html).toContain("Current package");
    expect(html).toContain("Current task");
    expect(html).toContain("Last meaningful action");
    expect(html).toContain("Timestamp of last meaningful action");
    expect(html).toContain("Exact Owner action required");
    expect(html).toContain("Next expected Scout/system action");
    expect(html).toContain(">Acknowledge<");
    expect(html).toContain("ACKNOWLEDGED · ACTION STILL REQUIRED");
    expect(html).toContain("owner-history");
    expect(html).not.toContain("window.open");
  });

  it("keeps the accepted front-door order and does not hide the RED card after Acknowledge", () => {
    expect(
      ownerFrontDoorMessage({
        attentionState: "RED",
        workState: "STALLED_HUNG",
      }),
    ).toBe("Scout is stuck.");
    expect(
      ownerFrontDoorMessage({
        attentionState: "YELLOW",
        workState: "ACTIVE_WORK",
      }),
    ).toBe("Watch. Work continues.");
    expect(
      ownerFrontDoorMessage({
        attentionState: "GREEN",
        workState: "ACTIVE_WORK",
      }),
    ).toBe("No Owner action is required.");
    expect(
      ownerFrontDoorSteps({
        attentionState: "YELLOW",
        workState: "ACTIVE_WORK",
        tagiaMustAct: true,
      }),
    ).toEqual([]);
    expect(
      ownerFrontDoorShowsAcknowledge({
        attentionState: "YELLOW",
        tagiaMustAct: true,
      }),
    ).toBe(false);

    const red = renderWorkHeartbeatHtml({
      workState: "STALLED_HUNG",
      previousState: "ACTIVE_WORK",
      changedAt: "2026-09-21T21:20:00.000Z",
      reason: "No ACTIVE pulse for 10 minutes",
      packageId: studioSinglePageOwnerWorkAndAttentionConsoleV1.packageId,
      currentTask: "Area 22A live Stage 0 revision proof",
      lastMeaningfulAction: "Last pulse before stall",
      lastActivityAt: "2026-09-21T21:20:00.000Z",
      whatHappensNext: "Check whether Scout recovered.",
      tagiaMustAct: true,
      waitingOn: null,
      expectedNextCheckAt: null,
      blocker: "No ACTIVE pulse for 10 minutes",
      safeAuthorizedWorkRemains: true,
      stalledAt: "2026-09-21T21:30:00.000Z",
      noProgressSince: "2026-09-21T21:20:00.000Z",
      attentionState: "RED",
      attentionAcknowledgedAt: "2026-09-21T21:31:00.000Z",
    });
    const badgeAt = red.indexOf("ATTENTION: RED — OWNER ACTION REQUIRED");
    const messageAt = red.indexOf("Scout is stuck.");
    const stepsAt = red.indexOf("What you need to do");
    const taskAt = red.indexOf("Current task:");
    const howLongAt = red.indexOf("How long:");
    const ackAt = red.indexOf("ACKNOWLEDGED · ACTION STILL REQUIRED");
    const recordsAt = red.indexOf("<details class=\"records\">");
    expect(badgeAt).toBeGreaterThan(-1);
    expect(messageAt).toBeGreaterThan(badgeAt);
    expect(stepsAt).toBeGreaterThan(messageAt);
    expect(taskAt).toBeGreaterThan(stepsAt);
    expect(howLongAt).toBeGreaterThan(taskAt);
    expect(ackAt).toBeGreaterThan(howLongAt);
    expect(recordsAt).toBeGreaterThan(ackAt);
    expect(red).toContain('data-red-card="true"');
    expect(red).toContain("Check whether Scout recovered.");
    expect(red).not.toContain("<details class=\"records\" open");
    expect(red).toContain("Acknowledge silences sound; it does not remove the required action.");
    expect(red).not.toContain('http-equiv="refresh"');
    expect(red).toContain('url("/studio-boys-background.jpg")');
    expect(red).not.toContain("body.stalled-alert { background: #8b0000; }");
    expect(red).not.toContain(".front-card[data-attention=\"RED\"] { background: #3a1010;");
    expect(red).toContain("localStorage");
    expect(red).toContain("function isAcked");
    expect(red).toContain("function markAcked");
    expect(red).toContain("function showAckedUi");

    const liveNow = Date.parse("2026-09-21T21:38:00.000Z");
    const yellow = renderWorkHeartbeatHtml({
      workState: "ACTIVE_WORK",
      previousState: "ACTIVE_WORK",
      changedAt: "2026-09-21T21:30:00.000Z",
      reason: "Display-layer watch.",
      packageId: studioSinglePageOwnerWorkAndAttentionConsoleV1.packageId,
      currentTask: "Area 22A revision proof",
      lastMeaningfulAction: "Working",
      lastActivityAt: "2026-09-21T21:38:00.000Z",
      whatHappensNext: "Continue.",
      tagiaMustAct: false,
      waitingOn: null,
      expectedNextCheckAt: null,
      blocker: null,
      safeAuthorizedWorkRemains: true,
      stalledAt: null,
      noProgressSince: null,
      attentionState: "YELLOW",
    }, liveNow);
    expect(yellow).toContain("Watch. Work continues.");
    expect(yellow).not.toContain("<h2>What you need to do</h2>");
    expect(yellow).not.toContain('id="owner-ack"');

    const green = renderWorkHeartbeatHtml({
      workState: "ACTIVE_WORK",
      previousState: "ACTIVE_WORK",
      changedAt: "2026-09-21T21:34:00.000Z",
      reason: "Working the authorized slice.",
      packageId: studioSinglePageOwnerWorkAndAttentionConsoleV1.packageId,
      currentTask: "Area 22A revision proof",
      lastMeaningfulAction: "Front door implemented",
      lastActivityAt: "2026-09-21T21:38:00.000Z",
      whatHappensNext: "Continue.",
      tagiaMustAct: false,
      waitingOn: null,
      expectedNextCheckAt: null,
      blocker: null,
      safeAuthorizedWorkRemains: true,
      stalledAt: null,
      noProgressSince: null,
      attentionState: "GREEN",
    }, liveNow);
    expect(green).toContain("No Owner action is required.");
    expect(green).not.toContain("<h2>What you need to do</h2>");
    expect(green).not.toContain('id="owner-ack"');

    const proofDir = path.join(
      process.cwd(),
      "docs/launch/studio-operating-single-page-owner-work-and-attention-console-1",
    );
    mkdirSync(proofDir, { recursive: true });
    writeFileSync(path.join(proofDir, "FRONT-DOOR-PROOF-RED.html"), red);
    writeFileSync(path.join(proofDir, "FRONT-DOOR-PROOF-YELLOW.html"), yellow);
    writeFileSync(path.join(proofDir, "FRONT-DOOR-PROOF-GREEN.html"), green);
  });

  it("persists Acknowledge so the alarm stays off", () => {
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.acknowledgePersistsAndStopsSound,
    ).toBe(true);
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.ackEndpoint).toBe(
      "http://127.0.0.1:4177/ack",
    );
    const pulse = readFileSync(
      path.join(process.cwd(), "scripts/work-heartbeat-pulse.mjs"),
      "utf8",
    );
    const desk = readFileSync(
      path.join(process.cwd(), "scripts/owner-console-desk.mjs"),
      "utf8",
    );
    expect(pulse).toContain("data-ack-endpoint=\"http://127.0.0.1:4177/ack\"");
    expect(pulse).toContain("function persistAck");
    expect(pulse).toContain("stopAlert();");
    expect(pulse).toContain("ensureDeskServer");
    expect(pulse).toContain("--quiet");
    expect(desk).toContain("function persistAck");
    expect(desk).toContain('pathname === "/ack"');
    expect(desk).not.toContain("cmd.exe");
    expect(desk).not.toContain("[console]::Beep");
  });

  it("stops pulse and alert scripts from opening extra tabs", () => {
    const pulse = readFileSync(
      path.join(process.cwd(), "scripts/work-heartbeat-pulse.mjs"),
      "utf8",
    );
    const alert = readFileSync(
      path.join(process.cwd(), "scripts/owner-attention-alert.mjs"),
      "utf8",
    );
    expect(pulse).toContain("PROJECT-ALPHA-OWNER-CONSOLE.html");
    expect(pulse).toContain("PROJECT-ALPHA-WORK-HEARTBEAT.html");
    expect(pulse).toContain("openOneOwnerPage");
    expect(pulse).toContain("flags.open ||");
    expect(pulse).toContain("openTheOneDesk");
    expect(pulse).toContain("owner_red_audible");
    expect(pulse).not.toContain("window.open");
    expect(pulse).toContain("YELLOW is a badge");
    expect(pulse).toContain("function ensureRedActionBlock");
    expect(pulse).toContain("What you need to do");
    expect(pulse).toContain("Check whether Scout recovered.");
    expect(alert).not.toContain('start", "", HTML_PATH');
    expect(alert).not.toContain("start\", \"\", heartbeat");
    expect(alert).toContain("never open a browser tab");
  });

  it("adds watchdog controls without leaving PARKED / HOLD or redesigning the desk", () => {
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.status).toBe(
      "PARKED / HOLD",
    );
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.watchdogControlPatchAt,
    ).toBe("2026-09-24");
    expect(
      studioSinglePageOwnerWorkAndAttentionConsoleV1.doNotRedesignConsole,
    ).toBe(true);
    const page = readFileSync(
      path.join(process.cwd(), "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html"),
      "utf8",
    );
    expect(page).toContain("id=\"refresh-status\"");
    expect(page).toContain("id=\"monitoring-toggle\"");
    expect(page).toContain("id=\"mute-alarm\"");
    expect(page).toContain("/watchdog/refresh");
    expect(page).not.toContain("if (workState === \"ACTIVE_WORK\" && stalled && !listening)");
    expect(page).toContain('var waitingSystem = workState === "WAITING_ON_SYSTEM"');
    expect(page).toContain("YELLOW — WATCH");
    expect(page).toContain("Production is working.");
    expect(page).toContain("Watch. Production will bring it back.");
    const desk = readFileSync(
      path.join(process.cwd(), "scripts/owner-console-desk.mjs"),
      "utf8",
    );
    expect(desk).toContain('pathname === "/watchdog/refresh"');
    expect(desk).toContain("refreshMutates: false");
    expect(desk).toContain("readProductionReceipt");
    expect(desk).toContain("reconcileStaleOwnerWait");
    expect(desk).toContain("work-heartbeat-pulse.mjs");
    expect(desk).toContain("process.execPath");
    expect(desk).not.toContain("npm.cmd");
    expect(page).toContain("Refreshing…");
    expect(page).toContain("loadFiles(true)");
    expect(
      shouldSoundOwnerConsoleAlert({
        attentionState: "RED",
        tagiaMustAct: true,
        acknowledged: false,
        listening: true,
        expectedToContinue: false,
        confirmedStaleActive: true,
        monitoringOn: true,
      }),
    ).toBe(false);
    expect(
      shouldSoundOwnerConsoleAlert({
        attentionState: "RED",
        tagiaMustAct: true,
        acknowledged: false,
        monitoringOn: true,
        expectedToContinue: true,
        listening: false,
        confirmedStaleActive: true,
      }),
    ).toBe(true);
    expect(
      shouldSoundOwnerConsoleAlert({
        attentionState: "RED",
        tagiaMustAct: true,
        acknowledged: false,
        monitoringOn: false,
        expectedToContinue: true,
        listening: false,
        confirmedStaleActive: true,
      }),
    ).toBe(false);
  });
});
