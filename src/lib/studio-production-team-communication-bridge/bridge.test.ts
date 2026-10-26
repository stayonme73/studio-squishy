import { describe, expect, it } from "vitest";

import { studioProductionTeamCommunicationBridgeV1 as cfg } from "@/config/studio-production-team-communication-bridge-v1";
import {
  STUDIO_TEAM_ROLE_CARDS,
  createSharedJobTruth,
  machineReceiveHandoff,
  roleCard,
  voiceStatusFromTruth,
} from "./index";

describe("Production team roster + communication bridge", () => {
  it("has the complete callable roster and every role card", () => {
    expect(cfg.doNotAssumeReadyBecauseOrgChartExists).toBe(true);
    expect(cfg.machineIsTheBridge).toBe(true);
    expect(cfg.scoutBuildsTheBridge).toBe(true);
    expect(cfg.scoutOutsideCustomerProductionChain).toBe(true);
    expect(cfg.roster).toEqual([
      "studio_voice",
      "machine",
      "design_production",
      "copy_production",
      "video_production",
      "print_file_production",
      "quality_team",
      "supervisor",
      "studio_manager",
      "owner",
      "scout",
    ]);
    expect(STUDIO_TEAM_ROLE_CARDS.map((card) => card.role)).toEqual(cfg.roster);
    for (const role of cfg.roster) {
      const card = roleCard(role);
      expect(card.job).toBeTruthy();
      expect(card.jobIsNot).toBeTruthy();
      expect(card.workComesFrom).toBeTruthy();
      expect(card.outputGoesTo).toBeTruthy();
      expect(card.mayActAutomatically).toBeTruthy();
      expect(card.mustStop).toBeTruthy();
      expect(card.mustEscalate).toBeTruthy();
      expect(card.mayNeverInvent).toBeTruthy();
      expect(card.usesSharedPacket).toBeTruthy();
    }
    expect(roleCard("scout").onCustomerProductionChain).toBe(false);
    expect(roleCard("owner").onCustomerProductionChain).toBe(false);
    expect(roleCard("machine").onCustomerProductionChain).toBe(true);
  });

  it("Test A — normal production never touches Owner or Scout", () => {
    let truth = createSharedJobTruth({
      jobId: "bridge-a",
      company: "Harbor Roast",
      project: "Autumn Single-Origin Box",
      skuId: "v2-rtu-flyer",
      authorizedFacts: { businessName: "Harbor Roast Coffee" },
    });
    truth = machineReceiveHandoff(truth, {
      from: "studio_voice",
      received: "Customer brief and authorized facts",
      did: "Gave Machine the opening packet",
      result: "ok",
    }).truth;
    expect(truth.nextExpectedActor).toBe("design_production");

    truth = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "Design assignment from Machine",
      did: "Produced the flyer from authorized facts",
      result: "ok",
    }).truth;
    expect(truth.nextExpectedActor).toBe("quality_team");

    truth = machineReceiveHandoff(truth, {
      from: "quality_team",
      received: "Design artifact",
      did: "Checked facts, layout, and output",
      result: "ok",
    }).truth;

    expect(truth.reviewReady).toBe(true);
    expect(truth.nextExpectedActor).toBe("studio_voice");
    expect(truth.ownerOnDesk).toBe(false);
    expect(truth.handoffs.every((row) => row.nextActor !== "owner")).toBe(true);
    expect(truth.handoffs.every((row) => row.nextActor !== "scout")).toBe(true);
    expect(truth.handoffs.every((row) => row.from !== "scout")).toBe(true);
    expect(voiceStatusFromTruth(truth)).toMatch(/ready for your review/i);
    expect(new Set(truth.handoffs.map((row) => row.recordedBy))).toEqual(new Set(["machine"]));
  });

  it("Test B — missing promised materials stay off Owner", () => {
    let truth = createSharedJobTruth({
      jobId: "bridge-b",
      company: "Moss & Thread",
      project: "Open Weekend",
      skuId: "v2-rtu-flyer",
      customerPromisedMaterials: true,
      materialsReceived: false,
      materialsMissing: true,
      rightsStatus: "waiting",
    });
    const routed = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "Design assignment",
      did: "Stopped. Promised photos are not on the packet",
      result: "blocked",
      blocking: "promised_photos_missing",
    });
    truth = routed.truth;
    expect(routed.ownerEscalation).toBe(false);
    expect(truth.ownerOnDesk).toBe(false);
    expect(truth.nextExpectedActor).toBe("studio_voice");
    expect(truth.blockers).toContain("waiting_on_customer_materials");
    expect(voiceStatusFromTruth(truth)).toMatch(/waiting on the photos/i);
  });

  it("Test C — Owner exception returns through Machine, not Scout", () => {
    let truth = createSharedJobTruth({
      jobId: "bridge-c",
      company: "Harbor Roast",
      project: "Autumn Single-Origin Box",
      skuId: "v2-rtu-flyer",
    });
    const escalate = machineReceiveHandoff(truth, {
      from: "machine",
      received: "Refund request after production started",
      did: "No taught refund rule covers this",
      result: "needs_owner",
    });
    truth = escalate.truth;
    expect(escalate.ownerEscalation).toBe(true);
    expect(truth.nextExpectedActor).toBe("owner");
    expect(truth.ownerOnDesk).toBe(true);
    expect(voiceStatusFromTruth(truth)).toMatch(/decision pending with Owner/i);

    const returned = machineReceiveHandoff(truth, {
      from: "owner",
      received: "Refund exception file",
      did: "Approve half refund if nothing was received; deny if production is in customer custody",
      result: "ok",
    });
    truth = returned.truth;
    expect(returned.scoutOnRoutinePath).toBe(false);
    expect(truth.ownerOnDesk).toBe(false);
    expect(truth.ownerDecision).toMatch(/half refund/i);
    expect(truth.nextExpectedActor).toBe("design_production");
    expect(truth.nextExpectedActor).not.toBe("scout");
  });

  it("Test D — QA reject returns to producer and does not burn a revision", () => {
    let truth = createSharedJobTruth({
      jobId: "bridge-d",
      company: "Cedar Lane",
      project: "Fall Closet Reset",
      skuId: "v2-rtu-flyer",
      revisionIncluded: 1,
    });
    truth = machineReceiveHandoff(truth, {
      from: "studio_voice",
      received: "Opening packet",
      did: "Handed to Machine",
      result: "ok",
    }).truth;
    truth = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "Design assignment",
      did: "Produced first pass",
      result: "ok",
    }).truth;
    const rejected = machineReceiveHandoff(truth, {
      from: "quality_team",
      received: "First pass",
      did: "Rejected spelling and layout defects",
      result: "rejected",
    });
    truth = rejected.truth;
    expect(truth.nextExpectedActor).toBe("design_production");
    expect(truth.customerRevisionConsumedOnInternalFix).toBe(false);
    expect(truth.revisionState.used).toBe(0);
    expect(truth.revisionState.remaining).toBe(1);

    truth = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "QA reject from Machine",
      did: "Fixed spelling and layout",
      result: "ok",
    }).truth;
    truth = machineReceiveHandoff(truth, {
      from: "quality_team",
      received: "Corrected artifact",
      did: "Passed",
      result: "ok",
    }).truth;
    expect(truth.qaPassed).toBe(true);
    expect(truth.revisionState.used).toBe(0);
  });

  it("Test E — unexpected stall goes to Supervisor; intentional STOP stays quiet", () => {
    const active = createSharedJobTruth({
      jobId: "bridge-e-stall",
      company: "Harbor Roast",
      project: "Autumn Single-Origin Box",
      skuId: "v2-rtu-flyer",
    });
    const stalled = machineReceiveHandoff(active, {
      from: "design_production",
      received: "Design assignment",
      did: "Went quiet while expected to continue",
      result: "stalled",
    });
    expect(stalled.nextActor).toBe("supervisor");
    expect(stalled.truth.intentionalStop).toBe(false);

    const listening = createSharedJobTruth({
      jobId: "bridge-e-stop",
      company: "Harbor Roast",
      project: "Autumn Single-Origin Box",
      skuId: "v2-rtu-flyer",
    });
    const stopped = machineReceiveHandoff(listening, {
      from: "machine",
      received: "Assigned work is complete for this turn",
      did: "Intentional STOP. Scout is listening",
      result: "intentional_stop",
    });
    expect(stopped.nextActor).toBeNull();
    expect(stopped.truth.intentionalStop).toBe(true);
    expect(stopped.truth.scoutListening).toBe(true);
    expect(stopped.truth.expectedToContinue).toBe(false);
    expect(stopped.truth.nextExpectedActor).toBeNull();

    const falseAlarm = machineReceiveHandoff(stopped.truth, {
      from: "supervisor",
      received: "Quiet period after STOP",
      did: "Checked whether this was a stall",
      result: "stalled",
    });
    expect(falseAlarm.nextActor).toBeNull();
    expect(falseAlarm.truth.intentionalStop).toBe(true);
  });
});
