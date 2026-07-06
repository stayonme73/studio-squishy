import { JOB_CONTROL_POLICY } from "@/config/job-control";
import { resolveWaitingOnClientReminderStatus } from "@/lib/job-control/waiting-on-client";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { DecisionContext, DecisionOutcome } from "../types";

export type RefundEligibilityFacts = {
  job: PurchasedJobRecord;
  waitingSince: string;
  lastClientResponseAt?: string | null;
  nowMs?: number;
};

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

  const nowMs = facts.nowMs ?? Date.now();
  const reminderStatus = resolveWaitingOnClientReminderStatus(
    facts.waitingSince,
    facts.lastClientResponseAt ?? job.lastClientResponseAt ?? null,
    nowMs,
  );

  const productionStarted = Boolean(job.productionStartedAt);
  const nonRefundable = Boolean(job.nonRefundable);
  const mayBeEligible =
    reminderStatus === "refund_eligible" && !productionStarted && !nonRefundable;

  const matchedRules = [
    {
      ruleId: "job-control:waiting-on-client:resolveWaitingOnClientReminderStatus",
      matchedValue: reminderStatus,
      source: "lib/job-control/waiting-on-client.ts",
    },
    {
      ruleId: "help-center:refund-policy:production-not-started",
      matchedValue: String(!productionStarted),
      source: "docs/help-center-v1-locked.md",
    },
    {
      ruleId: `job-control:JOB_CONTROL_POLICY.refundEligibleDays`,
      matchedValue: String(JOB_CONTROL_POLICY.refundEligibleDays),
      source: "config/job-control.ts",
    },
  ];

  return {
    domain: "refund",
    determination: mayBeEligible ? "defer" : "deny",
    matchedRules,
    humanReviewRequired: mayBeEligible,
    effects: mayBeEligible
      ? [
          {
            kind: "enqueue_communication",
            eventType: "refund_eligibility_14_day",
          },
        ]
      : [],
    warnings: mayBeEligible
      ? []
      : [
          {
            code: "refund_not_eligible",
            message: "Refund may be eligible only when policy conditions are met per job.",
          },
        ],
    payload: {
      mayBeEligible,
      reminderStatus,
      wording: "may be eligible",
    },
  };
}
