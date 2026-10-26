import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";

import { FLAGSHIP_UPBEAT_BED_REL } from "@/lib/studio-flagship-short-form-edit/music";
import { runContentPackClip } from "@/lib/studio-short-form-content-pack/clip";
import {
  machineDecideCorrection,
  type PackCorrectionKind,
} from "@/lib/studio-short-form-content-pack/machine-corrections";
import { decidePackMusic } from "@/lib/studio-short-form-content-pack/music-decision";
import { reviewRenderedShort } from "@/lib/studio-short-form-content-pack/quality-review";
import { readDeepgramApiKey } from "@/lib/studio-short-form-video-editing/deepgram";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import { identifiedClipFromCandidate } from "./finishing";
import {
  DESIGNATED_CLIP_SOURCE_REL,
  discoverDesignatedClipSource,
} from "./probe-designated-source";
import { CLIP_549_MAX_QUALITY_LOOPS } from "./quality";

export const CLIP_549_LIVE_FIVE_STAMP =
  "docs/launch/studio-549-clip-repurposing-build-1/live-five-e2e" as const;

export const CLIP_549_LIVE_CTA = "Start at thestudiocompany7.com" as const;

const LIST_RATE = studioShortFormVideoEditingBuildV1.deepgram.listRateUsdPerMinute;

export type Clip549LiveFiveClipProof = {
  clipId: string;
  idea: string;
  windowStart: number;
  windowEnd: number;
  semanticScore: number;
  outputRelativePath: string;
  outputBytes: number | null;
  width: 1080;
  height: 1920;
  finishSpend: {
    deepgramUsd: number;
    elevenCredits: number;
    stockMediaUsd: number;
    elapsedMs: number;
  };
  firstQuality: {
    pass: boolean;
    findings: string[];
    inspectedRenderedMp4: true;
    renderedAbsolutePath: string;
  };
  corrections: Array<{
    loopIndex: number;
    route: string;
    kinds?: string[];
    outputRelativePath?: string;
    qualityPass?: boolean;
    findings?: string[];
  }>;
  finalPass: boolean;
};

export type Clip549LiveFiveProof = {
  kind: "clip_specific_five_output_e2e";
  sourceRelativePath: typeof DESIGNATED_CLIP_SOURCE_REL;
  sourceDurationSeconds: number;
  wholeSourceTranscript: {
    requestId?: string;
    estimatedUsdList: number;
    wordCount: number;
    reusedExistingDeepgramCall: true;
  };
  discovery: {
    viableDistinctCount: number;
    selectedIds: string[];
    selectedIdeas: string[];
  };
  ctaText: typeof CLIP_549_LIVE_CTA;
  skippedUnfinishable: Array<{ clipId: string; idea: string; reason: string }>;
  files: Clip549LiveFiveClipProof[];
  finishingDeepgramUsd: number;
  finishingElevenCredits: number;
  finishingStockUsd: number;
  qualityDeepgramUsdDerived: number;
  wallClockMs: number;
  allFiveRendered: boolean;
  qualityInspectedAllFive: boolean;
  correctionReturnedThroughQuality: boolean;
  waitingOnOwner?: {
    reason: string;
    action: string;
    estimatedCostUsd?: number;
  };
};

function deepgramUsdFromSeconds(seconds: number): number {
  return Number((Math.max(seconds, 1) / 60 * LIST_RATE).toFixed(4));
}

export async function runClip549LiveFiveE2e(repoRoot: string): Promise<
  | { ok: true; proof: Clip549LiveFiveProof }
  | { ok: false; message: string; proof?: Clip549LiveFiveProof }
> {
  const startedAt = Date.now();
  applyDotenvLocal(repoRoot);
  const stampDir = CLIP_549_LIVE_FIVE_STAMP;
  mkdirSync(path.join(repoRoot, stampDir, "delivery"), { recursive: true });

  const { saved, discovery } = discoverDesignatedClipSource(repoRoot);
  const selected = discovery.selected.slice(0, 5);
  const baseProof = (): Omit<Clip549LiveFiveProof, "files" | "wallClockMs"> => ({
    kind: "clip_specific_five_output_e2e",
    sourceRelativePath: DESIGNATED_CLIP_SOURCE_REL,
    sourceDurationSeconds: saved.durationSeconds,
    wholeSourceTranscript: {
      requestId: saved.requestId,
      estimatedUsdList: saved.estimatedUsdList,
      wordCount: saved.wordCount,
      reusedExistingDeepgramCall: true,
    },
    discovery: {
      viableDistinctCount: discovery.viableDistinctCount,
      selectedIds: selected.map((clip) => clip.id),
      selectedIdeas: selected.map((clip) => clip.idea),
    },
    ctaText: CLIP_549_LIVE_CTA,
    skippedUnfinishable: [],
    finishingDeepgramUsd: 0,
    finishingElevenCredits: 0,
    finishingStockUsd: 0,
    qualityDeepgramUsdDerived: 0,
    allFiveRendered: false,
    qualityInspectedAllFive: false,
    correctionReturnedThroughQuality: false,
  });

  if (selected.length < 5) {
    return {
      ok: false,
      message: `Designated source yielded ${discovery.viableDistinctCount} distinct clips. Cannot manufacture five.`,
    };
  }

  if (!readDeepgramApiKey()) {
    const proof: Clip549LiveFiveProof = {
      ...baseProof(),
      files: [],
      skippedUnfinishable: [],
      wallClockMs: Date.now() - startedAt,
      waitingOnOwner: {
        reason: "DEEPGRAM_API_KEY is not loaded in this process.",
        action:
          "Confirm .env.local has DEEPGRAM_API_KEY, then authorize Scout to resume the paid five-clip finish and Quality transcription.",
        estimatedCostUsd: 0.5,
      },
    };
    writeFileSync(
      path.join(repoRoot, stampDir, "LIVE-FIVE-E2E.json"),
      `${JSON.stringify(proof, null, 2)}\n`,
    );
    return {
      ok: false,
      message: "DEEPGRAM_API_KEY absent. Paid finishing and Quality transcription cannot run.",
      proof,
    };
  }

  const sourceAbsolutePath = path.join(repoRoot, DESIGNATED_CLIP_SOURCE_REL);
  if (!existsSync(sourceAbsolutePath)) {
    return { ok: false, message: `Designated source missing: ${DESIGNATED_CLIP_SOURCE_REL}` };
  }

  const musicDecision = decidePackMusic({
    spokenIdeas: selected.map((clip) => clip.idea),
    coordinatedSet: true,
  });
  const sharedBed = path.join(repoRoot, FLAGSHIP_UPBEAT_BED_REL);
  const partialPath = path.join(repoRoot, stampDir, "LIVE-FIVE-E2E.partial.json");
  const files: Clip549LiveFiveClipProof[] = [];
  if (existsSync(partialPath)) {
    const prior = JSON.parse(readFileSync(partialPath, "utf8")) as {
      files?: Clip549LiveFiveClipProof[];
    };
    for (const file of prior.files ?? []) files.push(file);
  }
  let finishingDeepgramUsd = files.reduce((sum, file) => sum + file.finishSpend.deepgramUsd, 0);
  let finishingElevenCredits = files.reduce(
    (sum, file) => sum + file.finishSpend.elevenCredits,
    0,
  );
  let finishingStockUsd = files.reduce((sum, file) => sum + file.finishSpend.stockMediaUsd, 0);
  let qualityDeepgramUsdDerived = 0;
  let anyCorrection = files.some((file) => file.corrections.length > 0);
  let correctionReturnedThroughQuality = files.every((file) =>
    file.corrections.every((item) => item.route === "production" && item.qualityPass != null),
  );

  const doneIds = new Set(files.map((file) => file.clipId));
  const skippedUnfinishable: Array<{ clipId: string; idea: string; reason: string }> = [];
  const queue = [...selected, ...discovery.alternates];

  for (const candidate of queue) {
    if (files.length >= 5) break;
    if (doneIds.has(candidate.id)) continue;
    const clip = identifiedClipFromCandidate(candidate, DESIGNATED_CLIP_SOURCE_REL);
    const firstOut = `${stampDir}/delivery/${candidate.id}.mp4`;
    const first = await runContentPackClip({
      repoRoot,
      workDir: path.join(repoRoot, stampDir, "work", candidate.id),
      outputRelativePath: firstOut,
      sourceAbsolutePath,
      clip,
      ctaText: CLIP_549_LIVE_CTA,
      musicDecision,
      sharedMusicAbsolutePath:
        musicDecision.mode === "shared_set_bed" ? sharedBed : null,
    });
    if (!first.ok) {
      skippedUnfinishable.push({
        clipId: candidate.id,
        idea: candidate.idea,
        reason: first.message,
      });
      writeFileSync(
        path.join(repoRoot, stampDir, "LIVE-FIVE-E2E-ERROR.json"),
        `${JSON.stringify({ skippedUnfinishable }, null, 2)}\n`,
      );
      continue;
    }
    finishingDeepgramUsd += first.spend.deepgramUsd;
    finishingElevenCredits += first.spend.elevenCredits;
    finishingStockUsd += first.spend.stockMediaUsd;

    const firstAbs = path.join(repoRoot, first.outputRelativePath);
    const firstQuality = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: firstAbs,
      workDir: path.join(repoRoot, stampDir, "quality", candidate.id, "quality-0"),
    });
    if ("ok" in firstQuality) {
      const message = `${candidate.id} Quality failed: ${firstQuality.message}`;
      writeFileSync(
        path.join(repoRoot, stampDir, "LIVE-FIVE-E2E-ERROR.json"),
        `${JSON.stringify({ message, clipId: candidate.id }, null, 2)}\n`,
      );
      return { ok: false, message };
    }
    qualityDeepgramUsdDerived += deepgramUsdFromSeconds(first.inspect.durationSeconds);

    const corrections: Clip549LiveFiveClipProof["corrections"] = [];
    let current = firstQuality;
    let currentPath = first.outputRelativePath;
    let previousKinds: PackCorrectionKind[] = [];
    let loopIndex = 0;
    let finalPass = firstQuality.pass;
    const finishSpend = {
      deepgramUsd: first.spend.deepgramUsd,
      elevenCredits: first.spend.elevenCredits,
      stockMediaUsd: first.spend.stockMediaUsd,
      elapsedMs: first.spend.elapsedMs,
    };

    while (!current.pass && loopIndex < CLIP_549_MAX_QUALITY_LOOPS) {
      anyCorrection = true;
      const decision = machineDecideCorrection({
        review: current,
        loopIndex,
        previousKinds,
      });
      if (decision.route !== "production") {
        corrections.push({ loopIndex, route: decision.route });
        correctionReturnedThroughQuality = false;
        break;
      }
      const loopOut = `${stampDir}/delivery/${candidate.id}-loop-${loopIndex + 1}.mp4`;
      const again = await runContentPackClip({
        repoRoot,
        workDir: path.join(
          repoRoot,
          stampDir,
          "work",
          `${candidate.id}-loop-${loopIndex + 1}`,
        ),
        outputRelativePath: loopOut,
        sourceAbsolutePath,
        clip,
        ctaText: CLIP_549_LIVE_CTA,
        musicDecision,
        sharedMusicAbsolutePath:
          musicDecision.mode === "shared_set_bed" ? sharedBed : null,
        correction: decision.instruction,
      });
      if (!again.ok) {
        return { ok: false, message: `${candidate.id} correction failed: ${again.message}` };
      }
      finishingDeepgramUsd += again.spend.deepgramUsd;
      finishingElevenCredits += again.spend.elevenCredits;
      finishingStockUsd += again.spend.stockMediaUsd;
      finishSpend.deepgramUsd += again.spend.deepgramUsd;
      finishSpend.elevenCredits += again.spend.elevenCredits;
      finishSpend.stockMediaUsd += again.spend.stockMediaUsd;
      finishSpend.elapsedMs += again.spend.elapsedMs;
      previousKinds = decision.instruction.kinds;
      const next = await reviewRenderedShort({
        repoRoot,
        videoAbsolutePath: path.join(repoRoot, again.outputRelativePath),
        workDir: path.join(
          repoRoot,
          stampDir,
          "quality",
          candidate.id,
          `quality-${loopIndex + 1}`,
        ),
      });
      if ("ok" in next) {
        return { ok: false, message: `${candidate.id} correction Quality failed: ${next.message}` };
      }
      qualityDeepgramUsdDerived += deepgramUsdFromSeconds(again.inspect.durationSeconds);
      current = next;
      currentPath = again.outputRelativePath;
      finalPass = next.pass;
      corrections.push({
        loopIndex,
        route: decision.route,
        kinds: decision.instruction.kinds,
        outputRelativePath: again.outputRelativePath,
        qualityPass: next.pass,
        findings: next.findings.map((finding) => finding.code),
      });
      loopIndex += 1;
    }

    files.push({
      clipId: candidate.id,
      idea: candidate.idea,
      windowStart: candidate.windowStart,
      windowEnd: candidate.windowEnd,
      semanticScore: candidate.semanticScore,
      outputRelativePath: currentPath,
      outputBytes: existsSync(path.join(repoRoot, currentPath))
        ? statSync(path.join(repoRoot, currentPath)).size
        : null,
      width: 1080,
      height: 1920,
      finishSpend,
      firstQuality: {
        pass: firstQuality.pass,
        findings: firstQuality.findings.map((finding) => finding.code),
        inspectedRenderedMp4: true,
        renderedAbsolutePath: firstAbs,
      },
      corrections,
      finalPass,
    });
    writeFileSync(
      path.join(repoRoot, stampDir, "LIVE-FIVE-E2E.partial.json"),
      `${JSON.stringify({ completed: files.length, files, skippedUnfinishable }, null, 2)}\n`,
    );
  }

  if (files.length < 5) {
    const message = `Only ${files.length} clips finished after skip/promote. Need 5.`;
    writeFileSync(
      path.join(repoRoot, stampDir, "LIVE-FIVE-E2E-ERROR.json"),
      `${JSON.stringify({ message, skippedUnfinishable }, null, 2)}\n`,
    );
    return { ok: false, message };
  }

  const proof: Clip549LiveFiveProof = {
    ...baseProof(),
    discovery: {
      viableDistinctCount: discovery.viableDistinctCount,
      selectedIds: files.map((file) => file.clipId),
      selectedIdeas: files.map((file) => file.idea),
    },
    skippedUnfinishable,
    files,
    finishingDeepgramUsd: Number(finishingDeepgramUsd.toFixed(4)),
    finishingElevenCredits,
    finishingStockUsd: Number(finishingStockUsd.toFixed(4)),
    qualityDeepgramUsdDerived: Number(qualityDeepgramUsdDerived.toFixed(4)),
    wallClockMs: Date.now() - startedAt,
    allFiveRendered:
      files.length === 5 && files.every((file) => (file.outputBytes ?? 0) > 0),
    qualityInspectedAllFive: files.every(
      (file) => file.firstQuality.inspectedRenderedMp4,
    ),
    correctionReturnedThroughQuality: !anyCorrection || correctionReturnedThroughQuality,
  };
  writeFileSync(
    path.join(repoRoot, stampDir, "LIVE-FIVE-E2E.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  return { ok: true, proof };
}
