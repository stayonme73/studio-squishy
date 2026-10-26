/**
 * HARDEN #7 — BUSINESS CARD (LIGHT)
 * Proves the locked $69 double-sided digital CERT card. Does not remint Maya.
 * Short Video does not piggyback. The seven earlier SELL NOW services stay frozen.
 */

import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import {
  BUSINESS_CARD_BACK_PNG_LABEL,
  BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
  BUSINESS_CARD_FRONT_PNG_LABEL,
  BUSINESS_CARD_HONEST_PROMISED_OUTPUT,
  BUSINESS_CARD_LIGHT_HARDEN_SKU,
  studioBusinessCardLightHardenV1 as harden,
} from "@/config/studio-business-card-light-harden-v1";
import {
  appendGeneralDesignAttempt,
  createGeneralDesignInternalLoop,
} from "@/lib/studio-general-design-runtime/correction";
import { BUSINESS_CARD_PROOF_CONTRACT } from "@/lib/studio-design-renderer/card-contracts";
import { evaluateBusinessCardExactFacts } from "@/lib/studio-design-renderer/card-exact-facts";
import { buildHarborOakBusinessCardProjectTruth } from "@/lib/studio-design-renderer/card-fixtures";
import { reasonBusinessCardDesignSpecDeterministic } from "@/lib/studio-design-renderer/card-reason";
import { evaluateBusinessCardSetConsistency } from "@/lib/studio-design-renderer/card-set-qa";
import { BUSINESS_CARD_CANVAS } from "@/lib/studio-design-renderer/card-types";
import { assembleApprovedBusinessCardClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { BUSINESS_CARD_EXPORT_PREFIX } from "@/lib/studio-review-revision/business-card-purchase-delivery-truth";
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

function side(input: {
  side: "front" | "back";
  overflowOk?: boolean;
  widthPx?: number;
  heightPx?: number;
  png?: string;
}) {
  return {
    side: input.side,
    widthPx: input.widthPx ?? BUSINESS_CARD_CANVAS.widthPx,
    heightPx: input.heightPx ?? BUSINESS_CARD_CANVAS.heightPx,
    pngContentSha256: input.png ?? `${input.side}-hash`,
    overflowOk: input.overflowOk ?? true,
  };
}

describe("HARDEN #7 — Business Card LIGHT", () => {
  it("locks the smallest honest $69 digital CERT card and drops hitchhikers", () => {
    expect(harden.skuId).toBe(BUSINESS_CARD_LIGHT_HARDEN_SKU);
    expect(harden.hardenClass).toBe("LIGHT");
    expect(harden.offer.priceCents).toBe(6900);
    expect(harden.offer.onePerson).toBe(true);
    expect(harden.offer.sides).toEqual(["front", "back"]);
    expect(harden.offer.plate).toEqual({ widthPx: 1536, heightPx: 1024 });
    expect(harden.offer.files).toEqual(["png", "pdf"]);
    expect(harden.offer.certifiedPhysicalInches).toBe(false);
    expect(harden.offer.certified300DpiPrint).toBe(false);
    expect(harden.offer.logoCreation).toBe(false);
    expect(harden.offer.studioDoesNotPrintOrShip).toBe(true);
    expect(harden.offer.oneCardRevisionNotTwoSideRedesigns).toBe(true);
    expect(harden.offer.wholeCardVersionsTogether).toBe(true);
    expect(harden.offer.setIncompleteUnlessBothPass).toBe(true);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.piggyback.shortVideo).toBe(false);
    expect(harden.doNotRemintMaya).toBe(true);
    expect(harden.classification).toBe("SELL_NOW");
    expect(harden.frozen).toBe(true);
  });

  it("1 + 2 — paid Machine Review bind already proves intake → Design → QA → Review; sides version together", () => {
    expect(BUSINESS_CARD_PROOF_CONTRACT.promisedOutput).toBe(
      BUSINESS_CARD_HONEST_PROMISED_OUTPUT,
    );
    expect(BUSINESS_CARD_PROOF_CONTRACT.requiredDeliverableFormats).toEqual([
      "png",
      "pdf",
    ]);
    expect(BUSINESS_CARD_PROOF_CONTRACT.canvas).toEqual({
      widthPx: 1536,
      heightPx: 1024,
    });
    expect(BUSINESS_CARD_PROOF_CONTRACT.wholeCardVersionsTogether).toBe(true);
    expect(BUSINESS_CARD_PROOF_CONTRACT.setIncompleteUnlessBothPass).toBe(true);
    expect(BUSINESS_CARD_PROOF_CONTRACT.oneCardRevisionNotTwoSideRedesigns).toBe(
      true,
    );
    expect(BUSINESS_CARD_PROOF_CONTRACT.customerPrints).toBe(true);
    expect(BUSINESS_CARD_PROOF_CONTRACT.certifiedPhysicalInches).toBe(false);
    expect(BUSINESS_CARD_PROOF_CONTRACT.certified300DpiPrint).toBe(false);
  });

  it("3 — one weak side fails the whole card", () => {
    const missingBack = evaluateBusinessCardSetConsistency({
      renderVersion: 1,
      widthPx: 1536,
      heightPx: 1024,
      pdfContentSha256: "pdf-hash",
      sides: [side({ side: "front" })],
    });
    expect(missingBack.ok).toBe(false);
    if (!missingBack.ok) expect(missingBack.code).toBe("SET_CONSISTENCY_FAILURE");

    const overflow = evaluateBusinessCardSetConsistency({
      renderVersion: 1,
      widthPx: 1536,
      heightPx: 1024,
      pdfContentSha256: "pdf-hash",
      sides: [side({ side: "front" }), side({ side: "back", overflowOk: false })],
    });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) {
      expect(overflow.code).toBe("SET_CONSISTENCY_FAILURE");
      expect(overflow.message).toMatch(/weak side fails the whole card/i);
    }
  });

  it("4 — contact facts stay exact; physical-inch claims fail closed", () => {
    expect(
      evaluateBusinessCardExactFacts({
        businessName: "Harbor",
        personName: "Jordan Hale",
        phone: "555-0100",
        email: "jordan@harbor.example",
        cardSize: "Digital CERT 1536×1024 — I print it myself",
      }).ok,
    ).toBe(true);

    const missing = evaluateBusinessCardExactFacts({
      businessName: "Harbor",
      personName: "",
      phone: "555-0100",
      email: "jordan@harbor.example",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.path).toBe("WAIT_FOR_CUSTOMER");

    const ambiguous = evaluateBusinessCardExactFacts({
      businessName: "Harbor",
      personName: "TBD",
      phone: "555-0100",
      email: "jordan@harbor.example",
    });
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) expect(ambiguous.code).toBe("AMBIGUOUS_CUSTOMER_FACT");

    const physical = evaluateBusinessCardExactFacts({
      businessName: "Harbor",
      personName: "Jordan Hale",
      phone: "555-0100",
      email: "jordan@harbor.example",
      cardSize: "3.5 × 2 at 300 DPI",
    });
    expect(physical.ok).toBe(false);
    if (!physical.ok) {
      expect(physical.code).toBe("UNSUPPORTED_PLATE_CLAIM");
      expect(physical.path).toBe("FAIL_CLOSED");
    }
  });

  it("type-led cards compose without a logo", () => {
    const withLogo = buildHarborOakBusinessCardProjectTruth({
      repoRoot: process.cwd(),
    });
    const typeLed = reasonBusinessCardDesignSpecDeterministic({
      ...withLogo,
      approvedLogoVariantId: "wordmark-only",
      materials: [],
    });
    expect(typeLed.front.layers.some((layer) => layer.type === "image")).toBe(
      false,
    );
    expect(typeLed.back.layers.some((layer) => layer.type === "image")).toBe(
      false,
    );
    expect(typeLed.front.layers.length).toBeGreaterThanOrEqual(3);
    expect(typeLed.back.layers.length).toBeGreaterThanOrEqual(3);
  });

  it("5 — exhaust fail-closes; Owner does not produce the card; Short Video still escalates", () => {
    let loop = createGeneralDesignInternalLoop({
      skuId: BUSINESS_CARD_LIGHT_HARDEN_SKU,
      campaignId: "harden-card",
      jobId: "harden-card::v2-rtu-business-card",
      dispatchId: "dd:harden-card::v2-rtu-business-card",
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
      appendGeneralDesignAttempt(
        appendGeneralDesignAttempt(video, failAttempt(1)),
        failAttempt(2),
      ),
      failAttempt(3),
    );
    expect(videoExhaust.status).toBe("escalated");
    expect(videoExhaust.ownerEscalation?.required).toBe(true);

    const supervision = evaluateWorkSupervision({
      campaignId: "harden-card",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "harden-card::v2-rtu-business-card",
          skuId: BUSINESS_CARD_LIGHT_HARDEN_SKU,
          serviceName: "Make Me a Business Card",
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
      /will not finish the business card/i,
    );
  });

  it("6–9 — ceilings and one card revision, not two side redesigns", () => {
    expect(harden.ceilings.productionTime).toBe("within 2–3 business days");
    expect(harden.ceilings.internalQaAttempts).toBe(3);
    expect(harden.ceilings.includedCustomerRevisions).toBe(1);
    expect(harden.ceilings.toolCostWarningCents).toBe(1035);
    expect(harden.ceilings.toolCostFailCents).toBe(2070);
    const card = getServiceById(BUSINESS_CARD_LIGHT_HARDEN_SKU);
    expect(card?.routeMapTurnaroundLabel?.toLowerCase()).toContain(
      "2–3 business days",
    );
    expect(card?.includedRevisionRounds).toBe(1);
    expect(harden.offer.includedRevisions).toBe(1);
    expect(harden.offer.wholeCardVersionsTogether).toBe(true);
  });

  it("10 + 11 — advertised files match the delivered $69 digital CERT card", () => {
    const card = getServiceById(BUSINESS_CARD_LIGHT_HARDEN_SKU)!;
    expect(card.priceCents).toBe(6900);
    expect(card.purpose).toBe(BUSINESS_CARD_HONEST_PROMISED_OUTPUT);
    expect(card.deliverables.some((label) => label.includes("1536×1024"))).toBe(
      true,
    );
    expect(card.exclusions).toEqual(
      expect.arrayContaining([
        "Certified 3.5×2, 300 DPI, bleed, or CMYK print files",
        "Logo creation",
        "Separate revisions per side — one revision is for the whole card",
        "Owner or Scout finishing the card after QA exhausts",
      ]),
    );
    const schema = getRouteMapIntakeSchema("rtu-business-card");
    const size = schema.fields.find((field) => field.id === "cardSize");
    expect(size && "options" in size ? size.options : []).toEqual([
      "Digital CERT 1536×1024 — I print it myself",
    ]);
    expect(
      clientDeliveryFileLabelsForSku(BUSINESS_CARD_LIGHT_HARDEN_SKU, []),
    ).toEqual([
      BUSINESS_CARD_FRONT_PNG_LABEL,
      BUSINESS_CARD_BACK_PNG_LABEL,
      BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
    ]);
    const row = skuLaneRow(BUSINESS_CARD_LIGHT_HARDEN_SKU);
    expect(row.capabilities.find((entry) => entry.capabilityId === "delivery_readiness")?.grade).toBe("READY");
    expect(row.capabilities.find((entry) => entry.capabilityId === "revision_neutrality")?.grade).toBe("READY");
    expect(row.overall).toBe("NOT_CERTIFIED");
  });

  it("assembles front PNG + back PNG + customer-print PDF", () => {
    const frontHash =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const backHash =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const pdfHash =
      "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const png = (id: "front" | "back", hash: string): StudioFileReference => ({
      id: `proof:${id}.png`,
      clientId: "client",
      campaignId: "card-harden",
      jobId: "card-harden::v2-rtu-business-card",
      category: "review_proof",
      filename: `${id}.png`,
      fileType: "image/png",
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "studio-files-local",
        objectPath: `clients/x/campaigns/card-harden/jobs/j/review_proof/v1/${id}.png`,
        visibilityState: "review-proof",
        originalFilename: `${id}.png`,
        contentType: "image/png",
        checksumSha256: hash,
      },
      visibility: "client_visible",
      versionLabel: "Version 1",
      status: "approved_for_review",
      deliverableKey: `gd-proof:${id}`,
      addedBy: { role: "system", displayName: "Studio Machine" },
      addedAt: "2026-09-24T13:00:00.000Z",
    });
    const pdf: StudioFileReference = {
      ...png("front", pdfHash),
      id: "export:card.pdf",
      category: "internal_draft",
      filename: "card.pdf",
      fileType: "application/pdf",
      storageRef: {
        ...png("front", pdfHash).storageRef,
        objectPath:
          "clients/x/campaigns/card-harden/jobs/j/internal_draft/v1/card.pdf",
        visibilityState: "internal-only",
        originalFilename: "card.pdf",
        contentType: "application/pdf",
        checksumSha256: pdfHash,
      },
      visibility: "internal_only",
      status: "draft",
      deliverableKey: `${BUSINESS_CARD_EXPORT_PREFIX}:pdf`,
      deliverableLabel: BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
    };
    const job: PurchasedJobRecord = {
      jobId: "card-harden::v2-rtu-business-card",
      campaignId: "card-harden",
      skuId: BUSINESS_CARD_LIGHT_HARDEN_SKU,
      serviceName: "Make Me a Business Card",
      spineStatus: "approved",
      productionLane: "quick_turn",
      intakeComplete: true,
      updatedAt: "2026-09-24T13:00:00.000Z",
      fileRegistry: [png("front", frontHash), png("back", backHash), pdf],
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "caa-card",
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
        jobId: "card-harden::v2-rtu-business-card",
        campaignId: "card-harden",
        skuId: BUSINESS_CARD_LIGHT_HARDEN_SKU,
        workVersionId: "v2-rtu-business-card-v1",
        artifactIds: ["v2-rtu-business-card-v1"],
        contentSha256s: [frontHash, backHash],
        qaRecordIds: ["qa-1"],
        reviewPackageId: "pkg:card:approve",
        releaseActivityId: null,
        approvedAt: "2026-09-24T13:00:00.000Z",
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "re-1",
      },
    };
    const assembled = assembleApprovedBusinessCardClientDelivery({
      job,
      events: [],
      actor: { role: "system", displayName: "Studio Machine" },
    });
    expect(assembled.assembled).toBe(true);
    expect(
      assembled.job.clientDeliveryFiles?.map((file) => file.fileName).sort(),
    ).toEqual(["back.png", "card.pdf", "front.png"]);
  });
});
