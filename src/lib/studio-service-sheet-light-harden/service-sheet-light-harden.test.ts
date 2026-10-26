/**
 * HARDEN #3 — SERVICE SHEET (LIGHT)
 * Proves the narrowed $79 digital CERT-plate list. Does not remint Maya.
 * Business Card does not piggyback — own composition system.
 */

import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import {
  SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL,
  SERVICE_SHEET_DIGITAL_PNG_LABEL,
  SERVICE_SHEET_HONEST_PROMISED_OUTPUT,
  SERVICE_SHEET_LIGHT_HARDEN_SKU,
  studioServiceSheetLightHardenV1 as harden,
} from "@/config/studio-service-sheet-light-harden-v1";
import {
  appendGeneralDesignAttempt,
  createGeneralDesignInternalLoop,
} from "@/lib/studio-general-design-runtime/correction";
import { SERVICE_SHEET_PROOF_CONTRACT } from "@/lib/studio-design-renderer/service-sheet-contracts";
import { evaluateMaterialsAndSubstituteAsset } from "@/lib/studio-materials-and-substitute-asset/evaluate";
import { assembleApprovedServiceSheetClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
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

describe("HARDEN #3 — Service Sheet LIGHT", () => {
  it("locks the smallest honest $79 digital CERT-plate list and drops the card", () => {
    expect(harden.skuId).toBe(SERVICE_SHEET_LIGHT_HARDEN_SKU);
    expect(harden.offer.priceCents).toBe(7900);
    expect(harden.offer.maxServices).toBe(10);
    expect(harden.offer.plate).toEqual({ widthPx: 1024, heightPx: 1536 });
    expect(harden.offer.files).toEqual(["png", "pdf"]);
    expect(harden.offer.certified300DpiPrint).toBe(false);
    expect(harden.offer.studioDoesNotPrintOrShip).toBe(true);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.businessCardPiggyback.included).toBe(false);
    expect(harden.doNotTouchCampaignGraphics).toBe(true);
    expect(harden.doNotRemintMaya).toBe(true);
    expect(harden.classification).toBe("SELL_NOW");
    expect(harden.frozen).toBe(true);
  });

  it("1 — paid Machine Review bind already proves intake → Design → QA → Review", () => {
    expect(SERVICE_SHEET_PROOF_CONTRACT.promisedOutput).toBe(SERVICE_SHEET_HONEST_PROMISED_OUTPUT);
    expect(SERVICE_SHEET_PROOF_CONTRACT.requiredDeliverableFormats).toEqual(["png", "pdf"]);
    expect(SERVICE_SHEET_PROOF_CONTRACT.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });
  });

  it("2 + 8 — exhaust fail-closes; Owner does not produce the service sheet", () => {
    let loop = createGeneralDesignInternalLoop({
      skuId: SERVICE_SHEET_LIGHT_HARDEN_SKU,
      campaignId: "harden-sheet",
      jobId: "harden-sheet::v2-rtu-service-sheet",
      dispatchId: "dd:harden-sheet::v2-rtu-service-sheet",
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
      campaignId: "harden-sheet",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "harden-sheet::v2-rtu-service-sheet",
          skuId: SERVICE_SHEET_LIGHT_HARDEN_SKU,
          serviceName: "Make Me a Service Sheet",
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
      /will not finish the service sheet/i,
    );
  });

  it("customer facts stay accurate — promised assets wait; prices are not invented", () => {
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

  it("4–6 — production-time, tool-cost, and QA ceilings are defined", () => {
    expect(harden.ceilings.productionTime).toBe("within 2–3 business days");
    expect(harden.ceilings.internalQaAttempts).toBe(3);
    expect(harden.ceilings.includedCustomerRevisions).toBe(1);
    expect(harden.ceilings.toolCostWarningCents).toBe(1185);
    expect(harden.ceilings.toolCostFailCents).toBe(2370);
    const sheet = getServiceById(SERVICE_SHEET_LIGHT_HARDEN_SKU);
    expect(sheet?.routeMapTurnaroundLabel?.toLowerCase()).toContain("2–3 business days");
    expect(sheet?.includedRevisionRounds).toBe(1);
  });

  it("7 + 9 — advertised files match the delivered CERT-plate scope", () => {
    const sheet = getServiceById(SERVICE_SHEET_LIGHT_HARDEN_SKU)!;
    expect(sheet.priceCents).toBe(7900);
    expect(sheet.purpose).toBe(SERVICE_SHEET_HONEST_PROMISED_OUTPUT);
    expect(sheet.deliverables.some((label) => label.includes(SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL))).toBe(
      true,
    );
    expect(sheet.exclusions).toEqual(
      expect.arrayContaining([
        "Certified 300 DPI or commercial print files",
        "Owner or Scout finishing the service sheet after QA exhausts",
      ]),
    );
    expect(
      clientDeliveryFileLabelsForSku(SERVICE_SHEET_LIGHT_HARDEN_SKU, [
        SERVICE_SHEET_DIGITAL_PNG_LABEL,
        SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL,
      ]),
    ).toEqual([SERVICE_SHEET_DIGITAL_PNG_LABEL, SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL]);
    expect(skuLaneRow(SERVICE_SHEET_LIGHT_HARDEN_SKU).overall).toBe("READY_WITH_LIMITS");
  });

  it("assembles PNG + PDF Final Delivery from the approved sheet identity", () => {
    const pngHash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const pdfHash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const png: StudioFileReference = {
      id: "proof:sheet.png",
      clientId: "client",
      campaignId: "sheet-harden",
      jobId: "sheet-harden::v2-rtu-service-sheet",
      category: "review_proof",
      filename: "service-sheet.png",
      fileType: "image/png",
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "studio-files-local",
        objectPath: "clients/x/campaigns/sheet-harden/jobs/j/review_proof/v1/sheet.png",
        visibilityState: "review-proof",
        originalFilename: "service-sheet.png",
        contentType: "image/png",
        checksumSha256: pngHash,
      },
      visibility: "client_visible",
      versionLabel: "Version 1",
      status: "approved_for_review",
      addedBy: { role: "system", displayName: "Studio Machine" },
      addedAt: "2026-09-24T12:00:00.000Z",
    };
    const pdf: StudioFileReference = {
      ...png,
      id: "export:sheet.pdf",
      category: "internal_draft",
      filename: "service-sheet.pdf",
      fileType: "application/pdf",
      storageRef: {
        ...png.storageRef,
        objectPath: "clients/x/campaigns/sheet-harden/jobs/j/internal_draft/v1/sheet.pdf",
        visibilityState: "internal-only",
        originalFilename: "service-sheet.pdf",
        contentType: "application/pdf",
        checksumSha256: pdfHash,
      },
      visibility: "internal_only",
      status: "draft",
      deliverableKey: "sheet-export:pdf",
      deliverableLabel: SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL,
    };
    const job: PurchasedJobRecord = {
      jobId: "sheet-harden::v2-rtu-service-sheet",
      campaignId: "sheet-harden",
      skuId: SERVICE_SHEET_LIGHT_HARDEN_SKU,
      serviceName: "Make Me a Service Sheet",
      spineStatus: "approved",
      productionLane: "standard",
      intakeComplete: true,
      updatedAt: "2026-09-24T12:00:00.000Z",
      fileRegistry: [png, pdf],
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "caa-sheet",
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
        jobId: "sheet-harden::v2-rtu-service-sheet",
        campaignId: "sheet-harden",
        skuId: SERVICE_SHEET_LIGHT_HARDEN_SKU,
        workVersionId: "v2-rtu-service-sheet-v1",
        artifactIds: ["v2-rtu-service-sheet-v1"],
        contentSha256s: [pngHash],
        qaRecordIds: ["qa-1"],
        reviewPackageId: "pkg:sheet:approve",
        releaseActivityId: null,
        approvedAt: "2026-09-24T12:00:00.000Z",
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "re-1",
      },
    };
    const assembled = assembleApprovedServiceSheetClientDelivery({
      job,
      events: [],
      actor: { role: "system", displayName: "Studio Machine" },
      requiredDeliverables: [SERVICE_SHEET_DIGITAL_PNG_LABEL, SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL],
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles?.map((file) => file.fileName).sort()).toEqual([
      "service-sheet.pdf",
      "service-sheet.png",
    ]);
  });
});
