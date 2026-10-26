/**
 * Authoritative Social & Promo parent job readiness for customer Review.
 * Callers must await persisted ready_for_review + full review proof prep + QA authorization.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import {
  SOCIAL_PROMO_DELIVERY_FILES,
  isSocialPromoParentSku,
  socialPromoReviewProofKey,
} from "@/lib/studio-review-revision/social-promo-purchase-delivery-truth";

import { ensureSocialPromoCompositeReviewBind } from "./machine-social-promo-review-bind";

export const SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS: readonly string[] =
  SOCIAL_PROMO_DELIVERY_FILES.map((file) => socialPromoReviewProofKey(file.member));

/** Cert-8 evidence: review proof upload ~0s, spine transition up to ~123s without hammering binds. */
export const SOCIAL_PROMO_REVIEW_READINESS_DEFAULT_MAX_WAIT_MS = 180_000;

/** Re-invoke composite bind at most this often while waiting (avoid write-lock storms). */
export const SOCIAL_PROMO_REVIEW_READINESS_BIND_INTERVAL_MS = 3_000;

export const SOCIAL_PROMO_REVIEW_READINESS_POLL_INTERVAL_MS = 250;

export type SocialPromoReviewReadinessSnapshot = {
  spineStatus: PurchasedJobRecord["spineStatus"] | "missing";
  preparedReviewProofKeys: string[];
  missingReviewProofKeys: string[];
  reviewProofPrepComplete: boolean;
  reviewAuthorizationReady: boolean;
  preparedReviewProofCount: number;
};

export function snapshotSocialPromoReviewReadiness(
  job: PurchasedJobRecord | undefined | null,
): SocialPromoReviewReadinessSnapshot {
  const preparedReviewProofKeys = (job?.deliverablePrep ?? [])
    .filter((entry) => entry.preparedAt)
    .map((entry) => entry.deliverableKey);
  const preparedSet = new Set(preparedReviewProofKeys);
  const missingReviewProofKeys = SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.filter(
    (key) => !preparedSet.has(key),
  );
  const reviewAuthorizationReady =
    job?.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW";
  return {
    spineStatus: job?.spineStatus ?? "missing",
    preparedReviewProofKeys,
    missingReviewProofKeys,
    reviewProofPrepComplete: missingReviewProofKeys.length === 0,
    reviewAuthorizationReady,
    preparedReviewProofCount: SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.filter((key) =>
      preparedSet.has(key),
    ).length,
  };
}

export function isSocialPromoParentReadyForCustomerReview(
  job: PurchasedJobRecord | undefined | null,
): boolean {
  if (!job || job.spineStatus !== "ready_for_review") return false;
  const snap = snapshotSocialPromoReviewReadiness(job);
  return snap.reviewProofPrepComplete && snap.reviewAuthorizationReady;
}

const SETTLED_WITHOUT_REVIEW = new Set<PurchasedJobRecord["spineStatus"]>([
  "approved",
  "ready_for_delivery",
  "delivered",
]);

export type AwaitSocialPromoReviewReadyResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      job: PurchasedJobRecord;
      snapshot: SocialPromoReviewReadinessSnapshot;
      waitedMs: number;
      attempts: number;
      bindAttempts: number;
    }
  | {
      ok: false;
      code: "TIMEOUT" | "JOB_MISSING" | "PERMANENTLY_BLOCKED";
      message: string;
      snapshot: SocialPromoReviewReadinessSnapshot;
      waitedMs: number;
      attempts: number;
      bindAttempts: number;
    };

export type AwaitSocialPromoReviewReadyOptions = {
  campaignId: string;
  parentJobId: string;
  campaign: CampaignRecord;
  maxWaitMs?: number;
  pollIntervalMs?: number;
  bindIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  bindReview?: (campaign: CampaignRecord) => Promise<CampaignRecord>;
  readTasks?: (campaignId: string) => ReturnType<typeof readTasksEnvelope>;
};

function permanentlyBlockedSpine(spine: PurchasedJobRecord["spineStatus"] | "missing"): boolean {
  if (spine === "missing") return false;
  return SETTLED_WITHOUT_REVIEW.has(spine);
}

function shouldAttemptReviewBind(input: {
  snapshot: SocialPromoReviewReadinessSnapshot;
  job: PurchasedJobRecord | null | undefined;
}): boolean {
  if (!input.job) return false;
  if (isSocialPromoParentReadyForCustomerReview(input.job)) return false;
  if (permanentlyBlockedSpine(input.snapshot.spineStatus)) return false;
  if (!input.snapshot.reviewProofPrepComplete) return true;
  if (!input.snapshot.reviewAuthorizationReady) return true;
  if (
    input.snapshot.reviewProofPrepComplete &&
    input.snapshot.reviewAuthorizationReady &&
    input.snapshot.spineStatus !== "ready_for_review"
  ) {
    return true;
  }
  return false;
}

function formatTimeoutDiagnostics(
  snapshot: SocialPromoReviewReadinessSnapshot,
  bindAttempts: number,
): string {
  return [
    `spine=${snapshot.spineStatus}`,
    `proofs=${snapshot.preparedReviewProofCount}/${SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.length}`,
    `missing=${snapshot.missingReviewProofKeys.join(", ") || "none"}`,
    `qaAuth=${snapshot.reviewAuthorizationReady ? "eligible" : "missing"}`,
    `bindAttempts=${bindAttempts}`,
  ].join("; ");
}

/**
 * Bounded poll: read persisted tasks frequently; re-run composite review bind only when
 * progress may still be produced (missing proofs, auth, or spine completion).
 */
export async function awaitSocialPromoParentCustomerReviewReady(
  input: AwaitSocialPromoReviewReadyOptions,
): Promise<AwaitSocialPromoReviewReadyResult> {
  const maxWaitMs = input.maxWaitMs ?? SOCIAL_PROMO_REVIEW_READINESS_DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = input.pollIntervalMs ?? SOCIAL_PROMO_REVIEW_READINESS_POLL_INTERVAL_MS;
  const bindIntervalMs = input.bindIntervalMs ?? SOCIAL_PROMO_REVIEW_READINESS_BIND_INTERVAL_MS;
  const now = input.now ?? (() => Date.now());
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const bindReview = input.bindReview ?? ensureSocialPromoCompositeReviewBind;
  const readTasks = input.readTasks ?? readTasksEnvelope;

  const started = now();
  let attempts = 0;
  let bindAttempts = 0;
  let lastBindAt = -bindIntervalMs;
  let campaign = input.campaign;

  while (now() - started <= maxWaitMs) {
    attempts += 1;
    const envelope = await readTasks(input.campaignId);
    const job = envelope?.jobRecords?.find((entry) => entry.jobId === input.parentJobId);
    const snapshot = snapshotSocialPromoReviewReadiness(job);

    if (job && isSocialPromoParentSku(job.skuId) && isSocialPromoParentReadyForCustomerReview(job)) {
      return {
        ok: true,
        campaign,
        job,
        snapshot,
        waitedMs: now() - started,
        attempts,
        bindAttempts,
      };
    }

    if (permanentlyBlockedSpine(snapshot.spineStatus)) {
      return {
        ok: false,
        code: "PERMANENTLY_BLOCKED",
        message: `Job spine ${snapshot.spineStatus} will not open customer Review for this package.`,
        snapshot,
        waitedMs: now() - started,
        attempts,
        bindAttempts,
      };
    }

    if (!job) {
      return {
        ok: false,
        code: "JOB_MISSING",
        message: `Parent Social & Promo job ${input.parentJobId} is missing from tasks envelope.`,
        snapshot,
        waitedMs: now() - started,
        attempts,
        bindAttempts,
      };
    }

    const bindDue = now() - lastBindAt >= bindIntervalMs;
    if (bindDue && shouldAttemptReviewBind({ snapshot, job })) {
      lastBindAt = now();
      bindAttempts += 1;
      campaign = await bindReview(campaign);
    }

    await sleep(pollIntervalMs);
  }

  const envelope = await readTasks(input.campaignId);
  const job = envelope?.jobRecords?.find((entry) => entry.jobId === input.parentJobId);
  const snapshot = snapshotSocialPromoReviewReadiness(job);
  return {
    ok: false,
    code: "TIMEOUT",
    message: `Review readiness did not persist within ${maxWaitMs}ms (${formatTimeoutDiagnostics(snapshot, bindAttempts)}).`,
    snapshot,
    waitedMs: now() - started,
    attempts,
    bindAttempts,
  };
}
