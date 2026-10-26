import { describe, expect, it } from "vitest";

import { ownerDeskEscalationV1, ownerMatterMayBeCreated } from "@/config/studio-owner-desk-escalation-v1";
import { studioRoom4cScenario1CedarLaneV1 as cedarLane } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";
import { studioRoom4cScenario2HarborRoastV1 as harborRoast } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";
import { studioSinglePageOwnerWorkAndAttentionConsoleV1 } from "@/config/studio-single-page-owner-work-and-attention-console-v1";
import {
  applyOwnerTrayAction,
  composeOwnerFrontDoorFromTrays,
  composeOwnerMatterFile,
  ownerFrontDoorStaysRedFromTrays,
  ownerHeldBlockingMatters,
  ownerMatterAttention,
  ownerTrayCounts,
  seedOwnerConsole001003State,
  seedOwnerConsoleE2eState,
  seedOwnerTrayState,
} from "@/lib/studio-customer-ready/owner-decision-tray";
import { ownerDeskRecord } from "@/lib/studio-customer-ready/owner-desk-records";

const now = Date.parse("2026-09-21T22:00:00.000Z");

describe("Owner Decision Tray / File System", () => {
  it("locks the Owner desk as an exception desk with two required arrival lines", () => {
    expect(ownerDeskEscalationV1.deskIsExceptionDeskNotActivityFeed).toBe(true);
    expect(ownerDeskEscalationV1.missingPromisedMaterialsStayWithVoiceAndMachine).toBe(true);
    expect(ownerDeskEscalationV1.requiredArrivalLines).toEqual([
      "WHY YOU ARE GETTING THIS",
      "WHAT I NEED FROM YOU",
    ]);
    expect(
      ownerMatterMayBeCreated({
        whyYouAreGettingThis: "",
        whatINeedFromYou: "Decide",
      }),
    ).toBe(false);
    expect(
      ownerMatterMayBeCreated({
        whyYouAreGettingThis: ownerDeskEscalationV1.newWorkOpenedByMistake.whyYouAreGettingThis,
        whatINeedFromYou: ownerDeskEscalationV1.newWorkOpenedByMistake.whatINeedFromYou,
      }),
    ).toBe(true);
  });

  it("reads existing Cedar Lane and Harbor Roast records instead of a second pile", () => {
    expect(ownerDeskRecord(cedarLane.campaignId).company).toBe(
      cedarLane.customer.businessName,
    );
    expect(ownerDeskRecord(harborRoast.campaignId).company).toBe(
      harborRoast.customer.businessName,
    );
    expect(ownerDeskRecord(cedarLane.campaignId).source).toContain(
      "studio-room-4c-scenario-1-cedar-lane-v1",
    );
  });

  it("keeps tile color on the matter, not the tray, and hold-while-blocked stays RED", () => {
    const seed = seedOwnerTrayState();
    expect(seed.matters.some((matter) => matter.id === "harbor-roast-follow-up")).toBe(
      false,
    );
    expect(seed.matters.some((matter) => matter.id === "harbor-roast-direction-sent")).toBe(
      false,
    );

    const held = applyOwnerTrayAction(seed, {
      action: "hold",
      matterId: "cedar-lane-unsupported-size",
      nowIso: "2026-09-21T22:05:00.000Z",
    });
    const waiting = held.matters.find((matter) => matter.id === "cedar-lane-unsupported-size");
    expect(waiting?.tray).toBe("WAITING_ON_MY_DECISION");
    expect(ownerMatterAttention(waiting!)).toBe("RED");
    expect(waiting?.status).toBe("Held · Scout still blocked");
    expect(ownerHeldBlockingMatters(held).map((matter) => matter.id)).toEqual([
      "cedar-lane-unsupported-size",
    ]);
    expect(ownerFrontDoorStaysRedFromTrays(held)).toBe(true);
  });

  it("opens one file, collapses it, sends, files, and reopens history without mutating the original", () => {
    let state = seedOwnerTrayState();
    state = applyOwnerTrayAction(state, {
      action: "open",
      matterId: "harbor-roast-scope-add",
    });
    expect(state.openMatterId).toBe("harbor-roast-scope-add");
    state = applyOwnerTrayAction(state, {
      action: "open",
      matterId: "cedar-lane-unsupported-size",
    });
    expect(state.openMatterId).toBe("cedar-lane-unsupported-size");

    state = applyOwnerTrayAction(state, {
      action: "collapse",
      matterId: "cedar-lane-unsupported-size",
    });
    expect(state.openMatterId).toBeNull();

    state = applyOwnerTrayAction(state, {
      action: "send",
      matterId: "harbor-roast-scope-add",
      decision: "Keep the certified Harbor Roast package as filed.",
      nowIso: "2026-09-21T22:10:00.000Z",
    });
    const sent = state.matters.find((matter) => matter.id === "harbor-roast-scope-add");
    expect(sent?.tray).toBe("SENT_IN_PROGRESS");
    expect(ownerMatterAttention(sent!)).toBe("GREEN");
    expect(state.matters.filter((matter) => matter.id === "harbor-roast-scope-add")).toHaveLength(1);

    state = applyOwnerTrayAction(state, {
      action: "file",
      matterId: "harbor-roast-scope-add",
      nowIso: "2026-09-21T22:20:00.000Z",
    });
    const filed = state.matters.find((matter) => matter.id === "harbor-roast-scope-add");
    expect(filed?.tray).toBe("COMPLETED_FILED");
    expect(filed?.filedOriginalLocked).toBe(true);

    state = applyOwnerTrayAction(state, {
      action: "reopen",
      matterId: "cedar-lane-caption-filed",
    });
    expect(state.openMatterId).toBe("cedar-lane-caption-filed");
    const original = state.matters.find((matter) => matter.id === "cedar-lane-caption-filed");
    expect(original?.tray).toBe("COMPLETED_FILED");
    expect(original?.matter).toBe("Promo caption filed");

    state = applyOwnerTrayAction(state, {
      action: "open_related_work",
      matterId: "cedar-lane-caption-filed",
      nowIso: "2026-09-21T22:30:00.000Z",
    });
    expect(original && state.matters.find((matter) => matter.id === original.id)?.tray).toBe(
      "COMPLETED_FILED",
    );
    const related = state.matters.find((matter) => matter.relatedTo === "cedar-lane-caption-filed");
    expect(related?.tray).toBe("ACTION_REQUIRED");
    expect(related?.matter).toBe("New work");
    expect(related?.whyOnDesk).toBe(
      "New work was opened and Scout cannot continue without your direction.",
    );
    expect(related?.decisionRequired).toBe(
      "Tell Scout what the new work is, or put the matter away if it was opened by mistake.",
    );
    expect(state.openMatterId).toBe(related?.id);

    state = applyOwnerTrayAction(state, {
      action: "file",
      matterId: related!.id,
      nowIso: "2026-09-21T22:31:00.000Z",
    });
    expect(state.matters.find((matter) => matter.id === related!.id)?.tray).toBe(
      "COMPLETED_FILED",
    );
  });

  it("does not move a filed original, and reopen leaves that original filed", () => {
    const state = seedOwnerTrayState();
    expect(() =>
      applyOwnerTrayAction(state, {
        action: "hold",
        matterId: "cedar-lane-caption-filed",
      }),
    ).toThrow(/filed original/i);
    const reopened = applyOwnerTrayAction(state, {
      action: "reopen",
      matterId: "cedar-lane-caption-filed",
    });
    const original = reopened.matters.find((matter) => matter.id === "cedar-lane-caption-filed");
    expect(original?.tray).toBe("COMPLETED_FILED");
    expect(original?.filedOriginalLocked).toBe(true);
    expect(reopened.openMatterId).toBe("cedar-lane-caption-filed");
  });

  it("opens Reference without moving it or raising RED", () => {
    let state = seedOwnerTrayState();
    state = applyOwnerTrayAction(state, { action: "open", matterId: "ref-refund" });
    const refund = state.matters.find((matter) => matter.id === "ref-refund");
    expect(state.openMatterId).toBe("ref-refund");
    expect(refund?.tray).toBe("REFERENCE");
    expect(ownerMatterAttention(refund!)).toBe("GREEN");
    expect(() =>
      applyOwnerTrayAction(state, { action: "send", matterId: "ref-refund" }),
    ).toThrow(/Reference is linked/);
  });

  it("composes the required file sections from the existing record", () => {
    const seed = seedOwnerTrayState();
    const file = composeOwnerMatterFile(
      seed.matters.find((matter) => matter.id === "cedar-lane-unsupported-size")!,
      now,
    );
    expect(file.company).toBe("Cedar Lane Home Organizing");
    expect(file.matter).toBe("Unsupported print size");
    expect(file.record.projectName).toBe("Fall Closet Reset");
    expect(file.whatTheyWant).toContain("closet reset");
    expect(file.whyYouAreGettingThis).toContain("unsupported sizes");
    expect(file.whatINeedFromYou).toContain("print size");
    expect(file.why).toContain("unsupported sizes");
    expect(file.studioAlreadyDid).toContain("Fall Closet Reset");
    expect(file.projectState).toContain("CLOSED WITH EXPLICIT LIMITS");
    expect(file.relevantRule).toContain("REVISION POLICY");
    expect(file.decisionRequired).toContain("print size");
    expect(file.assignedRecipient).toBe("Scout");
    expect(file.nextHandoff).toContain("Cedar Lane");
    expect(ownerTrayCounts(seed).ACTION_REQUIRED).toBe(2);
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.trayStatus).toBe(
      "HOLD / DONE",
    );
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.doNotImplementTrayYet).toBe(
      false,
    );
  });

  it("runs one controlled matter through hold, send, file, and clears the front door", () => {
    let state = seedOwnerConsoleE2eState();
    const start = composeOwnerFrontDoorFromTrays(state);
    expect(start.attention).toBe("RED");
    expect(start.message).toBe("Owner input is needed.");
    expect(start.steps).toEqual([]);
    expect(start.currentTask).toBe("");
    expect(start.showAck).toBe(true);
    expect(state.matters.some((matter) => matter.recordId.includes("maya"))).toBe(
      false,
    );

    state = applyOwnerTrayAction(state, {
      action: "open",
      matterId: "e2e-harbor-roast-print-add",
    });
    expect(state.openMatterId).toBe("e2e-harbor-roast-print-add");
    const file = composeOwnerMatterFile(
      state.matters.find((matter) => matter.id === "e2e-harbor-roast-print-add")!,
    );
    expect(file.facts).toContain("Harbor Roast Coffee Co.");
    expect(file.relevantRule).toContain("REFUND POLICY");

    state = applyOwnerTrayAction(state, {
      action: "hold",
      matterId: "e2e-harbor-roast-print-add",
      nowIso: "2026-09-21T22:45:00.000Z",
    });
    const held = state.matters.find((matter) => matter.id === "e2e-harbor-roast-print-add");
    expect(held?.tray).toBe("WAITING_ON_MY_DECISION");
    expect(ownerMatterAttention(held!)).toBe("RED");
    expect(composeOwnerFrontDoorFromTrays(state).attention).toBe("RED");

    state = applyOwnerTrayAction(state, {
      action: "send",
      matterId: "e2e-harbor-roast-print-add",
      decision: "Keep the certified package as filed.",
      nowIso: "2026-09-21T22:50:00.000Z",
    });
    expect(
      state.matters.find((matter) => matter.id === "e2e-harbor-roast-print-add")?.tray,
    ).toBe("SENT_IN_PROGRESS");
    const sentDoor = composeOwnerFrontDoorFromTrays(state);
    expect(sentDoor.attention).toBe("GREEN");
    expect(sentDoor.message).toBe("No Owner action is required.");
    expect(sentDoor.showAck).toBe(false);
    expect(ownerFrontDoorStaysRedFromTrays(state)).toBe(false);

    state = applyOwnerTrayAction(state, {
      action: "file",
      matterId: "e2e-harbor-roast-print-add",
      nowIso: "2026-09-21T23:00:00.000Z",
    });
    expect(
      state.matters.find((matter) => matter.id === "e2e-harbor-roast-print-add")?.tray,
    ).toBe("COMPLETED_FILED");
    expect(composeOwnerFrontDoorFromTrays(state).attention).toBe("GREEN");

    state = applyOwnerTrayAction(state, {
      action: "reopen",
      matterId: "e2e-harbor-roast-print-add",
    });
    expect(state.openMatterId).toBe("e2e-harbor-roast-print-add");
    expect(
      state.matters.find((matter) => matter.id === "e2e-harbor-roast-print-add")?.tray,
    ).toBe("COMPLETED_FILED");
    expect(composeOwnerFrontDoorFromTrays(state).attention).toBe("GREEN");
  });

  it("loads 001 / 002 / 003 as real Owner exceptions and keeps the desk RED until all are sent", () => {
    let state = seedOwnerConsole001003State("2026-09-22T20:40:00.000Z");
    expect(ownerTrayCounts(state).ACTION_REQUIRED).toBe(3);
    expect(composeOwnerFrontDoorFromTrays(state).attention).toBe("RED");
    const refund = composeOwnerMatterFile(
      state.matters.find((matter) => matter.id === "001-harbor-roast-refund-exception")!,
    );
    expect(refund.whyYouAreGettingThis).toContain("refund");
    expect(refund.whatINeedFromYou).toContain("refund exception");
    expect(ownerMatterMayBeCreated({
      whyYouAreGettingThis: refund.whyYouAreGettingThis,
      whatINeedFromYou: refund.whatINeedFromYou,
    })).toBe(true);

    state = applyOwnerTrayAction(state, {
      action: "open",
      matterId: "001-harbor-roast-refund-exception",
    });
    expect(() =>
      applyOwnerTrayAction(state, {
        action: "send",
        matterId: "001-harbor-roast-refund-exception",
      }),
    ).toThrow(/Write your decision/);
    state = applyOwnerTrayAction(state, {
      action: "send",
      matterId: "001-harbor-roast-refund-exception",
      decision: "Keep the locked refund rule. No exception.",
    });
    expect(
      state.matters.find((matter) => matter.id === "001-harbor-roast-refund-exception")
        ?.tray,
    ).toBe("SENT_IN_PROGRESS");
    expect(
      state.matters.find((matter) => matter.id === "001-harbor-roast-refund-exception")
        ?.ownerDecision,
    ).toBe("Keep the locked refund rule. No exception.");
    expect(composeOwnerFrontDoorFromTrays(state).attention).toBe("RED");
    expect(ownerTrayCounts(state).ACTION_REQUIRED).toBe(2);
    const moss = composeOwnerMatterFile(
      state.matters.find((matter) => matter.id === "003-moss-thread-asked-for-owner")!,
    );
    expect(moss.customerAskingOwner).toContain("photographs already bound");
    expect(moss.whyTeamCouldNotResolve).toContain("Studio-generated test fixtures");
    expect(moss.decisionNeededFromOwner).toContain("Choose one");
    expect(moss.ownerSteps.at(-1)).toBe("Send your decision.");
  });
});
