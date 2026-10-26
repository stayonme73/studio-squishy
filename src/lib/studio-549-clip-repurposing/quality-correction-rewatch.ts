/**
 * Quality-rewatch the real five-output Clip set after the talking-head
 * false B-roll fix. Does not re-render. Does not reopen discovery.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import path from "path";

import {
  machineDecideCorrection,
  type PackCorrectionKind,
} from "@/lib/studio-short-form-content-pack/machine-corrections";
import {
  inspectQualityPng,
  reviewRenderedShort,
} from "@/lib/studio-short-form-content-pack/quality-review";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";

import { CLIP_549_LIVE_FIVE_STAMP, type Clip549LiveFiveProof } from "./live-five-e2e";
import { CLIP_549_MAX_QUALITY_LOOPS } from "./quality";

export const CLIP_549_CORRECTION_REGRESSION_REL =
  "docs/launch/studio-549-clip-repurposing-build-1/CORRECTION-REGRESSION.json" as const;

const BROLL_CODES = new Set([
  "broll_into_next_thought",
  "broll_weak_generic",
  "broll_does_not_improve",
  "broll_keyword_only",
  "broll_left_before_thought_finished",
  "broll_not_aligned_to_thought",
  "broll_unstable_size",
  "broll_obstructs_speaker",
  "broll_caption_competition",
  "broll_visually_heavy",
  "broll_abrupt",
  "broll_visual_mismatch",
  "broll_bouncing",
  "broll_placement_inconsistent",
]);

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function withBrollWritten(workDir: string): boolean {
  return existsSync(path.join(workDir, "with-broll.mp4"));
}

async function inspectExistingQualityFrames(dir: string) {
  if (!existsSync(dir)) return [];
  const pngs = readdirSync(dir)
    .filter((name) => name.endsWith(".png"))
    .sort();
  const frames = [];
  for (const name of pngs) {
    const inspected = await inspectQualityPng(path.join(dir, name));
    frames.push({
      name,
      overlayPresent: inspected.overlayPresent,
      visualKind: inspected.visualKind,
      speakerPresent: inspected.speakerPresent,
      pipOverlay: inspected.pipOverlay,
      pipFruit: inspected.pipFruit,
      pipSkin: inspected.pipSkin,
    });
  }
  return frames;
}

export async function runClip549QualityCorrectionRewatch(repoRoot: string) {
  applyDotenvLocal(repoRoot);
  const proofPath = path.join(repoRoot, CLIP_549_LIVE_FIVE_STAMP, "LIVE-FIVE-E2E.json");
  const prior = JSON.parse(readFileSync(proofPath, "utf8")) as Clip549LiveFiveProof;
  const stamp = path.join(repoRoot, CLIP_549_LIVE_FIVE_STAMP);
  const clips = [];

  for (const file of prior.files) {
    const firstRel = `${CLIP_549_LIVE_FIVE_STAMP}/delivery/${file.clipId}.mp4`;
    const remasterRel = `${CLIP_549_LIVE_FIVE_STAMP}/delivery/${file.clipId}-loop-2.mp4`;
    const firstAbs = path.join(repoRoot, firstRel);
    const remasterAbs = path.join(repoRoot, remasterRel);
    const firstWork = path.join(stamp, "work", file.clipId);
    const remasterWork = path.join(stamp, "work", `${file.clipId}-loop-2`);
    const firstQualityDir = path.join(stamp, "quality", file.clipId, "quality-0");
    const remasterQualityDir = path.join(stamp, "quality", file.clipId, "quality-2");

    const firstPixels = await inspectExistingQualityFrames(firstQualityDir);
    const remasterPixels = await inspectExistingQualityFrames(remasterQualityDir);

    const firstWatch = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: firstAbs,
      workDir: path.join(stamp, "quality-rewatch", file.clipId, "first"),
    });
    if ("ok" in firstWatch) {
      return { ok: false as const, message: `${file.clipId} first rewatch failed: ${firstWatch.message}` };
    }
    const remasterWatch = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: remasterAbs,
      workDir: path.join(stamp, "quality-rewatch", file.clipId, "remaster"),
    });
    if ("ok" in remasterWatch) {
      return {
        ok: false as const,
        message: `${file.clipId} remaster rewatch failed: ${remasterWatch.message}`,
      };
    }

    const firstDecision = machineDecideCorrection({
      review: firstWatch,
      loopIndex: 0,
      previousKinds: [],
    });
    const remasterDecision = machineDecideCorrection({
      review: remasterWatch,
      loopIndex: CLIP_549_MAX_QUALITY_LOOPS,
      previousKinds: ["omit_broll"] as PackCorrectionKind[],
    });
    const remasterBrollFindings = remasterWatch.findings
      .map((finding) => finding.code)
      .filter((code) => BROLL_CODES.has(code));
    const finalPass = remasterWatch.pass;
    clips.push({
      clipId: file.clipId,
      firstRender: {
        relativePath: firstRel,
        bytes: statSync(firstAbs).size,
        sha256: sha256(firstAbs),
        withBrollWritten: withBrollWritten(firstWork),
      },
      remasterRender: {
        relativePath: remasterRel,
        bytes: statSync(remasterAbs).size,
        sha256: sha256(remasterAbs),
        withBrollWritten: withBrollWritten(remasterWork),
      },
      priorMachineKinds: file.corrections.flatMap((item) => item.kinds ?? []),
      priorFirstFindings: file.firstQuality.findings,
      existingFirstPixels: firstPixels,
      existingRemasterPixels: remasterPixels,
      firstRewatch: {
        inspectedRenderedMp4: firstWatch.inspectedRenderedMp4,
        renderedAbsolutePath: firstAbs,
        pass: firstWatch.pass,
        findings: firstWatch.findings.map((finding) => finding.code),
        brollSeenInRender: firstWatch.brollSeenInRender,
        brollVisualKind: firstWatch.brollVisualKind,
        machineRoute: firstDecision.route,
        machineKinds:
          firstDecision.route === "production" ? firstDecision.instruction.kinds : [],
        omitBroll:
          firstDecision.route === "production" ? firstDecision.instruction.omitBroll : false,
      },
      remasterRewatch: {
        inspectedRenderedMp4: remasterWatch.inspectedRenderedMp4,
        renderedAbsolutePath: remasterAbs,
        pass: remasterWatch.pass,
        findings: remasterWatch.findings.map((finding) => finding.code),
        brollSeenInRender: remasterWatch.brollSeenInRender,
        brollVisualKind: remasterWatch.brollVisualKind,
        remasterBrollFindings,
        machineRoute: remasterDecision.route,
        finalPassFromQualityPass: finalPass,
        finalPassFromLoopExhaustion: false,
      },
    });
  }

  const remainingFailed = clips.filter((clip) => !clip.remasterRewatch.pass);
  const remainingBroll = clips.filter(
    (clip) => clip.remasterRewatch.remasterBrollFindings.length > 0,
  );
  const report = {
    kind: "clip_549_quality_correction_regression",
    rootCause: "D",
    rootCauseDetail:
      "Quality classified talking-head skin/hand pixels in the PiP box as fruit B-roll. omit_broll reached Production. Production never wrote with-broll.mp4. Remasters stayed talking-head. Quality rewatched the remaster paths and repeated the false findings.",
    withBrollWrittenAnywhere: clips.some(
      (clip) => clip.firstRender.withBrollWritten || clip.remasterRender.withBrollWritten,
    ),
    machineOmitBrollReachedProduction: clips.every((clip) =>
      clip.priorMachineKinds.includes("omit_broll"),
    ),
    qualityWatchedCorrectedFiles: clips.every(
      (clip) =>
        clip.remasterRewatch.inspectedRenderedMp4 &&
        clip.remasterRewatch.renderedAbsolutePath.endsWith(`${clip.clipId}-loop-2.mp4`),
    ),
    fiveOutputCount: clips.length,
    allFiveNoFalseBroll: remainingBroll.length === 0,
    remainingFailedClips: remainingFailed.map((clip) => ({
      clipId: clip.clipId,
      findings: clip.remasterRewatch.findings,
    })),
    remainingBrollClips: remainingBroll.map((clip) => ({
      clipId: clip.clipId,
      findings: clip.remasterRewatch.remasterBrollFindings,
    })),
    clips,
  };
  mkdirSync(path.dirname(path.join(repoRoot, CLIP_549_CORRECTION_REGRESSION_REL)), {
    recursive: true,
  });
  writeFileSync(
    path.join(repoRoot, CLIP_549_CORRECTION_REGRESSION_REL),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return { ok: true as const, report };
}
