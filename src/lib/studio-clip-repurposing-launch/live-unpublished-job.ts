/**
 * One unpublished $549 Clip Repurposing job through the certified live factory.
 * Does not inject discover/produce. Does not publish.
 */

import { execFileSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  CLIP_REPURPOSING_PRIMARY_TOOL_ID,
  studioClipRepurposingLaunchIntegrationV1,
} from "@/config/studio-clip-repurposing-launch-integration-v1";
import {
  CLIP_REPURPOSING_LIVE_UNPUBLISHED_CAMPAIGN_ID,
  studioClipRepurposingLiveUnpublishedJobV1,
} from "@/config/studio-clip-repurposing-live-unpublished-job-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";
import {
  invokeClipRepurposingDispatchHook,
  readClipRepurposingHookReceipt,
} from "@/lib/studio-dispatch/clip-repurposing-dispatch-hook";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { invokeFootageEditingDispatchHook } from "@/lib/studio-dispatch/footage-editing-dispatch-hook";
import { invokeShortVideoDispatchHook } from "@/lib/studio-dispatch/short-video-dispatch-hook";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { assembleApprovedClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { reproduceClipRepurposingAfterRevision } from "@/lib/studio-review-revision/reproduce-clip-repurposing-after-revision";
import { discoverClipSet } from "@/lib/studio-clip-repurposing/set-discovery";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { evaluateSourceAudioGate } from "@/lib/studio-source-audio-preflight/evaluate";
import { attachSourceAudioAcknowledgement } from "@/lib/studio-source-audio-preflight/acknowledgement";
import { evaluateSourceAudioCheckoutGate } from "@/lib/studio-source-audio-preflight/checkout-gate";
import {
  buildClipRepurposingStagingCampaign,
  getClipRepurposingStagingOffer,
} from "./staging-purchase";

export const LIVE_UNPUBLISHED_PROOF_REL =
  "docs/launch/studio-operating-clip-repurposing-live-unpublished-job-1";

const SKU = CLIP_REPURPOSING_SKU;
const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

function probeVideo(abs: string): {
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
      "stream=width,height,codec_type",
      "-of",
      "json",
      abs,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(json) as {
    format?: { duration?: string };
    streams?: Array<{ width?: number; height?: number; codec_type?: string }>;
  };
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  return {
    durationSeconds: Number(parsed.format?.duration ?? 0),
    width: Number(video?.width ?? 0),
    height: Number(video?.height ?? 0),
    hasAudio: (parsed.streams ?? []).some((stream) => stream.codec_type === "audio"),
  };
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

export async function runClipRepurposingLiveUnpublishedJob(input: {
  repoRoot: string;
}) {
  const repoRoot = input.repoRoot;
  applyDotenvLocal(repoRoot);
  const proofDir = path.join(repoRoot, LIVE_UNPUBLISHED_PROOF_REL);
  mkdirSync(proofDir, { recursive: true });
  const campaignId = CLIP_REPURPOSING_LIVE_UNPUBLISHED_CAMPAIGN_ID;
  const sourceRel = studioClipRepurposingLiveUnpublishedJobV1.designatedSourceRelativePath;
  const sourceAbs = path.join(repoRoot, sourceRel);
  if (!existsSync(sourceAbs)) {
    throw new Error("Designated Clip source is missing.");
  }

  const offer = getClipRepurposingStagingOffer();
  if (offer.priceCents !== 54900) {
    throw new Error("Clip Repurposing $549 offer contract drifted.");
  }

  let campaign = buildClipRepurposingStagingCampaign({
    campaignId,
    ctaText: "Book a Studio conversation",
    videoPurpose:
      "Help a customer hear three distinct ideas from one long talking-head.",
  });
  const material = {
    id: "source-1",
    category: "photo-video" as const,
    requirementLevel: "required" as const,
    reviewStatus: "approved_for_use" as const,
    contentKind: "file-metadata" as const,
    label: "Talking-head",
    reason: "Owner-designated certification-rights-cleared source",
    relatedServiceIds: [SKU] as const,
    uploadStatus: "stored" as const,
    fileName: path.basename(sourceRel),
    url: sourceRel,
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

  const existingEnvelope = await readCampaignEnvelope(campaignId);
  const persistedPreflight = existingEnvelope?.record.sourceAudioPreflight;
  let audioOutcome: "PASS" | "NOTICE_AND_CHOICE" | "REPLACEMENT_REQUIRED" =
    persistedPreflight?.outcome ?? "PASS";
  if (
    persistedPreflight?.outcome === "NOTICE_AND_CHOICE" &&
    persistedPreflight.customerAcknowledgedLimitation &&
    persistedPreflight.proceedWithThisSource
  ) {
    campaign = {
      ...campaign,
      sourceAudioPreflight: persistedPreflight,
    };
  } else {
    const audioGate = evaluateSourceAudioGate({ sourceAbsolutePath: sourceAbs });
    audioOutcome = audioGate.outcome;
    if (audioGate.outcome === "REPLACEMENT_REQUIRED") {
      throw new Error(`Source audio replacement required: ${audioGate.reason}`);
    }
    if (audioGate.outcome === "NOTICE_AND_CHOICE") {
      campaign = attachSourceAudioAcknowledgement({
        campaign,
        skuId: SKU,
        outcome: audioGate.outcome,
        customerNotice: audioGate.reason,
      });
    }
    const checkout = await evaluateSourceAudioCheckoutGate({
      repoRoot,
      campaign,
      selectedServiceIds: [SKU],
    });
    if (!checkout.ok) {
      throw new Error(`Checkout blocked: ${checkout.message}`);
    }
  }
  await upsertCampaignRecord(campaign, "staging-owner");

  const factoryDir = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    campaignId,
    "clip-factory",
  );
  mkdirSync(factoryDir, { recursive: true });
  const transcriptAbs = path.join(factoryDir, "transcript-words.json");
  const certTranscriptAbs = path.join(
    repoRoot,
    "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/positive-transcript-words.json",
  );
  let deepgramReusedFromCert = false;
  if (!existsSync(transcriptAbs) && existsSync(certTranscriptAbs)) {
    copyFileSync(certTranscriptAbs, transcriptAbs);
    deepgramReusedFromCert = true;
  }

  const now = new Date().toISOString();
  await writeTasksEnvelope({
    campaignId,
    version: 12,
    planFingerprint: "fp-clip-live-unpublished",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId: `${campaignId}::${SKU}`,
        campaignId,
        skuId: SKU,
        serviceName: "Clip Repurposing",
        spineStatus: "in_production",
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
      },
    ],
  } as ServerTasksEnvelope);

  const record = readyRecord(campaignId);
  if (record.requirements?.primaryTool.toolId !== CLIP_REPURPOSING_PRIMARY_TOOL_ID) {
    throw new Error("Dispatch is not on clip_repurposing_pipeline.");
  }
  const footageRefuse = await invokeFootageEditingDispatchHook({
    repoRoot,
    campaign,
    dispatchRecord: record,
    materials: [material],
  });
  const stillsRefuse = await invokeShortVideoDispatchHook({
    repoRoot,
    campaign,
    dispatchRecord: record,
  });

  writeJson(path.join(proofDir, "progress.json"), {
    stage: "first-cut",
    resumeAfterHarnessTimeout: true,
    deepgramReusedFromCert,
    at: new Date().toISOString(),
  });

  const first = await invokeClipRepurposingDispatchHook({
    repoRoot,
    campaign,
    dispatchRecord: record,
    materials: [material],
  });
  writeJson(path.join(proofDir, "first-dispatch.json"), first);
  if (!first.ok) {
    throw new Error(`${first.failureCode}: ${first.message}`);
  }

  const retry = await invokeClipRepurposingDispatchHook({
    repoRoot,
    campaign,
    dispatchRecord: record,
    materials: [material],
  });
  writeJson(path.join(proofDir, "retry-dispatch.json"), retry);

  const receipt = readClipRepurposingHookReceipt({
    repoRoot,
    campaignId,
    dispatchId: record.dispatchId,
    lane: "first-cut",
  });

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
        launchMenuProductionObserver: {
          packageId: "STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1",
          observedAt: new Date().toISOString(),
          campaignId,
          results: [
            {
              dispatchId: record.dispatchId,
              skuId: SKU,
              action: "invoked",
              ok: true,
              invocationOutcome: first.invocationOutcome,
              mp4RelativePath: first.mp4RelativePath,
              mp4ContentSha256: first.mp4ContentSha256,
              clipFiles: first.files,
              customerOutcome: first.outcome,
              ownerRoutineProduction: "NONE",
            },
          ],
          ownerRoutineProduction: "NONE",
        },
      },
      updatedAt: new Date().toISOString(),
    },
    "staging-owner",
  );
  await ensureClipRepurposingMachineReviewBindFromCampaign(withObserver.record);

  let revision:
    | { ok: boolean; kind?: string; outcome?: string; message?: string }
    | undefined;
  if (first.outcome.fileCount >= 3) {
    const factoryTranscript = path.join(
      repoRoot,
      "data/campaign-design-artifacts",
      campaignId,
      "clip-factory",
      "transcript-words.json",
    );
    const saved = existsSync(factoryTranscript)
      ? (JSON.parse(readFileSync(factoryTranscript, "utf8")) as {
          durationSeconds: number;
          words: Array<{ start: number; end: number; word: string }>;
        })
      : null;
    if (saved) {
      const { buildTranscriptSentences } = await import(
        "@/lib/studio-short-form-video-editing/sentences"
      );
      const discovered = discoverClipSet({
        sourceDurationSeconds: saved.durationSeconds,
        sentences: buildTranscriptSentences(saved.words as never),
      });
      const remove = discovered.selected[discovered.selected.length - 1];
      const add = discovered.alternates[0];
      if (remove && add) {
        writeJson(path.join(proofDir, "progress.json"), {
          stage: "set-revision",
          at: new Date().toISOString(),
          swap: { removeId: remove.id, addId: add.id },
        });
        const revised = await reproduceClipRepurposingAfterRevision({
          repoRoot,
          campaign,
          dispatchRecord: record,
          materials: [material],
          setRevision: { kind: "swap_clip", removeId: remove.id, addId: add.id },
        });
        revision = {
          ok: revised.ok,
          kind: "swap_clip",
          outcome: revised.ok ? revised.invocationOutcome : undefined,
          message: revised.ok ? undefined : revised.message,
        };
        writeJson(path.join(proofDir, "revision-dispatch.json"), revised);
        if (revised.ok) {
          const envelope = await readTasksEnvelope(campaignId);
          if (envelope?.jobRecords?.[0]) {
            const changed = applyJobSpineStatusChange(
              envelope.jobRecords[0],
              envelope.jobActivityEvents ?? [],
              {
                job: envelope.jobRecords[0],
                nextStatus: "revision_requested",
                actor: MACHINE_ACTOR,
                reason: "One included set revision: swap one clip.",
              },
            );
            await writeTasksEnvelope({
              ...envelope,
              jobRecords: [changed.job],
              jobActivityEvents: changed.events,
            });
            await upsertCampaignRecord(
              {
                ...withObserver.record,
                dispatchExecution: {
                  ...withObserver.record.dispatchExecution!,
                  launchMenuProductionObserver: {
                    ...withObserver.record.dispatchExecution!.launchMenuProductionObserver!,
                    results: [
                      {
                        ...withObserver.record.dispatchExecution!
                          .launchMenuProductionObserver!.results[0]!,
                        clipFiles: revised.files,
                        customerOutcome: revised.outcome,
                        mp4RelativePath: revised.mp4RelativePath,
                        mp4ContentSha256: revised.mp4ContentSha256,
                      },
                    ],
                  },
                },
              },
              "staging-owner",
            );
            const latest = await readCampaignEnvelope(campaignId);
            if (latest?.record) {
              await ensureClipRepurposingMachineReviewBindFromCampaign(latest.record);
            }
          }
        }
      }
    }
  } else if (first.outcome.fileCount > 0) {
    const revised = await reproduceClipRepurposingAfterRevision({
      repoRoot,
      campaign,
      dispatchRecord: record,
      materials: [material],
      setRevision: { kind: "cta_change", ctaText: "Visit The Studio" },
    });
    revision = {
      ok: revised.ok,
      kind: "cta_change",
      outcome: revised.ok ? revised.invocationOutcome : undefined,
      message: revised.ok ? undefined : revised.message,
    };
    writeJson(path.join(proofDir, "revision-dispatch.json"), revised);
  }

  const afterReview = await readTasksEnvelope(campaignId);
  const job = afterReview?.jobRecords?.find((entry) => entry.skuId === SKU);
  const revisionReceipt = readClipRepurposingHookReceipt({
    repoRoot,
    campaignId,
    dispatchId: record.dispatchId,
    lane: "set-revision",
  });
  const currentSet = revisionReceipt?.ok ? revisionReceipt.files ?? [] : first.files;
  const proofs = (job?.fileRegistry ?? []).filter((ref) => ref.category === "review_proof");
  const currentSetHashes = new Set(
    currentSet.map((file) => file.contentSha256.replace(/^sha256:/, "").toLowerCase()),
  );
  const currentProofs = proofs.filter((ref) => {
    const checksum =
      ref.storageRef.provider === "supabase_storage"
        ? ref.storageRef.checksumSha256
        : "";
    return currentSetHashes.has(checksum.replace(/^sha256:/, "").toLowerCase());
  });
  let delivery:
    | { assembled: boolean; fileCount: number; labels: string[] }
    | undefined;
  if (job && first.outcome.fileCount > 0) {
    const approved = {
      ...job,
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED" as const,
        contentSha256s: currentProofs.map(
          (ref) =>
            `sha256:${
              ref.storageRef.provider === "supabase_storage"
                ? ref.storageRef.checksumSha256
                : ""
            }`,
        ),
        artifactIds: ["clip-set-v1"],
        decisionId: "dec-clip-live",
        workVersionId: "wv-clip-1",
      },
    };
    const assembled = assembleApprovedClientDelivery({
      job: approved,
      events: afterReview?.jobActivityEvents ?? [],
      actor: MACHINE_ACTOR,
    });
    delivery = {
      assembled: assembled.assembled,
      fileCount: assembled.job.clientDeliveryFiles?.length ?? 0,
      labels: (assembled.job.clientDeliveryFiles ?? []).map((file) => file.deliverableLabel),
    };
  }

  const quality = first.files.map((file) => {
    const abs = path.join(repoRoot, file.relativePath);
    const probe = existsSync(abs) ? probeVideo(abs) : null;
    return {
      clipId: file.clipId,
      idea: file.idea,
      relativePath: file.relativePath,
      exists: existsSync(abs),
      durationSeconds: probe?.durationSeconds,
      width: probe?.width,
      height: probe?.height,
      hasAudio: probe?.hasAudio ?? false,
    };
  });

  const factorySpendAbs = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    campaignId,
    "clip-factory",
    "factory-spend.json",
  );
  const spend = existsSync(factorySpendAbs)
    ? JSON.parse(readFileSync(factorySpendAbs, "utf8"))
    : null;

  const proof = {
    packageId: studioClipRepurposingLiveUnpublishedJobV1.packageId,
    campaignId,
    skuId: SKU,
    offerPriceCents: offer.priceCents,
    publicLaunchNowPublishedCount:
      studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount,
    publicMenuPublished: studioClipRepurposingLaunchIntegrationV1.publicMenuPublished,
    primaryToolId: CLIP_REPURPOSING_PRIMARY_TOOL_ID,
    footageHookRefused: !footageRefuse.ok,
    stillsHookRefused: !stillsRefuse.ok,
    source: {
      relativePath: sourceRel,
      designated: true,
      durationSeconds: studioClipRepurposingLiveUnpublishedJobV1.designatedSourceSeconds,
      soldFloorSeconds: studioClipRepurposingLiveUnpublishedJobV1.soldMinimumSeconds,
      designatedSourceBelowSoldFloor:
        studioClipRepurposingLiveUnpublishedJobV1.designatedSourceBelowSoldFloor,
      audioOutcome,
      deepgramReusedFromCert,
    },
    outcome: first.outcome,
    firstDispatch: {
      ok: first.ok,
      invocationOutcome: first.invocationOutcome,
      fileCount: first.files.length,
    },
    idempotency: {
      retryOutcome: retry.ok ? retry.invocationOutcome : retry.failureCode,
      sameFileCount: retry.ok && retry.files.length === first.files.length,
      noDuplicatePurchase: retry.ok && retry.invocationOutcome === "ALREADY_RENDERED",
    },
    receipt,
    review: {
      proofCount: proofs.length,
      skuId: job?.skuId,
    },
    revision,
    finalDelivery: delivery,
    quality,
    spend,
  };
  writeJson(path.join(proofDir, "proof.json"), proof);
  writeJson(path.join(proofDir, "progress.json"), {
    stage: "done",
    at: new Date().toISOString(),
  });
  return proof;
}
