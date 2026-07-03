import { describe, expect, it } from "vitest";

import { sharedDriveFileRegistry } from "@/config/shared-drive-file-registry";
import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { buildJobId } from "@/lib/job-control/lane-map";
import { applyProductionWorkspacePatch } from "@/lib/job-control/production-workspace-actions";
import { resolveFinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import { resolveClientReviewView } from "@/lib/job-control/review-room-view";
import type { JobActivityActor, PurchasedJobRecord } from "@/lib/job-control/types";

import {
  addJobFileReference,
  createReferenceOnlyStorageRef,
  isClientMaterialReferenceVisible,
  releaseFinalDeliveryFiles,
  updateJobFileVersion,
  updateJobFileVisibility,
} from "./job-files";
import type { StudioFileReference } from "./types";

const NOW = "2026-07-03T18:00:00.000Z";
const CLIENT_ID = "client-file-registry";
const JOB_ID = buildJobId("file-reg-v1", "sm-001");

const staffActor: JobActivityActor = {
  role: "staff",
  userId: "staff-1",
  displayName: "Studio Staff",
};

const ownerActor: JobActivityActor = {
  role: "owner",
  userId: "owner-1",
  displayName: "Tagia",
};

const staffUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Studio Staff",
  roles: ["staff"] as const,
};

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "file-reg-v1",
    campaignName: "File Registry Demo",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "July 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
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
          timingWindowLabel: "3-5 days",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "Studio",
        },
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

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: "file-reg-v1",
    skuId: "sm-001",
    serviceName: "Social Launch",
    spineStatus: "building_concepts",
    productionLane: "quick",
    intakeComplete: true,
    deliverablePrep: [
      { deliverableKey: "deliverable-0", label: "Post concepts", preparedAt: NOW },
      { deliverableKey: "deliverable-1", label: "Caption copy", preparedAt: NOW },
    ],
    updatedAt: NOW,
    ...overrides,
  };
}

function envelope(jobRecord: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: "file-reg-v1",
    tasks: [],
    planFingerprint: "file-registry",
    updatedAt: NOW,
    version: 10,
    syncedAt: NOW,
    jobRecords: [jobRecord],
    jobActivityEvents: [],
    jobReviewFeedback: [],
  };
}

function fileRef(overrides: Partial<StudioFileReference> = {}): StudioFileReference {
  return {
    id: "file:test",
    clientId: CLIENT_ID,
    campaignId: "file-reg-v1",
    jobId: JOB_ID,
    category: "client_material",
    filename: "logo.png",
    fileType: "PNG",
    storageRef: createReferenceOnlyStorageRef({
      reference: "Client/Registry/01 Client Materials/logo.png",
      referenceKind: "path_hint",
    }),
    visibility: "client_visible",
    versionLabel: "v1",
    status: "draft",
    addedBy: { role: "client", userId: CLIENT_ID, displayName: "Client" },
    addedAt: NOW,
    ...overrides,
  };
}

describe("File Registry + Shared Drive Reference Layer V1", () => {
  it("production workspace adds internal draft/source references", () => {
    const baseJob = job();
    const result = applyProductionWorkspacePatch(
      envelope(baseJob),
      campaign(),
      baseJob.jobId,
      {
        action: "add_working_file_ref",
        label: "Draft board",
        url: "https://workspace.example/manual-draft-ref",
      },
      staffUser,
      [],
      [],
      CLIENT_ID,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sourceResult = applyProductionWorkspacePatch(
      result.envelope,
      campaign(),
      baseJob.jobId,
      {
        action: "add_working_file_ref",
        label: "Editable source",
        url: "Shared Drive/source-file.ai",
        category: "internal_only_source",
      },
      staffUser,
      [],
      [],
      CLIENT_ID,
    );

    expect(sourceResult.ok).toBe(true);
    if (!sourceResult.ok) return;
    expect(sourceResult.job.fileRegistry?.[0]).toMatchObject({
      clientId: CLIENT_ID,
      campaignId: "file-reg-v1",
      jobId: JOB_ID,
      category: "internal_draft",
      filename: "Draft board",
      fileType: "reference",
      visibility: "internal_only",
      status: "draft",
    });
    expect(sourceResult.job.fileRegistry?.[1]).toMatchObject({
      category: "internal_only_source",
      filename: "Editable source",
      fileType: "source reference",
      visibility: "internal_only",
      status: "draft",
    });
    expect(result.job.workingFileRefs?.[0]?.registryFileId).toBe(result.job.fileRegistry?.[0]?.id);
  });

  it("review receives only approved client-visible proof references", () => {
    const proof = fileRef({
      id: "proof:approved",
      category: "review_proof",
      filename: "proof-v1.pdf",
      fileType: "PDF",
      visibility: "client_visible",
      status: "approved_for_review",
      deliverableKey: "deliverable-0",
      deliverableLabel: "Post concepts",
    });
    const hiddenDraft = fileRef({
      id: "proof:hidden",
      category: "review_proof",
      filename: "internal-proof.pdf",
      visibility: "internal_only",
      status: "approved_for_review",
      deliverableKey: "deliverable-0",
    });
    const wrongStatus = fileRef({
      id: "proof:draft",
      category: "review_proof",
      filename: "draft-proof.pdf",
      visibility: "client_visible",
      status: "draft",
      deliverableKey: "deliverable-0",
    });
    const reviewJob = job({
      spineStatus: "ready_for_review",
      ownerApprovalPending: null,
      fileRegistry: [proof, hiddenDraft, wrongStatus],
    });

    const view = resolveClientReviewView({
      campaign: campaign(),
      job: reviewJob,
      envelope: envelope(reviewJob),
    });

    expect(view?.deliverables[0]?.proofFiles).toHaveLength(1);
    expect(view?.deliverables[0]?.proofFiles[0]?.filename).toBe("proof-v1.pdf");
  });

  it("final delivery receives only released client-visible final references", () => {
    const released = fileRef({
      id: "final:released",
      category: "final_delivery",
      filename: "final-posts.zip",
      fileType: "ZIP",
      visibility: "client_visible",
      status: "released",
      deliverableKey: "deliverable-0",
      deliverableLabel: "Post concepts",
    });
    const pending = fileRef({
      id: "final:pending",
      category: "final_delivery",
      filename: "pending-captions.pdf",
      fileType: "PDF",
      visibility: "client_visible",
      status: "approved_for_release",
      deliverableKey: "deliverable-1",
      deliverableLabel: "Caption copy",
    });
    const readyJob = job({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: null,
      fileRegistry: [released, pending],
      clientDeliveryFiles: [
        {
          id: "cdf-released",
          registryFileId: released.id,
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: released.filename,
          fileType: released.fileType,
          url: released.storageRef.reference,
          releaseStatus: "released",
          addedAt: NOW,
          addedBy: ownerActor,
        },
        {
          id: "cdf-pending",
          registryFileId: pending.id,
          deliverableKey: "deliverable-1",
          deliverableLabel: "Caption copy",
          fileName: pending.filename,
          fileType: pending.fileType,
          url: pending.storageRef.reference,
          releaseStatus: "pending_release",
          addedAt: NOW,
          addedBy: ownerActor,
        },
      ],
    });

    const view = resolveFinalDeliveryView(campaign(), [readyJob]);
    expect(view.jobs[0]?.files).toHaveLength(1);
    expect(view.jobs[0]?.files[0]?.fileName).toBe("final-posts.zip");
  });

  it("client materials visibility is scoped to the correct client and job", () => {
    const ref = fileRef({ sourceMaterialId: "material-logo" });
    expect(
      isClientMaterialReferenceVisible(ref, {
        clientId: CLIENT_ID,
        campaignId: "file-reg-v1",
        jobId: JOB_ID,
      }),
    ).toBe(true);
    expect(
      isClientMaterialReferenceVisible(ref, {
        clientId: "other-client",
        campaignId: "file-reg-v1",
        jobId: JOB_ID,
      }),
    ).toBe(false);
    expect(
      isClientMaterialReferenceVisible(ref, {
        clientId: CLIENT_ID,
        campaignId: "file-reg-v1",
        jobId: buildJobId("file-reg-v1", "other-sku" as never),
      }),
    ).toBe(false);
  });

  it("creates activity entries for add, visibility, version, and release events", () => {
    const added = addJobFileReference(job(), [], {
      clientId: CLIENT_ID,
      category: "final_delivery",
      filename: "final.zip",
      fileType: "ZIP",
      storageRef: createReferenceOnlyStorageRef({ reference: "Shared Drive/final.zip" }),
      visibility: "internal_only",
      status: "approved_for_release",
      actor: staffActor,
      occurredAt: NOW,
      deliverableKey: "deliverable-0",
      deliverableLabel: "Post concepts",
    });
    const visible = updateJobFileVisibility(added.job, added.events, {
      fileId: added.file.id,
      visibility: "client_visible",
      actor: ownerActor,
      occurredAt: "2026-07-03T18:05:00.000Z",
    });
    const versioned = updateJobFileVersion(visible.job, visible.events, {
      fileId: added.file.id,
      versionLabel: "v2",
      actor: staffActor,
      occurredAt: "2026-07-03T18:10:00.000Z",
    });
    const released = releaseFinalDeliveryFiles(
      versioned.job,
      versioned.events,
      ownerActor,
      "2026-07-03T18:15:00.000Z",
    );

    const kinds = released.events.map((event) => event.kind);
    expect(kinds).toContain("file_reference_added");
    expect(kinds).toContain("file_visibility_changed");
    expect(kinds).toContain("file_version_updated");
    expect(kinds).toContain("file_released");
  });

  it("does not claim a live Google connection", () => {
    const storageRef = createReferenceOnlyStorageRef({
      reference: "Shared Drive/manual/reference",
    });

    expect(storageRef.provider).toBe("google_shared_drive");
    expect(storageRef.connectionStatus).toBe("reference_only");
    expect(sharedDriveFileRegistry.connectionStatus).toBe("reference_only_no_google_api");
    expect(sharedDriveFileRegistry.noConnectionNotice).toMatch(/not connected/i);
    expect(sharedDriveFileRegistry.noConnectionNotice).toMatch(/Google APIs/i);
  });
});
