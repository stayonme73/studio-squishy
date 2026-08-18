import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { buildJobId } from "@/lib/job-control/lane-map";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import {
  canApproveJobForDelivery,
  canRequestJobRevision,
  clientRevisionRoundRequiresReserveHandling,
  clientRevisionRoundWouldExceed,
} from "@/lib/job-control/review-room-gates";
import { canClientAccessJobReview, canClientViewJobReview } from "@/lib/job-control/review-room-access";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { releaseMessageRef } from "@/lib/job-control/review-handoff-receipts";

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "review-v1",
    campaignName: "Review V1 Demo",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "July 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 30000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 30000,
      lineItems: [
        {
          skuId: "sm-001",
          serviceId: "sm-001",
          serviceName: "Social Launch",
          billingType: "one_time",
          exactPriceCents: 30000,
          priceDisplay: "$300",
          deliverables: ["Post concepts", "Caption copy"],
          exclusions: [],
          timingWindowLabel: "3–5 days",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "Studio",
        },
      ],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  } as CampaignRecord;
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  const now = "2026-07-03T12:00:00.000Z";
  return {
    jobId: buildJobId("review-v1", "sm-001"),
    campaignId: "review-v1",
    skuId: "sm-001",
    serviceName: "Social Launch",
    spineStatus: "ready_for_review",
    productionLane: "quick",
    intakeComplete: true,
    deliverablePrep: [
      { deliverableKey: "deliverable-0", label: "Post concepts", preparedAt: now },
      { deliverableKey: "deliverable-1", label: "Caption copy", preparedAt: now },
    ],
    internalQaReviewAuthorization: {
      status: "ELIGIBLE_FOR_REVIEW",
      decisionId: "re-test",
      packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
      skuId: "sm-001",
      qaRecordIds: ["qa-sm-001"],
      workVersionId: null,
      contentSha256s: [],
      artifactIds: [],
      authorizedAt: now,
    },
    laneQueuedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function envelope(jobRecord: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: "review-v1",
    tasks: [
      {
        id: "sm-001:strategy",
        title: "Strategy",
        phase: "strategy",
        status: "in_progress",
        relatedServiceIds: ["sm-001"],
        familyId: "social",
        catalogFamilyId: "social_media",
        serviceName: "sm-001",
        dependsOn: [],
        workflowState: "in_progress",
      },
    ],
    planFingerprint: "sm-001",
    updatedAt: "2026-07-03T12:00:00.000Z",
    version: 8,
    jobRecords: [jobRecord],
    jobActivityEvents: [],
    jobReviewFeedback: [],
  };
}

const clientUser = {
  id: "client-verify",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"] as const,
  currentCampaignId: "review-v1",
};

const staffUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"] as const,
};

function envelopeWithStudioRelease(jobRecord: PurchasedJobRecord): ServerTasksEnvelope {
  const base = envelope(jobRecord);
  return {
    ...base,
    jobActivityEvents: [
      {
        id: "status_change:release-1",
        campaignId: jobRecord.campaignId,
        jobId: jobRecord.jobId,
        kind: "status_change",
        occurredAt: "2026-07-03T11:00:00.000Z",
        actor: { role: "staff", userId: "prod-1", displayName: "Production" },
        spineStatus: "ready_for_review",
        reason: "Production submitted client-ready work to Review Room",
      },
    ],
  };
}

describe("review-room access", () => {
  it("allows only ready_for_review with internal QA authorization and no owner gate pending", () => {
    expect(canClientAccessJobReview({ spineStatus: "ready_for_review" })).toBe(false);
    expect(
      canClientAccessJobReview({
        spineStatus: "ready_for_review",
        internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
      }),
    ).toBe(true);
    expect(
      canClientAccessJobReview({
        spineStatus: "ready_for_review",
        ownerApprovalPending: "before_review",
        internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
      }),
    ).toBe(false);
    expect(canClientAccessJobReview({ spineStatus: "building_concepts" })).toBe(false);
    expect(canClientViewJobReview({ spineStatus: "building_concepts" }, null)).toBe(false);
  });

  it("keeps Review Room closed to customer artifacts when only the sidebar can be seen", () => {
    expect(
      canClientAccessJobReview({
        spineStatus: "building_concepts",
        internalQaReviewAuthorization: null,
      }),
    ).toBe(false);
    expect(
      canClientViewJobReview(
        { spineStatus: "building_concepts" },
        null,
      ),
    ).toBe(false);
  });

  it("allows read-only view of submitted packages after spine leaves ready_for_review", () => {
    const submitted = createEmptyJobReviewFeedback("review-v1", "job-1", ["d0"]);
    submitted.submittedAt = "2026-07-03T13:00:00.000Z";
    submitted.submissionType = "revision_requested";
    expect(
      canClientViewJobReview({ spineStatus: "revision_requested" }, submitted),
    ).toBe(true);
    expect(canClientViewJobReview({ spineStatus: "revision_requested" }, null)).toBe(
      false,
    );
  });
});

describe("review-room gates", () => {
  it("blocks approval when deliverables undecided", () => {
    const feedback = createEmptyJobReviewFeedback("review-v1", job().jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    const result = canApproveJobForDelivery({
      job: job(),
      feedback,
      allDeliverablesPrepared: true,
      deliverableCount: 2,
    });
    expect(result.allowed).toBe(false);
  });

  it("detects revision limit exhaustion helpers", () => {
    expect(clientRevisionRoundWouldExceed(1, 1)).toBe(true);
    expect(clientRevisionRoundWouldExceed(0, 1)).toBe(false);
    // C8c — reserve free rounds removed; purchased allowance is authority.
    expect(clientRevisionRoundRequiresReserveHandling(3)).toBe(false);
  });

  it("blocks request_revision when remaining is zero", () => {
    const feedback = createEmptyJobReviewFeedback("review-v1", job().jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";
    const result = canRequestJobRevision({
      job: job(),
      feedback,
      revisionRoundsRemaining: 0,
      allDeliverablesPrepared: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((reason) => /included revision/i.test(reason))).toBe(
      true,
    );
  });
});

describe("review-room actions", () => {
  it("persists sticky and section feedback", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";
    feedback.stickyNotes.push({
      id: "sticky-1",
      deliverableKey: "deliverable-0",
      color: "coral",
      text: "Adjust headline",
      createdAt: "2026-07-03T12:00:00.000Z",
    });

    const result = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign(),
      jobRecord,
      { action: "save_feedback", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.jobReviewFeedback?.[0]?.stickyNotes).toHaveLength(1);
    }
  });

  it("transitions to revision_requested with feedback", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";
    feedback.stickyNotes.push({
      id: "sticky-1",
      deliverableKey: "deliverable-0",
      color: "coral",
      text: "Revise hero",
      createdAt: "2026-07-03T12:00:00.000Z",
    });

    const result = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign(),
      jobRecord,
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.spineStatus).toBe("revision_requested");
      expect(result.feedback.submissionType).toBe("revision_requested");
      expect(result.updatedCampaign?.revisionRoundsUsed).toBe(1);
    }
  });

  it("transitions to approved for delivery", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "approved";
    feedback.sectionStatuses["deliverable-1"] = "skip";

    const result = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign(),
      jobRecord,
      { action: "approve_for_delivery", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.spineStatus).toBe("approved");
      // Routine approve does not create an Owner release hold.
      expect(result.job.ownerApprovalPending).toBeNull();
      expect(result.job.customerApprovedArtifactAuthorization?.status).toBe(
        "CUSTOMER_APPROVED",
      );
      expect(result.job.customerApprovedArtifactAuthorization?.sourceQaDecisionId).toBe(
        "re-test",
      );
    }
  });

  it("creates one ledger use on formal revision and rejects when exhausted", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";

    const first = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign({ revisionRoundsIncluded: 1, revisionRoundsUsed: 0 }),
      jobRecord,
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );

    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.correctionUseCreated).toBe(true);
    expect(first.envelope.jobCorrectionUses).toHaveLength(1);
    expect(first.updatedCampaign?.revisionRoundsUsed).toBe(1);

    const secondFeedback = createEmptyJobReviewFeedback(
      "review-v1",
      jobRecord.jobId,
      ["deliverable-0", "deliverable-1"],
      { packageId: "pkg:second-cycle" },
    );
    secondFeedback.sectionStatuses["deliverable-0"] = "revision";

    const second = applyReviewRoomPatch(
      {
        ...first.envelope,
        jobRecords: [{ ...first.job, spineStatus: "ready_for_review" }],
      },
      first.updatedCampaign ?? campaign({ revisionRoundsIncluded: 1 }),
      { ...first.job, spineStatus: "ready_for_review" },
      { action: "request_revision", feedback: secondFeedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.revisionLimitReached).toBe(true);
    }
  });

  it("does not consume on draft save or approval", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "approved";
    feedback.sectionStatuses["deliverable-1"] = "skip";
    feedback.highlights = [
      {
        id: "hl:test",
        jobId: jobRecord.jobId,
        deliverableKey: "deliverable-0",
        proofFileId: "proof:1",
        versionLabel: "v1",
        surface: "proof_markup_board_v1",
        rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-01T12:00:00.000Z",
      },
    ];
    feedback.textComments = [
      {
        id: "tc:test",
        jobId: jobRecord.jobId,
        deliverableKey: "deliverable-0",
        proofFileId: "proof:1",
        versionLabel: "v1",
        text: "Tighten the headline on this proof version.",
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-01T12:00:00.000Z",
      },
    ];

    const saved = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign(),
      jobRecord,
      { action: "save_feedback", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.envelope.jobCorrectionUses ?? []).toHaveLength(0);
      const stored = saved.envelope.jobReviewFeedback?.find(
        (entry) => entry.jobId === jobRecord.jobId && !entry.submittedAt,
      );
      expect(stored?.highlights).toHaveLength(1);
      expect(stored?.textComments).toHaveLength(1);
    }

    const approved = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign(),
      jobRecord,
      { action: "approve_for_delivery", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(approved.ok).toBe(true);
    if (approved.ok) {
      expect(approved.envelope.jobCorrectionUses ?? []).toHaveLength(0);
    }
  });

  it("preserves prior locked package when a new draft cycle begins", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";

    const first = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign({ revisionRoundsIncluded: 2 }),
      jobRecord,
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const secondDraft = createEmptyJobReviewFeedback(
      "review-v1",
      jobRecord.jobId,
      ["deliverable-0", "deliverable-1"],
      { packageId: "pkg:cycle-2" },
    );
    secondDraft.sectionStatuses["deliverable-0"] = "revision";

    const saved = applyReviewRoomPatch(
      {
        ...first.envelope,
        jobRecords: [{ ...jobRecord, spineStatus: "ready_for_review" }],
      },
      first.updatedCampaign ?? campaign({ revisionRoundsIncluded: 2 }),
      { ...jobRecord, spineStatus: "ready_for_review" },
      { action: "save_feedback", feedback: secondDraft },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    const packages = saved.envelope.jobReviewFeedback ?? [];
    expect(packages.filter((entry) => entry.submittedAt)).toHaveLength(1);
    expect(packages.filter((entry) => !entry.submittedAt)).toHaveLength(1);
  });

  it("rejects exhausted included rounds without silent reserve", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";

    const result = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign({ revisionRoundsIncluded: 1, revisionRoundsUsed: 1 }),
      jobRecord,
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.revisionLimitReached).toBe(true);
      expect(result.error).toMatch(/included revision/i);
    }
  });

  it("snapshots write-once allowance from frozen plan when campaign field is unset", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";

    const frozenPlanCampaign = campaign({
      revisionRoundsIncluded: undefined,
      revisionRoundsUsed: 0,
      approvedStudioPlan: {
        selectedServiceIds: ["sm-001"],
        includedServiceIds: ["sm-001"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 30000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 30000,
        lineItems: [
          {
            skuId: "sm-001",
            serviceId: "sm-001",
            serviceName: "Social Launch",
            billingType: "one_time",
            exactPriceCents: 30000,
            priceDisplay: "$300",
            deliverables: ["Post concepts", "Caption copy"],
            exclusions: [],
            timingWindowLabel: "3–5 days",
            revisionRule: "2 rounds",
            clientResponsibilities: [],
            executionResponsibility: "Studio",
          },
        ],
        approvedAt: "2026-07-01T09:00:00.000Z",
      },
    });

    const result = applyReviewRoomPatch(
      envelope(jobRecord),
      frozenPlanCampaign,
      jobRecord,
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updatedCampaign?.revisionRoundsIncluded).toBe(2);
      expect(result.updatedCampaign?.revisionRoundsIncludedSource).toBe(
        "approved_plan",
      );
      expect(result.envelope.jobCorrectionUses).toHaveLength(1);
    }
  });

  it("idempotent packageId does not create a second ledger row", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "revision";

    const first = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign({ revisionRoundsIncluded: 2 }),
      jobRecord,
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const retry = applyReviewRoomPatch(
      first.envelope,
      first.updatedCampaign ?? campaign({ revisionRoundsIncluded: 2 }),
      { ...jobRecord, spineStatus: "ready_for_review" },
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(retry.ok).toBe(true);
    if (retry.ok) {
      expect(retry.correctionUseCreated).toBe(false);
      expect(retry.envelope.jobCorrectionUses).toHaveLength(1);
    }
  });

  it("records authorized customer receipt once per Studio release", () => {
    const jobRecord = job();
    const first = applyReviewRoomPatch(
      envelopeWithStudioRelease(jobRecord),
      campaign(),
      jobRecord,
      { action: "acknowledge_review_received" },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const received = first.envelope.jobActivityEvents?.filter(
      (event) => event.kind === "client_review_received",
    );
    expect(received).toHaveLength(1);
    expect(received?.[0]?.messageRef).toBe(releaseMessageRef("status_change:release-1"));
    expect(received?.[0]?.actor.userId).toBe(clientUser.id);

    const second = applyReviewRoomPatch(
      first.envelope,
      campaign(),
      jobRecord,
      { action: "acknowledge_review_received" },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(
      second.envelope.jobActivityEvents?.filter(
        (event) => event.kind === "client_review_received",
      ),
    ).toHaveLength(1);
  });

  it("rejects staff acknowledgment of customer receipt", () => {
    const jobRecord = job();
    const result = applyReviewRoomPatch(
      envelopeWithStudioRelease(jobRecord),
      campaign(),
      jobRecord,
      { action: "acknowledge_review_received" },
      staffUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("blocks a second formal submission after submittedAt is set", () => {
    const jobRecord = job();
    const feedback = createEmptyJobReviewFeedback("review-v1", jobRecord.jobId, [
      "deliverable-0",
      "deliverable-1",
    ]);
    feedback.sectionStatuses["deliverable-0"] = "approved";
    feedback.sectionStatuses["deliverable-1"] = "approved";

    const approved = applyReviewRoomPatch(
      envelope(jobRecord),
      campaign(),
      jobRecord,
      { action: "approve_for_delivery", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const again = applyReviewRoomPatch(
      approved.envelope,
      campaign(),
      approved.job,
      { action: "approve_for_delivery", feedback: approved.feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(again.ok).toBe(false);

    const saveBlocked = applyReviewRoomPatch(
      approved.envelope,
      campaign(),
      job(),
      { action: "save_feedback", feedback: approved.feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(saveBlocked.ok).toBe(false);
    if (!saveBlocked.ok) {
      expect(saveBlocked.error).toMatch(/locked feedback|already submitted/i);
    }
  });
});

describe("job record sync preserves deliverable prep", () => {
  it("keeps deliverablePrep through syncJobRecordsFromCampaign", async () => {
    const { syncJobRecordsFromCampaign } = await import("@/lib/job-control/resolve-jobs");
    const jobRecord = job();
    const synced = syncJobRecordsFromCampaign(
      campaign(),
      [],
      [],
      [],
      [jobRecord],
    );
    expect(synced[0]?.deliverablePrep).toHaveLength(2);
  });
});
