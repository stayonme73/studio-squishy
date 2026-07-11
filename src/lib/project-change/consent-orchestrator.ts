import type { StudioUser } from "@/lib/campaign-store/types";
import { canReadCampaign } from "@/lib/campaign-store/access";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { getOrInitializeProjectActivity, writeProjectActivityEnvelope } from "@/lib/project-activity/store";
import type { InformationUpdateRequest, ProjectActivityEnvelope } from "@/lib/project-activity/types";
import { writeTasksEnvelope } from "@/lib/campaign-tasks/store";

import { applyCustomerDeclineProjectChangeConsent, applyCustomerGrantProjectChangeConsent } from "./consent-desk";
import {
  planProjectChangeConsentActivityResponse,
  type ProjectChangeConsentResponse,
} from "./consent-response";

export type ConsentOrchestratorPersistence = {
  writeActivity: (envelope: ProjectActivityEnvelope) => Promise<ProjectActivityEnvelope>;
  writeTasks: (envelope: ServerTasksEnvelope) => Promise<ServerTasksEnvelope>;
};

export function createDefaultConsentPersistence(): ConsentOrchestratorPersistence {
  return {
    writeActivity: writeProjectActivityEnvelope,
    writeTasks: writeTasksEnvelope,
  };
}

function cloneActivityEnvelope(envelope: ProjectActivityEnvelope): ProjectActivityEnvelope {
  return structuredClone(envelope);
}

async function persistConsentOutcomes(params: {
  activityBefore: ProjectActivityEnvelope;
  activityAfter: ProjectActivityEnvelope | null;
  tasksAfter: ServerTasksEnvelope | null;
  persistence: ConsentOrchestratorPersistence;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const shouldWriteActivity = params.activityAfter !== null;
  const shouldWriteTasks = params.tasksAfter !== null;

  if (shouldWriteActivity) {
    try {
      await params.persistence.writeActivity(params.activityAfter!);
    } catch {
      return {
        ok: false,
        error: "Failed to persist Project Activity consent response.",
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
      return {
        ok: false,
        error: "Failed to persist Owner Desk consent outcome.",
        status: 500,
      };
    }
  }

  return { ok: true };
}

export type OrchestrateProjectChangeConsentResult =
  | {
      ok: true;
      request: InformationUpdateRequest;
      response: ProjectChangeConsentResponse;
      activityEnvelope: ProjectActivityEnvelope;
      idempotent: boolean;
    }
  | { ok: false; error: string; status: number };

export async function orchestrateProjectChangeConsentResponse(params: {
  campaignId: string;
  requestId: string;
  response: ProjectChangeConsentResponse;
  user: StudioUser;
  tasksEnvelope: ServerTasksEnvelope;
  persistence?: ConsentOrchestratorPersistence;
}): Promise<OrchestrateProjectChangeConsentResult> {
  const persistence = params.persistence ?? createDefaultConsentPersistence();

  if (!params.user.roles.includes("client")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const campaignEnvelope = await readCampaignEnvelope(params.campaignId);
  if (!campaignEnvelope || !canReadCampaign(params.user, params.campaignId, campaignEnvelope)) {
    return { ok: false, error: "Access denied", status: 403 };
  }

  const activityEnvelope = await getOrInitializeProjectActivity(params.campaignId);
  const request = activityEnvelope.requests.find((entry) => entry.id === params.requestId);

  if (!request) {
    return { ok: false, error: "Request not found.", status: 404 };
  }

  const activityBefore = cloneActivityEnvelope(activityEnvelope);
  const activityPlan = planProjectChangeConsentActivityResponse({
    envelope: activityEnvelope,
    request,
    response: params.response,
    user: params.user,
  });

  if (!activityPlan.ok) {
    return { ok: false, error: activityPlan.error, status: activityPlan.status };
  }

  let tasksAfter: ServerTasksEnvelope | null = null;

  if (params.response === "declined" && !activityPlan.skipWrite) {
    const deskResult = applyCustomerDeclineProjectChangeConsent(
      params.tasksEnvelope,
      { exceptionId: activityPlan.exceptionId },
      params.user,
    );
    if (!deskResult.ok) {
      return { ok: false, error: deskResult.error, status: deskResult.status };
    }
    tasksAfter = deskResult.envelope;
  }

  if (params.response === "granted" && !activityPlan.skipWrite) {
    const deskResult = applyCustomerGrantProjectChangeConsent(
      params.tasksEnvelope,
      { exceptionId: activityPlan.exceptionId },
      params.user,
    );
    if (!deskResult.ok) {
      return { ok: false, error: deskResult.error, status: deskResult.status };
    }
    tasksAfter = deskResult.envelope;
  }

  const persisted = await persistConsentOutcomes({
    activityBefore,
    activityAfter: activityPlan.skipWrite ? null : activityPlan.nextEnvelope,
    tasksAfter,
    persistence,
  });

  if (!persisted.ok) {
    return persisted;
  }

  return {
    ok: true,
    request: activityPlan.request,
    response: params.response,
    activityEnvelope: activityPlan.skipWrite ? activityBefore : activityPlan.nextEnvelope,
    idempotent: activityPlan.idempotent,
  };
}
