/**
 * HARDEN #1 — FLYER (LIGHT)
 * Proves the narrowed $69 digital CERT-plate offer. Does not remint Maya.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { studioAutonomousProductionLoopV1 } from "@/config/studio-autonomous-production-loop-v1";
import {
  FLYER_CUSTOMER_PRINT_PDF_LABEL,
  FLYER_HONEST_PROMISED_OUTPUT,
  FLYER_LIGHT_HARDEN_SKU,
  studioFlyerLightHardenV1 as harden,
} from "@/config/studio-flyer-light-harden-v1";
import { FLYER_SKU_ECONOMICS_V1 } from "@/config/studio-production-cost-telemetry-v1";
import { FLYER_PROOF_CONTRACT } from "@/lib/studio-design-renderer/contracts";
import { evaluateMaterialsAndSubstituteAsset } from "@/lib/studio-materials-and-substitute-asset/evaluate";
import {
  appendInternalAttempt,
  createInternalProductionLoop,
} from "@/lib/studio-production-correction/ledger";
import { classifyFlyerIncludedSlot } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";
import { skuLaneRow } from "@/lib/studio-static-creative-lane/sku-lane-matrix";
import { evaluateWorkSupervision } from "@/lib/studio-work-supervision/evaluate";

const REPO = path.resolve(__dirname, "../../..");
const AREA_22A =
  "docs/launch/studio-operating-area-22a-live-revision-production-gate-1/STUDIO-OPERATING-AREA-22A-LIVE-REVISION-PRODUCTION-GATE-EVIDENCE.md";

function failAttempt(n: number) {
  return {
    attemptNumber: n,
    triggeredBy: n === 1 ? ("initial_dispatch" as const) : ("qa_correction" as const),
    productionCapabilityId: "studio_design_renderer" as const,
    correctionBriefId: null,
    correctionBriefFingerprint: "none",
    renderVersion: n,
    pngContentSha256: null,
    qaResult: "fail" as const,
    failureClasses: ["hierarchy_failure" as const],
    failureCode: "QA_FAILURE",
    message: "fail",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

describe("HARDEN #1 — Flyer LIGHT", () => {
  it("locks the smallest honest $69 digital CERT-plate offer", () => {
    expect(harden.skuId).toBe(FLYER_LIGHT_HARDEN_SKU);
    expect(harden.offer.priceCents).toBe(6900);
    expect(harden.offer.priceCents).toBe(FLYER_SKU_ECONOMICS_V1.priceCents);
    expect(harden.offer.plate).toEqual({ widthPx: 1024, heightPx: 1536 });
    expect(harden.offer.files).toEqual(["png", "pdf"]);
    expect(harden.offer.certified300DpiPrint).toBe(false);
    expect(harden.offer.generatedFullBleedHeroSold).toBe(false);
    expect(harden.offer.studioPhotographySold).toBe(false);
    expect(harden.offer.studioDoesNotPrintOrShip).toBe(true);
    expect(harden.offer.includedRevisions).toBe(1);
    expect(harden.offer.failClosedDisposition).toBe("refund_or_cannot_deliver");
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.qualityLock.lightMeansEngineeringEffortNotLowerQuality).toBe(true);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.doNotStartEmailKit).toBe(true);
    expect(harden.doNotStartTextKit).toBe(true);
    expect(harden.doNotRemintMaya).toBe(true);
    expect(harden.classification).toBe("SELL_NOW");
    expect(harden.frozen).toBe(true);
    expect(harden.doNotReopenFlyerUnlessRegression).toBe(true);
    expect(harden.nextBrickWhenAuthorized).toBe("email_kit_and_text_kit_together");
  });

  it("1 — intake → Machine → Design → QA → Review → revision → final delivery already proved on the live flyer path", () => {
    expect(existsSync(path.join(REPO, AREA_22A))).toBe(true);
    const evidence = readFileSync(path.join(REPO, AREA_22A), "utf8");
    expect(evidence).toMatch(/PASS WITH EXPLICIT LIMITS/);
    expect(evidence).toMatch(/Owner rescue used:\*\* no/);
    expect(evidence).toMatch(/QA \| Pass before Review/);
    expect(evidence).toMatch(/PNG and PDF exist/);
    expect(evidence).toMatch(/1024 × 1536/);
    expect(evidence).toMatch(/Northshore Portrait Studio/);
    expect(harden.doNotRemintMaya).toBe(true);
  });

  it("2 — exhaust fail-closes; Owner does not produce the flyer", () => {
    expect(studioAutonomousProductionLoopV1.ownerEscalation.afterInternalBudgetExhausted).toBe(
      false,
    );
    expect(studioAutonomousProductionLoopV1.failClosed.afterInternalBudgetExhausted).toBe(true);
    expect(studioAutonomousProductionLoopV1.failClosed.ownerDoesNotProduceTheFlyer).toBe(true);

    let loop = createInternalProductionLoop({
      campaignId: "harden-flyer",
      jobId: "harden-flyer::v2-rtu-flyer",
      dispatchId: "dd:harden-flyer::v2-rtu-flyer",
    });
    for (const n of [1, 2, 3]) {
      loop = appendInternalAttempt(loop, failAttempt(n), null);
    }
    expect(loop.status).toBe("fail_closed");
    expect(loop.ownerEscalation).toBeNull();
    expect(loop.failClosed?.customerDisposition).toBe("refund_or_cannot_deliver");

    const supervision = evaluateWorkSupervision({
      campaignId: "harden-flyer",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "harden-flyer::v2-rtu-flyer",
          skuId: FLYER_LIGHT_HARDEN_SKU,
          serviceName: "Make Me a Flyer",
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
      /will not finish the flyer/i,
    );
  });

  it("3 — promised photos are not silently substituted; cleared customer photos may proceed", () => {
    const missingPromisedPhotos = evaluateMaterialsAndSubstituteAsset({
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
    expect(missingPromisedPhotos.productionMayProceed).toBe(false);
    expect(missingPromisedPhotos.ownerEscalation).toBe(false);
    expect(missingPromisedPhotos.path).toBe("WAIT_FOR_CUSTOMER_MATERIALS");

    const clearedPhotos = evaluateMaterialsAndSubstituteAsset({
      customerPromisedMaterials: true,
      customerMaterialsReceived: true,
      rightsPass: true,
      customerAuthorizedStudioCreatedVisuals: false,
      studioCreatedAuthorizationRecorded: false,
      studioCreatedRightsPass: false,
      studioCreatedLabeledAsStudioCreated: false,
      assetKind: "customer_supplied",
      treatedAsCustomerSupplied: false,
      testOrControlledScenarioAllowsFixture: false,
      authorizedProductionRuleAllowsFixture: false,
      customerRequestsMaterialsException: false,
      pathConflictsWithExistingRule: false,
      rightsOrSourceAmbiguous: false,
      machineCannotResolveUnderExistingRules: false,
    });
    expect(clearedPhotos.productionMayProceed).toBe(true);
    expect(clearedPhotos.ownerEscalation).toBe(false);
  });

  it("4–6 — production-time, tool-cost, and QA ceilings are defined", () => {
    expect(harden.ceilings.productionTime).toBe("within 2–3 business days");
    expect(harden.ceilings.internalQaAttempts).toBe(3);
    expect(harden.ceilings.includedCustomerRevisions).toBe(1);
    expect(harden.ceilings.toolCostWarningCents).toBe(1035);
    expect(harden.ceilings.toolCostFailCents).toBe(2070);
    const flyer = getServiceById(FLYER_LIGHT_HARDEN_SKU);
    expect(flyer?.routeMapTurnaroundLabel?.toLowerCase()).toContain("2–3 business days");
    expect(flyer?.includedRevisionRounds).toBe(1);
  });

  it("7–8 — advertised files match the delivered CERT-plate scope", () => {
    const flyer = getServiceById(FLYER_LIGHT_HARDEN_SKU)!;
    expect(flyer.priceCents).toBe(6900);
    expect(flyer.purpose).toBe(FLYER_HONEST_PROMISED_OUTPUT);
    expect(FLYER_PROOF_CONTRACT.promisedOutput).toBe(FLYER_HONEST_PROMISED_OUTPUT);
    expect(FLYER_PROOF_CONTRACT.requiredDeliverableFormats).toEqual(["png", "pdf"]);
    expect(flyer.deliverables.some((label) => label.includes(FLYER_CUSTOMER_PRINT_PDF_LABEL))).toBe(
      true,
    );
    expect(flyer.exclusions).toEqual(
      expect.arrayContaining([
        "Certified 300 DPI or commercial print files",
        "Studio-generated full-bleed photography as the sold default",
        "Owner or Scout finishing the flyer after QA exhausts",
        "Printing, shipping, or printer coordination",
      ]),
    );
    expect(classifyFlyerIncludedSlot("Print-ready PDF")?.format).toBe("pdf");
    expect(classifyFlyerIncludedSlot(FLYER_CUSTOMER_PRINT_PDF_LABEL)?.format).toBe("pdf");
    expect(classifyFlyerIncludedSlot("Print-ready PDF")?.class).toBe("customer_promised_file");

    const row = skuLaneRow(FLYER_LIGHT_HARDEN_SKU);
    expect(row.capabilities.find((cap) => cap.capabilityId === "delivery_readiness")?.grade).toBe(
      "READY",
    );
    expect(row.overall).not.toBe("HOLD");
    expect(row.overall).not.toBe("NOT_CERTIFIED");
  });
});
