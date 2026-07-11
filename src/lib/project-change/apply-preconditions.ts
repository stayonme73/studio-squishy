import { isInternalUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { InformationUpdateRequest, ProjectActivityEnvelope } from "@/lib/project-activity/types";

import { resolveProjectChangeLinkage } from "./sync-owner-outcome";
import type { ProjectChangeDelta } from "./types";
import { projectChangeDeltasMatch } from "./types";

function isTerminalProjectChangeRequest(request: InformationUpdateRequest): boolean {
  return request.status === "rejected" || request.status === "applied";
}

export function validateConsentReadyForApply(
  request: InformationUpdateRequest,
): { ok: true } | { ok: false; error: string; status: number } {
  if (request.consentStatus === "declined") {
    return { ok: false, error: "Customer declined this project change.", status: 409 };
  }
  if (request.consentStatus === "pending") {
    return { ok: false, error: "Customer consent is still pending.", status: 409 };
  }
  if (
    request.ownerDecision === "approval_requested" &&
    request.consentStatus !== "granted"
  ) {
    return {
      ok: false,
      error: "Customer consent is required before this change can be applied.",
      status: 409,
    };
  }
  return { ok: true };
}

export function validateOwnerApprovalForApply(
  request: InformationUpdateRequest,
): { ok: true } | { ok: false; error: string; status: number } {
  if (request.ownerDecision === "approved") {
    return { ok: true };
  }
  if (
    request.ownerDecision === "approval_requested" &&
    request.consentStatus === "granted"
  ) {
    return { ok: true };
  }
  return { ok: false, error: "Owner has not approved this project change.", status: 409 };
}

export function validateApplyApprovedProjectChangePreconditions(params: {
  user: StudioUser;
  request: InformationUpdateRequest;
  change: ProjectChangeDelta;
  campaign: CampaignRecord;
  activityEnvelope: ProjectActivityEnvelope;
  exceptionId: string;
  exception?: CampaignExceptionRecord;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (!isInternalUser(params.user)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  if (!params.campaign.paymentReceivedAt) {
    return { ok: false, error: "Project changes apply only after payment is confirmed.", status: 403 };
  }

  if (!params.campaign.approvedStudioPlan) {
    return { ok: false, error: "Campaign has no approved Studio Plan on record.", status: 409 };
  }

  if (params.request.classification !== "project_change") {
    return { ok: false, error: "Only classified project changes can be applied.", status: 400 };
  }

  if (params.request.status !== "held") {
    if (params.request.status === "applied" && params.request.appliedChange) {
      if (projectChangeDeltasMatch(params.request.appliedChange, params.change)) {
        return { ok: true };
      }
      return {
        ok: false,
        error: "This project change was already applied with a different delta.",
        status: 409,
      };
    }
    if (isTerminalProjectChangeRequest(params.request)) {
      return { ok: false, error: "Project change request is already closed.", status: 409 };
    }
    return { ok: false, error: "Project change request is not in a held state.", status: 409 };
  }

  if (!params.request.projectChangeExceptionId?.trim()) {
    return { ok: false, error: "Project change link is missing.", status: 409 };
  }

  if (params.request.projectChangeExceptionId !== params.exceptionId) {
    return { ok: false, error: "Project change link does not match the Owner Desk record.", status: 409 };
  }

  const linkage = resolveProjectChangeLinkage(params.activityEnvelope, params.exceptionId);
  if (!linkage.ok) {
    return { ok: false, error: linkage.error, status: linkage.status };
  }
  if (linkage.mode !== "linked" || linkage.request.id !== params.request.id) {
    return {
      ok: false,
      error: "Project Activity link is missing for this project change.",
      status: 409,
    };
  }

  if (params.request.ownerDecision !== "approved") {
    const ownerApproval = validateOwnerApprovalForApply(params.request);
    if (!ownerApproval.ok) return ownerApproval;
  }

  const consent = validateConsentReadyForApply(params.request);
  if (!consent.ok) return consent;

  if (!params.exception) {
    return { ok: false, error: "Linked Owner Desk exception was not found.", status: 404 };
  }

  if (params.exception.kind !== "scope_change") {
    return { ok: false, error: "Linked Owner Desk record is not a scope change.", status: 409 };
  }

  if (params.exception.status === "waiting_client") {
    return {
      ok: false,
      error: "Owner Desk is still awaiting client consent.",
      status: 409,
    };
  }

  return { ok: true };
}
