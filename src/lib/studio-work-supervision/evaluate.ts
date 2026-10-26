import {
  studioWorkSupervisionV1 as cfg,
  type StudioIncidentClass,
  type StudioSupervisionRole,
} from "@/config/studio-work-supervision-and-incident-escalation-v1";
import { isFailClosedSoldSku } from "@/config/studio-copy-kit-light-harden-v1";

import { customerMessageForIncident } from "./customer-message";
import type {
  JobSupervisionFacts,
  SupervisionEvaluation,
  SupervisionEvaluationInput,
  SupervisionIncident,
  SupervisionRecoveryAction,
} from "./types";

const ACTOR_RANK: Record<StudioSupervisionRole, number> = {
  customer: 0,
  studio_voice: 1,
  machine: 2,
  production_team_qa: 3,
  supervisor: 4,
  studio_manager: 5,
  owner: 6,
};

function actorFor(
  incidentClass: StudioIncidentClass,
  ownerAvailable: boolean,
  skuId?: string,
): {
  actor: StudioSupervisionRole;
  recovery: SupervisionRecoveryAction;
  ownerRequired: boolean;
  studioManagerRequired: boolean;
  ownerUnavailableHold: boolean;
} {
  if (incidentClass === "security_privacy_rights" || incidentClass === "owner_judgment") {
    if (!ownerAvailable) {
      return {
        actor: "supervisor",
        recovery: "hold_owner_unavailable",
        ownerRequired: true,
        studioManagerRequired: true,
        ownerUnavailableHold: true,
      };
    }
    return {
      actor: "owner",
      recovery: "escalate_owner",
      ownerRequired: true,
      studioManagerRequired: false,
      ownerUnavailableHold: false,
    };
  }
  if (incidentClass === "owner_unavailable_hold") {
    return {
      actor: "supervisor",
      recovery: "hold_owner_unavailable",
      ownerRequired: true,
      studioManagerRequired: true,
      ownerUnavailableHold: true,
    };
  }
  if (incidentClass === "recovery_exhausted") {
    if (isFailClosedSoldSku(skuId)) {
      return {
        actor: "machine",
        recovery: "fail_closed_refund",
        ownerRequired: false,
        studioManagerRequired: false,
        ownerUnavailableHold: false,
      };
    }
    if (!ownerAvailable) {
      return {
        actor: "supervisor",
        recovery: "hold_owner_unavailable",
        ownerRequired: true,
        studioManagerRequired: true,
        ownerUnavailableHold: true,
      };
    }
    return {
      actor: "owner",
      recovery: "escalate_owner",
      ownerRequired: true,
      studioManagerRequired: false,
      ownerUnavailableHold: false,
    };
  }
  if (incidentClass === "studio_manager_review") {
    return {
      actor: "studio_manager",
      recovery: "escalate_studio_manager",
      ownerRequired: false,
      studioManagerRequired: true,
      ownerUnavailableHold: false,
    };
  }
  if (incidentClass === "customer_action_required") {
    return {
      actor: "customer",
      recovery: "hold_and_inform_customer",
      ownerRequired: false,
      studioManagerRequired: false,
      ownerUnavailableHold: false,
    };
  }
  if (incidentClass === "system_stall") {
    return {
      actor: "supervisor",
      recovery: "enqueue_customer_notice",
      ownerRequired: false,
      studioManagerRequired: false,
      ownerUnavailableHold: false,
    };
  }
  if (incidentClass === "studio_production_defect") {
    return {
      actor: "production_team_qa",
      recovery: "continue_internal_correction",
      ownerRequired: false,
      studioManagerRequired: false,
      ownerUnavailableHold: false,
    };
  }
  return {
    actor: "machine",
    recovery: "retry_transport",
    ownerRequired: false,
    studioManagerRequired: false,
    ownerUnavailableHold: false,
  };
}

function classifyJob(
  job: JobSupervisionFacts,
  nowMs: number,
): StudioIncidentClass | null {
  if (job.securityPrivacyRightsHold) return "security_privacy_rights";
  if (job.studioManagerReviewRequired) return "studio_manager_review";
  if (job.ownerApprovalPending && !job.waitingOnCustomer) {
    return "owner_judgment";
  }
  if (job.waitingOnCustomer) return "customer_action_required";
  if (job.productionAttemptsUsed >= cfg.maxSeriousRecoveryAttempts && job.unresolvedQaFail) {
    return "recovery_exhausted";
  }
  if (job.pendingCustomerRevision && job.unresolvedQaFail) {
    return job.customerInformedOfIncident ? "studio_production_defect" : "system_stall";
  }
  if (job.unresolvedQaFail && job.productionAttemptsUsed < cfg.maxSeriousRecoveryAttempts) {
    return "studio_production_defect";
  }
  if (job.failedTransport || job.missingAuthorizedNotice) return "routine_policy";
  const last = job.lastActivityAt ? Date.parse(job.lastActivityAt) : NaN;
  const stalled =
    Number.isFinite(last) &&
    nowMs - last >= cfg.stallMs &&
    !job.waitingOnCustomer &&
    job.spineStatus !== "ready_for_review" &&
    job.spineStatus !== "approved" &&
    job.spineStatus !== "delivered";
  if (stalled) return "system_stall";
  return null;
}

function buildIncident(
  campaignId: string,
  job: JobSupervisionFacts,
  incidentClass: StudioIncidentClass,
  ownerAvailable: boolean,
): SupervisionIncident {
  const routing = actorFor(
    incidentClass === "owner_judgment" && !ownerAvailable
      ? "owner_unavailable_hold"
      : incidentClass,
    ownerAvailable,
    job.skuId,
  );
  const informedClass =
    routing.ownerUnavailableHold ? "owner_unavailable_hold" : incidentClass;
  const customerMustBeInformed =
    informedClass !== "routine_policy" || job.missingAuthorizedNotice;
  return {
    id: `${campaignId}:${job.jobId}:${informedClass}`,
    jobId: job.jobId,
    skuId: job.skuId,
    class: informedClass,
    actor: routing.actor,
    recovery: routing.recovery,
    customerMustBeInformed,
    customerMessage: customerMustBeInformed
      ? customerMessageForIncident({
          class: informedClass,
          serviceName: job.serviceName ?? job.skuId,
          skuId: job.skuId,
          recovery: routing.recovery,
          ownerUnavailable: routing.ownerUnavailableHold,
        })
      : null,
    ownerRequired: routing.ownerRequired,
    studioManagerRequired: routing.studioManagerRequired,
    ownerUnavailableHold: routing.ownerUnavailableHold,
    recoveryAttemptsUsed: job.productionAttemptsUsed,
    recoveryAttemptsMax: cfg.maxSeriousRecoveryAttempts,
    wouldAuthorizeSpend: false,
    wouldCallProvider: false,
    reason: `${informedClass} on ${job.skuId}`,
  };
}

function pickActiveActor(incidents: readonly SupervisionIncident[]): StudioSupervisionRole {
  return incidents.reduce<StudioSupervisionRole>((highest, incident) => {
    return ACTOR_RANK[incident.actor] > ACTOR_RANK[highest] ? incident.actor : highest;
  }, "machine");
}

export function evaluateWorkSupervision(
  input: SupervisionEvaluationInput,
): SupervisionEvaluation {
  const incidents: SupervisionIncident[] = [];

  for (const job of input.jobs) {
    const classified = classifyJob(job, input.nowMs);
    if (!classified) continue;
    incidents.push(
      buildIncident(input.campaignId, job, classified, input.ownerAvailable),
    );
  }

  const byJob = new Map<string, SupervisionIncident[]>();
  for (const incident of incidents) {
    const list = byJob.get(incident.jobId) ?? [];
    list.push(incident);
    byJob.set(incident.jobId, list);
  }

  const activeActorByJob: Record<string, StudioSupervisionRole> = {};
  const collapsed: SupervisionIncident[] = [];
  for (const [jobId, list] of byJob) {
    const actor = pickActiveActor(list);
    activeActorByJob[jobId] = actor;
    const chosen =
      list
        .filter((incident) => incident.actor === actor)
        .sort((a, b) => ACTOR_RANK[b.actor] - ACTOR_RANK[a.actor])[0] ?? list[0]!;
    collapsed.push(chosen);
  }

  return {
    campaignId: input.campaignId,
    incidents: collapsed,
    activeActorByJob,
    customerMessages: collapsed
      .map((incident) => incident.customerMessage)
      .filter((message): message is NonNullable<typeof message> => Boolean(message)),
    ownerEscalations: collapsed.filter(
      (incident) => incident.recovery === "escalate_owner",
    ),
    studioManagerReviews: collapsed.filter(
      (incident) =>
        incident.studioManagerRequired && incident.recovery !== "escalate_owner",
    ),
    ownerUnavailableHolds: collapsed.filter((incident) => incident.ownerUnavailableHold),
    wouldAuthorizeSpend: false,
    wouldCallProvider: false,
  };
}

export function latestSkuQaIsUnresolvedFail(
  qaRecords: readonly { taskId: string; createdAt: string; action: string }[],
  skuId: string,
): boolean {
  const records = qaRecords
    .filter((record) => record.taskId.includes(skuId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = records[records.length - 1];
  return last?.action === "qa_fail" || last?.action === "qa_block";
}
