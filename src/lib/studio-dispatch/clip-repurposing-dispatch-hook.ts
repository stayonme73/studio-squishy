/**
 * Paid Machine invoke for v2-rtu-clip-repurposing.
 * Dedicated set lane. Does not call the $349 footage hook or the $149 stills hook.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  CLIP_REPURPOSING_PRIMARY_TOOL_ID,
  STUDIO_CLIP_REPURPOSING_STAGING_JOURNEY_PACKAGE_ID,
} from "@/config/studio-clip-repurposing-launch-integration-v1";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { prepareClipRepurposingSourceAudio } from "@/lib/studio-clip-repurposing/source-audio-preflight";
import {
  runClipRepurposingCustomerPipeline,
  type ClipCustomerPipelineInput,
  type ClipProducedFile,
} from "@/lib/studio-clip-repurposing/customer-pipeline";
import type { ClipCustomerOutcome } from "@/lib/studio-clip-repurposing/customer-outcome";
import { prepareCertifiedClipRepurposingFactory } from "@/lib/studio-clip-repurposing/live-factory";
import type { LongSourceSentences, SetRevision } from "@/lib/studio-clip-repurposing/types";
import {
  customerAcknowledgedSourceLimitation,
  readSourceAudioAcknowledgement,
  sourceAudioWorkDirectory,
} from "@/lib/studio-source-audio-preflight";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapClipRepurposingJobTruthFromJob } from "./map-clip-repurposing-job-truth";
import type { JobDispatchRecord } from "./types";

export const CLIP_REPURPOSING_DISPATCH_HOOK_PACKAGE_ID =
  STUDIO_CLIP_REPURPOSING_STAGING_JOURNEY_PACKAGE_ID;

export type ClipRepurposingReceiptLane = "first-cut" | "set-revision";

export type ClipRepurposingHookReceipt = {
  ok?: boolean;
  skuId?: typeof CLIP_REPURPOSING_SKU;
  lane?: ClipRepurposingReceiptLane;
  intakeFingerprint?: string;
  outcome?: ClipCustomerOutcome;
  files?: readonly ClipProducedFile[];
};

export type ClipRepurposingDispatchHookResult =
  | {
      ok: true;
      packageId: typeof CLIP_REPURPOSING_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: "RENDERED" | "ALREADY_RENDERED" | "CUSTOMER_REMEDY";
      dispatchId: string;
      skuId: typeof CLIP_REPURPOSING_SKU;
      outcome: ClipCustomerOutcome;
      files: readonly ClipProducedFile[];
      mp4RelativePath?: string;
      mp4ContentSha256?: string;
      attempts: number;
      ownerRoutineProduction: "NONE";
    }
  | {
      ok: false;
      packageId: typeof CLIP_REPURPOSING_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      attempts?: number;
      ownerRoutineProduction: "NONE";
    };

function receiptFileName(lane: ClipRepurposingReceiptLane): string {
  return lane === "set-revision"
    ? "clip-repurposing-revision-hook-receipt.json"
    : "clip-repurposing-hook-receipt.json";
}

function receiptPath(
  repoRoot: string,
  campaignId: string,
  dispatchId: string,
  lane: ClipRepurposingReceiptLane = "first-cut",
): string {
  return path.join(
    repoRoot,
    customerArtifactRootRel(campaignId, dispatchId),
    receiptFileName(lane),
  );
}

export function clipRepurposingReceiptLane(
  applyRevision?: boolean,
): ClipRepurposingReceiptLane {
  return applyRevision ? "set-revision" : "first-cut";
}

export function readClipRepurposingHookReceipt(input: {
  repoRoot?: string;
  campaignId: string;
  dispatchId: string;
  lane?: ClipRepurposingReceiptLane;
}): ClipRepurposingHookReceipt | null {
  const lane = input.lane ?? "first-cut";
  const abs = receiptPath(
    input.repoRoot ?? process.cwd(),
    input.campaignId,
    input.dispatchId,
    lane,
  );
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as ClipRepurposingHookReceipt;
  } catch {
    return null;
  }
}

export async function invokeClipRepurposingDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials?: readonly CampaignMaterialItem[];
  sourceDurationSeconds?: number;
  sentences?: LongSourceSentences["sentences"];
  discover?: ClipCustomerPipelineInput["discover"];
  produce?: ClipCustomerPipelineInput["produce"];
  applyRevision?: boolean;
  setRevision?: SetRevision;
}): Promise<ClipRepurposingDispatchHookResult> {
  const record = input.dispatchRecord;
  const meta = {
    packageId: CLIP_REPURPOSING_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
  };
  if (record.skuId !== CLIP_REPURPOSING_SKU) {
    return {
      ok: false,
      ...meta,
      failureCode: "SKU_NOT_SUPPORTED",
      message: "Clip Repurposing hook only produces v2-rtu-clip-repurposing.",
    };
  }
  if (record.requirements?.primaryTool.toolId !== CLIP_REPURPOSING_PRIMARY_TOOL_ID) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: CLIP_REPURPOSING_SKU,
      failureCode: "PRIMARY_TOOL_NOT_CLIP_FACTORY",
      message:
        "This lane requires the frozen Clip Repurposing factory, not the $349 footage hook or the $149 stills hook.",
    };
  }

  const materials =
    input.materials ??
    (await readMaterialsEnvelope(input.campaign.campaignId))?.items ??
    [];
  const truth = mapClipRepurposingJobTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    materials,
  });
  if (!truth.ok) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: CLIP_REPURPOSING_SKU,
      failureCode: truth.code,
      message: truth.message,
    };
  }

  const acknowledgement = readSourceAudioAcknowledgement(input.campaign);
  const priorDecisionAbs = path.join(
    sourceAudioWorkDirectory(input.repoRoot, input.campaign.campaignId),
    "decision.json",
  );
  const priorDecision = existsSync(priorDecisionAbs)
    ? (JSON.parse(readFileSync(priorDecisionAbs, "utf8")) as {
        outcome?: string;
        selectedSourceRelativePath?: string;
        cleanupPassesAttempted?: number;
        cleanupKept?: boolean;
        revertedToOriginal?: boolean;
      })
    : null;
  const priorSelectedAbs = priorDecision?.selectedSourceRelativePath
    ? path.join(input.repoRoot, priorDecision.selectedSourceRelativePath)
    : "";
  const priorReusable =
    Boolean(priorDecision?.selectedSourceRelativePath) &&
    existsSync(priorSelectedAbs) &&
    priorDecision?.outcome !== "REPLACEMENT_REQUIRED" &&
    (priorDecision?.outcome !== "NOTICE_AND_CHOICE" ||
      customerAcknowledgedSourceLimitation(acknowledgement, "NOTICE_AND_CHOICE"));
  const prepared =
    priorReusable && priorDecision && priorDecision.selectedSourceRelativePath
      ? {
          ok: true as const,
          outcome: (priorDecision.outcome ?? "PASS") as
            | "PASS"
            | "NOTICE_AND_CHOICE"
            | "REPLACEMENT_REQUIRED",
          sourceAbsolutePath: priorSelectedAbs,
          sourceRelativePath: priorDecision.selectedSourceRelativePath,
          cleanupPassesAttempted: priorDecision.cleanupPassesAttempted ?? 0,
          cleanupKept: Boolean(priorDecision.cleanupKept),
          revertedToOriginal: Boolean(priorDecision.revertedToOriginal),
        }
      : prepareClipRepurposingSourceAudio({
          repoRoot: input.repoRoot,
          campaignId: input.campaign.campaignId,
          sourceAbsolutePath: truth.sourceAbsolutePath,
          sourceRelativePath: truth.sourceRelativePath,
          acknowledgement,
        });
  if (!prepared.ok) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: CLIP_REPURPOSING_SKU,
      failureCode: prepared.failureCode,
      message: prepared.message,
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
        setRevision: input.setRevision ?? null,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  const lane = clipRepurposingReceiptLane(input.applyRevision);
  const receiptAbs = receiptPath(
    input.repoRoot,
    input.campaign.campaignId,
    record.dispatchId,
    lane,
  );
  const existing = existsSync(receiptAbs)
    ? (JSON.parse(readFileSync(receiptAbs, "utf8")) as ClipRepurposingHookReceipt)
    : null;
  if (existing?.ok && existing.intakeFingerprint === intakeFingerprint && existing.outcome) {
    const files = existing.files ?? [];
    return {
      ok: true,
      ...meta,
      invocationOutcome:
        existing.outcome.fileCount === 0 ? "CUSTOMER_REMEDY" : "ALREADY_RENDERED",
      dispatchId: record.dispatchId,
      skuId: CLIP_REPURPOSING_SKU,
      outcome: existing.outcome,
      files,
      mp4RelativePath: files[0]?.relativePath,
      mp4ContentSha256: files[0]?.contentSha256,
      attempts: 0,
    };
  }

  let sourceDurationSeconds = input.sourceDurationSeconds;
  let sentences = input.sentences;
  let discover = input.discover;
  let produce = input.produce;
  let skipDurationGate = false;

  if (sourceDurationSeconds == null || !sentences || !produce) {
    const live = await prepareCertifiedClipRepurposingFactory({
      repoRoot: input.repoRoot,
      campaignId: input.campaign.campaignId,
      sourceAbsolutePath: prepared.sourceAbsolutePath,
      sourceRelativePath: prepared.sourceRelativePath,
      ctaText: truth.intake.ctaText,
    });
    if (!live.ok) {
      return {
        ok: false,
        ...meta,
        dispatchId: record.dispatchId,
        skuId: CLIP_REPURPOSING_SKU,
        failureCode: live.failureCode,
        message: live.message,
        attempts: 0,
      };
    }
    sourceDurationSeconds = live.sourceDurationSeconds;
    sentences = live.sentences;
    discover = discover ?? live.discover;
    produce = produce ?? live.produce;
    skipDurationGate = live.designatedSourceException;
  }

  if (sourceDurationSeconds == null || !sentences || !produce) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: CLIP_REPURPOSING_SKU,
      failureCode: "LIVE_FACTORY_INCOMPLETE",
      message: "Certified Clip factory did not return a complete discover/produce path.",
      attempts: 0,
    };
  }

  const produced = await runClipRepurposingCustomerPipeline({
    sourceDurationSeconds,
    sentences,
    discover,
    produce,
    applyRevision: input.applyRevision,
    setRevision: input.setRevision,
    skipDurationGate,
  });
  if (!produced.ok) {
    return {
      ok: false,
      ...meta,
      dispatchId: record.dispatchId,
      skuId: CLIP_REPURPOSING_SKU,
      failureCode: produced.failureCode,
      message: produced.message,
      attempts: 1,
    };
  }

  mkdirSync(path.dirname(receiptAbs), { recursive: true });
  const receipt: ClipRepurposingHookReceipt = {
    ok: true,
    skuId: CLIP_REPURPOSING_SKU,
    lane,
    intakeFingerprint,
    outcome: produced.outcome,
    files: produced.files,
  };
  writeFileSync(receiptAbs, `${JSON.stringify(receipt, null, 2)}\n`);

  return {
    ok: true,
    ...meta,
    invocationOutcome:
      produced.outcome.fileCount === 0 ? "CUSTOMER_REMEDY" : "RENDERED",
    dispatchId: record.dispatchId,
    skuId: CLIP_REPURPOSING_SKU,
    outcome: produced.outcome,
    files: produced.files,
    mp4RelativePath: produced.files[0]?.relativePath,
    mp4ContentSha256: produced.files[0]?.contentSha256,
    attempts: 1,
  };
}
