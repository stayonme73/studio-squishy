/**
 * Last line of defense for the protected reference campaign.
 *
 * `studioMayaReviewRevisionCertificationV1` freezes her revision entitlement
 * (`doNotModifyRevisionEntitlement`). The protected truth is **1 included round,
 * 1 used, 0 remaining** — she has already spent her genuine revision round.
 * Individual call sites already check the protected id, but a write that reaches
 * the store through any other path — a ledger reconciliation, a backfill, a test
 * run sharing the real data tree — could move those counters.
 *
 * These guards hold the frozen values on write instead of throwing, so stray
 * writes cannot alter the entitlement and cannot break an unrelated flow either.
 * Customer feedback records are never touched. The correction-use ledger is
 * resolved to her one genuine row **by identity**, not by ordering: the row is
 * pinned by idempotency key below. Ordering was the wrong instrument — a
 * contaminating row dated before 2026-09-12 would sort first and be mistaken for
 * the genuine one, and a single contaminating row that had replaced the genuine
 * one would pass unexamined because the count already looked correct.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";

import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

/**
 * Frozen entitlement for the protected reference campaign: her one included
 * round is already spent, so remaining is 0. Do not "restore" this to 0 used —
 * that would erase a genuine revision round from her protected history.
 */
export const PROTECTED_CAMPAIGN_REVISION_BASELINE = {
  campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
  revisionRoundsUsed: 1,
  revisionRoundsIncluded: 1,
  /**
   * Identity of the single genuine correction-use row — the 2026-09-12 owner
   * walkthrough submitted as the customer. `idempotencyKey` is `jobId:submittedAt`,
   * so this pins the exact job and the exact submission instant. Evidence for why
   * this event is genuine rather than test contamination (four client-role feedback
   * saves 04:59-05:38, then this submit, with a customer communication emitted):
   * docs/launch/studio-operating-project-alpha-hybrid-creative-certification-1/customer-one-hybrid-proofs/MAYA-REVISION-DRIFT-INCIDENT.md
   */
  genuineCorrectionUseIdempotencyKey: `${MAYA_PROTECTED_CAMPAIGN_ID}:v2-rtu-flyer:2026-09-12T05:39:44.689Z`,
  genuineCorrectionUseSubmittedAt: "2026-09-12T05:39:44.689Z",
} as const;

export function isProtectedReferenceCampaign(campaignId: string): boolean {
  return campaignId === MAYA_PROTECTED_CAMPAIGN_ID;
}

/**
 * Hold the protected campaign's revision counters at their frozen values.
 * Returns the record unchanged for every other campaign.
 */
export function preserveProtectedRevisionEntitlement(
  record: CampaignRecord,
): { record: CampaignRecord; preserved: boolean } {
  if (!isProtectedReferenceCampaign(record.campaignId)) {
    return { record, preserved: false };
  }
  const used = record.revisionRoundsUsed ?? 0;
  const included = record.revisionRoundsIncluded;
  if (
    used === PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsUsed &&
    included === PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsIncluded
  ) {
    return { record, preserved: false };
  }
  return {
    record: {
      ...record,
      revisionRoundsUsed:
        PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsUsed,
      revisionRoundsIncluded:
        PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsIncluded,
    },
    preserved: true,
  };
}

/**
 * Resolve the protected campaign's correction-use ledger to her one genuine row,
 * selected by pinned identity. Every other row is contamination — a test run, a
 * re-reconciliation, a stray write — and is dropped. Review feedback, activity,
 * and job records pass through untouched.
 *
 * Row count is never the test. A ledger holding exactly one row is still wrong if
 * that row is not hers, so the identity check runs regardless of length.
 *
 * If the genuine row is absent entirely we cannot invent it — the fields it
 * carries (package id, release activity, sticky counts, section statuses) are
 * customer history, not values to synthesize. In that case every contaminating row
 * is still dropped, leaving an empty ledger, and `genuineRowMissing` is raised so
 * the caller can see that the stored ledger no longer backs her counters. Repair
 * belongs to `scripts/maya-revision-entitlement-repair.mts`, which rebuilds the
 * row from her preserved review feedback.
 */
export function preserveProtectedCorrectionLedger(
  envelope: ServerTasksEnvelope,
): {
  envelope: ServerTasksEnvelope;
  preserved: boolean;
  /** True when no stored row matched the pinned genuine identity. */
  genuineRowMissing: boolean;
} {
  if (!isProtectedReferenceCampaign(envelope.campaignId)) {
    return { envelope, preserved: false, genuineRowMissing: false };
  }
  const uses = envelope.jobCorrectionUses ?? [];
  const genuine = uses.filter((use) => isGenuineProtectedCorrectionUse(use));
  // Duplicate identities collapse to one; the row is a single event.
  const kept = genuine.slice(0, PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsUsed);
  const unchanged =
    kept.length === uses.length && kept.every((use, index) => use === uses[index]);
  if (unchanged) {
    return { envelope, preserved: false, genuineRowMissing: kept.length === 0 };
  }
  return {
    envelope: { ...envelope, jobCorrectionUses: kept },
    preserved: true,
    genuineRowMissing: kept.length === 0,
  };
}

/**
 * A row is hers only if it carries the pinned identity. Both the idempotency key
 * and the submission instant must agree, so a row that reuses the key with a
 * different timestamp is not accepted.
 */
export function isGenuineProtectedCorrectionUse(use: {
  idempotencyKey?: string;
  submittedAt?: string;
  campaignId?: string;
}): boolean {
  return (
    use.idempotencyKey ===
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseIdempotencyKey &&
    use.submittedAt ===
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseSubmittedAt &&
    use.campaignId === PROTECTED_CAMPAIGN_REVISION_BASELINE.campaignId
  );
}
