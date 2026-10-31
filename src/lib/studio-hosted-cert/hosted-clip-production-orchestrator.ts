import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  commitCampaignDesignArtifacts,
  isHostedDurableCampaignArtifactsEnabled,
} from "@/lib/campaign-design-artifacts/hosted-durable";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { assembleClip549ValuePackage } from "@/lib/studio-549-clip-repurposing-value-delivery/package";
import { clip549CustomerShortFileName } from "@/lib/studio-final-delivery-room/content";
import type { ClipProducedFile } from "@/lib/studio-clip-repurposing/customer-pipeline";
import {
  clipSetWouldQuietlyUnderDeliver,
  resolveClipRepurposingCustomerOutcome,
} from "@/lib/studio-clip-repurposing/customer-outcome";
import {
  approvedClipRepurposingCta,
  prepareCertifiedClipRepurposingFactory,
  renderOneCertifiedSetClip,
} from "@/lib/studio-clip-repurposing/live-factory";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import type { SetCandidate } from "@/lib/studio-clip-repurposing/types";
import {
  CLIP_REPURPOSING_DISPATCH_HOOK_PACKAGE_ID,
  clipRepurposingReceiptLane,
  readClipRepurposingHookReceipt,
  type ClipRepurposingDispatchHookResult,
} from "@/lib/studio-dispatch/clip-repurposing-dispatch-hook";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { mapClipRepurposingJobTruthFromJob } from "@/lib/studio-dispatch/map-clip-repurposing-job-truth";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { resolveClipRepurposingSetRevisionFromCampaign } from "@/lib/studio-clip-repurposing/resolve-set-revision-from-campaign";
import { prepareClipRepurposingSourceAudio } from "@/lib/studio-clip-repurposing/source-audio-preflight";
import {
  readSourceAudioAcknowledgement,
  sourceAudioWorkDirectory,
} from "@/lib/studio-source-audio-preflight";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

import {
  clipFactoryRoot,
  readHostedClipProductionCheckpoint,
  writeHostedClipProductionCheckpoint,
  type HostedClipProductionCheckpoint,
} from "./clip-production-checkpoint";
import {
  hostedClipWorkerBaseUrl,
  isHostedClipPreviewOrWorkerRuntime,
} from "./hosted-clip-runtime";
import { persistHostedLaunchMenuProgress } from "./persist-launch-menu-progress";

const DISCOVERY_SNAPSHOT = "discovery-snapshot.json";

export type HostedClipProductionStepResult = {
  continue: boolean;
  stage: HostedClipProductionCheckpoint["stage"];
  message: string;
  hookResult?: ClipRepurposingDispatchHookResult;
  failureCode?: string;
  skippedDueToLease?: boolean;
};

/** Must exceed a single sub-phase; stale recovery below handles zombie leases after SIGKILL. */
const CHUNK_LEASE_MS = 180_000;
const CHUNK_LEASE_STALE_MS = 120_000;

function leaseActive(checkpoint: HostedClipProductionCheckpoint | null): boolean {
  if (!checkpoint?.leaseUntil) return false;
  return Date.parse(checkpoint.leaseUntil) > Date.now();
}

function withLease(
  checkpoint: HostedClipProductionCheckpoint,
): HostedClipProductionCheckpoint {
  return {
    ...checkpoint,
    leaseUntil: new Date(Date.now() + CHUNK_LEASE_MS).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function clearLease(
  checkpoint: HostedClipProductionCheckpoint,
): HostedClipProductionCheckpoint {
  return {
    ...checkpoint,
    leaseUntil: null,
    updatedAt: new Date().toISOString(),
  };
}

function discoverySnapshotPath(repoRoot: string, campaignId: string): string {
  return path.join(clipFactoryRoot(repoRoot, campaignId), DISCOVERY_SNAPSHOT);
}

function readTranscriptWords(
  repoRoot: string,
  campaignId: string,
): { words: SpeechWord[]; durationSeconds: number } | null {
  const abs = path.join(clipFactoryRoot(repoRoot, campaignId), "transcript-words.json");
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
      words: SpeechWord[];
      durationSeconds: number;
    };
    return parsed;
  } catch {
    return null;
  }
}

function intakeFingerprint(input: {
  ctaText: string;
  mustKeepLine: string;
  source: string;
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 16);
}

async function persistProgress(
  campaignId: string,
  dispatchId: string,
  message: string,
): Promise<void> {
  if (!isHostedClipPreviewOrWorkerRuntime()) return;
  await persistHostedLaunchMenuProgress({
    campaignId,
    result: {
      dispatchId,
      skuId: CLIP_REPURPOSING_SKU,
      action: "invoked",
      ok: false,
      failureCode: "PRODUCTION_IN_PROGRESS",
      message,
      ownerRoutineProduction: "NONE",
    },
  });
}

async function commitArtifacts(campaignId: string, repoRoot: string): Promise<void> {
  if (isHostedDurableCampaignArtifactsEnabled()) {
    await commitCampaignDesignArtifacts(campaignId, repoRoot);
  }
}

/** Preview: checkpoint must survive serverless timeout mid-render (not only workspace finally). */
async function persistCheckpointDurable(
  campaignId: string,
  repoRoot: string,
  checkpoint: HostedClipProductionCheckpoint,
): Promise<void> {
  writeHostedClipProductionCheckpoint(repoRoot, checkpoint);
  if (isHostedClipPreviewOrWorkerRuntime()) {
    await commitArtifacts(campaignId, repoRoot);
  }
}

function hookMeta(dispatchId: string) {
  return {
    packageId: CLIP_REPURPOSING_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    dispatchId,
    skuId: CLIP_REPURPOSING_SKU,
  };
}

async function tryCompleteHostedClipSetRevision(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
}): Promise<HostedClipProductionStepResult | null> {
  const tasks = await readTasksEnvelope(input.campaign.campaignId);
  const clipJob = tasks?.jobRecords?.find((record) => record.skuId === CLIP_REPURPOSING_SKU);
  if (clipJob?.spineStatus !== "revision_requested") return null;

  const meta = hookMeta(input.dispatchRecord.dispatchId);
  const revReceipt = readClipRepurposingHookReceipt({
    repoRoot: input.repoRoot,
    campaignId: input.campaign.campaignId,
    dispatchId: input.dispatchRecord.dispatchId,
    lane: clipRepurposingReceiptLane(true),
  });
  if (revReceipt?.ok) {
    const files = revReceipt.files ?? [];
    return {
      continue: false,
      stage: "complete",
      message: "Set-revision hook receipt already satisfied.",
      hookResult: {
        ok: true,
        ...meta,
        invocationOutcome: "ALREADY_RENDERED",
        outcome: revReceipt.outcome!,
        files,
        mp4RelativePath: files[0]?.relativePath,
        mp4ContentSha256: files[0]?.contentSha256,
        attempts: 0,
      },
    };
  }

  const setRevision = resolveClipRepurposingSetRevisionFromCampaign({
    campaign: input.campaign,
    materials: input.materials,
    repoRoot: input.repoRoot,
  });
  if (!setRevision) {
    const message =
      "Revision requested but the included set revision could not be mapped from customer emphasis.";
    return {
      continue: false,
      stage: "prepare",
      message,
      failureCode: "SET_REVISION_UNMAPPED",
      hookResult: {
        ok: false,
        ...meta,
        failureCode: "SET_REVISION_UNMAPPED",
        message,
        attempts: 0,
      },
    };
  }

  const { reproduceClipRepurposingAfterRevision } = await import(
    "@/lib/studio-review-revision/reproduce-clip-repurposing-after-revision"
  );
  const hooked = await reproduceClipRepurposingAfterRevision({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    dispatchRecord: input.dispatchRecord,
    materials: input.materials,
    setRevision,
  });
  if (!hooked.ok) {
    return {
      continue: false,
      stage: "prepare",
      message: hooked.message,
      failureCode: hooked.failureCode,
      hookResult: {
        ok: false,
        ...meta,
        failureCode: hooked.failureCode,
        message: hooked.message,
        attempts: "attempts" in hooked ? (hooked.attempts ?? 0) : 0,
      },
    };
  }
  return {
    continue: false,
    stage: "complete",
    message: hooked.outcome.customerExplanation,
    hookResult: {
      ok: true,
      ...meta,
      invocationOutcome: hooked.invocationOutcome,
      outcome: hooked.outcome,
      files: hooked.files,
      mp4RelativePath: hooked.mp4RelativePath,
      mp4ContentSha256: hooked.mp4ContentSha256,
      attempts: "attempts" in hooked ? (hooked.attempts ?? 1) : 1,
    },
  };
}

/** Runs exactly one orchestrator stage (prepare | discover | one render | finalize). */
export async function runHostedClipProductionStep(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials?: readonly CampaignMaterialItem[];
}): Promise<HostedClipProductionStepResult> {
  const record = input.dispatchRecord;
  const campaignId = input.campaign.campaignId;
  const meta = hookMeta(record.dispatchId);

  const materials =
    input.materials ??
    (await readMaterialsEnvelope(campaignId))?.items ??
    [];
  const revisionStep = await tryCompleteHostedClipSetRevision({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    dispatchRecord: record,
    materials,
  });
  if (revisionStep) return revisionStep;

  const truth = mapClipRepurposingJobTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    materials,
  });
  if (!truth.ok) {
    return {
      continue: false,
      stage: "prepare",
      message: truth.message,
      failureCode: truth.code,
      hookResult: {
        ok: false,
        ...meta,
        failureCode: truth.code,
        message: truth.message,
        attempts: 0,
      },
    };
  }

  const fingerprint = intakeFingerprint({
    ctaText: truth.intake.ctaText,
    mustKeepLine: truth.intake.mustKeepLine ?? "",
    source: truth.sourceRelativePath,
  });

  const lane = clipRepurposingReceiptLane(false);
  const existingReceipt = readClipRepurposingHookReceipt({
    repoRoot: input.repoRoot,
    campaignId,
    dispatchId: record.dispatchId,
    lane,
  });
  if (existingReceipt?.ok && existingReceipt.intakeFingerprint === fingerprint) {
    const files = existingReceipt.files ?? [];
    return {
      continue: false,
      stage: "complete",
      message: "Hook receipt already satisfied.",
      hookResult: {
        ok: true,
        ...meta,
        invocationOutcome:
          existingReceipt.outcome?.fileCount === 0 ? "CUSTOMER_REMEDY" : "ALREADY_RENDERED",
        outcome: existingReceipt.outcome!,
        files,
        mp4RelativePath: files[0]?.relativePath,
        mp4ContentSha256: files[0]?.contentSha256,
        attempts: 0,
      },
    };
  }

  let existingCheckpoint = readHostedClipProductionCheckpoint(input.repoRoot, campaignId);
  if (leaseActive(existingCheckpoint)) {
    const updatedMs = Date.parse(existingCheckpoint!.updatedAt);
    const zombie =
      Number.isFinite(updatedMs) && Date.now() - updatedMs > CHUNK_LEASE_STALE_MS;
    if (zombie) {
      await persistCheckpointDurable(
        campaignId,
        input.repoRoot,
        clearLease(existingCheckpoint!),
      );
      existingCheckpoint = readHostedClipProductionCheckpoint(input.repoRoot, campaignId);
    } else {
      return {
        continue: true,
        stage: existingCheckpoint!.stage,
        message: "Chunk lease active; another invocation is running.",
        skippedDueToLease: true,
      };
    }
  }
  if (leaseActive(existingCheckpoint)) {
    return {
      continue: true,
      stage: existingCheckpoint!.stage,
      message: "Chunk lease active; another invocation is running.",
      skippedDueToLease: true,
    };
  }

  let checkpoint =
    existingCheckpoint ??
    ({
      version: 1,
      campaignId,
      dispatchId: record.dispatchId,
      intakeFingerprint: fingerprint,
      stage: "prepare",
      sourceRelativePath: truth.sourceRelativePath,
      ctaText: truth.intake.ctaText,
      selectedClipIds: [],
      completedClips: [],
      nextRenderIndex: 0,
      updatedAt: new Date().toISOString(),
    } satisfies HostedClipProductionCheckpoint);

  if (checkpoint.intakeFingerprint !== fingerprint) {
    checkpoint = {
      ...checkpoint,
      intakeFingerprint: fingerprint,
      stage: "prepare",
      selectedClipIds: [],
      completedClips: [],
      nextRenderIndex: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const acknowledgement = readSourceAudioAcknowledgement(input.campaign);
  const priorDecisionAbs = path.join(
    sourceAudioWorkDirectory(input.repoRoot, campaignId),
    "decision.json",
  );
  const priorDecision = existsSync(priorDecisionAbs)
    ? (JSON.parse(readFileSync(priorDecisionAbs, "utf8")) as {
        outcome?: string;
        selectedSourceRelativePath?: string;
      })
    : null;
  const priorSelectedAbs = priorDecision?.selectedSourceRelativePath
    ? path.join(input.repoRoot, priorDecision.selectedSourceRelativePath)
    : "";
  const priorReusable =
    Boolean(priorDecision?.selectedSourceRelativePath) &&
    existsSync(priorSelectedAbs) &&
    priorDecision?.outcome !== "REPLACEMENT_REQUIRED";

  const prepared =
    priorReusable && priorDecision?.selectedSourceRelativePath
      ? {
          ok: true as const,
          sourceAbsolutePath: priorSelectedAbs,
          sourceRelativePath: priorDecision.selectedSourceRelativePath,
        }
      : prepareClipRepurposingSourceAudio({
          repoRoot: input.repoRoot,
          campaignId,
          sourceAbsolutePath: truth.sourceAbsolutePath,
          sourceRelativePath: truth.sourceRelativePath,
          acknowledgement,
        });
  if (!prepared.ok) {
    return {
      continue: false,
      stage: checkpoint.stage,
      message: prepared.message,
      failureCode: prepared.failureCode,
      hookResult: {
        ok: false,
        ...meta,
        failureCode: prepared.failureCode,
        message: prepared.message,
        attempts: 0,
      },
    };
  }

  checkpoint = withLease(checkpoint);
  await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);

  try {
  if (checkpoint.stage === "prepare") {
    await persistProgress(
      campaignId,
      record.dispatchId,
      "Clip orchestrator: preparing transcript and factory.",
    );
    const live = await prepareCertifiedClipRepurposingFactory({
      repoRoot: input.repoRoot,
      campaignId,
      sourceAbsolutePath: prepared.sourceAbsolutePath,
      sourceRelativePath: prepared.sourceRelativePath,
      ctaText: truth.intake.ctaText,
    });
    if (!live.ok) {
      return {
        continue: false,
        stage: "prepare",
        message: live.message,
        failureCode: live.failureCode,
        hookResult: {
          ok: false,
          ...meta,
          failureCode: live.failureCode,
          message: live.message,
          attempts: 0,
        },
      };
    }
    checkpoint = {
      ...checkpoint,
      stage: "discover",
      sourceDurationSeconds: live.sourceDurationSeconds,
      updatedAt: new Date().toISOString(),
    };
    await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
    return {
      continue: true,
      stage: "discover",
      message: "Prepare complete; discovery scheduled.",
    };
  }

  if (checkpoint.stage === "discover") {
    const live = await prepareCertifiedClipRepurposingFactory({
      repoRoot: input.repoRoot,
      campaignId,
      sourceAbsolutePath: prepared.sourceAbsolutePath,
      sourceRelativePath: prepared.sourceRelativePath,
      ctaText: truth.intake.ctaText,
    });
    if (!live.ok) {
      return {
        continue: false,
        stage: "discover",
        message: live.message,
        failureCode: live.failureCode,
      };
    }
    const transcript = readTranscriptWords(input.repoRoot, campaignId);
    if (!transcript) {
      return {
        continue: false,
        stage: "discover",
        message: "Transcript missing after prepare.",
        failureCode: "TRANSCRIPT_MISSING",
      };
    }
    const discovered = live.discover!({
      sourceDurationSeconds: live.sourceDurationSeconds,
      sentences: live.sentences,
    });
    if (!discovered.ok) {
      return {
        continue: false,
        stage: "discover",
        message: "reason" in discovered ? String(discovered.reason) : "Discovery failed.",
        failureCode: "DISCOVERY_FAILED",
      };
    }
    const outcome = resolveClipRepurposingCustomerOutcome(discovered.viableCount);
    const selected = discovered.selected.slice(0, outcome.fileCount);
    writeFileSync(
      discoverySnapshotPath(input.repoRoot, campaignId),
      `${JSON.stringify({ selected, outcome }, null, 2)}\n`,
    );
    checkpoint = {
      ...checkpoint,
      stage: selected.length === 0 ? "finalize" : "render",
      outcome,
      selectedClipIds: selected.map((c) => c.id),
      nextRenderIndex: 0,
      completedClips: [],
      updatedAt: new Date().toISOString(),
    };
    await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
    await persistProgress(
      campaignId,
      record.dispatchId,
      `Clip orchestrator: discovered ${selected.length} clip(s) to render.`,
    );
    return {
      continue: true,
      stage: checkpoint.stage,
      message: `Discovery complete; ${selected.length} clip(s).`,
    };
  }

  if (checkpoint.stage === "render") {
    const snapshotAbs = discoverySnapshotPath(input.repoRoot, campaignId);
    if (!existsSync(snapshotAbs)) {
      return {
        continue: false,
        stage: "render",
        message: "Discovery snapshot missing.",
        failureCode: "DISCOVERY_SNAPSHOT_MISSING",
      };
    }
    const snapshot = JSON.parse(readFileSync(snapshotAbs, "utf8")) as {
      selected: SetCandidate[];
      outcome: NonNullable<HostedClipProductionCheckpoint["outcome"]>;
    };
    const transcript = readTranscriptWords(input.repoRoot, campaignId);
    if (!transcript || checkpoint.sourceDurationSeconds == null) {
      return {
        continue: false,
        stage: "render",
        message: "Factory transcript/duration missing for render.",
        failureCode: "FACTORY_STATE_MISSING",
      };
    }
    const idx = checkpoint.nextRenderIndex;
    if (idx >= snapshot.selected.length) {
      checkpoint = {
        ...checkpoint,
        stage: "finalize",
        updatedAt: new Date().toISOString(),
      };
      await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
      return {
        continue: true,
        stage: "finalize",
        message: "All clips rendered; finalize scheduled.",
      };
    }
    const candidate = snapshot.selected[idx]!;
    const already = checkpoint.completedClips.find((c) => c.clipId === candidate.id);
    if (already) {
      checkpoint = {
        ...checkpoint,
        nextRenderIndex: idx + 1,
        updatedAt: new Date().toISOString(),
      };
      await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
      return {
        continue: true,
        stage: "render",
        message: `Skipped duplicate render for ${candidate.id}.`,
      };
    }
    await persistProgress(
      campaignId,
      record.dispatchId,
      `Clip orchestrator: rendering ${idx + 1}/${snapshot.selected.length} (${candidate.id}).`,
    );
    const sentences = buildTranscriptSentences(transcript.words);
    const rendered = await renderOneCertifiedSetClip({
      repoRoot: input.repoRoot,
      campaignId,
      sourceAbsolutePath: prepared.sourceAbsolutePath,
      sourceDurationSeconds: checkpoint.sourceDurationSeconds,
      sentences,
      words: transcript.words,
      ctaText: checkpoint.ctaText,
      candidate,
    });
    if ("inProgress" in rendered && rendered.inProgress) {
      checkpoint = {
        ...checkpoint,
        updatedAt: new Date().toISOString(),
      };
      await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
      await persistProgress(
        campaignId,
        record.dispatchId,
        `Clip orchestrator: ${rendered.message} (${candidate.id}).`,
      );
      return {
        continue: true,
        stage: "render",
        message: rendered.message,
      };
    }
    if (!("clipId" in rendered)) {
      const failMessage =
        "message" in rendered && typeof rendered.message === "string"
          ? rendered.message
          : "Clip render failed.";
      await persistProgress(
        campaignId,
        record.dispatchId,
        `Clip orchestrator render failed (${candidate.id}): ${failMessage}`,
      );
      return {
        continue: false,
        stage: "render",
        message: failMessage,
        failureCode: "CLIP_RENDER_FAILED",
      };
    }
    const file = rendered;
    checkpoint = {
      ...checkpoint,
      completedClips: [...checkpoint.completedClips, file],
      nextRenderIndex: idx + 1,
      updatedAt: new Date().toISOString(),
    };
    await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
    await persistProgress(
      campaignId,
      record.dispatchId,
      `Clip rendered ${checkpoint.completedClips.length}/${snapshot.selected.length}: ${file.clipId} (${file.contentSha256.slice(0, 12)}).`,
    );
    if (checkpoint.nextRenderIndex < snapshot.selected.length) {
      return {
        continue: true,
        stage: "render",
        message: `Rendered ${file.clipId}; next clip scheduled.`,
      };
    }
    checkpoint = {
      ...checkpoint,
      stage: "finalize",
      updatedAt: new Date().toISOString(),
    };
    await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
    return {
      continue: true,
      stage: "finalize",
      message: "Last clip rendered; finalize scheduled.",
    };
  }

  if (checkpoint.stage === "finalize") {
    const snapshotAbs = discoverySnapshotPath(input.repoRoot, campaignId);
    const snapshot = existsSync(snapshotAbs)
      ? (JSON.parse(readFileSync(snapshotAbs, "utf8")) as {
          selected: SetCandidate[];
          outcome: NonNullable<HostedClipProductionCheckpoint["outcome"]>;
        })
      : null;
    const outcome = checkpoint.outcome ?? snapshot?.outcome;
    const files = checkpoint.completedClips;
    if (!outcome) {
      return {
        continue: false,
        stage: "finalize",
        message: "Outcome missing at finalize.",
        failureCode: "OUTCOME_MISSING",
      };
    }
    if (
      outcome.fileCount > 0 &&
      clipSetWouldQuietlyUnderDeliver({
        viableCount: outcome.viableCount,
        producedFileCount: files.length,
        chargedCents: outcome.settlementPriceCents,
      })
    ) {
      return {
        continue: false,
        stage: "finalize",
        message: "Under-deliver forbidden.",
        failureCode: "UNDER_DELIVER_FORBIDDEN",
      };
    }
    const root = clipFactoryRoot(input.repoRoot, campaignId);
    writeFileSync(
      path.join(root, "set-result.json"),
      `${JSON.stringify({ outcome, files }, null, 2)}\n`,
    );
    writeFileSync(
      path.join(root, "factory-spend.json"),
      `${JSON.stringify(
        {
          renders: files.length,
          reusedRenders: 0,
          elapsedMs: 0,
          renderEnv: "hosted-chunk-orchestrator",
        },
        null,
        2,
      )}\n`,
    );
    const valuePackage = assembleClip549ValuePackage({
      repoRoot: input.repoRoot,
      outputDir: path.join(root, "customer-package"),
      identity: {
        customerName: campaignId,
        projectName: "Clip Repurposing",
        orderLabel: campaignId,
        deliveredOn: new Date().toISOString().slice(0, 10),
        ctaText: approvedClipRepurposingCta({ ctaText: checkpoint.ctaText }),
      },
      delivered: files.map((file, index) => ({
        clipId: file.clipId,
        fileName: clip549CustomerShortFileName(index),
        spokenIdea: file.idea,
        durationLabel: "",
      })),
      sourceMp4AbsolutePaths: files.map((file) =>
        path.join(input.repoRoot, file.relativePath),
      ),
    });
    if (!valuePackage.ok) {
      return {
        continue: false,
        stage: "finalize",
        message: valuePackage.message,
        failureCode: "VALUE_PACKAGE_FAILED",
      };
    }
    const receiptAbs = path.join(
      input.repoRoot,
      customerArtifactRootRel(campaignId, record.dispatchId),
      "clip-repurposing-hook-receipt.json",
    );
    mkdirSync(path.dirname(receiptAbs), { recursive: true });
    writeFileSync(
      receiptAbs,
      `${JSON.stringify(
        {
          ok: true,
          skuId: CLIP_REPURPOSING_SKU,
          lane: clipRepurposingReceiptLane(false),
          intakeFingerprint: fingerprint,
          outcome,
          files,
        },
        null,
        2,
      )}\n`,
    );
    checkpoint = {
      ...checkpoint,
      stage: "complete",
      updatedAt: new Date().toISOString(),
    };
    await persistCheckpointDurable(campaignId, input.repoRoot, checkpoint);
    return {
      continue: false,
      stage: "complete",
      message: "Clip production complete.",
      hookResult: {
        ok: true,
        ...meta,
        invocationOutcome: outcome.fileCount === 0 ? "CUSTOMER_REMEDY" : "RENDERED",
        outcome,
        files,
        mp4RelativePath: files[0]?.relativePath,
        mp4ContentSha256: files[0]?.contentSha256,
        attempts: 1,
      },
    };
  }

  return {
    continue: false,
    stage: "complete",
    message: "Orchestrator already complete.",
  };
  } finally {
    const latest = readHostedClipProductionCheckpoint(input.repoRoot, campaignId);
    if (latest) {
      await persistCheckpointDurable(campaignId, input.repoRoot, clearLease(latest));
    }
  }
}

function hostedClipChunkHost(): string | null {
  const direct = process.env.VERCEL_URL?.trim();
  if (direct) return direct.replace(/^https:\/\//, "");
  const branch = process.env.VERCEL_BRANCH_URL?.trim();
  if (branch) return branch.replace(/^https:\/\//, "");
  return null;
}

export function hostedClipChunkContinuationUrl(_campaignId: string): string | null {
  const host = hostedClipChunkHost();
  if (!host) return null;
  return `https://${host}/api/hosted-cert/clip-production-chunk`;
}

function hostedClipChunkKickHeaders(): Record<string, string> {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const internal = process.env.HOSTED_CERT_INTERNAL_CHUNK_KEY?.trim();
  return {
    "Content-Type": "application/json",
    ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
    ...(internal ? { "x-hosted-cert-internal": internal } : {}),
  };
}

async function kickHostedClipWorkerRunChunk(campaignId: string): Promise<void> {
  const base = hostedClipWorkerBaseUrl();
  if (!base) {
    console.error("hosted clip production continuation: missing HOSTED_CLIP_WORKER_URL");
    return;
  }
  const internal = process.env.HOSTED_CERT_INTERNAL_CHUNK_KEY?.trim();
  const res = await fetch(`${base}/run-chunk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internal ? { "x-hosted-cert-internal": internal } : {}),
    },
    body: JSON.stringify({
      campaignId,
      scheduleContinuation: true,
      finalizeLaunchMenu: true,
    }),
    signal: AbortSignal.timeout(
      Number(process.env.HOSTED_CLIP_WORKER_KICK_TIMEOUT_MS ?? 900_000),
    ),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("hosted clip worker kick failed", res.status, text.slice(0, 400));
  }
}

async function kickHostedClipProductionChunk(campaignId: string): Promise<void> {
  if (hostedClipWorkerBaseUrl()) {
    await kickHostedClipWorkerRunChunk(campaignId);
    return;
  }
  const url = hostedClipChunkContinuationUrl(campaignId);
  if (!url) {
    console.error("hosted clip production continuation: missing VERCEL_URL");
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: hostedClipChunkKickHeaders(),
    body: JSON.stringify({
      campaignId,
      dequeueAsync: true,
      scheduleContinuation: true,
      finalizeLaunchMenu: true,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("hosted clip production chunk kick failed", res.status, text.slice(0, 400));
  }
}

/** Machine: schedule the next serverless chunk after the current invocation returns. */
export async function scheduleHostedClipProductionContinuation(
  campaignId: string,
  options?: { eager?: boolean },
): Promise<void> {
  if (process.env.VERCEL_ENV !== "preview" && !hostedClipWorkerBaseUrl()) return;
  const url = hostedClipChunkContinuationUrl(campaignId);
  const workerBase = hostedClipWorkerBaseUrl();
  if (!url && !workerBase) {
    console.error("hosted clip production continuation: missing VERCEL_URL or HOSTED_CLIP_WORKER_URL");
    return;
  }

  if (options?.eager) {
    try {
      await kickHostedClipProductionChunk(campaignId);
    } catch (error) {
      console.error("hosted clip production eager chunk kick failed", error);
    }
    return;
  }

  const { after } = await import("next/server");
  after(async () => {
    try {
      await kickHostedClipProductionChunk(campaignId);
    } catch (error) {
      console.error("hosted clip production continuation fetch failed", error);
    }
  });
}

/** Drive until idle or maxSteps (cert / recovery harness). */
export async function runHostedClipProductionUntilIdle(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  maxSteps?: number;
}): Promise<HostedClipProductionStepResult> {
  const maxSteps = input.maxSteps ?? 24;
  let last: HostedClipProductionStepResult = {
    continue: false,
    stage: "prepare",
    message: "not started",
  };
  for (let i = 0; i < maxSteps; i++) {
    last = await runHostedClipProductionStep(input);
    if (last.hookResult?.ok) return last;
    if (!last.continue) break;
  }
  return last;
}
