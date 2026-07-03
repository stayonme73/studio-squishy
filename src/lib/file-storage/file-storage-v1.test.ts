import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { addJobFileReference, releaseFinalDeliveryFiles } from "@/lib/file-registry/job-files";
import type { StudioFileReference } from "@/lib/file-registry/types";
import { buildJobId } from "@/lib/job-control/lane-map";
import { resolveFinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import { resolveClientReviewView } from "@/lib/job-control/review-room-view";
import type { JobActivityActor, PurchasedJobRecord } from "@/lib/job-control/types";

import { canClientAccessFinalDeliveryFile, canStaffAccessInternalFile } from "./access";
import { createMockFileRoomStorageAdapter } from "./mock";
import { buildFileRoomPrivateObjectPath } from "./paths";
import { resolveClientFacingFileHref } from "./routes";
import { downloadClientFinalFile } from "./server-access";
import {
  createSupabasePrivateStorageRef,
  createSupabaseStorageAdapter,
  SupabaseStorageConfigurationError,
} from "./supabase";

const NOW = "2026-07-03T19:00:00.000Z";
const CLIENT_ID = "client-private-storage";
const CAMPAIGN_ID = "private-storage-v1";
const JOB_ID = buildJobId(CAMPAIGN_ID, "sm-001");

const ownerActor: JobActivityActor = {
  role: "owner",
  userId: "owner-1",
  displayName: "Tagia",
};

const staffActor: JobActivityActor = {
  role: "staff",
  userId: "staff-1",
  displayName: "Studio Staff",
};

const clientUser = {
  id: CLIENT_ID,
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"] as const,
  currentCampaignId: CAMPAIGN_ID,
};

const ownerUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Tagia",
  roles: ["owner"] as const,
};

const staffUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Studio Staff",
  roles: ["staff"] as const,
};

function campaign(): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Private Storage Demo",
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
          deliverables: ["Post concepts"],
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
  } as CampaignRecord;
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    skuId: "sm-001",
    serviceName: "Social Launch",
    spineStatus: "building_concepts",
    productionLane: "quick",
    intakeComplete: true,
    deliverablePrep: [{ deliverableKey: "deliverable-0", label: "Post concepts", preparedAt: NOW }],
    updatedAt: NOW,
    ...overrides,
  };
}

function envelope(jobRecord: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    tasks: [],
    planFingerprint: "private-storage-v1",
    updatedAt: NOW,
    version: 10,
    syncedAt: NOW,
    jobRecords: [jobRecord],
    jobActivityEvents: [],
    jobReviewFeedback: [],
  };
}

function privateFileRef(overrides: Partial<StudioFileReference> = {}): StudioFileReference {
  const category = overrides.category ?? "final_delivery";
  const filename = overrides.filename ?? "final-video.mp4";
  const fileType = overrides.fileType ?? "video/mp4";
  return {
    id: "file:private-final",
    clientId: CLIENT_ID,
    campaignId: CAMPAIGN_ID,
    jobId: JOB_ID,
    category,
    filename,
    fileType,
    storageRef: createSupabasePrivateStorageRef({
      bucket: "studio-files",
      scope: { clientId: CLIENT_ID, campaignId: CAMPAIGN_ID, jobId: JOB_ID, category },
      metadata: {
        filename,
        contentType: fileType,
        sizeBytes: 1024,
        versionLabel: "v1",
        uploadedAt: NOW,
      },
    }),
    visibility: "client_visible",
    versionLabel: "v1",
    status: "released",
    addedBy: ownerActor,
    addedAt: NOW,
    deliverableKey: "deliverable-0",
    deliverableLabel: "Post concepts",
    ...overrides,
  };
}

describe("File Room Private Storage Adapter V1", () => {
  it("builds private object paths with client, campaign, job, category, version, and filename scope", () => {
    const objectPath = buildFileRoomPrivateObjectPath(
      {
        clientId: "client-123",
        campaignId: "campaign-456",
        jobId: "job-789",
        category: "final_delivery",
      },
      {
        filename: "Final Video.mp4",
        contentType: "video/mp4",
        versionLabel: "v42",
      },
    );

    expect(objectPath).toBe(
      "clients/client-123/campaigns/campaign-456/jobs/job-789/final_delivery/v42/Final-Video.mp4",
    );
  });

  it("fails closed when Supabase Storage env is missing", () => {
    expect(() =>
      createSupabaseStorageAdapter({
        env: {},
        client: {
          async uploadPrivateObject() {
            return {};
          },
          async downloadPrivateObject() {
            return { body: new Uint8Array() };
          },
        },
      }),
    ).toThrow(SupabaseStorageConfigurationError);
  });

  it("blocks client access to internal-only, review-proof, and unreleased private objects", () => {
    const baseJob = job({ spineStatus: "ready_for_delivery" });
    const internal = privateFileRef({
      id: "file:internal",
      category: "internal_draft",
      visibility: "internal_only",
      status: "draft",
    });
    const reviewProof = privateFileRef({
      id: "file:review-proof",
      category: "review_proof",
      visibility: "client_visible",
      status: "approved_for_review",
    });
    const unreleasedFinal = privateFileRef({
      id: "file:unreleased-final",
      category: "final_delivery",
      visibility: "client_visible",
      status: "approved_for_release",
    });

    expect(canClientAccessFinalDeliveryFile({ user: clientUser, job: baseJob, file: internal }).allowed).toBe(false);
    expect(canClientAccessFinalDeliveryFile({ user: clientUser, job: baseJob, file: reviewProof }).allowed).toBe(false);
    expect(
      canClientAccessFinalDeliveryFile({
        user: clientUser,
        job: baseJob,
        file: unreleasedFinal,
        clientDeliveryFile: {
          id: "cdf:pending",
          registryFileId: unreleasedFinal.id,
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: unreleasedFinal.filename,
          fileType: unreleasedFinal.fileType,
          url: resolveClientFacingFileHref({
            registryFileId: unreleasedFinal.id,
            storageRef: unreleasedFinal.storageRef,
          }),
          storageRef: unreleasedFinal.storageRef,
          releaseStatus: "pending_release",
          addedAt: NOW,
          addedBy: ownerActor,
        },
      }).allowed,
    ).toBe(false);
  });

  it("allows a client to access only their own released client-final through Final Delivery checks", async () => {
    const adapter = createMockFileRoomStorageAdapter("studio-files");
    const scope = {
      clientId: CLIENT_ID,
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      category: "final_delivery" as const,
    };
    const metadata = {
      filename: "final-video.mp4",
      contentType: "video/mp4",
      sizeBytes: 1024,
      versionLabel: "v1",
      uploadedAt: NOW,
    };
    await adapter.uploadObject({ scope, metadata, body: new Uint8Array([1, 2, 3]) });
    const finalFile = privateFileRef({
      storageRef: adapter.createStorageRef(scope, metadata),
    });
    const baseJob = job({
      spineStatus: "ready_for_delivery",
      fileRegistry: [finalFile],
      clientDeliveryFiles: [
        {
          id: "cdf:released",
          registryFileId: finalFile.id,
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: finalFile.filename,
          fileType: finalFile.fileType,
          url: resolveClientFacingFileHref({ registryFileId: finalFile.id, storageRef: finalFile.storageRef }),
          storageRef: finalFile.storageRef,
          releaseStatus: "released",
          releasedAt: NOW,
          addedAt: NOW,
          addedBy: ownerActor,
        },
      ],
    });

    expect(
      canClientAccessFinalDeliveryFile({
        user: clientUser,
        job: baseJob,
        file: finalFile,
        clientDeliveryFile: baseJob.clientDeliveryFiles?.[0],
      }).allowed,
    ).toBe(true);
    expect(
      canClientAccessFinalDeliveryFile({
        user: { ...clientUser, id: "other-client", currentCampaignId: "other-campaign" },
        job: baseJob,
        file: finalFile,
      }).allowed,
    ).toBe(false);

    const download = await downloadClientFinalFile({
      adapter,
      user: clientUser,
      job: baseJob,
      file: finalFile,
      clientDeliveryFile: baseJob.clientDeliveryFiles?.[0],
    });
    expect(download.ok).toBe(true);
    if (download.ok) expect(download.download.contentType).toBe("video/mp4");
  });

  it("requires staff or owner authorization for internal private files", () => {
    const internal = privateFileRef({
      id: "file:internal",
      category: "internal_draft",
      visibility: "internal_only",
      status: "draft",
    });
    const baseJob = job({ fileRegistry: [internal] });

    expect(canStaffAccessInternalFile({ user: clientUser, job: baseJob, file: internal }).allowed).toBe(false);
    expect(canStaffAccessInternalFile({ user: staffUser, job: baseJob, file: internal }).allowed).toBe(false);
    expect(
      canStaffAccessInternalFile({
        user: staffUser,
        job: baseJob,
        file: internal,
        campaignAccessAllowed: true,
      }).allowed,
    ).toBe(true);
    expect(canStaffAccessInternalFile({ user: ownerUser, job: baseJob, file: internal }).allowed).toBe(true);
  });

  it("preserves registry and activity behavior when private storage refs are attached", () => {
    const storageRef = privateFileRef({ category: "internal_draft", visibility: "internal_only", status: "draft" }).storageRef;
    const result = addJobFileReference(job(), [], {
      clientId: CLIENT_ID,
      category: "internal_draft",
      filename: "draft-board.pdf",
      fileType: "application/pdf",
      storageRef,
      visibility: "internal_only",
      status: "draft",
      actor: staffActor,
      occurredAt: NOW,
    });

    expect(result.file.storageRef.provider).toBe("supabase_storage");
    expect(result.job.fileRegistry?.[0]?.id).toBe(result.file.id);
    expect(result.events.map((event) => event.kind)).toContain("file_reference_added");
  });

  it("accepts large video metadata without reading bytes into memory", () => {
    const adapter = createMockFileRoomStorageAdapter();
    const storageRef = adapter.createStorageRef(
      {
        clientId: CLIENT_ID,
        campaignId: CAMPAIGN_ID,
        jobId: JOB_ID,
        category: "review_proof",
      },
      {
        filename: "launch-cut.mp4",
        contentType: "video/mp4",
        sizeBytes: 12 * 1024 * 1024 * 1024,
        versionLabel: "v3",
      },
    );

    expect(storageRef.provider).toBe("supabase_storage");
    if (storageRef.provider !== "supabase_storage") return;
    expect(storageRef.contentType).toBe("video/mp4");
    expect(storageRef.sizeBytes).toBe(12 * 1024 * 1024 * 1024);
    expect(storageRef.objectPath).toContain("/review_proof/v3/launch-cut.mp4");
  });

  it("does not leak public URLs, raw storage URLs, buckets, or object paths from client-facing helpers", () => {
    const finalFile = privateFileRef({
      id: "file:final",
      filename: "final-video.mp4",
    });
    const rawObjectPath = finalFile.storageRef.provider === "supabase_storage" ? finalFile.storageRef.objectPath : "";
    const releasedJob = job({
      spineStatus: "ready_for_delivery",
      fileRegistry: [finalFile],
      clientDeliveryFiles: [
        {
          id: "cdf:final",
          registryFileId: finalFile.id,
          deliverableKey: "deliverable-0",
          deliverableLabel: "Post concepts",
          fileName: finalFile.filename,
          fileType: finalFile.fileType,
          url: `https://example.supabase.co/storage/v1/object/${rawObjectPath}`,
          storageRef: finalFile.storageRef,
          releaseStatus: "released",
          releasedAt: NOW,
          addedAt: NOW,
          addedBy: ownerActor,
        },
      ],
    });
    const deliveryView = resolveFinalDeliveryView(campaign(), [releasedJob]);

    expect(deliveryView.jobs[0]?.files[0]?.url).toBe("/api/file-room/files/file%3Afinal/download");
    expect(JSON.stringify(deliveryView)).not.toContain("supabase.co");
    expect(JSON.stringify(deliveryView)).not.toContain(rawObjectPath);

    const proofFile = privateFileRef({
      id: "file:proof",
      category: "review_proof",
      filename: "proof.pdf",
      fileType: "application/pdf",
      status: "approved_for_review",
      visibility: "client_visible",
    });
    const reviewJob = job({
      spineStatus: "ready_for_review",
      fileRegistry: [proofFile],
    });
    const reviewView = resolveClientReviewView({
      campaign: campaign(),
      job: reviewJob,
      envelope: envelope(reviewJob),
    });

    expect(reviewView?.deliverables[0]?.proofFiles[0]?.accessHref).toBe("/api/file-room/files/file%3Aproof/proof");
    expect(JSON.stringify(reviewView)).not.toContain("studio-files");
    expect(JSON.stringify(reviewView)).not.toContain(
      proofFile.storageRef.provider === "supabase_storage" ? proofFile.storageRef.objectPath : "never",
    );
  });

  it("keeps release activity intact for private final files", () => {
    const pendingFinal = privateFileRef({
      status: "approved_for_release",
      visibility: "client_visible",
    });
    const releaseResult = releaseFinalDeliveryFiles(
      job({ fileRegistry: [pendingFinal] }),
      [],
      ownerActor,
      NOW,
    );

    expect(releaseResult.job.fileRegistry?.[0]?.status).toBe("released");
    expect(releaseResult.events.map((event) => event.kind)).toContain("file_released");
  });
});
