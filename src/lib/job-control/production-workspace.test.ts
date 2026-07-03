import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { applyProductionWorkspacePatch } from "./production-workspace-actions";
import {
  allRequiredDeliverablesPrepared,
  canOwnerApproveForReview,
  canSubmitForOwnerApproval,
  canTransitionToBuildingConcepts,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import { resolveProductionLaneViews } from "./capacity";
import { buildJobId } from "./lane-map";
import type { PurchasedJobRecord } from "./types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

function lineItem(skuId: string, name: string) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 10000,
    priceDisplay: "$100",
    deliverables: ["Concept set", "Final export"],
    exclusions: [],
    timingWindowLabel: "3–5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "camp-pw",
    campaignName: "PW Demo",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "July 15, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 10000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 10000,
      lineItems: [lineItem("sm-001", "Social")],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  } as CampaignRecord;
}

function baseJob(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  const now = "2026-07-03T12:00:00.000Z";
  return {
    jobId: buildJobId("camp-pw", "sm-001"),
    campaignId: "camp-pw",
    skuId: "sm-001",
    serviceName: "Social",
    spineStatus: "ready_for_queue",
    productionLane: "quick",
    intakeComplete: true,
    laneQueuedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function envelope(job: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: "camp-pw",
    tasks: [],
    planFingerprint: "test",
    updatedAt: "2026-07-03T12:00:00.000Z",
    version: 7,
    syncedAt: "2026-07-03T12:00:00.000Z",
    jobRecords: [job],
    jobActivityEvents: [],
  };
}

const ownerUser = {
  id: "tagia",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"] as const,
};

const staffUser = {
  id: "staff-dev",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"] as const,
};

describe("production workspace gates", () => {
  it("blocks Building Concepts when materials are missing", () => {
    const job = baseJob();
    const materials: CampaignMaterialItem[] = [
      {
        id: "mat-1",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo",
        reason: "Needed",
        relatedServiceIds: ["sm-001"],
        promotionApprovedAt: "2026-07-01T10:00:00.000Z",
        uploadStatus: "none",
      },
    ];
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const gate = canTransitionToBuildingConcepts(job, materials, laneViews);
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((reason) => reason.code === "materials_incomplete")).toBe(true);
  });

  it("allows Building Concepts when materials complete and lane has capacity", () => {
    const job = baseJob();
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);
    const gate = canTransitionToBuildingConcepts(job, [], laneViews);
    expect(gate.allowed).toBe(true);
  });

  it("blocks Owner approval submit until all deliverables prepared", () => {
    const job = baseJob({ spineStatus: "building_concepts" });
    const deliverables = ["Concept set", "Final export"];
    expect(canSubmitForOwnerApproval(job, deliverables).allowed).toBe(false);

    const keys = resolveRequiredDeliverableKeys(deliverables);
    let prepared = job;
    for (const key of keys) {
      prepared = {
        ...prepared,
        deliverablePrep: [
          ...(prepared.deliverablePrep ?? []),
          {
            deliverableKey: key.key,
            label: key.label,
            preparedAt: "2026-07-03T13:00:00.000Z",
          },
        ],
      };
    }

    expect(allRequiredDeliverablesPrepared(prepared, deliverables)).toBe(true);
    expect(canSubmitForOwnerApproval(prepared, deliverables).allowed).toBe(true);
  });
});

describe("production workspace handoff actions", () => {
  it("start → prepare deliverables → submit → owner approve updates spine", () => {
    const job = baseJob();
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const started = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "start_building_concepts" },
      staffUser,
      [],
      laneViews,
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.job.spineStatus).toBe("building_concepts");

    let currentEnv = started.envelope;
    const deliverables = resolveRequiredDeliverableKeys(["Concept set", "Final export"]);
    for (const def of deliverables) {
      const marked = applyProductionWorkspacePatch(
        currentEnv,
        campaign(),
        job.jobId,
        { action: "mark_deliverable_prepared", deliverableKey: def.key },
        staffUser,
        [],
        laneViews,
      );
      expect(marked.ok).toBe(true);
      if (!marked.ok) return;
      currentEnv = marked.envelope;
    }

    const submitted = applyProductionWorkspacePatch(
      currentEnv,
      campaign(),
      job.jobId,
      { action: "submit_for_owner_approval" },
      staffUser,
      [],
      laneViews,
    );
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.job.ownerApprovalPending).toBe("before_review");
    expect(submitted.job.spineStatus).toBe("building_concepts");

    const approved = applyProductionWorkspacePatch(
      submitted.envelope,
      campaign(),
      job.jobId,
      { action: "owner_approve_for_review" },
      ownerUser,
      [],
      laneViews,
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.job.spineStatus).toBe("ready_for_review");
    expect(approved.job.ownerApprovalPending).toBeNull();
    expect(canOwnerApproveForReview(approved.job).allowed).toBe(false);
    expect(
      (approved.envelope.jobActivityEvents ?? []).some((event) => event.kind === "status_change"),
    ).toBe(true);
  });

  it("logs internal notes and working file refs", () => {
    const job = baseJob({ spineStatus: "building_concepts" });
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const note = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "add_internal_note", content: "Check headline hierarchy" },
      staffUser,
      [],
      laneViews,
    );
    expect(note.ok).toBe(true);
    if (!note.ok) return;

    const ref = applyProductionWorkspacePatch(
      note.envelope,
      campaign(),
      job.jobId,
      { action: "add_working_file_ref", label: "Figma", url: "https://figma.com/file/demo" },
      staffUser,
      [],
      laneViews,
    );
    expect(ref.ok).toBe(true);
    if (!ref.ok) return;

    const events = ref.envelope.jobActivityEvents ?? [];
    expect(events.some((event) => event.kind === "internal_note")).toBe(true);
    expect(events.some((event) => event.kind === "working_file_ref")).toBe(true);
    expect(ref.job.internalNotes).toHaveLength(1);
    expect(ref.job.workingFileRefs).toHaveLength(1);
  });
});
