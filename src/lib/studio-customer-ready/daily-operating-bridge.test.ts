import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";
import { studioDefectClassificationV1 } from "@/config/studio-defect-classification-v1";
import { studioOwnerAttentionV1 } from "@/config/studio-owner-attention-v1";
import {
  classifyDefectFixLevel,
  surgicalPatchIsDefault,
} from "@/lib/studio-customer-ready/defect-classification";
import {
  currentYellowWatchRecord,
  labelForAttentionKind,
  labelForAttentionState,
  printOwnerAttentionBanner,
  renderOwnerAttentionHtml,
  shouldPlayAudibleOwnerAlert,
  shouldScreamOwnerAttention,
} from "@/lib/studio-customer-ready/owner-attention";

const REPO = path.resolve(__dirname, "../../..");

describe("Daily Operating Bridge + Owner Attention", () => {
  it("records the three-menu decision as CLOSED and does not keep it open", () => {
    expect(guide.threeMenuSurfacesDecision).toBe("CLOSED");
    expect(guide.launchReadinessAuthority).toBe(
      "launch_now_v2_rtu_production_menu",
    );
    expect(guide.routeMapRole).toBe("separate_navigation_discovery_surface");
    expect(guide.leftoverLiveCatalogGreens).toBe(
      "not_automatically_launch_authorized",
    );
    expect(guide.menuContradictionsBlockCurrentPackage).toBe(false);

    const inventory = readFileSync(
      path.join(REPO, guide.menuInventoryCheckpoint),
      "utf8",
    );
    expect(inventory).toContain("OWNER DECISION — CLOSED");
    expect(inventory).not.toContain("## QUESTION BEFORE PROCEEDING");
    expect(inventory).not.toContain("Scout will **not guess**");
  });

  it("keeps ordinary YELLOW silent and screams only for Owner-wait NOW", () => {
    const record = currentYellowWatchRecord();
    expect(record.state).toBe("YELLOW");
    expect(record.tagiaMustInterveneNow).toBe(false);
    expect(labelForAttentionState("YELLOW")).toBe("WATCH");
    expect(shouldScreamOwnerAttention("YELLOW")).toBe(false);
    expect(shouldScreamOwnerAttention("RED")).toBe(true);
    expect(shouldPlayAudibleOwnerAlert(record)).toBe(false);
    expect(printOwnerAttentionBanner(record)).toContain("YELLOW — WATCH");
    expect(printOwnerAttentionBanner(record)).not.toContain(
      studioOwnerAttentionV1.redNowBannerText,
    );

    const redBanner = printOwnerAttentionBanner({
      ...record,
      state: "RED",
      kind: "OWNER_ACTION_REQUIRED_NOW",
      label: labelForAttentionKind("OWNER_ACTION_REQUIRED_NOW"),
      responder: "BOTH",
      tagiaMustInterveneNow: true,
      exactOwnerAction: "Tap Ask The Studio.",
      acknowledgedAt: null,
      audiblePlayedAt: null,
    });
    expect(redBanner).toContain(studioOwnerAttentionV1.redNowBannerText);

    const written = JSON.parse(
      readFileSync(path.join(REPO, guide.ownerAttentionStateJson), "utf8"),
    ) as {
      state: string;
      kind?: string;
      tagiaMustInterveneNow: boolean;
    };
    expect(["GREEN", "YELLOW", "RED"]).toContain(written.state);
    expect(guide.attentionAndWorkStateAreIndependent).toBe(true);
    expect(guide.yellowDoesNotReplaceHeartbeat).toBe(true);
    if (written.state === "RED") {
      expect(written.kind).toBe("OWNER_ACTION_REQUIRED_NOW");
      expect(written.tagiaMustInterveneNow).toBe(true);
    }
  });

  it("renders a local attention page and can still scream crimson RED without touching Owner Console", () => {
    expect(studioOwnerAttentionV1.doNotTouchCustomerSite).toBe(true);
    expect(studioOwnerAttentionV1.doNotTouchOwnerConsole).toBe(true);
    expect(existsSync(path.join(REPO, guide.dailyOperatingBridge))).toBe(true);
    expect(existsSync(path.join(REPO, guide.ownerAttentionHtml))).toBe(true);

    const liveHtml = readFileSync(
      path.join(REPO, guide.ownerAttentionHtml),
      "utf8",
    );
    expect(liveHtml).toMatch(/data-attention-state="(GREEN|YELLOW|RED)"/);
    expect(liveHtml).toContain("PROJECT-ALPHA-WORK-HEARTBEAT.html");

    const heartbeat = readFileSync(path.join(REPO, guide.workHeartbeatHtml), "utf8");
    expect(heartbeat).toContain("attention-badge");
    expect(heartbeat).toContain("data-attention=");
    expect(heartbeat).toContain("data-work-state=");

    const redHtml = renderOwnerAttentionHtml({
      ...currentYellowWatchRecord(),
      state: "RED",
      kind: "OWNER_ACTION_REQUIRED_NOW",
      label: labelForAttentionKind("OWNER_ACTION_REQUIRED_NOW"),
      responder: "BOTH",
      tagiaMustInterveneNow: true,
      exactOwnerAction: "Tap Ask The Studio.",
    });
    expect(redHtml).toContain("OWNER ACTION REQUIRED NOW");
    expect(redHtml).toContain("#8b0000");
    expect(redHtml).toContain("12vw");
  });

  it("does not default to surgical fixes", () => {
    expect(guide.doNotDefaultToSurgicalFixes).toBe(true);
    expect(studioDefectClassificationV1.doNotDefaultToSurgicalFixes).toBe(true);
    expect(surgicalPatchIsDefault()).toBe(false);
    expect(
      classifyDefectFixLevel({
        class: "shared_lane",
        isolated: false,
        belongsToSharedLaneOrSystem: true,
        blocksCurrentPackage: true,
        wouldOpenRabbitHole: false,
      }),
    ).toBe("highest_reusable_level");
    expect(
      classifyDefectFixLevel({
        class: "local",
        isolated: true,
        belongsToSharedLaneOrSystem: false,
        blocksCurrentPackage: true,
        wouldOpenRabbitHole: false,
      }),
    ).toBe("narrow_surgical_patch");
  });

  it("does not authorize Step 4", () => {
    expect(guide.currentStepId).toBe("owner_console_launch_certification");
    expect(guide.doNotStartStep4WithoutAuthorization).toBe(true);
    const bridge = readFileSync(
      path.join(REPO, guide.dailyOperatingBridge),
      "utf8",
    );
    expect(bridge).toContain("WORKING ≠ AVAILABLE");
    expect(bridge).toContain("ACTIVE WORK");
    expect(bridge).toContain("IDLE");
    expect(bridge).toContain("Changed at:");
    expect(bridge).toContain("three-menu-surface decision is **CLOSED**");
    expect(bridge).toContain("Do not start Step 4");
    expect(guide.workingIsNotAvailable).toBe(true);
    expect(guide.bridgeMustTimestampStatusChanges).toBe(true);
    expect(guide.doNotClaimUnattendedWorkWhenIdle).toBe(true);
    expect(guide.workStates).toEqual([
      "ACTIVE_WORK",
      "WAITING_ON_OWNER",
      "WAITING_ON_SYSTEM",
      "IDLE",
      "STALLED_HUNG",
      "STOPPED",
    ]);
    expect(guide.workHeartbeatHtml).toContain("PROJECT-ALPHA-WORK-HEARTBEAT.html");
    expect(guide.workHeartbeatStaleAfterMs).toBe(600_000);
  });
});
