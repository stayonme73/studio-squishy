import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { findExceptionById } from "@/lib/campaign-tasks/exceptions";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { getOrInitializeProjectActivity } from "@/lib/project-activity/store";

import { applyApprovedProjectChange } from "./apply-orchestrator";
import { resolveProjectChangeOwnerApplySurface } from "./owner-apply-surface";
import { resolveProjectChangeLinkage } from "./sync-owner-outcome";
import type { ProjectChangeDelta } from "./types";

export type OrchestrateOwnerApplyProjectChangeScopeResult =
  | {
      ok: true;
      requestId: string;
      approvedStudioPlan: import("@/config/studio-board").CampaignRecord["approvedStudioPlan"];
      idempotent: boolean;
    }
  | { ok: false; error: string; status: number; paymentRequired?: boolean };

export async function orchestrateOwnerApplyProjectChangeScope(params: {
  campaignId: string;
  exceptionId: string;
  change: ProjectChangeDelta;
  user: StudioUser;
  assignments: CampaignAssignmentsFile;
}): Promise<OrchestrateOwnerApplyProjectChangeScopeResult> {
  if (!isOwnerUser(params.user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }

  const [campaignEnvelope, activityEnvelope, tasksEnvelope] = await Promise.all([
    readCampaignEnvelope(params.campaignId),
    getOrInitializeProjectActivity(params.campaignId),
    readTasksEnvelope(params.campaignId),
  ]);

  if (!campaignEnvelope) {
    return { ok: false, error: "Campaign not found.", status: 404 };
  }

  if (!tasksEnvelope) {
    return { ok: false, error: "Owner Desk record is not available.", status: 404 };
  }

  const linkage = resolveProjectChangeLinkage(activityEnvelope, params.exceptionId);
  if (!linkage.ok) {
    return { ok: false, error: linkage.error, status: linkage.status };
  }
  if (linkage.mode !== "linked") {
    return {
      ok: false,
      error: "Linked Project Activity request is required for Owner Desk apply.",
      status: 409,
    };
  }

  const exception = findExceptionById(tasksEnvelope.exceptionRecords, params.exceptionId);
  if (!exception) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const applySurface = resolveProjectChangeOwnerApplySurface(
    activityEnvelope,
    params.exceptionId,
    exception.status,
  );
  if (!applySurface.ready || !applySurface.requestId) {
    return {
      ok: false,
      error: "Owner Desk is not ready to apply this consented project change.",
      status: 409,
    };
  }

  const result = await applyApprovedProjectChange({
    campaignId: params.campaignId,
    requestId: applySurface.requestId,
    change: params.change,
    user: params.user,
    assignments: params.assignments,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    requestId: applySurface.requestId,
    approvedStudioPlan: result.approvedStudioPlan,
    idempotent: result.idempotent,
  };
}
