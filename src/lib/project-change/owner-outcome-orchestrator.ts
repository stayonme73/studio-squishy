import { applyTaskPatch, type TaskActionContext, type TaskActionResult, type TaskConflictSnapshot, type TasksPatchBody } from "@/lib/campaign-tasks/actions";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import { getOrInitializeProjectActivity, writeProjectActivityEnvelope } from "@/lib/project-activity/store";
import type { ProjectActivityEnvelope } from "@/lib/project-activity/types";
import { writeTasksEnvelope } from "@/lib/campaign-tasks/store";

import {
  isProjectChangeOwnerSyncAction,
  planProjectChangeOwnerActivitySync,
  resolveProjectChangeLinkage,
  type ProjectChangeOwnerSyncAction,
} from "./sync-owner-outcome";

export type OwnerScopeOrchestratorPersistence = {
  writeActivity: (envelope: ProjectActivityEnvelope) => Promise<ProjectActivityEnvelope>;
  writeTasks: (envelope: ServerTasksEnvelope) => Promise<ServerTasksEnvelope>;
};

export function createDefaultOwnerScopePersistence(): OwnerScopeOrchestratorPersistence {
  return {
    writeActivity: writeProjectActivityEnvelope,
    writeTasks: writeTasksEnvelope,
  };
}

function cloneActivityEnvelope(envelope: ProjectActivityEnvelope): ProjectActivityEnvelope {
  return structuredClone(envelope);
}

async function persistOwnerScopeOutcomes(params: {
  activityBefore: ProjectActivityEnvelope;
  activityAfter: ProjectActivityEnvelope | null;
  tasksAfter: ServerTasksEnvelope;
  persistence: OwnerScopeOrchestratorPersistence;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const shouldWriteActivity = params.activityAfter !== null;

  if (shouldWriteActivity) {
    try {
      await params.persistence.writeActivity(params.activityAfter!);
    } catch {
      return {
        ok: false,
        error: "Failed to persist Project Activity outcome.",
        status: 500,
      };
    }
  }

  try {
    await params.persistence.writeTasks(params.tasksAfter);
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
    return {
      ok: false,
      error: "Failed to persist Owner Desk outcome.",
      status: 500,
    };
  }

  return { ok: true };
}

export type OrchestrateProjectChangeOwnerScopeResult =
  | {
      ok: true;
      linked: false;
      taskResult: TaskActionResult & { ok: true };
    }
  | {
      ok: true;
      linked: true;
      taskResult: TaskActionResult & { ok: true };
      activityEnvelope: ProjectActivityEnvelope;
      idempotent: boolean;
    }
  | { ok: false; error: string; status: number; conflict?: TaskConflictSnapshot };

export async function orchestrateProjectChangeOwnerScopeAction(params: {
  campaignId: string;
  exceptionId: string;
  action: ProjectChangeOwnerSyncAction;
  user: StudioUser;
  clientMessage?: string;
  tasksEnvelope: ServerTasksEnvelope;
  taskPatchBody: TasksPatchBody;
  taskContext: TaskActionContext;
  persistence?: OwnerScopeOrchestratorPersistence;
}): Promise<OrchestrateProjectChangeOwnerScopeResult> {
  const persistence = params.persistence ?? createDefaultOwnerScopePersistence();
  const activityEnvelope = await getOrInitializeProjectActivity(params.campaignId);
  const linkage = resolveProjectChangeLinkage(activityEnvelope, params.exceptionId);

  if (!linkage.ok) {
    return { ok: false, error: linkage.error, status: linkage.status };
  }

  if (linkage.mode === "legacy_unlinked") {
    const taskResult = applyTaskPatch(
      params.tasksEnvelope,
      params.taskPatchBody,
      params.user,
      params.taskContext,
    );
    if (!taskResult.ok) {
      return {
        ok: false,
        error: taskResult.error,
        status: taskResult.status,
        conflict: taskResult.conflict,
      };
    }

    try {
      await persistence.writeTasks(taskResult.envelope);
    } catch {
      return {
        ok: false,
        error: "Failed to persist Owner Desk outcome.",
        status: 500,
      };
    }

    return { ok: true, linked: false, taskResult };
  }

  const activityBefore = cloneActivityEnvelope(activityEnvelope);
  const activityPlan = planProjectChangeOwnerActivitySync({
    envelope: activityEnvelope,
    request: linkage.request,
    exceptionId: params.exceptionId,
    action: params.action,
    user: params.user,
    clientMessage: params.clientMessage,
  });

  if (!activityPlan.ok) {
    return { ok: false, error: activityPlan.error, status: activityPlan.status };
  }

  const taskResult = applyTaskPatch(
    params.tasksEnvelope,
    params.taskPatchBody,
    params.user,
    params.taskContext,
  );

  if (!taskResult.ok) {
    return {
      ok: false,
      error: taskResult.error,
      status: taskResult.status,
      conflict: taskResult.conflict,
    };
  }

  const persisted = await persistOwnerScopeOutcomes({
    activityBefore,
    activityAfter: activityPlan.skipWrite ? null : activityPlan.nextEnvelope,
    tasksAfter: taskResult.envelope,
    persistence,
  });

  if (!persisted.ok) {
    return persisted;
  }

  return {
    ok: true,
    linked: true,
    taskResult,
    activityEnvelope: activityPlan.skipWrite ? activityBefore : activityPlan.nextEnvelope,
    idempotent: activityPlan.idempotent,
  };
}

export function assertProjectChangeOwnerOrchestrationBody(
  body: TasksPatchBody,
): body is TasksPatchBody & { action: ProjectChangeOwnerSyncAction; exceptionId: string } {
  return (
    isProjectChangeOwnerSyncAction(body.action) &&
    "exceptionId" in body &&
    typeof body.exceptionId === "string"
  );
}
