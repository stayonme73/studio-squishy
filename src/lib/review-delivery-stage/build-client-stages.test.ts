/**
 * Package 7B1 — builder redaction + stages route tests.
 *
 * Route tests live under src/lib so Vitest's curated include (src/lib/**) discovers
 * them — the same convention as project-status-route.test.ts.
 */
import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import type { ServiceId } from "@/catalog/types";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import {
  CLIENT_STAGES_FORBIDDEN_KEYS,
  buildClientStagesResponse,
  buildJobCustomerStageFacts,
} from "@/lib/review-delivery-stage/build-client-stages";

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
  return import("@/app/api/campaigns/[campaignId]/stages/route");
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

function assertCustomerSafe(payload: unknown) {
  const serialized = JSON.stringify(payload);
  for (const key of CLIENT_STAGES_FORBIDDEN_KEYS) {
    expect(serialized).not.toContain(`"${key}"`);
  }
  expect(serialized).not.toMatch(/staff-only/);
  expect(serialized).not.toMatch(/internalNotes/);
}

describe("buildJobCustomerStageFacts / buildClientStagesResponse", () => {
  it("maps production to Studio Working without leaking spineStatus", () => {
    const payload = buildClientStagesResponse([job()], {
      jobReviewFeedback: [],
      jobCommunicationRecords: [],
    });
    expect(payload.summary.summaryId).toBe("studio-working");
    expect(payload.jobs[0]).toEqual({
      jobId: "job-1",
      serviceName: "Make Me a Flyer",
      stageId: "studio-working",
      label: "Studio Working",
      explanation: "The Studio owns the next move on this work.",
      actionOwner: "studio",
      blocksCampaignCustomerAction: false,
      terminal: false,
    });
    assertCustomerSafe(payload);
  });

  it("maps waiting_on_client to Waiting on You with generic explanation only", () => {
    const payload = buildClientStagesResponse(
      [job({ spineStatus: "waiting_on_client" })],
      { jobReviewFeedback: [], jobCommunicationRecords: [] },
    );
    expect(payload.jobs[0]?.stageId).toBe("waiting-on-you");
    expect(payload.jobs[0]?.explanation).toBe(
      "The Studio needs something from you before this work can continue.",
    );
    assertCustomerSafe(payload);
  });

  it("mixed review-ready and production → Project in Progress", () => {
    const payload = buildClientStagesResponse(
      [
        job({ jobId: "job-a", spineStatus: "ready_for_review", serviceName: "Flyer" }),
        job({ jobId: "job-b", spineStatus: "building_concepts", serviceName: "Email" }),
      ],
      { jobReviewFeedback: [], jobCommunicationRecords: [] },
    );
    expect(payload.summary.summaryId).toBe("project-in-progress");
    expect(payload.jobs.map((entry) => entry.stageId)).toEqual([
      "work-ready-for-review",
      "studio-working",
    ]);
    assertCustomerSafe(payload);
  });

  it("detects unsubmitted draft and prior revision from envelope evidence", () => {
    const draft = createEmptyJobReviewFeedback("campaign-1", "job-1", ["d1"]);
    draft.sectionStatuses = { d1: "revision" };
    const communication = {
      jobId: "job-1",
      eventType: "revision_ready_again",
    } as const;

    const factsDraft = buildJobCustomerStageFacts(job({ spineStatus: "ready_for_review" }), {
      jobReviewFeedback: [draft],
      jobCommunicationRecords: [],
    });
    expect(factsDraft.hasUnsubmittedReviewDraft).toBe(true);

    const factsRevised = buildJobCustomerStageFacts(job({ spineStatus: "ready_for_review" }), {
      jobReviewFeedback: [],
      // Builder only reads jobId + eventType for prior-revision evidence.
      jobCommunicationRecords: [communication as never],
    });
    expect(factsRevised.hasPriorRevisionCycle).toBe(true);

    const payload = buildClientStagesResponse([job({ spineStatus: "ready_for_review" })], {
      jobReviewFeedback: [draft],
      jobCommunicationRecords: [communication as never],
    });
    expect(payload.jobs[0]?.stageId).toBe("customer-reviewing");
    assertCustomerSafe(payload);
  });

  it("does not treat another job's revision_ready_again as prior cycle", () => {
    const facts = buildJobCustomerStageFacts(job({ spineStatus: "ready_for_review" }), {
      jobReviewFeedback: [],
      jobCommunicationRecords: [
        { jobId: "job-other", eventType: "revision_ready_again" } as never,
      ],
    });
    expect(facts.hasPriorRevisionCycle).toBe(false);
  });

  it("treats ownerApprovalPending before_review as Studio Working in the safe projection", () => {
    const payload = buildClientStagesResponse(
      [
        job({
          spineStatus: "ready_for_review",
          ownerApprovalPending: "before_review",
        }),
      ],
      { jobReviewFeedback: [], jobCommunicationRecords: [] },
    );
    expect(payload.jobs[0]?.stageId).toBe("studio-working");
    assertCustomerSafe(payload);
  });
});

describe("GET /api/campaigns/[campaignId]/stages", () => {
  it("returns the access-check response as-is for unauthorized campaigns (403)", async () => {
    requireReadableCampaign.mockResolvedValue(
      NextResponse.json({ error: "Access denied" }, { status: 403 }),
    );

    const { GET } = await importRoute();
    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/stages"), {
      params: Promise.resolve({ campaignId: "campaign-1" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Access denied" });
    expect(getOrGenerateTasks).not.toHaveBeenCalled();
    expect(requireReadableCampaign).toHaveBeenCalledWith(
      expect.any(Request),
      "campaign-1",
      "/api/campaigns/campaign-1/stages",
    );
  });

  it("returns the access-check response as-is when signed out (401)", async () => {
    requireReadableCampaign.mockResolvedValue(
      NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    );

    const { GET } = await importRoute();
    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/stages"), {
      params: Promise.resolve({ campaignId: "campaign-1" }),
    });

    expect(response.status).toBe(401);
    expect(getOrGenerateTasks).not.toHaveBeenCalled();
  });

  it("returns the access-check response as-is when the campaign is missing (404)", async () => {
    requireReadableCampaign.mockResolvedValue(
      NextResponse.json({ error: "Resource not available" }, { status: 404 }),
    );

    const { GET } = await importRoute();
    const response = await GET(new Request("http://localhost/api/campaigns/missing/stages"), {
      params: Promise.resolve({ campaignId: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(getOrGenerateTasks).not.toHaveBeenCalled();
  });

  it("returns a customer-safe stages payload for an authorized campaign", async () => {
    requireReadableCampaign.mockResolvedValue({
      campaignEnvelope: {
        campaignId: "campaign-1",
        record: { campaignId: "campaign-1", campaignName: "Spring Launch" },
      },
    });
    getOrGenerateTasks.mockResolvedValue({
      tasks: [],
      exceptionRecords: [],
      jobRecords: [],
      jobReviewFeedback: [],
      jobCommunicationRecords: [],
    });
    getOrInitializeMaterials.mockResolvedValue({ items: [] });
    const production = job();
    const waiting = job({
      jobId: "job-2",
      serviceName: "Email Sequence",
      spineStatus: "waiting_on_client",
    });
    syncJobRecordsFromCampaign.mockReturnValue([production, waiting]);
    applyWaitingOnClientPolicies.mockReturnValue([production, waiting]);

    const { GET } = await importRoute();
    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/stages"), {
      params: Promise.resolve({ campaignId: "campaign-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary.summaryId).toBe("waiting-on-you");
    expect(body.jobs).toHaveLength(2);
    expect(body.jobs[0].serviceName).toBe("Make Me a Flyer");
    expect(body.jobs[1].stageId).toBe("waiting-on-you");
    assertCustomerSafe(body);
    expect(Object.keys(body.jobs[0]).sort()).toEqual(
      [
        "actionOwner",
        "blocksCampaignCustomerAction",
        "explanation",
        "jobId",
        "label",
        "serviceName",
        "stageId",
        "terminal",
      ].sort(),
    );
    expect(getOrGenerateTasks).toHaveBeenCalled();
    expect(getOrInitializeMaterials).toHaveBeenCalled();
    expect(syncJobRecordsFromCampaign).toHaveBeenCalled();
    expect(applyWaitingOnClientPolicies).toHaveBeenCalled();
  });

  it("relies on requireReadableCampaign for denied-access logging (no duplicate ownership logic)", async () => {
    requireReadableCampaign.mockClear();
    requireReadableCampaign.mockResolvedValue(
      NextResponse.json({ error: "Access denied" }, { status: 403 }),
    );
    const { GET } = await importRoute();
    await GET(new Request("http://localhost/api/campaigns/campaign-1/stages"), {
      params: Promise.resolve({ campaignId: "campaign-1" }),
    });
    expect(requireReadableCampaign).toHaveBeenCalledTimes(1);
    expect(requireReadableCampaign.mock.calls[0]?.[2]).toBe(
      "/api/campaigns/campaign-1/stages",
    );
  });
});
