/**
 * Cert-9 shaped review-readiness regression — persisted state only, no E2E.
 */

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import {
  SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS,
  SOCIAL_PROMO_REVIEW_READINESS_BIND_INTERVAL_MS,
  SOCIAL_PROMO_REVIEW_READINESS_DEFAULT_MAX_WAIT_MS,
  awaitSocialPromoParentCustomerReviewReady,
  isSocialPromoParentReadyForCustomerReview,
  snapshotSocialPromoReviewReadiness,
} from "./social-promo-review-readiness";

const CAMPAIGN_ID = "disposable-social-promo-machine-cert-9";
const JOB_ID = `${CAMPAIGN_ID}:social_and_promo_graphics`;

function readyJob(spine: PurchasedJobRecord["spineStatus"]): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    skuId: "social_and_promo_graphics",
    spineStatus: spine,
    internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
    deliverablePrep: SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.map((deliverableKey) => ({
      deliverableKey,
      preparedAt: "2026-10-25T12:00:00.000Z",
    })),
  } as PurchasedJobRecord;
}

function envelope(job: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    syncedAt: new Date().toISOString(),
    tasks: [],
    jobRecords: [job],
    jobActivityEvents: [],
  };
}

describe("Cert-9 review readiness regression", () => {
  it("exposes harness-aligned default wait and bind throttle constants", () => {
    expect(SOCIAL_PROMO_REVIEW_READINESS_DEFAULT_MAX_WAIT_MS).toBe(180_000);
    expect(SOCIAL_PROMO_REVIEW_READINESS_BIND_INTERVAL_MS).toBe(3_000);
  });

  it("requires eight proofs and persisted ELIGIBLE_FOR_REVIEW before customer approval gate", () => {
    const full = readyJob("ready_for_review");
    expect(isSocialPromoParentReadyForCustomerReview(full)).toBe(true);

    const noAuth = { ...full, internalQaReviewAuthorization: undefined };
    expect(isSocialPromoParentReadyForCustomerReview(noAuth)).toBe(false);

    const snap = snapshotSocialPromoReviewReadiness(full);
    expect(snap.preparedReviewProofCount).toBe(8);
    expect(snap.reviewProofPrepComplete).toBe(true);
    expect(snap.reviewAuthorizationReady).toBe(true);
  });

  it("awaits realistic delayed persistence without forced spine transition", async () => {
    let reads = 0;
    let bindCalls = 0;
    const result = await awaitSocialPromoParentCustomerReviewReady({
      campaignId: CAMPAIGN_ID,
      parentJobId: JOB_ID,
      campaign: { campaignId: CAMPAIGN_ID } as CampaignRecord,
      maxWaitMs: 10_000,
      pollIntervalMs: 25,
      bindIntervalMs: 1_000,
      now: (() => {
        let t = 0;
        return () => {
          t += 25;
          return t;
        };
      })(),
      sleep: async () => {},
      bindReview: async (c) => {
        bindCalls += 1;
        return c;
      },
      readTasks: async () => {
        reads += 1;
        if (reads < 4) {
          return envelope(readyJob("ready_for_queue"));
        }
        return envelope(readyJob("ready_for_review"));
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.spineStatus).toBe("ready_for_review");
    expect(result.snapshot.reviewAuthorizationReady).toBe(true);
    expect(bindCalls).toBeLessThanOrEqual(reads);
    expect(result.bindAttempts).toBe(bindCalls);
  });

  it("times out with diagnostics when authorization never persists", async () => {
    const job = readyJob("ready_for_queue");
    const result = await awaitSocialPromoParentCustomerReviewReady({
      campaignId: CAMPAIGN_ID,
      parentJobId: JOB_ID,
      campaign: { campaignId: CAMPAIGN_ID } as CampaignRecord,
      maxWaitMs: 200,
      pollIntervalMs: 50,
      bindIntervalMs: 500,
      now: (() => {
        let t = 0;
        return () => {
          t += 50;
          return t;
        };
      })(),
      sleep: async () => {},
      bindReview: async (c) => c,
      readTasks: async () => envelope(job),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TIMEOUT");
    expect(result.message).toMatch(/qaAuth=eligible/);
    expect(result.message).toMatch(/proofs=8\/8/);
  });
});
