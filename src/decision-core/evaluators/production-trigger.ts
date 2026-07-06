import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";
import {
  blockingMaterialsForSku,
  hasProductionStartedForSku,
  isJobIntakeComplete,
} from "@/lib/job-control/resolve-jobs";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { DecisionContext, DecisionOutcome } from "../types";

export type ProductionTriggerFacts = {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  materials: readonly CampaignMaterialItem[];
  tasks?: readonly CampaignTaskItem[];
};

export function evaluateProductionTrigger(context: DecisionContext): DecisionOutcome {
  const facts = context.facts as unknown as ProductionTriggerFacts;
  const { campaign, job, materials } = facts;
  if (!campaign || !job) {
    return {
      domain: "production_trigger",
      determination: "deny",
      matchedRules: [],
      humanReviewRequired: false,
      effects: [],
      warnings: [{ code: "missing_facts", message: "Campaign and job are required." }],
    };
  }

  const tasks = facts.tasks ?? [];
  const paymentReceived = Boolean(campaign.paymentReceivedAt);
  const projectDetailsComplete = isJobIntakeComplete(campaign) && job.intakeComplete;
  const blockingMaterials = blockingMaterialsForSku(materials, job.skuId);
  const materialsAccepted = blockingMaterials.length === 0;
  const movedToProduction =
    Boolean(job.productionStartedAt) || hasProductionStartedForSku(tasks, job.skuId);

  const allFourMet =
    paymentReceived &&
    projectDetailsComplete &&
    materialsAccepted &&
    movedToProduction;

  const matchedRules = [
    {
      ruleId: "help-center:production-trigger:payment-received",
      matchedValue: String(paymentReceived),
      source: "docs/help-center-v1-locked.md",
    },
    {
      ruleId: "help-center:production-trigger:project-details-complete",
      matchedValue: String(projectDetailsComplete),
      source: "docs/help-center-v1-locked.md",
    },
    {
      ruleId: "help-center:production-trigger:materials-accepted",
      matchedValue: String(materialsAccepted),
      source: "docs/help-center-v1-locked.md",
    },
    {
      ruleId: "help-center:production-trigger:moved-to-production",
      matchedValue: String(movedToProduction),
      source: "docs/help-center-v1-locked.md",
    },
  ];

  return {
    domain: "production_trigger",
    determination: allFourMet ? "allow" : "defer",
    matchedRules,
    humanReviewRequired: false,
    effects: allFourMet
      ? [
          { kind: "job_record_patch", note: "nonRefundable when production started" },
          {
            kind: "enqueue_communication",
            eventType: "production_started",
          },
        ]
      : [],
    warnings: [],
    payload: {
      allFourMet,
      paymentReceived,
      projectDetailsComplete,
      materialsAccepted,
      movedToProduction,
      nonRefundable: Boolean(job.nonRefundable || job.productionStartedAt),
    },
  };
}
