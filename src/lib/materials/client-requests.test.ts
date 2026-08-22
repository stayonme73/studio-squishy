import { describe, expect, it } from "vitest";

import type { ApprovedStudioPlanLineItem, CampaignRecord } from "@/config/studio-board";

import {
  buildApprovedServiceNameLookup,
  canClientSubmitMaterialItem,
  consolidatedRequestId,
  countClientIntakeMaterials,
  resolveConsolidatedClientRequests,
  resolveOptionalClientRequests,
  resolveUnderlyingItemIdsForConsolidated,
  sanitizeClientConsolidatedRequests,
} from "./client-requests";
import { buildMaterialsRecordFromCampaign } from "./migrate-from-project-details";
import type { CampaignMaterialItem } from "./types";

const now = "2026-06-01T12:00:00.000Z";

function buildCampaign(lineItems: ApprovedStudioPlanLineItem[]): CampaignRecord {
  return {
    campaignId: "consolidation-test",
    campaignName: "Consolidation Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: lineItems.map((item) => item.skuId),
      includedServiceIds: lineItems.map((item) => item.skuId),
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 150000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 150000,
      lineItems,
      approvedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function lineItem(
  skuId: ApprovedStudioPlanLineItem["skuId"],
  serviceName: string,
): ApprovedStudioPlanLineItem {
  return {
    skuId,
    serviceName,
    billingType: "one_time",
    exactPriceCents: 50000,
    priceDisplay: "$500",
    deliverables: [],
    exclusions: [],
    timingWindowLabel: "2 weeks",
    revisionRule: "1 round",
    clientResponsibilities: ["Existing logo files if available"],
    executionResponsibility: "studio",
  };
}

describe("resolveConsolidatedClientRequests", () => {
  it("consolidates three logo-brand slots into one client request", () => {
    const record = buildMaterialsRecordFromCampaign(
      buildCampaign([
        lineItem("bf-001", "Brand Identity Refresh"),
        lineItem("bf-002", "Marketing Video Project"),
        lineItem("sm-001", "Social Media Launch Set"),
      ]),
    );

    const logoItems = record.items.filter(
      (item) => item.category === "logo-brand" && item.requirementLevel === "required",
    );
    expect(logoItems.length).toBeGreaterThanOrEqual(3);

    const consolidated = resolveConsolidatedClientRequests(record);
    const logoRequest = consolidated.find((request) => request.id === "logo-brand:file-metadata");

    expect(logoRequest).toBeDefined();
    expect(consolidated.filter((request) => request.category === "logo-brand")).toHaveLength(1);
    expect(logoRequest?.underlyingItemIds.length).toBeGreaterThanOrEqual(3);
    expect(logoRequest?.reason).toContain("Brand Identity Refresh");
    expect(logoRequest?.reason).toContain("Marketing Video Project");
    expect(logoRequest?.reason).toContain("Social Media Launch Set");
    expect(logoRequest?.prompt).toMatch(/logo file/i);
  });

  it("uses approved plan service names instead of promotion whyNeeded or slot labels", () => {
    const serviceNameById = buildApprovedServiceNameLookup([
      lineItem("sm-001", "Social Media Launch Set"),
      lineItem("bf-001", "Brand Identity Refresh"),
    ]);

    const record = {
      campaignId: "c-plan-names",
      items: [
        {
          id: "logo-sm",
          category: "logo-brand" as const,
          requirementLevel: "required" as const,
          reviewStatus: "requested" as const,
          contentKind: "file-metadata" as const,
          label: "Logo file",
          reason: "Needed for Social Media Launch Set and Brand Foundation",
          whyNeeded: "Needed for Social Media Launch Set and Brand Foundation",
          relatedServiceIds: ["sm-001", "bf-001"] as const,
          uploadStatus: "none" as const,
          promotionApprovedAt: now,
          clientFacingLabel: "Logo file",
          clientFacingPrompt: "Please send your logo file",
        },
      ],
      updatedAt: now,
      version: 1,
    };

    const consolidated = resolveConsolidatedClientRequests(record, serviceNameById);
    expect(consolidated[0]?.reason).toBe(
      "Needed for Social Media Launch Set and Brand Identity Refresh",
    );
    expect(consolidated[0]?.reason).not.toContain("Brand Foundation");
  });

  it("maps consolidated submit back to all underlying blocking slots", () => {
    const items: CampaignMaterialItem[] = [
      {
        id: "logo-brand-bf-001-slot",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo & brand assets",
        reason: "Brand Foundation",
        relatedServiceIds: ["bf-001"],
        uploadStatus: "none",
      },
      {
        id: "logo-brand-bf-002-slot",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo & brand assets",
        reason: "Brand Refresh",
        relatedServiceIds: ["bf-002"],
        uploadStatus: "none",
      },
    ];

    const record = {
      campaignId: "c-1",
      items,
      updatedAt: now,
      version: 1,
    };

    const consolidatedId = consolidatedRequestId("logo-brand", "file-metadata");
    expect(resolveUnderlyingItemIdsForConsolidated(record, consolidatedId)).toEqual([
      "logo-brand-bf-001-slot",
      "logo-brand-bf-002-slot",
    ]);
  });
});

describe("resolveOptionalClientRequests", () => {
  it("returns only optional missing-like items", () => {
    const record = {
      campaignId: "c-2",
      items: [
        {
          id: "opt-1",
          category: "other" as const,
          requirementLevel: "optional" as const,
          reviewStatus: "missing" as const,
          contentKind: "text" as const,
          label: "Extra reference",
          reason: "Content Creation",
          relatedServiceIds: ["cc-001"] as const,
          uploadStatus: "none" as const,
        },
        {
          id: "req-1",
          category: "logo-brand" as const,
          requirementLevel: "required" as const,
          reviewStatus: "missing" as const,
          contentKind: "file-metadata" as const,
          label: "Logo",
          reason: "Brand Foundation",
          relatedServiceIds: ["bf-001"] as const,
          uploadStatus: "none" as const,
        },
      ],
      updatedAt: now,
      version: 1,
    };

    expect(resolveOptionalClientRequests(record)).toHaveLength(1);
    expect(resolveOptionalClientRequests(record)[0]?.itemId).toBe("opt-1");
    expect(resolveOptionalClientRequests(record)[0]?.statusLabel).toBe("Optional");
  });

  it("keeps a stored optional file sendable and names the stored file for the customer", () => {
    const stored: CampaignMaterialItem = {
      id: "logo-opt",
      category: "logo-brand",
      requirementLevel: "optional",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: "Logo file",
      reason: "Make Me a Flyer",
      relatedServiceIds: ["v2-rtu-flyer"],
      uploadStatus: "stored",
      fileName: "maya-optional-mark.png",
      submittedAt: now,
    };
    expect(canClientSubmitMaterialItem(stored)).toBe(true);
    expect(
      canClientSubmitMaterialItem({ ...stored, reviewStatus: "approved_for_use" }),
    ).toBe(false);

    const optional = resolveOptionalClientRequests({
      campaignId: "c-stored-optional",
      items: [stored],
      updatedAt: now,
      version: 1,
    });
    expect(optional[0]?.canSubmit).toBe(true);
    expect(optional[0]?.fileName).toBe("maya-optional-mark.png");
  });

  it("surfaces Case 4 quarantine explanation on the customer request payload", () => {
    const stored: CampaignMaterialItem = {
      id: "photo-case-4",
      category: "photo-video",
      requirementLevel: "required",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: "Photos",
      reason: "Make My Campaign Graphics",
      relatedServiceIds: ["v2-rtu-promotion-graphics"],
      uploadStatus: "stored",
      fileName: "northwind-shelf-with-fictional-labels.jpg",
      submittedAt: now,
      contentCertification: {
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1",
        certificationId: "ccert-case-4",
        routingState: "QUARANTINED",
        routingStateAt: now,
        technical: {
          inspectedAt: now,
          packageId: "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1",
          originalFileName: "northwind-shelf-with-fictional-labels.jpg",
          declaredMimeType: "image/jpeg",
          verifiedMimeType: "image/jpeg",
          signatureMatch: true,
          byteSize: 12,
          sha256: "abc",
          imageWidth: 1,
          imageHeight: 1,
          corrupt: false,
          supported: true,
          passwordProtected: false,
          duplicateOfSha256: null,
          issues: [],
        },
        rights: {
          recordedAt: now,
          packageId: "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1",
          customerProvided: true,
          ownershipBasis: "customer_has_permission",
          campaignUsePermitted: true,
          cropAdaptPermitted: true,
          commercialUsePermitted: true,
          attributionRequired: null,
          statementComplete: true,
          likenessReviewRequired: false,
          thirdPartyMaterialReviewRequired: true,
          likenessConsentConfirmed: false,
          thirdPartyRightsConfirmed: false,
          recognizablePeoplePresent: false,
          thirdPartyMaterialPresent: true,
          likenessFilenameHint: false,
          thirdPartyFilenameHint: true,
          rightsAnswersContradictFilenameHints: false,
          attestationTextVersion: "gate-x-rights-attestation-v1-2026-08-22-honest-hold",
        },
        productionCleared: false,
        productionBlockReason:
          "This file needs customer third-party rights confirmation before production use.",
        limits: [],
        history: [],
      },
    };

    const consolidated = resolveConsolidatedClientRequests({
      campaignId: "c-case-4",
      items: [stored],
      updatedAt: now,
      version: 1,
    });
    const sanitized = sanitizeClientConsolidatedRequests(consolidated);
    expect(sanitized[0]?.contentRoutingState).toBe("QUARANTINED");
    expect(sanitized[0]?.contentRoutingExplanation).toContain(
      "commercial-use authority is not confirmed",
    );
  });
});

describe("client intake visibility (Slice 3d-c-c)", () => {
  it("keeps submitted required items in consolidated client requests", () => {
    const record = {
      campaignId: "c-submitted",
      items: [
        {
          id: "logo-submitted",
          category: "logo-brand" as const,
          requirementLevel: "required" as const,
          reviewStatus: "submitted" as const,
          contentKind: "file-metadata" as const,
          label: "Logo file",
          reason: "Brand Foundation",
          relatedServiceIds: ["bf-001"] as const,
          uploadStatus: "metadata_only" as const,
          clientFacingLabel: "Logo file",
          clientFacingPrompt: "Please send your logo file",
        },
      ],
      updatedAt: now,
      version: 1,
    };

    const consolidated = resolveConsolidatedClientRequests(record);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]?.reviewStatus).toBe("submitted");
    expect(consolidated[0]?.statusLabel).toBe("Received — under review");
    expect(consolidated[0]?.canSubmit).toBe(true);
    expect(consolidated[0]?.isPendingReview).toBe(true);
    expect(countClientIntakeMaterials(record.items)).toBe(1);
  });

  it("strips internal ids from sanitized client payload", () => {
    const record = {
      campaignId: "c-sanitize",
      items: [
        {
          id: "logo-brand-bf-001-slot",
          category: "logo-brand" as const,
          requirementLevel: "required" as const,
          reviewStatus: "missing" as const,
          contentKind: "file-metadata" as const,
          label: "Logo & brand assets",
          reason: "Brand Foundation",
          relatedServiceIds: ["bf-001"] as const,
          uploadStatus: "none" as const,
        },
      ],
      updatedAt: now,
      version: 1,
    };

    const sanitized = sanitizeClientConsolidatedRequests(resolveConsolidatedClientRequests(record));
    expect(sanitized[0]).not.toHaveProperty("relatedServiceIds");
    expect(sanitized[0]).not.toHaveProperty("underlyingItemIds");
    expect(JSON.stringify(sanitized)).not.toContain("bf-001");
  });

  it("exposes client not-available disposition without exposing internal ids", () => {
    const record = {
      campaignId: "c-not-available",
      items: [
        {
          id: "goal-slot",
          category: "factual-confirmation" as const,
          requirementLevel: "required" as const,
          reviewStatus: "submitted" as const,
          contentKind: "text" as const,
          label: "Campaign goal",
          reason: "Social Media Launch Set",
          relatedServiceIds: ["sm-001"] as const,
          uploadStatus: "none" as const,
          submittedAt: now,
          clientAvailability: "not_available_yet" as const,
        },
      ],
      updatedAt: now,
      version: 1,
    };

    const sanitized = sanitizeClientConsolidatedRequests(resolveConsolidatedClientRequests(record));

    expect(sanitized[0]?.clientAvailability).toBe("not_available_yet");
    expect(sanitized[0]).not.toHaveProperty("underlyingItemIds");
  });
});
