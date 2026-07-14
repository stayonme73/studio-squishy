/**
 * PATCH handler lives under src/app/api; Vitest only includes src/lib/**, so this
 * file imports the route dynamically (same pattern as refund-request-route.test.ts).
 */
import { NextResponse } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";

const requireSession = vi.fn();
const readCampaignEnvelope = vi.fn();
const readCampaignAssignments = vi.fn();
const getOrGenerateTasks = vi.fn();
const getOrInitializeMaterials = vi.fn();
const getOrInitializeProduction = vi.fn();
const findUserById = vi.fn();
const applyTaskPatch = vi.fn();
const writeTasksEnvelope = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  isNextResponse: (value: unknown) => value instanceof NextResponse,
}));
vi.mock("@/lib/campaign-store/store", () => ({
  readCampaignEnvelope: (...args: unknown[]) => readCampaignEnvelope(...args),
}));
vi.mock("@/lib/file-room/assignments", () => ({
  readCampaignAssignments: (...args: unknown[]) => readCampaignAssignments(...args),
}));
vi.mock("@/lib/campaign-tasks/access", () => ({
  canOperateProductionTasks: () => true,
  canReadProductionTasks: () => true,
}));
vi.mock("@/lib/campaign-tasks/store", () => ({
  getOrGenerateTasks: (...args: unknown[]) => getOrGenerateTasks(...args),
  writeTasksEnvelope: (...args: unknown[]) => writeTasksEnvelope(...args),
}));
vi.mock("@/lib/materials/store", () => ({
  getOrInitializeMaterials: (...args: unknown[]) => getOrInitializeMaterials(...args),
  writeMaterialsEnvelope: vi.fn(),
}));
vi.mock("@/lib/campaign-production/store", () => ({
  getOrInitializeProduction: (...args: unknown[]) => getOrInitializeProduction(...args),
  writeProductionEnvelope: vi.fn(),
}));
vi.mock("@/lib/auth/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/users")>();
  return {
    ...actual,
    findUserById: (...args: unknown[]) => findUserById(...args),
  };
});
vi.mock("@/lib/campaign-tasks/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/campaign-tasks/actions")>();
  return {
    ...actual,
    applyTaskPatch: (...args: unknown[]) => applyTaskPatch(...args),
  };
});
vi.mock("@/lib/project-change/owner-outcome-orchestrator", () => ({
  assertProjectChangeOwnerOrchestrationBody: () => false,
  orchestrateProjectChangeOwnerScopeAction: vi.fn(),
}));
vi.mock("@/lib/project-change/owner-apply-orchestrator", () => ({
  orchestrateOwnerApplyProjectChangeScope: vi.fn(),
}));

const CAMPAIGN_ID = "campaign-a";
const NOW = "2026-07-06T20:00:00.000Z";

const producer: StudioUser = {
  id: "producer-1",
  email: "producer@local.dev",
  displayName: "Producer",
  roles: ["staff"],
};

const targetRecord = {
  id: "assignee-1",
  email: "assignee@local.dev",
  displayName: "Assignee",
  roles: ["staff"] as const,
  password: "secret",
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

function patchRequest(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/campaigns/${CAMPAIGN_ID}/tasks`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/campaigns/[campaignId]/tasks target-user resolution", () => {
  let PATCH: (
    request: Request,
    context: { params: Promise<{ campaignId: string }> },
  ) => Promise<Response>;

  // Cold-import of the tasks route pulls a large action graph; keep timeout off critical path.
  beforeAll(async () => {
    const route = await import("@/app/api/campaigns/[campaignId]/tasks/route");
    PATCH = route.PATCH;
  }, 30_000);

  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(producer);
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
    readCampaignAssignments.mockResolvedValue({ staffByUserId: {} });
    getOrGenerateTasks.mockResolvedValue({
      campaignId: CAMPAIGN_ID,
      planFingerprint: "fp",
      tasks: [],
      updatedAt: NOW,
      syncedAt: NOW,
      version: 11,
    });
    getOrInitializeMaterials.mockResolvedValue({ items: [] });
    getOrInitializeProduction.mockResolvedValue({});
    findUserById.mockResolvedValue(targetRecord);
    applyTaskPatch.mockReturnValue({
      ok: false,
      error: "stop-after-target-resolve",
      status: 400,
    });
  });

  it("loads targetUser from toUserId for reassign (no assignToUserId on body)", async () => {
    const response = await PATCH(
      patchRequest({
        action: "reassign",
        taskId: "task-1",
        from: "in_progress",
        claimVersion: NOW,
        toUserId: targetRecord.id,
        toRole: "copy",
        handoff: {
          completedSummary: "done",
          sourceContext: "ctx",
          nextSteps: "next",
        },
      }),
      { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) },
    );

    expect(response.status).toBe(400);
    expect(findUserById).toHaveBeenCalledTimes(1);
    expect(findUserById).toHaveBeenCalledWith(targetRecord.id);
    expect(applyTaskPatch).toHaveBeenCalledTimes(1);
    const context = applyTaskPatch.mock.calls[0]?.[3] as {
      targetUser?: StudioUser;
    };
    expect(context.targetUser?.id).toBe(targetRecord.id);
    expect(context.targetUser).not.toHaveProperty("password");
  });

  it("loads targetUser from assignToUserId for assign_exception", async () => {
    const response = await PATCH(
      patchRequest({
        action: "assign_exception",
        exceptionId: "ex-1",
        assignToUserId: targetRecord.id,
      }),
      { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) },
    );

    expect(response.status).toBe(400);
    expect(findUserById).toHaveBeenCalledTimes(1);
    expect(findUserById).toHaveBeenCalledWith(targetRecord.id);
    const context = applyTaskPatch.mock.calls[0]?.[3] as {
      targetUser?: StudioUser;
    };
    expect(context.targetUser?.id).toBe(targetRecord.id);
  });
});
