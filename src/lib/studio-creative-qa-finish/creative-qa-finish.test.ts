import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";

import { getServiceById } from "@/catalog/accessors";
import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { createReferenceOnlyStorageRef } from "@/lib/file-registry/job-files";
import { addJobFileReference } from "@/lib/file-registry/job-files";
import type { StudioFileStorageReference } from "@/lib/file-registry/types";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { buildJobId } from "@/lib/job-control/lane-map";
import { applySystemFinalDeliveryAuthorization } from "@/lib/job-control/final-delivery-actions";
import { materialContextFromLedger } from "@/lib/job-control/final-delivery-gates";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import { clientRevisionRoundWouldExceed } from "@/lib/job-control/review-room-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import { resolveCondensedCheckoutOffer } from "@/lib/studio-payment/condensed-offer";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { readCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import type { CheckoutSessionCreateRequest } from "@/lib/studio-payment/types";
import type { CustomerContentCertification } from "@/lib/studio-customer-content-intake/types";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { runCreativeQaFinishObserver } from "@/lib/studio-dispatch/creative-qa-finish-observer";
import type { DispatchExecutionRecord } from "@/lib/studio-dispatch/types";
import { evaluateJobRoutingDecision } from "@/lib/studio-routing-handoff/evaluate";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import {
  CREATIVE_QA_DELIVERABLE_LABEL,
  CREATIVE_QA_FINISH_SKU,
  CREATIVE_QA_MAX_ROUNDS,
} from "./contract";
import {
  coverCroppedSquare,
  creativeQaAssetBlock,
  finishCreativeQaAsset,
  inspectCreativeQaOutput,
  sha256,
} from "./finish";

const ORIGINAL_SECRET = process.env.STRIPE_SECRET_KEY;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PROOF_DIR = path.join(REPO_ROOT, "docs/launch/creative-qa-finish-pass-4a");
const FACTS = "Harbor Oak. Sunday market. $18.";
const CORRECTION =
  "The artwork is cut off at the edges. Keep every word and the price, and give it a clean margin.";
const REVISION =
  "Give the artwork more breathing room. Do not change the words or the price.";
const NOW = "2026-10-17T16:00:00.000Z";

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ORIGINAL_SECRET;
});

function stripeDouble(amounts: number[]) {
  return {
    checkout: {
      sessions: {
        create: async (params: {
          line_items?: Array<{ price_data?: { unit_amount?: number } }>;
        }) => {
          const amount = params.line_items?.[0]?.price_data?.unit_amount;
          if (typeof amount === "number") amounts.push(amount);
          return {
            id: `cs_test_creative_qa_${amounts.length}_${Date.now()}`,
            url: "https://checkout.stripe.com/c/pay/cs_test_creative_qa",
          };
        },
      },
    },
  };
}

function checkoutRequest(campaignId: string): CheckoutSessionCreateRequest {
  return {
    campaignId,
    returnOrigin: "http://localhost:3475",
    customerEmail: "ada@harbor-oak.example",
    purchaseKind: "condensed_offer",
    facts: {
      draftRevision: 1,
      routeId: null,
      selectedServiceIds: ["creative_qa_finish"],
      projectNeed: CORRECTION,
      businessName: "Harbor Oak",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "One existing Sunday market graphic.",
    },
    condensedOffer: {
      packageId: "creative_qa_finish",
      customerName: "Ada Stone",
      company: "Harbor Oak",
      projectNeed: CORRECTION,
      materialsNote: "One existing Sunday market graphic.",
    },
  };
}

function certification(input: {
  fileName: string;
  bytes: number;
  hash: string;
  width: number;
  height: number;
  cropAdaptPermitted: boolean;
  productionCleared?: boolean;
}): CustomerContentCertification {
  return {
    schemaVersion: 1,
    packageId: "EXTERNAL-CUSTOMER-CONTENT-INTAKE",
    certificationId: `cert-${input.hash.slice(0, 12)}`,
    routingState: input.productionCleared === false ? "RIGHTS_INFORMATION_REQUIRED" : "CLEARED_FOR_PRODUCTION",
    routingStateAt: NOW,
    technical: {
      inspectedAt: NOW,
      packageId: "EXTERNAL-CUSTOMER-CONTENT-INTAKE",
      originalFileName: input.fileName,
      declaredMimeType: "image/png",
      verifiedMimeType: "image/png",
      signatureMatch: true,
      byteSize: input.bytes,
      sha256: input.hash,
      imageWidth: input.width,
      imageHeight: input.height,
      corrupt: false,
      supported: true,
      passwordProtected: false,
      duplicateOfSha256: null,
      issues: [],
    },
    rights: {
      recordedAt: NOW,
      packageId: "EXTERNAL-CUSTOMER-CONTENT-INTAKE",
      customerProvided: true,
      ownershipBasis: "customer_owns",
      campaignUsePermitted: true,
      cropAdaptPermitted: input.cropAdaptPermitted,
      commercialUsePermitted: true,
      attributionRequired: false,
      statementComplete: true,
      likenessReviewRequired: false,
      thirdPartyMaterialReviewRequired: false,
      likenessConsentConfirmed: false,
      thirdPartyRightsConfirmed: false,
      recognizablePeoplePresent: false,
      thirdPartyMaterialPresent: false,
      likenessFilenameHint: false,
      thirdPartyFilenameHint: false,
      rightsAnswersContradictFilenameHints: false,
      attestationTextVersion: "v1",
    },
    productionCleared: input.productionCleared !== false,
    productionBlockReason:
      input.productionCleared === false ? "Permission has not been confirmed." : null,
    limits: [],
    history: [
      {
        at: NOW,
        from: null,
        to: input.productionCleared === false ? "RIGHTS_INFORMATION_REQUIRED" : "CLEARED_FOR_PRODUCTION",
        reason: "Customer permission recorded.",
      },
    ],
  };
}

function assetItem(input: {
  id: "condensed-qa-asset-1" | "condensed-qa-asset-2";
  fileName: string;
  absolutePath: string;
  bytes: Buffer;
  width: number;
  height: number;
  cropAdaptPermitted?: boolean;
  productionCleared?: boolean;
  mimeType?: string;
}): CampaignMaterialItem {
  const hash = sha256(input.bytes);
  const storageRef: StudioFileStorageReference = {
    ...createReferenceOnlyStorageRef({
      reference: input.absolutePath,
      displayLabel: input.fileName,
      referenceKind: "path_hint",
    }),
    note: `sha256:${hash}`,
  };
  return {
    id: input.id,
    category: "photo-video",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: "file-metadata",
    label: input.fileName,
    reason: "Creative QA & Finish",
    relatedServiceIds: [CREATIVE_QA_FINISH_SKU, "creative_qa_finish"],
    fileName: input.fileName,
    mimeType: input.mimeType ?? "image/png",
    sizeBytes: input.bytes.length,
    uploadStatus: "stored",
    submittedAt: NOW,
    storageRef,
    useAuthorization: {
      basis: "customer_owns",
      attestedAt: NOW,
      statement: "I have permission to use the creative I am supplying.",
    },
    contentCertification: certification({
      fileName: input.fileName,
      bytes: input.bytes.length,
      hash,
      width: input.width,
      height: input.height,
      cropAdaptPermitted: input.cropAdaptPermitted !== false,
      productionCleared: input.productionCleared,
    }),
  };
}

function factsItem(text: string): CampaignMaterialItem {
  return {
    id: "condensed-qa-facts",
    category: "factual-confirmation",
    requirementLevel: "optional",
    reviewStatus: "submitted",
    contentKind: "text",
    label: "Facts, prices, dates, or claims to confirm",
    reason: "Creative QA & Finish",
    relatedServiceIds: [CREATIVE_QA_FINISH_SKU, "creative_qa_finish"],
    text,
    uploadStatus: "none",
    submittedAt: NOW,
  };
}

function dispatchEnvelope(
  campaignId: string,
  record: DispatchExecutionRecord["records"][number],
): DispatchExecutionRecord {
  return {
    schemaVersion: 1,
    status: "evaluated",
    evaluatedAt: NOW,
    lastAttemptAt: NOW,
    activationCheckoutSessionId: "cs_test_creative_qa",
    records: [record],
    ownerActionRequired: false,
  };
}

function reviewJob(campaign: CampaignRecord, contentSha: string): PurchasedJobRecord {
  return {
    jobId: buildJobId(campaign.campaignId, CREATIVE_QA_FINISH_SKU),
    campaignId: campaign.campaignId,
    skuId: CREATIVE_QA_FINISH_SKU,
    serviceName: "Creative QA & Finish",
    spineStatus: "ready_for_review",
    productionLane: "standard",
    intakeComplete: true,
    deliverablePrep: [
      {
        deliverableKey: "deliverable-0",
        label: CREATIVE_QA_DELIVERABLE_LABEL,
        preparedAt: NOW,
      },
    ],
    internalQaReviewAuthorization: {
      status: "ELIGIBLE_FOR_REVIEW",
      decisionId: "qa-creative-qa",
      packageId: "CREATIVE-QA-FINISH-PRODUCTION-1",
      skuId: CREATIVE_QA_FINISH_SKU,
      qaRecordIds: ["qa-creative-qa-finish"],
      workVersionId: "creative-qa-round-1",
      contentSha256s: [contentSha],
      artifactIds: ["proof-round-1"],
      authorizedAt: NOW,
    },
    laneQueuedAt: NOW,
    updatedAt: NOW,
  };
}

function envelope(job: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: job.campaignId,
    tasks: [],
    planFingerprint: CREATIVE_QA_FINISH_SKU,
    updatedAt: NOW,
    version: 1,
    jobRecords: [job],
    jobActivityEvents: [],
    jobReviewFeedback: [],
  };
}

const clientUser = {
  id: "ada-harbor-oak",
  email: "ada@harbor-oak.example",
  displayName: "Ada Stone",
  roles: ["client"] as const,
  currentCampaignId: "",
};

async function promoSource(): Promise<Buffer> {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="900" fill="#c45c26"/>
  <rect x="28" y="28" width="1544" height="844" fill="#1f4d3a"/>
  <text x="96" y="390" font-size="92" font-family="Arial" fill="#f4efe4">Harbor Oak</text>
  <text x="96" y="490" font-size="48" font-family="Arial" fill="#f4efe4">Sunday market</text>
  <text x="96" y="570" font-size="64" font-family="Arial" fill="#f6d78a">$18</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("Creative QA & Finish production", () => {
  it("refuses a new Creative QA checkout and still resolves the production contract", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_creative_qa_finish";
    const amounts: number[] = [];
    const campaignId = `creative-qa-${Date.now()}`;
    const offer = resolveCondensedCheckoutOffer("creative_qa_finish");
    expect(offer).toBeNull();

    const session = await createCheckoutSession(checkoutRequest(campaignId), {
      env: process.env,
      stripe: stripeDouble(amounts) as never,
    });
    expect(session.ok).toBe(false);
    if (!session.ok) {
      const contract = resolveServiceProductionContract(CREATIVE_QA_FINISH_SKU);
      expect(contract.status).toBe("resolved");
      if (contract.status === "resolved") {
        expect(contract.contract.primaryTool.toolId).toBe("creative_qa_finish_pipeline");
      }
      return;
    }
    expect(amounts).toEqual([10320]);
    expect(session.mode).toBe("stripe");

    const unpaid = await readCampaignEnvelope(campaignId);
    expect(unpaid?.record.paymentReceivedAt).toBeNull();
    expect(unpaid?.record.approvedStudioPlan?.lineItems[0]?.deliverables).toEqual([
      CREATIVE_QA_DELIVERABLE_LABEL,
    ]);
    expect(unpaid?.record.approvedStudioPlan?.lineItems[0]?.skuId).toBe(CREATIVE_QA_FINISH_SKU);

    const contract = resolveServiceProductionContract(CREATIVE_QA_FINISH_SKU);
    expect(contract.status).toBe("resolved");
    if (contract.status !== "resolved") return;
    expect(contract.contract.producerRole).toBe("creative_production");
    expect(contract.contract.supportingRoles).toEqual(["qa", "producer_dispatcher"]);
    expect(contract.contract.primaryTool.toolId).toBe("creative_qa_finish_pipeline");
    expect(contract.contract.primaryTool.toolId).not.toBe("canva");
    expect(contract.contract.revision.revisionRuleText).toContain("Three");
    expect(getServiceById(CREATIVE_QA_FINISH_SKU)?.priceCents).toBe(12900);
    expect(getServiceById(CREATIVE_QA_FINISH_SKU)?.isRecommendable).toBe(false);
    expect(getServiceById(CREATIVE_QA_FINISH_SKU)?.includedRevisionRounds).toBe(CREATIVE_QA_MAX_ROUNDS);

    const earlyJob = reviewJob(unpaid.record, "0".repeat(64));
    const earlyRouting = evaluateJobRoutingDecision({
      campaign: unpaid.record,
      job: earlyJob,
      materials: [],
    });
    const earlyDispatch = evaluateJobDispatch({
      campaignId,
      routing: earlyRouting,
      jobId: earlyJob.jobId,
      skuId: CREATIVE_QA_FINISH_SKU,
    });
    const blocked = await runCreativeQaFinishObserver({
      campaign: unpaid.record,
      dispatch: dispatchEnvelope(campaignId, earlyDispatch),
      materials: [],
      outputDir: PROOF_DIR,
    });
    expect(blocked.results[0]?.ok).toBe(false);
    expect(blocked.results[0]?.failureCode).toBe("payment_not_confirmed");

    const binding = await readCheckoutSessionBinding(session.checkoutSessionId);
    if (!binding) throw new Error("checkout binding missing");
    const authorization = {
      decisionId: binding.decisionId,
      outcome: "CLEAR_TO_ACCEPT" as const,
      paymentAuthorized: true as const,
      evaluatedDraftRevision: binding.draftRevision,
      selectedServiceIds: [...binding.selectedServiceIds],
      factFingerprint: binding.factFingerprint,
      decisionSchemaVersion: 2 as const,
      evaluatedAt: NOW,
      authorizedAt: NOW,
      packageId: "creative_qa_finish",
    };
    const confirmed = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: session.checkoutSessionId,
      expectedAmountCents: 10320,
      confirmedAmountCents: 10320,
      currency: "usd",
      selectedServiceIds: ["creative_qa_finish"],
      decisionId: binding.decisionId,
      factFingerprint: binding.factFingerprint,
      draftRevision: binding.draftRevision,
      authorization,
      stripeEventId: `evt_${campaignId}`,
      sandbox: true,
      confirmedAt: NOW,
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentTruth?.status).toBe("confirmed");
    expect(confirmed.campaign.paymentTruth?.confirmedAmountCents).toBe(10320);
    expect(confirmed.campaign.paymentTruth?.sandbox).toBe(true);
    expect(confirmed.campaign.revisionRoundsIncluded).toBe(3);
    const replay = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: session.checkoutSessionId,
      expectedAmountCents: 10320,
      confirmedAmountCents: 10320,
      currency: "usd",
      selectedServiceIds: ["creative_qa_finish"],
      decisionId: binding.decisionId,
      factFingerprint: binding.factFingerprint,
      draftRevision: binding.draftRevision,
      authorization,
      stripeEventId: `evt_${campaignId}`,
      sandbox: true,
      confirmedAt: "2026-10-17T18:00:00.000Z",
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.alreadyPaid).toBe(true);
    expect(replay.campaign.paymentReceivedAt).toBe(confirmed.campaign.paymentReceivedAt);

    await mkdir(PROOF_DIR, { recursive: true });
    const source = await promoSource();
    const sourcePath = path.join(PROOF_DIR, "harbor-oak-sunday-market.png");
    await writeFile(sourcePath, source);
    const sourceHash = sha256(source);
    const materials = [
      assetItem({
        id: "condensed-qa-asset-1",
        fileName: "harbor-oak-sunday-market.png",
        absolutePath: sourcePath,
        bytes: source,
        width: 1600,
        height: 900,
      }),
      factsItem(FACTS),
    ];
    const paid: CampaignRecord = {
      ...replay.campaign,
      projectDetailsSubmittedAt: NOW,
      postPayActivation: {
        schemaVersion: 1,
        status: "activated",
        phase: "ready_for_routing",
        activatedAt: NOW,
        lastAttemptAt: NOW,
        checkoutSessionId: session.checkoutSessionId,
        jobIds: [buildJobId(campaignId, CREATIVE_QA_FINISH_SKU)],
        taskCount: 0,
        intakeComplete: true,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
      },
    };
    const job = reviewJob(paid, sourceHash);
    const routing = evaluateJobRoutingDecision({ campaign: paid, job, materials });
    expect(routing.readyForDispatch).toBe(true);
    expect(routing.blocker).toBeNull();
    const dispatch = evaluateJobDispatch({
      campaignId,
      routing,
      jobId: job.jobId,
      skuId: CREATIVE_QA_FINISH_SKU,
    });
    expect(dispatch.executionIdentityReady).toBe(true);
    expect(dispatch.requirements?.primaryTool.toolId).toBe("creative_qa_finish_pipeline");

    const cropped = await coverCroppedSquare(source);
    await writeFile(path.join(PROOF_DIR, "harbor-oak-cover-crop-rejected.png"), cropped);
    const croppedInspection = await inspectCreativeQaOutput({
      png: cropped,
      source,
      facts: FACTS,
      summary: {
        preservedFacts: FACTS,
        requestedCorrection: CORRECTION,
        revisionRound: 1,
        marginPx: 72,
        canvasPx: 1080,
        contentWidth: 1080,
        contentHeight: 1080,
        sourceSha256: sourceHash,
        outputSha256: sha256(cropped),
        sourceWidth: 1600,
        sourceHeight: 900,
      },
    });
    expect(croppedInspection.pass).toBe(false);
    expect(croppedInspection.defects.join(" ")).toMatch(/edge|proportions/);

    const first = await runCreativeQaFinishObserver({
      campaign: paid,
      dispatch: dispatchEnvelope(campaignId, dispatch),
      materials,
      outputDir: PROOF_DIR,
      revisionRound: 1,
    });
    if (!first.results[0]?.ok) throw new Error(String(first.results[0]?.failureCode) + " :: " + String(first.results[0]?.message));
    expect(first.results[0]?.files).toHaveLength(1);
    const firstFile = first.results[0]?.files?.[0];
    if (!firstFile) throw new Error("first finish missing");
    expect(firstFile.preservedFacts).toBe(FACTS);
    expect(firstFile.requestedCorrection).toBe(CORRECTION);
    expect(firstFile.marginPx).toBe(72);
    const firstPng = await readFile(firstFile.absolutePath);
    const firstOpened = await sharp(firstPng).metadata();
    expect(firstOpened.format).toBe("png");
    expect(firstOpened.width).toBe(1080);
    expect(firstOpened.height).toBe(1080);
    expect(sha256(await readFile(sourcePath))).toBe(sourceHash);

    const again = await runCreativeQaFinishObserver({
      campaign: paid,
      dispatch: dispatchEnvelope(campaignId, dispatch),
      materials,
      outputDir: PROOF_DIR,
      revisionRound: 1,
    });
    expect(again.results[0]?.files?.[0]?.sha256).toBe(firstFile.sha256);

    expect(clientRevisionRoundWouldExceed(3, paid.revisionRoundsIncluded ?? 0)).toBe(true);
    expect(clientRevisionRoundWouldExceed(0, 3)).toBe(false);
    const roundFour = await finishCreativeQaAsset({
      source,
      facts: FACTS,
      correctionRequest: REVISION,
      revisionRound: 4,
    });
    expect(roundFour.ok).toBe(false);
    if (!roundFour.ok) expect(roundFour.code).toBe("revision_round_exceeded");

    const reviewClient = { ...clientUser, currentCampaignId: campaignId };
    const revisionFeedback = createEmptyJobReviewFeedback(campaignId, job.jobId, ["deliverable-0"]);
    revisionFeedback.sectionStatuses["deliverable-0"] = "revision";
    revisionFeedback.stickyNotes.push({
      id: "note-margin",
      deliverableKey: "deliverable-0",
      color: "coral",
      text: REVISION,
      createdAt: NOW,
    });
    const revision = applyReviewRoomPatch(
      envelope(job),
      paid,
      job,
      { action: "request_revision", feedback: revisionFeedback },
      reviewClient,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(revision.ok).toBe(true);
    if (!revision.ok) return;
    expect(revision.job.spineStatus).toBe("revision_requested");

    const exhausted = applyReviewRoomPatch(
      envelope(job),
      { ...paid, revisionRoundsUsed: 3 },
      job,
      { action: "request_revision", feedback: revisionFeedback },
      reviewClient,
      { staffByUserId: {}, staffCapabilities: {} },
    );
    expect(exhausted.ok).toBe(false);

    const second = await runCreativeQaFinishObserver({
      campaign: paid,
      dispatch: dispatchEnvelope(campaignId, dispatch),
      materials,
      outputDir: PROOF_DIR,
      revisionRound: 2,
      correctionRequest: REVISION,
    });
    expect(second.results[0]?.ok).toBe(true);
    const secondFile = second.results[0]?.files?.[0];
    if (!secondFile) throw new Error("revision finish missing");
    expect(secondFile.marginPx).toBe(120);
    expect(secondFile.preservedFacts).toBe(FACTS);
    expect(secondFile.requestedCorrection).toBe(REVISION);
    expect(secondFile.sha256).not.toBe(firstFile.sha256);
    const secondMeta = await sharp(secondFile.absolutePath).metadata();
    expect(secondMeta.width).toBe(1080);
    expect(secondMeta.height).toBe(1080);
    const firstSummary = JSON.parse(await readFile(`${firstFile.absolutePath}.json`, "utf8")) as {
      contentWidth: number;
    };
    const secondSummary = JSON.parse(await readFile(`${secondFile.absolutePath}.json`, "utf8")) as {
      contentWidth: number;
    };
    expect(secondSummary.contentWidth).toBeLessThan(firstSummary.contentWidth);

    const staff = { role: "staff" as const, userId: "qa-1", displayName: "Quality" };
    const resubmitted = applyJobSpineStatusChange(revision.job, revision.envelope.jobActivityEvents ?? [], {
      job: revision.job,
      nextStatus: "ready_for_review",
      actor: staff,
      reason: "Revised static file is ready for review.",
      occurredAt: NOW,
    });
    let reviewReady = resubmitted.job;
    let reviewEvents = resubmitted.events;
    const proofRef: StudioFileStorageReference = {
      ...createReferenceOnlyStorageRef({
        reference: secondFile.absolutePath,
        displayLabel: secondFile.fileName,
        referenceKind: "path_hint",
      }),
      note: `sha256:${secondFile.sha256}`,
    };
    const proof = addJobFileReference(reviewReady, reviewEvents, {
      clientId: reviewClient.id,
      category: "review_proof",
      filename: secondFile.fileName,
      fileType: "image/png",
      storageRef: proofRef,
      visibility: "client_visible",
      status: "approved_for_review",
      actor: staff,
      occurredAt: NOW,
      deliverableKey: "deliverable-0",
      deliverableLabel: CREATIVE_QA_DELIVERABLE_LABEL,
    });
    const summaryPath = path.join(PROOF_DIR, "what-we-fixed-revision-1.txt");
    const summaryBytes = await readFile(summaryPath);
    const summaryText = summaryBytes.toString("utf8");
    expect(summaryText).toContain(FACTS);
    expect(summaryText).toContain("What We Fixed");
    expect(summaryText).not.toContain(CREATIVE_QA_FINISH_SKU);
    expect(summaryText).not.toContain(campaignId);
    const summarySha = sha256(summaryBytes);
    const summaryRef: StudioFileStorageReference = {
      ...createReferenceOnlyStorageRef({
        reference: summaryPath,
        displayLabel: "What We Fixed",
        referenceKind: "path_hint",
      }),
      note: "sha256:" + summarySha,
    };
    const summaryProof = addJobFileReference(proof.job, proof.events, {
      clientId: reviewClient.id,
      category: "review_proof",
      filename: "what-we-fixed-revision-1.txt",
      fileType: "text/plain",
      storageRef: summaryRef,
      visibility: "client_visible",
      status: "approved_for_review",
      actor: staff,
      occurredAt: NOW,
      deliverableKey: "deliverable-1",
      deliverableLabel: "What We Fixed",
    });
    reviewReady = {
      ...summaryProof.job,
      internalQaReviewAuthorization: {
        status: "ELIGIBLE_FOR_REVIEW",
        decisionId: "qa-creative-qa-r2",
        packageId: "CREATIVE-QA-FINISH-PRODUCTION-1",
        skuId: CREATIVE_QA_FINISH_SKU,
        qaRecordIds: ["qa-creative-qa-finish-r2"],
        workVersionId: "creative-qa-round-2",
        contentSha256s: [secondFile.sha256, summarySha],
        artifactIds: [proof.file.id, summaryProof.file.id],
        authorizedAt: NOW,
      },
    };
    reviewEvents = summaryProof.events;
    const approvalFeedback = createEmptyJobReviewFeedback(campaignId, job.jobId, ["deliverable-0"], {
      packageId: `pkg:${job.jobId}:round-2`,
    });
    approvalFeedback.sectionStatuses["deliverable-0"] = "approved";
    const approved = applyReviewRoomPatch(
      { ...envelope(reviewReady), jobActivityEvents: reviewEvents },
      paid,
      reviewReady,
      { action: "approve_for_delivery", feedback: approvalFeedback },
      reviewClient,
      { staffByUserId: {}, staffCapabilities: {} },
      reviewClient.id,
      materials,
      true,
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.job.spineStatus).toBe("ready_for_delivery");
    expect(approved.job.clientDeliveryFiles).toHaveLength(2);
    expect(approved.job.clientDeliveryFiles?.[0]?.fileName).toBe(secondFile.fileName);
    expect(approved.job.clientDeliveryFiles?.[0]?.contentSha256).toBe(secondFile.sha256);
    expect(approved.job.clientDeliveryFiles?.map((file) => file.fileName)).toEqual([
      secondFile.fileName,
      "what-we-fixed-revision-1.txt",
    ]);
    expect(approved.job.clientDeliveryFiles?.some((file) => /flyer|business-card|\.mp4|social-post/i.test(file.fileName))).toBe(false);

    const delivered = {
      applied: approved.job.spineStatus === "ready_for_delivery",
      job: approved.job,
    };
    expect(materialContextFromLedger(materials).ledgerLoaded).toBe(true);
    expect(delivered.applied).toBe(true);
    expect(delivered.job.spineStatus).toBe("ready_for_delivery");
    expect(delivered.job.clientDeliveryFiles).toHaveLength(2);
    const finalFile = delivered.job.clientDeliveryFiles?.[0];
    expect(finalFile?.contentSha256).toBe(secondFile.sha256);
    const opened = await sharp(finalFile?.url ?? "").metadata();
    expect(opened.format).toBe("png");
    expect(opened.width).toBe(1080);
    expect(materials[0]?.contentCertification?.productionCleared).toBe(true);
    expect(materials[1]?.text).toBe(FACTS);
  });

  it("fails closed without facts, rights, or a video file", async () => {
    const source = await sharp({
      create: { width: 80, height: 40, channels: 3, background: "#1f4d3a" },
    })
      .png()
      .toBuffer();
    const missingFacts = await finishCreativeQaAsset({
      source,
      facts: "  ",
      correctionRequest: CORRECTION,
      revisionRound: 1,
    });
    expect(missingFacts.ok).toBe(false);
    const video = assetItem({
      id: "condensed-qa-asset-1",
      fileName: "clip.mp4",
      absolutePath: "C:\\not-used.mp4",
      bytes: source,
      width: 80,
      height: 40,
      mimeType: "video/mp4",
    });
    expect(creativeQaAssetBlock(video)?.code).toBe("video_not_supported");
    const uncleared = assetItem({
      id: "condensed-qa-asset-1",
      fileName: "mark.png",
      absolutePath: "C:\\not-used.png",
      bytes: source,
      width: 80,
      height: 40,
      productionCleared: false,
    });
    expect(creativeQaAssetBlock(uncleared)?.code).toBe("rights_not_cleared");
    const redraw = await finishCreativeQaAsset({
      source,
      facts: FACTS,
      correctionRequest: "Change the price to $20.",
      revisionRound: 1,
    });
    expect(redraw.ok).toBe(false);
    if (!redraw.ok) expect(redraw.code).toBe("correction_not_in_scope");
    const tighter = await finishCreativeQaAsset({
      source,
      facts: FACTS,
      correctionRequest: "Use less margin around the artwork.",
      revisionRound: 2,
    });
    expect(tighter.ok).toBe(true);
    if (tighter.ok) expect(tighter.summary.marginPx).toBe(36);
    const redesign = await finishCreativeQaAsset({
      source,
      facts: FACTS,
      correctionRequest: "Change the brand color and the font.",
      revisionRound: 2,
    });
    expect(redesign.ok).toBe(false);
    if (!redesign.ok) expect(redesign.code).toBe("correction_not_in_scope");
  });
});
