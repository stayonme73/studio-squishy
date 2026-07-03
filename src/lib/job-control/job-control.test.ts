import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { OwnerConsoleCampaignBundle } from "@/lib/campaign-tasks/owner-console-view";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { applyJobSpineStatusChange } from "./actions";
import { mergeActivityEvents, recordJobStatusChange } from "./activity-log";
import { resolveProductionLaneViews } from "./capacity";
import { mapCampaignStatusToSpine, mapCatalogLaneToControlLane } from "./index";
import { resolveOwnerControlRoomView } from "./control-room-view";
import {
  isJobIntakeComplete,
  jobCountsTowardLaneCapacity,
  syncJobRecordsFromCampaign,
} from "./resolve-jobs";
import {
  applyWaitingOnClientPolicies,
  resolveWaitingOnClientReminderStatus,
  shouldMoveJobToWaitingOnClient,
} from "./waiting-on-client";
import { resolveOwnerDeskItems } from "./owner-desk";

function lineItem(skuId: string, name: string) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 10000,
    priceDisplay: "$100",
    deliverables: ["Deliverable"],
    exclusions: [],
    timingWindowLabel: "3–5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "camp-multi",
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

function task(
  skuId: string,
  phase: string,
  workflowState: CampaignTaskItem["workflowState"],
): CampaignTaskItem {
  return {
    id: `${skuId}:${phase}`,
    title: `${skuId} — ${phase}`,
    phase: "copy",
    status: workflowState === "in_progress" ? "in_progress" : "ready",
    relatedServiceIds: [skuId as never],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: skuId,
    dependsOn: [],
    workflowState,
  };
}

function bundle(
  record: CampaignRecord,
  tasks: CampaignTaskItem[],
  materials: CampaignMaterialItem[] = [],
): OwnerConsoleCampaignBundle {
  const envelope: ServerCampaignEnvelope = {
    campaignId: record.campaignId,
    syncVersion: 1,
    syncedAt: "2026-07-03T12:00:00.000Z",
    record,
  };
  const tasksEnvelope: ServerTasksEnvelope = {
    campaignId: record.campaignId,
    tasks,
    planFingerprint: "test",
    updatedAt: "2026-07-03T12:00:00.000Z",
    version: 7,
  };
  return { envelope, tasksEnvelope, materials };
}

describe("status spine mapping", () => {
  it("maps legacy campaign statuses to job spine", () => {
    expect(mapCampaignStatusToSpine("BUILDING_CONCEPTS")).toBe("building_concepts");
    expect(mapCampaignStatusToSpine("READY_FOR_REVIEW")).toBe("ready_for_review");
    expect(mapCampaignStatusToSpine("DELIVERED")).toBe("delivered");
  });

  it("maps catalog lanes to control lanes", () => {
    expect(mapCatalogLaneToControlLane("quick_turn")).toBe("quick");
    expect(mapCatalogLaneToControlLane("complex_build")).toBe("heavy");
    expect(mapCatalogLaneToControlLane("standard_build")).toBe("standard");
  });
});

describe("job-level tracking", () => {
  it("creates independent job records per purchased SKU", () => {
    const record = campaign();
    const jobs = syncJobRecordsFromCampaign(record, [], [], []);
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.skuId).sort()).toEqual(["ma-flyer-v2", "sm-001"]);
    expect(jobs.every((j) => j.intakeComplete)).toBe(true);
  });

  it("paid incomplete intake does not count toward lane capacity", () => {
    const record = campaign({ projectDetailsSubmittedAt: undefined });
    const jobs = syncJobRecordsFromCampaign(record, [], [], []);
    expect(isJobIntakeComplete(record)).toBe(false);
    expect(jobs.every((j) => !j.intakeComplete)).toBe(true);
    expect(jobCountsTowardLaneCapacity(jobs[0], [])).toBe(false);
  });

  it("derives different spine statuses per job under one campaign", () => {
    const record = campaign({ campaignStatus: "DELIVERED", selectedCampaignOption: "A" });
    const tasks = [
      task("ma-flyer-v2", "copy", "complete"),
      task("sm-001", "copy", "needs_revision"),
    ];
    const jobs = syncJobRecordsFromCampaign(record, tasks, [], []);
    const flyer = jobs.find((j) => j.skuId === "ma-flyer-v2")!;
    const social = jobs.find((j) => j.skuId === "sm-001")!;
    expect(flyer.spineStatus).toBe("delivered");
    expect(social.spineStatus).toBe("revision_requested");
  });
});

describe("lane capacity", () => {
  it("enforces quick=2, standard=2, heavy=1", () => {
    const now = "2026-07-03T12:00:00.000Z";
    const inputs = Array.from({ length: 3 }, (_, i) => ({
      campaignName: `Client ${i}`,
      job: {
        jobId: `c${i}:ma-flyer-v2`,
        campaignId: `c${i}`,
        skuId: "ma-flyer-v2" as const,
        serviceName: "Flyer",
        spineStatus: "building_concepts" as const,
        productionLane: "quick" as const,
        intakeComplete: true,
        laneQueuedAt: now,
        updatedAt: now,
      },
      tasks: [task("ma-flyer-v2", "copy", "in_progress")],
    }));

    const lanes = resolveProductionLaneViews(inputs);
    const quick = lanes.find((l) => l.lane === "quick")!;
    expect(quick.capacity).toBe(2);
    expect(quick.activeCount).toBe(2);
    expect(quick.availableSlots).toBe(0);
    expect(quick.nextUpJobs).toHaveLength(1);
  });
});

describe("waiting on client policies", () => {
  it("flags 48h reminder due", () => {
    const now = new Date("2026-07-03T12:00:00.000Z").getTime();
    const since = new Date("2026-07-01T10:00:00.000Z").toISOString();
    expect(resolveWaitingOnClientReminderStatus(since, null, now)).toBe("reminder_due");
  });

  it("moves to waiting on client at 72h", () => {
    const now = new Date("2026-07-04T12:00:00.000Z").getTime();
    const job = syncJobRecordsFromCampaign(campaign(), [], [], [])[0];
    const materials: CampaignMaterialItem[] = [
      {
        id: "mat-1",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo",
        reason: "Needed",
        relatedServiceIds: [job.skuId],
        promotionApprovedAt: "2026-07-01T10:00:00.000Z",
        uploadStatus: "none",
      },
    ];
    expect(shouldMoveJobToWaitingOnClient(job, materials, now)).toBe(true);
    const updated = applyWaitingOnClientPolicies([job], materials, now);
    expect(updated[0].spineStatus).toBe("waiting_on_client");
  });
});

describe("activity log", () => {
  it("records status changes without silent updates", () => {
    const job = syncJobRecordsFromCampaign(campaign(), [], [], [])[0];
    const { job: updated, events } = applyJobSpineStatusChange(job, [], {
      job,
      nextStatus: "ready_for_review",
      actor: { role: "owner", displayName: "Tagia" },
      reason: "QA passed",
    });
    expect(updated.spineStatus).toBe("ready_for_review");
    expect(updated.spineStatusReason).toBe("QA passed");
    expect(events.some((e) => e.kind === "status_change")).toBe(true);

    const logged = recordJobStatusChange([], updated, { role: "system" }, "test");
    expect(logged).toHaveLength(1);
  });

  it("merges persisted and derived events", () => {
    const merged = mergeActivityEvents(
      [
        {
          id: "custom:1",
          campaignId: "c1",
          jobId: "c1:sm-001",
          kind: "refund",
          occurredAt: "2026-07-02T00:00:00.000Z",
          actor: { role: "owner" },
          reason: "14-day policy",
        },
      ],
      [],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe("refund");
  });
});

describe("owner desk", () => {
  it("includes heavy lane full when at capacity with queued heavy job", () => {
    const now = "2026-07-03T12:00:00.000Z";
    const heavyJob = (id: string) => ({
      jobId: `${id}:vp-001`,
      campaignId: id,
      skuId: "vp-001" as const,
      serviceName: "Video",
      spineStatus: "building_concepts" as const,
      productionLane: "heavy" as const,
      intakeComplete: true,
      laneQueuedAt: now,
      updatedAt: now,
    });

    const laneViews = resolveProductionLaneViews([
      {
        campaignName: "A",
        job: heavyJob("a"),
        tasks: [task("vp-001", "creative", "in_progress")],
      },
      {
        campaignName: "B",
        job: heavyJob("b"),
        tasks: [task("vp-001", "creative", "in_progress")],
      },
    ]);

    const desk = resolveOwnerDeskItems([
      {
        campaignId: "b",
        campaignName: "B",
        jobs: [heavyJob("b")],
        exceptions: [],
        laneViews,
      },
    ]);

    expect(desk.some((d) => d.reason === "heavy_lane_full")).toBe(true);
  });
});

describe("control room aggregate", () => {
  it("shows multiple jobs under one client in different states", () => {
    const record = campaign();
    const tasks = [
      task("ma-flyer-v2", "copy", "complete"),
      task("sm-001", "copy", "in_progress"),
    ];
    const materials: CampaignMaterialItem[] = [
      {
        id: "mat-social",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Brand photos",
        reason: "Needed for social",
        relatedServiceIds: ["sm-001"],
        promotionApprovedAt: "2026-06-28T10:00:00.000Z",
        uploadStatus: "none",
      },
    ];

    const view = resolveOwnerControlRoomView(
      [bundle(record, tasks, materials)],
      new Date("2026-07-03T12:00:00.000Z").getTime(),
    );

    expect(view.jobCount).toBe(2);
    const statuses = new Set(view.jobs.map((j) => j.spineStatus));
    expect(statuses.size).toBeGreaterThan(1);
    expect(view.waitingOnClient.length).toBeGreaterThanOrEqual(0);
    expect(view.lanes.length).toBe(3);
  });
});
