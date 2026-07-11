import type { StudioUser } from "@/lib/campaign-store/types";
import { appendActivityEvent } from "@/lib/project-activity/actions";
import type {
  InformationUpdateRequest,
  ProjectActivityEnvelope,
} from "@/lib/project-activity/types";

import { resolveProjectChangeLinkage } from "./sync-owner-outcome";

export type ProjectChangeConsentResponse = "granted" | "declined";

function actorFromUser(user: StudioUser) {
  return {
    role: user.roles.includes("client") ? ("customer" as const) : ("staff" as const),
    userId: user.id,
    displayName: user.displayName,
  };
}

function isTerminalProjectChangeRequest(request: InformationUpdateRequest): boolean {
  return request.status === "rejected" || request.status === "applied";
}

export function validateProjectChangeConsentEligibility(
  request: InformationUpdateRequest,
  response: ProjectChangeConsentResponse,
): { ok: true } | { ok: false; error: string; status: number } {
  if (request.classification !== "project_change") {
    return { ok: false, error: "Only project change requests accept consent responses.", status: 400 };
  }

  if (!request.projectChangeExceptionId?.trim()) {
    return { ok: false, error: "Project change link is missing.", status: 409 };
  }

  if (request.ownerDecision !== "approval_requested") {
    return {
      ok: false,
      error: "The Studio has not requested your confirmation for this change.",
      status: 409,
    };
  }

  if (isTerminalProjectChangeRequest(request)) {
    return { ok: false, error: "This project change request is already closed.", status: 409 };
  }

  if (request.consentStatus === "granted" || request.consentStatus === "declined") {
    if (request.consentStatus === response) {
      return { ok: true };
    }
    return {
      ok: false,
      error: "A different consent response was already recorded.",
      status: 409,
    };
  }

  if (request.consentStatus !== "pending") {
    return { ok: false, error: "No pending consent request for this project change.", status: 409 };
  }

  return { ok: true };
}

export function isIdempotentConsentResponse(
  request: InformationUpdateRequest,
  response: ProjectChangeConsentResponse,
): boolean {
  return request.consentStatus === response && Boolean(request.consentRespondedAt);
}

export type PlanProjectChangeConsentActivityResult =
  | {
      ok: true;
      nextEnvelope: ProjectActivityEnvelope;
      request: InformationUpdateRequest;
      exceptionId: string;
      idempotent: boolean;
      skipWrite: boolean;
    }
  | { ok: false; error: string; status: number };

export function planProjectChangeConsentActivityResponse(params: {
  envelope: ProjectActivityEnvelope;
  request: InformationUpdateRequest;
  response: ProjectChangeConsentResponse;
  user: StudioUser;
}): PlanProjectChangeConsentActivityResult {
  const eligibility = validateProjectChangeConsentEligibility(params.request, params.response);
  if (!eligibility.ok) return eligibility;

  const exceptionId = params.request.projectChangeExceptionId!;
  const linkage = resolveProjectChangeLinkage(params.envelope, exceptionId);
  if (!linkage.ok) {
    return { ok: false, error: linkage.error, status: linkage.status };
  }
  if (linkage.mode !== "linked") {
    return {
      ok: false,
      error: "Project Activity link is missing for this project change.",
      status: 409,
    };
  }

  if (isIdempotentConsentResponse(params.request, params.response)) {
    return {
      ok: true,
      nextEnvelope: params.envelope,
      request: params.request,
      exceptionId,
      idempotent: true,
      skipWrite: true,
    };
  }

  const occurredAt = new Date().toISOString();
  const actor = actorFromUser(params.user);
  const sourceId = `${params.request.id}:customer_consent:${params.response}`;

  let updated: InformationUpdateRequest;
  if (params.response === "granted") {
    updated = {
      ...params.request,
      consentStatus: "granted",
      consentRespondedAt: occurredAt,
      status: "held",
    };
  } else {
    updated = {
      ...params.request,
      consentStatus: "declined",
      consentRespondedAt: occurredAt,
      status: "rejected",
      rejectionReason: "You declined this project change.",
    };
  }

  const index = params.envelope.requests.findIndex((request) => request.id === params.request.id);
  let next: ProjectActivityEnvelope = {
    ...params.envelope,
    requests: params.envelope.requests.map((request, i) => (i === index ? updated : request)),
    updatedAt: occurredAt,
    version: params.envelope.version + 1,
  };

  if (params.response === "granted") {
    next = appendActivityEvent(next, {
      kind: "customer_approval_granted",
      sourceType: "customer_consent",
      sourceId,
      actor,
      requestId: params.request.id,
      headline: "You confirmed this project change",
      detail: "Your confirmation was recorded. The Studio will review next steps.",
    });
  } else {
    next = appendActivityEvent(next, {
      kind: "customer_approval_declined",
      sourceType: "customer_consent",
      sourceId,
      actor,
      requestId: params.request.id,
      headline: "You declined this project change",
      detail: "Your response was recorded. This project change will not be applied.",
    });
    next = appendActivityEvent(next, {
      kind: "project_change_closed",
      sourceType: "customer_consent",
      sourceId: `${params.request.id}:project_change_closed:${exceptionId}`,
      actor,
      requestId: params.request.id,
      headline: "Project change closed",
      detail: "This project change will not be applied.",
    });
  }

  return {
    ok: true,
    nextEnvelope: next,
    request: updated,
    exceptionId,
    idempotent: false,
    skipWrite: false,
  };
}
