import { describe, expect, it } from "vitest";
import { createHash } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { studioExternalCustomerContentIntakeAndRightsCertificationV1 } from "@/config/studio-external-customer-content-intake-and-rights-certification-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import { createMockFileRoomStorageAdapter } from "@/lib/file-storage/mock";
import { buildJobId } from "@/lib/job-control/lane-map";
import { canTransitionToBuildingConcepts } from "@/lib/job-control/production-workspace-gates";
import { materialBlocksProductionUse } from "@/lib/studio-material-use";
import {
  certifyCustomerMaterialUpload,
  inspectCustomerFileBytes,
  isCustomerContentClearedForProduction,
  resolveContentRoutingState,
  syntheticCorruptPngFile,
  syntheticFakePngFile,
  syntheticPngFile,
  SYNTHETIC_PNG_1X1_BYTES,
} from "@/lib/studio-customer-content-intake";
import { buildCustomerContentRightsRecord } from "@/lib/studio-customer-content-intake/rights-record";
import { storeAndAttachCustomerMaterialFile } from "@/lib/materials/client-file-store";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "@/lib/materials/types";

const now = "2026-08-22T12:00:00.000Z";
const CAMPAIGN_ID = "gate-x-cert-campaign";
const JOB_ID = buildJobId(CAMPAIGN_ID, "v2-rtu-flyer");

const client: StudioUser = {
  id: "gate-x-client",
  email: "client@northwind.test",
  displayName: "Gate X Client",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
};

function photoItem(overrides: Partial<CampaignMaterialItem> = {}): CampaignMaterialItem {
  return {
    id: "photo-video-slot",
    category: "photo-video",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Photos",
    reason: "Campaign",
    relatedServiceIds: ["v2-rtu-flyer"],
    uploadStatus: "none",
    ...overrides,
  };
}

function campaign(): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Northwind Pantry",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Gate X proof",
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
      lineItems: [
        {
          skuId: "v2-rtu-flyer",
          serviceName: "Make Me a Flyer",
          billingType: "one_time",
          exactPriceCents: 6900,
          priceDisplay: "$69",
          deliverables: ["One flyer"],
          exclusions: [],
          timingWindowLabel: "3–5 days",
          revisionRule: "1 round",
          clientResponsibilities: ["Photos"],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: now,
    },
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

function tasks(jobOverrides: Partial<NonNullable<ServerTasksEnvelope["jobRecords"]>[number]> = {}): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    version: 1,
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
        spineStatus: "ready_for_queue",
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
        ...jobOverrides,
      },
    ],
    qaRecords: [],
  };
}

describe("STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1", () => {
  it("locks package routing states from config", () => {
    expect(studioExternalCustomerContentIntakeAndRightsCertificationV1.status).toBe("OPEN");
    expect(studioExternalCustomerContentIntakeAndRightsCertificationV1.routingStates).toEqual(
      expect.arrayContaining([
        "RECEIVED",
        "RIGHTS_INFORMATION_REQUIRED",
        "TECHNICAL_REVIEW_REQUIRED",
        "CLEARED_FOR_PRODUCTION",
        "CLEARED_WITH_LIMITS",
        "QUARANTINED",
        "REJECTED",
        "SUPERSEDED",
        "WITHDRAWN_BY_CUSTOMER",
      ]),
    );
  });

  it("inspects a valid synthetic PNG with dimensions and SHA-256", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const inspection = inspectCustomerFileBytes({
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "gate-x-proof.png",
      mimeType: "image/png",
      checksumSha256: checksum,
    });
    expect(inspection.signatureMatch).toBe(true);
    expect(inspection.supported).toBe(true);
    expect(inspection.imageWidth).toBe(1);
    expect(inspection.imageHeight).toBe(1);
    expect(inspection.sha256).toBe(checksum);
  });

  it("routes fake PNG bytes to technical review while still allowing storage on live path", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([
        {
          ...photoItem({ requirementLevel: "optional", category: "logo-brand", id: "logo-slot" }),
          label: "Logo",
        },
      ]),
      user: client,
      file: syntheticFakePngFile(),
      itemId: "logo-slot",
      useAuthorizationBasis: "customer_owns",
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
      },
    });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    const cert = stored.materials.items[0]?.contentCertification;
    expect(cert?.routingState).toBe("QUARANTINED");
    expect(cert?.productionCleared).toBe(false);
  });

  it("rejects corrupt PNG uploads before storage", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([photoItem()]),
      user: client,
      file: syntheticCorruptPngFile(),
      itemId: "photo-video-slot",
    });
    expect(stored.ok).toBe(false);
    if (stored.ok) return;
    expect(stored.status).toBe(400);
  });

  it("clears owned synthetic PNG with full rights attestation", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const result = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "northwind-own-photo.jpg",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.certification.routingState).toBe("CLEARED_FOR_PRODUCTION");
    expect(result.certification.productionCleared).toBe(true);
    expect(result.certification.technical.imageWidth).toBe(1);
  });

  it("blocks production when crop/adapt permission is denied", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const technical = inspectCustomerFileBytes({
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "northwind-menu-scan-no-adapt.pdf",
      mimeType: "image/png",
      checksumSha256: checksum,
    });
    const rights = buildCustomerContentRightsRecord({
      category: "photo-video",
      fileName: "northwind-menu-scan-no-adapt.pdf",
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: false,
        commercialUsePermitted: true,
      },
    });
    const resolved = resolveContentRoutingState({
      category: "photo-video",
      technical,
      rights,
    });
    expect(resolved.routingState).toBe("CLEARED_WITH_LIMITS");
    expect(resolved.limits).toContain("no_crop_adapt");
    expect(resolved.productionCleared).toBe(true);
  });

  it("quarantines identifiable-person filename hints until review", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const result = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "team-member-portrait.png",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.certification.routingState).toBe("QUARANTINED");
    expect(result.certification.productionCleared).toBe(false);
  });

  it("requires rights information when clearance category lacks attestation", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([photoItem()]),
      user: client,
      file: syntheticPngFile(),
      consolidatedItemId: "photo-video:file-metadata",
    });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    const item = stored.materials.items[0]!;
    expect(item.contentCertification?.routingState).toBe("RIGHTS_INFORMATION_REQUIRED");
    expect(isCustomerContentClearedForProduction(item)).toBe(false);
    expect(materialBlocksProductionUse(item, CAMPAIGN_ID)).toBe(true);
  });

  it("hard-blocks production workspace when required photo content is uncleared", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([photoItem()]),
      user: client,
      file: syntheticPngFile(),
      consolidatedItemId: "photo-video:file-metadata",
    });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    const item = stored.materials.items[0]!;
    expect(item.contentCertification?.routingState).toBe("RIGHTS_INFORMATION_REQUIRED");
    expect(materialBlocksProductionUse(item, CAMPAIGN_ID)).toBe(true);

    const gate = canTransitionToBuildingConcepts(
      tasks().jobRecords![0]!,
      stored.materials.items,
      [{ lane: "quick", availableSlots: 2, activeJobs: [] }],
    );
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((reason) => reason.code === "materials_incomplete")).toBe(true);
  });
});
