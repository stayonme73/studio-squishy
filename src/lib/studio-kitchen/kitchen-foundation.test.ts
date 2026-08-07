import { describe, expect, it, vi } from "vitest";

import { EMPTY_DRAFT_INTAKE_FORM } from "@/config/draft-room";
import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import {
  buildKitchenProductionFolderFromFixture,
  buildKitchenProductionFolderFromLive,
} from "./build-folder";
import {
  isKitchenFixtureDemoActive,
  isKitchenFixtureDemoRequested,
  kitchenFixtureCampaignSeed,
} from "./fixture-boundary";
import { buildKitchenLiveFileRoomView } from "./board-view";
import {
  loadKitchenProjectionBoard,
  loadKitchenProjectionDetail,
} from "./load-projection";
import { projectKitchenBucketFromSpine } from "./status-projection";
import type { KitchenProjectionBoard } from "./types";
import { buildKitchenDashboardView } from "@/lib/studio-kitchen-view";
import { buildKitchenFileRoomView } from "@/lib/studio-kitchen-file-room-view";
import type { StudioUser } from "@/lib/campaign-store/types";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

const loadFileRoomCampaignList = vi.fn();
const loadFileRoomCampaign = vi.fn();
const readTasksEnvelope = vi.fn();
const readMaterialsEnvelope = vi.fn();

vi.mock("@/lib/file-room/load-campaign", () => ({
  loadFileRoomCampaignList: (...args: unknown[]) => loadFileRoomCampaignList(...args),
  loadFileRoomCampaign: (...args: unknown[]) => loadFileRoomCampaign(...args),
}));

vi.mock("@/lib/campaign-tasks/store", () => ({
  readTasksEnvelope: (...args: unknown[]) => readTasksEnvelope(...args),
}));

vi.mock("@/lib/materials/store", () => ({
  readMaterialsEnvelope: (...args: unknown[]) => readMaterialsEnvelope(...args),
}));

const staffUser: StudioUser = {
  id: "owner-1",
  email: "owner@example.com",
  displayName: "Owner",
  roles: ["owner"],
};

function campaignRecord(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "live-camp-1",
    campaignName: "Live Campaign One",
    campaignStatus: "BUILDING_CONCEPTS",
    visionData: {
      ...EMPTY_DRAFT_INTAKE_FORM,
      business: "Acme Studio Client",
      project: "Live Campaign One",
    },
    ...overrides,
  };
}

function envelope(record: CampaignRecord): ServerCampaignEnvelope {
  return {
    campaignId: record.campaignId,
    record,
    syncVersion: 1,
    syncedAt: "2026-08-07T12:00:00.000Z",
    clientUserId: "client-1",
  } as ServerCampaignEnvelope;
}

function job(partial: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "live-camp-1:v2-rtu-flyer",
    campaignId: "live-camp-1",
    skuId: "v2-rtu-flyer" as PurchasedJobRecord["skuId"],
    serviceName: "Make Me a Flyer",
    spineStatus: "building_concepts",
    productionLane: "standard",
    intakeComplete: true,
    productionStartedAt: "2026-08-07T11:00:00.000Z",
    waitingOnClientSince: null,
    lastClientResponseAt: null,
    lastReminderSentAt: null,
    ownerApprovalPending: null,
    ...partial,
  } as PurchasedJobRecord;
}

describe("KITCHEN-FOUNDATION-1 projection", () => {
  it("projects real production data into a live Kitchen folder", () => {
    const tasksEnvelope = {
      campaignId: "live-camp-1",
      planFingerprint: "fp-1",
      syncedAt: "2026-08-07T12:00:00.000Z",
      tasks: [
        {
          id: "task-1",
          title: "Creative production",
          phase: "creative_production",
          status: "in_progress",
          relatedServiceIds: ["v2-rtu-flyer"],
          familyId: "marketing_assets",
          serviceName: "Flyer",
          dependsOn: [],
          workflowState: "in_progress",
          effectiveStatus: "in_progress",
          responsibleRole: "creative_production",
          claimedByDisplayName: "Producer Pat",
        },
      ],
      jobRecords: [job()],
      handoffs: [
        {
          id: "h1",
          taskId: "task-1",
          fromRole: "strategy",
          toRole: "creative_production",
          completedSummary: "Brief ready for creative",
          createdAt: "2026-08-07T10:00:00.000Z",
        },
      ],
      qaRecords: [],
      exceptionRecords: [],
      jobCommunicationRecords: [
        {
          id: "c1",
          jobId: "live-camp-1:v2-rtu-flyer",
          campaignId: "live-camp-1",
          eventType: "production_started",
          channel: "in_app_outbox",
          deliveryStatus: "pending_owner_send",
          createdAt: "2026-08-07T11:00:00.000Z",
        },
      ],
    } as unknown as ServerTasksEnvelope;

    const folder = buildKitchenProductionFolderFromLive({
      envelope: envelope(campaignRecord()),
      tasksEnvelope,
      materials: [],
    });

    expect(folder.source).toBe("live_production");
    expect(folder.campaignId).toBe("live-camp-1");
    expect(folder.primaryJob?.spineStatus).toBe("building_concepts");
    expect(folder.tasks).toHaveLength(1);
    expect(folder.tasks[0]?.claimedByDisplayName).toBe("Producer Pat");
    expect(folder.tasks[0]?.qaState).toBe("not_started");
    expect(folder.pendingOutboxCount).toBe(1);
    expect(folder.placement.homeBucketId).toBe("in-production");
    expect(folder.honesty.tasksRecorded).toBe(true);
    expect(folder.honesty.jobsRecorded).toBe(true);
    expect(folder.dueLabel).toBe("Not yet recorded");
  });

  it("shows honest unavailable state when campaign exists without tasks", () => {
    const folder = buildKitchenProductionFolderFromLive({
      envelope: envelope(campaignRecord()),
      tasksEnvelope: null,
      materials: [],
    });

    expect(folder.source).toBe("live_production");
    expect(folder.honesty.tasksRecorded).toBe(false);
    expect(folder.honesty.jobsRecorded).toBe(false);
    expect(folder.jobs).toHaveLength(0);
    expect(folder.tasks).toHaveLength(0);
    expect(folder.nextActionLabel).toContain("No purchased jobs");
    expect(folder.assignedToLabel).toBe("Not yet recorded");
  });

  it("does not invent due dates or assignees when missing", () => {
    const tasksEnvelope = {
      campaignId: "live-camp-1",
      planFingerprint: "fp-1",
      syncedAt: "2026-08-07T12:00:00.000Z",
      tasks: [
        {
          id: "task-2",
          title: "QA",
          phase: "qa",
          status: "ready",
          relatedServiceIds: ["v2-rtu-flyer"],
          familyId: "marketing_assets",
          serviceName: "Flyer",
          dependsOn: [],
          workflowState: "ready_for_qa",
          effectiveStatus: "ready_for_qa",
          responsibleRole: "qa",
        },
      ],
      jobRecords: [job({ spineStatus: "ready_for_review", ownerApprovalPending: "before_review" })],
      handoffs: [],
      qaRecords: [],
      exceptionRecords: [],
      jobCommunicationRecords: [],
    } as unknown as ServerTasksEnvelope;

    const folder = buildKitchenProductionFolderFromLive({
      envelope: envelope(campaignRecord()),
      tasksEnvelope,
      materials: [],
    });

    expect(folder.dueLabel).toBe("Not yet recorded");
    expect(folder.assignedToLabel).toBe("QA");
    expect(folder.honesty.assigneeRecorded).toBe(true);
    expect(folder.placement.homeBucketId).toBe("owner-review");
  });

  it("labels fixture folders as fixture_demo and never as live_production", () => {
    const seed = kitchenFixtureCampaignSeed[0];
    expect(seed).toBeTruthy();
    const folder = buildKitchenProductionFolderFromFixture(seed!);
    expect(folder.source).toBe("fixture_demo");
    expect(folder.honesty.jobsRecorded).toBe(false);
    expect(folder.honesty.tasksRecorded).toBe(false);
    expect(folder.placement.projectionKind).toBe("fixture");
  });

  it("keeps seeded builders empty by default so fixtures cannot silently appear live", () => {
    const dashboard = buildKitchenDashboardView();
    const fileRoom = buildKitchenFileRoomView();
    expect(dashboard.campaigns).toHaveLength(0);
    expect(fileRoom.folders).toHaveLength(0);
  });

  it("only enables fixture demo when explicitly requested", () => {
    expect(isKitchenFixtureDemoRequested(new URLSearchParams("demo=1"))).toBe(true);
    expect(isKitchenFixtureDemoRequested(new URLSearchParams("demo=true"))).toBe(true);
    expect(isKitchenFixtureDemoRequested(new URLSearchParams(""))).toBe(false);
    expect(isKitchenFixtureDemoRequested(new URLSearchParams("demo=0"))).toBe(false);
  });

  it("activates fixture demo only when requested and no live campaigns exist", () => {
    expect(
      isKitchenFixtureDemoActive({ fixtureDemoRequested: true, liveCampaignCount: 0 }),
    ).toBe(true);
    expect(
      isKitchenFixtureDemoActive({ fixtureDemoRequested: true, liveCampaignCount: 1 }),
    ).toBe(false);
    expect(
      isKitchenFixtureDemoActive({ fixtureDemoRequested: false, liveCampaignCount: 0 }),
    ).toBe(false);
  });

  it("board and detail share the fixture/live boundary", async () => {
    const fixtureId = kitchenFixtureCampaignSeed[0]!.id;

    loadFileRoomCampaignList.mockReset();
    loadFileRoomCampaign.mockReset();
    readTasksEnvelope.mockReset();
    readMaterialsEnvelope.mockReset();

    // No live campaigns + demo → fixture board/detail available.
    loadFileRoomCampaignList.mockResolvedValue({ campaigns: [], fixtureCountHidden: 0 });
    loadFileRoomCampaign.mockResolvedValue({ kind: "not-found" });

    const emptyDemoBoard = await loadKitchenProjectionBoard(staffUser, {
      fixtureDemoRequested: true,
    });
    expect(emptyDemoBoard.sourceMode).toBe("fixture_demo");
    expect(emptyDemoBoard.fixtureDemoActive).toBe(true);
    expect(emptyDemoBoard.folders.some((folder) => folder.campaignId === fixtureId)).toBe(
      true,
    );

    const emptyDemoDetail = await loadKitchenProjectionDetail(staffUser, fixtureId, {
      fixtureDemoRequested: true,
    });
    expect(emptyDemoDetail.kind).toBe("ok");
    if (emptyDemoDetail.kind === "ok") {
      expect(emptyDemoDetail.folder.source).toBe("fixture_demo");
    }
    expect(readTasksEnvelope).not.toHaveBeenCalled();
    expect(readMaterialsEnvelope).not.toHaveBeenCalled();

    // Live campaigns exist + demo fixture ID → fixture detail unavailable.
    const liveEnvelope = envelope(campaignRecord({ campaignId: "live-camp-1" }));
    loadFileRoomCampaignList.mockResolvedValue({
      campaigns: [liveEnvelope],
      fixtureCountHidden: 0,
    });
    loadFileRoomCampaign.mockResolvedValue({ kind: "not-found" });
    readTasksEnvelope.mockResolvedValue(null);
    readMaterialsEnvelope.mockResolvedValue(null);
    readTasksEnvelope.mockClear();
    readMaterialsEnvelope.mockClear();

    const liveBoard = await loadKitchenProjectionBoard(staffUser, {
      fixtureDemoRequested: true,
    });
    expect(liveBoard.sourceMode).toBe("live_production");
    expect(liveBoard.fixtureDemoActive).toBe(false);
    expect(liveBoard.folders.every((folder) => folder.source === "live_production")).toBe(
      true,
    );

    const blockedFixtureDetail = await loadKitchenProjectionDetail(staffUser, fixtureId, {
      fixtureDemoRequested: true,
    });
    expect(blockedFixtureDetail).toEqual({
      kind: "unavailable",
      campaignId: fixtureId,
      reason: "not_found",
    });
    // Attempting fixture access while live data exists must not create/read task or material records.
    expect(readTasksEnvelope).not.toHaveBeenCalledWith(fixtureId);
    expect(readMaterialsEnvelope).not.toHaveBeenCalledWith(fixtureId);

    // Live campaign detail continues to work normally.
    loadFileRoomCampaign.mockResolvedValue({ kind: "ok", envelope: liveEnvelope });
    readTasksEnvelope.mockClear();
    readMaterialsEnvelope.mockClear();
    readTasksEnvelope.mockResolvedValue(null);
    readMaterialsEnvelope.mockResolvedValue(null);

    const liveDetail = await loadKitchenProjectionDetail(staffUser, "live-camp-1", {
      fixtureDemoRequested: true,
    });
    expect(liveDetail.kind).toBe("ok");
    if (liveDetail.kind === "ok") {
      expect(liveDetail.folder.source).toBe("live_production");
      expect(liveDetail.folder.campaignId).toBe("live-camp-1");
    }
    expect(readTasksEnvelope).toHaveBeenCalledWith("live-camp-1");
    expect(readMaterialsEnvelope).toHaveBeenCalledWith("live-camp-1");
  });

  it("maps job spine statuses to Kitchen buckets without inventing a second ledger", () => {
    expect(
      projectKitchenBucketFromSpine({
        spineStatus: "waiting_on_client",
        ownerApprovalPending: null,
        intakeComplete: true,
        hasBlockingMaterials: false,
      }).folderLocation,
    ).toBe("tray");

    expect(
      projectKitchenBucketFromSpine({
        spineStatus: "revision_requested",
        ownerApprovalPending: null,
        intakeComplete: true,
        hasBlockingMaterials: false,
      }).homeBucketId,
    ).toBe("revision-queue");
  });

  it("builds a live board view without mixing sources in one board", () => {
    const live = buildKitchenProductionFolderFromLive({
      envelope: envelope(campaignRecord()),
      tasksEnvelope: null,
      materials: [],
    });
    const board: KitchenProjectionBoard = {
      sourceMode: "live_production",
      folders: [live],
      liveCampaignCount: 1,
      fixtureCampaignCount: 0,
      fixtureDemoActive: false,
      refreshedAt: "2026-08-07T12:00:00.000Z",
    };
    const view = buildKitchenLiveFileRoomView(board);
    expect(view.folders).toHaveLength(1);
    expect(view.folders[0]?.source).toBe("live_production");
    expect(view.folders.every((folder) => folder.source === "live_production")).toBe(true);
  });
});
