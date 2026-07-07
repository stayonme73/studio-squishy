import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";

import { applyClientSubmitRefundRequest } from "./refund-request-actions";
import type { ServerTasksEnvelope } from "./types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

const NOW = "2026-07-06T20:00:00.000Z";

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
  refundEligibleAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

function envelope(): ServerTasksEnvelope {
  return {
    campaignId: "c1",
    planFingerprint: "sm-001:one_time",
    tasks: [],
    jobRecords: [job],
    updatedAt: NOW,
    syncedAt: NOW,
    version: 11,
  };
}

describe("applyClientSubmitRefundRequest", () => {
  it("rejects incomplete intake", () => {
    const result = applyClientSubmitRefundRequest(
      envelope(),
      { jobId: job.jobId, reason: "Too slow" },
      client,
    );
    expect(result.ok).toBe(false);
  });

  it("creates waiting_owner interaction with snapshot", () => {
    const result = applyClientSubmitRefundRequest(
      envelope(),
      {
        jobId: job.jobId,
        reason: "Project stalled",
        requestedOutcome: "Full refund",
      },
      client,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.interaction.status).toBe("waiting_owner");
    expect(result.interaction.refundSnapshot?.reason).toBe("Project stalled");
  });
});
