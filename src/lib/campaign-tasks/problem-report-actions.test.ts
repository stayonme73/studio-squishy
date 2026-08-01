import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { applyClientSubmitProblemReport, findLatestComplaintForCampaign } from "./problem-report-actions";
import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import type { ServerTasksEnvelope } from "./types";

const NOW = "2026-07-31T20:00:00.000Z";

const client: StudioUser = {
  id: "client-1",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"],
};

const job: PurchasedJobRecord = {
  jobId: "c1:sm-001",
  campaignId: "c1",
  skuId: "sm-001",
  serviceName: "Social Media Launch Set",
  spineStatus: "waiting_on_client",
  productionLane: "standard",
  intakeComplete: true,
  updatedAt: NOW,
};

function envelope(
  ownerDecisionInteractions: OwnerDecisionInteractionRecord[] = [],
): ServerTasksEnvelope {
  return {
    campaignId: "c1",
    planFingerprint: "sm-001:one_time",
    tasks: [],
    jobRecords: [job],
    ownerDecisionInteractions,
    updatedAt: NOW,
    syncedAt: NOW,
    version: 11,
  };
}

describe("applyClientSubmitProblemReport", () => {
  it("rejects an empty message", () => {
    const result = applyClientSubmitProblemReport(
      envelope(),
      { message: "   ", idempotencyKey: "key-1" },
      client,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it("rejects a missing idempotency key", () => {
    const result = applyClientSubmitProblemReport(
      envelope(),
      { message: "The revision I got does not match my brief.", idempotencyKey: "" },
      client,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it("creates a waiting_owner complaint interaction, not a message record", () => {
    const result = applyClientSubmitProblemReport(
      envelope(),
      { message: "The revision I got does not match my brief.", idempotencyKey: "key-1" },
      client,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.interaction.interactionKind).toBe("complaint");
    expect(result.interaction.status).toBe("waiting_owner");
    expect(result.interaction.campaignId).toBe("c1");
    expect(result.interaction.clientMessage).toBe("The revision I got does not match my brief.");
    expect(result.replayed).toBe(false);
  });

  it("rejects a jobId that does not belong to this campaign's job records", () => {
    const result = applyClientSubmitProblemReport(
      envelope(),
      { message: "Problem with a job that isn't mine.", idempotencyKey: "key-1", jobId: "other-campaign:sm-002" },
      client,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(404);
  });

  it("associates the job when a valid jobId is supplied", () => {
    const result = applyClientSubmitProblemReport(
      envelope(),
      { message: "Problem tied to a specific job.", idempotencyKey: "key-1", jobId: job.jobId },
      client,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.interaction.jobId).toBe(job.jobId);
  });

  it("replays safely when the same idempotency key resubmits the same message", () => {
    const first = applyClientSubmitProblemReport(
      envelope(),
      { message: "Repeated problem text.", idempotencyKey: "key-dup" },
      client,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = applyClientSubmitProblemReport(
      first.envelope,
      { message: "Repeated problem text.", idempotencyKey: "key-dup" },
      client,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.interaction.id).toBe(first.interaction.id);
    expect(second.envelope.ownerDecisionInteractions).toHaveLength(1);
  });

  it("rejects the same idempotency key reused with a different message", () => {
    const first = applyClientSubmitProblemReport(
      envelope(),
      { message: "Original text.", idempotencyKey: "key-conflict" },
      client,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = applyClientSubmitProblemReport(
      first.envelope,
      { message: "Different text.", idempotencyKey: "key-conflict" },
      client,
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.status).toBe(409);
  });

  it("blocks a second, distinct problem report while one is already open", () => {
    const first = applyClientSubmitProblemReport(
      envelope(),
      { message: "First problem.", idempotencyKey: "key-a" },
      client,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = applyClientSubmitProblemReport(
      first.envelope,
      { message: "Second, unrelated problem.", idempotencyKey: "key-b" },
      client,
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.status).toBe(409);
  });

  it("allows a new problem report once the prior one is resolved", () => {
    const resolved: OwnerDecisionInteractionRecord = {
      id: "interaction-complaint-c1-old",
      campaignId: "c1",
      interactionKind: "complaint",
      status: "resolved",
      clientMessage: "Old, closed problem.",
      createdAt: NOW,
      updatedAt: NOW,
      submissionIdempotencyKey: "key-old",
    };

    const result = applyClientSubmitProblemReport(
      envelope([resolved]),
      { message: "A brand-new problem.", idempotencyKey: "key-new" },
      client,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replayed).toBe(false);
    expect(result.envelope.ownerDecisionInteractions).toHaveLength(2);
  });
});

describe("findLatestComplaintForCampaign", () => {
  it("returns undefined when there is no complaint yet", () => {
    expect(findLatestComplaintForCampaign(envelope(), "c1")).toBeUndefined();
  });

  it("returns the most recently created complaint for the campaign", () => {
    const older: OwnerDecisionInteractionRecord = {
      id: "interaction-complaint-c1-older",
      campaignId: "c1",
      interactionKind: "complaint",
      status: "resolved",
      clientMessage: "Older complaint.",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };
    const newer: OwnerDecisionInteractionRecord = {
      id: "interaction-complaint-c1-newer",
      campaignId: "c1",
      interactionKind: "complaint",
      status: "waiting_owner",
      clientMessage: "Newer complaint.",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    const result = findLatestComplaintForCampaign(envelope([older, newer]), "c1");
    expect(result?.id).toBe("interaction-complaint-c1-newer");
  });
});
