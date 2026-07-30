import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  appendCorrectionExtraGrant,
  appendCorrectionUseIdempotent,
  buildCorrectionUseIdempotencyKey,
  buildCorrectionUseRecord,
  deriveCorrectionAccounting,
  ensureWriteOnceRevisionAllowance,
  findCorrectionUseByPackageId,
} from "@/lib/job-control/correction-round-ledger";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "c8c-1",
    campaignName: "C8c",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "July 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
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
          deliverables: ["Post concepts"],
          exclusions: [],
          timingWindowLabel: "3–5 days",
          revisionRule: "2 rounds",
          clientResponsibilities: [],
          executionResponsibility: "Studio",
        },
      ],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    revisionRoundsUsed: 0,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  } as CampaignRecord;
}

function envelope(
  overrides: Partial<ServerTasksEnvelope> = {},
): ServerTasksEnvelope {
  return {
    campaignId: "c8c-1",
    tasks: [],
    planFingerprint: "fp",
    updatedAt: "2026-07-03T12:00:00.000Z",
    version: 12,
    syncedAt: "2026-07-03T12:00:00.000Z",
    jobCorrectionUses: [],
    jobCorrectionExtraGrants: [],
    jobReviewFeedback: [],
    ...overrides,
  };
}

describe("C8c write-once revision allowance", () => {
  it("preserves an existing campaign field and does not overwrite from live config", () => {
    const first = ensureWriteOnceRevisionAllowance(
      campaign({ revisionRoundsIncluded: 1, revisionRoundsIncludedSource: "campaign_field" }),
    );
    expect(first.included).toBe(1);
    expect(first.didSnapshot).toBe(false);

    const again = ensureWriteOnceRevisionAllowance({
      ...first.campaign,
      packageId: "growth",
    });
    expect(again.included).toBe(1);
    expect(again.campaign.revisionRoundsIncluded).toBe(1);
  });

  it("snapshots from approved plan when campaign field is absent", () => {
    const result = ensureWriteOnceRevisionAllowance(
      campaign({ revisionRoundsIncluded: undefined }),
    );
    expect(result.didSnapshot).toBe(true);
    expect(result.source).toBe("approved_plan");
    expect(result.included).toBe(2);
    expect(result.campaign.revisionRoundsIncluded).toBe(2);
  });
});

describe("C8c correction-use ledger", () => {
  it("appends one use idempotently by key and packageId", () => {
    const feedback = createEmptyJobReviewFeedback("c8c-1", "job-1", ["d0"]);
    feedback.sectionStatuses.d0 = "revision";
    const submittedAt = "2026-07-03T13:00:00.000Z";
    const record = buildCorrectionUseRecord({
      campaignId: "c8c-1",
      jobId: "job-1",
      packageId: feedback.packageId,
      submittedAt,
      releaseActivityId: "release-1",
      versionLabel: "v1",
      actor: { role: "client", userId: "client-a", displayName: "Client A" },
      occurredAt: submittedAt,
      ordinal: 1,
      consumptionKind: "included",
      feedback: { ...feedback, submittedAt, submissionType: "revision_requested" },
    });

    const first = appendCorrectionUseIdempotent(envelope(), record);
    expect(first.created).toBe(true);
    expect(first.envelope.jobCorrectionUses).toHaveLength(1);

    const retry = appendCorrectionUseIdempotent(first.envelope, {
      ...record,
      submittedAt: "2026-07-03T14:00:00.000Z",
      idempotencyKey: buildCorrectionUseIdempotencyKey("job-1", "2026-07-03T14:00:00.000Z"),
      id: "other",
    });
    expect(retry.created).toBe(false);
    expect(retry.envelope.jobCorrectionUses).toHaveLength(1);
    expect(findCorrectionUseByPackageId(retry.envelope, feedback.packageId)?.ordinal).toBe(1);
  });

  it("derives remaining from ledger plus owner grants without resetting included", () => {
    const withGrant = appendCorrectionExtraGrant(envelope(), {
      id: "grant-1",
      campaignId: "c8c-1",
      quantity: 1,
      approvedByUserId: "owner-1",
      approvedByDisplayName: "Owner",
      approvedAt: "2026-07-03T15:00:00.000Z",
      reason: "One more round",
    });

    const feedback = createEmptyJobReviewFeedback("c8c-1", "job-1", ["d0"]);
    const use1 = buildCorrectionUseRecord({
      campaignId: "c8c-1",
      jobId: "job-1",
      packageId: "pkg-1",
      submittedAt: "2026-07-03T13:00:00.000Z",
      releaseActivityId: null,
      versionLabel: null,
      actor: { role: "client", userId: "c", displayName: "C" },
      occurredAt: "2026-07-03T13:00:00.000Z",
      ordinal: 1,
      consumptionKind: "included",
      feedback,
    });
    const use2 = buildCorrectionUseRecord({
      campaignId: "c8c-1",
      jobId: "job-1",
      packageId: "pkg-2",
      submittedAt: "2026-07-03T14:00:00.000Z",
      releaseActivityId: null,
      versionLabel: null,
      actor: { role: "client", userId: "c", displayName: "C" },
      occurredAt: "2026-07-03T14:00:00.000Z",
      ordinal: 2,
      consumptionKind: "included",
      feedback,
    });
    const use3 = buildCorrectionUseRecord({
      campaignId: "c8c-1",
      jobId: "job-1",
      packageId: "pkg-3",
      submittedAt: "2026-07-03T16:00:00.000Z",
      releaseActivityId: null,
      versionLabel: null,
      actor: { role: "client", userId: "c", displayName: "C" },
      occurredAt: "2026-07-03T16:00:00.000Z",
      ordinal: 3,
      consumptionKind: "owner_extra",
      extraGrantId: "grant-1",
      feedback,
    });

    let env = appendCorrectionUseIdempotent(withGrant, use1).envelope;
    env = appendCorrectionUseIdempotent(env, use2).envelope;
    env = appendCorrectionUseIdempotent(env, use3).envelope;

    const accounting = deriveCorrectionAccounting({
      campaign: campaign({ revisionRoundsIncluded: 2 }),
      envelope: env,
    });

    expect(accounting.included).toBe(2);
    expect(accounting.used).toBe(3);
    expect(accounting.extraGranted).toBe(1);
    expect(accounting.extraRemaining).toBe(0);
    expect(accounting.remaining).toBe(0);
    expect(accounting.exhausted).toBe(true);
  });

  it("treats provisional legacy used counter as limiting when ledger is empty", () => {
    const accounting = deriveCorrectionAccounting({
      campaign: campaign({
        revisionRoundsIncluded: 2,
        revisionRoundsUsed: 2,
      }),
      envelope: envelope(),
    });
    expect(accounting.provisionalLegacyUsed).toBe(2);
    expect(accounting.remaining).toBe(0);
  });
});
