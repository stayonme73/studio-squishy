import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { studioVoiceMachineCustomerCommunicationV1 } from "@/config/studio-voice-machine-customer-communication-v1";
import { studioCustomerCommunicationEmailMapV1 } from "@/lib/studio-customer-life/email-capability-map";
import { resolveCustomerVisibilityContinuityView } from "@/lib/customer-visibility-continuity";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import {
  answerCustomerLifeQuestion,
  assembleCustomerLifeTruth,
} from "@/lib/studio-customer-life";
import {
  askCustomerLifeFromStore,
  recordMayaResponseToStudioRequest,
  resolveCustomerAskState,
  resolveStudioCustomerRequests,
} from "@/lib/studio-customer-life/communication-loop";

const FLYER = ["v2-rtu-flyer"] as const;
const LIFE_DIR = path.join(process.cwd(), "data", "campaign-customer-life");

function mayaCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([...FLYER]);
  return {
    campaignId: "maya-voice-machine",
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: "cs_maya_voice",
      selectedServiceIds: [...FLYER],
      decisionId: "dec_maya_voice",
      factFingerprint: "fp_maya_voice",
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...FLYER],
      includedServiceIds: [...FLYER],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([...FLYER]),
      approvedAt: now,
    },
    ...overrides,
  };
}

function envelopeFor(
  campaign: CampaignRecord,
  extras: Partial<NonNullable<ServerTasksEnvelope["jobRecords"]>[number]> = {},
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = buildJobId(campaign.campaignId, "v2-rtu-flyer");
  return {
    campaignId: campaign.campaignId,
    version: 12,
    planFingerprint: "fp",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId,
        campaignId: campaign.campaignId,
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        spineStatus: "building_concepts",
        productionLane: "quick",
        intakeComplete: Boolean(campaign.projectDetailsSubmittedAt),
        updatedAt: now,
        ...extras,
      },
    ],
    qaRecords: [],
  };
}

const storedFile: CampaignMaterialItem = {
  id: "optional-mark",
  category: "logo-brand",
  requirementLevel: "optional",
  reviewStatus: "submitted",
  contentKind: "file-metadata",
  label: "Optional mark",
  reason: "Wordmark-only allowed",
  relatedServiceIds: [...FLYER],
  uploadStatus: "stored",
};

describe("STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1", () => {
  afterEach(async () => {
    await fs.rm(path.join(LIFE_DIR, "maya-voice-machine.json"), { force: true });
  });

  it("answers Maya's asked questions from Machine truth and does not guess unknown facts", () => {
    const campaign = mayaCampaign();
    const questions = [
      "Did my payment go through?",
      "Do you need anything else from me?",
      "Did you receive my file?",
      "Has work started yet?",
      "What is happening with my flyer?",
      "Is anything holding it up?",
      "When will I be able to review it?",
      "Can I make changes after I see it?",
    ];
    for (const question of questions) {
      const answer = answerCustomerLifeQuestion(question, {
        campaign,
        materials: [storedFile],
      });
      expect(answer.source, question).toBe("machine_record");
      expect(answer.text.toLowerCase(), question).not.toMatch(
        /probably|i think|should be|tomorrow|friday/,
      );
    }

    const unknown = answerCustomerLifeQuestion("What is Tagia's favorite color?", {
      campaign,
    });
    expect(unknown.known).toBe(false);
    expect(unknown.text).toBe(studioCustomerLifeV1.customerCopy.unknownFromRecord);
  });

  it("keeps received files distinct from approved-for-use files", () => {
    const campaign = mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() });
    const pending = answerCustomerLifeQuestion("Did you receive my file?", {
      campaign,
      materials: [storedFile],
    });
    expect(pending.text).toBe(studioCustomerLifeV1.customerCopy.uploadReceivedPendingUse);
    expect(pending.text.toLowerCase()).not.toMatch(/approved for use on this project/);

    const approved = answerCustomerLifeQuestion("Did you receive my file?", {
      campaign,
      materials: [{ ...storedFile, reviewStatus: "approved_for_use" }],
    });
    expect(approved.text).toBe(studioCustomerLifeV1.customerCopy.uploadApprovedForUse);
  });

  it("answers assignment and QA only from job records that exist today", () => {
    const campaign = mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() });
    expect(
      answerCustomerLifeQuestion("Has production been assigned?", {
        campaign,
        tasks: envelopeFor(campaign),
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.productionNotAssigned);

    const assigned = envelopeFor(campaign, {
      workPackets: [
        {
          id: "wp-1",
          jobId: buildJobId(campaign.campaignId, "v2-rtu-flyer"),
          campaignId: campaign.campaignId,
          role: "creative_production",
          taskIds: [],
          status: "assigned",
          createdAt: campaign.updatedAt,
          updatedAt: campaign.updatedAt,
          assignmentEvents: [
            {
              id: "assign-1",
              assignedAt: campaign.updatedAt,
              assignedBy: { role: "system" },
              role: "creative_production",
            },
          ],
          returnedFileRefs: [],
          returnLocation: "production_workspace",
          ownerApprovalRequired: false,
        },
      ],
    });
    expect(
      answerCustomerLifeQuestion("Has production been assigned?", {
        campaign,
        tasks: assigned,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.productionAssigned);

    expect(
      answerCustomerLifeQuestion("Has QA happened?", {
        campaign,
        tasks: envelopeFor(campaign),
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.qaNotRecorded);
  });

  it("asks Maya for Project Intake, records her reply, and clears waiting only after intake is on the record", async () => {
    const incomplete = assembleCustomerLifeTruth({ campaign: mayaCampaign() });
    const requests = resolveStudioCustomerRequests(incomplete);
    expect(requests.some((request) => request.id === "awaiting_intake")).toBe(true);
    expect(requests[0]?.prompt).toContain("Project Intake");
    expect(requests[0]?.prompt).toMatch(/do not need to repeat facts/i);

    const ack = await recordMayaResponseToStudioRequest({
      campaignId: incomplete.campaignId ?? "maya-voice-machine",
      body: "I can finish intake now.",
      requestId: "awaiting_intake",
      truth: incomplete,
    });
    expect(ack.stallCleared).toBe(false);
    expect(ack.acknowledgedText).toBe(
      studioVoiceMachineCustomerCommunicationV1.customerCopy.responseAckStillWaiting,
    );

    const complete = assembleCustomerLifeTruth({
      campaign: mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() }),
    });
    expect(resolveStudioCustomerRequests(complete).some((row) => row.id === "awaiting_intake")).toBe(
      false,
    );
    const cleared = await recordMayaResponseToStudioRequest({
      campaignId: complete.campaignId ?? "maya-voice-machine",
      body: "Intake is done.",
      requestId: "awaiting_intake",
      truth: complete,
    });
    expect(cleared.stallCleared).toBe(true);
  });

  it("does not contradict Board visibility for payment, intake, and waiting actor", () => {
    const campaign = mayaCampaign();
    const truth = assembleCustomerLifeTruth({ campaign, materials: [storedFile] });
    const voice = answerCustomerLifeQuestion("What is happening with my project?", {
      campaign,
      materials: [storedFile],
    });
    const board = resolveCustomerVisibilityContinuityView({ campaign });
    expect(truth.paymentConfirmed).toBe(true);
    expect(voice.text).toMatch(/Payment is confirmed/);
    expect(board.whoActsNext).toBe("customer");
    expect(board.neededItems.join(" ")).toMatch(/Project Intake/i);
    expect(truth.ownerActionRequired).toBe(false);
  });

  it("records a Machine lookup for a question and marks unknown questions as waiting, then stalled", async () => {
    const campaign = mayaCampaign();
    const asked = await askCustomerLifeFromStore({
      campaignId: campaign.campaignId,
      question: "Did my payment go through?",
      campaignOverride: campaign,
    });
    expect(asked.answer.known).toBe(true);
    expect(asked.answer.text).toBe(studioCustomerLifeV1.customerCopy.paymentConfirmed);

    const unknown = await askCustomerLifeFromStore({
      campaignId: campaign.campaignId,
      question: "What is Tagia's favorite color?",
      campaignOverride: campaign,
    });
    expect(unknown.answer.known).toBe(false);
    expect(
      resolveCustomerAskState({
        known: false,
        askedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      }),
    ).toBe("stalled");
    expect(
      resolveCustomerAskState({
        known: false,
        askedAt: new Date().toISOString(),
      }),
    ).toBe("waiting_for_studio");
  });

  it("does not treat an unknown question as if Maya answered a Studio request", () => {
    const incomplete = assembleCustomerLifeTruth({ campaign: mayaCampaign() });
    expect(resolveStudioCustomerRequests(incomplete).some((row) => row.id === "awaiting_intake")).toBe(
      true,
    );
    const unknown = answerCustomerLifeQuestion("What is Tagia's favorite color?", {
      campaign: mayaCampaign(),
    });
    expect(unknown.known).toBe(false);
    expect(unknown.text).toBe(studioCustomerLifeV1.customerCopy.unknownFromRecord);
    expect("What is Tagia's favorite color?".endsWith("?")).toBe(true);
  });

  it("maps current email capability without treating pending_owner_send as Tagia send duty", () => {
    const map = studioCustomerCommunicationEmailMapV1;
    expect(map.pendingOwnerSendIsOwnerRoutine).toBe(false);
    expect(map.routineProjectLifeEmail).toBe("authorized_templates_via_resend");
    expect(map.reachesResendToday.map((row) => row.kind)).toEqual([
      "email-verification",
      "email-verification-resend",
      "password-reset",
      "project-claim-recovery",
      "customer-lifecycle",
    ]);
    expect(map.durableInAppNotices).toContain("payment_received");
    expect(map.missingWiringForLaterEmailSection.length).toBeGreaterThan(0);
  });
});
