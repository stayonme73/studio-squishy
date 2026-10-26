/**
 * STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1
 * Paid Machine invoke for v2-rtu-short-video via Shotstack adapter.
 * Scripts/work packets are not the customer production mechanism.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { studioLaunchMenuProductionRuntimeV1 } from "@/config/studio-launch-menu-production-runtime-v1";
import { shortVideoCaptionsPreserveApprovedWords } from "@/lib/studio-design-renderer/short-video-exact-facts";
import type { CampaignRecord } from "@/config/studio-board";
import {
  runShotstackWorkPacketPipeline,
  type ShotstackFetch,
  type ShotstackWorkPacket,
} from "@/lib/studio-kitchen-production/video-integration";
import {
  defaultVideoQualityBrief,
  evaluateVideoQuality,
  fullVideoPassAttestations,
  viewingNotesForHash,
  type VideoQualityEvidence,
} from "@/lib/studio-kitchen-production/video-production";

import { readMaterialsEnvelope } from "@/lib/materials/store";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapShortVideoProjectTruthFromJob } from "./map-short-video-job-truth";
import { disposableSpCertBillableHookRefusal } from "@/lib/studio-payment/disposable-test-isolation-guards";
import type { JobDispatchRecord } from "./types";

export const SHORT_VIDEO_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-SHORT-VIDEO-DISPATCH-HOOK-1" as const;

export type ShortVideoDispatchHookResult =
  | {
      ok: true;
      packageId: typeof SHORT_VIDEO_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: "RENDERED" | "ALREADY_RENDERED";
      dispatchId: string;
      skuId: "v2-rtu-short-video";
      mp4RelativePath: string;
      mp4ContentSha256: string;
      providerRenderId?: string;
      durationSeconds?: number;
      credits?: number;
      attempts: number;
      evidence: VideoQualityEvidence;
      ownerRoutineProduction: "NONE";
    }
  | {
      ok: false;
      packageId: typeof SHORT_VIDEO_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      attempts?: number;
      providerRenderId?: string;
      ownerRoutineProduction: "NONE";
      ownerEscalationRequired?: boolean;
    };

export type ShortVideoHookReceipt = {
  ok?: boolean;
  scriptVersionId?: string;
  mp4RelativePath?: string;
  mp4ContentSha256?: string;
  providerRenderId?: string;
  durationSeconds?: number;
  credits?: number;
  evidence?: VideoQualityEvidence;
};

function baseMeta() {
  return {
    packageId: SHORT_VIDEO_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
  };
}

function splitCaptions(onScreenText: string): { captions: string[]; cta: string } {
  const parts = onScreenText
    .split(/[.\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { captions: [onScreenText.trim()], cta: onScreenText.trim() };
  }
  const cta = parts[parts.length - 1] ?? onScreenText.trim();
  return { captions: parts.slice(0, 4), cta };
}

function buildPacket(input: {
  campaignId: string;
  dispatchId: string;
  stills: readonly string[];
  onScreenText: string;
  exportRelativePath: string;
}): ShotstackWorkPacket {
  const { captions, cta } = splitCaptions(input.onScreenText);
  const sceneCount = Math.max(1, Math.min(4, input.stills.length));
  const slice = 18 / sceneCount;
  const scenes = Array.from({ length: sceneCount }, (_, index) => {
    const start = Number((index * slice).toFixed(3));
    const end = Number(((index + 1) * slice).toFixed(3));
    const isLast = index === sceneCount - 1;
    return {
      sceneNumber: index + 1,
      assetId: `still-${index + 1}`,
      relativePath: input.stills[Math.min(index, input.stills.length - 1)]!,
      startSeconds: start,
      endSeconds: isLast ? 18 : end,
      caption: isLast ? cta : captions[Math.min(index, captions.length - 1)] ?? cta,
      captionPresentation: "overlay" as const,
    };
  });
  return {
    workPacketId: `wp:${input.dispatchId}`,
    workPacketVersion: "machine-runtime-1",
    storyboardVersion: "machine-stills-1",
    scriptVersionId: createHash("sha256").update(input.onScreenText).digest("hex").slice(0, 16),
    campaignId: input.campaignId,
    skuId: "v2-rtu-short-video",
    label: "Machine stills short video",
    durationMinSeconds: 15,
    durationMaxSeconds: 30,
    durationTargetSeconds: 18,
    aspectRatio: "vertical",
    width: 1080,
    height: 1920,
    exportFormat: "mp4",
    musicAllowed: false,
    stockAllowed: false,
    productionMethod: "shotstack",
    productionRoleOwner: "creative_production",
    audioMode: "captions_only",
    exportRelativePath: input.exportRelativePath,
    ctaCaptionSceneNumber: sceneCount,
    primaryCtaText: cta,
    scenes,
    ownerEscalation: "owner_not_required",
  };
}

export async function invokeShortVideoDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials?: readonly import("@/lib/materials/types").CampaignMaterialItem[];
  fetchImpl?: ShotstackFetch;
  apiKey?: string;
  assetUrlsOverride?: Map<string, string>;
  pollMaxAttempts?: number;
  pollDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}): Promise<ShortVideoDispatchHookResult> {
  const billableRefusal = disposableSpCertBillableHookRefusal(input.campaign);
  if (billableRefusal.blocked) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: input.dispatchRecord.dispatchId,
      skuId: input.dispatchRecord.skuId,
      failureCode: billableRefusal.failureCode,
      message: billableRefusal.message,
    };
  }
  const record = input.dispatchRecord;
  if (record.skuId !== "v2-rtu-short-video") {
    return {
      ok: false,
      ...baseMeta(),
      failureCode: "SKU_NOT_SUPPORTED",
      message: "Short-video hook only produces v2-rtu-short-video.",
    };
  }
  if (record.requirements?.primaryTool.toolId !== "shotstack") {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: "v2-rtu-short-video",
      failureCode: "PRIMARY_TOOL_NOT_SHOTSTACK",
      message: "Short-video hook requires Shotstack as the production capability.",
    };
  }

  const materials =
    input.materials ??
    (await readMaterialsEnvelope(input.campaign.campaignId))?.items ??
    [];
  const mapped = mapShortVideoProjectTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    materials,
  });
  if (!mapped.ok) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: "v2-rtu-short-video",
      failureCode: mapped.code,
      message: mapped.message,
    };
  }

  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );
  const receiptRel = `${artifactRootRel}/short-video-hook-receipt.json`;
  const receiptAbs = path.join(input.repoRoot, receiptRel);
  const scriptVersionId = createHash("sha256")
    .update(mapped.onScreenText)
    .digest("hex")
    .slice(0, 16);
  if (existsSync(receiptAbs)) {
    try {
      const prior = JSON.parse(readFileSync(receiptAbs, "utf8")) as ShortVideoHookReceipt;
      if (
        prior.ok &&
        prior.scriptVersionId === scriptVersionId &&
        prior.evidence?.gatePassed &&
        prior.mp4RelativePath
      ) {
        return {
          ok: true,
          ...baseMeta(),
          invocationOutcome: "ALREADY_RENDERED",
          dispatchId: record.dispatchId,
          skuId: "v2-rtu-short-video",
          mp4RelativePath: prior.mp4RelativePath,
          mp4ContentSha256: prior.mp4ContentSha256 ?? "",
          providerRenderId: prior.providerRenderId,
          durationSeconds: prior.durationSeconds,
          credits: prior.credits,
          attempts: 0,
          evidence: prior.evidence,
        };
      }
    } catch {
      /* remint */
    }
  }

  const exportRelativePath = `${artifactRootRel}/renders/v1/short-video.mp4`;
  const packet = buildPacket({
    campaignId: input.campaign.campaignId,
    dispatchId: record.dispatchId,
    stills: mapped.stillRelativePaths,
    onScreenText: mapped.onScreenText,
    exportRelativePath,
  });

  const { captions, cta } = splitCaptions(mapped.onScreenText);
  if (
    !shortVideoCaptionsPreserveApprovedWords({
      approvedOnScreenText: mapped.onScreenText,
      captions,
      cta,
    })
  ) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: "v2-rtu-short-video",
      failureCode: "CAPTION_FACT_FAILURE",
      message:
        "On-screen captions must use the customer’s approved exact words. The Studio does not invent facts.",
      ownerEscalationRequired: false,
    };
  }

  const budgets = studioLaunchMenuProductionRuntimeV1.internalBudgets;
  let lastMessage = "Short video production failed.";
  let creativeAttempts = 0;
  for (let attempt = 1; attempt <= budgets.videoTransportAttempts; attempt += 1) {
    const pipeline = await runShotstackWorkPacketPipeline({
      repoRoot: input.repoRoot,
      packet,
      apiKey: input.apiKey,
      fetchImpl: input.fetchImpl,
      assetUrlsOverride: input.assetUrlsOverride,
      pollMaxAttempts: input.pollMaxAttempts,
      pollDelayMs: input.pollDelayMs,
      sleepFn: input.sleepFn,
    });
    if (!pipeline.ok) {
      lastMessage = pipeline.message;
      // Full-pipeline retry is only safe before a Shotstack render id exists.
      // Poll / timeout / failed-render / download retry lives inside the client.
      const resubmitSafe =
        pipeline.verdict === "SUBMIT_FAILED" ||
        pipeline.verdict === "INGEST_FAILED";
      if (pipeline.verdict === "CREDENTIALS_BLOCKED") {
        return {
          ok: false,
          ...baseMeta(),
          dispatchId: record.dispatchId,
          skuId: "v2-rtu-short-video",
          failureCode: pipeline.verdict,
          message: pipeline.message,
          attempts: attempt,
          ownerEscalationRequired: false,
        };
      }
      if (!resubmitSafe || attempt >= budgets.videoTransportAttempts) {
        return {
          ok: false,
          ...baseMeta(),
          dispatchId: record.dispatchId,
          skuId: "v2-rtu-short-video",
          failureCode: pipeline.verdict,
          message: pipeline.message,
          attempts: attempt,
          providerRenderId: pipeline.job?.providerRenderId,
          ownerEscalationRequired: false,
        };
      }
      continue;
    }

    const brief = defaultVideoQualityBrief(
      "v2-rtu-short-video",
      input.campaign.campaignId,
      packet.scriptVersionId,
    );
    brief.assemblyCapability = "present_and_usable";
    brief.artifactRepoRoot = input.repoRoot;
    brief.requireVoiceArtifact = false;
    brief.musicUsed = false;
    const evaluation = evaluateVideoQuality({
      brief,
      submission: {
        scriptVersionId: packet.scriptVersionId,
        campaignId: input.campaign.campaignId,
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_photos",
        claimsStudioAssembledVideo: true,
        renderState: "render_completed",
        artifacts: [
          {
            id: "short-video-v1",
            relativePath: pipeline.artifact.relativePath,
            extension: "mp4",
            contentSha256: pipeline.artifact.sha256,
            byteLength: pipeline.artifact.byteLength,
            scriptVersionId: packet.scriptVersionId,
            campaignId: input.campaign.campaignId,
            skuId: "v2-rtu-short-video",
            declaredDurationSeconds: pipeline.artifact.durationSeconds,
            declaredWidth: pipeline.artifact.width,
            declaredHeight: pipeline.artifact.height,
            declaredAspectRatio: "vertical",
            productionMethod: "shotstack",
            sourceAssetRefs: mapped.stillRelativePaths,
          },
        ],
      },
    });
    const attestations = fullVideoPassAttestations(
      viewingNotesForHash(
        pipeline.artifact.sha256,
        "Machine Shotstack stills assembly. Captions taken from customer on-screen text. No invented footage.",
      ),
    );
    const evidence: VideoQualityEvidence = {
      evaluation,
      attestations,
      gatePassed: evaluation.ok,
    };
    mkdirSync(path.dirname(receiptAbs), { recursive: true });
    writeFileSync(
      receiptAbs,
      `${JSON.stringify(
        {
          ok: evaluation.ok,
          scriptVersionId: packet.scriptVersionId,
          mp4RelativePath: pipeline.artifact.relativePath,
          mp4ContentSha256: pipeline.artifact.sha256,
          providerRenderId: pipeline.job.providerRenderId,
          durationSeconds: pipeline.artifact.durationSeconds,
          credits: pipeline.job.credits,
          evidence,
        } satisfies ShortVideoHookReceipt,
        null,
        2,
      )}\n`,
      "utf8",
    );
    if (!evaluation.ok) {
      creativeAttempts += 1;
      if (creativeAttempts >= budgets.videoCreativeAttempts) {
        return {
          ok: false,
          ...baseMeta(),
          dispatchId: record.dispatchId,
          skuId: "v2-rtu-short-video",
          failureCode: "VIDEO_QA_FAILURE",
          message: evaluation.summary,
          attempts: attempt,
          providerRenderId: pipeline.job.providerRenderId,
          ownerEscalationRequired: false,
        };
      }
      lastMessage = evaluation.summary;
      continue;
    }
    return {
      ok: true,
      ...baseMeta(),
      invocationOutcome: "RENDERED",
      dispatchId: record.dispatchId,
      skuId: "v2-rtu-short-video",
      mp4RelativePath: pipeline.artifact.relativePath,
      mp4ContentSha256: pipeline.artifact.sha256,
      providerRenderId: pipeline.job.providerRenderId,
      durationSeconds: pipeline.artifact.durationSeconds,
      credits: pipeline.job.credits,
      attempts: attempt,
      evidence,
    };
  }

  return {
    ok: false,
    ...baseMeta(),
    dispatchId: record.dispatchId,
    skuId: "v2-rtu-short-video",
    failureCode: "VIDEO_TRANSPORT_EXHAUSTED",
    message: lastMessage,
    attempts: budgets.videoTransportAttempts,
    ownerEscalationRequired: false,
  };
}
