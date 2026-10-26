import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { writeCleanTalkingHeadFixture } from "@/lib/studio-source-audio-preflight/fixtures";
import { assembleApprovedClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { reproduceFootageEditingAfterRevision } from "@/lib/studio-review-revision/reproduce-footage-editing-after-revision";
import type { FootagePipelineResult } from "@/lib/studio-short-form-video-editing/footage-pipeline";
import { buildFootageEditingStagingCampaign } from "@/lib/studio-short-form-video-editing-launch/staging-purchase";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { evaluateJobDispatch } from "./evaluate";
import {
  readFootageEditingHookReceipt,
} from "./footage-editing-dispatch-hook";
import { runLaunchMenuProductionObserver } from "./launch-menu-production-observer";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const SKU = SHORT_FORM_VIDEO_EDITING_SKU;

function readyRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: SKU,
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "video_audio",
      controlLane: "standard",
      factFingerprint: `fp-${SKU}`,
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: SKU,
  });
}

function fakeResult(
  sourceRel: string,
  outputRel: string,
  revisionApplied: boolean,
  providerRenderId: string,
): FootagePipelineResult {
  return {
    ok: true,
    sourceRelativePath: sourceRel,
    probe: { durationSeconds: 40, width: 1080, height: 1920, hasAudio: true },
    edl: {
      ok: true,
      sourceDurationSeconds: 40,
      outputDurationSeconds: revisionApplied ? 26 : 24,
      clips: [],
      captions: [],
      droppedFalseStarts: 0,
      droppedDeadSpaceSeconds: 0,
      selection: "performance_watch",
    },
    outputRelativePath: outputRel,
    providerRenderId,
    spend: {
      deepgramUsdList: 0,
      deepgramUsdOptOutCeiling: 0,
      modelSelectionUsd: 0,
      performanceWatchUsd: 0,
      shotstackCredits: 0,
      renders: 1,
      transportRetries: 0,
      creativeRetries: revisionApplied ? 1 : 0,
      elapsedMs: 1,
      renderEnv: "stage",
      watermarkExpected: false,
    },
    revisionApplied,
    selectionWinner: "performance_watch",
  };
}

describe("Footage editing receipt split", () => {
  it("keeps first-cut and revision receipts independent and never buys a third render", async () => {
    const campaignId = `camp-footage-receipt-split-${Date.now()}`;
    const campaign = buildFootageEditingStagingCampaign({ campaignId });
    const materialRel = `data/campaign-design-artifacts/${campaignId}/materials/talking-head.mp4`;
    const materialAbs = path.join(REPO, materialRel);
    mkdirSync(path.dirname(materialAbs), { recursive: true });
    writeCleanTalkingHeadFixture(materialAbs);
    const material = {
      id: "source-1",
      category: "photo-video" as const,
      requirementLevel: "required" as const,
      reviewStatus: "approved_for_use" as const,
      contentKind: "file-metadata" as const,
      label: "Talking-head",
      reason: "Cleared staging source",
      relatedServiceIds: [SKU] as const,
      uploadStatus: "stored" as const,
      fileName: "talking-head.mp4",
      url: materialRel,
      useAuthorization: {
        basis: "customer_owns" as const,
        attestedAt: new Date().toISOString(),
      },
    };
    await writeMaterialsEnvelope({
      campaignId,
      items: [material],
      updatedAt: new Date().toISOString(),
      version: 1,
      syncedAt: new Date().toISOString(),
    });

    const firstOut = `data/campaign-design-artifacts/${campaignId}/first-cut.mp4`;
    const revisionOut = `data/campaign-design-artifacts/${campaignId}/revision.mp4`;
    writeFileSync(path.join(REPO, firstOut), Buffer.from("first-cut-mp4"));
    writeFileSync(path.join(REPO, revisionOut), Buffer.from("revision-mp4"));

    let paidRenders = 0;
    const runPipeline: typeof import("@/lib/studio-short-form-video-editing/footage-pipeline").runFootageEditingPipeline =
      async (input) => {
        paidRenders += 1;
        const revisionApplied = input.applyRevision === true;
        return fakeResult(
          materialRel,
          revisionApplied ? revisionOut : firstOut,
          revisionApplied,
          revisionApplied ? "rev-1" : "first-1",
        );
      };

    const record = readyRecord(campaignId);
    const dispatch = {
      schemaVersion: 1 as const,
      status: "EXECUTION_IDENTITY_READY" as const,
      evaluatedAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      activationCheckoutSessionId: campaign.paymentTruth!.checkoutSessionId,
      records: [record],
      ownerActionRequired: false as const,
    };

    const first = await runLaunchMenuProductionObserver({
      repoRoot: REPO,
      campaign,
      dispatch,
      footageRunPipeline: runPipeline,
    });
    expect(first.results[0]?.ok).toBe(true);
    expect(first.results[0]?.invocationOutcome).toBe("RENDERED");
    expect(paidRenders).toBe(1);

    const retry = await runLaunchMenuProductionObserver({
      repoRoot: REPO,
      campaign,
      dispatch,
      footageRunPipeline: runPipeline,
    });
    expect(retry.results[0]?.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(retry.results[0]?.mp4ContentSha256).toBe(first.results[0]?.mp4ContentSha256);
    expect(paidRenders).toBe(1);

    const revised = await reproduceFootageEditingAfterRevision({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [material],
      runPipeline,
    });
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    expect(revised.invocationOutcome).toBe("RENDERED");
    expect(paidRenders).toBe(2);

    const afterRevision = await runLaunchMenuProductionObserver({
      repoRoot: REPO,
      campaign,
      dispatch,
      footageRunPipeline: runPipeline,
    });
    expect(afterRevision.results[0]?.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(afterRevision.results[0]?.mp4ContentSha256).toBe(
      first.results[0]?.mp4ContentSha256,
    );
    expect(afterRevision.results[0]?.providerRenderId).toBe("first-1");
    expect(paidRenders).toBe(2);

    const revisedAgain = await reproduceFootageEditingAfterRevision({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [material],
      runPipeline,
    });
    expect(revisedAgain.ok).toBe(true);
    if (!revisedAgain.ok) return;
    expect(revisedAgain.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(revisedAgain.mp4ContentSha256).toBe(revised.mp4ContentSha256);
    expect(paidRenders).toBe(2);

    const firstReceipt = readFootageEditingHookReceipt({
      repoRoot: REPO,
      campaignId,
      dispatchId: record.dispatchId,
      lane: "first-cut",
    });
    const revisionReceipt = readFootageEditingHookReceipt({
      repoRoot: REPO,
      campaignId,
      dispatchId: record.dispatchId,
      lane: "revision",
    });
    expect(firstReceipt?.ok).toBe(true);
    expect(firstReceipt?.lane).toBe("first-cut");
    expect(firstReceipt?.providerRenderId).toBe("first-1");
    expect(revisionReceipt?.ok).toBe(true);
    expect(revisionReceipt?.lane).toBe("revision");
    expect(revisionReceipt?.providerRenderId).toBe("rev-1");
    expect(firstReceipt?.mp4ContentSha256).not.toBe(revisionReceipt?.mp4ContentSha256);

    const now = new Date().toISOString();
    const hash = revisionReceipt?.mp4ContentSha256 ?? "";
    const assembled = assembleApprovedClientDelivery({
      job: {
        jobId: `${campaignId}::${SKU}`,
        campaignId,
        skuId: SKU,
        serviceName: "Short-Form Video Editing",
        spineStatus: "approved_for_delivery",
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
        customerApprovedArtifactAuthorization: {
          status: "CUSTOMER_APPROVED",
          contentSha256s: [`sha256:${hash}`],
          artifactIds: ["footage-v2"],
          decisionId: "dec-1",
          workVersionId: "wv-2",
        },
        fileRegistry: [
          {
            id: "ref-rev",
            filename: "short-form-edit.mp4",
            fileType: "video/mp4",
            category: "review_proof",
            visibility: "client_visible",
            status: "approved_for_review",
            versionLabel: "v2",
            addedAt: now,
            storageRef: {
              provider: "supabase_storage",
              checksumSha256: hash,
              contentType: "video/mp4",
              objectPath: "footage/short-form-edit.mp4",
            },
          },
        ],
      } as unknown as PurchasedJobRecord,
      events: [],
      actor: {
        id: "studio-machine",
        email: "machine@studio.local",
        displayName: "Studio Machine",
        roles: ["staff"],
      },
    });
    expect(assembled.assembled).toBe(true);
    expect(paidRenders).toBe(2);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
  });
});
