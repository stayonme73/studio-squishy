/**
 * HARDEN #5 — MENU (LIGHT)
 * Proves the narrowed $89 digital CERT-plate menu. Does not remint Maya.
 * Social Posts, Business Card, and Short Video do not piggyback.
 */

import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import {
  MENU_CUSTOMER_PRINT_PDF_LABEL,
  MENU_DIGITAL_PNG_LABEL,
  MENU_HONEST_PROMISED_OUTPUT,
  MENU_LIGHT_HARDEN_SKU,
  studioMenuLightHardenV1 as harden,
} from "@/config/studio-menu-light-harden-v1";
import {
  appendGeneralDesignAttempt,
  createGeneralDesignInternalLoop,
} from "@/lib/studio-general-design-runtime/correction";
import { MENU_PROOF_CONTRACT } from "@/lib/studio-design-renderer/menu-contracts";
import { evaluateMenuExactFacts } from "@/lib/studio-design-renderer/menu-exact-facts";
import { reasonMenuDesignSpecDeterministic } from "@/lib/studio-design-renderer/menu-reason";
import { buildSaltCedarMenuProjectTruthMax } from "@/lib/studio-design-renderer/menu-fixtures";
import { evaluateMaterialsAndSubstituteAsset } from "@/lib/studio-materials-and-substitute-asset/evaluate";
import { assembleApprovedMenuClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
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

describe("HARDEN #5 — Menu LIGHT", () => {
  it("locks the smallest honest $89 digital CERT-plate menu and drops hitchhikers", () => {
    expect(harden.skuId).toBe(MENU_LIGHT_HARDEN_SKU);
    expect(harden.offer.priceCents).toBe(8900);
    expect(harden.offer.maxSections).toBe(5);
    expect(harden.offer.maxItems).toBe(30);
    expect(harden.offer.plate).toEqual({ widthPx: 1024, heightPx: 1536 });
    expect(harden.offer.files).toEqual(["png", "pdf"]);
    expect(harden.offer.certified300DpiPrint).toBe(false);
    expect(harden.offer.bifold).toBe(false);
    expect(harden.offer.booklet).toBe(false);
    expect(harden.offer.studioDoesNotPrintOrShip).toBe(true);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.studioIsDesignerNotFoodLawOracle).toBe(true);
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.qualityLock.doNotForceFitWithTinyType).toBe(true);
    expect(harden.piggyback.socialPosts).toBe(false);
    expect(harden.piggyback.businessCard).toBe(false);
    expect(harden.piggyback.shortVideo).toBe(false);
    expect(harden.doNotRemintMaya).toBe(true);
    expect(harden.classification).toBe("SELL_NOW");
    expect(harden.frozen).toBe(true);
  });

  it("1 — paid Machine Review bind already proves intake → Design → QA → Review", () => {
    expect(MENU_PROOF_CONTRACT.promisedOutput).toBe(MENU_HONEST_PROMISED_OUTPUT);
    expect(MENU_PROOF_CONTRACT.requiredDeliverableFormats).toEqual(["png", "pdf"]);
    expect(MENU_PROOF_CONTRACT.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });
    expect(MENU_PROOF_CONTRACT.maxSections).toBe(5);
    expect(MENU_PROOF_CONTRACT.maxItemsTotal).toBe(30);
    expect(MENU_PROOF_CONTRACT.allergenVerificationExcluded).toBe(true);
  });

  it("2 + 3 — one page stays inside the system; overflow throws instead of shrinking type", () => {
    const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot: process.cwd() });
    const spec = reasonMenuDesignSpecDeterministic(truth);
    expect(spec.layers.some((layer) => layer.type === "text" && layer.role === "dietary_disclaimer")).toBe(
      true,
    );
    const long = "A very long customer-supplied description that repeats. ".repeat(8);
    const huge = {
      ...truth,
      sections: truth.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, description: long })),
      })),
    };
    expect(() => reasonMenuDesignSpecDeterministic(huge)).toThrow(/DENSITY_OVERFLOW/);
  });

  it("4 + 5 — customer facts stay exact; ambiguous allergen wording waits", () => {
    const exact = evaluateMenuExactFacts({
      dietaryLabels:
        "Contains wheat, dairy, eggs, tree nuts, and soy. Ask staff about allergens.",
      legalDisclaimer: "Prices subject to change. Customer-verified wording.",
      items: [{ name: "House Salad", priceDisplay: "$12", description: "Seasonal greens" }],
    });
    expect(exact).toEqual({ ok: true, path: "PROCEED" });

    const none = evaluateMenuExactFacts({
      dietaryLabels: "None",
      items: [{ name: "Black Coffee", priceDisplay: "$3" }],
    });
    expect(none.ok).toBe(true);

    const missing = evaluateMenuExactFacts({
      dietaryLabels: "",
      items: [{ name: "Soup", priceDisplay: "$8" }],
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.path).toBe("WAIT_FOR_CUSTOMER");
      expect(missing.code).toBe("MISSING_REQUIRED_TRUTH");
    }

    const ambiguous = evaluateMenuExactFacts({
      dietaryLabels: "Probably contains nuts",
      items: [{ name: "Cookie", priceDisplay: "$4" }],
    });
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) {
      expect(ambiguous.path).toBe("WAIT_FOR_CUSTOMER");
      expect(ambiguous.code).toBe("AMBIGUOUS_CUSTOMER_FACT");
    }

    const promised = evaluateMaterialsAndSubstituteAsset({
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
    expect(promised.productionMayProceed).toBe(false);
    expect(promised.path).toBe("WAIT_FOR_CUSTOMER_MATERIALS");
  });

  it("6 — exhaust fail-closes; Owner does not produce the menu; business card still escalates", () => {
    let loop = createGeneralDesignInternalLoop({
      skuId: MENU_LIGHT_HARDEN_SKU,
      campaignId: "harden-menu",
      jobId: "harden-menu::v2-rtu-menu",
      dispatchId: "dd:harden-menu::v2-rtu-menu",
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
      campaignId: "harden-menu",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "harden-menu::v2-rtu-menu",
          skuId: MENU_LIGHT_HARDEN_SKU,
          serviceName: "Make Me a Menu",
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
      /will not finish the menu/i,
    );
  });

  it("7–9 — production-time, tool-cost, and QA ceilings are defined", () => {
    expect(harden.ceilings.productionTime).toBe("within 3–5 business days");
    expect(harden.ceilings.internalQaAttempts).toBe(3);
    expect(harden.ceilings.includedCustomerRevisions).toBe(1);
    expect(harden.ceilings.toolCostWarningCents).toBe(1335);
    expect(harden.ceilings.toolCostFailCents).toBe(2670);
    const menu = getServiceById(MENU_LIGHT_HARDEN_SKU);
    expect(menu?.routeMapTurnaroundLabel?.toLowerCase()).toContain("3–5 business days");
    expect(menu?.includedRevisionRounds).toBe(1);
  });

  it("10 + 11 — advertised files match the delivered CERT-plate scope", () => {
    const menu = getServiceById(MENU_LIGHT_HARDEN_SKU)!;
    expect(menu.priceCents).toBe(8900);
    expect(menu.purpose).toBe(MENU_HONEST_PROMISED_OUTPUT);
    expect(menu.deliverables.some((label) => label.includes(MENU_CUSTOMER_PRINT_PDF_LABEL))).toBe(
      true,
    );
    expect(menu.exclusions).toEqual(
      expect.arrayContaining([
        "Certified 300 DPI or commercial print files",
        "Owner or Scout finishing the menu after QA exhausts",
        "Price-list cleanup, rewriting, proofreading for business accuracy, or allergen verification",
      ]),
    );
    expect(
      clientDeliveryFileLabelsForSku(MENU_LIGHT_HARDEN_SKU, [
        MENU_DIGITAL_PNG_LABEL,
        MENU_CUSTOMER_PRINT_PDF_LABEL,
      ]),
    ).toEqual([MENU_DIGITAL_PNG_LABEL, MENU_CUSTOMER_PRINT_PDF_LABEL]);
    expect(skuLaneRow(MENU_LIGHT_HARDEN_SKU).overall).toBe("READY_WITH_LIMITS");
  });

  it("assembles PNG + PDF Final Delivery from the approved menu identity", () => {
    const pngHash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const pdfHash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const png: StudioFileReference = {
      id: "proof:menu.png",
      clientId: "client",
      campaignId: "menu-harden",
      jobId: "menu-harden::v2-rtu-menu",
      category: "review_proof",
      filename: "menu.png",
      fileType: "image/png",
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "studio-files-local",
        objectPath: "clients/x/campaigns/menu-harden/jobs/j/review_proof/v1/menu.png",
        visibilityState: "review-proof",
        originalFilename: "menu.png",
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
      id: "export:menu.pdf",
      category: "internal_draft",
      filename: "menu.pdf",
      fileType: "application/pdf",
      storageRef: {
        ...png.storageRef,
        objectPath: "clients/x/campaigns/menu-harden/jobs/j/internal_draft/v1/menu.pdf",
        visibilityState: "internal-only",
        originalFilename: "menu.pdf",
        contentType: "application/pdf",
        checksumSha256: pdfHash,
      },
      visibility: "internal_only",
      status: "draft",
      deliverableKey: "menu-export:pdf",
      deliverableLabel: MENU_CUSTOMER_PRINT_PDF_LABEL,
    };
    const job: PurchasedJobRecord = {
      jobId: "menu-harden::v2-rtu-menu",
      campaignId: "menu-harden",
      skuId: MENU_LIGHT_HARDEN_SKU,
      serviceName: "Make Me a Menu",
      spineStatus: "approved",
      productionLane: "standard",
      intakeComplete: true,
      updatedAt: "2026-09-24T12:00:00.000Z",
      fileRegistry: [png, pdf],
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "caa-menu",
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
        jobId: "menu-harden::v2-rtu-menu",
        campaignId: "menu-harden",
        skuId: MENU_LIGHT_HARDEN_SKU,
        workVersionId: "v2-rtu-menu-v1",
        artifactIds: ["v2-rtu-menu-v1"],
        contentSha256s: [pngHash],
        qaRecordIds: ["qa-1"],
        reviewPackageId: "pkg:menu:approve",
        releaseActivityId: null,
        approvedAt: "2026-09-24T12:00:00.000Z",
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "re-1",
      },
    };
    const assembled = assembleApprovedMenuClientDelivery({
      job,
      events: [],
      actor: { role: "system", displayName: "Studio Machine" },
      requiredDeliverables: [MENU_DIGITAL_PNG_LABEL, MENU_CUSTOMER_PRINT_PDF_LABEL],
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles?.map((file) => file.fileName).sort()).toEqual([
      "menu.pdf",
      "menu.png",
    ]);
  });
});
