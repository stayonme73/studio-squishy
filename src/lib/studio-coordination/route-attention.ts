/**
 * Read-only routing for synthetic coordination.
 * Uses existing Owner-desk and escalation rules. Does not write jobs or send alerts.
 */
import type { CampaignStatus } from "@/config/studio-board";
import { exceptionKindProducerResolvable } from "@/config/campaign-exceptions";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import { resolveNextRequiredAction } from "@/lib/campaign-tasks/exceptions-view";
import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";
import { resolveOwnerDeskItems } from "@/lib/job-control/owner-desk";
import { isTerminalSpineStatus, mapCampaignStatusToSpine } from "@/lib/job-control/status-spine";
import type { JobSpineStatus, PurchasedJobRecord } from "@/lib/job-control/types";
import {
  ownerEscalationForException,
  ownerEscalationForQualityCategory,
  ownerEscalationForRoutineOperationalEvent,
} from "@/lib/studio-kitchen-comms/owner-escalation";

import {
  qualityAttentionKey,
  qualityOwnerAttentionReason,
  qualityOwnerAttentionReasonForException,
} from "./quality-owner-attention";

export type CoordinationJobState = {
  jobId: string;
  skuId: string;
  spineStatus: JobSpineStatus;
  ownerApprovalPending?: "before_review" | "before_delivery" | null;
};

export type CoordinationTaskState = {
  taskId: string;
  phase: string | null;
  workflowState: string | null;
};

export type CoordinationQualityFinding = {
  taskId: string;
  action: "qa_pass" | "qa_fail" | "qa_block";
  category?: string | null;
};

export type CoordinationAttentionInput = {
  campaignId: string;
  campaignStatus: CampaignStatus | null;
  jobs: readonly CoordinationJobState[];
  tasks: readonly CoordinationTaskState[];
  qualityFindings: readonly CoordinationQualityFinding[];
  exceptions: readonly CampaignExceptionRecord[];
  ownerDecisionInteractions?: readonly OwnerDecisionInteractionRecord[];
};

export type CoordinationRoute = {
  source: string;
  classification: "routine" | "owner_decision" | "milestone" | "none";
  verdict: "owner_required" | "owner_not_required" | "owner_authority_unclear" | "none";
  proposedDestination: "production" | "machine" | "owner_desk" | "owner_review" | "none";
  ownerDeskReason: string | null;
  attentionKey?: string;
  evidence: string;
  notificationSent: false;
  jobChanged: false;
};

export type CoordinationAttention = {
  routes: CoordinationRoute[];
  ownerAlerts: CoordinationRoute[];
  routineRoutes: CoordinationRoute[];
  milestones: CoordinationRoute[];
  notificationSent: false;
  jobChanged: false;
};

function route(fields: Omit<CoordinationRoute, "notificationSent" | "jobChanged">): CoordinationRoute {
  return { ...fields, notificationSent: false, jobChanged: false };
}

function deskJobs(input: CoordinationAttentionInput): PurchasedJobRecord[] {
  return input.jobs.map(
    (job) =>
      ({
        jobId: job.jobId,
        campaignId: input.campaignId,
        skuId: job.skuId,
        serviceName: job.skuId,
        spineStatus: job.spineStatus,
        productionLane: "standard",
        intakeComplete: true,
        ownerApprovalPending: job.ownerApprovalPending ?? null,
        updatedAt: "1970-01-01T00:00:00.000Z",
      }) as PurchasedJobRecord,
  );
}

export function routeCoordinationAttention(input: CoordinationAttentionInput): CoordinationAttention {
  const routes: CoordinationRoute[] = [];
  const desk = resolveOwnerDeskItems([
    {
      campaignId: input.campaignId,
      campaignName: input.campaignId,
      jobs: deskJobs(input),
      exceptions: input.exceptions,
      laneViews: [],
      ownerDecisionInteractions: input.ownerDecisionInteractions ?? [],
    },
  ]);
  const deskIds = new Set(desk.map((item) => item.id));

  for (const exception of input.exceptions) {
    const verdict = ownerEscalationForException(exception);
    const deskItem = desk.find((item) => item.id === `desk:exception:${exception.id}`);
    if (verdict === "owner_required" && deskItem && deskIds.has(deskItem.id)) {
      routes.push(
        route({
          source: `exception:${exception.id}`,
          classification: "owner_decision",
          verdict,
          proposedDestination: "owner_desk",
          ownerDeskReason: deskItem.reason,
          evidence: `Exception ${exception.kind} is ${exception.status}. Existing Owner desk reason is ${deskItem.reason}.`,
        }),
      );
      continue;
    }
    const heldReason = qualityOwnerAttentionReasonForException(exception.kind);
    if (verdict === "owner_required" && heldReason) {
      routes.push(
        route({
          source: exception.taskId ? `quality:${exception.taskId}` : `exception:${exception.id}`,
          classification: "owner_decision",
          verdict,
          proposedDestination: "owner_desk",
          ownerDeskReason: heldReason,
          attentionKey: qualityAttentionKey(heldReason, exception.taskId ?? `exception:${exception.id}`),
          evidence: `Exception ${exception.kind} is ${exception.status}. Owner decision is ${heldReason}. The existing hold remains until the authorized decision process resolves it. This signal is not approval to resume work.`,
        }),
      );
      continue;
    }
    if (verdict === "owner_not_required" || exceptionKindProducerResolvable(exception.kind)) {
      routes.push(
        route({
          source: `exception:${exception.id}`,
          classification: "routine",
          verdict: "owner_not_required",
          proposedDestination: "production",
          ownerDeskReason: null,
          evidence: `Exception ${exception.kind} is ${exception.status}. Existing next action: ${resolveNextRequiredAction(exception)}.`,
        }),
      );
      continue;
    }
    if (verdict === "owner_authority_unclear") {
      routes.push(
        route({
          source: `exception:${exception.id}`,
          classification: "none",
          verdict,
          proposedDestination: "none",
          ownerDeskReason: null,
          evidence: `Exception ${exception.kind} is ${exception.status}. Existing authority is unclear, so it was not placed on the Owner desk.`,
        }),
      );
    }
  }

  for (const job of input.jobs) {
    if (job.ownerApprovalPending === "before_review" || job.ownerApprovalPending === "before_delivery") {
      const deskItem = desk.find((item) => item.jobId === job.jobId && item.reason.startsWith("approval_"));
      if (deskItem) {
        routes.push(
          route({
            source: `job:${job.jobId}`,
            classification: "owner_decision",
            verdict: "owner_required",
            proposedDestination: "owner_desk",
            ownerDeskReason: deskItem.reason,
            evidence: `Stored owner approval gate ${job.ownerApprovalPending} is Owner desk reason ${deskItem.reason}.`,
          }),
        );
      }
    }

    if (input.campaignStatus) {
      const customerFacing = mapCampaignStatusToSpine(input.campaignStatus);
      if (customerFacing !== job.spineStatus) {
        routes.push(
          route({
            source: `job:${job.jobId}:status`,
            classification: "routine",
            verdict: ownerEscalationForRoutineOperationalEvent(),
            proposedDestination: "machine",
            ownerDeskReason: null,
            evidence: `Customer-facing status ${input.campaignStatus} maps to ${customerFacing}. Stored Machine spine is ${job.spineStatus}.`,
          }),
        );
      }
    }

    if (isTerminalSpineStatus(job.spineStatus)) {
      routes.push(
        route({
          source: `job:${job.jobId}:milestone`,
          classification: "milestone",
          verdict: "none",
          proposedDestination: "none",
          ownerDeskReason: null,
          evidence: `Machine spine ${job.spineStatus} is a terminal milestone. No Owner alert was created.`,
        }),
      );
    }
  }

  for (const task of input.tasks) {
    if (task.workflowState !== "needs_revision") continue;
    routes.push(
      route({
        source: `task:${task.taskId}`,
        classification: "routine",
        verdict: ownerEscalationForRoutineOperationalEvent(),
        proposedDestination: "production",
        ownerDeskReason: null,
        evidence: `Task ${task.taskId} phase ${task.phase ?? "unknown"} is needs_revision. Quality categories that require Owner are unchanged.`,
      }),
    );
  }

  for (const finding of input.qualityFindings) {
    if (finding.action === "qa_pass") continue;
    const verdict = ownerEscalationForQualityCategory(finding.category);
    const heldReason = verdict === "owner_required" ? qualityOwnerAttentionReason(finding.category) : null;
    if (heldReason) {
      routes.push(
        route({
          source: `quality:${finding.taskId}`,
          classification: "owner_decision",
          verdict,
          proposedDestination: "owner_desk",
          ownerDeskReason: heldReason,
          attentionKey: qualityAttentionKey(heldReason, finding.taskId),
          evidence:
            heldReason === "compliance_hold"
              ? `Quality ${finding.action} on ${finding.taskId} is a compliance hold. The hold remains until the authorized decision process resolves it. This signal is not approval to resume work.`
              : `Quality ${finding.action} on ${finding.taskId} is a direction disagreement. This signal is not approval to resume work.`,
        }),
      );
      continue;
    }
    routes.push(
      route({
        source: `quality:${finding.taskId}:${finding.action}`,
        classification: verdict === "owner_required" ? "owner_decision" : "routine",
        verdict,
        proposedDestination: verdict === "owner_required" ? "owner_review" : "production",
        ownerDeskReason: null,
        evidence:
          verdict === "owner_required"
            ? `Quality action ${finding.action} category ${finding.category ?? "none"} on ${finding.taskId}. Existing Quality rule requires Owner review. No Owner reason code matches this category.`
            : `Quality action ${finding.action} category ${finding.category ?? "none"} on ${finding.taskId}. Existing Quality rule keeps this with production.`,
      }),
    );
  }

  return {
    routes,
    ownerAlerts: routes.filter((item) => item.proposedDestination === "owner_desk"),
    routineRoutes: routes.filter((item) => item.classification === "routine"),
    milestones: routes.filter((item) => item.classification === "milestone"),
    notificationSent: false,
    jobChanged: false,
  };
}
