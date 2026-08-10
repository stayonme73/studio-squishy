import { describe, expect, it } from "vitest";

import { requestOwnerApprovalBeforeDelivery } from "@/lib/job-control/actions";
import {
  canSystemAuthorizeFinalDelivery,
} from "@/lib/job-control/final-delivery-gates";
import { applyTeamReview, applyClientSubmitConsolidated } from "@/lib/materials/actions";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "@/lib/materials/types";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { buildJobId } from "@/lib/job-control/lane-map";

import type { MaterialCategory } from "@/lib/materials/types";
import { summarizeVideoCapabilityInventory } from "@/lib/studio-kitchen-production/video-production/inventory";

import {
  applyMaterialUseDecisionToItem,
  buildMaterialContentFingerprint,
  buildUseAuthorization,
  categoryRequiresUseClearance,
  evaluateMaterialUseDecision,
  isApprovedForUse,
  jobHasUnresolvedMaterialUseHold,
  materialBlocksProductionUse,
  studioMaterialUseV1,
} from "./index";

const NOW = "2026-08-10T22:00:00.000Z";
const CAMPAIGN = "mu-v1";

const clientUser = {
  id: "client-1",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"] as const,
  currentCampaignId: CAMPAIGN,
};

const staffUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"] as const,
};

function item(overrides: Partial<CampaignMaterialItem> = {}): CampaignMaterialItem {
  return {
    id: "mat-logo",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo file",
    reason: "Brand",
    relatedServiceIds: ["bf-001"],
    uploadStatus: "none",
    ...overrides,
  };
}

function envelope(items: CampaignMaterialItem[]): ServerMaterialsEnvelope {
  return {
    campaignId: CAMPAIGN,
    items,
    updatedAt: NOW,
    version: 1,
    syncedAt: NOW,
  };
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  const jobId = buildJobId(CAMPAIGN, "bf-001");
  return {
    jobId,
    campaignId: CAMPAIGN,
    skuId: "bf-001",
    serviceName: "Brand Foundation",
    spineStatus: "approved",
    productionLane: "quick",
    intakeComplete: true,
    ownerApprovalPending: null,
    customerApprovedArtifactAuthorization: {
      status: "CUSTOMER_APPROVED",
      decisionId: "caa-1",
      schemaVersion: 1,
      packageId: "PRODUCTION-ASSURANCE-APPROVED-DELIVERED-BINDING-1",
      jobId,
      campaignId: CAMPAIGN,
      skuId: "bf-001",
      workVersionId: "wv-1",
      artifactIds: ["art-1"],
      contentSha256s: ["sha-1"],
      qaRecordIds: ["qa-1"],
      reviewPackageId: "pkg-1",
      releaseActivityId: null,
      approvedAt: NOW,
      feedbackSubmissionType: "approved_for_delivery",
      sourceQaDecisionId: "re-1",
    },
    internalQaReviewAuthorization: {
      status: "ELIGIBLE_FOR_REVIEW",
      decisionId: "re-1",
      packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
      skuId: "bf-001",
      qaRecordIds: ["qa-1"],
      workVersionId: "wv-1",
      contentSha256s: ["sha-1"],
      artifactIds: ["art-1"],
      authorizedAt: NOW,
    },
    clientDeliveryFiles: [
      {
        id: "cdf-1",
        deliverableKey: "deliverable-0",
        deliverableLabel: "Brand kit",
        fileName: "kit.zip",
        fileType: "ZIP",
        url: "https://files.example/kit.zip",
        contentSha256: "sha-1",
        artifactId: "art-1",
        approvedWorkVersionId: "wv-1",
        approvedAuthorizationDecisionId: "caa-1",
        releaseStatus: "pending_release",
        addedAt: NOW,
        addedBy: { role: "staff", displayName: "Staff" },
      },
    ],
    updatedAt: NOW,
    ...overrides,
  };
}

function facts(overrides: Parameters<typeof evaluatePreAcceptance>[0] = {} as never) {
  return {
    draftRevision: 1,
    routeId: "signature",
    selectedServiceIds: ["bf-001"],
    projectNeed: "Need a brand kit for my bakery",
    businessName: "Cedar Bakery",
    requestedDeadline: "",
    deadlineStatus: "flexible",
    existingMaterialsNote: "",
    ...overrides,
  };
}

describe("PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1", () => {
  it("submitted alone does not satisfy required clearance for logo/photo", () => {
    const submitted = item({
      reviewStatus: "submitted",
      submittedAt: NOW,
      submittedBy: { role: "client", userId: "client-1" },
      fileName: "logo.png",
      uploadStatus: "metadata_only",
    });
    const decision = evaluateMaterialUseDecision({ item: submitted, campaignId: CAMPAIGN });
    expect(decision.outcome).toBe("CLARIFICATION_REQUIRED");
    expect(isBlockingMaterialItem(submitted, CAMPAIGN)).toBe(true);
    expect(materialBlocksProductionUse(submitted, CAMPAIGN)).toBe(true);
  });

  it("clear authorized customer asset → APPROVED_FOR_USE without Owner", () => {
    const cleared = applyMaterialUseDecisionToItem({
      item: item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        submittedBy: { role: "client", userId: "client-1" },
        fileName: "logo.png",
        uploadStatus: "metadata_only",
        useAuthorization: buildUseAuthorization({
          basis: "customer_owns",
          attestedAt: NOW,
          attestedBy: { role: "client", userId: "client-1" },
        }),
      }),
      campaignId: CAMPAIGN,
      evaluatedAt: NOW,
    });
    expect(cleared.reviewStatus).toBe("approved_for_use");
    expect(cleared.useDecision?.outcome).toBe("APPROVED_FOR_USE");
    expect(cleared.useDecision?.escalationTarget).toBe("none");
    expect(isBlockingMaterialItem(cleared, CAMPAIGN)).toBe(false);
    expect(studioMaterialUseV1.routineClearanceAuthorization).toBe("owner_independent");
  });

  it("missing material authorization → CLARIFICATION_REQUIRED with targeted prompt", () => {
    const decision = evaluateMaterialUseDecision({
      item: item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        fileName: "logo.png",
      }),
      campaignId: CAMPAIGN,
    });
    expect(decision.outcome).toBe("CLARIFICATION_REQUIRED");
    expect(decision.customerPrompt).toMatch(/own this logo|permission/i);
  });

  it("known hard block → BLOCKED_FROM_USE", () => {
    const decision = evaluateMaterialUseDecision({
      item: item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        text: "I do not have permission to use this logo",
        useAuthorization: buildUseAuthorization({ basis: "customer_owns", attestedAt: NOW }),
      }),
      campaignId: CAMPAIGN,
    });
    expect(decision.outcome).toBe("BLOCKED_FROM_USE");
  });

  it("genuine gray area → OWNER_POLICY_REVIEW", () => {
    const decision = evaluateMaterialUseDecision({
      item: item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        text: "Unsure about trademark permission for this mark",
        useAuthorization: buildUseAuthorization({
          basis: "customer_has_permission",
          attestedAt: NOW,
        }),
      }),
      campaignId: CAMPAIGN,
    });
    expect(decision.outcome).toBe("OWNER_POLICY_REVIEW");
    expect(decision.escalationTarget).toBe("owner_policy");
  });

  it("blocked / clarification / owner-review assets cannot enter production input", () => {
    for (const status of [
      "needs_clarification",
      "owner_policy_review",
      "blocked_from_use",
    ] as const) {
      expect(
        materialBlocksProductionUse(
          item({ reviewStatus: status, submittedAt: NOW }),
          CAMPAIGN,
        ),
      ).toBe(true);
    }
  });

  it("approved asset can enter production", () => {
    expect(
      materialBlocksProductionUse(
        item({
          reviewStatus: "approved_for_use",
          useAuthorization: buildUseAuthorization({
            basis: "customer_owns",
            attestedAt: NOW,
          }),
        }),
        CAMPAIGN,
      ),
    ).toBe(false);
  });

  it("customer answer triggers reevaluation to APPROVED_FOR_USE", () => {
    const result = applyClientSubmitConsolidated(
      envelope([item({ id: "logo-brand-bf-001-slot", reviewStatus: "requested" })]),
      "logo-brand:file-metadata",
      {
        fileName: "logo.png",
        useAuthorizationBasis: "customer_owns",
      },
      clientUser,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const next = result.envelope.items[0]!;
      expect(next.reviewStatus).toBe("approved_for_use");
      expect(next.useDecision?.outcome).toBe("APPROVED_FOR_USE");
      expect(next.useAuthorization?.basis).toBe("customer_owns");
    }
  });

  it("decision survives session loss on the durable materials record", () => {
    const cleared = applyMaterialUseDecisionToItem({
      item: item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        useAuthorization: buildUseAuthorization({ basis: "customer_owns", attestedAt: NOW }),
      }),
      campaignId: CAMPAIGN,
      evaluatedAt: NOW,
    });
    const restored = { ...cleared, useDecision: { ...cleared.useDecision! } };
    expect(restored.useDecision?.decisionId).toBe(cleared.useDecision?.decisionId);
    expect(isApprovedForUse(evaluateMaterialUseDecision({ item: restored, campaignId: CAMPAIGN }))).toBe(
      true,
    );
  });

  it("Studio-generated asset does not require customer ownership attestation", () => {
    const decision = evaluateMaterialUseDecision({
      item: item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        submittedBy: { role: "staff", userId: "staff-1" },
        fileName: "studio-mark.png",
      }),
      campaignId: CAMPAIGN,
    });
    expect(decision.outcome).toBe("APPROVED_FOR_USE");
  });

  it("low-friction factual confirmation does not invent clearance friction", () => {
    const fact = item({
      id: "mat-fact",
      category: "factual-confirmation",
      contentKind: "confirmation",
      reviewStatus: "submitted",
      submittedAt: NOW,
      submittedBy: { role: "client", userId: "client-1" },
      confirmedAt: NOW,
      text: "Yes, bakery name is Cedar",
    });
    const stamped = applyMaterialUseDecisionToItem({
      item: {
        ...fact,
        useAuthorization: buildUseAuthorization({
          basis: "customer_owns",
          attestedAt: NOW,
        }),
      },
      campaignId: CAMPAIGN,
    });
    expect(stamped.useDecision?.outcome).toBe("APPROVED_FOR_USE");
    expect(isBlockingMaterialItem(stamped, CAMPAIGN)).toBe(false);
  });

  it("known rights hold survives customer creative approval and blocks system release", () => {
    const uncleared = item({
      reviewStatus: "submitted",
      submittedAt: NOW,
      fileName: "logo.png",
      relatedServiceIds: ["bf-001"],
    });
    expect(jobHasUnresolvedMaterialUseHold([uncleared], CAMPAIGN, "bf-001")).toBe(true);
    expect(
      canSystemAuthorizeFinalDelivery(job(), ["Brand kit"], [uncleared]).allowed,
    ).toBe(false);
  });

  it("release remains blocked while material hold unresolved; Owner delivery exception path still available", () => {
    const blocked = item({
      reviewStatus: "blocked_from_use",
      relatedServiceIds: ["bf-001"],
    });
    const heldJob = requestOwnerApprovalBeforeDelivery(job());
    expect(canSystemAuthorizeFinalDelivery(heldJob, ["Brand kit"], [blocked]).allowed).toBe(
      false,
    );
    expect(heldJob.ownerApprovalPending).toBe("before_delivery");
  });

  it("pre-acceptance known hard block prevents CLEAR", () => {
    const decision = evaluatePreAcceptance(
      facts({
        materialRightsSignals: { hasHardRightsBlock: true },
      }),
    );
    expect(decision.outcome).toBe("DECLINE");
    expect(decision.paymentAllowed).toBe(false);
  });

  it("pre-acceptance material ambiguity prevents CLEAR only when acceptance requires resolution", () => {
    const blocked = evaluatePreAcceptance(
      facts({
        materialRightsSignals: {
          hasAcceptanceBlockingRightsAmbiguity: true,
          clarificationPrompt: "Do you have permission to use this logo?",
        },
      }),
    );
    expect(blocked.outcome).toBe("CLARIFICATION_REQUIRED");

    const clear = evaluatePreAcceptance(facts());
    expect(clear.outcome).toBe("CLEAR_TO_ACCEPT");
  });

  it("team Owner/policy and blocked review statuses persist useDecision", () => {
    const base = envelope([
      item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        useAuthorization: buildUseAuthorization({ basis: "customer_owns", attestedAt: NOW }),
      }),
    ]);
    const policy = applyTeamReview(base, "mat-logo", "owner_policy_review", "Unclear mark", staffUser);
    expect(policy.ok).toBe(true);
    if (policy.ok) {
      expect(policy.envelope.items[0]?.useDecision?.outcome).toBe("OWNER_POLICY_REVIEW");
      expect(isBlockingMaterialItem(policy.envelope.items[0]!, CAMPAIGN)).toBe(true);
    }

    const blocked = applyTeamReview(base, "mat-logo", "blocked_from_use", undefined, staffUser);
    expect(blocked.ok).toBe(true);
    if (blocked.ok) {
      expect(blocked.envelope.items[0]?.useDecision?.outcome).toBe("BLOCKED_FROM_USE");
    }
  });

  it("routine path requires no Tagia action", () => {
    const decision = evaluateMaterialUseDecision({
      item: item({
        reviewStatus: "submitted",
        submittedAt: NOW,
        useAuthorization: buildUseAuthorization({ basis: "customer_owns", attestedAt: NOW }),
      }),
      campaignId: CAMPAIGN,
    });
    expect(decision.escalationTarget).toBe("none");
    expect(decision.outcome).toBe("APPROVED_FOR_USE");
  });

  it("active-menu category policy matches clearance + non-acceptance boundaries", () => {
    const policy = studioMaterialUseV1.activeMenuCategoryPolicy;
    expect(policy.logosTrademarksBrandAssets).toMatch(/^CLEARANCE_REQUIRED/);
    expect(policy.customerPhotos).toMatch(/^CLEARANCE_REQUIRED/);
    expect(policy.customerVideoClips).toMatch(/^CLEARANCE_REQUIRED/);
    expect(policy.customerWrittenTextCopy).toMatch(/^CLEARANCE_NOT_REQUIRED/);
    expect(policy.customerDocumentsData).toMatch(/^CLEARANCE_NOT_REQUIRED/);
    expect(policy.studioGeneratedCopyAssets).toMatch(/^CLEARANCE_NOT_REQUIRED/);
    expect(policy.customerMusicAudio).toMatch(/^NOT_ACCEPTED/);
    expect(policy.customerFonts).toMatch(/^NOT_ACCEPTED/);

    expect(categoryRequiresUseClearance("logo-brand")).toBe(true);
    expect(categoryRequiresUseClearance("photo-video")).toBe(true);
    for (const category of [
      "document-reference",
      "url-link",
      "access-instructions",
      "factual-confirmation",
      "other",
    ] as const satisfies readonly MaterialCategory[]) {
      expect(categoryRequiresUseClearance(category)).toBe(false);
    }
  });

  it("customer music/audio is not an accepted materials input and cannot bypass music unresolved limits", () => {
    expect(studioMaterialUseV1.activeMenuCategoryPolicy.customerMusicAudio).toMatch(
      /NOT_ACCEPTED/,
    );
    expect(summarizeVideoCapabilityInventory().musicCapability).toBe("unresolved");
    // Materials taxonomy has no music/audio category — clearance path cannot mint approved_for_use for it.
    const categories = studioMaterialUseV1.clearanceRequiredCategories as readonly string[];
    expect(categories).not.toContain("music-audio");
    expect(categories).not.toContain("audio");
  });

  it("customer font files are not accepted as routine production inputs", () => {
    expect(studioMaterialUseV1.activeMenuCategoryPolicy.customerFonts).toMatch(/NOT_ACCEPTED/);
    // Font language in responsibilities maps to logo-brand keyword or text notes — not a font-file slot.
    expect(studioMaterialUseV1.clearanceRequiredCategories).not.toContain("font" as never);
  });

  it("APPROVED_FOR_USE decision is durable with audit fields for later proof", () => {
    const cleared = applyMaterialUseDecisionToItem({
      item: item({
        id: "mat-photo-a",
        category: "photo-video",
        reviewStatus: "submitted",
        submittedAt: NOW,
        fileName: "photo-a.jpg",
        sizeBytes: 1200,
        useAuthorization: buildUseAuthorization({
          basis: "customer_owns",
          attestedAt: NOW,
          attestedBy: { role: "client", userId: "client-1" },
          statement: "I own this photo",
        }),
      }),
      campaignId: CAMPAIGN,
      evaluatedAt: NOW,
    });

    const decision = cleared.useDecision!;
    expect(decision.outcome).toBe("APPROVED_FOR_USE");
    expect(decision.decisionId).toMatch(/^mu-/);
    expect(decision.contentFingerprint).toBe(
      buildMaterialContentFingerprint({
        ...cleared,
        // fingerprint is computed from content fields, not from useDecision
        useDecision: undefined,
      }),
    );
    expect(decision.authorizationBasis).toBe("customer_owns");
    expect(decision.evaluatedAt).toBe(NOW);
    expect(decision.packageId).toBe(studioMaterialUseV1.packageId);
    expect(decision.reasons.length).toBeGreaterThanOrEqual(0);

    // Survives browser/session loss when materials ledger is restored.
    const restored: CampaignMaterialItem = JSON.parse(JSON.stringify(cleared));
    expect(restored.useDecision?.decisionId).toBe(decision.decisionId);
    expect(isApprovedForUse(evaluateMaterialUseDecision({ item: restored, campaignId: CAMPAIGN }))).toBe(
      true,
    );
  });

  it("replacement asset invalidates prior APPROVED_FOR_USE (photo A must not authorize photo B)", () => {
    const photoA = applyMaterialUseDecisionToItem({
      item: item({
        id: "mat-photo",
        category: "photo-video",
        reviewStatus: "submitted",
        submittedAt: NOW,
        fileName: "photo-a.jpg",
        sizeBytes: 1000,
        useAuthorization: buildUseAuthorization({ basis: "customer_owns", attestedAt: NOW }),
      }),
      campaignId: CAMPAIGN,
      evaluatedAt: NOW,
    });
    expect(photoA.reviewStatus).toBe("approved_for_use");
    const fingerprintA = photoA.useDecision!.contentFingerprint;

    const photoBRaw: CampaignMaterialItem = {
      ...photoA,
      fileName: "photo-b.jpg",
      sizeBytes: 2000,
    };
    expect(buildMaterialContentFingerprint(photoBRaw)).not.toBe(fingerprintA);

    const liveDecision = evaluateMaterialUseDecision({
      item: photoBRaw,
      campaignId: CAMPAIGN,
    });
    expect(liveDecision.outcome).toBe("CLARIFICATION_REQUIRED");
    expect(liveDecision.blockCodes).toContain("content_replaced");
    expect(isBlockingMaterialItem(photoBRaw, CAMPAIGN)).toBe(true);

    const reevaluated = applyMaterialUseDecisionToItem({
      item: photoBRaw,
      campaignId: CAMPAIGN,
      evaluatedAt: "2026-08-10T23:00:00.000Z",
    });
    expect(reevaluated.useDecision?.outcome).toBe("CLARIFICATION_REQUIRED");
    expect(reevaluated.reviewStatus).toBe("needs_clarification");
    expect(materialBlocksProductionUse(reevaluated, CAMPAIGN)).toBe(true);
  });
});
