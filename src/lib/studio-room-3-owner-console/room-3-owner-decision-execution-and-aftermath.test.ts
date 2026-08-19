import { describe, expect, it } from "vitest";

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1 } from "@/config/studio-room-3-owner-console-truth-and-decision-desk-audit-v1";
import { studioRoom3OwnerDecisionExecutionAndAftermathV1 as cfg } from "@/config/studio-room-3-owner-decision-execution-and-aftermath-v1";
import { ownerConsole } from "@/config/owner-console";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import {
  applyOwnerAskClientInfoPricingException,
  applyOwnerApprovePricingException,
  applyOwnerApproveScopeChange,
  applyOwnerAllowRevision,
  applyOwnerDeclinePricingException,
  applyOwnerHoldPricingException,
  applyOwnerAskTeamPricingException,
} from "@/lib/campaign-tasks/owner-decision-folder-actions";
import { applyCompleteInternalOwnerFollowUp } from "@/lib/campaign-tasks/owner-decision-internal-return";
import {
  applyReturnOwnerAsksOnCustomerReply,
  ensureOwnerAskClientFollowUp,
  extractAskClientWording,
  ownerAskCustomerStalls,
  ownerDecisionRecordProof,
  recoverOwnerDecisionAftermath,
} from "@/lib/campaign-tasks/owner-decision-aftermath";
import { resolveOwnerConsoleScanView } from "@/lib/campaign-tasks/owner-console-scan-view";
import type { CampaignExceptionRecord, CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { applyOwnerApproveRefund } from "@/lib/job-control/owner-decision-job-actions";
import type { CampaignRecord } from "@/config/studio-board";
import type { OwnerConsoleCampaignBundle } from "@/lib/campaign-tasks/owner-console-view";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { AUTHORIZED_LIFECYCLE_EMAIL_EVENT_TYPES } from "@/lib/job-control/communication";

const now = "2026-08-18T16:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-producer": ["room3-s2"] },
  staffCapabilities: { "staff-producer": ["producer_dispatcher"] },
};

const task: CampaignTaskItem = {
  id: "v2-rtu-flyer:creative",
  title: "Flyer creative",
  serviceName: "Make Me a Flyer",
  familyId: "marketing_assets",
  catalogFamilyId: "marketing_assets",
  relatedServiceIds: ["v2-rtu-flyer"],
  phase: "creative",
  status: "blocked",
  workflowState: "blocked",
  dependsOn: [],
};

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "room3-s2:v2-rtu-flyer",
    campaignId: "room3-s2",
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    spineStatus: "ready_for_queue",
    productionLane: "standard",
    intakeComplete: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function exception(
  kind: CampaignExceptionRecord["kind"],
  overrides: Partial<CampaignExceptionRecord> = {},
): CampaignExceptionRecord {
  return {
    id: `exc-${kind}`,
    campaignId: "room3-s2",
    kind,
    status: "waiting_owner",
    title: `${kind} decision`,
    createdAt: now,
    updatedAt: now,
    raisedByUserId: "staff-producer",
    raisedByDisplayName: "Producer",
    raisedByRole: "producer_dispatcher",
    taskId: task.id,
    ...overrides,
  };
}

function envelope(
  records: CampaignExceptionRecord[],
  extra: Partial<ServerTasksEnvelope> = {},
): ServerTasksEnvelope {
  return {
    campaignId: "room3-s2",
    tasks: [task],
    planFingerprint: "fp",
    updatedAt: now,
    version: 11,
    syncedAt: now,
    exceptionRecords: records,
    exceptionEvents: [],
    qaRecords: [],
    jobRecords: [job()],
    jobActivityEvents: [],
    jobCommunicationRecords: [],
    ...extra,
  };
}

describe("STUDIO-OPERATING-ROOM-3-OWNER-DECISION-EXECUTION-AND-AFTERMATH-1", () => {
  it("is closed at 199e4a4 and no longer blocks Section 3", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-3-OWNER-DECISION-EXECUTION-AND-AFTERMATH-1",
    );
    expect(cfg.room).toBe(3);
    expect(cfg.sectionClosed).toBe(true);
    expect(cfg.closeTip).toBe("199e4a4");
    expect(cfg.parkForManager).toBe(false);
    expect(cfg.doNotStartSection3).toBe(false);
    expect(cfg.doNotStartRoom4).toBe(true);
    expect(cfg.doNotRebuildOwnerConsole).toBe(true);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.priorSection.closeTip).toBe("76b974f");
    expect(studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room3Section2.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room3Section2.closeTip).toBe("199e4a4");
    expect(studioLaunchReadinessExecutionOrderV1.room3Section3.packageId).toBe(
      "STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-WHOLE-DESK-REHEARSAL-AND-CLOSEOUT-1",
    );
    expect(cfg.supportedDecisionClasses).toEqual(
      expect.arrayContaining(["refund", "pricing_exception", "ask_customer_for_more_information"]),
    );
  });

  it("records a pricing approve as a durable Owner decision and queues in-app follow-up", () => {
    const result = applyOwnerApprovePricingException(
      envelope([exception("pricing_exception")]),
      { exceptionId: "exc-pricing_exception", ownerNotes: "Honor the quoted $69 flyer." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.status).toBe("resolved");
    const proof = ownerDecisionRecordProof(
      result.exception,
      result.envelope.exceptionEvents,
    );
    expect(proof?.decidedByUserId).toBe(owner.id);
    expect(proof?.choice).toContain("approved pricing exception");
    expect(proof?.reason).toContain("Honor the quoted $69 flyer.");
    expect(result.envelope.jobCommunicationRecords?.some((row) => row.eventType === "owner_decision_recorded")).toBe(
      true,
    );
    expect(
      AUTHORIZED_LIFECYCLE_EMAIL_EVENT_TYPES.includes("owner_decision_recorded" as never),
    ).toBe(false);
  });

  it("keeps hold distinct from approve/decline and leaves the active desk", () => {
    const result = applyOwnerHoldPricingException(
      envelope([exception("pricing_exception")]),
      { exceptionId: "exc-pricing_exception", note: "Need the original quote screenshot." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.status).toBe("waiting_internal");
    expect(result.envelope.exceptionEvents?.some((event) => event.action === "held")).toBe(true);
    expect(result.envelope.exceptionEvents?.some((event) => event.action === "resolved")).toBe(false);
    expect(ownerConsole.pricingDecision.confirmHold).toMatch(/not an approve or decline/i);
  });

  it("routes an Owner ask to the client, then returns the folder after they reply", () => {
    const asked = applyOwnerAskClientInfoPricingException(
      envelope([exception("pricing_exception")]),
      {
        exceptionId: "exc-pricing_exception",
        clientMessage: "Please confirm the $69 flyer quote you were shown.",
        ownerNotes: "Need the quote before I can decide.",
      },
      owner,
      assignments,
    );
    expect(asked.ok).toBe(true);
    if (!asked.ok) return;
    expect(asked.exception.status).toBe("waiting_client");
    expect(asked.envelope.exceptionEvents?.some((event) => event.action === "asked_client")).toBe(
      true,
    );
    expect(asked.envelope.jobRecords?.[0]?.spineStatus).toBe("waiting_on_client");
    expect(asked.envelope.jobCommunicationRecords?.some((row) => row.eventType === "owner_ask_client")).toBe(
      true,
    );

    const duplicate = applyOwnerAskClientInfoPricingException(
      asked.envelope,
      {
        exceptionId: "exc-pricing_exception",
        clientMessage: "Please confirm the $69 flyer quote you were shown.",
      },
      owner,
      assignments,
    );
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.status).toBe(422);

    const stalls = ownerAskCustomerStalls(asked.envelope);
    expect(stalls.some((stall) => stall.summary.includes("$69 flyer quote"))).toBe(true);

    const returned = applyReturnOwnerAsksOnCustomerReply(asked.envelope);
    expect(returned.resumedIds).toContain("exc-pricing_exception");
    const ready = returned.envelope.exceptionRecords?.find(
      (entry) => entry.id === "exc-pricing_exception",
    );
    expect(ready?.status).toBe("waiting_owner");
    expect(ready?.title).toBe("pricing_exception decision");
    expect(returned.envelope.exceptionEvents?.some((event) => event.action === "returned_to_owner")).toBe(
      true,
    );
    expect(returned.envelope.jobRecords?.[0]?.spineStatus).not.toBe("waiting_on_client");
  });

  it("recovers a missing ask follow-up without asking Tagia to decide again", () => {
    const asked = applyOwnerAskClientInfoPricingException(
      envelope([exception("pricing_exception")], { jobRecords: [] }),
      {
        exceptionId: "exc-pricing_exception",
        clientMessage: "Please send the original quote.",
      },
      owner,
      assignments,
    );
    expect(asked.ok).toBe(true);
    if (!asked.ok) return;
    expect(asked.exception.status).toBe("waiting_client");
    expect(asked.envelope.jobCommunicationRecords ?? []).toHaveLength(0);

    const recovered = ensureOwnerAskClientFollowUp(
      { ...asked.envelope, jobRecords: [job()] },
      asked.exception,
      "Please send the original quote.",
      owner,
    );
    expect(recovered.exceptionRecords?.find((entry) => entry.id === asked.exception.id)?.status).toBe(
      "waiting_client",
    );
    expect(recovered.jobCommunicationRecords?.some((row) => row.eventType === "owner_ask_client")).toBe(
      true,
    );
  });

  it("records decline, scope, and extra-revision decisions as durable Machine follow-up", () => {
    const declined = applyOwnerDeclinePricingException(
      envelope([exception("pricing_exception")]),
      { exceptionId: "exc-pricing_exception", ownerNotes: "Keep the purchased $69 flyer price." },
      owner,
      assignments,
    );
    expect(declined.ok).toBe(true);
    if (!declined.ok) return;
    expect(declined.exception.status).toBe("resolved");
    expect(declined.exception.resolutionNotes).toContain("declined pricing exception");
    expect(
      declined.envelope.jobCommunicationRecords?.some((row) =>
        row.messageContent.includes("Quoted or purchased pricing stays as recorded"),
      ),
    ).toBe(true);

    const scoped = applyOwnerApproveScopeChange(
      envelope([exception("scope_change")]),
      { exceptionId: "exc-scope_change", ownerNotes: "Allow the extra social crop." },
      owner,
      assignments,
    );
    expect(scoped.ok).toBe(true);
    if (!scoped.ok) return;
    expect(scoped.exception.status).toBe("resolved");
    expect(
      scoped.envelope.jobCommunicationRecords?.some((row) =>
        row.messageContent.includes("approved boundary"),
      ),
    ).toBe(true);

    const extra = applyOwnerAllowRevision(
      envelope([exception("revision_exhausted")]),
      { exceptionId: "exc-revision_exhausted", ownerNotes: "One extra round." },
      owner,
      assignments,
    );
    expect(extra.ok).toBe(true);
    if (!extra.ok) return;
    expect(extra.envelope.jobCorrectionExtraGrants).toHaveLength(1);
    expect(
      extra.envelope.jobCommunicationRecords?.some((row) =>
        row.messageContent.includes("extra revision allowance"),
      ),
    ).toBe(true);
  });

  it("recovers a missing ask notice on the live path without reopening judgment", () => {
    const asked = applyOwnerAskClientInfoPricingException(
      envelope([exception("pricing_exception")], { jobRecords: [] }),
      {
        exceptionId: "exc-pricing_exception",
        clientMessage: "Please send the original quote.",
      },
      owner,
      assignments,
    );
    expect(asked.ok).toBe(true);
    if (!asked.ok) return;
    const recovered = recoverOwnerDecisionAftermath({
      ...asked.envelope,
      jobRecords: [job()],
    });
    expect(recovered.recoveredIds).toContain("exc-pricing_exception");
    expect(
      recovered.envelope.exceptionRecords?.find((entry) => entry.id === "exc-pricing_exception")
        ?.status,
    ).toBe("waiting_client");
    expect(
      recovered.envelope.jobCommunicationRecords?.some((row) => row.eventType === "owner_ask_client"),
    ).toBe(true);
  });

  it("returns a review-gate ask to Owner after the client replies", () => {
    const gated = envelope([], {
      jobRecords: [
        job({
          spineStatus: "waiting_on_client",
          productionStartedAt: now,
          ownerApprovalPending: null,
          ownerAskResumeGate: "before_review",
        }),
      ],
      jobCommunicationRecords: [
        {
          id: "comm.owner_ask_client.v1:room3-s2:v2-rtu-flyer:owner-ask-client:review-gate:room3-s2:v2-rtu-flyer",
          campaignId: "room3-s2",
          clientId: "client-1",
          jobId: "room3-s2:v2-rtu-flyer",
          skuId: "v2-rtu-flyer",
          serviceName: "Make Me a Flyer",
          eventType: "owner_ask_client",
          templateId: "comm.owner_ask_client.v1",
          channel: "in_app_outbox",
          sender: { role: "owner", userId: owner.id, displayName: "Tagia" },
          reason: "The Studio needs something from you",
          messageContent: "Please confirm the headline before review.",
          deliveryStatus: "sent",
          createdAt: now,
          updatedAt: now,
          activityEventId: "act-1",
        },
      ],
    });
    const stalls = ownerAskCustomerStalls(gated);
    expect(stalls.some((stall) => stall.summary.includes("headline"))).toBe(true);
    const returned = applyReturnOwnerAsksOnCustomerReply(gated);
    expect(returned.resumedIds.some((id) => id.startsWith("gate:"))).toBe(true);
    expect(returned.envelope.jobRecords?.[0]?.ownerApprovalPending).toBe("before_review");
    expect(returned.envelope.jobRecords?.[0]?.ownerAskResumeGate).toBeNull();
    expect(returned.envelope.jobRecords?.[0]?.spineStatus).not.toBe("waiting_on_client");
  });

  it("shows refund asks as waiting on client and resolved refunds in Recently Handled", () => {
    const interaction: OwnerDecisionInteractionRecord = {
      id: "interaction-refund-1",
      campaignId: "room3-s2",
      jobId: "room3-s2:v2-rtu-flyer",
      interactionKind: "refund_request",
      status: "waiting_client",
      clientMessage: "Please refund this flyer.",
      createdAt: now,
      updatedAt: now,
      resolutionNotes: "Owner ask-client (refund): Please send the stall timeline.",
    };
    const waitingScan = resolveOwnerConsoleScanView(
      [bundleWithInteractions([interaction])],
      owner,
      assignments,
      new Set(),
    );
    const waiting = waitingScan.buckets.find((bucket) => bucket.id === "waiting_client");
    expect(waiting?.items.some((item) => item.subtitle.includes("not closed"))).toBe(true);

    const resolved: OwnerDecisionInteractionRecord = {
      ...interaction,
      status: "resolved",
      updatedAt: new Date().toISOString(),
    };
    const handledScan = resolveOwnerConsoleScanView(
      [bundleWithInteractions([resolved])],
      owner,
      assignments,
      new Set(),
    );
    const handled = handledScan.buckets.find((bucket) => bucket.id === "recently_resolved");
    expect(handled?.items.some((item) => item.title === "Refund request")).toBe(true);
  });

  it("keeps refund approve idempotent and uses a stable follow-up key", () => {
    const campaign: CampaignRecord = {
      campaignId: "room3-s2",
      campaignName: "Refund",
      campaignStatus: "WAITING_ON_CLIENT",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      paymentReceivedAt: now,
      projectDetailsSubmittedAt: now,
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-flyer"],
        includedServiceIds: ["v2-rtu-flyer"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 6900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 6900,
        lineItems: [],
        approvedAt: now,
      },
      revisionRoundsIncluded: 1,
      revisionRoundsUsed: 0,
      createdAt: now,
      updatedAt: now,
    };
    const first = applyOwnerApproveRefund(
      envelope([], {
        ownerDecisionInteractions: [
          {
            id: "interaction-refund-1",
            campaignId: "room3-s2",
            jobId: "room3-s2:v2-rtu-flyer",
            interactionKind: "refund_request",
            status: "waiting_owner",
            clientMessage: "Please refund.",
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
      campaign,
      "room3-s2:v2-rtu-flyer",
      { reason: "Policy met." },
      owner,
      "client-1",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const replay = applyOwnerApproveRefund(
      first.envelope,
      campaign,
      "room3-s2:v2-rtu-flyer",
      { reason: "Policy met." },
      owner,
      "client-1",
    );
    expect(replay.ok).toBe(false);
    expect(first.envelope.jobCommunicationRecords?.filter((row) => row.eventType === "refund_issued")).toHaveLength(
      1,
    );
  });

  it("extracts Owner ask wording for customer receipts", () => {
    expect(
      extractAskClientWording(
        "Need the quote before I can decide. — Owner ask-client information (pricing): Please confirm the $69 flyer quote.",
      ),
    ).toBe("Please confirm the $69 flyer quote.");
  });

  it("returns an Owner-held folder to waiting_owner after internal follow-up", () => {
    const held = applyOwnerHoldPricingException(
      envelope([exception("pricing_exception")]),
      { exceptionId: "exc-pricing_exception", note: "Need quote screenshot." },
      owner,
      assignments,
    );
    expect(held.ok).toBe(true);
    if (!held.ok) return;

    const returned = applyCompleteInternalOwnerFollowUp(
      held.envelope,
      {
        exceptionId: "exc-pricing_exception",
        note: "Found the quote screenshot in intake.",
        outcome: "needs_owner_judgment",
      },
      owner,
      assignments,
    );
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    expect(returned.exception?.status).toBe("waiting_owner");
    expect(
      returned.envelope.exceptionEvents?.some((event) => event.action === "returned_to_owner"),
    ).toBe(true);

    const replay = applyCompleteInternalOwnerFollowUp(
      returned.envelope,
      {
        exceptionId: "exc-pricing_exception",
        note: "Duplicate update.",
        outcome: "needs_owner_judgment",
      },
      owner,
      assignments,
    );
    expect(replay.ok).toBe(true);
  });

  it("returns an Owner ask-team folder after internal follow-up", () => {
    const asked = applyOwnerAskTeamPricingException(
      envelope([exception("pricing_exception")]),
      { exceptionId: "exc-pricing_exception", note: "Confirm margin with finance." },
      owner,
      assignments,
    );
    expect(asked.ok).toBe(true);
    if (!asked.ok) return;
    expect(asked.exception.status).toBe("waiting_internal");

    const returned = applyCompleteInternalOwnerFollowUp(
      asked.envelope,
      {
        exceptionId: "exc-pricing_exception",
        note: "Finance confirmed the $69 quote is valid.",
        outcome: "needs_owner_judgment",
      },
      owner,
      assignments,
    );
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    expect(returned.exception?.status).toBe("waiting_owner");
  });

  it("blocks deterministic resolve without Owner on owner-held pricing exceptions", () => {
    const held = applyOwnerHoldPricingException(
      envelope([exception("pricing_exception")]),
      { exceptionId: "exc-pricing_exception", note: "Need quote screenshot." },
      owner,
      assignments,
    );
    expect(held.ok).toBe(true);
    if (!held.ok) return;

    const blocked = applyCompleteInternalOwnerFollowUp(
      held.envelope,
      {
        exceptionId: "exc-pricing_exception",
        note: "Team thinks this is fine now.",
        outcome: "resolved_without_owner",
      },
      owner,
      assignments,
    );
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.status).toBe(422);
  });

  it("queues in-app Owner notices as sent transport, not pending_owner_send", () => {
    const approved = applyOwnerApprovePricingException(
      envelope([exception("pricing_exception")]),
      { exceptionId: "exc-pricing_exception", ownerNotes: "Honor quote." },
      owner,
      assignments,
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const record = approved.envelope.jobCommunicationRecords?.find(
      (row) => row.eventType === "owner_decision_recorded",
    );
    expect(record?.deliveryStatus).toBe("sent");
    expect(record?.channel).toBe("in_app_outbox");
  });
});

function bundleWithInteractions(
  interactions: OwnerDecisionInteractionRecord[],
): OwnerConsoleCampaignBundle {
  return {
    envelope: {
      campaignId: "room3-s2",
      syncVersion: 1,
      syncedAt: now,
      record: {
        campaignId: "room3-s2",
        campaignName: "Aftermath",
        campaignStatus: "BUILDING_CONCEPTS",
      },
    } as unknown as ServerCampaignEnvelope,
    tasksEnvelope: envelope([], { ownerDecisionInteractions: interactions, jobRecords: [job()] }),
    materials: [],
  };
}
