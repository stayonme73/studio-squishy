import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS } from "@/catalog/activation";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import { isRouteMapV2ShelfServiceId } from "@/catalog/route-map-v2-launch";
import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import {
  allowInternalStagingCheckout,
  FOOTAGE_EDITING_INTAKE_TEMPLATE,
  studioShortFormVideoEditingLaunchIntegrationV1,
} from "@/config/studio-short-form-video-editing-launch-integration-v1";
import {
  isOriginalFrozenNineSellNowSku,
  studioInternalSellNowRegisterV1,
} from "@/config/studio-internal-sell-now-register-v1";
import { launchMenuHonestClassification } from "@/config/studio-launch-menu-production-runtime-v1";
import {
  isCustomerTalkingHeadVideoFile,
  maxBytesForCustomerMaterialFile,
} from "@/config/studio-materials-upload-v1";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { buildProjectIntakePlan } from "@/lib/project-intake-plan";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production/active-set";
import { assembleApprovedClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { presentFootageEditingReviewProof } from "@/lib/studio-review-revision/present-footage-editing-review";
import { reproduceFootageEditingAfterRevision } from "@/lib/studio-review-revision/reproduce-footage-editing-after-revision";
import type { FootagePipelineResult } from "@/lib/studio-short-form-video-editing/footage-pipeline";
import {
  buildFootageEditingStagingCampaign,
  getFootageEditingStagingOffer,
} from "@/lib/studio-short-form-video-editing-launch/staging-purchase";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

import { writeCleanTalkingHeadFixture } from "@/lib/studio-source-audio-preflight/fixtures";

import { invokeFootageEditingDispatchHook } from "./footage-editing-dispatch-hook";
import { invokeShortVideoDispatchHook } from "./short-video-dispatch-hook";
import { runLaunchMenuProductionObserver } from "./launch-menu-production-observer";
import { mapFootageEditingJobTruthFromJob } from "./map-footage-editing-job-truth";
import { evaluateJobDispatch } from "./evaluate";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const SKU = SHORT_FORM_VIDEO_EDITING_SKU;

function readyRecord(campaignId: string, skuId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${skuId}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: skuId as JobDispatchRecord["skuId"],
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "video_audio",
      controlLane: "standard",
      factFingerprint: `fp-${skuId}`,
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: skuId as JobDispatchRecord["skuId"],
  });
}

function campaignFor(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "River Reed Pottery",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Footage editing staging",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${SKU}:videoPurpose`]:
          "Help customers understand why a finished page feels trustworthy.",
        [`${SKU}:talkingHeadConfirm`]:
          "Yes — one native-vertical English talking-head I own or have permission to use",
        [`${SKU}:rightsAcknowledgement`]:
          "I own this recording, or I have permission from everyone who appears in it",
        [`${SKU}:ctaText`]: "Book at riverandreed.example",
        [`${SKU}:sourceMaterials`]: "talking-head.mp4. I own this recording.",
      },
    },
  };
}

function fakeFootagePipeline(
  sourceRel: string,
  outputRel: string,
  revisionApplied = false,
): FootagePipelineResult {
  return {
    ok: true,
    sourceRelativePath: sourceRel,
    probe: {
      durationSeconds: 40,
      width: 1080,
      height: 1920,
      hasAudio: true,
    },
    edl: {
      ok: true,
      sourceDurationSeconds: 40,
      outputDurationSeconds: 24,
      clips: [],
      captions: [],
      droppedFalseStarts: 0,
      droppedDeadSpaceSeconds: 0,
      selection: "performance_watch",
    },
    outputRelativePath: outputRel,
    providerRenderId: revisionApplied ? "staging-footage-rev" : "staging-footage",
    spend: {
      deepgramUsdList: 0,
      deepgramUsdOptOutCeiling: 0,
      modelSelectionUsd: 0,
      performanceWatchUsd: 0,
      shotstackCredits: 0,
      renders: 1,
      transportRetries: 0,
      creativeRetries: 0,
      elapsedMs: 1,
      renderEnv: "stage",
      watermarkExpected: false,
    },
    revisionApplied,
    selectionWinner: "performance_watch",
  };
}

async function persistMaterials(
  campaignId: string,
  items: Parameters<typeof writeMaterialsEnvelope>[0]["items"],
) {
  const now = new Date().toISOString();
  await writeMaterialsEnvelope({
    campaignId,
    items,
    updatedAt: now,
    version: 1,
    syncedAt: now,
  });
}

function clearedTalkingHead(campaignId: string, fileName = "talking-head.mp4") {
  const rel = `data/campaign-design-artifacts/${campaignId}/materials/${fileName}`;
  const abs = path.join(REPO, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeCleanTalkingHeadFixture(abs);
  return {
    rel,
    item: {
      id: "source-1",
      category: "photo-video" as const,
      requirementLevel: "required" as const,
      reviewStatus: "approved_for_use" as const,
      contentKind: "file-metadata" as const,
      label: "Talking-head",
      reason: "Customer-cleared native-vertical source",
      relatedServiceIds: [SKU] as const,
      uploadStatus: "stored" as const,
      fileName,
      url: rel,
      useAuthorization: {
        basis: "customer_owns" as const,
        attestedAt: new Date().toISOString(),
      },
    },
  };
}

describe("Short-Form Video Editing unpublished Launch Now integration", () => {
  it("publishes the $349 offer without putting it in the Kitchen 22 lock", () => {
    expect(studioShortFormVideoEditingLaunchIntegrationV1.publicMenuPublished).toBe(
      true,
    );
    expect(studioShortFormVideoEditingLaunchIntegrationV1.doNotWireClipRepurposing).toBe(
      true,
    );
    expect(studioShortFormVideoEditingLaunchIntegrationV1.doNotReopenCertifiedFactory).toBe(
      true,
    );
    expect(launchMenuHonestClassification[SKU]).toBe("READY_WITH_EXPLICIT_LIMITS");
    expect(isRouteMapV2ShelfServiceId(SKU)).toBe(true);
    expect(CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS).toContain(SKU);
    expect(ACTIVE_CUSTOMER_FACING_SKUS).not.toContain(SKU);
    expect(isOriginalFrozenNineSellNowSku(SKU)).toBe(false);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.tenthPublicMenuPublished).toBe(true);
    expect(allowInternalStagingCheckout(SKU)).toBe(true);
  });

  it("exposes a truthful staging catalog entry and intake template", () => {
    const service = getServiceById(SKU);
    expect(service?.priceCents).toBe(34900);
    expect(service?.launchStatus).toBe("limited");
    expect(service?.intakeTemplate).toBe(FOOTAGE_EDITING_INTAKE_TEMPLATE);
    expect(service?.purpose).toMatch(/point to each moment/i);
    expect(service?.purpose).not.toMatch(/still photos/);
    expect(service?.exclusions.join(" ")).toMatch(/narration|Studio posting/i);

    const schema = getRouteMapIntakeSchema(FOOTAGE_EDITING_INTAKE_TEMPLATE);
    expect(schema.type).toBe("rtu-short-form-video-edit");
    expect(schema.type).not.toBe("rtu-short-video");
    expect(
      schema.fields.some((field) => field.id === "videoPurpose" && field.required),
    ).toBe(true);
    expect(schema.fields.some((field) => field.id === "ctaText" && field.required)).toBe(
      true,
    );
    expect(
      schema.fields.some((field) => field.id === "rightsAcknowledgement" && field.required),
    ).toBe(true);

    const plan = buildProjectIntakePlan([SKU]);
    expect(plan.services).toHaveLength(1);
    expect(plan.services[0]?.fields.some((field) => field.id === "ctaText")).toBe(true);
  });

  it("resolves a footage-factory contract, not the stills Shotstack hook", () => {
    const contract = resolveServiceProductionContract(SKU);
    expect(contract.status).toBe("resolved");
    if (contract.status !== "resolved") return;
    expect(contract.contract.primaryTool.toolId).toBe("footage_editing_pipeline");
    expect(contract.contract.primaryTool.toolId).not.toBe("shotstack");
    const stills = resolveServiceProductionContract("v2-rtu-short-video");
    expect(stills.status).toBe("resolved");
    if (stills.status !== "resolved") return;
    expect(stills.contract.primaryTool.toolId).toBe("shotstack");
  });

  it("maps intake + one cleared talking-head and fails closed without it", () => {
    const campaignId = "camp-footage-intake-truth";
    const campaign = campaignFor(campaignId);
    const missing = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign,
      materials: [],
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.code).toBe("MISSING_USABLE_SOURCE");

    const source = clearedTalkingHead(campaignId);
    const ok = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign,
      materials: [source.item],
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.intake.ctaText).toBe("Book at riverandreed.example");
    expect(ok.intake.rightsCleared).toBe(true);
    expect(ok.intake.skuId).toBe(SKU);

    const mov = clearedTalkingHead(`${campaignId}-mov`, "talking-head.mov");
    const movOk = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign: campaignFor(`${campaignId}-mov`),
      materials: [mov.item],
    });
    expect(movOk.ok).toBe(true);
  });

  it("builds a staging offer at $349 without putting it on the public shelf", () => {
    const offer = getFootageEditingStagingOffer();
    expect(offer.priceCents).toBe(34900);
    expect(offer.publicMenuPublished).toBe(true);
    expect(offer.onLaunchNowShelf).toBe(true);
    expect(offer.checkoutAllowed).toBe(true);
    const staged = buildFootageEditingStagingCampaign({
      campaignId: "camp-footage-staging-offer",
    });
    expect(staged.paymentTruth?.selectedServiceIds).toEqual([SKU]);
    expect(staged.paymentTruth?.expectedAmountCents).toBe(34900);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
  });

  it("paid dispatch calls the footage factory and never the stills hook", async () => {
    const campaignId = `camp-footage-dispatch-${Date.now()}`;
    const campaign = campaignFor(campaignId);
    const source = clearedTalkingHead(campaignId);
    const record = readyRecord(campaignId, SKU);
    expect(record.executionIdentityReady).toBe(true);
    expect(record.requirements?.primaryTool.toolId).toBe("footage_editing_pipeline");

    const outputRel = `data/campaign-design-artifacts/${campaignId}/footage-out.mp4`;
    writeFileSync(path.join(REPO, outputRel), Buffer.from("finished-mp4"));

    const hooked = await invokeFootageEditingDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [source.item],
      runPipeline: async () => ({
        ok: true,
        sourceRelativePath: source.rel,
        probe: {
          durationSeconds: 40,
          width: 1080,
          height: 1920,
          hasAudio: true,
        },
        edl: {
          ok: true,
          sourceDurationSeconds: 40,
          outputDurationSeconds: 22,
          clips: [],
          captions: [],
          droppedFalseStarts: 0,
          droppedDeadSpaceSeconds: 0,
          selection: "performance_watch",
        },
        outputRelativePath: outputRel,
        providerRenderId: "staging-footage-1",
        spend: {
          deepgramUsdList: 0,
          deepgramUsdOptOutCeiling: 0,
          modelSelectionUsd: 0,
          performanceWatchUsd: 0,
          shotstackCredits: 0,
          renders: 1,
          transportRetries: 0,
          creativeRetries: 0,
          elapsedMs: 1,
          renderEnv: "stage",
          watermarkExpected: false,
        },
        revisionApplied: false,
        selectionWinner: "performance_watch",
      }),
    });
    expect(hooked.ok, hooked.ok ? "ok" : `${hooked.failureCode}: ${hooked.message}`).toBe(
      true,
    );
    if (!hooked.ok) return;
    expect(hooked.skuId).toBe(SKU);
    expect(hooked.mp4RelativePath).toBe(outputRel);

    await persistMaterials(campaignId, [source.item]);

    const stillsRefuse = await invokeShortVideoDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
    });
    expect(stillsRefuse.ok).toBe(false);
    if (stillsRefuse.ok) return;
    expect(stillsRefuse.failureCode).toBe("SKU_NOT_SUPPORTED");

    const observed = await runLaunchMenuProductionObserver({
      repoRoot: REPO,
      campaign,
      dispatch: {
        schemaVersion: 1,
        status: "EXECUTION_IDENTITY_READY",
        evaluatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: `cs_${campaignId}`,
        records: [record],
        ownerActionRequired: false,
      },
      footageRunPipeline: async () => fakeFootagePipeline(source.rel, outputRel),
    });
    expect(observed.results.some((result) => result.skuId === SKU && result.ok)).toBe(
      true,
    );
  });

  it("observer keeps $349 footage and $149 stills results independent", async () => {
    const campaignId = `camp-footage-independent-${Date.now()}`;
    const source = clearedTalkingHead(campaignId);
    const footageRecord = readyRecord(campaignId, SKU);
    const stillsRecord = readyRecord(campaignId, "v2-rtu-short-video");
    const outputRel = `data/campaign-design-artifacts/${campaignId}/footage-independent.mp4`;
    writeFileSync(path.join(REPO, outputRel), Buffer.from("independent-mp4"));
    const campaign = campaignFor(campaignId);
    await persistMaterials(campaignId, [source.item]);
    const observed = await runLaunchMenuProductionObserver({
      repoRoot: REPO,
      campaign: {
        ...campaign,
        routeMapIntake: {
          submittedAt: campaign.routeMapIntake!.submittedAt,
          answers: {
            ...campaign.routeMapIntake!.answers,
            "v2-rtu-short-video:videoPurpose": "Open studio walk-through",
            "v2-rtu-short-video:onScreenText":
              "Open Studio Saturday. Call (804) 555-0177.",
            "v2-rtu-short-video:format": "Vertical",
          },
        },
      },
      dispatch: {
        schemaVersion: 1,
        status: "EXECUTION_IDENTITY_READY",
        evaluatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: `cs_${campaignId}`,
        records: [footageRecord, stillsRecord],
        ownerActionRequired: false,
      },
      footageRunPipeline: async () => fakeFootagePipeline(source.rel, outputRel),
    });
    const footage = observed.results.find((result) => result.skuId === SKU);
    const stills = observed.results.find(
      (result) => result.skuId === "v2-rtu-short-video",
    );
    expect(footage?.ok).toBe(true);
    expect(footage?.mp4RelativePath).toBe(outputRel);
    expect(stills?.ok).toBe(false);
    expect(stills?.failureCode).toBe("MISSING_USABLE_FOOTAGE");
  });

  it("presents a $349 Review proof without using the stills SKU", async () => {
    const campaignId = `camp-footage-present-${Date.now()}`;
    const rel = `data/campaign-design-artifacts/${campaignId}/review.mp4`;
    const abs = path.join(REPO, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    const bytes = Buffer.from("footage-review-proof");
    writeFileSync(abs, bytes);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const now = new Date().toISOString();
    const campaign = campaignFor(campaignId);
    const envelope = {
      campaignId,
      version: 12,
      planFingerprint: "fp-footage",
      updatedAt: now,
      syncedAt: now,
      tasks: [],
      jobRecords: [
        {
          jobId: `${campaignId}::${SKU}`,
          campaignId,
          skuId: SKU,
          serviceName: "Short-Form Video Editing",
          spineStatus: "ready_for_review",
          productionLane: "quick",
          intakeComplete: true,
          updatedAt: now,
        },
      ],
    } as unknown as ServerTasksEnvelope;
    const presented = await presentFootageEditingReviewProof({
      campaign,
      envelope,
      mp4RelativePath: rel,
      mp4ContentSha256: hash,
      renderVersion: 1,
    });
    expect(presented.presented).toBe(true);
    const proof = presented.envelope.jobRecords?.[0]?.fileRegistry?.find(
      (ref) => ref.category === "review_proof",
    );
    expect(proof?.fileType).toBe("video/mp4");
    expect(proof?.status).toBe("approved_for_review");
    expect(proof?.visibility).toBe("client_visible");
    expect(presented.envelope.jobRecords?.[0]?.skuId).toBe(SKU);
    expect(presented.envelope.jobRecords?.[0]?.skuId).not.toBe("v2-rtu-short-video");
  });

  it("routes one included revision back into the same factory", async () => {
    const campaignId = `camp-footage-revision-${Date.now()}`;
    const campaign = campaignFor(campaignId);
    const source = clearedTalkingHead(campaignId);
    const record = readyRecord(campaignId, SKU);
    const outputRel = `data/campaign-design-artifacts/${campaignId}/footage-revised.mp4`;
    writeFileSync(path.join(REPO, outputRel), Buffer.from("revised-mp4"));
    let sawRevision = false;
    const revised = await reproduceFootageEditingAfterRevision({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [source.item],
      runPipeline: async (input) => {
        sawRevision = input.applyRevision === true;
        return {
          ok: true,
          sourceRelativePath: source.rel,
          probe: {
            durationSeconds: 40,
            width: 1080,
            height: 1920,
            hasAudio: true,
          },
          edl: {
            ok: true,
            sourceDurationSeconds: 40,
            outputDurationSeconds: 24,
            clips: [],
            captions: [],
            droppedFalseStarts: 0,
            droppedDeadSpaceSeconds: 0,
            selection: "performance_watch",
          },
          outputRelativePath: outputRel,
          providerRenderId: "staging-footage-rev",
          spend: {
            deepgramUsdList: 0,
            deepgramUsdOptOutCeiling: 0,
            modelSelectionUsd: 0,
            performanceWatchUsd: 0,
            shotstackCredits: 0,
            renders: 1,
            transportRetries: 0,
            creativeRetries: 0,
            elapsedMs: 1,
            renderEnv: "stage",
            watermarkExpected: false,
          },
          revisionApplied: true,
          selectionWinner: "performance_watch",
        };
      },
    });
    expect(revised.ok).toBe(true);
    expect(sawRevision).toBe(true);
  });

  it("pins the approved MP4 as Final Delivery for this SKU", () => {
    const hash = "a".repeat(64);
    const now = new Date().toISOString();
    const job = {
      jobId: "job-footage-delivery",
      campaignId: "camp-footage-delivery",
      skuId: SKU,
      serviceName: "Short-Form Video Editing",
      spineStatus: "approved_for_delivery",
      productionLane: "quick",
      intakeComplete: true,
      updatedAt: now,
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        contentSha256s: [`sha256:${hash}`],
        artifactIds: ["footage-v1"],
        decisionId: "dec-1",
        workVersionId: "wv-1",
      },
      fileRegistry: [
        {
          id: "ref-footage-mp4",
          filename: "short-form-edit.mp4",
          fileType: "video/mp4",
          category: "review_proof",
          visibility: "client_visible",
          status: "approved_for_review",
          versionLabel: "v1",
          addedAt: now,
          storageRef: {
            provider: "supabase_storage",
            checksumSha256: hash,
            contentType: "video/mp4",
            objectPath: "footage/short-form-edit.mp4",
          },
        },
      ],
    } as unknown as PurchasedJobRecord;
    const assembled = assembleApprovedClientDelivery({
      job,
      events: [],
      actor: {
        id: "studio-machine",
        email: "machine@studio.local",
        displayName: "Studio Machine",
        roles: ["staff"],
      },
    });
    expect(assembled.assembled).toBe(true);
    expect(
      assembled.job.clientDeliveryFiles?.some((file) =>
        /edited talking-head/i.test(file.deliverableLabel),
      ),
    ).toBe(true);
  });

  it("accepts talking-head MP4/MOV uploads above the stills 5 MB cap", () => {
    expect(isCustomerTalkingHeadVideoFile("talk.mov", "video/quicktime")).toBe(true);
    expect(maxBytesForCustomerMaterialFile("talk.mp4", "video/mp4")).toBe(
      250 * 1024 * 1024,
    );
    expect(maxBytesForCustomerMaterialFile("logo.png", "image/png")).toBe(5 * 1024 * 1024);
  });
});
