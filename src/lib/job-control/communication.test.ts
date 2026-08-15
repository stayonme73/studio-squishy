import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { applyProductionWorkspacePatch } from "./production-workspace-actions";
import { resolveProductionLaneViews } from "./capacity";
import {
  markJobCommunicationTestSent,
  resolveNeedsCommunicationQueue,
  syncJobCommunicationRecords,
} from "./communication";
import { syncJobRecordsFromCampaign } from "./resolve-jobs";
import { applyWaitingOnClientPolicies } from "./waiting-on-client";
import type { PurchasedJobRecord } from "./types";

const NOW = "2026-07-03T12:00:00.000Z";
const CLIENT_ID = "client-1";

function lineItem(skuId: string, name: string) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 10000,
    priceDisplay: "$100",
    deliverables: ["Concept set"],
    exclusions: [],
    timingWindowLabel: "3-5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "comm-camp",
    campaignName: "Acme Co",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["ma-flyer-v2", "sm-001"],
      includedServiceIds: ["ma-flyer-v2", "sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 20000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 20000,
      lineItems: [lineItem("ma-flyer-v2", "Flyer"), lineItem("sm-001", "Social")],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  } as CampaignRecord;
}

function envelope(jobs: PurchasedJobRecord[] = []): ServerTasksEnvelope {
  return {
    campaignId: "comm-camp",
    tasks: [],
    planFingerprint: "test",
    updatedAt: NOW,
    syncedAt: NOW,
    version: 9,
    jobRecords: jobs,
    jobActivityEvents: [],
    jobCommunicationRecords: [],
  };
}

function material(
  skuId: string,
  promotionApprovedAt: string,
  reviewStatus: CampaignMaterialItem["reviewStatus"] = "missing",
): CampaignMaterialItem {
  return {
    id: `mat-${skuId}`,
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus,
    contentKind: "file-metadata",
    label: `Logo for ${skuId}`,
    reason: "Needed",
    relatedServiceIds: [skuId as never],
    promotionApprovedAt,
    uploadStatus: reviewStatus === "submitted" ? "metadata_only" : "none",
    submittedAt: reviewStatus === "submitted" ? NOW : undefined,
    submittedBy:
      reviewStatus === "submitted"
        ? { role: "client", userId: CLIENT_ID, displayName: "Client" }
        : undefined,
  };
}

function syncFor(
  record: CampaignRecord,
  env: ServerTasksEnvelope,
  materials: CampaignMaterialItem[],
  now = new Date(NOW).getTime(),
) {
  const synced = syncJobRecordsFromCampaign(
    record,
    env.tasks ?? [],
    materials,
    env.exceptionRecords ?? [],
    env.jobRecords,
  );
  const jobs = applyWaitingOnClientPolicies(synced, materials, now);
  return syncJobCommunicationRecords({
    envelope: env,
    campaign: record,
    clientId: CLIENT_ID,
    jobs,
    materials,
    nowMs: now,
  });
}

describe("job communication outbox", () => {
  it("creates a 48-hour reminder record and timeline receipt", () => {
    const record = campaign();
    const [job] = syncJobRecordsFromCampaign(record, [], [], []);
    const waitingJob: PurchasedJobRecord = {
      ...job,
      spineStatus: "waiting_on_client",
      waitingOnClientSince: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    };

    const result = syncFor(
      record,
      envelope([waitingJob]),
      [material("ma-flyer-v2", "2026-07-01T10:00:00.000Z")],
      new Date("2026-07-03T12:00:00.000Z").getTime(),
    );

    expect(result.envelope.jobCommunicationRecords?.some((entry) => entry.eventType === "reminder_48_hour")).toBe(true);
    expect(result.envelope.jobActivityEvents?.some((entry) => entry.communicationEventType === "reminder_48_hour")).toBe(true);
  });

  it("moves to Waiting on Client at 72 hours and creates a notice", () => {
    const record = campaign();
    const result = syncFor(
      record,
      envelope(),
      [material("ma-flyer-v2", "2026-06-30T12:00:00.000Z")],
      new Date("2026-07-03T12:00:00.000Z").getTime(),
    );
    const flyer = result.jobs.find((job) => job.skuId === "ma-flyer-v2");

    expect(flyer?.spineStatus).toBe("waiting_on_client");
    expect(result.envelope.jobCommunicationRecords?.some((entry) => entry.eventType === "waiting_on_client_72_hour")).toBe(true);
  });

  it("records materials received and returns only that job to queue", () => {
    const record = campaign();
    const [flyer, social] = syncJobRecordsFromCampaign(record, [], [], []);
    const waitingFlyer: PurchasedJobRecord = {
      ...flyer,
      spineStatus: "waiting_on_client",
      waitingOnClientSince: "2026-06-30T12:00:00.000Z",
      returnLane: "quick",
    };
    const reviewSocial: PurchasedJobRecord = {
      ...social,
      spineStatus: "ready_for_review",
      spineStatusSetAt: "2026-07-02T12:00:00.000Z",
    };

    const result = syncFor(
      record,
      envelope([waitingFlyer, reviewSocial]),
      [
        {
          ...material("ma-flyer-v2", "2026-06-30T12:00:00.000Z", "submitted"),
          uploadStatus: "stored",
          useAuthorization: {
            basis: "customer_has_permission",
            attestedAt: NOW,
            attestedBy: { role: "client", userId: CLIENT_ID, displayName: "Client" },
          },
        },
      ],
    );

    expect(result.jobs.find((job) => job.skuId === "ma-flyer-v2")?.spineStatus).toBe("ready_for_queue");
    expect(result.jobs.find((job) => job.skuId === "sm-001")?.spineStatus).toBe("ready_for_review");
    expect(result.envelope.jobCommunicationRecords?.some((entry) => entry.eventType === "materials_received_returned_to_queue")).toBe(true);
  });

  it("adds status communication receipts and keeps production-started jobs nonrefundable", () => {
    const record = campaign();
    const [job] = syncJobRecordsFromCampaign(record, [], [], []);
    const lanes = resolveProductionLaneViews([{ campaignName: "Acme Co", job, tasks: [] }]);

    const accepted = applyProductionWorkspacePatch(
      envelope([job]),
      record,
      job.jobId,
      { action: "record_acceptance_review" },
      { id: "owner", email: "owner@example.com", displayName: "Owner", roles: ["owner"] },
      [],
      lanes,
      CLIENT_ID,
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const started = applyProductionWorkspacePatch(
      accepted.envelope,
      record,
      job.jobId,
      { action: "start_building_concepts" },
      { id: "owner", email: "owner@example.com", displayName: "Owner", roles: ["owner"] },
      [],
      lanes,
      CLIENT_ID,
    );

    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.job.nonRefundable).toBe(true);
    expect(started.envelope.jobCommunicationRecords?.some((entry) => entry.eventType === "production_started")).toBe(true);

    const refund = applyProductionWorkspacePatch(
      started.envelope,
      record,
      job.jobId,
      { action: "issue_refund", reason: "14-day no response" },
      { id: "owner", email: "owner@example.com", displayName: "Owner", roles: ["owner"] },
      [],
      lanes,
      CLIENT_ID,
    );
    expect(refund.ok).toBe(false);
  });

  it("marks untouched waiting jobs refund eligible after 14 days", () => {
    const record = campaign();
    const [job] = syncJobRecordsFromCampaign(record, [], [], []);
    const waitingJob: PurchasedJobRecord = {
      ...job,
      spineStatus: "waiting_on_client",
      waitingOnClientSince: "2026-06-18T12:00:00.000Z",
      updatedAt: "2026-06-18T12:00:00.000Z",
    };

    const result = syncFor(
      record,
      envelope([waitingJob]),
      [material("ma-flyer-v2", "2026-06-18T12:00:00.000Z")],
      new Date("2026-07-03T12:00:00.000Z").getTime(),
    );

    expect(result.jobs[0].refundEligibleAt).toBeTruthy();
    expect(result.envelope.jobCommunicationRecords?.some((entry) => entry.eventType === "refund_eligibility_14_day")).toBe(true);
  });

  it("resolves Owner Desk needs communication queue and safe test-send state", () => {
    const record = campaign();
    const [job] = syncJobRecordsFromCampaign(record, [], [], []);
    const result = syncFor(record, envelope([job]), [], new Date(NOW).getTime());
    const queue = resolveNeedsCommunicationQueue(result.envelope.jobCommunicationRecords);
    const item = queue.find((entry) => entry.eventType === "payment_received");

    expect(item?.deliveryStatus).toBe("pending_owner_send");
    const sent = markJobCommunicationTestSent(
      result.envelope,
      item!.id,
      { role: "owner", userId: "owner", displayName: "Owner" },
      "2026-07-03T12:30:00.000Z",
      "owner-test@example.com",
    );

    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.record.deliveryStatus).toBe("test_sent");
    expect(sent.record.channel).toBe("test_email");
    expect(sent.envelope.jobActivityEvents?.some((entry) => entry.communicationDeliveryStatus === "test_sent")).toBe(true);
  });
});
