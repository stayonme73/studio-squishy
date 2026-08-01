/**
 * Route handler lives under src/app/api; Vitest only includes src/lib/**, so this
 * file imports the route dynamically (same pattern as refund-request-route.test.ts).
 */
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

const requireSession = vi.fn();
const readCampaignEnvelope = vi.fn();
const getOrGenerateTasks = vi.fn();
const readTasksEnvelope = vi.fn();
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
  readTasksEnvelope: (...args: unknown[]) => readTasksEnvelope(...args),
  writeTasksEnvelope: (...args: unknown[]) => writeTasksEnvelope(...args),
}));

async function importRoute() {
  return import("@/app/api/campaigns/[campaignId]/project-communication/customer/problem-report/route");
}

const NOW = "2026-07-31T20:00:00.000Z";
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

const otherClient: StudioUser = {
  id: "client-2",
  email: "other@local.dev",
  displayName: "Other Client",
  roles: ["client"],
  currentCampaignId: OTHER_CAMPAIGN_ID,
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
  updatedAt: NOW,
};

function tasksEnvelope(
  overrides: Partial<ServerTasksEnvelope> = {},
): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    planFingerprint: "sm-001:one_time",
    tasks: [],
    jobRecords: [job],
    ownerDecisionInteractions: [],
    updatedAt: NOW,
    syncedAt: NOW,
    version: 12,
    ...overrides,
  };
}

function postRequest(body: Record<string, unknown>) {
  return new Request(
    `http://localhost/api/campaigns/${CAMPAIGN_ID}/project-communication/customer/problem-report`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function getRequest() {
  return new Request(
    `http://localhost/api/campaigns/${CAMPAIGN_ID}/project-communication/customer/problem-report`,
    { method: "GET" },
  );
}

describe("POST /api/campaigns/[campaignId]/project-communication/customer/problem-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeTasksEnvelope.mockImplementation(async (envelope: ServerTasksEnvelope) => envelope);
  });

  it("rejects unauthenticated requests", async () => {
    requireSession.mockResolvedValue(NextResponse.json({ error: "Authentication required" }, { status: 401 }));

    const { POST } = await importRoute();
    const response = await POST(postRequest({ message: "Something is wrong.", idempotencyKey: "k1" }), {
      params: Promise.resolve({ campaignId: CAMPAIGN_ID }),
    });

    expect(response.status).toBe(401);
    expect(readCampaignEnvelope).not.toHaveBeenCalled();
  });

  it("rejects a customer who does not own this campaign (cross-customer isolation)", async () => {
    requireSession.mockResolvedValue(otherClient);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);

    const { POST } = await importRoute();
    const response = await POST(postRequest({ message: "Not my project.", idempotencyKey: "k1" }), {
      params: Promise.resolve({ campaignId: CAMPAIGN_ID }),
    });

    expect(response.status).toBe(403);
    expect(getOrGenerateTasks).not.toHaveBeenCalled();
    expect(writeTasksEnvelope).not.toHaveBeenCalled();
  });

  it("requires an idempotencyKey", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);

    const { POST } = await importRoute();
    const response = await POST(postRequest({ message: "Something is wrong." }), {
      params: Promise.resolve({ campaignId: CAMPAIGN_ID }),
    });

    expect(response.status).toBe(400);
  });

  it("persists a complaint interaction and returns a truthful system-receipt confirmation", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
    getOrGenerateTasks.mockResolvedValue(tasksEnvelope());

    const { POST } = await importRoute();
    const response = await POST(
      postRequest({ message: "The delivered file does not match my brief.", idempotencyKey: "k1" }),
      { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) },
    );

    expect(response.status).toBe(200);
    expect(writeTasksEnvelope).toHaveBeenCalledTimes(1);

    const persisted = writeTasksEnvelope.mock.calls[0]?.[0] as ServerTasksEnvelope;
    expect(persisted.ownerDecisionInteractions?.[0]?.interactionKind).toBe("complaint");
    expect(persisted.ownerDecisionInteractions?.[0]?.status).toBe("waiting_owner");

    const responseBody = (await response.json()) as {
      confirmation: string;
      problemReport: { status: string; statusLabel: string };
    };
    expect(responseBody.confirmation).toBe("Received by the Studio system.");
    expect(responseBody.problemReport.status).toBe("received");
    expect(responseBody.problemReport.statusLabel).toBe("Received by the Studio system");
    // Truthful receipt only — never a human-review, assignment, or SLA claim.
    expect(responseBody.confirmation).not.toMatch(/review|assign|team|deadline|resolution/i);
  });

  it("rejects a jobId that is not part of this campaign's own job records", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
    getOrGenerateTasks.mockResolvedValue(tasksEnvelope());

    const { POST } = await importRoute();
    const response = await POST(
      postRequest({
        message: "Spoofed job id attempt.",
        idempotencyKey: "k1",
        jobId: "campaign-b:sm-999",
      }),
      { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) },
    );

    expect(response.status).toBe(404);
    expect(writeTasksEnvelope).not.toHaveBeenCalled();
  });

  it("does not create a duplicate record on identical resubmission (same idempotency key)", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);

    let currentEnvelope = tasksEnvelope();
    getOrGenerateTasks.mockImplementation(async () => currentEnvelope);
    writeTasksEnvelope.mockImplementation(async (envelope: ServerTasksEnvelope) => {
      currentEnvelope = envelope;
      return envelope;
    });

    const { POST } = await importRoute();
    const body = { message: "Repeated problem text.", idempotencyKey: "dup-key" };

    const first = await POST(postRequest(body), { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) });
    expect(first.status).toBe(200);

    const second = await POST(postRequest(body), { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) });
    expect(second.status).toBe(200);
    const secondJson = (await second.json()) as { replayed: boolean };
    expect(secondJson.replayed).toBe(true);
    expect(currentEnvelope.ownerDecisionInteractions).toHaveLength(1);
    expect(writeTasksEnvelope).toHaveBeenCalledTimes(1);
  });

  it("blocks a second distinct problem report while one is already open", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);

    let currentEnvelope = tasksEnvelope();
    getOrGenerateTasks.mockImplementation(async () => currentEnvelope);
    writeTasksEnvelope.mockImplementation(async (envelope: ServerTasksEnvelope) => {
      currentEnvelope = envelope;
      return envelope;
    });

    const { POST } = await importRoute();
    await POST(postRequest({ message: "First problem.", idempotencyKey: "k1" }), {
      params: Promise.resolve({ campaignId: CAMPAIGN_ID }),
    });

    const second = await POST(postRequest({ message: "Second problem.", idempotencyKey: "k2" }), {
      params: Promise.resolve({ campaignId: CAMPAIGN_ID }),
    });
    expect(second.status).toBe(409);
  });
});

describe("GET /api/campaigns/[campaignId]/project-communication/customer/problem-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a customer who does not own this campaign", async () => {
    requireSession.mockResolvedValue(otherClient);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);

    const { GET } = await importRoute();
    const response = await GET(getRequest(), { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) });

    expect(response.status).toBe(403);
    expect(readTasksEnvelope).not.toHaveBeenCalled();
  });

  it("returns null when no problem report has been submitted yet (truthful empty state)", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
    readTasksEnvelope.mockResolvedValue(tasksEnvelope());

    const { GET } = await importRoute();
    const response = await GET(getRequest(), { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { problemReport: unknown };
    expect(body.problemReport).toBeNull();
  });

  it("returns the truthful status for an existing complaint after refresh", async () => {
    requireSession.mockResolvedValue(client);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
    readTasksEnvelope.mockResolvedValue(
      tasksEnvelope({
        ownerDecisionInteractions: [
          {
            id: "interaction-complaint-campaign-a-1",
            campaignId: CAMPAIGN_ID,
            interactionKind: "complaint",
            status: "waiting_client",
            clientMessage: "Original problem text.",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      }),
    );

    const { GET } = await importRoute();
    const response = await GET(getRequest(), { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) });

    const body = (await response.json()) as { problemReport: { status: string; statusLabel: string } };
    expect(body.problemReport.status).toBe("additional_information_requested");
    expect(body.problemReport.statusLabel).toBe("Additional information requested");
  });
});
