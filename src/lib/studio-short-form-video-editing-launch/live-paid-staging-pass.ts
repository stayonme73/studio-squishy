/**
 * One unpublished paid staging job through the certified $349 factory.
 * Does not inject the factory. Does not publish. Does not touch stills or Clip Repurposing.
 */

import { execFileSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS } from "@/catalog/activation";
import { isRouteMapV2ShelfServiceId } from "@/catalog/route-map-v2-launch";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { studioShortFormVideoEditingLaunchIntegrationV1 } from "@/config/studio-short-form-video-editing-launch-integration-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { ensureFootageEditingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-footage-editing-review-bind";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import {
  invokeFootageEditingDispatchHook,
  readFootageEditingHookReceipt,
} from "@/lib/studio-dispatch/footage-editing-dispatch-hook";
import { runLaunchMenuProductionObserver } from "@/lib/studio-dispatch/launch-menu-production-observer";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { mapFootageEditingJobTruthFromJob } from "@/lib/studio-dispatch/map-footage-editing-job-truth";
import { invokeShortVideoDispatchHook } from "@/lib/studio-dispatch/short-video-dispatch-hook";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production/active-set";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { assembleApprovedClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { reproduceFootageEditingAfterRevision } from "@/lib/studio-review-revision/reproduce-footage-editing-after-revision";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import {
  ensureLiveProofSource,
  LIVE_PROOF_SOURCE_META,
} from "@/lib/studio-short-form-video-editing/source-prep";

import {
  buildFootageEditingStagingCampaign,
  getFootageEditingStagingOffer,
} from "./staging-purchase";

export const LIVE_PAID_STAGING_CAMPAIGN_ID = "camp-sfve-live-staging-20260925";
export const LIVE_PAID_STAGING_PROOF_REL =
  "docs/launch/studio-operating-short-form-video-editing-launch-now-integration-1/live-paid-staging";

const SKU = SHORT_FORM_VIDEO_EDITING_SKU;
const FACTORY_OUT_REL =
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/edited-talking-head.mp4";
const FACTORY_SPEND_REL =
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/spend.json";

const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

export type LivePaidStagingProof = {
  campaignId: string;
  skuId: typeof SKU;
  priceCents: number;
  publicLaunchNowPublishedCount: number;
  publicMenuPublished: false;
  onLaunchNowShelf: false;
  contractTool: string;
  stillsTool: string;
  stillsHookRefused: boolean;
  rightsGateClosedWithoutClearance: boolean;
  source: {
    title: string;
    license: string;
    relativePath: string;
    durationSeconds: number;
    width: number;
    height: number;
    nativeVertical: boolean;
  };
  firstDispatch: {
    ok: boolean;
    outcome?: string;
    providerRenderId?: string;
    mp4RelativePath?: string;
    mp4ContentSha256?: string;
    receiptRelativePath: string;
  };
  observerRetry: {
    outcome?: string;
    sameHash: boolean;
  };
  review: {
    presented: boolean;
    skuId?: string;
    proofCategory?: string;
  };
  revision: {
    ok: boolean;
    applyRevision: true;
    outcome?: string;
    providerRenderId?: string;
  };
  finalDelivery: {
    assembled: boolean;
    clientVisible: boolean;
    label?: string;
  };
  spend: {
    first?: Record<string, unknown>;
    revision?: Record<string, unknown>;
  };
  quality: {
    reviewHasAudio: boolean;
    revisionHasAudio: boolean;
    reviewDurationSeconds?: number;
    revisionDurationSeconds?: number;
    factoryRegression: boolean;
    watchNotes: string;
  };
};

function proofDir(repoRoot: string): string {
  return path.join(repoRoot, LIVE_PAID_STAGING_PROOF_REL);
}

function writeJson(abs: string, value: unknown): void {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

function probeVideo(absolutePath: string): {
  durationSeconds: number;
  width: number;
  height: number;
  hasAudio: boolean;
} {
  const json = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-show_entries",
      "stream=codec_type,width,height",
      "-of",
      "json",
      absolutePath,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(json) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
  };
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  return {
    durationSeconds: Number(parsed.format?.duration ?? 0),
    width: Number(video?.width ?? 0),
    height: Number(video?.height ?? 0),
    hasAudio: (parsed.streams ?? []).some((stream) => stream.codec_type === "audio"),
  };
}

function extractWatchFrames(inputAbs: string, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputAbs,
      "-vf",
      "fps=1/6,scale=360:-2",
      path.join(outDir, "watch-%02d.jpg"),
    ],
    { stdio: "pipe" },
  );
}

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

function clearedItem(campaignId: string, fileName: string, rel: string) {
  return {
    id: "source-1",
    category: "photo-video" as const,
    requirementLevel: "required" as const,
    reviewStatus: "approved_for_use" as const,
    contentKind: "file-metadata" as const,
    label: "Talking-head",
    reason: "Owner-designated rights-cleared native-vertical source",
    relatedServiceIds: [SKU] as const,
    uploadStatus: "stored" as const,
    fileName,
    url: rel,
    useAuthorization: {
      basis: "customer_owns" as const,
      attestedAt: new Date().toISOString(),
    },
  };
}

export async function runLivePaidFootageStagingPass(input: {
  repoRoot: string;
}): Promise<LivePaidStagingProof> {
  const repoRoot = input.repoRoot;
  applyDotenvLocal(repoRoot);
  const outDir = proofDir(repoRoot);
  mkdirSync(outDir, { recursive: true });

  const offer = getFootageEditingStagingOffer();
  const contract = resolveServiceProductionContract(SKU);
  const stills = resolveServiceProductionContract("v2-rtu-short-video");
  if (contract.status !== "resolved" || stills.status !== "resolved") {
    throw new Error("Production contracts did not resolve.");
  }

  const source = await ensureLiveProofSource({ repoRoot });
  if (!source.ok) {
    throw new Error(source.message);
  }
  const sourceProbe = probeVideo(source.absolutePath);

  const factoryOutAbs = path.join(repoRoot, FACTORY_OUT_REL);
  const snapshotAbs = path.join(outDir, "factory-cert-snapshot.mp4");
  if (existsSync(factoryOutAbs) && !existsSync(snapshotAbs)) {
    copyFileSync(factoryOutAbs, snapshotAbs);
  }

  const campaignId = LIVE_PAID_STAGING_CAMPAIGN_ID;
  const campaign = buildFootageEditingStagingCampaign({
    campaignId,
    ctaText: LIVE_PROOF_SOURCE_META.customerCta,
    videoPurpose:
      "Help a listener understand a real spoken English idea from one talking-head.",
  });
  if (campaign.paymentTruth?.expectedAmountCents !== 34900) {
    throw new Error("Staging price is not $349.");
  }
  await upsertCampaignRecord(campaign, "staging-owner");

  const materialRel = `data/campaign-design-artifacts/${campaignId}/materials/talking-head.mp4`;
  const materialAbs = path.join(repoRoot, materialRel);
  mkdirSync(path.dirname(materialAbs), { recursive: true });
  copyFileSync(source.absolutePath, materialAbs);
  const material = clearedItem(campaignId, "talking-head.mp4", materialRel);
  await writeMaterialsEnvelope({
    campaignId,
    items: [material],
    updatedAt: new Date().toISOString(),
    version: 1,
    syncedAt: new Date().toISOString(),
  });

  const uncleared = mapFootageEditingJobTruthFromJob({
    repoRoot,
    campaign,
    materials: [{ ...material, reviewStatus: "submitted" }],
  });
  const rightsGateClosedWithoutClearance =
    !uncleared.ok && uncleared.code === "UNCLEARED_CUSTOMER_SOURCE";

  const mapped = mapFootageEditingJobTruthFromJob({
    repoRoot,
    campaign,
    materials: [material],
  });
  if (!mapped.ok) {
    throw new Error(`${mapped.code}: ${mapped.message}`);
  }

  const now = new Date().toISOString();
  await writeTasksEnvelope({
    campaignId,
    version: 12,
    planFingerprint: "fp-footage-live-staging",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId: `${campaignId}::${SKU}`,
        campaignId,
        skuId: SKU,
        serviceName: "Short-Form Video Editing",
        spineStatus: "in_production",
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
      },
    ],
  } as ServerTasksEnvelope);

  const record = readyRecord(campaignId);
  const stillsRefuse = await invokeShortVideoDispatchHook({
    repoRoot,
    campaign,
    dispatchRecord: record,
  });

  writeJson(path.join(outDir, "progress.json"), {
    stage: "dispatch-v1",
    campaignId,
    at: new Date().toISOString(),
  });

  const observed = await runLaunchMenuProductionObserver({
    repoRoot,
    campaign,
    dispatch: {
      schemaVersion: 1,
      status: "EXECUTION_IDENTITY_READY",
      evaluatedAt: now,
      lastAttemptAt: new Date().toISOString(),
      activationCheckoutSessionId: campaign.paymentTruth!.checkoutSessionId,
      records: [record],
      ownerActionRequired: false,
    },
  });
  const first = observed.results.find((result) => result.skuId === SKU);
  if (!first?.ok) {
    writeJson(path.join(outDir, "first-dispatch-failure.json"), first ?? observed);
    throw new Error(
      `First paid dispatch failed: ${first?.failureCode ?? "missing"} ${first?.message ?? ""}`,
    );
  }

  const retry = await runLaunchMenuProductionObserver({
    repoRoot,
    campaign,
    dispatch: {
      schemaVersion: 1,
      status: "EXECUTION_IDENTITY_READY",
      evaluatedAt: now,
      lastAttemptAt: new Date().toISOString(),
      activationCheckoutSessionId: campaign.paymentTruth!.checkoutSessionId,
      records: [record],
      ownerActionRequired: false,
    },
  });
  const retried = retry.results.find((result) => result.skuId === SKU);

  const receipt = readFootageEditingHookReceipt({
    repoRoot,
    campaignId,
    dispatchId: record.dispatchId,
  });
  const receiptRel = `${customerArtifactRootRel(campaignId, record.dispatchId)}/footage-editing-hook-receipt.json`;

  const firstSpend = existsSync(path.join(repoRoot, FACTORY_SPEND_REL))
    ? (JSON.parse(readFileSync(path.join(repoRoot, FACTORY_SPEND_REL), "utf8")) as Record<
        string,
        unknown
      >)
    : undefined;
  if (existsSync(factoryOutAbs)) {
    copyFileSync(factoryOutAbs, path.join(outDir, "review-v1.mp4"));
  }
  if (firstSpend) writeJson(path.join(outDir, "spend-v1.json"), firstSpend);

  const withObserver = await upsertCampaignRecord(
    {
      ...campaign,
      dispatchExecution: {
        schemaVersion: 1,
        status: "EXECUTION_IDENTITY_READY",
        evaluatedAt: now,
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: campaign.paymentTruth!.checkoutSessionId,
        records: [record],
        ownerActionRequired: false,
        launchMenuProductionObserver: observed,
      },
      updatedAt: new Date().toISOString(),
    },
    "staging-owner",
  );
  const bound = await ensureFootageEditingMachineReviewBindFromCampaign(
    withObserver.record,
  );
  const afterReview = await import("@/lib/campaign-tasks/store").then((mod) =>
    mod.readTasksEnvelope(campaignId),
  );
  const reviewJob = afterReview?.jobRecords?.find((job) => job.skuId === SKU);
  const reviewProof = reviewJob?.fileRegistry?.find(
    (ref) => ref.category === "review_proof",
  );

  writeJson(path.join(outDir, "progress.json"), {
    stage: "revision",
    campaignId,
    at: new Date().toISOString(),
  });

  if (afterReview && reviewJob) {
    const requested = applyJobSpineStatusChange(
      reviewJob,
      afterReview.jobActivityEvents ?? [],
      {
        job: reviewJob,
        nextStatus: "revision_requested",
        actor: MACHINE_ACTOR,
        reason: "One included meaningful revision — hold the CTA end card longer.",
      },
    );
    await writeTasksEnvelope({
      ...afterReview,
      jobRecords: (afterReview.jobRecords ?? []).map((job) =>
        job.jobId === reviewJob.jobId ? requested.job : job,
      ),
      jobActivityEvents: requested.events,
      updatedAt: new Date().toISOString(),
    });
  }

  const revised = await reproduceFootageEditingAfterRevision({
    repoRoot,
    campaign: bound,
    dispatchRecord: record,
    materials: [material],
  });
  if (!revised.ok) {
    writeJson(path.join(outDir, "revision-failure.json"), revised);
    throw new Error(`${revised.failureCode}: ${revised.message}`);
  }

  const revisionSpend = existsSync(path.join(repoRoot, FACTORY_SPEND_REL))
    ? (JSON.parse(readFileSync(path.join(repoRoot, FACTORY_SPEND_REL), "utf8")) as Record<
        string,
        unknown
      >)
    : undefined;
  if (existsSync(factoryOutAbs)) {
    copyFileSync(factoryOutAbs, path.join(outDir, "review-v2.mp4"));
  }
  if (revisionSpend) writeJson(path.join(outDir, "spend-v2.json"), revisionSpend);

  const afterRevisionObserver = await runLaunchMenuProductionObserver({
    repoRoot,
    campaign: bound,
    dispatch: {
      schemaVersion: 1,
      status: "EXECUTION_IDENTITY_READY",
      evaluatedAt: now,
      lastAttemptAt: new Date().toISOString(),
      activationCheckoutSessionId: campaign.paymentTruth!.checkoutSessionId,
      records: [record],
      ownerActionRequired: false,
    },
  });
  const afterRevisionCampaign = await upsertCampaignRecord(
    {
      ...bound,
      dispatchExecution: {
        schemaVersion: 1,
        status: "EXECUTION_IDENTITY_READY",
        evaluatedAt: now,
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: campaign.paymentTruth!.checkoutSessionId,
        records: [record],
        ownerActionRequired: false,
        launchMenuProductionObserver: afterRevisionObserver,
      },
      updatedAt: new Date().toISOString(),
    },
    "staging-owner",
  );
  await ensureFootageEditingMachineReviewBindFromCampaign(afterRevisionCampaign.record);
  const finalEnvelope = await import("@/lib/campaign-tasks/store").then((mod) =>
    mod.readTasksEnvelope(campaignId),
  );
  const finalJob = finalEnvelope?.jobRecords?.find((job) => job.skuId === SKU);
  const finalProof = finalJob?.fileRegistry
    ?.filter((ref) => ref.category === "review_proof")
    .at(-1);
  const pinHash =
    finalProof?.storageRef.provider === "supabase_storage"
      ? finalProof.storageRef.checksumSha256
      : revised.ok
        ? revised.mp4ContentSha256
        : "";
  const approvedJob = {
    ...(finalJob as PurchasedJobRecord),
    spineStatus: "approved_for_delivery",
    customerApprovedArtifactAuthorization: {
      status: "CUSTOMER_APPROVED",
      contentSha256s: [`sha256:${pinHash}`],
      artifactIds: ["footage-v2"],
      decisionId: "dec-live-staging",
      workVersionId: "wv-live-2",
    },
  } as PurchasedJobRecord;
  const assembled = assembleApprovedClientDelivery({
    job: approvedJob,
    events: finalEnvelope?.jobActivityEvents ?? [],
    actor: MACHINE_ACTOR,
  });

  const reviewAbs = path.join(outDir, "review-v1.mp4");
  const revisionAbs = path.join(outDir, "review-v2.mp4");
  const reviewProbe = existsSync(reviewAbs) ? probeVideo(reviewAbs) : undefined;
  const revisionProbe = existsSync(revisionAbs) ? probeVideo(revisionAbs) : undefined;
  if (reviewAbs && existsSync(reviewAbs)) {
    extractWatchFrames(reviewAbs, path.join(outDir, "frames-v1"));
  }
  if (revisionAbs && existsSync(revisionAbs)) {
    extractWatchFrames(revisionAbs, path.join(outDir, "frames-v2"));
  }

  const factoryRegression =
    !reviewProbe?.hasAudio ||
    !revisionProbe?.hasAudio ||
    (reviewProbe?.durationSeconds ?? 0) < 15 ||
    (reviewProbe?.durationSeconds ?? 0) > 35 ||
    (revisionProbe?.durationSeconds ?? 0) < 15 ||
    (revisionProbe?.durationSeconds ?? 0) > 40 ||
    reviewProbe?.width !== 1080 ||
    reviewProbe?.height !== 1920;

  const proof: LivePaidStagingProof = {
    campaignId,
    skuId: SKU,
    priceCents: offer.priceCents,
    publicLaunchNowPublishedCount:
      studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount,
    publicMenuPublished: false,
    onLaunchNowShelf: false,
    contractTool: contract.contract.primaryTool.toolId,
    stillsTool: stills.contract.primaryTool.toolId,
    stillsHookRefused: !stillsRefuse.ok && stillsRefuse.failureCode === "SKU_NOT_SUPPORTED",
    rightsGateClosedWithoutClearance,
    source: {
      title: LIVE_PROOF_SOURCE_META.title,
      license: LIVE_PROOF_SOURCE_META.license,
      relativePath: source.relativePath,
      durationSeconds: sourceProbe.durationSeconds,
      width: sourceProbe.width,
      height: sourceProbe.height,
      nativeVertical: sourceProbe.height > sourceProbe.width,
    },
    firstDispatch: {
      ok: first.ok,
      outcome: first.invocationOutcome,
      providerRenderId: first.providerRenderId,
      mp4RelativePath: first.mp4RelativePath,
      mp4ContentSha256: first.mp4ContentSha256,
      receiptRelativePath: receiptRel,
    },
    observerRetry: {
      outcome: retried?.invocationOutcome,
      sameHash: retried?.mp4ContentSha256 === first.mp4ContentSha256,
    },
    review: {
      presented: Boolean(reviewProof),
      skuId: reviewJob?.skuId,
      proofCategory: reviewProof?.category,
    },
    revision: {
      ok: revised.ok,
      applyRevision: true,
      outcome: revised.ok ? revised.invocationOutcome : undefined,
      providerRenderId: revised.ok ? revised.providerRenderId : undefined,
    },
    finalDelivery: {
      assembled: assembled.assembled,
      clientVisible: Boolean(
        assembled.job.clientDeliveryFiles?.some((file) => file.visibility === "client_visible"),
      ),
      label: assembled.job.clientDeliveryFiles?.[0]?.deliverableLabel,
    },
    spend: {
      first: firstSpend,
      revision: revisionSpend,
    },
    quality: {
      reviewHasAudio: Boolean(reviewProbe?.hasAudio),
      revisionHasAudio: Boolean(revisionProbe?.hasAudio),
      reviewDurationSeconds: reviewProbe?.durationSeconds,
      revisionDurationSeconds: revisionProbe?.durationSeconds,
      factoryRegression,
      watchNotes:
        "Watch review-v1.mp4 and review-v2.mp4 with sound. Frames are under frames-v1 / frames-v2. A valid MP4 is not a pass.",
    },
  };

  writeJson(path.join(outDir, "proof.json"), {
    ...proof,
    unpublished:
      studioShortFormVideoEditingLaunchIntegrationV1.publicMenuPublished === false &&
      !isRouteMapV2ShelfServiceId(SKU) &&
      !CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS.includes(SKU as never) &&
      !ACTIVE_CUSTOMER_FACING_SKUS.includes(SKU as never),
    receipt,
  });
  writeFileSync(
    path.join(outDir, "REVIEW-PROOF.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>349 live paid staging</title>
<body style="font-family:Georgia,serif;max-width:42rem;margin:2rem auto;padding:0 1rem">
<h1>Live paid staging — Short-Form Video Editing</h1>
<p>SKU <code>${SKU}</code> stays unpublished. Public Launch Now remains 9.</p>
<p>First Review</p>
<video controls src="./review-v1.mp4" style="width:min(360px,100%);aspect-ratio:9/16;background:#000"></video>
<p>Included revision</p>
<video controls src="./review-v2.mp4" style="width:min(360px,100%);aspect-ratio:9/16;background:#000"></video>
<p>Watch both with sound. Confirm the frozen certified service still holds.</p>
</body></html>`,
  );
  writeJson(path.join(outDir, "progress.json"), {
    stage: "complete",
    campaignId,
    at: new Date().toISOString(),
  });
  return proof;
}
