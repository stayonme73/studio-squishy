import { isOpenExceptionStatus } from "@/lib/campaign-tasks/exceptions";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";

import {
  classifyOutboxDisposition,
  outboxDispositionLabel,
} from "./outbox-disposition";
import {
  ownerEscalationForException,
  ownerEscalationForOwnerInteraction,
  ownerEscalationForRoutineOperationalEvent,
} from "./owner-escalation";
import type {
  KitchenCommsLedger,
  KitchenCommsRecipient,
  KitchenOperationalEvent,
} from "./types";

function sortByTimeDesc(events: KitchenOperationalEvent[]): KitchenOperationalEvent[] {
  return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function recipientsForRole(role: string | undefined): KitchenCommsRecipient[] {
  if (!role) {
    return [{ kind: "unassigned", note: "Recipient role unavailable" }];
  }
  if (role === "owner") return [{ kind: "owner" }];
  if (role === "client_input") return [{ kind: "client" }];
  return [{ kind: "production_role", role: role as never }];
}

function fromHandoffs(envelope: ServerTasksEnvelope): KitchenOperationalEvent[] {
  return (envelope.handoffs ?? []).map((handoff) => {
    const recipients: KitchenCommsRecipient[] = [
      { kind: "production_role", role: handoff.toRole },
      { kind: "manager" },
    ];
    return {
      eventId: `handoff:${handoff.id}`,
      occurredAt: handoff.createdAt,
      campaignId: envelope.campaignId,
      jobId: null,
      taskId: handoff.taskId,
      workPacketId: null,
      category: "handoff" as const,
      eventType: "handoff_created",
      sourceComponent: "campaign-tasks/handoffs",
      initiatingActor: {
        role: handoff.fromRole,
        userId: handoff.fromUserId,
        displayName: handoff.fromDisplayName,
      },
      recipients,
      visibility: "internal_only" as const,
      actionKind: "role_action" as const,
      lifecycle: "historical" as const,
      ownerEscalation: ownerEscalationForRoutineOperationalEvent(),
      actionRequired: false,
      resolved: true,
      internalSummary: `${handoff.fromRole} → ${handoff.toRole}: ${handoff.completedSummary}`,
      customerSafeSummary: null,
      correlation: { handoffId: handoff.id },
      references: {},
      uncertainty: null,
    };
  });
}

function fromQa(envelope: ServerTasksEnvelope): KitchenOperationalEvent[] {
  return (envelope.qaRecords ?? []).map((qa) => {
    const failed = qa.action === "qa_fail" || qa.action === "qa_block";
    const routedRole = qa.routedTaskId
      ? envelope.tasks.find((task) => task.id === qa.routedTaskId)?.responsibleRole
      : envelope.tasks.find((task) => task.id === qa.taskId)?.responsibleRole;
    const ownerEscalation =
      qa.category === "direction_disagreement" || qa.category === "compliance_concern"
        ? ("owner_required" as const)
        : ownerEscalationForRoutineOperationalEvent();

    return {
      eventId: `qa:${qa.id}`,
      occurredAt: qa.createdAt,
      campaignId: envelope.campaignId,
      jobId: null,
      taskId: qa.taskId,
      workPacketId: null,
      category: "qa" as const,
      eventType: qa.action,
      sourceComponent: "campaign-tasks/qa",
      initiatingActor: {
        role: qa.actorRole,
        userId: qa.actorUserId,
        displayName: qa.actorDisplayName,
      },
      recipients: failed
        ? [
            ...recipientsForRole(routedRole),
            ...(ownerEscalation === "owner_required"
              ? ([{ kind: "owner" }] as const)
              : ([{ kind: "manager" }] as const)),
          ]
        : [{ kind: "manager" as const }],
      visibility: "internal_only" as const,
      actionKind:
        ownerEscalation === "owner_required"
          ? ("owner_decision" as const)
          : failed
            ? ("role_action" as const)
            : ("information_only" as const),
      lifecycle: failed ? ("routed" as const) : ("resolved" as const),
      ownerEscalation,
      actionRequired: failed && ownerEscalation !== "owner_required",
      resolved: !failed,
      internalSummary: `QA ${qa.action}${qa.notes ? `: ${qa.notes}` : ""}`,
      customerSafeSummary: null,
      correlation: { qaRecordId: qa.id },
      references: {},
      uncertainty: null,
    };
  });
}

function fromExceptions(envelope: ServerTasksEnvelope): KitchenOperationalEvent[] {
  return (envelope.exceptionRecords ?? []).map((record) => {
    const open = isOpenExceptionStatus(record.status);
    const ownerEscalation = ownerEscalationForException(record);
    const resolved = record.status === "resolved" || record.status === "cancelled";
    const recipients: KitchenCommsRecipient[] = [];
    if (ownerEscalation === "owner_required") recipients.push({ kind: "owner" });
    else if (record.assignedToUserId) {
      recipients.push({
        kind: "unassigned",
        note: `Assigned staff ${record.assignedToDisplayName ?? record.assignedToUserId}`,
      });
    } else if (ownerEscalation === "owner_authority_unclear") {
      recipients.push({ kind: "manager" });
    } else {
      recipients.push({ kind: "manager" });
    }

    return {
      eventId: `exception:${record.id}`,
      occurredAt: record.updatedAt ?? record.createdAt,
      campaignId: envelope.campaignId,
      jobId: null,
      taskId: record.taskId ?? null,
      workPacketId: null,
      category: "escalation" as const,
      eventType: record.kind,
      sourceComponent: "campaign-tasks/exceptions",
      initiatingActor: {
        role: record.raisedByRole,
        userId: record.raisedByUserId,
        displayName: record.raisedByDisplayName,
      },
      recipients,
      visibility: "internal_only" as const,
      actionKind:
        ownerEscalation === "owner_required"
          ? ("owner_decision" as const)
          : open
            ? ("role_action" as const)
            : ("information_only" as const),
      lifecycle: resolved
        ? ("resolved" as const)
        : open
          ? ("routed" as const)
          : ("historical" as const),
      ownerEscalation,
      actionRequired: open && ownerEscalation !== "owner_authority_unclear",
      resolved,
      internalSummary: record.title ?? record.kind,
      customerSafeSummary: null,
      correlation: { exceptionId: record.id },
      references: { exceptionKind: record.kind },
      uncertainty:
        ownerEscalation === "owner_authority_unclear"
          ? "Existing rules do not establish whether owner authority is required."
          : null,
    };
  });
}

function fromOwnerInteractions(envelope: ServerTasksEnvelope): KitchenOperationalEvent[] {
  return (envelope.ownerDecisionInteractions ?? []).map((record) => {
    const ownerEscalation = ownerEscalationForOwnerInteraction(record);
    const resolved = record.status === "resolved";
    return {
      eventId: `owner-interaction:${record.id}`,
      occurredAt: record.updatedAt ?? record.createdAt,
      campaignId: envelope.campaignId,
      jobId: record.jobId ?? null,
      taskId: null,
      workPacketId: null,
      category: "escalation" as const,
      eventType: record.interactionKind,
      sourceComponent: "campaign-tasks/owner-decision-interactions",
      initiatingActor: { role: "client" },
      recipients:
        ownerEscalation === "owner_required"
          ? [{ kind: "owner" as const }]
          : [{ kind: "manager" as const }],
      visibility: "internal_only" as const,
      actionKind:
        ownerEscalation === "owner_required"
          ? ("owner_decision" as const)
          : ("manager_review" as const),
      lifecycle: resolved ? ("resolved" as const) : ("routed" as const),
      ownerEscalation,
      actionRequired: ownerEscalation === "owner_required",
      resolved,
      internalSummary: `${record.interactionKind}: ${record.clientMessage.slice(0, 160)}`,
      customerSafeSummary: "We received your message and are reviewing it.",
      correlation: { ownerInteractionId: record.id },
      references: {},
      uncertainty: null,
    };
  });
}

function fromOutbox(envelope: ServerTasksEnvelope): KitchenOperationalEvent[] {
  return (envelope.jobCommunicationRecords ?? []).map((record) => {
    const disposition = classifyOutboxDisposition(record);
    const awaiting = disposition === "awaiting_authorized_transport";
    const unknown = disposition === "unknown";

    return {
      eventId: `outbox:${record.id}`,
      occurredAt: record.createdAt,
      campaignId: envelope.campaignId,
      jobId: record.jobId,
      taskId: null,
      workPacketId: null,
      category: "communication_outbox" as const,
      eventType: record.eventType,
      sourceComponent: "job-control/communication",
      initiatingActor: {
        role: record.sender.role,
        userId: record.sender.userId,
        displayName: record.sender.displayName,
      },
      // pending_owner_send is transport, not Owner Desk. Uncertainty → manager/system, not Tagia.
      recipients: [
        { kind: "client" as const },
        { kind: "manager" as const },
      ],
      visibility: "customer_safe_candidate" as const,
      actionKind: "information_only" as const,
      lifecycle:
        record.deliveryStatus === "test_sent" ||
        record.deliveryStatus === "cancelled" ||
        record.deliveryStatus === "sent"
          ? ("resolved" as const)
          : awaiting
            ? ("routed" as const)
            : unknown && record.deliveryStatus === "pending_owner_send"
              ? ("routed" as const)
              : ("historical" as const),
      ownerEscalation: "owner_not_required" as const,
      actionRequired: false,
      resolved:
        record.deliveryStatus === "test_sent" || record.deliveryStatus === "cancelled",
      internalSummary: `${outboxDispositionLabel(disposition)} — ${record.reason}`,
      customerSafeSummary: record.messageContent,
      correlation: {
        communicationRecordId: record.id,
        activityEventId: record.activityEventId,
      },
      references: { communicationEventType: record.eventType },
      uncertainty: unknown
        ? "No established job-control template authority for this communication kind. Not treated as owner-required or transport-cleared."
        : null,
    };
  });
}

function fromActivity(envelope: ServerTasksEnvelope): KitchenOperationalEvent[] {
  return (envelope.jobActivityEvents ?? []).map((event) => {
    const isInternalNote = event.kind === "internal_note" || event.kind === "working_file_ref";
    const category =
      event.kind === "client_communication"
        ? ("communication_outbox" as const)
        : event.kind === "missing_material_request" || event.kind === "client_upload"
          ? ("materials" as const)
          : event.kind === "status_change" ||
              event.kind === "work_packet_assigned" ||
              event.kind === "work_packet_returned"
            ? ("production" as const)
            : event.kind === "review_notice" ||
                event.kind === "approval" ||
                event.kind === "delivery" ||
                event.kind === "owner_final_release"
              ? ("delivery_review" as const)
              : event.kind === "refund"
                ? ("policy_decision" as const)
                : ("production" as const);

    return {
      eventId: `activity:${event.id}`,
      occurredAt: event.occurredAt,
      campaignId: envelope.campaignId,
      jobId: event.jobId,
      taskId: null,
      workPacketId: null,
      category,
      eventType: event.kind,
      sourceComponent: "job-control/activity-log",
      initiatingActor: {
        role: event.actor.role,
        userId: event.actor.userId,
        displayName: event.actor.displayName,
      },
      recipients: isInternalNote
        ? ([{ kind: "manager" }] as const)
        : ([
            { kind: "manager" as const },
            ...(event.actor.role === "client" ? ([{ kind: "client" }] as const) : []),
          ] as const),
      visibility: isInternalNote
        ? ("internal_only" as const)
        : ("customer_safe_candidate" as const),
      actionKind: "information_only" as const,
      lifecycle: "historical" as const,
      ownerEscalation: ownerEscalationForRoutineOperationalEvent(),
      actionRequired: false,
      resolved: true,
      internalSummary: event.reason ?? event.messageContent ?? event.kind,
      customerSafeSummary: isInternalNote
        ? null
        : (event.messageContent ?? event.reason ?? null),
      correlation: { activityEventId: event.id },
      references: {
        activityKind: event.kind,
        spineStatus: event.spineStatus,
        communicationEventType: event.communicationEventType,
      },
      uncertainty: null,
    };
  });
}

function fromBlockedTasks(envelope: ServerTasksEnvelope): KitchenOperationalEvent[] {
  return envelope.tasks
    .filter(
      (task) =>
        task.workflowState === "blocked" || task.status === "blocked",
    )
    .map((task) => ({
      eventId: `task-blocked:${task.id}`,
      occurredAt: envelope.syncedAt,
      campaignId: envelope.campaignId,
      jobId: null,
      taskId: task.id,
      workPacketId: null,
      category: "production" as const,
      eventType: "task_blocked",
      sourceComponent: "campaign-tasks/tasks",
      initiatingActor: { role: "system" },
      recipients: [
        ...recipientsForRole(task.assignedRole ?? task.responsibleRole),
        { kind: "manager" as const },
      ],
      visibility: "internal_only" as const,
      actionKind: "role_action" as const,
      lifecycle: "in_progress" as const,
      ownerEscalation: ownerEscalationForRoutineOperationalEvent(),
      actionRequired: true,
      resolved: false,
      internalSummary: `Task blocked: ${task.title}${
        task.blockedReason ? ` — ${task.blockedReason}` : ""
      }`,
      customerSafeSummary: null,
      correlation: {},
      references: {},
      uncertainty: task.responsibleRole
        ? null
        : "Responsible role unavailable for blocked task.",
    }));
}

function fromMaterials(
  campaignId: string,
  materials: readonly CampaignMaterialItem[],
  syncedAt: string,
): KitchenOperationalEvent[] {
  return materials.filter(isBlockingMaterialItem).map((item) => ({
    eventId: `material-block:${item.id}`,
    occurredAt: item.reviewedAt ?? item.submittedAt ?? syncedAt,
    campaignId,
    jobId: null,
    taskId: null,
    workPacketId: null,
    category: "materials" as const,
    eventType: "material_blocking",
    sourceComponent: "materials",
    initiatingActor: { role: "system" },
    recipients: [
      { kind: "client" as const },
      { kind: "manager" as const },
    ],
    visibility: "customer_safe_candidate" as const,
    actionKind: "information_only" as const,
    lifecycle: "routed" as const,
    ownerEscalation: ownerEscalationForRoutineOperationalEvent(),
    actionRequired: false,
    resolved: false,
    internalSummary: `Blocking material: ${item.label}`,
    customerSafeSummary:
      item.clientFacingPrompt ?? "We still need required materials from you.",
    correlation: { materialItemId: item.id },
    references: {},
    uncertainty: null,
  }));
}

/**
 * Pure projection — reading does not write records.
 * One shared event list; active vs history distinguished by lifecycle/resolved.
 */
export function projectKitchenCommsLedger(input: {
  campaignId: string;
  tasksEnvelope: ServerTasksEnvelope | null;
  materials?: readonly CampaignMaterialItem[];
  refreshedAt?: string;
}): KitchenCommsLedger {
  const refreshedAt = input.refreshedAt ?? new Date().toISOString();
  if (!input.tasksEnvelope) {
    return {
      campaignId: input.campaignId,
      refreshedAt,
      active: [],
      history: [],
      ownerRequiredCount: 0,
      awaitingTransportCount: 0,
      unresolvedRoleActionCount: 0,
      ownerAuthorityUnclearCount: 0,
    };
  }

  const envelope = input.tasksEnvelope;
  const events = sortByTimeDesc([
    ...fromActivity(envelope),
    ...fromHandoffs(envelope),
    ...fromQa(envelope),
    ...fromExceptions(envelope),
    ...fromOwnerInteractions(envelope),
    ...fromOutbox(envelope),
    ...fromBlockedTasks(envelope),
    ...fromMaterials(input.campaignId, input.materials ?? [], envelope.syncedAt),
  ]);

  // Deduplicate by eventId — repeated projection must not invent duplicates.
  const seen = new Set<string>();
  const unique = events.filter((event) => {
    if (seen.has(event.eventId)) return false;
    seen.add(event.eventId);
    return true;
  });

  const active = unique.filter(
    (event) =>
      !event.resolved &&
      (event.actionRequired ||
        event.ownerEscalation === "owner_required" ||
        event.ownerEscalation === "owner_authority_unclear" ||
        (event.category === "communication_outbox" &&
          event.lifecycle === "routed" &&
          event.internalSummary.includes("awaiting delivery transport"))),
  );
  const activeIds = new Set(active.map((event) => event.eventId));
  const history = unique.filter((event) => !activeIds.has(event.eventId));

  return {
    campaignId: input.campaignId,
    refreshedAt,
    active,
    history,
    ownerRequiredCount: active.filter((event) => event.ownerEscalation === "owner_required")
      .length,
    awaitingTransportCount: unique.filter(
      (event) =>
        event.category === "communication_outbox" &&
        event.internalSummary.includes("awaiting delivery transport"),
    ).length,
    unresolvedRoleActionCount: active.filter(
      (event) => event.actionKind === "role_action" && event.actionRequired,
    ).length,
    ownerAuthorityUnclearCount: unique.filter(
      (event) => event.ownerEscalation === "owner_authority_unclear",
    ).length,
  };
}
