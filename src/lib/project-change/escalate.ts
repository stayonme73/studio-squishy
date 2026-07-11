import type { CampaignRecord } from "@/config/studio-board";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import type { InformationUpdateRequest } from "@/lib/project-activity/types";
import { coordinateClientEvent, createCoordinatorSession } from "@/studio-coordinator";

export type ProjectChangeEscalationValidation =
  | { ok: true }
  | { ok: false; error: string; status: number };

export type ProjectChangeCoordinatorBridgeResult =
  | {
      ok: true;
      exceptionId: string;
      tasksEnvelope: ServerTasksEnvelope;
      alreadyEscalated: boolean;
    }
  | { ok: false; error: string; status: number };

export function validateProjectChangeEscalation(
  request: Pick<InformationUpdateRequest, "classification" | "status">,
): ProjectChangeEscalationValidation {
  if (request.classification !== "project_change") {
    return { ok: false, error: "Only classified Project Changes can be escalated.", status: 400 };
  }
  if (request.status !== "held") {
    return { ok: false, error: "Project Change must be held before escalation.", status: 400 };
  }
  return { ok: true };
}

export function findNewScopeChangeException(
  beforeIds: ReadonlySet<string>,
  afterRecords: readonly CampaignExceptionRecord[],
): CampaignExceptionRecord | undefined {
  return afterRecords.find(
    (record) => record.kind === "scope_change" && !beforeIds.has(record.id),
  );
}

export async function bridgeProjectChangeToOwnerDesk(params: {
  campaignId: string;
  request: InformationUpdateRequest;
  user: StudioUser;
  assignments: CampaignAssignmentsFile;
  campaign: CampaignRecord;
}): Promise<ProjectChangeCoordinatorBridgeResult> {
  const validation = validateProjectChangeEscalation(params.request);
  if (!validation.ok) return validation;

  const tasksEnvelope = await getOrGenerateTasks(params.campaignId, params.campaign);

  if (params.request.projectChangeExceptionId) {
    const linked = (tasksEnvelope.exceptionRecords ?? []).find(
      (record) => record.id === params.request.projectChangeExceptionId,
    );
    if (linked) {
      return {
        ok: true,
        exceptionId: linked.id,
        tasksEnvelope,
        alreadyEscalated: true,
      };
    }
    return {
      ok: false,
      error: "Linked Owner Desk record is missing. Contact Studio support.",
      status: 409,
    };
  }

  const materialsEnvelope = await getOrInitializeMaterials(params.campaignId, params.campaign);
  const exceptions = tasksEnvelope.exceptionRecords ?? [];
  const jobs = syncJobRecordsFromCampaign(
    params.campaign,
    tasksEnvelope.tasks,
    materialsEnvelope.items,
    exceptions,
    tasksEnvelope.jobRecords ?? [],
  );

  const state = {
    campaign: params.campaign,
    envelope: tasksEnvelope,
    materials: materialsEnvelope.items,
    jobs,
    materialsEnvelope,
  };

  const beforeIds = new Set(exceptions.map((record) => record.id));
  const occurredAt = new Date().toISOString();
  const message = [params.request.requestedValue, params.request.note].filter(Boolean).join("\n");

  const coordinated = coordinateClientEvent(
    {
      type: "scope_request",
      campaignId: params.campaignId,
      occurredAt,
      facts: {
        message,
        projectActivityRequestId: params.request.id,
      },
    },
    state,
    createCoordinatorSession(),
    {
      user: params.user,
      assignments: params.assignments,
    },
  );

  if (coordinated.outcome.determination !== "escalate") {
    return {
      ok: false,
      error: "Coordinator did not escalate this project change.",
      status: 502,
    };
  }

  const afterRecords = coordinated.state.envelope.exceptionRecords ?? [];
  const newException = findNewScopeChangeException(beforeIds, afterRecords);
  if (!newException) {
    return {
      ok: false,
      error: "Owner Desk exception was not created.",
      status: 502,
    };
  }

  const savedTasks = await writeTasksEnvelope(coordinated.state.envelope);

  return {
    ok: true,
    exceptionId: newException.id,
    tasksEnvelope: savedTasks,
    alreadyEscalated: false,
  };
}
