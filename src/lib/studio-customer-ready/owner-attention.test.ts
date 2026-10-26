import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { studioOwnerAttentionV1 } from "@/config/studio-owner-attention-v1";
import {
  classifyOwnerWait,
  currentYellowWatchRecord,
  labelForAttentionKind,
  printOwnerAttentionBanner,
  renderOwnerAttentionHtml,
  resolveOwnerAttentionKind,
  shouldPlayAudibleOwnerAlert,
  shouldScreamOwnerAttention,
} from "@/lib/studio-customer-ready/owner-attention";

describe("Owner attention correction — waiting on Tagia", () => {
  it("classifies Scout waiting on Tagia as NOW, never silent YELLOW", () => {
    expect(
      classifyOwnerWait({
        scoutCannotContinueWithoutOwner: true,
        ownerUnavailableAndSafeToDefer: false,
      }),
    ).toBe("OWNER_ACTION_REQUIRED_NOW");
    expect(
      classifyOwnerWait({
        scoutCannotContinueWithoutOwner: true,
        ownerUnavailableAndSafeToDefer: true,
      }),
    ).toBe("OWNER_ACTION_REQUIRED_DEFERRED");
    expect(
      classifyOwnerWait({
        scoutCannotContinueWithoutOwner: false,
        ownerUnavailableAndSafeToDefer: false,
        ordinaryWatchOnly: true,
      }),
    ).toBe("WATCH");
    expect(studioOwnerAttentionV1.scoutWaitingOnOwnerIsNeverSilentYellow).toBe(
      true,
    );
    expect(studioOwnerAttentionV1.greenAndOrdinaryYellowRemainSilent).toBe(true);
    expect(studioOwnerAttentionV1.audibleAppliesDuringMobileCertification).toBe(
      true,
    );
  });

  it("plays audible only for unacked NOW, and stops after play or ack", () => {
    const yellow = currentYellowWatchRecord();
    expect(shouldPlayAudibleOwnerAlert(yellow)).toBe(false);
    expect(shouldScreamOwnerAttention("YELLOW")).toBe(false);

    const now = {
      ...yellow,
      state: "RED" as const,
      kind: "OWNER_ACTION_REQUIRED_NOW" as const,
      label: labelForAttentionKind("OWNER_ACTION_REQUIRED_NOW"),
      tagiaMustInterveneNow: true,
      alertId: "test-now",
      exactOwnerAction: "Tap Ask The Studio.",
      acknowledgedAt: null,
      audiblePlayedAt: null,
    };
    expect(resolveOwnerAttentionKind(now)).toBe("OWNER_ACTION_REQUIRED_NOW");
    expect(shouldPlayAudibleOwnerAlert(now)).toBe(true);
    expect(shouldPlayAudibleOwnerAlert({ ...now, audiblePlayedAt: "2026-09-16T12:00:00.000Z" })).toBe(
      false,
    );
    expect(shouldPlayAudibleOwnerAlert({ ...now, acknowledgedAt: "2026-09-16T12:00:00.000Z" })).toBe(
      false,
    );

    const deferred = {
      ...yellow,
      kind: "OWNER_ACTION_REQUIRED_DEFERRED" as const,
      label: labelForAttentionKind("OWNER_ACTION_REQUIRED_DEFERRED"),
      deferredReason: "Owner window closed. Safe to continue unattended work.",
    };
    expect(shouldPlayAudibleOwnerAlert(deferred)).toBe(false);
    expect(printOwnerAttentionBanner(deferred)).toContain(
      "OWNER ACTION REQUIRED — DEFERRED",
    );
    expect(printOwnerAttentionBanner(deferred)).not.toContain("YELLOW — WATCH");
  });

  it("renders crimson NOW copy plus an acknowledge control", () => {
    const html = renderOwnerAttentionHtml({
      ...currentYellowWatchRecord(),
      state: "RED",
      kind: "OWNER_ACTION_REQUIRED_NOW",
      label: labelForAttentionKind("OWNER_ACTION_REQUIRED_NOW"),
      responder: "OWNER_TAGIA",
      tagiaMustInterveneNow: true,
      alertId: "maya-v16-ask-the-studio-2026-09-16",
      exactOwnerAction: "Tap Ask The Studio only.",
      expectedResult: "A message box to The Studio.",
      doNotDo: "Do not approve.",
      reportBack: "Whether the message box appeared.",
    });
    expect(html).toContain("OWNER ACTION REQUIRED NOW");
    expect(html).toContain('data-owner-wait="OWNER_ACTION_REQUIRED_NOW"');
    expect(html).toContain("Acknowledge — I have this");
    expect(html).toContain("#8b0000");
    expect(html).toContain("Tap Ask The Studio only.");
    expect(html).toContain("PROJECT-ALPHA-WORK-HEARTBEAT.html");
    expect(html).toContain("Returning to the live heartbeat");
  });

  it("sends an acknowledged YELLOW watch back to the live heartbeat", () => {
    const html = renderOwnerAttentionHtml({
      ...currentYellowWatchRecord(),
      acknowledgedAt: "2026-09-17T10:40:00.000Z",
    });
    expect(html).toContain("PROJECT-ALPHA-WORK-HEARTBEAT.html");
    expect(html).toContain("RETURNING TO LIVE HEARTBEAT");
    expect(html).toContain('http-equiv="refresh"');
    expect(studioOwnerAttentionV1.yellowIsBadgeNotFullScreenAfterAck).toBe(true);
    expect(studioOwnerAttentionV1.afterYellowAckReturnToHeartbeat).toBe(true);
  });

  it("ships an alert script that stays silent after play or ack", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/owner-attention-alert.mjs"),
      "utf8",
    );
    expect(source).toContain("OWNER_ACTION_REQUIRED_NOW");
    expect(source).toContain("acknowledgedAt");
    expect(source).toContain("audiblePlayedAt");
    expect(source).toContain("[console]::Beep");
    expect(source).toContain("1..3 | ForEach-Object");
    expect(source).toContain("SystemSounds]::Hand.Play");
  });
});
