import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { applyClientSubmitItem } from "@/lib/materials/actions";
import { canRequestJobRevision } from "@/lib/job-control/review-room-gates";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import {
  answerCustomerLifeQuestion,
  assembleCustomerLifeTruth,
  bindFlyerIdentityToQaRecords,
  classifyCustomerLifeQuestion,
  resolveFlyerObserverPngRelativePath,
} from "@/lib/studio-customer-life";

const FLYER = ["v2-rtu-flyer"] as const;

function mayaCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([...FLYER]);
  return {
    campaignId: "maya-life",
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
      checkoutSessionId: "cs_maya_life",
      selectedServiceIds: [...FLYER],
      decisionId: "dec_maya",
      factFingerprint: "fp_maya",
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

function withActivation(campaign: CampaignRecord): CampaignRecord {
  const now = campaign.updatedAt;
  return {
    ...campaign,
    postPayActivation: campaign.postPayActivation ?? {
      schemaVersion: 1,
      status: "activated",
      phase: campaign.projectDetailsSubmittedAt ? "ready_for_routing" : "awaiting_intake",
      activatedAt: now,
      lastAttemptAt: now,
      checkoutSessionId: campaign.paymentTruth?.checkoutSessionId ?? "cs_maya_life",
      jobIds: [buildJobId(campaign.campaignId, "v2-rtu-flyer")],
      taskCount: 1,
      intakeComplete: Boolean(campaign.projectDetailsSubmittedAt),
      blockingRequiredMaterialsCount: 0,
      ownerActionRequired: false,
      lastError: null,
    },
  };
}

function envelopeFor(campaign: CampaignRecord, spine = "building_concepts"): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = buildJobId(campaign.campaignId, "v2-rtu-flyer");
  return {
    campaignId: campaign.campaignId,
    version: 12,
    planFingerprint: "fp",
    updatedAt: now,
    syncedAt: now,
    tasks: [
      {
        id: "v2-rtu-flyer:qa",
        familyId: "marketing_assets",
        catalogFamilyId: "marketing_assets",
        title: "Flyer QA",
        status: "ready",
        serviceName: "Make Me a Flyer",
        phase: "qa",
        relatedServiceIds: ["v2-rtu-flyer"],
        dependsOn: [],
        workflowState: "ready_for_qa",
      },
    ],
    jobRecords: [
      {
        jobId,
        campaignId: campaign.campaignId,
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        spineStatus: spine as never,
        productionLane: "quick",
        intakeComplete: Boolean(campaign.projectDetailsSubmittedAt),
        updatedAt: now,
      },
    ],
    qaRecords: [],
  };
}

function designEvidence() {
  return {
    evaluation: {
      skuId: "v2-rtu-flyer",
      fixtureId: "maya-wordmark",
      ok: true,
      findings: [],
      checkedAt: new Date().toISOString(),
      deterministicFailCount: 0,
      judgmentRequired: true as const,
      summary: "Machine flyer QA bound.",
    },
    attestations: {
      hierarchyReviewed: true,
      readabilityReviewed: true,
      spacingCompositionReviewed: true,
      brandFitReviewed: true,
      genericnessRejected: true,
      exportReadinessReviewed: true,
      notes: "Sealed Machine renderer identity.",
    },
    gatePassed: true,
  };
}

describe("STUDIO-OPERATING-FULL-CUSTOMER-LIFE-AND-COMMUNICATION-1", () => {
  it("answers Maya's payment question from the Machine record, not a guess", () => {
    const paid = answerCustomerLifeQuestion("Did my payment go through?", {
      campaign: mayaCampaign(),
    });
    expect(paid.known).toBe(true);
    expect(paid.text).toBe(studioCustomerLifeV1.customerCopy.paymentConfirmed);

    const unpaid = answerCustomerLifeQuestion("Did my payment go through?", {
      campaign: mayaCampaign({
        paymentReceivedAt: null,
        paymentTruth: {
          processor: "stripe",
          status: "initiated",
          currency: "usd",
          expectedAmountCents: 6900,
          checkoutSessionId: "cs_open",
          selectedServiceIds: [...FLYER],
          decisionId: "dec",
          factFingerprint: "fp",
          draftRevision: 1,
        },
      }),
    });
    expect(unpaid.text).toBe(studioCustomerLifeV1.customerCopy.paymentNotConfirmed);
  });

  it("tells Maya Project Intake is still needed after pay", () => {
    const answer = answerCustomerLifeQuestion("Do you need anything else from me?", {
      campaign: mayaCampaign(),
    });
    expect(answer.text).toBe(studioCustomerLifeV1.customerCopy.intakeNeeded);
  });

  it("acknowledges upload without treating it as approved for use", () => {
    const materials: CampaignMaterialItem[] = [
      {
        id: "photo-1",
        category: "photos",
        requirementLevel: "optional",
        reviewStatus: "submitted",
        contentKind: "file-metadata",
        label: "Storefront photo",
        reason: "Optional photo",
        relatedServiceIds: [...FLYER],
        uploadStatus: "stored",
      },
    ];
    const received = answerCustomerLifeQuestion("Did you receive my upload?", {
      campaign: mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() }),
      materials,
    });
    expect(received.text).toBe(studioCustomerLifeV1.customerCopy.uploadReceivedPendingUse);
    expect(received.text.toLowerCase()).toMatch(/still being checked for use/);
    expect(received.text.toLowerCase()).toMatch(/not the same as approved/);
  });

  it("does not invent a review date and does not claim work started from payment alone", () => {
    const campaign = withActivation(mayaCampaign());
    expect(
      answerCustomerLifeQuestion("Has work started?", { campaign }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.workNotStarted);
    expect(
      answerCustomerLifeQuestion("When can I review it?", { campaign }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.reviewNotReady);
    expect(
      answerCustomerLifeQuestion("When can I review it?", { campaign }).text,
    ).not.toMatch(/tomorrow|friday|estimate/i);
  });

  it("uses one underlying truth for Voice status, Board-phase, and stalls", () => {
    const campaign = mayaCampaign({
      postPayActivation: {
        schemaVersion: 1,
        status: "pending_retry",
        phase: "awaiting_intake",
        activatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        checkoutSessionId: "cs_maya_life",
        jobIds: [],
        taskCount: 0,
        intakeComplete: false,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
        lastError: "hiccup",
      },
    });
    const truth = assembleCustomerLifeTruth({ campaign });
    const voice = answerCustomerLifeQuestion("What is happening with my flyer?", { campaign });
    expect(truth.phase).toBe("recovering");
    expect(voice.phase).toBe("recovering");
    expect(voice.text).toMatch(/getting the project ready/i);
    expect(truth.stalls.some((stall) => stall.recoveryClass === "automatic")).toBe(true);
    expect(truth.ownerActionRequired).toBe(false);
  });

  it("reports one included revision round for Maya's flyer SKU", () => {
    const campaign = mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() });
    const left = answerCustomerLifeQuestion("How many changes do I have left?", {
      campaign,
      tasks: envelopeFor(campaign),
    });
    expect(left.text).toMatch(/1 revision round remaining of 1 included/);
  });

  it("binds Machine flyer identity to QA without inventing a second job", () => {
    const campaign = mayaCampaign({
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    const first = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: envelopeFor(campaign, "building_concepts"),
      pngContentSha256: "abc123",
      renderVersion: 1,
      artifactId: "flyer-v1",
      designEvidence: designEvidence(),
    });
    expect(first.bound).toBe(true);
    const again = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: first.envelope,
      pngContentSha256: "abc123",
      renderVersion: 1,
      artifactId: "flyer-v1",
      designEvidence: designEvidence(),
    });
    expect(again.alreadyBound).toBe(true);
    expect(first.envelope.qaRecords).toHaveLength(1);
    expect(first.envelope.jobRecords?.[0]?.internalQaReviewAuthorization?.status).toBe(
      "ELIGIBLE_FOR_REVIEW",
    );
    expect(first.envelope.jobRecords?.[0]?.spineStatus).toBe("ready_for_review");
  });

  it("does not open Review when design quality evidence is missing", () => {
    const campaign = mayaCampaign({
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    const failed = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: envelopeFor(campaign, "building_concepts"),
      pngContentSha256: "no-qa-yet",
      renderVersion: 1,
      artifactId: "flyer-v1",
    });
    expect(failed.qaAction).toBe("qa_fail");
    expect(failed.envelope.qaRecords?.[0]?.action).toBe("qa_fail");
    expect(failed.envelope.jobRecords?.[0]?.spineStatus).toBe("building_concepts");
    expect(failed.envelope.jobRecords?.[0]?.internalQaReviewAuthorization).toBeUndefined();

    const passed = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: failed.envelope,
      pngContentSha256: "no-qa-yet",
      renderVersion: 1,
      artifactId: "flyer-v1",
      designEvidence: designEvidence(),
    });
    expect(passed.qaAction).toBe("qa_pass");
    expect(passed.envelope.jobRecords?.[0]?.spineStatus).toBe("ready_for_review");
  });

  it("resolves the sealed flyer PNG from artifact identity, not the receipt JSON sibling", () => {
    const dir = path.join(
      process.cwd(),
      "data",
      "campaign-design-artifacts",
      "maya-png-resolve-fixture",
      "renders",
      "v1",
    );
    mkdirSync(dir, { recursive: true });
    const pngRel = "data/campaign-design-artifacts/maya-png-resolve-fixture/renders/v1/flyer.png";
    const receiptRel =
      "data/campaign-design-artifacts/maya-png-resolve-fixture/renders/v1/dispatch-hook-receipt.json";
    writeFileSync(path.join(process.cwd(), pngRel), "png-bytes");
    writeFileSync(
      path.join(process.cwd(), receiptRel),
      JSON.stringify({ identity: { pngRelativePath: pngRel } }),
    );
    try {
      expect(resolveFlyerObserverPngRelativePath({ receiptRelativePath: receiptRel })).toBe(
        pngRel,
      );
      expect(
        resolveFlyerObserverPngRelativePath({
          pngRelativePath: pngRel,
          receiptRelativePath: receiptRel,
        }),
      ).toBe(pngRel);
    } finally {
      rmSync(path.join(process.cwd(), "data", "campaign-design-artifacts", "maya-png-resolve-fixture"), {
        recursive: true,
        force: true,
      });
    }
  });

  it("does not guess when the Machine has no fact", () => {
    const answer = answerCustomerLifeQuestion("What is Tagia's favorite color?", {
      campaign: mayaCampaign(),
    });
    expect(answer.known).toBe(false);
    expect(answer.text).toBe(studioCustomerLifeV1.customerCopy.unknownFromRecord);
  });

  it("answers during production, missing materials, and after approval without contradicting phase", () => {
    const startedCampaign = withActivation(
      mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() }),
    );
    expect(
      answerCustomerLifeQuestion("Has work started?", {
        campaign: startedCampaign,
        tasks: {
          ...envelopeFor(startedCampaign),
          jobRecords: [
            {
              ...envelopeFor(startedCampaign).jobRecords![0]!,
              productionStartedAt: new Date().toISOString(),
              intakeComplete: true,
            },
          ],
        },
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.workStarted);

    const blocking: CampaignMaterialItem[] = [
      {
        id: "logo",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo",
        reason: "Needed",
        relatedServiceIds: [...FLYER],
        uploadStatus: "none",
      },
    ];
    expect(
      answerCustomerLifeQuestion("Is anything holding it up?", {
        campaign: withActivation(
          mayaCampaign({
            projectDetailsSubmittedAt: new Date().toISOString(),
            materialsSummary: { blockingRequiredCount: 1, updatedAt: new Date().toISOString() },
          }),
        ),
        materials: blocking,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.holdingMaterials);
  });

  it("classifies Maya's ordinary journey questions instead of treating them as unknown", () => {
    const questions: Record<string, string> = {
      "Did my payment go through?": "payment",
      "Do you need anything else from me?": "need_anything",
      "Did you receive my upload?": "received_upload",
      "Did you receive my file?": "received_upload",
      "Has work started?": "work_started",
      "Has work started yet?": "work_started",
      "What is happening with my flyer?": "flyer_status",
      "What is happening with my project?": "flyer_status",
      "Is anything holding it up?": "holding_up",
      "When can I review it?": "when_review",
      "When will I be able to review it?": "when_review",
      "Is my flyer ready for me to review?": "when_review",
      "Did you make my requested change?": "revision_applied",
      "Which version am I looking at?": "current_review_version",
      "Can I ask for changes?": "can_changes",
      "Can I make changes after I see it?": "can_changes",
      "Has production been assigned?": "production_assigned",
      "Has QA happened?": "qa_status",
      "How many changes do I have left?": "revisions_left",
      "Did you receive my revision?": "received_revision",
      "Is the new version ready?": "new_version_ready",
      "Which version did I approve?": "which_version_approved",
      "Did you keep my approval?": "which_version_approved",
      "Where are my final files?": "final_files",
    };
    for (const [question, intent] of Object.entries(questions)) {
      expect(classifyCustomerLifeQuestion(question), question).toBe(intent);
    }
  });

  it("keeps an upload on the ledger, rejects a duplicate submit visibly, and does not call rejected files approved", () => {
    const client = {
      id: "maya-brooks",
      email: "maya@cedarandbloom.test",
      displayName: "Maya Brooks",
      roles: ["client"] as const,
      currentCampaignId: "maya-life",
    };
    const photo: CampaignMaterialItem = {
      id: "photo-optional",
      category: "photo-video",
      requirementLevel: "optional",
      reviewStatus: "missing",
      contentKind: "file-metadata",
      label: "Optional photo",
      reason: "Maya can send a photo if she has one.",
      relatedServiceIds: [...FLYER],
      uploadStatus: "none",
    };
    const envelope = {
      campaignId: "maya-life",
      items: [photo],
      updatedAt: new Date().toISOString(),
      version: 1,
      syncedAt: new Date().toISOString(),
    };
    const first = applyClientSubmitItem(
      envelope,
      photo.id,
      { fileName: "back-to-school.jpg", mimeType: "image/jpeg" },
      client,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.envelope.items[0]?.reviewStatus).toBe("submitted");
    expect(first.envelope.items[0]?.fileName).toBe("back-to-school.jpg");

    const duplicate = applyClientSubmitItem(
      first.envelope,
      photo.id,
      { fileName: "back-to-school-again.jpg", mimeType: "image/jpeg" },
      client,
    );
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error).toMatch(/not open for client submission/i);
    expect(first.envelope.items[0]?.fileName).toBe("back-to-school.jpg");

    const rejected = answerCustomerLifeQuestion("Did you receive my upload?", {
      campaign: withActivation(mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() })),
      materials: [
        {
          ...photo,
          uploadStatus: "stored",
          reviewStatus: "needs_clarification",
        },
      ],
    });
    expect(rejected.text).toBe(studioCustomerLifeV1.customerCopy.unusableMaterial);
    expect(rejected.text.toLowerCase()).not.toMatch(/approved for use yet.*flyer is done/i);
  });

  it("answers Maya during production, after QA fail, during revision, and after approval without inventing facts", () => {
    const campaign = withActivation(
      mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() }),
    );
    const producing = envelopeFor(campaign);
    producing.jobRecords![0] = {
      ...producing.jobRecords![0]!,
      productionStartedAt: new Date().toISOString(),
      intakeComplete: true,
    };
    expect(
      answerCustomerLifeQuestion("Is anything holding it up?", {
        campaign,
        tasks: producing,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.holdingProduction);

    const qaFailed = {
      ...producing,
      qaRecords: [
        {
          id: "qa-fail-1",
          campaignId: campaign.campaignId,
          taskId: "v2-rtu-flyer:qa",
          action: "qa_fail" as const,
          actorRole: "qa" as const,
          actorUserId: "studio-machine",
          actorDisplayName: "Studio Machine",
          createdAt: new Date().toISOString(),
          checks: ["machine_renderer_identity"],
        },
      ],
    };
    const qaTruth = assembleCustomerLifeTruth({ campaign, tasks: qaFailed });
    expect(qaTruth.stalls.some((stall) => stall.id === "qa_failed_unresolved")).toBe(true);
    expect(qaTruth.stalls.every((stall) => stall.recoveryClass !== "true_owner_decision")).toBe(
      true,
    );

    const revising = envelopeFor(campaign, "revision_requested");
    expect(
      answerCustomerLifeQuestion("Did you receive my revision?", {
        campaign,
        tasks: revising,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.revisionReceived);

    const approved = envelopeFor(campaign, "approved");
    approved.jobRecords![0] = {
      ...approved.jobRecords![0]!,
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "cad-maya-1",
        schemaVersion: 1,
        packageId: "pkg",
        jobId: approved.jobRecords![0]!.jobId,
        campaignId: campaign.campaignId,
        skuId: "v2-rtu-flyer",
        workVersionId: "flyer-v1",
        artifactIds: ["flyer-v1"],
        contentSha256s: ["sha256:maya-approved"],
        qaRecordIds: ["qa-1"],
        reviewPackageId: "rev-pkg",
        releaseActivityId: null,
        approvedAt: new Date().toISOString(),
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "qa-1",
      },
    };
    const which = answerCustomerLifeQuestion("Which version did I approve?", {
      campaign,
      tasks: approved,
    });
    expect(which.text).toMatch(/flyer-v1/);
    expect(which.text).toMatch(/sha256:maya-approved/);
    expect(
      answerCustomerLifeQuestion("Where are my final files?", {
        campaign,
        tasks: envelopeFor(campaign, "delivered"),
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.finalReady);
  });

  it("reopens Review after a new Machine flyer identity following a revision request", () => {
    const campaign = withActivation(
      mayaCampaign({ projectDetailsSubmittedAt: new Date().toISOString() }),
    );
    const first = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: envelopeFor(campaign, "building_concepts"),
      pngContentSha256: "abc123",
      renderVersion: 1,
      artifactId: "flyer-v1",
      designEvidence: designEvidence(),
    });
    expect(first.envelope.jobCommunicationRecords?.some((row) => row.eventType === "ready_for_review")).toBe(
      true,
    );
    const revisedEnvelope = {
      ...first.envelope,
      jobRecords: (first.envelope.jobRecords ?? []).map((job) => ({
        ...job,
        spineStatus: "revision_requested" as const,
        productionStartedAt: undefined,
        internalQaReviewAuthorization: undefined,
      })),
    };
    const second = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: revisedEnvelope,
      pngContentSha256: "def456",
      renderVersion: 2,
      artifactId: "flyer-v2",
      designEvidence: designEvidence(),
    });
    expect(second.envelope.jobRecords?.[0]?.spineStatus).toBe("ready_for_review");
    expect(
      second.envelope.jobCommunicationRecords?.some((row) => row.eventType === "revision_ready_again"),
    ).toBe(true);
    expect(
      answerCustomerLifeQuestion("Is the new version ready?", {
        campaign,
        tasks: second.envelope,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.newVersionReady);

    expect(
      answerCustomerLifeQuestion("Did you receive my revision?", {
        campaign: { ...campaign, revisionRoundsUsed: 1, revisionRoundsIncluded: 1 },
        tasks: second.envelope,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.revisionReceived);
  });

  it("blocks a second revision round for Maya's one-round flyer and reports zero remaining", () => {
    const campaign = mayaCampaign({
      projectDetailsSubmittedAt: new Date().toISOString(),
      revisionRoundsUsed: 1,
      revisionRoundsIncluded: 1,
    });
    const left = answerCustomerLifeQuestion("How many changes do I have left?", {
      campaign,
      tasks: envelopeFor(campaign),
    });
    expect(left.text).toMatch(/no remaining revision rounds of the 1 included/);

    const job = envelopeFor(campaign, "ready_for_review").jobRecords![0]!;
    const feedback = createEmptyJobReviewFeedback(campaign.campaignId, job.jobId, [
      "deliverable-0",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";
    const blocked = canRequestJobRevision({
      job: { ...job, spineStatus: "ready_for_review" },
      feedback,
      revisionRoundsRemaining: 0,
      allDeliverablesPrepared: true,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons.some((reason) => /included correction/i.test(reason))).toBe(true);
  });

  it("answers Review version and applied-change questions from the Machine record", () => {
    const campaign = withActivation(
      mayaCampaign({
        projectDetailsSubmittedAt: new Date().toISOString(),
        machineFlyerRevisionEmphasis: {
          packageId: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
          instruction: "Please make Book Your Reset more prominent as the headline.",
          emphasizeExistingCtaAsHeadline: true,
          sourceRevisionPackageId: "pkg:maya:rev",
          priorWorkVersionId: "flyer-v1",
          recordedAt: new Date().toISOString(),
        },
      }),
    );
    const first = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: envelopeFor(campaign, "building_concepts"),
      pngContentSha256: "abc123",
      renderVersion: 1,
      artifactId: "flyer-v1",
      designEvidence: designEvidence(),
    });
    const waiting = answerCustomerLifeQuestion("Did you make my requested change?", {
      campaign,
      tasks: {
        ...first.envelope,
        jobRecords: (first.envelope.jobRecords ?? []).map((job) => ({
          ...job,
          spineStatus: "revision_requested" as const,
        })),
      },
    });
    expect(waiting.intent).toBe("revision_applied");
    expect(waiting.text).toMatch(/received your revision request/i);

    const second = bindFlyerIdentityToQaRecords({
      campaign,
      envelope: {
        ...first.envelope,
        jobRecords: (first.envelope.jobRecords ?? []).map((job) => ({
          ...job,
          spineStatus: "revision_requested" as const,
          internalQaReviewAuthorization: undefined,
        })),
      },
      pngContentSha256: "def456",
      renderVersion: 2,
      artifactId: "flyer-v2",
      designEvidence: designEvidence(),
    });
    expect(
      answerCustomerLifeQuestion("Did you make my requested change?", {
        campaign,
        tasks: second.envelope,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.revisionApplied);
    expect(
      answerCustomerLifeQuestion("Which version am I looking at?", {
        campaign,
        tasks: second.envelope,
      }).text,
    ).toMatch(/Version 2/);
    expect(
      answerCustomerLifeQuestion("Is my flyer ready for me to review?", {
        campaign,
        tasks: second.envelope,
      }).text,
    ).toBe(studioCustomerLifeV1.customerCopy.reviewReady);
  });

  it("classifies silent stalls without making Tagia the restart button", () => {
    const campaign = withActivation(
      mayaCampaign({
        projectDetailsSubmittedAt: new Date().toISOString(),
        dispatchExecution: {
          schemaVersion: 1,
          evaluatedAt: new Date().toISOString(),
          ownerRoutineProduction: "NONE",
          records: [],
          designRendererObserver: {
            packageId: "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1",
            observedAt: new Date().toISOString(),
            campaignId: "maya-life",
            results: [
              {
                dispatchId: "d1",
                skuId: "v2-rtu-flyer",
                action: "invoked",
                ok: true,
                ownerRoutineProduction: "NONE",
                canvaRequired: false,
                makeRequired: false,
              },
            ],
            ownerRoutineProduction: "NONE",
            canvaRequired: false,
            makeRequired: false,
          },
        } as never,
      }),
    );
    const truth = assembleCustomerLifeTruth({
      campaign,
      materials: [
        {
          id: "logo",
          category: "logo-brand",
          requirementLevel: "required",
          reviewStatus: "submitted",
          contentKind: "file-metadata",
          label: "Logo",
          reason: "Needed",
          relatedServiceIds: [...FLYER],
          uploadStatus: "stored",
        },
      ],
    });
    expect(truth.stalls.some((stall) => stall.id === "tool_success_no_artifact")).toBe(true);
    expect(truth.stalls.some((stall) => stall.id === "upload_awaiting_team_review")).toBe(true);
    expect(truth.ownerActionRequired).toBe(false);
  });
});
