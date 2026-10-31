/**
 * Paid Machine invoke for v2-rtu-short-form-video-edit.
 * Calls the frozen footage factory. Does not call the $149 stills hook.
 */

import { createHash } from "crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import {
  FOOTAGE_EDITING_PRIMARY_TOOL_ID,
  STUDIO_SHORT_FORM_VIDEO_EDITING_LAUNCH_INTEGRATION_PACKAGE_ID,
} from "@/config/studio-short-form-video-editing-launch-integration-v1";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import {
  runFootageEditingPipeline,
  type FootagePipelineResult,
} from "@/lib/studio-short-form-video-editing/footage-pipeline";
import {
  prepareCustomerSourceAudio,
  readSourceAudioAcknowledgement,
  sourceAudioWorkDirectory,
} from "@/lib/studio-source-audio-preflight";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapFootageEditingJobTruthFromJob } from "./map-footage-editing-job-truth";
import type { JobDispatchRecord } from "./types";

export const FOOTAGE_EDITING_DISPATCH_HOOK_PACKAGE_ID =
  STUDIO_SHORT_FORM_VIDEO_EDITING_LAUNCH_INTEGRATION_PACKAGE_ID;

export type FootageEditingReceiptLane = "first-cut" | "revision";

export type FootageEditingHookReceipt = {
  ok?: boolean;
  skuId?: typeof SHORT_FORM_VIDEO_EDITING_SKU;
  lane?: FootageEditingReceiptLane;
  mp4RelativePath?: string;
  mp4ContentSha256?: string;
  providerRenderId?: string;
  durationSeconds?: number;
  intakeFingerprint?: string;
};

export type FootageEditingDispatchHookResult =
  | {
      ok: true;
      packageId: typeof FOOTAGE_EDITING_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: "RENDERED" | "ALREADY_RENDERED";
      dispatchId: string;
      skuId: typeof SHORT_FORM_VIDEO_EDITING_SKU;
      mp4RelativePath: string;
      mp4ContentSha256: string;
      providerRenderId?: string;
      attempts: number;
      ownerRoutineProduction: "NONE";
    }
  | {
      ok: false;
      packageId: typeof FOOTAGE_EDITING_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      attempts?: number;
      providerRenderId?: string;
      ownerRoutineProduction: "NONE";
    };

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function receiptFileName(lane: FootageEditingReceiptLane): string {
  return lane === "revision"
    ? "footage-editing-revision-hook-receipt.json"
    : "footage-editing-hook-receipt.json";
}

export function footageEditingDurableMp4Rel(
  campaignId: string,
  dispatchId: string,
  lane: FootageEditingReceiptLane = "first-cut",
): string {
  const root = customerArtifactRootRel(campaignId, dispatchId);
  const file =
    lane === "revision" ? "footage-revision-cut.mp4" : "footage-first-cut.mp4";
  return `${root}/${file}`.replace(/\\/g, "/");
}

function sealFootageMp4UnderArtifactRoot(input: {
  repoRoot: string;
  campaignId: string;
  dispatchId: string;
  lane: FootageEditingReceiptLane;
  producedRelativePath: string;
}): string {
  const sourceAbs = path.join(input.repoRoot, input.producedRelativePath);
  const durableRel = footageEditingDurableMp4Rel(
    input.campaignId,
    input.dispatchId,
    input.lane,
  );
  const durableAbs = path.join(input.repoRoot, durableRel);
  mkdirSync(path.dirname(durableAbs), { recursive: true });
  copyFileSync(sourceAbs, durableAbs);
  return durableRel;
}

function receiptPath(
  repoRoot: string,
  campaignId: string,
  dispatchId: string,
  lane: FootageEditingReceiptLane = "first-cut",
): string {
  return path.join(
    repoRoot,
    customerArtifactRootRel(campaignId, dispatchId),
    receiptFileName(lane),
  );
}

export function footageEditingReceiptLane(
  applyRevision?: boolean,
): FootageEditingReceiptLane {
  return applyRevision ? "revision" : "first-cut";
}

export function readFootageEditingHookReceipt(input: {
  repoRoot?: string;
  campaignId: string;
  dispatchId: string;
  lane?: FootageEditingReceiptLane;
}): FootageEditingHookReceipt | null {
  const lane = input.lane ?? "first-cut";
  const abs = receiptPath(
    input.repoRoot ?? process.cwd(),
    input.campaignId,
    input.dispatchId,
    lane,
  );
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as FootageEditingHookReceipt;
  } catch {
    return null;
  }
}

export async function invokeFootageEditingDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials?: readonly CampaignMaterialItem[];
  runPipeline?: typeof runFootageEditingPipeline;
  applyRevision?: boolean;
}): Promise<FootageEditingDispatchHookResult> {
  const record = input.dispatchRecord;
  const meta = {
    packageId: FOOTAGE_EDITING_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
  };
  if (record.skuId !== SHORT_FORM_VIDEO_EDITING_SKU) {
    return {
      ok: false,
      ...meta,
      failureCode: "SKU_NOT_SUPPORTED",
      message: "Footage-editing hook only produces v2-rtu-short-form-video-edit.",
    };
  }
  if (record.requirements?.primaryTool.toolId !== FOOTAGE_EDITING_PRIMARY_TOOL_ID) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      failureCode: "PRIMARY_TOOL_NOT_FOOTAGE_FACTORY",
      message: "This lane requires the frozen footage-editing factory, not the stills Shotstack hook.",
    };
  }

  const materials =
    input.materials ??
    (await readMaterialsEnvelope(input.campaign.campaignId))?.items ??
    [];
  const truth = mapFootageEditingJobTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    materials,
  });
  if (!truth.ok) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      failureCode: truth.code,
      message: truth.message,
    };
  }

  if (truth.currentDoor) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      failureCode: "SHORT_FORM_SET_PRODUCTION_HELD",
      message:
        "Short-Form Video Editing is represented as the purchased set. Production was not started.",
      attempts: 0,
    };
  }

  const intakeFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        ctaText: truth.intake.ctaText,
        mustKeepLine: truth.intake.mustKeepLine ?? "",
        source: truth.sourceRelativePath,
        applyRevision: Boolean(input.applyRevision),
      }),
    )
    .digest("hex")
    .slice(0, 16);

  const lane = footageEditingReceiptLane(input.applyRevision);
  const receiptAbs = receiptPath(
    input.repoRoot,
    input.campaign.campaignId,
    record.dispatchId,
    lane,
  );
  const existing = existsSync(receiptAbs)
    ? (JSON.parse(readFileSync(receiptAbs, "utf8")) as FootageEditingHookReceipt)
    : null;
  if (
    existing?.ok &&
    existing.intakeFingerprint === intakeFingerprint &&
    existing.mp4RelativePath &&
    existsSync(path.join(input.repoRoot, existing.mp4RelativePath))
  ) {
    return {
      ok: true,
      ...meta,
      invocationOutcome: "ALREADY_RENDERED",
      dispatchId: record.dispatchId,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      mp4RelativePath: existing.mp4RelativePath,
      mp4ContentSha256: existing.mp4ContentSha256 ?? "",
      providerRenderId: existing.providerRenderId,
      attempts: 0,
    };
  }

  const prepared = prepareCustomerSourceAudio({
    repoRoot: input.repoRoot,
    sourceAbsolutePath: truth.sourceAbsolutePath,
    sourceRelativePath: truth.sourceRelativePath,
    acknowledgement: readSourceAudioAcknowledgement(input.campaign),
    workDirectory: sourceAudioWorkDirectory(
      input.repoRoot,
      input.campaign.campaignId,
    ),
  });
  if (!prepared.ok) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      failureCode: prepared.failureCode,
      message: prepared.message,
      attempts: 0,
    };
  }
  if (input.campaign.sourceAudioPreflight) {
    input.campaign.sourceAudioPreflight = {
      ...input.campaign.sourceAudioPreflight,
      selectedSourceRelativePath: prepared.sourceRelativePath,
      cleanupPassesAttempted: prepared.cleanupPassesAttempted,
      cleanupKept: prepared.cleanupKept,
      revertedToOriginal: prepared.revertedToOriginal,
    };
  }

  const pipeline = input.runPipeline ?? runFootageEditingPipeline;
  const produced: FootagePipelineResult = await pipeline({
    repoRoot: input.repoRoot,
    sourceAbsolutePath: prepared.sourceAbsolutePath,
    sourceRelativePath: prepared.sourceRelativePath,
    intake: truth.intake,
    applyRevision: input.applyRevision,
    dryRun: false,
  });
  if (!produced.ok) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      failureCode: produced.verdict,
      message: produced.message,
      providerRenderId: produced.providerRenderId,
      attempts: 1,
    };
  }

  const durableRelativePath = sealFootageMp4UnderArtifactRoot({
    repoRoot: input.repoRoot,
    campaignId: input.campaign.campaignId,
    dispatchId: record.dispatchId,
    lane,
    producedRelativePath: produced.outputRelativePath,
  });
  const mp4Abs = path.join(input.repoRoot, durableRelativePath);
  const mp4ContentSha256 = existsSync(mp4Abs) ? sha256File(mp4Abs) : "";
  mkdirSync(path.dirname(receiptAbs), { recursive: true });
  const receipt: FootageEditingHookReceipt = {
    ok: true,
    skuId: SHORT_FORM_VIDEO_EDITING_SKU,
    lane,
    mp4RelativePath: durableRelativePath,
    mp4ContentSha256,
    providerRenderId: produced.providerRenderId,
    durationSeconds: produced.edl.outputDurationSeconds,
    intakeFingerprint,
  };
  writeFileSync(receiptAbs, `${JSON.stringify(receipt, null, 2)}\n`);

  return {
    ok: true,
    ...meta,
    invocationOutcome: "RENDERED",
    dispatchId: record.dispatchId,
    skuId: SHORT_FORM_VIDEO_EDITING_SKU,
    mp4RelativePath: durableRelativePath,
    mp4ContentSha256,
    providerRenderId: produced.providerRenderId,
    attempts: 1,
  };
}
