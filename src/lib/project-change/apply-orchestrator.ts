import { isInternalUser } from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import { readCampaignEnvelope, upsertCampaignRecord, writeCampaignEnvelope } from "@/lib/campaign-store/store";
import { regenerateIfPlanChanged } from "@/lib/campaign-tasks/generate";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { getOrInitializeProjectActivity, writeProjectActivityEnvelope } from "@/lib/project-activity/store";
import type { InformationUpdateRequest, ProjectActivityEnvelope } from "@/lib/project-activity/types";
import type { CampaignRecord } from "@/config/studio-board";

import { planProjectChangeApplyActivitySync } from "./apply-activity";
import { applyProjectChangeAppliedDesk } from "./apply-desk";
import { buildCampaignWithAppliedPlan, computeNextApprovedStudioPlan } from "./apply-plan";
import { validateApplyApprovedProjectChangePreconditions } from "./apply-preconditions";
import type { ProjectChangeDelta } from "./types";

export type ApplyOrchestratorPersistence = {
  writeCampaign: (
    record: CampaignRecord,
    clientUserId: string,
  ) => Promise<ServerCampaignEnvelope>;
  writeActivity: (envelope: ProjectActivityEnvelope) => Promise<ProjectActivityEnvelope>;
  writeTasks: (envelope: ServerTasksEnvelope) => Promise<ServerTasksEnvelope>;
};

export function createDefaultApplyPersistence(): ApplyOrchestratorPersistence {
  return {
    writeCampaign: async (record, clientUserId) => {
      const existing = await readCampaignEnvelope(record.campaignId);
      return writeCampaignEnvelope({
        campaignId: record.campaignId,
        clientUserId: existing?.clientUserId ?? clientUserId ?? "",
        record,
        syncedAt: new Date().toISOString(),
        syncVersion: (existing?.syncVersion ?? 0) + 1,
      });
    },
    writeActivity: writeProjectActivityEnvelope,
    writeTasks: writeTasksEnvelope,
  };
}

function cloneActivityEnvelope(envelope: ProjectActivityEnvelope): ProjectActivityEnvelope {
  return structuredClone(envelope);
}

function cloneCampaignRecord(record: CampaignRecord): CampaignRecord {
  return structuredClone(record);
}

async function persistApplyOutcomes(params: {
  campaignBefore: CampaignRecord;
  clientUserId: string;
  campaignAfter: CampaignRecord | null;
  activityBefore: ProjectActivityEnvelope;
  activityAfter: ProjectActivityEnvelope | null;
  tasksAfter: ServerTasksEnvelope | null;
  persistence: ApplyOrchestratorPersistence;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const shouldWriteCampaign = params.campaignAfter !== null;
  const shouldWriteActivity = params.activityAfter !== null;
  const shouldWriteTasks = params.tasksAfter !== null;

  if (shouldWriteCampaign) {
    try {
      await params.persistence.writeCampaign(params.campaignAfter!, params.clientUserId);
    } catch {
      return {
        ok: false,
        error: "Failed to persist approved Studio Plan.",
        status: 500,
      };
    }
  }

  if (shouldWriteActivity) {
    try {
      await params.persistence.writeActivity(params.activityAfter!);
    } catch {
      if (shouldWriteCampaign) {
        try {
          await params.persistence.writeCampaign(params.campaignBefore, params.clientUserId);
        } catch {
          return {
            ok: false,
            error: "Project Activity write failed and campaign rollback failed.",
            status: 500,
          };
        }
      }
      return {
        ok: false,
        error: "Failed to persist Project Activity apply outcome.",
        status: 500,
      };
    }
  }

  if (shouldWriteTasks) {
    try {
      await params.persistence.writeTasks(params.tasksAfter!);
    } catch {
      if (shouldWriteActivity) {
        try {
          await params.persistence.writeActivity(params.activityBefore);
        } catch {
          return {
            ok: false,
            error: "Owner Desk write failed and Project Activity rollback failed.",
            status: 500,
          };
        }
      }
      if (shouldWriteCampaign) {
        try {
          await params.persistence.writeCampaign(params.campaignBefore, params.clientUserId);
        } catch {
          return {
            ok: false,
            error: "Owner Desk write failed and campaign rollback failed.",
            status: 500,
          };
        }
      }
      return {
        ok: false,
        error: "Failed to persist Owner Desk apply outcome.",
        status: 500,
      };
    }
  }

  return { ok: true };
}

export type ApplyApprovedProjectChangeResult =
  | {
      ok: true;
      request: InformationUpdateRequest;
      approvedStudioPlan: CampaignRecord["approvedStudioPlan"];
      idempotent: boolean;
    }
  | { ok: false; error: string; status: number; paymentRequired?: boolean };

export async function applyApprovedProjectChange(params: {
  campaignId: string;
  requestId: string;
  change: ProjectChangeDelta;
  user: StudioUser;
  assignments: CampaignAssignmentsFile;
  persistence?: ApplyOrchestratorPersistence;
}): Promise<ApplyApprovedProjectChangeResult> {
  if (!isInternalUser(params.user)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const persistence = params.persistence ?? createDefaultApplyPersistence();
  const [campaignEnvelope, activityEnvelope, tasksEnvelope, materialsEnvelope] = await Promise.all([
    readCampaignEnvelope(params.campaignId),
    getOrInitializeProjectActivity(params.campaignId),
    readTasksEnvelope(params.campaignId),
    getOrInitializeMaterials(params.campaignId),
  ]);

  if (!campaignEnvelope) {
    return { ok: false, error: "Campaign not found.", status: 404 };
  }

  if (!tasksEnvelope) {
    return { ok: false, error: "Owner Desk record is not available.", status: 404 };
  }

  const request = activityEnvelope.requests.find((entry) => entry.id === params.requestId);
  if (!request) {
    return { ok: false, error: "Request not found.", status: 404 };
  }

  const exceptionId = request.projectChangeExceptionId ?? "";
  const exception = tasksEnvelope.exceptionRecords?.find((entry) => entry.id === exceptionId);

  const precondition = validateApplyApprovedProjectChangePreconditions({
    user: params.user,
    request,
    change: params.change,
    campaign: campaignEnvelope.record,
    activityEnvelope,
    exceptionId,
    exception,
  });
  if (!precondition.ok) {
    return {
      ok: false,
      error: precondition.error,
      status: precondition.status,
    };
  }

  if (
    request.status === "applied" &&
    request.appliedChange &&
    request.appliedChange.kind === params.change.kind &&
    request.appliedChange.serviceId === params.change.serviceId
  ) {
    return {
      ok: true,
      request,
      approvedStudioPlan: campaignEnvelope.record.approvedStudioPlan,
      idempotent: true,
    };
  }

  const currentPlan = campaignEnvelope.record.approvedStudioPlan!;
  const planResult = computeNextApprovedStudioPlan(currentPlan, params.change);
  if (!planResult.ok) {
    return {
      ok: false,
      error: planResult.error,
      status: planResult.paymentRequired ? 409 : 400,
      paymentRequired: planResult.paymentRequired,
    };
  }

  const activityBefore = cloneActivityEnvelope(activityEnvelope);
  const campaignBefore = cloneCampaignRecord(campaignEnvelope.record);

  const activityPlan = planProjectChangeApplyActivitySync({
    envelope: activityEnvelope,
    request,
    change: params.change,
    exceptionId,
    exception,
    campaign: campaignEnvelope.record,
    user: params.user,
    serviceName: planResult.serviceName,
  });
  if (!activityPlan.ok) {
    return { ok: false, error: activityPlan.error, status: activityPlan.status };
  }

  const deskResult = applyProjectChangeAppliedDesk(
    tasksEnvelope,
    { exceptionId },
    params.user,
    params.assignments,
  );
  if (!deskResult.ok) {
    return { ok: false, error: deskResult.error, status: deskResult.status };
  }

  const updatedCampaign = buildCampaignWithAppliedPlan(campaignEnvelope.record, planResult.plan);
  const regeneratedTasks = regenerateIfPlanChanged(
    deskResult.envelope,
    updatedCampaign,
    materialsEnvelope.items,
  );
  const tasksAfter: ServerTasksEnvelope = {
    ...deskResult.envelope,
    ...regeneratedTasks,
    exceptionRecords: deskResult.envelope.exceptionRecords,
    exceptionEvents: deskResult.envelope.exceptionEvents,
  };

  const persisted = await persistApplyOutcomes({
    campaignBefore,
    clientUserId: campaignEnvelope.clientUserId,
    campaignAfter: activityPlan.skipWrite ? null : updatedCampaign,
    activityBefore,
    activityAfter: activityPlan.skipWrite ? null : activityPlan.nextEnvelope,
    tasksAfter: activityPlan.skipWrite ? null : tasksAfter,
    persistence,
  });

  if (!persisted.ok) {
    return persisted;
  }

  return {
    ok: true,
    request: activityPlan.request,
    approvedStudioPlan: activityPlan.skipWrite
      ? campaignEnvelope.record.approvedStudioPlan
      : updatedCampaign.approvedStudioPlan,
    idempotent: activityPlan.idempotent,
  };
}
