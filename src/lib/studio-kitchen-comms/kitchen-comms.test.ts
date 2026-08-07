import { describe, expect, it, vi } from "vitest";

import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { JOB_COMMUNICATION_TEMPLATES } from "@/lib/job-control/communication";
import type { JobCommunicationRecord } from "@/lib/job-control/types";

import {
  classifyOutboxDisposition,
  isJobControlTemplateCommunicationEventType,
} from "./outbox-disposition";
import {
  ownerEscalationForException,
  ownerEscalationForOwnerInteraction,
} from "./owner-escalation";
import { projectKitchenCommsLedger } from "./project-events";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

function envelope(partial: Partial<ServerTasksEnvelope>): ServerTasksEnvelope {
  return {
    campaignId: "camp-1",
    planFingerprint: "fp",
    syncedAt: "2026-08-07T18:00:00.000Z",
    updatedAt: "2026-08-07T18:00:00.000Z",
    version: 12,
    tasks: [],
    ...partial,
  } as ServerTasksEnvelope;
}

describe("KITCHEN-COMMS-1", () => {
  it("maps every job-control template kind from existing JOB_COMMUNICATION_TEMPLATES authority", () => {
    for (const eventType of Object.keys(JOB_COMMUNICATION_TEMPLATES)) {
      expect(isJobControlTemplateCommunicationEventType(eventType)).toBe(true);
      expect(
        classifyOutboxDisposition({
          eventType: eventType as JobCommunicationRecord["eventType"],
          deliveryStatus: "pending_owner_send",
        }),
      ).toBe("awaiting_authorized_transport");
    }
  });

  it("does not treat pending_owner_send alone as owner-required", () => {
    expect(
      classifyOutboxDisposition({
        eventType: "production_started",
        deliveryStatus: "pending_owner_send",
      }),
    ).toBe("awaiting_authorized_transport");

    const ledger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: envelope({
        jobCommunicationRecords: [
          {
            id: "c1",
            campaignId: "camp-1",
            clientId: "client-1",
            jobId: "camp-1:sku",
            skuId: "v2-rtu-flyer",
            serviceName: "Flyer",
            eventType: "production_started",
            templateId: "comm.production_started.v1",
            channel: "in_app_outbox",
            sender: { role: "system" },
            reason: "Production started",
            messageContent: "Production has started.",
            deliveryStatus: "pending_owner_send",
            createdAt: "2026-08-07T17:50:00.000Z",
            updatedAt: "2026-08-07T17:50:00.000Z",
            activityEventId: "a-comm-1",
          } as JobCommunicationRecord,
        ],
      }),
    });

    const outbox = ledger.active.find((event) => event.eventId === "outbox:c1");
    expect(outbox?.ownerEscalation).toBe("owner_not_required");
    expect(outbox?.actionKind).toBe("information_only");
    expect(outbox?.recipients.some((recipient) => recipient.kind === "owner")).toBe(false);
    expect(ledger.ownerRequiredCount).toBe(0);
    expect(ledger.awaitingTransportCount).toBe(1);
  });

  it("marks communication without job-control template authority as unknown, not owner-required", () => {
    expect(
      classifyOutboxDisposition({
        eventType: "not_a_real_template" as JobCommunicationRecord["eventType"],
        deliveryStatus: "pending_owner_send",
      }),
    ).toBe("unknown");

    const ledger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: envelope({
        jobCommunicationRecords: [
          {
            id: "c-unknown",
            campaignId: "camp-1",
            clientId: "client-1",
            jobId: "camp-1:sku",
            skuId: "v2-rtu-flyer",
            serviceName: "Flyer",
            eventType: "not_a_real_template",
            templateId: "invented",
            channel: "in_app_outbox",
            sender: { role: "system" },
            reason: "Unknown notice",
            messageContent: "Unknown",
            deliveryStatus: "pending_owner_send",
            createdAt: "2026-08-07T17:55:00.000Z",
            updatedAt: "2026-08-07T17:55:00.000Z",
            activityEventId: "a-unknown",
          } as unknown as JobCommunicationRecord,
        ],
      }),
    });

    const event = [...ledger.active, ...ledger.history].find(
      (entry) => entry.eventId === "outbox:c-unknown",
    );
    expect(event?.ownerEscalation).toBe("owner_not_required");
    expect(event?.uncertainty).toMatch(/No established job-control template authority/i);
    expect(event?.recipients.some((recipient) => recipient.kind === "owner")).toBe(false);
    expect(event?.internalSummary).not.toContain("awaiting delivery transport");
  });

  it("keeps genuine owner-required exception authority as owner-required", () => {
    const ownerException = {
      id: "ex-owner",
      campaignId: "camp-1",
      kind: "scope_change",
      status: "waiting_owner",
      title: "Scope exception",
      createdAt: "2026-08-07T16:00:00.000Z",
      updatedAt: "2026-08-07T16:00:00.000Z",
      raisedByUserId: "s1",
      raisedByDisplayName: "Staff",
      raisedByRole: "producer_dispatcher",
    } as CampaignExceptionRecord;

    expect(ownerEscalationForException(ownerException)).toBe("owner_required");

    const ledger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: envelope({ exceptionRecords: [ownerException] }),
    });

    expect(
      ledger.active.find((event) => event.eventId === "exception:ex-owner")?.ownerEscalation,
    ).toBe("owner_required");
  });

  it("routes QA failure to producer correction without inventing owner escalation", () => {
    const ledger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: envelope({
        tasks: [
          {
            id: "creative-1",
            title: "Creative",
            phase: "creative_production",
            status: "needs_revision",
            relatedServiceIds: ["v2-rtu-flyer"],
            familyId: "marketing_assets",
            catalogFamilyId: "marketing_assets",
            serviceName: "Flyer",
            dependsOn: [],
            responsibleRole: "creative_production",
            workflowState: "needs_revision",
          },
        ],
        qaRecords: [
          {
            id: "qa1",
            taskId: "qa-task",
            campaignId: "camp-1",
            createdAt: "2026-08-07T17:40:00.000Z",
            actorUserId: "qa-1",
            actorDisplayName: "QA",
            actorRole: "qa",
            action: "qa_fail",
            category: "production_correction",
            notes: "Fix typo",
            routedTaskId: "creative-1",
          },
        ],
      }),
    });

    const qaEvent = ledger.active.find((event) => event.eventId === "qa:qa1");
    expect(qaEvent?.ownerEscalation).toBe("owner_not_required");
    expect(qaEvent?.visibility).toBe("internal_only");
  });

  it("preserves historical evidence when a blocked task becomes unblocked", () => {
    const activity = {
      id: "a-block-context",
      campaignId: "camp-1",
      jobId: "j1",
      kind: "status_change" as const,
      occurredAt: "2026-08-07T10:00:00.000Z",
      actor: { role: "system" as const },
      reason: "Work paused for blocker context",
      spineStatus: "building_concepts" as const,
    };
    const exception = {
      id: "ex-block",
      campaignId: "camp-1",
      kind: "routine_internal",
      status: "resolved",
      title: "Was blocked; now resolved",
      createdAt: "2026-08-07T10:05:00.000Z",
      updatedAt: "2026-08-07T11:00:00.000Z",
      raisedByUserId: "s1",
      raisedByDisplayName: "Staff",
      raisedByRole: "producer_dispatcher",
      taskId: "blocked-1",
      resolvedAt: "2026-08-07T11:00:00.000Z",
    } as CampaignExceptionRecord;

    const blockedEnvelope = envelope({
      jobActivityEvents: [activity],
      exceptionRecords: [exception],
      tasks: [
        {
          id: "blocked-1",
          title: "Blocked work",
          phase: "creative",
          status: "blocked",
          relatedServiceIds: ["v2-rtu-flyer"],
          familyId: "marketing_assets",
          catalogFamilyId: "marketing_assets",
          serviceName: "Flyer",
          dependsOn: [],
          workflowState: "blocked",
          blockedReason: "Waiting internal fix",
          responsibleRole: "creative_production",
        },
      ],
    });

    const blockedLedger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: blockedEnvelope,
    });
    expect(
      blockedLedger.active.some((event) => event.eventId === "task-blocked:blocked-1"),
    ).toBe(true);

    const unblockedEnvelope = envelope({
      jobActivityEvents: [activity],
      exceptionRecords: [exception],
      tasks: [
        {
          id: "blocked-1",
          title: "Blocked work",
          phase: "creative",
          status: "in_progress",
          relatedServiceIds: ["v2-rtu-flyer"],
          familyId: "marketing_assets",
          catalogFamilyId: "marketing_assets",
          serviceName: "Flyer",
          dependsOn: [],
          workflowState: "in_progress",
          responsibleRole: "creative_production",
        },
      ],
    });

    const unblockedLedger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: unblockedEnvelope,
    });

    expect(
      unblockedLedger.active.some((event) => event.eventId === "task-blocked:blocked-1"),
    ).toBe(false);
    expect(
      unblockedLedger.history.some((event) => event.eventId === "activity:a-block-context"),
    ).toBe(true);
    expect(
      unblockedLedger.history.some((event) => event.eventId === "exception:ex-block"),
    ).toBe(true);
  });

  it("keeps resolved owner interactions in history, not active", () => {
    const interaction = {
      id: "oi1",
      campaignId: "camp-1",
      interactionKind: "complaint",
      status: "resolved",
      clientMessage: "Issue resolved",
      createdAt: "2026-08-07T12:00:00.000Z",
      updatedAt: "2026-08-07T15:00:00.000Z",
    } as OwnerDecisionInteractionRecord;

    expect(ownerEscalationForOwnerInteraction(interaction)).toBe("owner_not_required");

    const ledger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: envelope({ ownerDecisionInteractions: [interaction] }),
    });

    expect(ledger.active.some((event) => event.eventId === "owner-interaction:oi1")).toBe(
      false,
    );
    expect(ledger.history.some((event) => event.eventId === "owner-interaction:oi1")).toBe(
      true,
    );
  });

  it("does not duplicate events on repeated projection", () => {
    const tasksEnvelope = envelope({
      jobActivityEvents: [
        {
          id: "a1",
          campaignId: "camp-1",
          jobId: "j1",
          kind: "payment",
          occurredAt: "2026-08-07T10:00:00.000Z",
          actor: { role: "system" },
          reason: "Paid",
        },
      ],
    });

    const first = projectKitchenCommsLedger({ campaignId: "camp-1", tasksEnvelope });
    const second = projectKitchenCommsLedger({ campaignId: "camp-1", tasksEnvelope });
    expect(first.history.map((event) => event.eventId)).toEqual(
      second.history.map((event) => event.eventId),
    );
  });

  it("does not auto-route unclear recipient authority to owner", () => {
    const ledger = projectKitchenCommsLedger({
      campaignId: "camp-1",
      tasksEnvelope: envelope({
        tasks: [
          {
            id: "blocked-1",
            title: "Blocked work",
            phase: "creative",
            status: "blocked",
            relatedServiceIds: ["v2-rtu-flyer"],
            familyId: "marketing_assets",
            catalogFamilyId: "marketing_assets",
            serviceName: "Flyer",
            dependsOn: [],
            workflowState: "blocked",
            blockedReason: "Unknown dependency",
          },
        ],
      }),
    });

    const blocked = ledger.active.find((event) => event.eventId === "task-blocked:blocked-1");
    expect(blocked?.ownerEscalation).toBe("owner_not_required");
    expect(blocked?.recipients.some((recipient) => recipient.kind === "owner")).toBe(false);
  });
});
