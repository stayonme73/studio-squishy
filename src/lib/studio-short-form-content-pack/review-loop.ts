import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioShortFormContentPackFactoryReviewLoopV1 as loop } from "@/config/studio-short-form-content-pack-factory-review-loop-v1";
import { FLAGSHIP_UPBEAT_BED_REL } from "@/lib/studio-flagship-short-form-edit/music";
import { prepareFlagshipCustomerStyleSource } from "@/lib/studio-flagship-short-form-edit/source-prep";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";

import { runContentPackClip, type PackClipResult } from "./clip";
import {
  machineDecideCorrection,
  type PackCorrectionKind,
  type PackMachineDecision,
} from "./machine-corrections";
import { decidePackMusic } from "./music-decision";
import {
  reviewRenderedShort,
  type QualityFinding,
  type QualityReview,
} from "./quality-review";
import { contentPackCertIntake } from "./scenario";

export type ReviewLoopClipProof = {
  clipId: string;
  fixtureRelativePath: string;
  firstQuality: {
    pass: boolean;
    findings: QualityFinding[];
    openingText: string;
    endingText: string;
    ownerClassesDetected: string[];
    ownerClassesMissed: string[];
  };
  rounds: Array<{
    loopIndex: number;
    decision: PackMachineDecision;
    outputRelativePath?: string;
    quality?: Pick<QualityReview, "pass" | "findings" | "openingText" | "endingText">;
  }>;
  finalPass: boolean;
  routedToOwner: boolean;
  routedToScout: boolean;
};

export type ReviewLoopProof = {
  publicCatalogSwitched: false;
  doNotStartClip: true;
  scoutRoutineEditor: false;
  ownerFirstLineQa: false;
  clips: ReviewLoopClipProof[];
  routineWithoutScout: boolean;
  routineWithoutOwner: boolean;
};

function ownerClassesFor(clipId: string): string[] {
  return (
    loop.fixtureClips.find((fixture) => fixture.id === clipId)?.ownerFindingClasses.slice() ?? []
  );
}

function detectedOwnerClasses(findings: QualityFinding[], clipId: string): {
  ownerClassesDetected: string[];
  ownerClassesMissed: string[];
} {
  const codes = new Set(findings.map((finding) => finding.code));
  const expected = ownerClassesFor(clipId);
  return {
    ownerClassesDetected: expected.filter((code) => codes.has(code as QualityFinding["code"])),
    ownerClassesMissed: expected.filter((code) => !codes.has(code as QualityFinding["code"])),
  };
}

export async function runContentPackFactoryReviewLoop(input: {
  repoRoot: string;
  stampDir?: string;
}): Promise<ReviewLoopProof | { ok: false; message: string }> {
  applyDotenvLocal(input.repoRoot);
  const source = prepareFlagshipCustomerStyleSource({ repoRoot: input.repoRoot });
  if (!source.ok) return source;
  const stampDir = input.stampDir ?? loop.stampDir;
  const intake = contentPackCertIntake();
  const musicDecision = decidePackMusic({
    spokenIdeas: intake.clips.map((clip) => clip.label),
    coordinatedSet: true,
  });
  const sharedBed = path.join(input.repoRoot, FLAGSHIP_UPBEAT_BED_REL);
  const proofs: ReviewLoopClipProof[] = [];

  for (const fixture of loop.fixtureClips) {
    const intakeClip = intake.clips.find((clip) => clip.id === fixture.id);
    if (!intakeClip) {
      return { ok: false, message: `Fixture ${fixture.id} is not in the cert intake.` };
    }
    const workRoot = path.join(input.repoRoot, stampDir, "review-loop", fixture.id);
    mkdirSync(workRoot, { recursive: true });
    console.log(`Quality inspect ${fixture.id}`);
    const first = await reviewRenderedShort({
      repoRoot: input.repoRoot,
      videoAbsolutePath: path.join(input.repoRoot, fixture.sourceRelativePath),
      workDir: path.join(workRoot, "quality-0"),
    });
    if ("ok" in first) return first;
    const owner = detectedOwnerClasses(first.findings, fixture.id);
    writeFileSync(
      path.join(workRoot, "quality-0.json"),
      `${JSON.stringify({ ...first, ...owner }, null, 2)}\n`,
    );
    const rounds: ReviewLoopClipProof["rounds"] = [];
    let current = first;
    let previousKinds: PackCorrectionKind[] = [];
    let finalPass = first.pass;
    let routedToOwner = false;
    let routedToScout = false;
    let loopIndex = 0;
    while (!current.pass && loopIndex < loop.maxInternalCorrectionLoops + 1) {
      const decision = machineDecideCorrection({
        review: current,
        loopIndex,
        previousKinds,
      });
      if (decision.route === "pass") {
        finalPass = true;
        rounds.push({ loopIndex, decision });
        break;
      }
      if (decision.route === "escalate_owner") {
        routedToOwner = true;
        rounds.push({ loopIndex, decision });
        break;
      }
      if (decision.route === "escalate_scout") {
        routedToScout = true;
        rounds.push({ loopIndex, decision });
        break;
      }
      console.log(`Production ${fixture.id} ${decision.instruction.kinds.join(",")}`);
      const outputRelativePath = `${stampDir}/review-loop/${fixture.id}-loop-${loopIndex + 1}.mp4`;
      let produced: Awaited<ReturnType<typeof runContentPackClip>> | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        produced = await runContentPackClip({
          repoRoot: input.repoRoot,
          workDir: path.join(workRoot, `production-${loopIndex + 1}`),
          outputRelativePath,
          sourceAbsolutePath: source.absolutePath,
          clip: intakeClip,
          ctaText: intake.ctaText,
          musicDecision,
          sharedMusicAbsolutePath:
            musicDecision.mode === "shared_set_bed" ? sharedBed : null,
          correction: decision.instruction,
        });
        if (produced.ok) break;
        if (!/fetch failed/i.test(produced.message)) break;
      }
      if (!produced || !produced.ok) return produced ?? { ok: false, message: "Production did not run." };
      previousKinds = decision.instruction.kinds;
      const next = await reviewRenderedShort({
        repoRoot: input.repoRoot,
        videoAbsolutePath: path.join(input.repoRoot, produced.outputRelativePath),
        workDir: path.join(workRoot, `quality-${loopIndex + 1}`),
      });
      if ("ok" in next) return next;
      current = next;
      finalPass = next.pass;
      rounds.push({
        loopIndex,
        decision,
        outputRelativePath: produced.outputRelativePath,
        quality: {
          pass: next.pass,
          findings: next.findings,
          openingText: next.openingText,
          endingText: next.endingText,
        },
      });
      loopIndex += 1;
    }

    proofs.push({
      clipId: fixture.id,
      fixtureRelativePath: fixture.sourceRelativePath,
      firstQuality: {
        pass: first.pass,
        findings: first.findings,
        openingText: first.openingText,
        endingText: first.endingText,
        ...owner,
      },
      rounds,
      finalPass,
      routedToOwner,
      routedToScout,
    });
  }

  const proof: ReviewLoopProof = {
    publicCatalogSwitched: false,
    doNotStartClip: true,
    scoutRoutineEditor: false,
    ownerFirstLineQa: false,
    clips: proofs,
    routineWithoutScout: proofs.every((clip) => !clip.routedToScout),
    routineWithoutOwner: proofs.every((clip) => !clip.routedToOwner),
  };
  writeFileSync(
    path.join(input.repoRoot, stampDir, "FACTORY-REVIEW-LOOP.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  return proof;
}

export function summarizePackClipResult(result: PackClipResult): string {
  return `${result.clipId} ${result.openingText} → ${result.endingText}`;
}
