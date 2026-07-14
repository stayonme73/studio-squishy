import type { StudioUser } from "@/lib/campaign-store/types";
import { appendActivityEvent } from "@/lib/project-activity/actions";
import type {
  InformationUpdateRequest,
  ProjectActivityEnvelope,
} from "@/lib/project-activity/types";

import { customerSafeAppliedDetail } from "./apply-plan";
import { validateApplyApprovedProjectChangePreconditions } from "./apply-preconditions";
import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/types";
import type { ProjectChangeDelta } from "./types";
import { projectChangeDeltasMatch } from "./types";

function actorFromUser(user: StudioUser) {
  return {
    role: user.roles.includes("client") ? ("customer" as const) : ("staff" as const),
    userId: user.id,
    displayName: user.displayName,
  };
}

export type PlanProjectChangeApplyActivityResult =
  | {
      ok: true;
      nextEnvelope: ProjectActivityEnvelope;
      request: InformationUpdateRequest;
      idempotent: boolean;
      skipWrite: boolean;
    }
  | { ok: false; error: string; status: number };

export function planProjectChangeApplyActivitySync(params: {
  envelope: ProjectActivityEnvelope;
  request: InformationUpdateRequest;
  change: ProjectChangeDelta;
  exceptionId: string;
  exception?: CampaignExceptionRecord;
  campaign: CampaignRecord;
  user: StudioUser;
  serviceName: string;
  clientUserId?: string;
}): PlanProjectChangeApplyActivityResult {
  const validation = validateApplyApprovedProjectChangePreconditions({
    user: params.user,
    request: params.request,
    change: params.change,
    campaign: params.campaign,
    activityEnvelope: params.envelope,
    exceptionId: params.exceptionId,
    exception: params.exception,
    clientUserId: params.clientUserId,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: validation.status };
  }

  if (
    params.request.status === "applied" &&
    params.request.appliedChange &&
    projectChangeDeltasMatch(params.request.appliedChange, params.change)
  ) {
    return {
      ok: true,
      nextEnvelope: params.envelope,
      request: params.request,
      idempotent: true,
      skipWrite: true,
    };
  }

  const appliedAt = new Date().toISOString();
  const updated: InformationUpdateRequest = {
    ...params.request,
    status: "applied",
    appliedAt,
    appliedBy: params.user.id,
    appliedChange: params.change,
    ...(params.request.ownerDecision !== "approved"
      ? {
          ownerDecision: "approved" as const,
          ownerDecisionAt: appliedAt,
        }
      : {}),
  };

  const index = params.envelope.requests.findIndex((entry) => entry.id === params.request.id);
  let next: ProjectActivityEnvelope = {
    ...params.envelope,
    requests: params.envelope.requests.map((entry, i) => (i === index ? updated : entry)),
    updatedAt: appliedAt,
    version: params.envelope.version + 1,
  };

  const detail = customerSafeAppliedDetail(params.change, params.serviceName);
  next = appendActivityEvent(next, {
    kind: "project_change_applied",
    sourceType: "system_apply",
    sourceId: `${params.request.id}:project_change_applied:${params.exceptionId}`,
    actor: actorFromUser(params.user),
    requestId: params.request.id,
    headline: "Project change applied",
    detail,
    payload: {
      changeKind: params.change.kind,
      serviceId: params.change.serviceId,
      exceptionId: params.exceptionId,
    },
  });

  next = appendActivityEvent(next, {
    kind: "project_change_closed",
    sourceType: "system_apply",
    sourceId: `${params.request.id}:project_change_closed:${params.exceptionId}`,
    actor: actorFromUser(params.user),
    requestId: params.request.id,
    headline: "Project change closed",
    detail,
  });

  return {
    ok: true,
    nextEnvelope: next,
    request: updated,
    idempotent: false,
    skipWrite: false,
  };
}
