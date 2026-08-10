import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { materialsConfig } from "@/config/materials";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  applyMaterialUseDecisionToItem,
  buildUseAuthorization,
  categoryRequiresUseClearance,
} from "@/lib/studio-material-use";
import { stampClientDeliveryFilesWithApproval } from "@/lib/studio-approved-delivery";

import {
  applySystemFinalDeliveryAuthorization,
  canOwnerFinalRelease,
  canSystemAuthorizeFinalDelivery,
  materialContextFromLedger,
  materialContextUnavailable,
  reevaluateSystemFinalDeliveryAfterMaterialChange,
} from "./index";

const NOW = "2026-08-10T23:30:00.000Z";
const CAMPAIGN = "rrc-v1";
const HASH = "sha256:rrc-v1";
const WV = "work:rrc-v1";
const ART = "artifact:rrc-v1";

function material(overrides: Partial<CampaignMaterialItem> = {}): CampaignMaterialItem {
  return {
    id: "mat-logo",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "submitted",
    contentKind: "file-metadata",
    label: "Logo file",
    reason: "Brand",
    relatedServiceIds: ["bf-001"],
    uploadStatus: "metadata_only",
    submittedAt: NOW,
    fileName: "logo.png",
    ...overrides,
  };
}

function clearedLogo(): CampaignMaterialItem {
  return applyMaterialUseDecisionToItem({
    item: material({
      useAuthorization: buildUseAuthorization({
        basis: "customer_has_permission",
        attestedAt: NOW,
      }),
    }),
    campaignId: CAMPAIGN,
    evaluatedAt: NOW,
  });
}

function releasableJob(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  const jobId = buildJobId(CAMPAIGN, "bf-001");
  return stampClientDeliveryFilesWithApproval({
    jobId,
    campaignId: CAMPAIGN,
    skuId: "bf-001",
    serviceName: "Brand Foundation",
    spineStatus: "approved",
    productionLane: "quick",
    intakeComplete: true,
    ownerApprovalPending: null,
    internalQaReviewAuthorization: {
      status: "ELIGIBLE_FOR_REVIEW",
      decisionId: "re-rrc-1",
      packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
      skuId: "bf-001",
      qaRecordIds: ["qa-1"],
      workVersionId: WV,
      contentSha256s: [HASH],
      artifactIds: [ART],
      authorizedAt: NOW,
    },
    customerApprovedArtifactAuthorization: {
      status: "CUSTOMER_APPROVED",
      decisionId: "caa-rrc-1",
      schemaVersion: 1,
      packageId: "PRODUCTION-ASSURANCE-APPROVED-DELIVERED-BINDING-1",
      jobId,
      campaignId: CAMPAIGN,
      skuId: "bf-001",
      workVersionId: WV,
      artifactIds: [ART],
      contentSha256s: [HASH],
      qaRecordIds: ["qa-1"],
      reviewPackageId: "pkg-rrc-1",
      releaseActivityId: null,
      approvedAt: NOW,
      feedbackSubmissionType: "approved_for_delivery",
      sourceQaDecisionId: "re-rrc-1",
    },
    clientDeliveryFiles: [
      {
        id: "cdf-1",
        deliverableKey: "deliverable-0",
        deliverableLabel: "Brand kit",
        fileName: "kit.zip",
        fileType: "ZIP",
        url: "https://files.example/kit.zip",
        contentSha256: HASH,
        artifactId: ART,
        approvedWorkVersionId: WV,
        approvedAuthorizationDecisionId: "caa-rrc-1",
        releaseStatus: "pending_release",
        addedAt: NOW,
        addedBy: { role: "staff", displayName: "Staff" },
      },
    ],
    updatedAt: NOW,
    ...overrides,
  });
}

function campaign(): CampaignRecord {
  return {
    campaignId: CAMPAIGN,
    campaignName: "Rights Release Closeout",
    approvedStudioPlan: {
      lineItems: [
        {
          skuId: "bf-001",
          serviceName: "Brand Foundation",
          deliverables: ["Brand kit"],
          clientResponsibilities: ["Provide logo"],
        },
      ],
    },
  } as unknown as CampaignRecord;
}

describe("PRODUCTION-ASSURANCE-RIGHTS-RELEASE-CLOSEOUT-1", () => {
  it("Scenario I: customer approval + unresolved material hold blocks system Final Delivery", () => {
    const uncleared = material();
    const gate = canSystemAuthorizeFinalDelivery(
      releasableJob(),
      ["Brand kit"],
      materialContextFromLedger([uncleared]),
    );
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((r) => r.code === "material_use_hold")).toBe(true);

    const applied = applySystemFinalDeliveryAuthorization(
      releasableJob(),
      [],
      ["Brand kit"],
      { occurredAt: NOW, materialUse: materialContextFromLedger([uncleared]) },
    );
    expect(applied.applied).toBe(false);
    expect(applied.job.spineStatus).toBe("approved");
  });

  it("CLARIFICATION_REQUIRED / OWNER_POLICY_REVIEW / BLOCKED_FROM_USE each block release", () => {
    for (const status of [
      "needs_clarification",
      "owner_policy_review",
      "blocked_from_use",
    ] as const) {
      const held = material({ reviewStatus: status });
      expect(
        canSystemAuthorizeFinalDelivery(
          releasableJob(),
          ["Brand kit"],
          materialContextFromLedger([held]),
        ).allowed,
      ).toBe(false);
    }
  });

  it("APPROVED_FOR_USE permits material gate; empty ledger does not false-block", () => {
    expect(
      canSystemAuthorizeFinalDelivery(
        releasableJob(),
        ["Brand kit"],
        materialContextFromLedger([clearedLogo()]),
      ).allowed,
    ).toBe(true);

    expect(
      canSystemAuthorizeFinalDelivery(
        releasableJob(),
        ["Brand kit"],
        materialContextFromLedger([]),
      ).allowed,
    ).toBe(true);
  });

  it("missing material ledger data cannot silently bypass", () => {
    const gate = canSystemAuthorizeFinalDelivery(
      releasableJob(),
      ["Brand kit"],
      materialContextUnavailable(),
    );
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((r) => r.code === "materials_ledger_unavailable")).toBe(true);
  });

  it("replaced material invalidates prior clearance at release", () => {
    const photoA = applyMaterialUseDecisionToItem({
      item: material({
        id: "mat-photo",
        category: "photo-video",
        fileName: "photo-a.jpg",
        sizeBytes: 1000,
        relatedServiceIds: ["bf-001"],
        useAuthorization: buildUseAuthorization({
          basis: "customer_owns",
          attestedAt: NOW,
        }),
      }),
      campaignId: CAMPAIGN,
      evaluatedAt: NOW,
    });
    expect(photoA.reviewStatus).toBe("approved_for_use");

    const photoB: CampaignMaterialItem = {
      ...photoA,
      fileName: "photo-b.jpg",
      sizeBytes: 2000,
    };
    const gate = canSystemAuthorizeFinalDelivery(
      releasableJob(),
      ["Brand kit"],
      materialContextFromLedger([photoB]),
    );
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((r) => r.code === "material_use_hold")).toBe(true);
  });

  it("resolving hold permits reevaluation without customer re-approval", () => {
    const approvedJob = releasableJob();
    const envelope = {
      campaignId: CAMPAIGN,
      tasks: [],
      updatedAt: NOW,
      version: 10,
      syncedAt: NOW,
      jobRecords: [approvedJob],
      jobActivityEvents: [],
    } as ServerTasksEnvelope;

    const blocked = reevaluateSystemFinalDeliveryAfterMaterialChange({
      envelope,
      campaign: campaign(),
      materials: [material()],
      occurredAt: NOW,
    });
    expect(blocked.releasedJobIds).toEqual([]);
    expect(blocked.envelope.jobRecords?.[0]?.spineStatus).toBe("approved");

    const released = reevaluateSystemFinalDeliveryAfterMaterialChange({
      envelope,
      campaign: campaign(),
      materials: [clearedLogo()],
      occurredAt: NOW,
    });
    expect(released.releasedJobIds).toContain(approvedJob.jobId);
    expect(released.envelope.jobRecords?.[0]?.spineStatus).toBe("ready_for_delivery");
    expect(
      released.envelope.jobRecords?.[0]?.customerApprovedArtifactAuthorization?.decisionId,
    ).toBe("caa-rrc-1");
  });

  it("routine cleared release requires no Tagia; Owner material exception still blocked until clear", () => {
    const cleared = clearedLogo();
    const applied = applySystemFinalDeliveryAuthorization(
      releasableJob(),
      [],
      ["Brand kit"],
      { occurredAt: NOW, materialUse: materialContextFromLedger([cleared]) },
    );
    expect(applied.applied).toBe(true);
    expect(applied.job.spineStatus).toBe("ready_for_delivery");

    const heldJob = releasableJob({ ownerApprovalPending: "before_delivery" });
    expect(
      canOwnerFinalRelease(
        heldJob,
        materialContextFromLedger([material({ reviewStatus: "owner_policy_review" })]),
      ).allowed,
    ).toBe(false);
    expect(canOwnerFinalRelease(heldJob, materialContextFromLedger([cleared])).allowed).toBe(
      true,
    );
  });

  it("logo/photo attestation copy exists only for clearance categories", () => {
    expect(categoryRequiresUseClearance("logo-brand")).toBe(true);
    expect(categoryRequiresUseClearance("photo-video")).toBe(true);
    expect(categoryRequiresUseClearance("factual-confirmation")).toBe(false);
    expect(materialsConfig.clientUseAuthorizationLabel).toMatch(/own this|permission/i);
  });
});
