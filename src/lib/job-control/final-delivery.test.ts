import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { buildJobId } from "@/lib/job-control/lane-map";
import { resolveOwnerDeskItems } from "@/lib/job-control/owner-desk";
import { applyProductionWorkspacePatch } from "@/lib/job-control/production-workspace-actions";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import { resolveFinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import {
  applySystemFinalDeliveryAuthorization,
  syncCampaignStatusAfterDelivery,
} from "@/lib/job-control/final-delivery-actions";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";

const NOW = "2026-07-03T18:00:00.000Z";

const ownerUser: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

function lineItem(skuId: string, name: string, deliverables: string[]) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 30000,
    priceDisplay: "$300",
    deliverables,
    exclusions: [],
    timingWindowLabel: "3–5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "fd-v1",
    campaignName: "Final Delivery Demo",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "",
    estimatedCompletion: "July 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001", "ma-flyer-v2"],
      includedServiceIds: ["sm-001", "ma-flyer-v2"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 60000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 60000,
      lineItems: [
        lineItem("sm-001", "Social Launch", ["Post concepts", "Caption copy"]),
        lineItem("ma-flyer-v2", "Flyer", ["Print-ready flyer"]),
      ],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: NOW,
    ...overrides,
  } as CampaignRecord;
}

function qaAuth(skuId: string) {
  return {
    status: "ELIGIBLE_FOR_REVIEW" as const,
    decisionId: `re-fd-${skuId}`,
    packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
    skuId,
    qaRecordIds: [`qa-${skuId}`],
    workVersionId: "work:fd-v1",
    contentSha256s: ["sha256:fd-v1"],
    artifactIds: [`artifact:${skuId}`],
    authorizedAt: NOW,
  };
}

function approvalPin(jobId: string, campaignId: string, skuId: string) {
  return {
    status: "CUSTOMER_APPROVED" as const,
    decisionId: `caa-fd-${skuId}`,
    schemaVersion: 1,
    packageId: "PRODUCTION-ASSURANCE-APPROVED-DELIVERED-BINDING-1",
    jobId,
    campaignId,
    skuId,
    workVersionId: "work:fd-v1",
    artifactIds: [`artifact:${skuId}`],
    contentSha256s: ["sha256:fd-v1"],
    qaRecordIds: [`qa-${skuId}`],
    reviewPackageId: `pkg:fd:${skuId}`,
    releaseActivityId: null,
    approvedAt: NOW,
    feedbackSubmissionType: "approved_for_delivery" as const,
    sourceQaDecisionId: `re-fd-${skuId}`,
  };
}

function bindCdf(
  file: NonNullable<PurchasedJobRecord["clientDeliveryFiles"]>[number],
  skuId: string,
) {
  return {
    ...file,
    contentSha256: file.contentSha256 ?? "sha256:fd-v1",
    artifactId: file.artifactId ?? `artifact:${skuId}`,
    approvedWorkVersionId: file.approvedWorkVersionId ?? "work:fd-v1",
    approvedAuthorizationDecisionId:
      file.approvedAuthorizationDecisionId ?? `caa-fd-${skuId}`,
  };
}

function job(
  skuId: "sm-001" | "ma-flyer-v2",
  overrides: Partial<PurchasedJobRecord> = {},
): PurchasedJobRecord {
  const jobId = buildJobId("fd-v1", skuId);
  const seed: PurchasedJobRecord = {
    jobId,
    campaignId: "fd-v1",
    skuId,
    serviceName: skuId === "sm-001" ? "Social Launch" : "Flyer",
    spineStatus: "approved",
    productionLane: "quick",
    intakeComplete: true,
    ownerApprovalPending: null,
    deliverablePrep: [
      { deliverableKey: "deliverable-0", label: "Item A", preparedAt: NOW },
    ],
    internalQaReviewAuthorization: qaAuth(skuId),
    customerApprovedArtifactAuthorization: approvalPin(jobId, "fd-v1", skuId),
    updatedAt: NOW,
  };
  const next = { ...seed, ...overrides };
  if (next.clientDeliveryFiles) {
    next.clientDeliveryFiles = next.clientDeliveryFiles.map((file) => bindCdf(file, skuId));
  }
  return next;
}

function envelope(...jobRecords: PurchasedJobRecord[]): ServerTasksEnvelope {
  return {
    campaignId: "fd-v1",
    tasks: [],
    planFingerprint: "fd-v1",
    updatedAt: NOW,
    version: 8,
    jobRecords,
    jobActivityEvents: [],
  };
}

describe("Final Delivery V1", () => {
  it("1. routine approved job does not appear on Owner Desk; exception hold does", () => {
    const routineApproved = job("sm-001", { ownerApprovalPending: null });
    const exceptionHold = job("sm-001", { ownerApprovalPending: "before_delivery" });

    const routineDesk = resolveOwnerDeskItems([
      {
        campaignId: "fd-v1",
        campaignName: "Final Delivery Demo",
        jobs: [routineApproved],
        exceptions: [],
        laneViews: resolveProductionLaneViews([]),
      },
    ]);
    expect(routineDesk.some((item) => item.reason === "approval_before_delivery")).toBe(
      false,
    );

    const exceptionDesk = resolveOwnerDeskItems([
      {
        campaignId: "fd-v1",
        campaignName: "Final Delivery Demo",
        jobs: [exceptionHold],
        exceptions: [],
        laneViews: resolveProductionLaneViews([]),
      },
    ]);
    expect(exceptionDesk.some((item) => item.reason === "approval_before_delivery")).toBe(
      true,
    );
    expect(exceptionDesk.some((item) => item.title.includes("Final Release Needed"))).toBe(
      true,
    );
  });

  it("2. system authorizes ready_for_delivery without Owner when files match", () => {
    const approvedJob = job("sm-001", {
      ownerApprovalPending: null,
      clientDeliveryFiles: [
        bindCdf(
          {
            id: "cdf-1",
            deliverableKey: "deliverable-0",
            deliverableLabel: "Post concepts",
            fileName: "posts.zip",
            fileType: "ZIP",
            url: "https://files.example/posts.zip",
            addedAt: NOW,
            addedBy: { role: "staff", displayName: "Staff" },
          },
          "sm-001",
        ),
        bindCdf(
          {
            id: "cdf-2",
            deliverableKey: "deliverable-1",
            deliverableLabel: "Caption copy",
            fileName: "captions.pdf",
            fileType: "PDF",
            url: "https://files.example/captions.pdf",
            addedAt: NOW,
            addedBy: { role: "staff", displayName: "Staff" },
          },
          "sm-001",
        ),
      ],
    });

    const released = applySystemFinalDeliveryAuthorization(
      approvedJob,
      [],
      ["Post concepts", "Caption copy"],
      { occurredAt: NOW },
    );

    expect(released.applied).toBe(true);
    expect(released.job.spineStatus).toBe("ready_for_delivery");
    expect(released.job.ownerApprovalPending).toBeNull();
  });

  it("2b. Owner final release remains for genuine before_delivery exception", () => {
    const approvedJob = job("sm-001", { ownerApprovalPending: "before_delivery" });
    const result = applyProductionWorkspacePatch(
      envelope(approvedJob),
      campaign(),
      approvedJob.jobId,
      { action: "owner_final_release" },
      ownerUser,
      [],
      [],
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.spineStatus).toBe("ready_for_delivery");
      expect(result.job.ownerApprovalPending).toBeNull();
    }
  });

  it("3. client sees only their own campaign job files", () => {
    const releasedJob = job("sm-001", {
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      clientDeliveryFiles: [
        {
          id: "cdf-1",
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: "posts.zip",
          fileType: "ZIP",
          url: "https://files.example/posts.zip",
          useInstructions: "Upload to your social scheduler.",
          addedAt: NOW,
          addedBy: { role: "owner", displayName: "Tagia" },
        },
      ],
    });
    const otherCampaignJob: PurchasedJobRecord = {
      ...releasedJob,
      jobId: buildJobId("other-camp", "sm-001"),
      campaignId: "other-camp",
    };

    const view = resolveFinalDeliveryView(campaign(), [releasedJob, otherCampaignJob]);
    expect(view.state).toBe("ready");
    expect(view.jobs).toHaveLength(1);
    expect(view.jobs[0]?.jobId).toBe(releasedJob.jobId);
    expect(view.jobs[0]?.files).toHaveLength(1);
  });

  it("4. delivery updates Board, Project Record, and job spine", () => {
    const readyJob = job("sm-001", {
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      clientDeliveryFiles: [
        {
          id: "cdf-1",
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: "posts.zip",
          fileType: "ZIP",
          url: "https://files.example/posts.zip",
          addedAt: NOW,
          addedBy: { role: "owner", displayName: "Tagia" },
        },
        {
          id: "cdf-2",
          deliverableKey: "deliverable-1",
          deliverableLabel: "Caption copy",
          fileName: "captions.pdf",
          fileType: "PDF",
          url: "https://files.example/captions.pdf",
          addedAt: NOW,
          addedBy: { role: "owner", displayName: "Tagia" },
        },
      ],
    });

    const result = applyProductionWorkspacePatch(
      envelope(readyJob),
      campaign(),
      readyJob.jobId,
      { action: "mark_delivered" },
      ownerUser,
      [],
      [],
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.spineStatus).toBe("delivered");
      expect(result.job.deliveredAt).toBeTruthy();
      const recordView = resolveFinalDeliveryView(campaign(), [result.job]);
      expect(recordView.state).toBe("ready");
      expect(recordView.jobs[0]?.spineStatus).toBe("delivered");
    }
  });

  it("5. job with missing required final files cannot be delivered", () => {
    const readyJob = job("sm-001", {
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      clientDeliveryFiles: [
        {
          id: "cdf-1",
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: "posts.zip",
          fileType: "ZIP",
          url: "https://files.example/posts.zip",
          addedAt: NOW,
          addedBy: { role: "owner", displayName: "Tagia" },
        },
      ],
    });

    const result = applyProductionWorkspacePatch(
      envelope(readyJob),
      campaign(),
      readyJob.jobId,
      { action: "mark_delivered" },
      ownerUser,
      [],
      [],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/client delivery file/i);
    }
  });

  it("6. multiple jobs under one client remain separate", () => {
    const deliveredSocial = job("sm-001", {
      spineStatus: "delivered",
      ownerApprovalPending: null,
      deliveredAt: NOW,
      clientDeliveryFiles: [
        {
          id: "cdf-social",
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: "posts.zip",
          fileType: "ZIP",
          url: "https://files.example/posts.zip",
          addedAt: NOW,
          addedBy: { role: "owner", displayName: "Tagia" },
        },
        {
          id: "cdf-social-2",
          deliverableKey: "deliverable-1",
          deliverableLabel: "Caption copy",
          fileName: "captions.pdf",
          fileType: "PDF",
          url: "https://files.example/captions.pdf",
          addedAt: NOW,
          addedBy: { role: "owner", displayName: "Tagia" },
        },
      ],
    });
    const inReviewFlyer = job("ma-flyer-v2", {
      spineStatus: "ready_for_review",
      ownerApprovalPending: null,
      clientDeliveryFiles: [],
    });

    const view = resolveFinalDeliveryView(campaign(), [deliveredSocial, inReviewFlyer]);
    expect(view.jobs).toHaveLength(1);
    expect(view.jobs[0]?.serviceName).toBe("Social Launch");
    expect(view.allJobsDelivered).toBe(false);

    const updated = syncCampaignStatusAfterDelivery(
      campaign(),
      [deliveredSocial, inReviewFlyer],
      NOW,
    );
    expect(updated).toBeUndefined();
  });
});
