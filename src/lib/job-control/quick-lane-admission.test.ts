import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { runDesignRendererDispatchObserver } from "@/lib/studio-dispatch/design-renderer-observer";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { assembleCustomerLifeTruth } from "@/lib/studio-customer-life";

import { applyJobSpineStatusChange } from "./actions";
import { resolveProductionLaneViews } from "./capacity";
import { HEAVY_OCCUPANCY_LOCK_REL } from "./heavy-occupancy-lock";
import { buildJobId } from "./lane-map";
import { applyProductionWorkspacePatch } from "./production-workspace-actions";
import {
  admitQuickLaneProduction,
  readQuickLaneReservationJobIds,
  releaseQuickLaneReservation,
} from "./quick-lane-admission";
import {
  jobCountsTowardLaneCapacity,
  jobHasProductionExecutionEvidence,
  syncJobRecordsFromCampaign,
} from "./resolve-jobs";
import type { PurchasedJobRecord } from "./types";

const NOW = "2026-10-18T19:40:00.000Z";

function lineItem(skuId: string, name: string) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 6900,
    priceDisplay: "$69",
    deliverables: ["Flyer"],
    exclusions: [],
    timingWindowLabel: "Quick",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "quick-lane-fixture",
    campaignName: "Unpaid fixture",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: NOW,
    projectDetailsSubmittedAt: NOW,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: "cs_fixture",
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: "dec_fixture",
      factFingerprint: "fp_fixture",
      draftRevision: 1,
      confirmedAt: NOW,
    },
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 6900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 6900,
      lineItems: [lineItem("v2-rtu-flyer", "Make Me a Flyer")],
      approvedAt: NOW,
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as CampaignRecord;
}

function task(workflowState: CampaignTaskItem["workflowState"]): CampaignTaskItem {
  return {
    id: "v2-rtu-flyer:copy",
    title: "Flyer",
    phase: "copy",
    status: "ready",
    relatedServiceIds: ["v2-rtu-flyer" as never],
    familyId: "print",
    catalogFamilyId: "print",
    serviceName: "Flyer",
    dependsOn: [],
    workflowState,
  };
}

function queuedJob(campaignId: string): PurchasedJobRecord {
  return {
    jobId: buildJobId(campaignId, "v2-rtu-flyer"),
    campaignId,
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    spineStatus: "ready_for_queue",
    productionLane: "quick",
    intakeComplete: true,
    laneQueuedAt: NOW,
    updatedAt: NOW,
    acceptanceReview: {
      status: "accepted",
      reviewedAt: NOW,
      reviewedBy: { role: "staff", displayName: "Staff" },
      clientConfirmed: [],
      studioConfirmed: [],
      missingMaterials: [],
      risks: [],
      assumptions: [],
      routeTo: "production",
    },
  } as PurchasedJobRecord;
}

function tasksFor(job: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: job.campaignId,
    version: 12,
    planFingerprint: "fp",
    updatedAt: NOW,
    syncedAt: NOW,
    tasks: [],
    jobRecords: [job],
    qaRecords: [],
    jobCommunicationRecords: [],
  };
}

describe("Quick production lane capacity", () => {
  it("keeps the coded Quick capacity at two", () => {
    expect(OWNER_CONTROL_ROOM_SECTION.laneCapacity.quick).toBe(2);
    expect(OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy).toBe(1);
  });

  it("does not let a copied Building Concepts label occupy a slot, and repeated sync stays waiting", () => {
    const record = campaign();
    const copied: PurchasedJobRecord = {
      ...queuedJob(record.campaignId),
      spineStatus: "building_concepts",
      productionStartedAt: null,
    };
    expect(jobHasProductionExecutionEvidence(copied, [])).toBe(false);
    expect(jobCountsTowardLaneCapacity(copied, [])).toBe(false);

    const first = syncJobRecordsFromCampaign(record, [], [], [], [copied]);
    const flyer = first.find((job) => job.skuId === "v2-rtu-flyer")!;
    expect(flyer.spineStatus).toBe("ready_for_queue");
    expect(jobCountsTowardLaneCapacity(flyer, [])).toBe(false);

    const second = syncJobRecordsFromCampaign(record, [], [], [], first);
    const again = second.find((job) => job.skuId === "v2-rtu-flyer")!;
    expect(again.spineStatus).toBe("ready_for_queue");
    expect(jobCountsTowardLaneCapacity(again, [])).toBe(false);

    const views = resolveProductionLaneViews([
      { campaignName: "Fixture", job: again, tasks: [] },
    ]);
    const quick = views.find((lane) => lane.lane === "quick")!;
    expect(quick.activeCount).toBe(0);
    expect(quick.availableSlots).toBe(2);
    expect(quick.nextUpJobs.map((job) => job.jobId)).toContain(again.jobId);

    const truth = assembleCustomerLifeTruth({
      campaign: record,
      tasks: { ...tasksFor(again), jobRecords: [again] },
    });
    expect(truth.phase).toBe("awaiting_production_slot");
  });

  it("keeps a real in-progress job when the start timestamp is missing", () => {
    const record = campaign();
    const started: PurchasedJobRecord = {
      ...queuedJob(record.campaignId),
      spineStatus: "building_concepts",
      productionStartedAt: null,
    };
    const tasks = [task("in_progress")];
    expect(jobHasProductionExecutionEvidence(started, tasks)).toBe(true);
    expect(jobCountsTowardLaneCapacity(started, tasks)).toBe(true);
    const synced = syncJobRecordsFromCampaign(record, tasks, [], [], [started]);
    expect(synced[0]?.spineStatus).toBe("building_concepts");

    const revision: PurchasedJobRecord = {
      ...started,
      spineStatus: "revision_requested",
    };
    expect(jobCountsTowardLaneCapacity(revision, [])).toBe(true);
  });

  it("admits two Quick jobs, holds the third, and admits the next after a release", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "quick-lane-"));
    const views = resolveProductionLaneViews([
      { campaignName: "A", job: queuedJob("job-a"), tasks: [] },
      { campaignName: "B", job: queuedJob("job-b"), tasks: [] },
      { campaignName: "C", job: queuedJob("job-c"), tasks: [] },
    ]);
    expect(views.find((lane) => lane.lane === "quick")?.activeCount).toBe(0);

    const first = applyProductionWorkspacePatch(
      tasksFor(queuedJob("job-a")),
      campaign({ campaignId: "job-a" }),
      buildJobId("job-a", "v2-rtu-flyer"),
      { action: "start_building_concepts" },
      { id: "staff", email: "staff@local.dev", displayName: "Staff", roles: ["staff"] },
      [],
      views,
      "unclaimed-client:job-a",
      [],
      { repoRoot },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.job.spineStatus).toBe("building_concepts");
    expect(first.job.productionStartedAt).toBeTruthy();

    const second = admitQuickLaneProduction({
      repoRoot,
      jobId: buildJobId("job-b", "v2-rtu-flyer"),
      campaignId: "job-b",
      evidenceJobIds: [],
    });
    const third = admitQuickLaneProduction({
      repoRoot,
      jobId: buildJobId("job-c", "v2-rtu-flyer"),
      campaignId: "job-c",
      evidenceJobIds: [],
    });
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.reason).toBe("lane_full");
    expect(readQuickLaneReservationJobIds(repoRoot).sort()).toEqual(
      [buildJobId("job-a", "v2-rtu-flyer"), buildJobId("job-b", "v2-rtu-flyer")].sort(),
    );

    const released = applyJobSpineStatusChange(first.job, [], {
      job: first.job,
      nextStatus: "ready_for_review",
      actor: { role: "staff", displayName: "Staff" },
      reason: "Review opened",
      occurredAt: NOW,
      repoRoot,
    });
    expect(released.job.spineStatus).toBe("ready_for_review");
    expect(jobCountsTowardLaneCapacity(released.job, [])).toBe(false);

    const next = admitQuickLaneProduction({
      repoRoot,
      jobId: buildJobId("job-c", "v2-rtu-flyer"),
      campaignId: "job-c",
      evidenceJobIds: [],
    });
    expect(next.ok).toBe(true);
    expect(readQuickLaneReservationJobIds(repoRoot)).not.toContain(
      buildJobId("job-a", "v2-rtu-flyer"),
    );
  });

  it("lets Machine skip a third Quick start without rendering when the lane is reserved", async () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "quick-observer-"));
    for (const jobId of ["held-1", "held-2"]) {
      const admitted = admitQuickLaneProduction({
        repoRoot,
        jobId,
        campaignId: jobId,
        evidenceJobIds: [],
      });
      expect(admitted.ok).toBe(true);
    }
    const views = resolveProductionLaneViews([]);
    const record = {
      dispatchId: "d-third",
      jobId: "third-job:v2-rtu-flyer",
      skuId: "v2-rtu-flyer",
      controlLane: "quick",
      executionIdentityReady: true,
      status: "EXECUTION_IDENTITY_READY",
      requirements: { primaryTool: { toolId: "studio_design_renderer" } },
    } as JobDispatchRecord;
    const pass = await runDesignRendererDispatchObserver({
      campaign: { campaignId: "third-job" } as CampaignRecord,
      dispatch: { records: [record] } as never,
      repoRoot,
      laneViews: views,
      enforceQuickAdmission: true,
    });
    expect(pass.results).toEqual([
      expect.objectContaining({
        action: "skipped",
        ok: true,
        skipReason: "waiting_for_production_slot",
      }),
    ]);
    expect(readQuickLaneReservationJobIds(repoRoot).sort()).toEqual(["held-1", "held-2"]);
  });

  it("does not create a Heavy lock while reserving Quick slots", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "quick-not-heavy-"));
    const admitted = admitQuickLaneProduction({
      repoRoot,
      jobId: "quick-only",
      campaignId: "quick-only",
      evidenceJobIds: [],
    });
    expect(admitted.ok).toBe(true);
    expect(readQuickLaneReservationJobIds(repoRoot)).toEqual(["quick-only"]);
    expect(existsSync(path.join(repoRoot, HEAVY_OCCUPANCY_LOCK_REL))).toBe(false);
    expect(releaseQuickLaneReservation({ repoRoot, jobId: "quick-only" })).toBe(true);
    expect(readQuickLaneReservationJobIds(repoRoot)).toEqual([]);
  });

  it("allows exactly two simultaneous Quick admissions", async () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "quick-race-"));
    const runner = path.join(repoRoot, "admit-once.ts");
    const modulePath = path.join(
      process.cwd(),
      "src/lib/job-control/quick-lane-admission.ts",
    ).replace(/\\/g, "/");
    writeFileSync(
      runner,
      `import { admitQuickLaneProduction } from ${JSON.stringify(modulePath)};
const result = admitQuickLaneProduction({
  repoRoot: process.env.QUICK_REPO,
  jobId: process.env.QUICK_JOB,
  campaignId: process.env.QUICK_JOB,
  evidenceJobIds: [],
});
process.stdout.write(result.ok ? "ok" : result.reason);
`,
    );
    const viteNode = path.join(process.cwd(), "node_modules/vite-node/vite-node.mjs");
    const config = path.join(process.cwd(), "vitest.config.ts");
    const results = await Promise.all(
      ["race-1", "race-2", "race-3", "race-4", "race-5"].map(
        (jobId) =>
          new Promise<string>((resolve, reject) => {
            const child = spawn(
              process.execPath,
              [viteNode, "--config", config, runner],
              {
                cwd: process.cwd(),
                env: { ...process.env, NODE_ENV: "production", QUICK_REPO: repoRoot, QUICK_JOB: jobId },
              },
            );
            let out = "";
            let err = "";
            child.stdout.on("data", (chunk) => {
              out += String(chunk);
            });
            child.stderr.on("data", (chunk) => {
              err += String(chunk);
            });
            child.on("close", (code) => {
              if (code !== 0) reject(new Error(err || out || `exit ${code}`));
              else resolve(out.trim());
            });
          }),
      ),
    );
    expect(results.filter((result) => result === "ok")).toHaveLength(2);
    expect(results.filter((result) => result === "lane_full")).toHaveLength(3);
    expect(readQuickLaneReservationJobIds(repoRoot)).toHaveLength(2);
  }, 120_000);
});
