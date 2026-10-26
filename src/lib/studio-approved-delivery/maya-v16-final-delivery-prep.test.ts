import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { canApproveJobForDelivery } from "@/lib/job-control/review-room-gates";
import { canClientAccessJobDelivery } from "@/lib/job-control/final-delivery-access";
import {
  canSystemAuthorizeFinalDelivery,
  materialContextFromLedger,
} from "@/lib/job-control/final-delivery-gates";
import { resolveFinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import {
  evaluateApprovalMatchForRelease,
  isEligibleForDelivery,
} from "@/lib/studio-approved-delivery";

const MAYA_CAMPAIGN_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const PIN_HASHES = [
  "812c40c634a1a22f58aebf00dad4e37a3e014eac7ad8ce69a48f290db70f5c2e",
  "375ff88238f300b4ad63f6934a8ac9d3636a12fb11d3fd5e4a11298630c02d90",
] as const;

describe("Maya Version 16 Final Delivery prep (read-only live job)", () => {
  const envelope = JSON.parse(
    readFileSync(path.join(process.cwd(), "data/campaign-tasks", `${MAYA_CAMPAIGN_ID}.json`), "utf8"),
  ) as {
    jobRecords?: PurchasedJobRecord[];
    jobReviewFeedback?: JobReviewFeedback[];
  };
  const users = JSON.parse(
    readFileSync(path.join(process.cwd(), "data/studio-users.json"), "utf8"),
  ) as { id: string; currentCampaignId?: string | null; clientCampaignIds?: string[] }[];
  const job = envelope.jobRecords?.[0];
  const approval = job?.customerApprovedArtifactAuthorization;
  const customerOne = users.find((user) => user.id === "local-customer-one");
  const latestApproval = [...(envelope.jobReviewFeedback ?? [])]
    .filter((row) => row.jobId === job?.jobId && row.submissionType === "approved_for_delivery")
    .at(-1);

  it("keeps Version 16 as the approved identity and does not remint Customer-One", () => {
    expect(job).toBeTruthy();
    if (!job || !approval) return;
    expect(job.spineStatus).toBe("ready_for_delivery");
    expect(job.ownerApprovalPending).toBeNull();
    expect(approval.status).toBe("CUSTOMER_APPROVED");
    expect(approval.workVersionId).toBe("flyer-v16");
    expect(approval.contentSha256s).toEqual([...PIN_HASHES]);
    expect(customerOne?.currentCampaignId ?? null).toBeNull();
    expect(customerOne?.clientCampaignIds ?? []).toEqual([]);
  });

  it("opens Version 16 Final Delivery after Machine release and will not expose Version 17", () => {
    expect(job).toBeTruthy();
    if (!job) return;
    expect(job.spineStatus).toBe("ready_for_delivery");
    expect(canClientAccessJobDelivery(job)).toBe(true);
    const cdf = job.clientDeliveryFiles ?? [];
    expect(cdf).toHaveLength(2);
    expect(cdf.map((file) => file.fileName).sort()).toEqual([
      "flyer-version-16.pdf",
      "flyer-version-16.png",
    ]);
    expect(cdf.every((file) => file.releaseStatus === "released")).toBe(true);
    expect(cdf.every((file) => file.versionLabel === "Version 16")).toBe(true);
    expect(cdf.every((file) => file.approvedWorkVersionId === "flyer-v16")).toBe(true);
    const finals = (job.fileRegistry ?? []).filter((ref) => ref.category === "final_delivery");
    expect(finals.every((ref) => ref.status === "released")).toBe(true);
    expect(finals.every((ref) => ref.versionLabel === "Version 16")).toBe(true);
    expect(new Set(finals.map((ref) => ref.id)).size).toBe(finals.length);
    const v17Final = [...cdf, ...finals].some((entry) =>
      "fileName" in entry
        ? String(entry.fileName).includes("version-17")
        : String(entry.filename).includes("version-17") || entry.versionLabel === "Version 17",
    );
    expect(v17Final).toBe(false);

    const view = resolveFinalDeliveryView(
      {
        campaignId: MAYA_CAMPAIGN_ID,
        campaignName: "Maya’s Mobile Boutique",
      } as never,
      [job],
    );
    expect(view.state).toBe("ready");
    expect(view.jobs.flatMap((entry) => entry.files.map((file) => file.fileName)).sort()).toEqual([
      "flyer-version-16.pdf",
      "flyer-version-16.png",
    ]);
  });

  it("keeps the approved Version 16 identity and blocks a second approve", () => {
    expect(job).toBeTruthy();
    if (!job || !latestApproval) return;
    const match = evaluateApprovalMatchForRelease({ job });
    expect(isEligibleForDelivery(match)).toBe(true);
    expect(
      canSystemAuthorizeFinalDelivery(job, [], materialContextFromLedger([])).allowed,
    ).toBe(false);
    expect(
      canApproveJobForDelivery({
        job,
        feedback: latestApproval,
        allDeliverablesPrepared: true,
        deliverableCount: 2,
      }).allowed,
    ).toBe(false);
    expect(
      canApproveJobForDelivery({
        job,
        feedback: latestApproval,
        allDeliverablesPrepared: true,
        deliverableCount: 2,
      }).reasons,
    ).toEqual(
      expect.arrayContaining(["Job must be ready for review.", "Feedback already submitted."]),
    );
  });
});
