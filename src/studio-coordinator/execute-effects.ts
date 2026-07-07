import type { CampaignRecord } from "@/config/studio-board";
import type { RefundRequestSourceChannel } from "@/config/refund-request-channels";
import type { PlannedEffect } from "@/decision-core";
import {
  applyApproveClientRequest,
  applyAssignException,
  applyDeclinePromotion,
  applyRaiseException,
  applyResolveException,
  bridgeExceptionFromRevisionExhausted,
} from "@/lib/campaign-tasks/exceptions-actions";
import { applyClientSubmitRefundRequest } from "@/lib/campaign-tasks/refund-request-actions";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import { INTERACTION_EXCEPTION_MAPPINGS, resolveExceptionKindForEffect } from "./config";
import { appendJobActivityEvent } from "@/lib/job-control/activity-log";
import { enqueueJobCommunicationRecord, resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import type { JobActivityEventKind, JobCommunicationEventType, PurchasedJobRecord } from "@/lib/job-control/types";

import type {
  CoordinatorExecutionState,
  EffectExecutionContext,
} from "./types";

const ACTIVITY_NOTE_KIND: Record<string, JobActivityEventKind> = {
  client_revision_request: "client_revision_request",
  client_upload: "client_upload",
  client_delivery_approval: "client_delivery_approval",
};

function resolvePrimaryJob(
  state: CoordinatorExecutionState,
  jobId?: string,
): PurchasedJobRecord | undefined {
  const jobs = state.jobs;
  if (jobId) return jobs.find((entry) => entry.jobId === jobId) ?? jobs[0];
  return jobs[0];
}

function patchCampaignNote(campaign: CampaignRecord, note: string): CampaignRecord {
  return {
    ...campaign,
    studioNotes: [...(campaign.studioNotes ?? []), { date: "Today", message: note }],
    updatedAt: new Date().toISOString(),
  };
}

function patchJobRecord(
  job: PurchasedJobRecord,
  note: string,
): PurchasedJobRecord {
  if (note.includes("nonRefundable") && job.productionStartedAt) {
    return { ...job, nonRefundable: true, updatedAt: new Date().toISOString() };
  }
  return job;
}

function updateEnvelopeJob(
  envelope: CoordinatorExecutionState["envelope"],
  job: PurchasedJobRecord,
): CoordinatorExecutionState["envelope"] {
  const jobRecords = (envelope.jobRecords ?? []).map((entry) =>
    entry.jobId === job.jobId ? job : entry,
  );
  return { ...envelope, jobRecords, updatedAt: job.updatedAt };
}

function resolveRaiseExceptionTitle(
  exceptionKind: CampaignExceptionKind,
  interactionKind?: string,
): string {
  const mapped = INTERACTION_EXCEPTION_MAPPINGS.find(
    (entry) => entry.exceptionKind === exceptionKind,
  );
  if (mapped) return mapped.title;
  if (interactionKind === "scope_request") return "Client scope request";
  if (exceptionKind === "revision_exhausted") return "Revision allowance exhausted";
  return "Client escalation";
}

export type ExecuteEffectsResult = {
  state: CoordinatorExecutionState;
  executed: PlannedEffect[];
  skipped: PlannedEffect[];
  errors: string[];
};

export function executeEffects(
  effects: readonly PlannedEffect[],
  state: CoordinatorExecutionState,
  context: EffectExecutionContext,
): ExecuteEffectsResult {
  let nextState = state;
  const executed: PlannedEffect[] = [];
  const skipped: PlannedEffect[] = [];
  const errors: string[] = [];

  for (const effect of effects) {
    try {
      switch (effect.kind) {
        case "record_incoming_interaction":
          executed.push(effect);
          break;

        case "append_activity_event": {
          const job = resolvePrimaryJob(nextState, context.jobId);
          if (!job) {
            skipped.push(effect);
            break;
          }
          const kind = ACTIVITY_NOTE_KIND[effect.note] ?? "internal_note";
          const events = appendJobActivityEvent(nextState.envelope.jobActivityEvents ?? [], {
            campaignId: job.campaignId,
            jobId: job.jobId,
            kind,
            occurredAt: context.occurredAt,
            actor: {
              role: "client",
              userId: context.user.id,
              displayName: context.user.displayName ?? "Client",
            },
            reason: effect.note,
          });
          nextState = {
            ...nextState,
            envelope: { ...nextState.envelope, jobActivityEvents: events },
          };
          executed.push(effect);
          break;
        }

        case "campaign_record_patch": {
          nextState = {
            ...nextState,
            campaign: patchCampaignNote(nextState.campaign, effect.note),
          };
          executed.push(effect);
          break;
        }

        case "job_record_patch": {
          const job = resolvePrimaryJob(nextState, context.jobId);
          if (!job) {
            skipped.push(effect);
            break;
          }
          const patched = patchJobRecord(job, effect.note);
          nextState = {
            ...nextState,
            jobs: nextState.jobs.map((entry) =>
              entry.jobId === patched.jobId ? patched : entry,
            ),
            envelope: updateEnvelopeJob(nextState.envelope, patched),
          };
          executed.push(effect);
          break;
        }

        case "enqueue_communication": {
          if (effect.communicationId) {
            const exists = (nextState.envelope.jobCommunicationRecords ?? []).some(
              (record) => record.id === effect.communicationId,
            );
            if (exists) {
              executed.push(effect);
              break;
            }
          }

          const job = resolvePrimaryJob(nextState, context.jobId);
          if (!job || !effect.eventType) {
            if (effect.communicationId) {
              executed.push(effect);
              break;
            }
            skipped.push(effect);
            break;
          }
          const clientId =
            context.clientId ??
            resolveCampaignCommunicationClientId(undefined, nextState.campaign.campaignId);
          const envelope = enqueueJobCommunicationRecord(nextState.envelope, {
            eventType: effect.eventType as JobCommunicationEventType,
            job,
            campaign: nextState.campaign,
            clientId,
            occurredAt: context.occurredAt,
            idempotencyKey: effect.communicationId ?? context.occurredAt,
          });
          const patchedJob = effect.eventType === "production_started"
            ? patchJobRecord(job, "nonRefundable")
            : job;
          nextState = {
            ...nextState,
            envelope,
            jobs: nextState.jobs.map((entry) =>
              entry.jobId === patchedJob.jobId ? patchedJob : entry,
            ),
          };
          if (patchedJob !== job) {
            nextState.envelope = updateEnvelopeJob(nextState.envelope, patchedJob);
          }
          executed.push(effect);
          break;
        }

        case "submit_refund_request": {
          const job = resolvePrimaryJob(nextState, context.jobId);
          if (!job) {
            errors.push("submit_refund_request: job not found.");
            skipped.push(effect);
            break;
          }
          const result = applyClientSubmitRefundRequest(
            nextState.envelope,
            {
              jobId: job.jobId,
              reason: effect.reason,
              requestedOutcome: effect.requestedOutcome,
              supportingDetails: effect.supportingDetails,
              sourceChannel:
                typeof effect.sourceChannel === "string"
                  ? (effect.sourceChannel as RefundRequestSourceChannel)
                  : undefined,
            },
            context.user,
          );
          if (!result.ok) {
            errors.push(`submit_refund_request: ${result.error}`);
            skipped.push(effect);
            break;
          }
          nextState = { ...nextState, envelope: result.envelope };
          executed.push(effect);
          break;
        }

        case "raise_exception": {
          const exceptionKind = resolveExceptionKindForEffect({
            exceptionKind: effect.exceptionKind,
            interactionKind: context.interactionKind,
          });
          if (!exceptionKind) {
            errors.push("raise_exception: could not resolve exception kind.");
            skipped.push(effect);
            break;
          }

          if (exceptionKind === "revision_exhausted") {
            const job = resolvePrimaryJob(nextState, context.jobId);
            const taskId =
              context.taskId ??
              (job
                ? nextState.envelope.tasks?.find((task) =>
                    task.relatedServiceIds.includes(job.skuId as never),
                  )?.id
                : undefined) ??
              job?.jobId ??
              nextState.campaign.campaignId;

            const envelope = bridgeExceptionFromRevisionExhausted(
              nextState.envelope,
              taskId,
              nextState.campaign,
              context.user,
              context.assignments,
            );
            nextState = { ...nextState, envelope };
            executed.push(effect);
            break;
          }

          const raiseResult = applyRaiseException(
            nextState.envelope,
            {
              kind: exceptionKind,
              title: resolveRaiseExceptionTitle(exceptionKind, context.interactionKind),
              description: `Recorded by Studio Coordinator from client interaction.`,
            },
            context.user,
            context.assignments,
          );
          if (!raiseResult.ok) {
            errors.push(raiseResult.error);
            skipped.push(effect);
            break;
          }
          nextState = { ...nextState, envelope: raiseResult.envelope };
          executed.push(effect);
          break;
        }

        case "resolve_exception": {
          if (!context.payload?.exceptionId) {
            skipped.push(effect);
            break;
          }
          const resolveResult = applyResolveException(
            nextState.envelope,
            {
              exceptionId: String(context.payload.exceptionId),
              resolutionNotes:
                typeof context.payload.resolutionNotes === "string"
                  ? context.payload.resolutionNotes
                  : effect.note,
            },
            context.user,
            context.assignments,
            nextState.materials,
          );
          if (!resolveResult.ok) {
            errors.push(resolveResult.error);
            skipped.push(effect);
            break;
          }
          nextState = { ...nextState, envelope: resolveResult.envelope };
          executed.push(effect);
          break;
        }

        case "task_workflow_block":
          skipped.push(effect);
          break;

        default:
          skipped.push(effect);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Effect execution failed.");
      skipped.push(effect);
    }
  }

  return { state: nextState, executed, skipped, errors };
}

export function executeOwnerAction(
  state: CoordinatorExecutionState,
  context: EffectExecutionContext & {
    action: "resolve_exception" | "approve_client_request" | "assign_exception" | "decline_promotion";
    exceptionId: string;
    payload?: Record<string, unknown>;
  },
): ExecuteEffectsResult {
  const executed: PlannedEffect[] = [];
  const skipped: PlannedEffect[] = [];
  const errors: string[] = [];
  let nextState = state;

  switch (context.action) {
    case "resolve_exception": {
      const result = applyResolveException(
        nextState.envelope,
        {
          exceptionId: context.exceptionId,
          resolutionNotes:
            typeof context.payload?.resolutionNotes === "string"
              ? context.payload.resolutionNotes
              : undefined,
        },
        context.user,
        context.assignments,
        nextState.materials,
      );
      if (!result.ok) {
        errors.push(result.error);
      } else {
        nextState = { ...nextState, envelope: result.envelope };
        executed.push({ kind: "resolve_exception", note: "owner_resolve" });
      }
      break;
    }
    case "approve_client_request": {
      if (!nextState.materialsEnvelope) {
        errors.push("Materials envelope is required to approve a client request.");
        break;
      }
      const result = applyApproveClientRequest(
        nextState.envelope,
        {
          exceptionId: context.exceptionId,
          category: context.payload?.category as never,
          contentKind: context.payload?.contentKind as never,
          clientFacingLabel: String(context.payload?.clientFacingLabel ?? ""),
          clientFacingPrompt: String(context.payload?.clientFacingPrompt ?? ""),
          whyNeeded: String(context.payload?.whyNeeded ?? ""),
          requirementLevel: (context.payload?.requirementLevel as never) ?? "required",
        },
        context.user,
        context.assignments,
        nextState.materialsEnvelope,
      );
      if (!result.ok) {
        errors.push(result.error);
      } else {
        nextState = {
          ...nextState,
          envelope: result.envelope,
          materialsEnvelope: result.materialsEnvelope ?? nextState.materialsEnvelope,
        };
        executed.push({ kind: "resolve_exception", note: "owner_approve_client_request" });
      }
      break;
    }
    case "assign_exception": {
      const result = applyAssignException(
        nextState.envelope,
        {
          exceptionId: context.exceptionId,
          assignToUserId:
            typeof context.payload?.assignToUserId === "string"
              ? context.payload.assignToUserId
              : undefined,
          notes:
            typeof context.payload?.notes === "string" ? context.payload.notes : undefined,
        },
        context.user,
        context.assignments,
      );
      if (!result.ok) {
        errors.push(result.error);
      } else {
        nextState = { ...nextState, envelope: result.envelope };
        executed.push({ kind: "resolve_exception", note: "owner_assign" });
      }
      break;
    }
    case "decline_promotion": {
      const result = applyDeclinePromotion(
        nextState.envelope,
        {
          exceptionId: context.exceptionId,
          notes: typeof context.payload?.notes === "string" ? context.payload.notes : undefined,
        },
        context.user,
        context.assignments,
      );
      if (!result.ok) {
        errors.push(result.error);
      } else {
        nextState = { ...nextState, envelope: result.envelope };
        executed.push({ kind: "resolve_exception", note: "owner_decline_promotion" });
      }
      break;
    }
  }

  return { state: nextState, executed, skipped, errors };
}
