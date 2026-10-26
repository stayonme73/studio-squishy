/**
 * STUDIO-OPERATING-REVISION-TO-REVIEW-ROUND-TRIP-CERTIFICATION-1
 *
 * Owner call 2026-09-15: a revision round is spent when the revised work reaches
 * the customer in Review — not when they ask for it. If the Studio rejects its own
 * revised work, the customer keeps the round, the Owner is asked to look, and the
 * customer is told what happened.
 *
 * These tests use controlled fixtures on purpose. They certify entitlement
 * integrity and honest failure, which must hold regardless of whether the
 * composer manages to produce a good artifact.
 */

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioRevisionToReviewRoundTripV1 } from "@/config/studio-revision-to-review-round-trip-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  buildCorrectionUseRecord,
  correctionUseReachedReview,
  deriveCorrectionAccounting,
  syncRevisionRoundsUsedMirror,
} from "@/lib/job-control/correction-round-ledger";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { canRequestJobRevision } from "@/lib/job-control/review-room-gates";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { escalateRevisionReworkToOwner } from "@/lib/job-control/revision-rework-escalation";
import type { JobActivityEvent, PurchasedJobRecord } from "@/lib/job-control/types";
import {
  evaluateLifecycleWatchdogFindings,
  recoverMissingAuthorizedNotices,
} from "@/lib/studio-lifecycle-email/watchdog-gaps";

const CAMPAIGN_ID = "rrt-1";
const JOB_ID = "rrt-1:v2-rtu-flyer";
const FIRST_REVIEW_AT = "2026-09-15T10:00:00.000Z";
const REQUESTED_AT = "2026-09-15T11:00:00.000Z";
const PRODUCED_AT = "2026-09-15T12:00:00.000Z";

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Maya launch flyer",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "",
    estimatedCompletion: "September 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-09-14T10:00:00.000Z",
    revisionRoundsIncluded: 1,
    revisionRoundsIncludedSource: "campaign_field",
    revisionRoundsUsed: 0,
    createdAt: "2026-09-14T09:00:00.000Z",
    updatedAt: FIRST_REVIEW_AT,
    ...overrides,
  } as CampaignRecord;
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    spineStatus: "revision_requested",
    productionLane: "quick",
    intakeComplete: true,
    deliverablePrep: [
      { deliverableKey: "deliverable-0", label: "Flyer", preparedAt: FIRST_REVIEW_AT },
    ],
    laneQueuedAt: FIRST_REVIEW_AT,
    updatedAt: PRODUCED_AT,
    ...overrides,
  } as PurchasedJobRecord;
}

function statusEvent(
  spineStatus: PurchasedJobRecord["spineStatus"],
  occurredAt: string,
): JobActivityEvent {
  return {
    id: `evt:${spineStatus}:${occurredAt}`,
    campaignId: CAMPAIGN_ID,
    jobId: JOB_ID,
    kind: "status_change",
    occurredAt,
    actor: { role: "system", displayName: "Studio Machine" },
    spineStatus,
    reason: "test",
  };
}

function revisionRequest(submittedAt = REQUESTED_AT) {
  const feedback = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, ["deliverable-0"]);
  feedback.sectionStatuses["deliverable-0"] = "revision";
  return buildCorrectionUseRecord({
    campaignId: CAMPAIGN_ID,
    jobId: JOB_ID,
    packageId: `pkg-${submittedAt}`,
    submittedAt,
    releaseActivityId: null,
    versionLabel: "Version 1",
    actor: { role: "client", userId: "maya", displayName: "Maya" },
    occurredAt: submittedAt,
    ordinal: 1,
    consumptionKind: "included",
    feedback,
  });
}

function envelope(overrides: Partial<ServerTasksEnvelope> = {}): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    tasks: [],
    planFingerprint: "fp",
    updatedAt: PRODUCED_AT,
    version: 12,
    syncedAt: PRODUCED_AT,
    jobRecords: [job()],
    jobActivityEvents: [statusEvent("ready_for_review", FIRST_REVIEW_AT)],
    jobCorrectionUses: [],
    jobCorrectionExtraGrants: [],
    jobReviewFeedback: [],
    jobCommunicationRecords: [],
    qaRecords: [],
    ...overrides,
  };
}

/** Requested, produced, and rejected internally — Review never reopened. */
function strandedEnvelope(): ServerTasksEnvelope {
  return envelope({
    jobCorrectionUses: [revisionRequest()],
    jobActivityEvents: [
      statusEvent("ready_for_review", FIRST_REVIEW_AT),
      statusEvent("revision_requested", REQUESTED_AT),
    ],
    qaRecords: [
      {
        id: "qa-1",
        campaignId: CAMPAIGN_ID,
        taskId: "v2-rtu-flyer:qa",
        action: "qa_pass",
        createdAt: FIRST_REVIEW_AT,
      },
      {
        id: "qa-2",
        campaignId: CAMPAIGN_ID,
        taskId: "v2-rtu-flyer:qa",
        action: "qa_fail",
        createdAt: PRODUCED_AT,
      },
    ] as ServerTasksEnvelope["qaRecords"],
  });
}

describe("revision entitlement is spent on delivery, not on request", () => {
  it("does not charge the round when the customer asks", () => {
    const accounting = deriveCorrectionAccounting({
      campaign: campaign(),
      envelope: envelope({
        jobCorrectionUses: [revisionRequest()],
        jobActivityEvents: [
          statusEvent("ready_for_review", FIRST_REVIEW_AT),
          statusEvent("revision_requested", REQUESTED_AT),
        ],
      }),
    });

    expect(accounting.requested).toBe(1);
    expect(accounting.used).toBe(0);
    expect(accounting.remaining).toBe(1);
    expect(accounting.exhausted).toBe(false);
    expect(accounting.pending).toHaveLength(1);
  });

  it("charges the round once the revised work reaches Review", () => {
    const accounting = deriveCorrectionAccounting({
      campaign: campaign(),
      envelope: envelope({
        jobCorrectionUses: [revisionRequest()],
        jobActivityEvents: [
          statusEvent("ready_for_review", FIRST_REVIEW_AT),
          statusEvent("revision_requested", REQUESTED_AT),
          statusEvent("ready_for_review", PRODUCED_AT),
        ],
      }),
    });

    expect(accounting.used).toBe(1);
    expect(accounting.remaining).toBe(0);
    expect(accounting.exhausted).toBe(true);
    expect(accounting.pending).toHaveLength(0);
  });

  it("counts one delivered revision once, not once per later status change", () => {
    const accounting = deriveCorrectionAccounting({
      campaign: campaign(),
      envelope: envelope({
        jobCorrectionUses: [revisionRequest()],
        jobActivityEvents: [
          statusEvent("ready_for_review", FIRST_REVIEW_AT),
          statusEvent("revision_requested", REQUESTED_AT),
          statusEvent("ready_for_review", PRODUCED_AT),
          statusEvent("approved", "2026-09-15T13:00:00.000Z"),
          statusEvent("delivered", "2026-09-15T14:00:00.000Z"),
        ],
      }),
    });

    expect(accounting.requested).toBe(1);
    expect(accounting.used).toBe(1);
  });

  it("treats a job with no recorded spine history as consumed so nothing is given away", () => {
    const use = revisionRequest();
    expect(correctionUseReachedReview([], use)).toBe(true);
    expect(
      studioRevisionToReviewRoundTripV1.unprovableHistoryCountsAsConsumed,
    ).toBe(true);

    const accounting = deriveCorrectionAccounting({
      campaign: campaign(),
      envelope: envelope({
        jobCorrectionUses: [use],
        jobActivityEvents: [],
      }),
    });
    expect(accounting.used).toBe(1);
    expect(accounting.remaining).toBe(0);
  });

  it("leaves a campaign that never had a ledger on its legacy counter", () => {
    const accounting = deriveCorrectionAccounting({
      campaign: campaign({ revisionRoundsUsed: 1 }),
      envelope: envelope({ jobCorrectionUses: [] }),
    });

    expect(accounting.provisionalLegacyUsed).toBe(1);
    expect(accounting.remaining).toBe(0);
  });

  it("keeps the compatibility counter equal to proven consumption", () => {
    const pendingEnvelope = strandedEnvelope();
    const asked = syncRevisionRoundsUsedMirror(
      campaign({ revisionRoundsUsed: 1 }),
      pendingEnvelope,
    );
    expect(asked.changed).toBe(true);
    expect(asked.campaign.revisionRoundsUsed).toBe(0);

    const delivered = syncRevisionRoundsUsedMirror(
      campaign({ revisionRoundsUsed: 0 }),
      envelope({
        jobCorrectionUses: [revisionRequest()],
        jobActivityEvents: [
          statusEvent("revision_requested", REQUESTED_AT),
          statusEvent("ready_for_review", PRODUCED_AT),
        ],
      }),
    );
    expect(delivered.changed).toBe(true);
    expect(delivered.campaign.revisionRoundsUsed).toBe(1);
  });

  it("never zeroes a legacy counter that has no ledger to derive from", () => {
    const result = syncRevisionRoundsUsedMirror(
      campaign({ revisionRoundsUsed: 1 }),
      envelope({ jobCorrectionUses: [] }),
    );
    expect(result.changed).toBe(false);
    expect(result.campaign.revisionRoundsUsed).toBe(1);
  });
});

describe("a second request cannot stack while one is in flight", () => {
  it("blocks the ask and says why, even though the round is unspent", () => {
    const gate = canRequestJobRevision({
      job: job({ spineStatus: "ready_for_review" }),
      feedback: (() => {
        const feedback = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, [
          "deliverable-0",
        ]);
        feedback.sectionStatuses["deliverable-0"] = "revision";
        return feedback;
      })(),
      revisionRoundsRemaining: 1,
      allDeliverablesPrepared: true,
      revisionInFlight: true,
    });

    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain(
      studioRevisionToReviewRoundTripV1.customerCopy.revisionAlreadyInFlight,
    );
  });
});

describe("internal rejection is escalated, not swallowed", () => {
  it("asks the Owner to look and tells the customer the truth", () => {
    const result = escalateRevisionReworkToOwner({
      campaign: campaign(),
      envelope: strandedEnvelope(),
      job: job(),
      clientUserId: "maya",
      occurredAt: PRODUCED_AT,
    });

    expect(result.escalated).toBe(true);
    expect(result.job.ownerApprovalPending).toBeNull();
    expect(result.job.internalQaReviewAuthorization).toBeUndefined();

    const notice = (result.envelope.jobCommunicationRecords ?? []).find(
      (record) => record.eventType === "revision_rework_in_progress",
    );
    expect(notice).toBeDefined();
    expect(notice?.messageContent).toContain("not been counted");
    // Silence is the defect — this notice must not wait on an Owner send chore.
    expect(notice?.deliveryStatus).toBe("sent");
  });

  it("keeps Review closed after flyer remint fail-closed", () => {
    const result = escalateRevisionReworkToOwner({
      campaign: campaign(),
      envelope: strandedEnvelope(),
      job: job({
        spineStatus: "ready_for_review",
        internalQaReviewAuthorization: {
          status: "ELIGIBLE_FOR_REVIEW",
          decisionId: "stale",
          packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
          skuId: "v2-rtu-flyer",
          qaRecordIds: [],
          workVersionId: null,
          contentSha256s: [],
          artifactIds: [],
          authorizedAt: FIRST_REVIEW_AT,
        },
      }),
    });

    expect(canClientAccessJobReview(result.job)).toBe(false);
  });

  it("does not spend the round it escalated about", () => {
    const result = escalateRevisionReworkToOwner({
      campaign: campaign(),
      envelope: strandedEnvelope(),
      job: job(),
    });

    const accounting = deriveCorrectionAccounting({
      campaign: campaign(),
      envelope: result.envelope,
    });
    expect(accounting.used).toBe(0);
    expect(accounting.remaining).toBe(1);
  });

  it("notifies once, not on every internal attempt", () => {
    const first = escalateRevisionReworkToOwner({
      campaign: campaign(),
      envelope: strandedEnvelope(),
      job: job(),
    });
    const second = escalateRevisionReworkToOwner({
      campaign: campaign(),
      envelope: first.envelope,
      job: first.job,
    });

    expect(second.escalated).toBe(false);
    const notices = (second.envelope.jobCommunicationRecords ?? []).filter(
      (record) => record.eventType === "revision_rework_in_progress",
    );
    expect(notices).toHaveLength(1);
  });

  it("stays quiet when no customer is waiting on a revision", () => {
    const result = escalateRevisionReworkToOwner({
      campaign: campaign(),
      envelope: envelope({ jobCorrectionUses: [] }),
      job: job({ spineStatus: "building_concepts" }),
    });

    expect(result.escalated).toBe(false);
    expect(result.job.ownerApprovalPending).toBeUndefined();
    expect(result.envelope.jobCommunicationRecords ?? []).toHaveLength(0);
  });
});

describe("the watchdog catches a stranded revision", () => {
  it("reports the missing explanation", () => {
    const findings = evaluateLifecycleWatchdogFindings({
      campaign: campaign(),
      envelope: strandedEnvelope(),
    });

    expect(
      findings.some(
        (finding) =>
          finding.kind === "expected_notice_missing" &&
          finding.eventType === "revision_rework_in_progress",
      ),
    ).toBe(true);
  });

  it("repairs it on wake", () => {
    const recovered = recoverMissingAuthorizedNotices({
      campaign: campaign(),
      envelope: strandedEnvelope(),
      clientUserId: "maya",
    });

    expect(
      (recovered.jobCommunicationRecords ?? []).some(
        (record) => record.eventType === "revision_rework_in_progress",
      ),
    ).toBe(true);

    const findings = evaluateLifecycleWatchdogFindings({
      campaign: campaign(),
      envelope: recovered,
    });
    expect(
      findings.some(
        (finding) => finding.eventType === "revision_rework_in_progress",
      ),
    ).toBe(false);
  });

  it("does not announce work an Owner hold still keeps closed", () => {
    const held = envelope({
      jobRecords: [
        job({
          spineStatus: "ready_for_review",
          ownerApprovalPending: "before_review",
          internalQaReviewAuthorization: {
            status: "ELIGIBLE_FOR_REVIEW",
            decisionId: "re-held",
            packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
            skuId: "v2-rtu-flyer",
            qaRecordIds: [],
            workVersionId: null,
            contentSha256s: [],
            artifactIds: [],
            authorizedAt: PRODUCED_AT,
          },
        }),
      ],
    });

    const findings = evaluateLifecycleWatchdogFindings({
      campaign: campaign(),
      envelope: held,
    });
    expect(
      findings.some((finding) => finding.eventType === "ready_for_review"),
    ).toBe(false);

    const recovered = recoverMissingAuthorizedNotices({
      campaign: campaign(),
      envelope: held,
      clientUserId: "maya",
    });
    expect(
      (recovered.jobCommunicationRecords ?? []).some(
        (record) => record.eventType === "ready_for_review",
      ),
    ).toBe(false);
  });

  it("does not report a delivered revision as stranded", () => {
    const findings = evaluateLifecycleWatchdogFindings({
      campaign: campaign(),
      envelope: envelope({
        jobCorrectionUses: [revisionRequest()],
        jobActivityEvents: [
          statusEvent("revision_requested", REQUESTED_AT),
          statusEvent("ready_for_review", PRODUCED_AT),
        ],
      }),
    });

    expect(
      findings.some(
        (finding) => finding.eventType === "revision_rework_in_progress",
      ),
    ).toBe(false);
  });
});
