import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { recoverOwnerDecisionAftermath } from "@/lib/campaign-tasks/owner-decision-aftermath";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { buildCustomerJobStatusSummaries } from "@/lib/project-record-status";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

/**
 * Customer-safe per-job status for Project Record. Allowlist redaction only —
 * see src/lib/project-record-status.ts. Does not compute eligibility, refunds,
 * or Decision Core outcomes.
 */
export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/project-status`,
  );
  if (access instanceof NextResponse) return access;
  const { campaignEnvelope } = access;

  if (!campaignEnvelope.record.paymentReceivedAt) {
    return NextResponse.json({ jobs: [] });
  }

  const [tasksEnvelope, materialsEnvelope] = await Promise.all([
    getOrGenerateTasks(campaignId, campaignEnvelope.record),
    getOrInitializeMaterials(campaignId, campaignEnvelope.record),
  ]);

  const synced = syncJobRecordsFromCampaign(
    campaignEnvelope.record,
    tasksEnvelope.tasks ?? [],
    materialsEnvelope.items,
    tasksEnvelope.exceptionRecords ?? [],
    tasksEnvelope.jobRecords,
  );
  const jobs = applyWaitingOnClientPolicies(synced, materialsEnvelope.items);
  const recovered = recoverOwnerDecisionAftermath({
    ...tasksEnvelope,
    jobRecords: jobs,
  });
  if (recovered.recoveredIds.length > 0) {
    await writeTasksEnvelope(recovered.envelope);
  }
  const visibleJobs = recovered.envelope.jobRecords ?? jobs;

  return NextResponse.json({ jobs: buildCustomerJobStatusSummaries(visibleJobs) });
}
