import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { syncJobCommunicationRecords } from "@/lib/job-control/communication";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { DecisionContext, DecisionOutcome } from "../types";

export type OutgoingCommunicationFacts = {
  envelope: ServerTasksEnvelope;
  campaign: CampaignRecord;
  clientId: string;
  jobs: readonly PurchasedJobRecord[];
  materials: readonly CampaignMaterialItem[];
  nowMs?: number;
};

export function evaluateOutgoingCommunicationEvents(
  context: DecisionContext,
): DecisionOutcome {
  const facts = context.facts as unknown as OutgoingCommunicationFacts;
  const beforeIds = new Set(
    (facts.envelope.jobCommunicationRecords ?? []).map((record) => record.id),
  );

  const result = syncJobCommunicationRecords({
    envelope: facts.envelope,
    campaign: facts.campaign,
    clientId: facts.clientId,
    jobs: [...facts.jobs],
    materials: facts.materials,
    nowMs: facts.nowMs,
  });

  const newRecords = (result.envelope.jobCommunicationRecords ?? []).filter(
    (record) => !beforeIds.has(record.id),
  );

  const matchedRules = newRecords.map((record) => ({
    ruleId: `job-control:communication:${record.eventType}`,
    matchedValue: record.id,
    source: "lib/job-control/communication.ts",
  }));

  return {
    domain: "communication",
    determination: newRecords.length > 0 ? "notify" : "no_action",
    matchedRules,
    humanReviewRequired: false,
    effects: newRecords.map((record) => ({
      kind: "enqueue_communication" as const,
      communicationId: record.id,
      eventType: record.eventType,
    })),
    warnings: [],
    payload: {
      envelope: result.envelope,
      jobs: result.jobs,
    },
  };
}
