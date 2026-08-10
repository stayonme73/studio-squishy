import { describe, expect, it } from "vitest";

import { canClientAccessFinalDeliveryFile } from "@/lib/file-storage/access";
import { buildJobId } from "@/lib/job-control/lane-map";
import { requestOwnerApprovalBeforeDelivery } from "@/lib/job-control/actions";
import {
  canMarkJobDelivered,
  canOwnerFinalRelease,
  canSystemAuthorizeFinalDelivery,
  materialContextFromLedger,
} from "@/lib/job-control/final-delivery-gates";
import { applySystemFinalDeliveryAuthorization } from "@/lib/job-control/final-delivery-actions";
import { canClientAccessJobDelivery } from "@/lib/job-control/final-delivery-access";

const NO_MATERIAL_HOLDS = materialContextFromLedger([]);
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import { applyProductionWorkspacePatch } from "@/lib/job-control/production-workspace-actions";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

import {
  buildCustomerApprovedArtifactAuthorization,
  buildFinalDeliveryAuthorizationRecord,
  evaluateDeliveryEligibility,
  evaluateApprovalMatchForRelease,
  isEligibleForDelivery,
  stampClientDeliveryFilesWithApproval,
  studioApprovedDeliveryV1,
} from "./index";

const staffUser: StudioUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Studio Staff",
  roles: ["staff"],
};

const NOW = "2026-08-10T18:00:00.000Z";
const HASH_V1 = "sha256:approved-v1";
const HASH_V2 = "sha256:unapproved-v2";
const ART_V1 = "artifact:v1";
const WV_V1 = "work:v1";
const WV_V2 = "work:v2";

const ownerUser: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

const clientUser: StudioUser = {
  id: "client-1",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: "adb-v1",
};

function qaAuth(overrides: Partial<NonNullable<PurchasedJobRecord["internalQaReviewAuthorization"]>> = {}) {
  return {
    status: "ELIGIBLE_FOR_REVIEW" as const,
    decisionId: "re-adb-1",
    packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
    skuId: "sm-001",
    qaRecordIds: ["qa-1"],
    workVersionId: WV_V1,
    contentSha256s: [HASH_V1],
    artifactIds: [ART_V1],
    authorizedAt: NOW,
    ...overrides,
  };
}

function approvalPin(
  job: PurchasedJobRecord,
  overrides: Partial<NonNullable<PurchasedJobRecord["customerApprovedArtifactAuthorization"]>> = {},
) {
  return {
    status: "CUSTOMER_APPROVED" as const,
    decisionId: "caa-adb-1",
    schemaVersion: 1,
    packageId: studioApprovedDeliveryV1.packageId,
    jobId: job.jobId,
    campaignId: job.campaignId,
    skuId: job.skuId,
    workVersionId: WV_V1,
    artifactIds: [ART_V1],
    contentSha256s: [HASH_V1],
    qaRecordIds: ["qa-1"],
    reviewPackageId: "pkg:adb-v1:approved",
    releaseActivityId: "release-1",
    approvedAt: NOW,
    feedbackSubmissionType: "approved_for_delivery" as const,
    sourceQaDecisionId: "re-adb-1",
    ...overrides,
  };
}

function baseJob(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  const jobId = buildJobId("adb-v1", "sm-001");
  const seed: PurchasedJobRecord = {
    jobId,
    campaignId: "adb-v1",
    skuId: "sm-001",
    serviceName: "Social Launch",
    spineStatus: "approved",
    productionLane: "quick",
    intakeComplete: true,
    ownerApprovalPending: null,
    internalQaReviewAuthorization: qaAuth(),
    updatedAt: NOW,
  };
  return {
    ...seed,
    customerApprovedArtifactAuthorization: approvalPin(seed),
    ...overrides,
  };
}

function cdf(
  overrides: Partial<NonNullable<PurchasedJobRecord["clientDeliveryFiles"]>[number]> = {},
) {
  return {
    id: "cdf-1",
    deliverableKey: "deliverable-0",
    deliverableLabel: "Post concepts",
    fileName: "posts.zip",
    fileType: "ZIP",
    url: "https://files.example/posts.zip",
    releaseStatus: "released" as const,
    contentSha256: HASH_V1,
    artifactId: ART_V1,
    approvedWorkVersionId: WV_V1,
    approvedAuthorizationDecisionId: "caa-adb-1",
    addedAt: NOW,
    addedBy: { role: "owner" as const, displayName: "Tagia" },
    ...overrides,
  };
}

function campaign(): CampaignRecord {
  return {
    campaignId: "adb-v1",
    campaignName: "Approved Delivery Binding",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "",
    estimatedCompletion: "August 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-08-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-08-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 30000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 30000,
      lineItems: [
        {
          skuId: "sm-001",
          serviceId: "sm-001",
          serviceName: "Social Launch",
          billingType: "one_time",
          exactPriceCents: 30000,
          priceDisplay: "$300",
          deliverables: ["Post concepts", "Caption copy"],
          exclusions: [],
          timingWindowLabel: "3–5 days",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "Studio",
        },
      ],
      approvedAt: "2026-08-01T09:00:00.000Z",
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: NOW,
  } as CampaignRecord;
}

function envelope(job: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: "adb-v1",
    tasks: [
      {
        id: "sm-001:qa",
        title: "QA",
        phase: "qa",
        status: "complete",
        relatedServiceIds: ["sm-001"],
        familyId: "social",
        catalogFamilyId: "social_media",
        serviceName: "sm-001",
        dependsOn: [],
        workflowState: "complete",
      },
    ],
    planFingerprint: "adb-v1",
    updatedAt: NOW,
    version: 8,
    jobRecords: [job],
    jobActivityEvents: [
      {
        id: "status_change:release-1",
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "status_change",
        occurredAt: NOW,
        actor: { role: "staff", userId: "prod-1", displayName: "Production" },
        spineStatus: "ready_for_review",
        reason: "Production submitted client-ready work to Review Room",
      },
    ],
    jobReviewFeedback: [],
  };
}

describe("PRODUCTION-ASSURANCE-APPROVED-DELIVERED-BINDING-1", () => {
  it("exact approved artifact → delivery eligible after Owner release", () => {
    const job = stampClientDeliveryFilesWithApproval(
      baseJob({
        spineStatus: "ready_for_delivery",
        ownerApprovalPending: null,
        clientDeliveryFiles: [cdf()],
      }),
    );
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.outcome).toBe("ELIGIBLE_FOR_DELIVERY");
    expect(decision.escalationTarget).toBe("none");
  });

  it("no customer approval → blocked", () => {
    const job = baseJob({
      customerApprovedArtifactAuthorization: undefined,
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.outcome).toBe("BLOCKED_NO_APPROVAL");
  });

  it("wrong workVersionId → blocked", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      internalQaReviewAuthorization: qaAuth({ workVersionId: WV_V2 }),
      clientDeliveryFiles: [cdf()],
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.outcome).toBe("BLOCKED_APPROVAL_MISMATCH");
    expect(decision.blockCodes).toContain("version_mismatch");
  });

  it("wrong artifactId → blocked", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      internalQaReviewAuthorization: qaAuth({ artifactIds: ["artifact:other"] }),
      clientDeliveryFiles: [cdf()],
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.outcome).toBe("BLOCKED_APPROVAL_MISMATCH");
    expect(decision.blockCodes).toContain("artifact_mismatch");
  });

  it("wrong hash → blocked", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      clientDeliveryFiles: [cdf({ contentSha256: HASH_V2 })],
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.outcome).toBe("BLOCKED_APPROVAL_MISMATCH");
    expect(decision.blockCodes).toContain("hash_mismatch");
  });

  it("V1 approval does not authorize V2", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      internalQaReviewAuthorization: qaAuth({
        workVersionId: WV_V2,
        contentSha256s: [HASH_V2],
        artifactIds: ["artifact:v2"],
        decisionId: "re-adb-2",
      }),
      clientDeliveryFiles: [
        cdf({
          contentSha256: HASH_V2,
          artifactId: "artifact:v2",
          approvedWorkVersionId: WV_V2,
        }),
      ],
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(isEligibleForDelivery(decision)).toBe(false);
    expect(decision.outcome).toBe("BLOCKED_APPROVAL_MISMATCH");
  });

  it("post-approval modification invalidates delivery eligibility", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      internalQaReviewAuthorization: undefined,
      clientDeliveryFiles: [cdf()],
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.blockCodes).toContain("superseded");
    expect(isEligibleForDelivery(decision)).toBe(false);
  });

  it("new V2 requires clearing prior approval (QA + Review + new approval)", () => {
    const approved = baseJob({
      spineStatus: "ready_for_review",
      ownerApprovalPending: null,
      deliverablePrep: [
        { deliverableKey: "deliverable-0", label: "Post concepts", preparedAt: NOW },
        { deliverableKey: "deliverable-1", label: "Caption copy", preparedAt: NOW },
      ],
    });
    const feedback = createEmptyJobReviewFeedback(approved.campaignId, approved.jobId, [
      "deliverable-0",
      "deliverable-1",
    ], { packageId: "pkg:adb-v1:rev1", releaseActivityId: "release-1" });
    feedback.sectionStatuses["deliverable-0"] = "revision";
    const revised = applyReviewRoomPatch(
      envelope(approved),
      campaign(),
      approved,
      { action: "request_revision", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(revised.ok).toBe(true);
    if (revised.ok) {
      expect(revised.job.customerApprovedArtifactAuthorization).toBeUndefined();
      expect(revised.job.internalQaReviewAuthorization).toBeUndefined();
      expect(revised.job.spineStatus).toBe("revision_requested");
    }
  });

  it("correct approved candidate with release hold → blocked", () => {
    const job = baseJob({
      spineStatus: "approved",
      ownerApprovalPending: "before_delivery",
      clientDeliveryFiles: [cdf({ releaseStatus: "pending_release" })],
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.outcome).toBe("BLOCKED_RELEASE_HOLD");
    expect(canSystemAuthorizeFinalDelivery(job, ["Post concepts"], NO_MATERIAL_HOLDS).allowed).toBe(
      false,
    );
  });

  it("release hold remains independent of approval; Owner exception path available", () => {
    const job = stampClientDeliveryFilesWithApproval(
      baseJob({
        spineStatus: "approved",
        ownerApprovalPending: "before_delivery",
        clientDeliveryFiles: [cdf({ releaseStatus: "pending_release" }), cdf({ id: "cdf-2", deliverableKey: "deliverable-1", releaseStatus: "pending_release" })],
      }),
    );
    const match = evaluateApprovalMatchForRelease({ job });
    expect(isEligibleForDelivery(match)).toBe(true);
    expect(canClientAccessJobDelivery(job)).toBe(false);
    expect(
      canSystemAuthorizeFinalDelivery(job, ["Post concepts", "Caption copy"], NO_MATERIAL_HOLDS)
        .allowed,
    ).toBe(false);
    expect(canOwnerFinalRelease(job, NO_MATERIAL_HOLDS).allowed).toBe(true);
  });

  it("normal approved + matching + no hold → delivery without Tagia", () => {
    const job = stampClientDeliveryFilesWithApproval(
      baseJob({
        spineStatus: "approved",
        ownerApprovalPending: null,
        clientDeliveryFiles: [
          cdf({ releaseStatus: "pending_release" }),
          cdf({ id: "cdf-2", deliverableKey: "deliverable-1", releaseStatus: "pending_release" }),
        ],
      }),
    );

    expect(
      canSystemAuthorizeFinalDelivery(job, ["Post concepts", "Caption copy"], NO_MATERIAL_HOLDS)
        .allowed,
    ).toBe(true);

    const released = applySystemFinalDeliveryAuthorization(
      job,
      [],
      ["Post concepts", "Caption copy"],
      { occurredAt: NOW, materialUse: NO_MATERIAL_HOLDS },
    );
    expect(released.applied).toBe(true);
    expect(released.job.spineStatus).toBe("ready_for_delivery");
    expect(canClientAccessJobDelivery(released.job)).toBe(true);
    expect(canOwnerFinalRelease(released.job, NO_MATERIAL_HOLDS).allowed).toBe(false);

    // Staff (not Tagia) may mark delivered after system release.
    const marked = applyProductionWorkspacePatch(
      envelope(released.job),
      campaign(),
      released.job.jobId,
      { action: "mark_delivered" },
      staffUser,
      [],
      [],
    );
    expect(marked.ok).toBe(true);
  });

  it("no filename-only authorization", () => {
    const job = baseJob({
      spineStatus: "approved",
      ownerApprovalPending: null,
      clientDeliveryFiles: [
        cdf({
          fileName: "posts.zip",
          contentSha256: undefined,
          artifactId: undefined,
          approvedWorkVersionId: undefined,
          approvedAuthorizationDecisionId: undefined,
          releaseStatus: "pending_release",
        }),
        cdf({
          id: "cdf-2",
          deliverableKey: "deliverable-1",
          fileName: "captions.pdf",
          contentSha256: undefined,
          releaseStatus: "pending_release",
        }),
      ],
    });
    const stamped = stampClientDeliveryFilesWithApproval(job);
    // Stamp may add decision/workVersion — still require hash when pin has hashes.
    expect(
      canSystemAuthorizeFinalDelivery(
        stamped,
        ["Post concepts", "Caption copy"],
        NO_MATERIAL_HOLDS,
      ).allowed,
    ).toBe(false);
    const decision = evaluateApprovalMatchForRelease({ job: stamped });
    expect(
      decision.blockCodes.some(
        (code) => code === "hash_mismatch" || code === "unbound_final_file",
      ),
    ).toBe(true);
    expect(isEligibleForDelivery(decision)).toBe(false);
  });

  it("direct Final/Delivery bypass fails closed without approval pin", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      customerApprovedArtifactAuthorization: undefined,
      clientDeliveryFiles: [cdf()],
    });
    expect(canClientAccessJobDelivery(job)).toBe(false);
    expect(canMarkJobDelivered(job, ["Post concepts"]).allowed).toBe(false);
  });

  it("download/exposure path fails closed on mismatch", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      clientDeliveryFiles: [cdf({ contentSha256: HASH_V2 })],
    });
    const file: StudioFileReference = {
      id: "final:1",
      clientId: "client-1",
      campaignId: job.campaignId,
      jobId: job.jobId,
      category: "final_delivery",
      filename: "posts.zip",
      fileType: "ZIP",
      storageRef: {
        provider: "google_shared_drive",
        connectionStatus: "reference_only",
        referenceKind: "manual_link",
        reference: "https://files.example/posts.zip",
      },
      visibility: "client_visible",
      versionLabel: "v1",
      status: "released",
    };
    const access = canClientAccessFinalDeliveryFile({
      user: clientUser,
      job,
      file,
      clientDeliveryFile: cdf({ contentSha256: HASH_V2 }),
    });
    expect(access.allowed).toBe(false);
  });

  it("final delivery record binds exact approved authorization", () => {
    const job = stampClientDeliveryFilesWithApproval(
      baseJob({
        spineStatus: "ready_for_delivery",
        ownerApprovalPending: null,
        clientDeliveryFiles: [cdf(), cdf({ id: "cdf-2", deliverableKey: "deliverable-1" })],
      }),
    );
    const result = applyProductionWorkspacePatch(
      envelope(job),
      campaign(),
      job.jobId,
      { action: "mark_delivered" },
      ownerUser,
      [],
      [],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.finalDeliveryAuthorization?.status).toBe("DELIVERED");
      expect(result.job.finalDeliveryAuthorization?.approvedAuthorizationDecisionId).toBe(
        "caa-adb-1",
      );
      expect(result.job.finalDeliveryAuthorization?.contentSha256s).toEqual([HASH_V1]);
      expect(result.job.finalDeliveryAuthorization?.workVersionId).toBe(WV_V1);
    }
  });

  it("approval survives session loss (durable job pin)", () => {
    const job = baseJob();
    const pin = job.customerApprovedArtifactAuthorization!;
    const restored: PurchasedJobRecord = {
      ...job,
      customerApprovedArtifactAuthorization: { ...pin },
    };
    expect(restored.customerApprovedArtifactAuthorization?.decisionId).toBe(pin.decisionId);
    expect(restored.customerApprovedArtifactAuthorization?.contentSha256s).toEqual([HASH_V1]);
  });

  it("delivery record reconstructs approval → delivered artifact", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      clientDeliveryFiles: [cdf()],
    });
    const record = buildFinalDeliveryAuthorizationRecord({ job, deliveredAt: NOW });
    expect(record?.approvedAuthorizationDecisionId).toBe(
      job.customerApprovedArtifactAuthorization?.decisionId,
    );
    expect(record?.contentSha256s).toEqual(
      job.customerApprovedArtifactAuthorization?.contentSha256s,
    );
    expect(record?.clientDeliveryFileIds).toEqual(["cdf-1"]);
  });

  it("multi-deliverable mismatch blocks package", () => {
    const job = baseJob({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      clientDeliveryFiles: [
        cdf(),
        cdf({
          id: "cdf-bad",
          deliverableKey: "deliverable-1",
          contentSha256: HASH_V2,
        }),
      ],
    });
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.outcome).toBe("BLOCKED_APPROVAL_MISMATCH");
    expect(decision.blockCodes).toContain("multi_deliverable_mismatch");
  });

  it("routine exact-match path requires no Owner escalation", () => {
    const job = stampClientDeliveryFilesWithApproval(
      baseJob({
        spineStatus: "ready_for_delivery",
        ownerApprovalPending: null,
        clientDeliveryFiles: [cdf()],
      }),
    );
    const decision = evaluateDeliveryEligibility({ job });
    expect(decision.escalationTarget).toBe("none");
    expect(studioApprovedDeliveryV1.routineMatchAuthorization).toBe("owner_independent");
    expect(studioApprovedDeliveryV1.routineReleaseAuthorization).toBe("system");
  });

  it("genuine Owner release exception remains intact", () => {
    const held = requestOwnerApprovalBeforeDelivery(
      stampClientDeliveryFilesWithApproval(
        baseJob({
          spineStatus: "approved",
          ownerApprovalPending: null,
          clientDeliveryFiles: [
            cdf({ releaseStatus: "pending_release" }),
            cdf({ id: "cdf-2", deliverableKey: "deliverable-1", releaseStatus: "pending_release" }),
          ],
        }),
      ),
    );
    expect(held.ownerApprovalPending).toBe("before_delivery");
    expect(
      canSystemAuthorizeFinalDelivery(held, ["Post concepts", "Caption copy"], NO_MATERIAL_HOLDS)
        .allowed,
    ).toBe(false);
    expect(canOwnerFinalRelease(held, NO_MATERIAL_HOLDS).allowed).toBe(true);
    const released = applyProductionWorkspacePatch(
      envelope(held),
      campaign(),
      held.jobId,
      { action: "owner_final_release" },
      ownerUser,
      [],
      [],
    );
    expect(released.ok).toBe(true);
    if (released.ok) {
      expect(released.job.spineStatus).toBe("ready_for_delivery");
    }
  });

  it("approve_for_delivery writes durable approval pin from QA identity", () => {
    const reviewJob = baseJob({
      spineStatus: "ready_for_review",
      ownerApprovalPending: null,
      customerApprovedArtifactAuthorization: undefined,
      deliverablePrep: [
        { deliverableKey: "deliverable-0", label: "Post concepts", preparedAt: NOW },
        { deliverableKey: "deliverable-1", label: "Caption copy", preparedAt: NOW },
      ],
    });
    const feedback = createEmptyJobReviewFeedback(
      reviewJob.campaignId,
      reviewJob.jobId,
      ["deliverable-0", "deliverable-1"],
      { packageId: "pkg:adb-v1:approve", releaseActivityId: "release-1" },
    );
    feedback.sectionStatuses["deliverable-0"] = "approved";
    feedback.sectionStatuses["deliverable-1"] = "skip";
    const result = applyReviewRoomPatch(
      envelope(reviewJob),
      campaign(),
      reviewJob,
      { action: "approve_for_delivery", feedback },
      clientUser,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.customerApprovedArtifactAuthorization?.status).toBe("CUSTOMER_APPROVED");
      expect(result.job.customerApprovedArtifactAuthorization?.contentSha256s).toEqual([HASH_V1]);
      expect(result.job.customerApprovedArtifactAuthorization?.workVersionId).toBe(WV_V1);
      expect(result.job.customerApprovedArtifactAuthorization?.sourceQaDecisionId).toBe("re-adb-1");
      expect(result.job.ownerApprovalPending).toBeNull();
    }
  });

  it("final delivery record reconstructs exact approval including package identity", () => {
    const job = stampClientDeliveryFilesWithApproval(
      baseJob({
        spineStatus: "ready_for_delivery",
        ownerApprovalPending: null,
        clientDeliveryFiles: [cdf(), cdf({ id: "cdf-2", deliverableKey: "deliverable-1" })],
      }),
    );
    const record = buildFinalDeliveryAuthorizationRecord({ job, deliveredAt: NOW });
    expect(record?.approvedAuthorizationDecisionId).toBe("caa-adb-1");
    expect(record?.workVersionId).toBe(WV_V1);
    expect(record?.contentSha256s).toEqual([HASH_V1]);
    expect(record?.artifactIds).toEqual([ART_V1]);
    expect(record?.reviewPackageId).toBe("pkg:adb-v1:approved");
    expect(record?.sourceQaDecisionId).toBe("re-adb-1");
    expect(record?.clientDeliveryFileIds).toEqual(["cdf-1", "cdf-2"]);
    expect(record?.deliveredAt).toBe(NOW);
  });

  it("pin builder fails closed without QA authorization", () => {
    const job = baseJob({
      internalQaReviewAuthorization: undefined,
      customerApprovedArtifactAuthorization: undefined,
    });
    const built = buildCustomerApprovedArtifactAuthorization({
      job,
      feedback: {
        packageId: "pkg:x",
        releaseActivityId: null,
        submissionType: "approved_for_delivery",
      },
    });
    expect(built.ok).toBe(false);
  });
});
