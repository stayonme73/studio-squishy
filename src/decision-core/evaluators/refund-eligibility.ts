import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { DecisionContext, DecisionOutcome } from "../types";

export type RefundEligibilityFacts = {
  job: PurchasedJobRecord;
  /** Operational history only — not a refund clock. */
  waitingSince?: string;
  lastClientResponseAt?: string | null;
  nowMs?: number;
};

/**
 * Before production starts a refund may be approved; after production starts the job is
 * non-refundable. There is no waiting period, and the outcome is never an automatic refund.
 */
export function evaluateRefundEligibility(context: DecisionContext): DecisionOutcome {
  const facts = context.facts as unknown as RefundEligibilityFacts;
  const job = facts.job;
  if (!job) {
    return {
      domain: "refund",
      determination: "deny",
      matchedRules: [],
      humanReviewRequired: false,
      effects: [],
      warnings: [{ code: "missing_job", message: "Job record is required." }],
    };
  }

  const productionStarted = Boolean(job.productionStartedAt);
  const nonRefundable = Boolean(job.nonRefundable);
  const mayBeEligible = !productionStarted && !nonRefundable;

  const matchedRules = [
    {
      ruleId: "help-center:refund-policy:production-not-started",
      matchedValue: String(!productionStarted),
      source: "docs/help-center-v1-locked.md",
    },
    {
      ruleId: "job-control:non-refundable-after-production-start",
      matchedValue: String(nonRefundable),
      source: "lib/job-control/communication.ts",
    },
  ];

  return {
    domain: "refund",
    determination: mayBeEligible ? "defer" : "deny",
    matchedRules,
    humanReviewRequired: mayBeEligible,
    effects: [],
    warnings: mayBeEligible
      ? []
      : [
          {
            code: "refund_not_eligible",
            message: "Non-refundable — production has started for this job.",
          },
        ],
    payload: {
      mayBeEligible,
      wording: "may be approved",
    },
  };
}
