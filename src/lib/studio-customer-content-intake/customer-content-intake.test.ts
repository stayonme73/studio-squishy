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
  applyCustomerWithdrawFile,
  buildGateXCertificationRunManifest,
  certifyCustomerMaterialUpload,
  inspectCustomerFileBytes,
  isCustomerContentClearedForProduction,
  resolveContentRoutingState,
  syntheticCorruptPngFile,
  syntheticFakePngFile,
  syntheticPngFile,
  syntheticReplacementPngFile,
  SYNTHETIC_PNG_1X1_BYTES,
  teamResolvesTechnicalContentReview,
} from "@/lib/studio-customer-content-intake";
import { buildCustomerContentRightsRecord } from "@/lib/studio-customer-content-intake/rights-record";
import { applyTeamReview } from "@/lib/materials/actions";
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

const staff: StudioUser = {
  id: "gate-x-staff",
  email: "staff@studio.test",
  displayName: "Gate X Staff",
  roles: ["staff"],
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

  it("quarantines identifiable-person filename hints until customer likeness consent", () => {
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

  async function storeClearedPhoto(adapter = createMockFileRoomStorageAdapter()) {
    return storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([photoItem()]),
      user: client,
      file: syntheticPngFile(),
      consolidatedItemId: "photo-video:file-metadata",
      useAuthorizationBasis: "customer_owns",
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
      },
    });
  }

  it("withdrawal blocks previously cleared content and preserves history", async () => {
    const stored = await storeClearedPhoto();
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    const item = stored.materials.items[0]!;
    expect(isCustomerContentClearedForProduction(item)).toBe(true);
    const priorHistoryLength = item.contentCertification?.history.length ?? 0;

    const withdrawn = applyCustomerWithdrawFile(stored.materials, item.id);
    expect(withdrawn.ok).toBe(true);
    if (!withdrawn.ok) return;

    const next = withdrawn.envelope.items[0]!;
    expect(next.contentCertification?.routingState).toBe("WITHDRAWN_BY_CUSTOMER");
    expect(next.contentCertification?.withdrawnAt).toBeTruthy();
    expect(next.contentCertification?.productionCleared).toBe(false);
    expect((next.contentCertification?.history.length ?? 0)).toBeGreaterThan(priorHistoryLength);
    expect(isCustomerContentClearedForProduction(next)).toBe(false);
    expect(materialBlocksProductionUse(next, CAMPAIGN_ID)).toBe(true);
  });

  it("replacement supersedes instead of overwriting and keeps both certifications traceable", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const first = await storeClearedPhoto(adapter);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstItem = first.materials.items[0]!;
    const firstCertId = firstItem.contentCertification!.certificationId;

    const second = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: first.tasks,
      materials: first.materials,
      user: client,
      file: syntheticReplacementPngFile(),
      consolidatedItemId: "photo-video:file-metadata",
      useAuthorizationBasis: "customer_owns",
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
      },
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const item = second.materials.items[0]!;
    expect(item.contentCertification?.certificationId).not.toBe(firstCertId);
    expect(item.contentCertification?.replacesCertificationId).toBe(firstCertId);
    expect(item.contentCertificationArchive?.length).toBe(1);
    const archived = item.contentCertificationArchive![0]!;
    expect(archived.routingState).toBe("SUPERSEDED");
    expect(archived.supersededByCertificationId).toBe(item.contentCertification?.certificationId);
    expect(archived.certificationId).toBe(firstCertId);
    expect(isCustomerContentClearedForProduction(item)).toBe(true);
  });

  it("uncleared replacement cannot inherit prior clearance", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const first = await storeClearedPhoto(adapter);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: first.tasks,
      materials: first.materials,
      user: client,
      file: syntheticReplacementPngFile(),
      consolidatedItemId: "photo-video:file-metadata",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const item = second.materials.items[0]!;
    expect(item.contentCertification?.routingState).toBe("RIGHTS_INFORMATION_REQUIRED");
    expect(isCustomerContentClearedForProduction(item)).toBe(false);
    expect(item.contentCertificationArchive?.[0]?.routingState).toBe("SUPERSEDED");
    expect(item.contentCertificationArchive?.[0]?.productionCleared).toBe(false);
  });

  it("team technical approval cannot fabricate missing customer rights", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const likeness = certifyCustomerMaterialUpload({
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
    expect(likeness.ok).toBe(true);
    if (!likeness.ok) return;

    const envelope = materials([
      photoItem({
        reviewStatus: "submitted",
        uploadStatus: "stored",
        contentCertification: likeness.certification,
        storageRef: {
          provider: "supabase_storage",
          connectionStatus: "private_object",
          objectPath: "mock/path",
          checksumSha256: checksum,
        },
      }),
    ]);

    const reviewed = applyTeamReview(
      envelope,
      "photo-video-slot",
      "approved_for_use",
      undefined,
      staff,
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    const cert = reviewed.envelope.items[0]?.contentCertification;
    expect(cert?.routingState).toBe("QUARANTINED");
    expect(cert?.productionCleared).toBe(false);
    expect(isCustomerContentClearedForProduction(reviewed.envelope.items[0]!)).toBe(false);
  });

  it("team approval resolves only authorized technical-review conditions", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const technicalMismatch = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "northwind-photo.jpg",
      mimeType: "image/jpeg",
      checksumSha256: checksum,
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
      },
    });
    expect(technicalMismatch.ok).toBe(true);
    if (!technicalMismatch.ok) return;
    expect(technicalMismatch.certification.routingState).toBe("TECHNICAL_REVIEW_REQUIRED");

    const resolved = teamResolvesTechnicalContentReview(
      technicalMismatch.certification,
      "photo-video",
      now,
    );
    expect(resolved.routingState).toBe("CLEARED_FOR_PRODUCTION");
    expect(resolved.teamTechnicalReview?.clearedBy).toBe("team");
  });

  it("likeness consent from customer clears quarantine when other rights are complete", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const cleared = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "team-member-portrait.png",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
        likenessConsentConfirmed: true,
      },
    });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.certification.routingState).toBe("CLEARED_FOR_PRODUCTION");
  });

  it("builds deterministic certification-run manifest structure without recording a controlled test", () => {
    const checksum = createHash("sha256").update(SYNTHETIC_PNG_1X1_BYTES).digest("hex");
    const cert = certifyCustomerMaterialUpload({
      category: "photo-video",
      bytes: SYNTHETIC_PNG_1X1_BYTES,
      fileName: "manifest-proof.png",
      mimeType: "image/png",
      checksumSha256: checksum,
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
      },
    });
    expect(cert.ok).toBe(true);
    if (!cert.ok) return;

    const manifest = buildGateXCertificationRunManifest({
      campaignId: CAMPAIGN_ID,
      items: [
        photoItem({
          uploadStatus: "stored",
          reviewStatus: "submitted",
          contentCertification: cert.certification,
        }),
      ],
      runId: "gate-x-proof-run",
      capturedAt: now,
    });
    expect(manifest.runId).toBe("gate-x-proof-run");
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]?.certificationId).toBe(cert.certification.certificationId);
    expect(manifest.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
