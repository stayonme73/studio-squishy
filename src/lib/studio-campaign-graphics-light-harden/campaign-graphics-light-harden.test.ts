/**
 * HARDEN #4 — CAMPAIGN GRAPHICS (LIGHT)
 * Proves the narrowed $79 two-graphic digital CERT set. Does not remint Maya.
 * Menu, Social, Card, and Short Video do not piggyback.
 */

import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import {
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL,
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL,
  CAMPAIGN_GRAPHICS_HONEST_PROMISED_OUTPUT,
  CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
  studioCampaignGraphicsLightHardenV1 as harden,
} from "@/config/studio-campaign-graphics-light-harden-v1";
import {
  appendGeneralDesignAttempt,
  createGeneralDesignInternalLoop,
} from "@/lib/studio-general-design-runtime/correction";
import { PROMO_PROOF_CONTRACT } from "@/lib/studio-design-renderer/promo-contracts";
import { evaluateMaterialsAndSubstituteAsset } from "@/lib/studio-materials-and-substitute-asset/evaluate";
import { assembleApprovedCampaignGraphicsClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { clientDeliveryFileLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";
import { skuLaneRow } from "@/lib/studio-static-creative-lane/sku-lane-matrix";
import { evaluateWorkSupervision } from "@/lib/studio-work-supervision/evaluate";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

function failAttempt(n: number) {
  return {
    attemptNumber: n,
    triggeredBy: n === 1 ? ("initial_dispatch" as const) : ("qa_correction" as const),
    qaResult: "fail" as const,
    failureCode: "QA_FAILURE",
    message: "fail",
    pngContentSha256: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

describe("HARDEN #4 — Campaign Graphics LIGHT", () => {
  it("locks the smallest honest $79 two-graphic digital set and drops hitchhikers", () => {
    expect(harden.skuId).toBe(CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU);
    expect(harden.offer.priceCents).toBe(7900);
    expect(harden.offer.exactAssetCount).toBe(2);
    expect(harden.offer.oneTheme).toBe(true);
    expect(harden.offer.soldPlates).toEqual([
      { id: "square", widthPx: 1024, heightPx: 1024 },
      { id: "portrait", widthPx: 1024, heightPx: 1536 },
    ]);
    expect(harden.offer.files).toEqual(["png"]);
    expect(harden.offer.captions).toBe(false);
    expect(harden.offer.landscapeSold).toBe(false);
    expect(harden.offer.certified300DpiPrint).toBe(false);
    expect(harden.offer.studioDoesNotPrintPostOrShip).toBe(true);
    expect(harden.twoGraphicsShareOneCompositionSystem).toBe(true);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.piggyback.menu).toBe(false);
    expect(harden.piggyback.socialPosts).toBe(false);
    expect(harden.piggyback.businessCard).toBe(false);
    expect(harden.piggyback.shortVideo).toBe(false);
    expect(harden.doNotRemintMaya).toBe(true);
    expect(harden.classification).toBe("SELL_NOW");
    expect(harden.frozen).toBe(true);
  });

  it("1 + 2 — one campaign-set renderer; both graphics version together", () => {
    expect(PROMO_PROOF_CONTRACT.promisedOutput).toBe(CAMPAIGN_GRAPHICS_HONEST_PROMISED_OUTPUT);
    expect(PROMO_PROOF_CONTRACT.requiredDeliverableFormats).toEqual(["png"]);
    expect(PROMO_PROOF_CONTRACT.exactAssetCount).toBe(2);
    expect(PROMO_PROOF_CONTRACT.wholeSetVersionsTogether).toBe(true);
    expect(PROMO_PROOF_CONTRACT.setIncompleteUnlessBothPass).toBe(true);
    expect(PROMO_PROOF_CONTRACT.captionsAllowed).toBe(false);
    expect(PROMO_PROOF_CONTRACT.landscapeSold).toBe(false);
  });

  it("3 + 9 — exhaust fail-closes; Owner does not produce the set", () => {
    let loop = createGeneralDesignInternalLoop({
      skuId: CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
      campaignId: "harden-promo",
      jobId: "harden-promo::v2-rtu-promotion-graphics",
      dispatchId: "dd:harden-promo::v2-rtu-promotion-graphics",
    });
    for (const n of [1, 2, 3]) {
      loop = appendGeneralDesignAttempt(loop, failAttempt(n));
    }
    expect(loop.status).toBe("fail_closed");
    expect(loop.ownerEscalation).toBeNull();

    const video = createGeneralDesignInternalLoop({
      skuId: "v2-rtu-voice",
      campaignId: "harden-voice",
      jobId: "harden-voice::v2-rtu-voice",
      dispatchId: "dd:harden-voice::v2-rtu-voice",
    });
    const videoExhaust = appendGeneralDesignAttempt(
      appendGeneralDesignAttempt(appendGeneralDesignAttempt(video, failAttempt(1)), failAttempt(2)),
      failAttempt(3),
    );
    expect(videoExhaust.status).toBe("escalated");
    expect(videoExhaust.ownerEscalation?.required).toBe(true);

    const supervision = evaluateWorkSupervision({
      campaignId: "harden-promo",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "harden-promo::v2-rtu-promotion-graphics",
          skuId: CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
          serviceName: "Make My Campaign Graphics",
          productionAttemptsUsed: 3,
          pendingCustomerRevision: false,
          unresolvedQaFail: true,
          customerInformedOfIncident: true,
          waitingOnCustomer: false,
          failedTransport: false,
          missingAuthorizedNotice: false,
        },
      ],
    });
    expect(supervision.incidents[0]?.recovery).toBe("fail_closed_refund");
    expect(supervision.incidents[0]?.ownerRequired).toBe(false);
    expect(supervision.ownerEscalations).toHaveLength(0);
    expect(supervision.customerMessages[0]?.whatStudioIsDoing).toMatch(
      /will not finish the campaign graphics/i,
    );
  });

  it("4 + 5 — customer facts stay accurate; promised assets wait", () => {
    const missing = evaluateMaterialsAndSubstituteAsset({
      customerPromisedMaterials: true,
      customerMaterialsReceived: false,
      rightsPass: false,
      customerAuthorizedStudioCreatedVisuals: false,
      studioCreatedAuthorizationRecorded: false,
      studioCreatedRightsPass: false,
      studioCreatedLabeledAsStudioCreated: false,
      assetKind: "photo",
      treatedAsCustomerSupplied: false,
      testOrControlledScenarioAllowsFixture: false,
      authorizedProductionRuleAllowsFixture: false,
      customerRequestsMaterialsException: false,
      pathConflictsWithExistingRule: false,
      rightsOrSourceAmbiguous: false,
      machineCannotResolveUnderExistingRules: false,
    });
    expect(missing.productionMayProceed).toBe(false);
    expect(missing.path).toBe("WAIT_FOR_CUSTOMER_MATERIALS");
  });

  it("6–8 — production-time, tool-cost, and QA ceilings are defined", () => {
    expect(harden.ceilings.productionTime).toBe("within 3–5 business days");
    expect(harden.ceilings.internalQaAttempts).toBe(3);
    expect(harden.ceilings.includedCustomerRevisions).toBe(1);
    expect(harden.ceilings.toolCostWarningCents).toBe(1185);
    expect(harden.ceilings.toolCostFailCents).toBe(2370);
    const promo = getServiceById(CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU);
    expect(promo?.routeMapTurnaroundLabel?.toLowerCase()).toContain("3–5 business days");
    expect(promo?.includedRevisionRounds).toBe(1);
  });

  it("10 — advertised files match the delivered CERT-plate set", () => {
    const promo = getServiceById(CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU)!;
    expect(promo.priceCents).toBe(7900);
    expect(promo.purpose).toBe(CAMPAIGN_GRAPHICS_HONEST_PROMISED_OUTPUT);
    expect(
      promo.deliverables.some((label) =>
        label.includes("Two digital PNG files you can post or share yourself"),
      ),
    ).toBe(true);
    expect(promo.exclusions).toEqual(
      expect.arrayContaining([
        "Certified 300 DPI or commercial print files",
        "Landscape graphics or extra format sets",
        "Owner or Scout finishing the campaign graphics after QA exhausts",
      ]),
    );
    expect(
      clientDeliveryFileLabelsForSku(CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU, [
        CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL,
        CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL,
      ]),
    ).toEqual([CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL, CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL]);
    expect(skuLaneRow(CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU).overall).toBe("READY_WITH_LIMITS");
  });

  it("assembles both PNG Final Delivery files from the approved set identity", () => {
    const pngA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const pngB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const proof = (id: string, filename: string, hash: string): StudioFileReference => ({
      id,
      clientId: "client",
      campaignId: "promo-harden",
      jobId: "promo-harden::v2-rtu-promotion-graphics",
      category: "review_proof",
      filename,
      fileType: "image/png",
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "studio-files-local",
        objectPath: `clients/x/campaigns/promo-harden/jobs/j/review_proof/v1/${filename}`,
        visibilityState: "review-proof",
        originalFilename: filename,
        contentType: "image/png",
        checksumSha256: hash,
      },
      visibility: "client_visible",
      versionLabel: "Version 1",
      status: "approved_for_review",
      addedBy: { role: "system", displayName: "Studio Machine" },
      addedAt: "2026-09-24T12:00:00.000Z",
    });
    const job: PurchasedJobRecord = {
      jobId: "promo-harden::v2-rtu-promotion-graphics",
      campaignId: "promo-harden",
      skuId: CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
      serviceName: "Make My Campaign Graphics",
      spineStatus: "approved",
      productionLane: "standard",
      intakeComplete: true,
      updatedAt: "2026-09-24T12:00:00.000Z",
      fileRegistry: [
        proof("proof:promo-a.png", "campaign-a.png", pngA),
        proof("proof:promo-b.png", "campaign-b.png", pngB),
      ],
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "caa-promo",
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
        jobId: "promo-harden::v2-rtu-promotion-graphics",
        campaignId: "promo-harden",
        skuId: CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
        workVersionId: "v2-rtu-promotion-graphics-v1",
        artifactIds: ["v2-rtu-promotion-graphics-v1"],
        contentSha256s: [pngA, pngB],
        qaRecordIds: ["qa-1"],
        reviewPackageId: "pkg:promo:approve",
        releaseActivityId: null,
        approvedAt: "2026-09-24T12:00:00.000Z",
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "re-1",
      },
    };
    const assembled = assembleApprovedCampaignGraphicsClientDelivery({
      job,
      events: [],
      actor: { role: "system", displayName: "Studio Machine" },
      requiredDeliverables: [
        CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL,
        CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL,
      ],
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles?.map((file) => file.fileName).sort()).toEqual([
      "campaign-a.png",
      "campaign-b.png",
    ]);
  });
});
