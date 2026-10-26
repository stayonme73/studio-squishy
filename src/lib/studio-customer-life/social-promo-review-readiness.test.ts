import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { socialPromoReviewProofKey } from "@/lib/studio-review-revision/social-promo-purchase-delivery-truth";

import {
  SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS,
  awaitSocialPromoParentCustomerReviewReady,
  isSocialPromoParentReadyForCustomerReview,
  snapshotSocialPromoReviewReadiness,
} from "./social-promo-review-readiness";

const CAMPAIGN_ID = "await-review-proof";
const JOB_ID = `${CAMPAIGN_ID}:social_and_promo_graphics`;

function job(partial: Partial<PurchasedJobRecord>): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    skuId: "social_and_promo_graphics",
    spineStatus: "ready_for_queue",
    deliverablePrep: [],
    ...partial,
  } as PurchasedJobRecord;
}

function envelope(jobRecord: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    syncedAt: new Date().toISOString(),
    tasks: [],
    jobRecords: [jobRecord],
    jobActivityEvents: [],
  };
}

describe("social-promo review readiness", () => {
  it("requires internal QA authorization before customer Review", () => {
    const prep = SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.map((key) => ({
      deliverableKey: key,
      preparedAt: new Date().toISOString(),
    }));
    expect(
      isSocialPromoParentReadyForCustomerReview(
        job({
          spineStatus: "ready_for_review",
          deliverablePrep: prep,
        }),
      ),
    ).toBe(false);
    expect(
      isSocialPromoParentReadyForCustomerReview(
        job({
          spineStatus: "ready_for_review",
          deliverablePrep: prep,
          internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
        }),
      ),
    ).toBe(true);
  });

  it("requires all eight review proof prep keys before customer Review", () => {
    const prep = SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.slice(0, 7).map((key) => ({
      deliverableKey: key,
      preparedAt: new Date().toISOString(),
    }));
    const snap = snapshotSocialPromoReviewReadiness(
      job({ spineStatus: "ready_for_review", deliverablePrep: prep }),
    );
    expect(snap.reviewProofPrepComplete).toBe(false);
    expect(snap.missingReviewProofKeys).toHaveLength(1);
    expect(isSocialPromoParentReadyForCustomerReview(job({ spineStatus: "ready_for_review", deliverablePrep: prep }))).toBe(
      false,
    );
  });

  it("awaits delayed persisted ready_for_review with full prep keys", async () => {
    let reads = 0;
    const campaign = { campaignId: CAMPAIGN_ID } as CampaignRecord;
    const readyPrep = SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.map((key) => ({
      deliverableKey: key,
      preparedAt: new Date().toISOString(),
    }));

    const result = await awaitSocialPromoParentCustomerReviewReady({
      campaignId: CAMPAIGN_ID,
      parentJobId: JOB_ID,
      campaign,
      maxWaitMs: 5_000,
      pollIntervalMs: 10,
      now: (() => {
        let t = 0;
        return () => {
          t += 10;
          return t;
        };
      })(),
      sleep: async () => {},
      bindReview: async (record) => record,
      readTasks: async () => {
        reads += 1;
        if (reads < 3) {
          return envelope(job({ spineStatus: "ready_for_queue" }));
        }
        return envelope(
          job({
            spineStatus: "ready_for_review",
            deliverablePrep: readyPrep,
            internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
          }),
        );
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.spineStatus).toBe("ready_for_review");
    expect(result.snapshot.reviewProofPrepComplete).toBe(true);
    expect(result.attempts).toBeGreaterThanOrEqual(3);
  });

  it("stops with PERMANENTLY_BLOCKED when spine settles without Review", async () => {
    const result = await awaitSocialPromoParentCustomerReviewReady({
      campaignId: CAMPAIGN_ID,
      parentJobId: JOB_ID,
      campaign: { campaignId: CAMPAIGN_ID } as CampaignRecord,
      maxWaitMs: 500,
      pollIntervalMs: 1,
      sleep: async () => {},
      bindReview: async (record) => record,
      readTasks: async () =>
        envelope(
          job({
            spineStatus: "ready_for_delivery",
            deliverablePrep: [{ deliverableKey: socialPromoReviewProofKey("post-1"), preparedAt: new Date().toISOString() }],
          }),
        ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PERMANENTLY_BLOCKED");
  });

  it("does not invoke bind on every poll when only waiting on persisted spine", async () => {
    let bindCalls = 0;
    const prep = SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.map((key) => ({
      deliverableKey: key,
      preparedAt: new Date().toISOString(),
    }));
    const result = await awaitSocialPromoParentCustomerReviewReady({
      campaignId: CAMPAIGN_ID,
      parentJobId: JOB_ID,
      campaign: { campaignId: CAMPAIGN_ID } as CampaignRecord,
      maxWaitMs: 8_000,
      pollIntervalMs: 100,
      bindIntervalMs: 2_000,
      now: (() => {
        let t = 0;
        return () => {
          t += 100;
          return t;
        };
      })(),
      sleep: async () => {},
      bindReview: async (record) => {
        bindCalls += 1;
        return record;
      },
      readTasks: async () =>
        envelope(
          job({
            spineStatus: "ready_for_queue",
            deliverablePrep: prep,
            internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
          }),
        ),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TIMEOUT");
    expect(bindCalls).toBeLessThanOrEqual(5);
    expect(result.bindAttempts).toBe(bindCalls);
  });

  it("times out when review readiness never materializes", async () => {
    vi.useFakeTimers();
    const pending = awaitSocialPromoParentCustomerReviewReady({
      campaignId: CAMPAIGN_ID,
      parentJobId: JOB_ID,
      campaign: { campaignId: CAMPAIGN_ID } as CampaignRecord,
      maxWaitMs: 100,
      pollIntervalMs: 50,
      bindReview: async (record) => record,
      readTasks: async () => envelope(job({ spineStatus: "ready_for_queue" })),
    });
    await vi.runAllTimersAsync();
    const result = await pending;
    vi.useRealTimers();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TIMEOUT");
  });
});
