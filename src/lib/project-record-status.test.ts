import { describe, expect, it } from "vitest";

import {
  buildCustomerJobStatusSummaries,
  buildCustomerJobStatusSummary,
  customerStatusLabel,
  resolveProjectStatusPanelState,
} from "@/lib/project-record-status";
import type { JobSpineStatus, PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServiceId } from "@/catalog/types";

const ALLOWED_KEYS = [
  "jobId",
  "campaignId",
  "skuId",
  "serviceName",
  "statusLabel",
  "isWaitingOnClient",
  "hasProductionStarted",
  "deliveredAt",
  "clientDeadline",
].sort();

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "job-1",
    campaignId: "campaign-1",
    skuId: "v2-rtu-flyer" as ServiceId,
    serviceName: "Make Me a Flyer",
    spineStatus: "building_concepts",
    productionLane: "quick",
    intakeComplete: true,
    laneQueuedAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as PurchasedJobRecord;
}

describe("customerStatusLabel", () => {
  it("translates every JobSpineStatus into a plain-English label, never the raw internal name", () => {
    const statuses: JobSpineStatus[] = [
      "ready_for_queue",
      "building_concepts",
      "ready_for_review",
      "revision_requested",
      "approved",
      "ready_for_delivery",
      "delivered",
      "waiting_on_client",
      "refunded_cancelled",
    ];
    for (const status of statuses) {
      const label = customerStatusLabel(status);
      expect(label).not.toBe(status);
      expect(label.length).toBeGreaterThan(0);
      // No underscores or ALL_CAPS internal-vocabulary leakage.
      expect(label).not.toMatch(/_/);
      expect(label).not.toMatch(/^[A-Z_]+$/);
    }
  });
});

describe("buildCustomerJobStatusSummary", () => {
  it("returns only the explicitly approved allowlisted fields — nothing else", () => {
    const summary = buildCustomerJobStatusSummary(
      job({
        internalNotes: [{ note: "staff-only note", at: "2026-07-01T00:00:00.000Z", by: "owner" }],
        workingFileRefs: [{ path: "internal/working/file.psd" }],
        spineStatusSetBy: "owner",
        spineStatusReason: "manual override",
        ownerApprovalPending: "before_review",
        refundOwnerDecisionAt: "2026-07-02T00:00:00.000Z",
        heavyLaneOwnerDecision: "wait",
        nonRefundable: true,
        refundEligibleAt: "2026-07-05T00:00:00.000Z",
      } as unknown as Partial<PurchasedJobRecord>),
    );

    expect(Object.keys(summary).sort()).toEqual(ALLOWED_KEYS);
  });

  it("never leaks internal-only field values even when present on the source record", () => {
    const summary = buildCustomerJobStatusSummary(
      job({
        internalNotes: [{ note: "staff-only note", at: "2026-07-01T00:00:00.000Z", by: "owner" }],
      } as unknown as Partial<PurchasedJobRecord>),
    );
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toMatch(/staff-only note/);
    expect(serialized).not.toMatch(/internalNotes/);
    expect(serialized).not.toMatch(/workingFileRefs/);
    expect(serialized).not.toMatch(/ownerApprovalPending/);
    expect(serialized).not.toMatch(/refundOwnerDecisionAt/);
    expect(serialized).not.toMatch(/heavyLaneOwnerDecision/);
  });

  it("derives isWaitingOnClient from spineStatus, not a raw status string", () => {
    const waiting = buildCustomerJobStatusSummary(job({ spineStatus: "waiting_on_client" }));
    expect(waiting.isWaitingOnClient).toBe(true);
    expect(waiting.statusLabel).toBe(customerStatusLabel("waiting_on_client"));

    const notWaiting = buildCustomerJobStatusSummary(job({ spineStatus: "building_concepts" }));
    expect(notWaiting.isWaitingOnClient).toBe(false);
  });

  it("derives hasProductionStarted as a plain boolean from productionStartedAt", () => {
    const started = buildCustomerJobStatusSummary(
      job({ productionStartedAt: "2026-07-03T00:00:00.000Z" }),
    );
    expect(started.hasProductionStarted).toBe(true);

    const notStarted = buildCustomerJobStatusSummary(job({ productionStartedAt: null }));
    expect(notStarted.hasProductionStarted).toBe(false);
  });

  it("passes through deliveredAt and clientDeadline as customer-safe dates", () => {
    const summary = buildCustomerJobStatusSummary(
      job({ deliveredAt: "2026-07-10T00:00:00.000Z", clientDeadline: "2026-07-20T00:00:00.000Z" }),
    );
    expect(summary.deliveredAt).toBe("2026-07-10T00:00:00.000Z");
    expect(summary.clientDeadline).toBe("2026-07-20T00:00:00.000Z");
  });
});

describe("buildCustomerJobStatusSummaries", () => {
  it("maps one campaign with multiple purchased services to multiple safe summaries", () => {
    const jobs = [
      job({ jobId: "job-1", skuId: "v2-rtu-flyer" as ServiceId, serviceName: "Make Me a Flyer" }),
      job({ jobId: "job-2", skuId: "v2-rtu-menu" as ServiceId, serviceName: "Make Me a Menu" }),
      job({
        jobId: "job-3",
        skuId: "v2-rtu-social-posts" as ServiceId,
        serviceName: "Make My Social Media Posts",
        spineStatus: "waiting_on_client",
      }),
    ];

    const summaries = buildCustomerJobStatusSummaries(jobs);

    expect(summaries).toHaveLength(3);
    expect(summaries.map((s) => s.jobId)).toEqual(["job-1", "job-2", "job-3"]);
    expect(summaries.every((s) => s.campaignId === "campaign-1")).toBe(true);
    expect(summaries[2].isWaitingOnClient).toBe(true);
    for (const summary of summaries) {
      expect(Object.keys(summary).sort()).toEqual(ALLOWED_KEYS);
    }
  });

  it("returns an empty array for a campaign with no purchased jobs", () => {
    expect(buildCustomerJobStatusSummaries([])).toEqual([]);
  });
});

describe("resolveProjectStatusPanelState", () => {
  const jobs = [buildCustomerJobStatusSummary(job())];

  it("returns pending-payment when payment has not been received, regardless of jobs/loading/error", () => {
    expect(
      resolveProjectStatusPanelState({ paymentReceivedAt: null, loading: false, error: null, jobs: [] }),
    ).toEqual({ kind: "pending-payment" });
    expect(
      resolveProjectStatusPanelState({
        paymentReceivedAt: undefined,
        loading: true,
        error: "boom",
        jobs,
      }),
    ).toEqual({ kind: "pending-payment" });
  });

  it("returns loading when paid and the fetch is in flight", () => {
    expect(
      resolveProjectStatusPanelState({
        paymentReceivedAt: "2026-07-01T00:00:00.000Z",
        loading: true,
        error: null,
        jobs: [],
      }),
    ).toEqual({ kind: "loading" });
  });

  it("returns error when paid and the fetch failed", () => {
    expect(
      resolveProjectStatusPanelState({
        paymentReceivedAt: "2026-07-01T00:00:00.000Z",
        loading: false,
        error: "Failed to load project status",
        jobs: [],
      }),
    ).toEqual({ kind: "error" });
  });

  it("returns empty when paid, loaded, and there are no jobs", () => {
    expect(
      resolveProjectStatusPanelState({
        paymentReceivedAt: "2026-07-01T00:00:00.000Z",
        loading: false,
        error: null,
        jobs: [],
      }),
    ).toEqual({ kind: "empty" });
  });

  it("returns loaded with the jobs when paid and jobs are present — existing paid behavior unchanged", () => {
    expect(
      resolveProjectStatusPanelState({
        paymentReceivedAt: "2026-07-01T00:00:00.000Z",
        loading: false,
        error: null,
        jobs,
      }),
    ).toEqual({ kind: "loaded", jobs });
  });
});
