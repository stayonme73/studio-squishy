import { describe, expect, it } from "vitest";
import { createHash } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { studioMaterialsUploadV1 } from "@/config/studio-materials-upload-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import { createMockFileRoomStorageAdapter } from "@/lib/file-storage/mock";
import { createFsFileRoomStorageAdapter } from "@/lib/file-storage/fs-adapter";
import { buildJobId } from "@/lib/job-control/lane-map";
import { assembleCustomerLifeTruth } from "@/lib/studio-customer-life";

import {
  downloadStoredCustomerMaterialBytes,
  isPrivateStoredMaterial,
  storeAndAttachCustomerMaterialFile,
  validateCustomerMaterialFile,
} from "./client-file-store";
import { reconcileFlyerWordmarkMaterialTruth } from "./store";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "./types";

const now = "2026-08-15T12:00:00.000Z";
const CAMPAIGN_ID = "maya-upload-receipt";
const JOB_ID = buildJobId(CAMPAIGN_ID, "v2-rtu-flyer");

const maya: StudioUser = {
  id: "maya-brooks",
  email: "maya@cedarandbloom.test",
  displayName: "Maya Brooks",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
};

function flyerLineItem(): NonNullable<CampaignRecord["approvedStudioPlan"]>["lineItems"][number] {
  return {
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    billingType: "one_time",
    exactPriceCents: 6900,
    priceDisplay: "$69",
    deliverables: ["One flyer"],
    exclusions: [],
    timingWindowLabel: "3–5 days",
    revisionRule: "1 round",
    clientResponsibilities: [
      "Final wording, prices, logo, images, and contact details you want on the flyer",
    ],
    executionResponsibility: "studio",
  };
}

function campaign(): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 6900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 6900,
      lineItems: [flyerLineItem()],
      approvedAt: now,
    },
  };
}

function logoItem(overrides: Partial<CampaignMaterialItem> = {}): CampaignMaterialItem {
  return {
    id: "logo-brand-v2-rtu-flyer-slot",
    category: "logo-brand",
    requirementLevel: "optional",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo & brand assets",
    reason: "Make Me a Flyer",
    relatedServiceIds: ["v2-rtu-flyer"],
    uploadStatus: "none",
    ...overrides,
  };
}

function materials(items: CampaignMaterialItem[]): ServerMaterialsEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    items,
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

function tasks(): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    version: 12,
    planFingerprint: "fp",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId: JOB_ID,
        campaignId: CAMPAIGN_ID,
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        spineStatus: "building_concepts",
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
      },
    ],
    qaRecords: [],
  };
}

function pngFile(bytes = "CEDAR-AND-BLOOM-WORDMARK-PNG", name = "maya-optional-mark.png"): File {
  return new File([bytes], name, { type: "image/png" });
}

describe("STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1", () => {
  it("rejects empty, missing-name, oversized, and unsupported files before storage", () => {
    expect(validateCustomerMaterialFile(new File([], "empty.png", { type: "image/png" })).ok).toBe(
      false,
    );
    expect(
      validateCustomerMaterialFile(new File(["x"], "virus.exe", { type: "application/x-msdownload" }))
        .ok,
    ).toBe(false);
    expect(
      validateCustomerMaterialFile(
        new File([new Uint8Array(studioMaterialsUploadV1.maxFileBytes + 1)], "huge.png", {
          type: "image/png",
        }),
      ).error,
    ).toBe(studioMaterialsUploadV1.customerCopy.tooLarge);
  });

  it("stores real bytes, receipts from stored truth, and makes them retrievable", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const file = pngFile();
    const expectedHash = createHash("sha256").update(Buffer.from("CEDAR-AND-BLOOM-WORDMARK-PNG")).digest("hex");

    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: maya.id,
      tasks: tasks(),
      materials: materials([logoItem()]),
      user: maya,
      file,
      itemId: logoItem().id,
    });

    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.duplicate).toBe(false);
    expect(stored.retrievedBytes).toBeGreaterThan(0);
    expect(stored.checksumSha256).toBe(expectedHash);

    const item = stored.materials.items[0]!;
    expect(isPrivateStoredMaterial(item)).toBe(true);
    expect(item.reviewStatus).toBe("submitted");
    expect(item.reviewStatus).not.toBe("approved_for_use");
    expect(item.uploadStatus).toBe("stored");
    expect(item.storageRef?.checksumSha256).toBe(expectedHash);

    const job = stored.tasks.jobRecords?.[0];
    expect(job?.fileRegistry?.some((ref) => ref.storageRef.checksumSha256 === expectedHash)).toBe(
      true,
    );
    expect(job?.lastClientResponseAt).toBeTruthy();
    expect(stored.tasks.jobActivityEvents?.some((event) => event.kind === "client_upload")).toBe(
      true,
    );

    const downloaded = await downloadStoredCustomerMaterialBytes({ adapter, item });
    expect(downloaded.ok).toBe(true);
    if (!downloaded.ok) return;
    expect(Buffer.from(downloaded.body).toString("utf8")).toBe("CEDAR-AND-BLOOM-WORDMARK-PNG");
    expect(downloaded.checksumSha256).toBe(expectedHash);

    const truth = assembleCustomerLifeTruth({
      campaign: campaign(),
      materials: stored.materials.items,
      tasks: stored.tasks,
    });
    expect(truth.receivedMaterialCount).toBe(1);
  });

  it("keeps the first stored file on duplicate bytes and does not treat filename-only as received", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const file = pngFile();
    const first = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: maya.id,
      tasks: tasks(),
      materials: materials([logoItem()]),
      user: maya,
      file,
      itemId: logoItem().id,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: maya.id,
      tasks: first.tasks,
      materials: first.materials,
      user: maya,
      file,
      itemId: logoItem().id,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(second.checksumSha256).toBe(first.checksumSha256);
    expect(second.tasks.jobRecords?.[0]?.fileRegistry?.length).toBe(1);

    const filenameOnly = assembleCustomerLifeTruth({
      campaign: campaign(),
      materials: [
        logoItem({
          reviewStatus: "submitted",
          uploadStatus: "metadata_only",
          fileName: "maya-optional-mark.png",
        }),
      ],
    });
    expect(filenameOnly.receivedMaterialCount).toBe(0);
  });

  it("upgrades a previous filename-only ledger row to stored bytes", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: maya.id,
      tasks: tasks(),
      materials: materials([
        logoItem({
          reviewStatus: "submitted",
          uploadStatus: "metadata_only",
          fileName: "maya-optional-mark.png",
          mimeType: "image/png",
        }),
      ]),
      user: maya,
      file: pngFile(),
      itemId: logoItem().id,
    });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.materials.items[0]?.uploadStatus).toBe("stored");
    expect(isPrivateStoredMaterial(stored.materials.items[0]!)).toBe(true);
  });

  it("demotes seeded required flyer logo/photo/document slots without changing Brand Foundation", () => {
    const seeded = materials([
      logoItem({ requirementLevel: "required" }),
      {
        id: "photo-video-v2-rtu-flyer-slot",
        category: "photo-video",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Photos",
        reason: "Make Me a Flyer",
        relatedServiceIds: ["v2-rtu-flyer"],
        uploadStatus: "none",
      },
      {
        id: "document-reference-v2-rtu-flyer-slot",
        category: "document-reference",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Documents",
        reason: "Make Me a Flyer",
        relatedServiceIds: ["v2-rtu-flyer"],
        uploadStatus: "none",
      },
      {
        id: "logo-brand-bf-001-slot",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Brand logo",
        reason: "Brand Foundation",
        relatedServiceIds: ["bf-001"],
        uploadStatus: "none",
      },
    ]);
    const result = reconcileFlyerWordmarkMaterialTruth(seeded, campaign());
    expect(result.changed).toBe(true);
    expect(result.envelope.items.find((item) => item.id === logoItem().id)?.requirementLevel).toBe(
      "optional",
    );
    expect(
      result.envelope.items.find((item) => item.id === "photo-video-v2-rtu-flyer-slot")
        ?.requirementLevel,
    ).toBe("optional");
    expect(
      result.envelope.items.find((item) => item.id === "document-reference-v2-rtu-flyer-slot")
        ?.reviewStatus,
    ).toBe("not_needed");
    expect(
      result.envelope.items.find((item) => item.id === "logo-brand-bf-001-slot")?.requirementLevel,
    ).toBe("required");
  });

  it("keeps bytes after a fresh storage adapter — not localStorage-only", async () => {
    const adapter = createFsFileRoomStorageAdapter("studio-files-maya-return");
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: maya.id,
      tasks: tasks(),
      materials: materials([logoItem()]),
      user: maya,
      file: pngFile(),
      itemId: logoItem().id,
    });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    const objectPath = stored.materials.items[0]?.storageRef;
    expect(objectPath && "objectPath" in objectPath ? objectPath.objectPath : "").toMatch(
      /client_material/,
    );

    const fresh = createFsFileRoomStorageAdapter("studio-files-maya-return");
    const downloaded = await downloadStoredCustomerMaterialBytes({
      adapter: fresh,
      item: stored.materials.items[0]!,
    });
    expect(downloaded.ok).toBe(true);
    if (!downloaded.ok) return;
    expect(Buffer.from(downloaded.body).toString("utf8")).toBe("CEDAR-AND-BLOOM-WORDMARK-PNG");
  });
});
