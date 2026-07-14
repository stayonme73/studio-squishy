/**
 * Route handler lives under src/app/api; Vitest only includes src/lib/**, so this
 * file imports the route dynamically (same pattern as project-status-route.test.ts).
 */
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

const requireSession = vi.fn();
const readCampaignEnvelope = vi.fn();
const getOrGenerateTasks = vi.fn();
const writeTasksEnvelope = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  isNextResponse: (value: unknown) => value instanceof NextResponse,
}));
vi.mock("@/lib/campaign-store/store", () => ({
  readCampaignEnvelope: (...args: unknown[]) => readCampaignEnvelope(...args),
}));
vi.mock("@/lib/campaign-tasks/store", () => ({
  getOrGenerateTasks: (...args: unknown[]) => getOrGenerateTasks(...args),
  writeTasksEnvelope: (...args: unknown[]) => writeTasksEnvelope(...args),
}));

async function importRoute() {
  return import("@/app/api/campaigns/[campaignId]/jobs/[jobId]/refund-request/route");
}

const NOW = "2026-07-06T20:00:00.000Z";
const CAMPAIGN_ID = "campaign-a";
const OTHER_CAMPAIGN_ID = "campaign-b";
const JOB_ID = "campaign-a:sm-001";

const client: StudioUser = {
  id: "client-1",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
};

const campaignEnvelope = {
  campaignId: CAMPAIGN_ID,
  clientUserId: "client-1",
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "A",
    campaignStatus: "BUILDING_CONCEPTS" as const,
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "",
    createdAt: NOW,
    updatedAt: NOW,
  },
  syncedAt: NOW,
  syncVersion: 1,
};

const job: PurchasedJobRecord = {
  jobId: JOB_ID,
  campaignId: CAMPAIGN_ID,
  skuId: "sm-001",
  serviceName: "Social Media Launch Set",
  spineStatus: "waiting_on_client",
  productionLane: "standard",
  intakeComplete: true,
  refundEligibleAt: NOW,
  updatedAt: NOW,
};

function tasksEnvelope(campaignId: string = CAMPAIGN_ID): ServerTasksEnvelope {
  return {
    campaignId,
    planFingerprint: "sm-001:one_time",
    tasks: [],
    jobRecords: [{ ...job, campaignId, jobId: `${campaignId}:sm-001` }],
    updatedAt: NOW,
    syncedAt: NOW,
    version: 11,
  };
}

function postRequest(body: Record<string, unknown>) {
  return new Request(
    `http://localhost/api/campaigns/${CAMPAIGN_ID}/jobs/${JOB_ID}/refund-request`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/campaigns/[campaignId]/jobs/[jobId]/refund-request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeTasksEnvelope.mockImplementation(async (envelope: ServerTasksEnvelope) => envelope);
  });

  it("rejects unauthorized clients before reading or writing tasks", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue({
      ...campaignEnvelope,
      campaignId: OTHER_CAMPAIGN_ID,
      record: { ...campaignEnvelope.record, campaignId: OTHER_CAMPAIGN_ID },
      clientUserId: "someone-else",
    });

    const { POST } = await importRoute();
    const response = await POST(postRequest({ reason: "Stalled", requestedOutcome: "Refund" }), {
      params: Promise.resolve({ campaignId: OTHER_CAMPAIGN_ID, jobId: JOB_ID }),
    });

    expect(response.status).toBe(403);
    expect(getOrGenerateTasks).not.toHaveBeenCalled();
    expect(writeTasksEnvelope).not.toHaveBeenCalled();
  });

  it("persists a refund interaction via the one-argument writer for the authorized campaign", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
    getOrGenerateTasks.mockResolvedValue(tasksEnvelope(CAMPAIGN_ID));

    const { POST } = await importRoute();
    const response = await POST(
      postRequest({
        reason: "Project stalled",
        requestedOutcome: "Full refund",
      }),
      {
        params: Promise.resolve({ campaignId: CAMPAIGN_ID, jobId: JOB_ID }),
      },
    );

    expect(response.status).toBe(200);
    expect(writeTasksEnvelope).toHaveBeenCalledTimes(1);
    expect(writeTasksEnvelope.mock.calls[0]).toHaveLength(1);

    const persisted = writeTasksEnvelope.mock.calls[0]?.[0] as ServerTasksEnvelope;
    expect(persisted.campaignId).toBe(CAMPAIGN_ID);
    expect(persisted.ownerDecisionInteractions?.[0]?.campaignId).toBe(CAMPAIGN_ID);
    expect(persisted.ownerDecisionInteractions?.[0]?.jobId).toBe(JOB_ID);
    expect(persisted.ownerDecisionInteractions?.[0]?.status).toBe("waiting_owner");

    const body = (await response.json()) as { ok: boolean; interaction: { campaignId: string } };
    expect(body.ok).toBe(true);
    expect(body.interaction.campaignId).toBe(CAMPAIGN_ID);
  });
});
