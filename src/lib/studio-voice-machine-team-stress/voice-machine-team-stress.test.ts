import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { studioHonestProductionWaitV1 } from "@/config/studio-honest-production-wait-v1";
import { studioSinglePageOwnerWorkAndAttentionConsoleV1 } from "@/config/studio-single-page-owner-work-and-attention-console-v1";
import { studioStep5OwnerConsoleLaunchCertificationV1 } from "@/config/studio-step-5-owner-console-launch-certification-v1";
import { studioVoiceLaunchBlockerHardeningV1 as harden } from "@/config/studio-voice-launch-blocker-hardening-v1";
import { studioVoiceMachineTeamStressV1 as stamp } from "@/config/studio-voice-machine-team-stress-v1";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  answerCustomerLifeQuestion,
  classifyCustomerLifeQuestion,
} from "@/lib/studio-customer-life/answer-question";
import {
  createSharedJobTruth,
  machineReceiveHandoff,
  voiceStatusFromTruth,
} from "@/lib/studio-production-team-communication-bridge";

const FLYER = ["v2-rtu-flyer"] as const;
const copy = studioCustomerLifeV1.customerCopy;

function campaign(id: string, overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: id,
    campaignName: id,
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Stress fixture",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: "2026-09-27T12:00:00.000Z",
    projectDetailsSubmittedAt: "2026-09-27T12:05:00.000Z",
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    ...overrides,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      checkoutSessionId: `cs_${id}`,
      selectedServiceIds: [...FLYER],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      ...overrides.paymentTruth,
    },
  } as CampaignRecord;
}

function envelope(campaignId: string, spine: string): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = buildJobId(campaignId, "v2-rtu-flyer");
  return {
    campaignId,
    version: 12,
    planFingerprint: "fp",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId,
        campaignId,
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        spineStatus: spine as never,
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
      },
    ],
    qaRecords: [],
  };
}

function openPacket(jobId: string, skuId = "v2-rtu-flyer") {
  return createSharedJobTruth({
    jobId,
    company: "Harbor Roast",
    project: jobId,
    skuId,
    authorizedFacts: { businessName: "Harbor Roast Coffee" },
  });
}

describe("STUDIO-OPERATING-VOICE-MACHINE-TEAM-STRESS-1", () => {
  it("keeps protected state and does not redesign the path", () => {
    expect(stamp.doNotRedesign).toBe(true);
    expect(stamp.doNotReopenRoom3).toBe(true);
    expect(stamp.doNotUnparkOwnerConsole).toBe(true);
    expect(studioStep5OwnerConsoleLaunchCertificationV1.verdict).toBe(
      "COMPLETE_BY_EVIDENCE_REUSE",
    );
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.status).toBe(
      "PARKED / HOLD",
    );
    expect(stamp.sharedJobTruthOnLiveSpine).toBe(false);
    expect(studioHonestProductionWaitV1.sharedJobTruth).toBe("tests_only");
    expect(stamp.package4VoiceHost).toBe("discontinued_not_rebuilt");
  });

  it("1 — normal request Voice → Machine → Design → QA never touches Owner or Scout", () => {
    let truth = openPacket("stress-normal");
    truth = machineReceiveHandoff(truth, {
      from: "studio_voice",
      received: "Customer approved flyer brief",
      did: "Handed authorized facts to Machine",
      result: "ok",
    }).truth;
    expect(truth.nextExpectedActor).toBe("design_production");
    truth = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "Machine assignment with authorized facts",
      did: "Produced flyer",
      result: "ok",
    }).truth;
    truth = machineReceiveHandoff(truth, {
      from: "quality_team",
      received: "Design artifact",
      did: "Passed QA",
      result: "ok",
    }).truth;
    expect(truth.reviewReady).toBe(true);
    expect(truth.ownerOnDesk).toBe(false);
    expect(truth.handoffs.every((row) => row.from !== "scout")).toBe(true);
    expect(truth.handoffs.every((row) => row.nextActor !== "scout")).toBe(true);
    expect(truth.handoffs.every((row) => row.nextActor !== "owner")).toBe(true);
  });

  it("2 — two simultaneous routine jobs stay isolated", () => {
    let flyer = openPacket("stress-job-a", "v2-rtu-flyer");
    let email = openPacket("stress-job-b", "v2-rtu-email-kit");
    flyer = machineReceiveHandoff(flyer, {
      from: "studio_voice",
      received: "Flyer brief",
      did: "Opened flyer packet",
      result: "ok",
    }).truth;
    email = machineReceiveHandoff(email, {
      from: "studio_voice",
      received: "Email-kit brief",
      did: "Opened email packet",
      result: "ok",
    }).truth;
    expect(flyer.productionAssignment).toBe("design_production");
    expect(email.productionAssignment).toBe("copy_production");
    expect(flyer.nextExpectedActor).toBe("design_production");
    expect(email.nextExpectedActor).toBe("copy_production");
    expect(flyer.jobId).not.toBe(email.jobId);
    expect(flyer.blockers).toEqual([]);
    expect(email.ownerOnDesk).toBe(false);

    const flyerStatus = answerCustomerLifeQuestion("What's going on with my order?", {
      campaign: campaign("stress-job-a"),
      tasks: envelope("stress-job-a", "building_concepts"),
    });
    const emailStatus = answerCustomerLifeQuestion("What's going on with my order?", {
      campaign: campaign("stress-job-b"),
      tasks: envelope("stress-job-b", "ready_for_queue"),
    });
    expect(flyerStatus.text).toBe(copy.holdingProduction);
    expect(emailStatus.text).toBe(copy.statusWaitingForProductionSlot);
    expect(flyerStatus.text).not.toBe(emailStatus.text);
  });

  it("3 — missing customer information stays with Voice, not Owner", () => {
    const routed = machineReceiveHandoff(
      createSharedJobTruth({
        jobId: "stress-missing",
        company: "Moss & Thread",
        project: "Open Weekend",
        skuId: "v2-rtu-flyer",
        customerPromisedMaterials: true,
        materialsReceived: false,
        materialsMissing: true,
      }),
      {
        from: "design_production",
        received: "Design assignment",
        did: "Stopped. Promised photos are not on the packet",
        result: "blocked",
        blocking: "promised_photos_missing",
      },
    );
    expect(routed.ownerEscalation).toBe(false);
    expect(routed.truth.nextExpectedActor).toBe("studio_voice");
    expect(voiceStatusFromTruth(routed.truth)).toMatch(/waiting on the photos/i);
    expect(classifyCustomerLifeQuestion("I still don’t have the photos.")).toBe(
      "need_anything",
    );
  });

  it("4 — production clarification asks the customer through Voice, not Owner or materials-wait", () => {
    let truth = openPacket("stress-clarify");
    truth = machineReceiveHandoff(truth, {
      from: "studio_voice",
      received: "Opening packet",
      did: "Handed to Machine",
      result: "ok",
    }).truth;
    const routed = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "Design assignment",
      did: "Need the customer to choose one tagline",
      result: "blocked",
      blocking: "need_customer_tagline_choice",
    });
    expect(routed.ownerEscalation).toBe(false);
    expect(routed.truth.ownerOnDesk).toBe(false);
    expect(routed.truth.nextExpectedActor).toBe("studio_voice");
    expect(routed.truth.blockers).toContain("need_customer_tagline_choice");
    expect(voiceStatusFromTruth(routed.truth)).toMatch(/clarification/i);
    expect(voiceStatusFromTruth(routed.truth)).not.toMatch(/photos or files/i);
  });

  it("5 — routine QA failure returns to production and does not burn a revision or Owner", () => {
    let truth = openPacket("stress-qa");
    truth = machineReceiveHandoff(truth, {
      from: "studio_voice",
      received: "Opening packet",
      did: "Handed to Machine",
      result: "ok",
    }).truth;
    truth = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "Assignment",
      did: "First pass",
      result: "ok",
    }).truth;
    truth = machineReceiveHandoff(truth, {
      from: "quality_team",
      received: "First pass",
      did: "Rejected spelling",
      result: "rejected",
    }).truth;
    expect(truth.nextExpectedActor).toBe("design_production");
    expect(truth.customerRevisionConsumedOnInternalFix).toBe(false);
    expect(truth.revisionState.used).toBe(0);
    expect(truth.ownerOnDesk).toBe(false);
  });

  it("6 — included revision stays on the team path; exhausted revision is Owner judgment", () => {
    let included = openPacket("stress-rev-included");
    included = machineReceiveHandoff(included, {
      from: "studio_voice",
      received: "Customer asked for the included revision",
      did: "Recorded included revision request",
      result: "ok",
    }).truth;
    expect(included.ownerOnDesk).toBe(false);
    expect(included.nextExpectedActor).toBe("design_production");

    const exhausted = machineReceiveHandoff(
      createSharedJobTruth({
        jobId: "stress-rev-exhausted",
        company: "Harbor Roast",
        project: "Autumn",
        skuId: "v2-rtu-flyer",
        revisionIncluded: 0,
      }),
      {
        from: "studio_voice",
        received: "Customer asked for another revision",
        did: "Included revision already used",
        result: "ok",
      },
    );
    expect(exhausted.ownerEscalation).toBe(true);
    expect(exhausted.truth.ownerOnDesk).toBe(true);
    expect(exhausted.truth.nextExpectedActor).toBe("owner");
    expect(classifyCustomerLifeQuestion("I need a revision.")).toBe("can_changes");
  });

  it("7 — status question while production is underway does not invent dates or need Owner", () => {
    const asked = answerCustomerLifeQuestion("What's going on with my order?", {
      campaign: campaign("stress-status"),
      tasks: envelope("stress-status", "building_concepts"),
    });
    expect(asked.intent).toBe("flyer_status");
    expect(asked.text).toBe(copy.holdingProduction);
    expect(asked.text).not.toMatch(/tomorrow|queue number|you are number/i);

    let truth = openPacket("stress-status-packet");
    truth = machineReceiveHandoff(truth, {
      from: "studio_voice",
      received: "Customer asked status",
      did: "Read Machine packet",
      result: "ok",
    }).truth;
    expect(voiceStatusFromTruth(truth)).not.toMatch(/tomorrow|queue number/i);
    expect(truth.ownerOnDesk).toBe(false);
  });

  it("8 — lane-cap wait stays off Owner and invents no start date", () => {
    const routed = machineReceiveHandoff(openPacket("stress-lane"), {
      from: "machine",
      received: "Ready for production",
      did: "Quick lane is full",
      result: "blocked",
      blocking: "waiting_for_production_slot",
    });
    expect(routed.ownerEscalation).toBe(false);
    expect(routed.truth.blockers).toContain("waiting_for_production_slot");
    expect(voiceStatusFromTruth(routed.truth)).toMatch(/production slot/i);
    expect(voiceStatusFromTruth(routed.truth)).toMatch(/will not invent a start date/i);

    const voice = answerCustomerLifeQuestion("When will you start?", {
      campaign: campaign("stress-lane-live"),
      tasks: envelope("stress-lane-live", "ready_for_queue"),
    });
    expect(voice.text).toBe(copy.whenStartInLine);
    expect(voice.text).not.toMatch(/tomorrow|#\d+/);
  });

  it("9 — production retry stays on the producer and does not repurchase Owner time", () => {
    let truth = openPacket("stress-retry");
    truth = machineReceiveHandoff(truth, {
      from: "studio_voice",
      received: "Opening packet",
      did: "Handed to Machine",
      result: "ok",
    }).truth;
    const first = machineReceiveHandoff(truth, {
      from: "design_production",
      received: "Assignment",
      did: "Render failed once; retrying same assignment",
      result: "ok",
    });
    expect(first.ownerEscalation).toBe(false);
    expect(first.truth.nextExpectedActor).toBe("quality_team");
    expect(first.scoutOnRoutinePath).toBe(false);
  });

  it("10 — genuine exceptions reach Owner once; Scout is never the courier", () => {
    const cases = [
      ["Refund after production started", "No taught refund rule"],
      ["Scope change to add a second service", "Needs Owner scope judgment"],
      ["Pricing exception below published shelf", "Needs Owner price judgment"],
      ["Rights are ambiguous on the supplied photo", "Needs Owner rights judgment"],
      ["Quality / brand taste call after QA passed", "Needs Owner quality judgment"],
      ["Unusual customer exception outside taught rules", "Needs Owner judgment"],
    ] as const;

    for (const [received, did] of cases) {
      const routed = machineReceiveHandoff(openPacket(`stress-ex-${did}`), {
        from: "machine",
        received,
        did,
        result: "needs_owner",
      });
      expect(routed.ownerEscalation, received).toBe(true);
      expect(routed.truth.nextExpectedActor, received).toBe("owner");
      expect(routed.scoutOnRoutinePath, received).toBe(false);
      const returned = machineReceiveHandoff(routed.truth, {
        from: "owner",
        received: "Owner file",
        did: "Decide once and teach forward",
        result: "ok",
      });
      expect(returned.truth.ownerOnDesk, received).toBe(false);
      expect(returned.truth.nextExpectedActor, received).not.toBe("scout");
      expect(returned.truth.nextExpectedActor, received).toBe("design_production");
    }

    const refundVoice = answerCustomerLifeQuestion("I want a refund.", {
      campaign: campaign("stress-refund-voice"),
    });
    expect(refundVoice.intent).toBe("refund");
    expect(refundVoice.text).toBe(harden.refundAck);
    expect(refundVoice.text).toMatch(/will not grant a refund/i);
  });

  it("names remaining zero-courier and live-path limits instead of hiding them", () => {
    expect(stamp.sharedJobTruthOnLiveSpine).toBe(false);
    expect(stamp.liveCustomerTruth).toBe("campaign_record_job_spine");
    expect(stamp.rightsVoice).toBe("not_implemented");
    expect(stamp.laneCapacityCertified).toBe(false);
    expect(
      answerCustomerLifeQuestion("Can I use this photo from Google?", {
        campaign: campaign("stress-rights-voice"),
      }).intent,
    ).toBe("unknown");
    expect(stamp.nextLockedSequencePackage).toBe("menu_readiness_and_demand_freeze");
    expect(stamp.doNotStartNextFromThisStamp).toBe(true);
  });
});
