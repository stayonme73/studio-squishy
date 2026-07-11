import type { StudioUser } from "@/lib/campaign-store/types";
import { appendActivityEvent } from "@/lib/project-activity/actions";
import type {
  InformationUpdateRequest,
  ProjectActivityEnvelope,
  ProjectChangeOwnerDecision,
} from "@/lib/project-activity/types";

export type ProjectChangeOwnerSyncAction =
  | "owner_approve_scope_change"
  | "owner_decline_scope_change"
  | "owner_hold_scope_change"
  | "owner_ask_client_approval_scope_change";

export const PROJECT_CHANGE_OWNER_SYNC_ACTIONS = new Set<ProjectChangeOwnerSyncAction>([
  "owner_approve_scope_change",
  "owner_decline_scope_change",
  "owner_hold_scope_change",
  "owner_ask_client_approval_scope_change",
]);

export function isProjectChangeOwnerSyncAction(
  action: string,
): action is ProjectChangeOwnerSyncAction {
  return PROJECT_CHANGE_OWNER_SYNC_ACTIONS.has(action as ProjectChangeOwnerSyncAction);
}

export function ownerSyncActionToDecision(
  action: ProjectChangeOwnerSyncAction,
): ProjectChangeOwnerDecision {
  switch (action) {
    case "owner_approve_scope_change":
      return "approved";
    case "owner_decline_scope_change":
      return "declined";
    case "owner_hold_scope_change":
      return "held";
    case "owner_ask_client_approval_scope_change":
      return "approval_requested";
  }
}

export function findLinkedProjectChangeRequest(
  envelope: ProjectActivityEnvelope,
  exceptionId: string,
): InformationUpdateRequest | undefined {
  return envelope.requests.find((request) => request.projectChangeExceptionId === exceptionId);
}

export function isPackage3EscalatedException(
  envelope: ProjectActivityEnvelope,
  exceptionId: string,
): boolean {
  return envelope.events.some(
    (event) =>
      event.kind === "project_change_escalated" && event.payload?.exceptionId === exceptionId,
  );
}

export type ProjectChangeLinkageResult =
  | { ok: true; mode: "legacy_unlinked" }
  | { ok: true; mode: "linked"; request: InformationUpdateRequest }
  | { ok: false; error: string; status: number };

export function resolveProjectChangeLinkage(
  envelope: ProjectActivityEnvelope,
  exceptionId: string,
): ProjectChangeLinkageResult {
  const linked = findLinkedProjectChangeRequest(envelope, exceptionId);
  if (linked) {
    const validation = validateLinkedProjectChangeRequest(linked, exceptionId);
    if (!validation.ok) return validation;
    return { ok: true, mode: "linked", request: linked };
  }

  if (isPackage3EscalatedException(envelope, exceptionId)) {
    return {
      ok: false,
      error: "Project Activity link is missing for this escalated project change.",
      status: 409,
    };
  }

  return { ok: true, mode: "legacy_unlinked" };
}

export function validateLinkedProjectChangeRequest(
  request: InformationUpdateRequest,
  exceptionId: string,
): { ok: true } | { ok: false; error: string; status: number } {
  if (request.projectChangeExceptionId !== exceptionId) {
    return {
      ok: false,
      error: "Project change link does not match the Owner Desk record.",
      status: 409,
    };
  }
  if (request.classification !== "project_change") {
    return {
      ok: false,
      error: "Linked request is not classified as a project change.",
      status: 409,
    };
  }
  if (!request.escalatedAt) {
    return {
      ok: false,
      error: "Project change must be escalated before Owner Desk outcomes can sync.",
      status: 409,
    };
  }
  return { ok: true };
}

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

function isIdempotentOwnerSync(
  request: InformationUpdateRequest,
  decision: ProjectChangeOwnerDecision,
): boolean {
  if (request.ownerDecision !== decision) return false;

  switch (decision) {
    case "declined":
      return request.status === "rejected";
    case "approval_requested":
      return request.consentStatus === "pending";
    case "approved":
    case "held":
      return Boolean(request.ownerDecisionAt);
    default:
      return false;
  }
}

function buildSyncedRequest(
  request: InformationUpdateRequest,
  decision: ProjectChangeOwnerDecision,
  occurredAt: string,
): InformationUpdateRequest {
  const base = {
    ...request,
    ownerDecision: decision,
    ownerDecisionAt: occurredAt,
  };

  switch (decision) {
    case "declined":
      return {
        ...base,
        status: "rejected",
        rejectionReason: "The Studio could not approve this project change request.",
      };
    case "held":
      return { ...base, status: "held" };
    case "approval_requested":
      return {
        ...base,
        status: "held",
        consentStatus: "pending",
        consentRequestedAt: occurredAt,
      };
    case "approved":
      return {
        ...base,
        status: "held",
        consentStatus: request.consentStatus === "pending" ? "pending" : request.consentStatus ?? "none",
      };
  }
}

function appendOwnerSyncEvents(
  envelope: ProjectActivityEnvelope,
  params: {
    requestId: string;
    exceptionId: string;
    decision: ProjectChangeOwnerDecision;
    occurredAt: string;
    user: StudioUser;
    clientMessage?: string;
  },
): ProjectActivityEnvelope {
  const actor = actorFromUser(params.user);
  const ownerSourceId = `${params.requestId}:owner_decision:${params.decision}:${params.exceptionId}`;

  let next = appendActivityEvent(envelope, {
    kind: "owner_decision_recorded",
    sourceType: "owner_decision",
    sourceId: ownerSourceId,
    actor,
    requestId: params.requestId,
    headline: "Owner decision recorded",
    payload: {
      decision: params.decision,
      exceptionId: params.exceptionId,
    },
  });

  if (params.decision === "declined") {
    next = appendActivityEvent(next, {
      kind: "project_change_closed",
      sourceType: "owner_decision",
      sourceId: `${params.requestId}:project_change_closed:${params.exceptionId}`,
      actor,
      requestId: params.requestId,
      headline: "Project change closed",
      detail: "The Studio could not approve this project change request.",
    });
  }

  if (params.decision === "approval_requested") {
    next = appendActivityEvent(next, {
      kind: "customer_approval_requested",
      sourceType: "owner_decision",
      sourceId: `${params.requestId}:customer_approval_requested:${params.exceptionId}`,
      actor,
      requestId: params.requestId,
      headline: "The Studio needs your confirmation",
      detail: params.clientMessage?.trim() || undefined,
    });
  }

  return next;
}

export type PlanProjectChangeOwnerActivityResult =
  | {
      ok: true;
      nextEnvelope: ProjectActivityEnvelope;
      request: InformationUpdateRequest;
      idempotent: boolean;
      skipWrite: boolean;
    }
  | { ok: false; error: string; status: number };

export function planProjectChangeOwnerActivitySync(params: {
  envelope: ProjectActivityEnvelope;
  request: InformationUpdateRequest;
  exceptionId: string;
  action: ProjectChangeOwnerSyncAction;
  user: StudioUser;
  clientMessage?: string;
}): PlanProjectChangeOwnerActivityResult {
  const validation = validateLinkedProjectChangeRequest(params.request, params.exceptionId);
  if (!validation.ok) return validation;

  const decision = ownerSyncActionToDecision(params.action);

  if (isIdempotentOwnerSync(params.request, decision)) {
    return {
      ok: true,
      nextEnvelope: params.envelope,
      request: params.request,
      idempotent: true,
      skipWrite: true,
    };
  }

  if (isTerminalProjectChangeRequest(params.request)) {
    return {
      ok: false,
      error: "Project change request is already closed.",
      status: 409,
    };
  }

  if (params.action === "owner_approve_scope_change") {
    if (params.request.consentStatus === "pending") {
      return {
        ok: false,
        error: "Customer consent is still pending.",
        status: 409,
      };
    }
    if (
      params.request.consentStatus === "granted" &&
      params.request.ownerDecision === "approval_requested"
    ) {
      return {
        ok: false,
        error: "Apply this project change with a typed catalog delta.",
        status: 409,
      };
    }
  }

  if (params.action === "owner_ask_client_approval_scope_change") {
    const message = params.clientMessage?.trim();
    if (!message) {
      return {
        ok: false,
        error: "Approved client-facing wording is required.",
        status: 400,
      };
    }
  }

  const occurredAt = new Date().toISOString();
  const updated = buildSyncedRequest(params.request, decision, occurredAt);
  const index = params.envelope.requests.findIndex((request) => request.id === params.request.id);

  let next: ProjectActivityEnvelope = {
    ...params.envelope,
    requests: params.envelope.requests.map((request, i) => (i === index ? updated : request)),
    updatedAt: occurredAt,
    version: params.envelope.version + 1,
  };

  next = appendOwnerSyncEvents(next, {
    requestId: params.request.id,
    exceptionId: params.exceptionId,
    decision,
    occurredAt,
    user: params.user,
    clientMessage: params.clientMessage,
  });

  return {
    ok: true,
    nextEnvelope: next,
    request: updated,
    idempotent: false,
    skipWrite: false,
  };
}
