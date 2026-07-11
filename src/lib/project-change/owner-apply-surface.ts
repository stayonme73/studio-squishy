import type { CampaignExceptionStatus } from "@/lib/campaign-tasks/exceptions-types";
import type { ProjectActivityEnvelope } from "@/lib/project-activity/types";

import { resolveProjectChangeLinkage } from "./sync-owner-outcome";

export type ProjectChangeOwnerApplySurface = {
  ready: boolean;
  requestId?: string;
  requestSummary?: string;
};

export function resolveProjectChangeOwnerApplySurface(
  activity: ProjectActivityEnvelope | null | undefined,
  exceptionId: string,
  exceptionStatus: CampaignExceptionStatus,
): ProjectChangeOwnerApplySurface {
  if (!activity || exceptionStatus !== "waiting_owner") {
    return { ready: false };
  }

  const linkage = resolveProjectChangeLinkage(activity, exceptionId);
  if (!linkage.ok || linkage.mode !== "linked") {
    return { ready: false };
  }

  const request = linkage.request;
  if (
    request.classification !== "project_change" ||
    request.status !== "held" ||
    request.ownerDecision !== "approval_requested" ||
    request.consentStatus !== "granted"
  ) {
    return { ready: false };
  }

  return {
    ready: true,
    requestId: request.id,
    requestSummary: request.requestedValue,
  };
}
