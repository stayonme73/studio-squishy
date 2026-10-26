import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { factsFromPurchasedJob } from "./from-envelope";

const campaign: CampaignRecord = {
  campaignId: "camp-1",
  campaignName: "Flyer",
  campaignStatus: "PAYMENT_RECEIVED",
  campaignDescription: "Paid",
  estimatedCompletion: "",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  deliverablesDelivered: {},
  studioNotes: [],
};

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "job-1",
    campaignId: "camp-1",
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    spineStatus: "building_concepts",
    productionLane: "standard",
    intakeComplete: true,
    updatedAt: "2026-08-01T00:00:00.000Z",
    productionStartedAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  };
}

function envelope(occurredAt: string): ServerTasksEnvelope {
  return {
    campaignId: "camp-1",
    planFingerprint: "fp",
    syncedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    version: 1,
    tasks: [],
    jobActivityEvents: [
      {
        id: "event-1",
        campaignId: "camp-1",
        jobId: "job-1",
        kind: "status_change",
        occurredAt,
        actor: { role: "system", displayName: "Studio Machine" },
      },
    ],
  };
}

describe("factsFromPurchasedJob last activity", () => {
  it("uses the latest real job or activity timestamp", () => {
    const earlier = factsFromPurchasedJob({
      campaign,
      envelope: envelope("2026-08-02T00:00:00.000Z"),
      job: job(),
    });
    expect(earlier.lastActivityAt).toBe("2026-08-03T00:00:00.000Z");

    const laterEvent = factsFromPurchasedJob({
      campaign,
      envelope: envelope("2026-08-04T00:00:00.000Z"),
      job: job(),
    });
    expect(laterEvent.lastActivityAt).toBe("2026-08-04T00:00:00.000Z");
  });

  it("does not require a review-ready timestamp that the purchased job does not have", () => {
    const record = job();
    expect("readyForReviewAt" in record).toBe(false);
    const facts = factsFromPurchasedJob({
      campaign,
      envelope: envelope("2026-08-02T00:00:00.000Z"),
      job: record,
    });
    expect(facts.lastActivityAt).toBe(record.productionStartedAt);
    expect(facts.spineStatus).toBe("building_concepts");
  });
});
