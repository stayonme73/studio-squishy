/**
 * Tests the customer-safe project-status API route from src/lib so Vitest's curated
 * include list (src/lib/**) discovers it — vitest.config.ts intentionally does not
 * include src/app/**, so a colocated route.test.ts there would never run.
 */
import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServiceId } from "@/catalog/types";

const requireReadableCampaign = vi.fn();
const getOrGenerateTasks = vi.fn();
const getOrInitializeMaterials = vi.fn();
const syncJobRecordsFromCampaign = vi.fn();
const applyWaitingOnClientPolicies = vi.fn();

vi.mock("@/lib/campaign-store/server-access", () => ({
  requireReadableCampaign: (...args: unknown[]) => requireReadableCampaign(...args),
}));
vi.mock("@/lib/campaign-tasks/store", () => ({
  getOrGenerateTasks: (...args: unknown[]) => getOrGenerateTasks(...args),
}));
vi.mock("@/lib/materials/store", () => ({
  getOrInitializeMaterials: (...args: unknown[]) => getOrInitializeMaterials(...args),
}));
vi.mock("@/lib/job-control/resolve-jobs", () => ({
  syncJobRecordsFromCampaign: (...args: unknown[]) => syncJobRecordsFromCampaign(...args),
}));
vi.mock("@/lib/job-control/waiting-on-client", () => ({
  applyWaitingOnClientPolicies: (...args: unknown[]) => applyWaitingOnClientPolicies(...args),
}));

async function importRoute() {
  return import("@/app/api/campaigns/[campaignId]/project-status/route");
}

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
    internalNotes: [{ note: "staff-only", at: "2026-07-01T00:00:00.000Z", by: "owner" }],
    ...overrides,
  } as PurchasedJobRecord;
}

describe("GET /api/campaigns/[campaignId]/project-status", () => {
  it("fails safely and returns the access-check response as-is when the campaign is unauthorized", async () => {
    requireReadableCampaign.mockResolvedValue(
      NextResponse.json({ error: "Access denied" }, { status: 403 }),
    );

    const { GET } = await importRoute();
    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/project-status"), {
      params: Promise.resolve({ campaignId: "campaign-1" }),
    });

    expect(response.status).toBe(403);
    expect(getOrGenerateTasks).not.toHaveBeenCalled();
    expect(getOrInitializeMaterials).not.toHaveBeenCalled();
  });

  it("returns no jobs before payment is confirmed, without loading production state", async () => {
    requireReadableCampaign.mockResolvedValue({
      campaignEnvelope: {
        campaignId: "campaign-1",
        record: { campaignId: "campaign-1", paymentReceivedAt: null },
      },
    });

    const { GET } = await importRoute();
    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/project-status"), {
      params: Promise.resolve({ campaignId: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ jobs: [] });
    expect(getOrGenerateTasks).not.toHaveBeenCalled();
    expect(getOrInitializeMaterials).not.toHaveBeenCalled();
  });

  it("never includes internal-only fields in the JSON response for an authorized read", async () => {
    requireReadableCampaign.mockResolvedValue({
      campaignEnvelope: {
        campaignId: "campaign-1",
        record: { campaignId: "campaign-1", paymentReceivedAt: "2026-07-01T00:00:00.000Z" },
      },
    });
    getOrGenerateTasks.mockResolvedValue({ tasks: [], exceptionRecords: [], jobRecords: [] });
    getOrInitializeMaterials.mockResolvedValue({ items: [] });
    const rawJob = job();
    syncJobRecordsFromCampaign.mockReturnValue([rawJob]);
    applyWaitingOnClientPolicies.mockReturnValue([rawJob]);

    const { GET } = await importRoute();
    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/project-status"), {
      params: Promise.resolve({ campaignId: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { jobs: unknown[] };
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/staff-only/);
    expect(serialized).not.toMatch(/internalNotes/);
    expect(body.jobs).toEqual([
      {
        jobId: "job-1",
        campaignId: "campaign-1",
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        statusLabel: "Building Concepts",
        isWaitingOnClient: false,
        hasProductionStarted: false,
        deliveredAt: null,
        clientDeadline: null,
      },
    ]);
  });
});
