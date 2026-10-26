import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { overlayFlagshipBroll } from "../src/lib/studio-flagship-short-form-edit/broll";
import { FLAGSHIP_UPBEAT_BED_REL } from "../src/lib/studio-flagship-short-form-edit/music";
import { prepareFlagshipCustomerStyleSource } from "../src/lib/studio-flagship-short-form-edit/source-prep";
import { applyDotenvLocal } from "../src/lib/studio-short-form-video-editing/load-env-local";
import {
  runContentPackClip,
  type PackClipCorrection,
} from "../src/lib/studio-short-form-content-pack/clip";
import {
  machineDecideCorrection,
  type PackCorrectionKind,
} from "../src/lib/studio-short-form-content-pack/machine-corrections";
import { decidePackMusic } from "../src/lib/studio-short-form-content-pack/music-decision";
import { reviewRenderedShort, type QualityReview } from "../src/lib/studio-short-form-content-pack/quality-review";
import { contentPackCertIntake } from "../src/lib/studio-short-form-content-pack/scenario";

const STAMP =
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack";

function run(cmd: string, args: string[]) {
  try {
    execFileSync(cmd, args, { stdio: "pipe" });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: Buffer }).stderr)
        : "";
    throw new Error(stderr.slice(-800) || (error instanceof Error ? error.message : String(error)));
  }
}

function summary(review: QualityReview) {
  return {
    pass: review.pass,
    findings: review.findings.map((finding) => finding.code),
    visualKind: review.brollVisualKind,
    help: review.brollHelpDecision,
    heardMusic: review.heardMusicKind,
  };
}

async function main() {
  const repoRoot = process.cwd();
  applyDotenvLocal(repoRoot);
  const work = path.join(repoRoot, STAMP, "quality-eyes");
  mkdirSync(work, { recursive: true });
  const cherriesGood = path.join(repoRoot, STAMP, "review-loop/clip-02-cherries-loop-1.mp4");
  const dictionary = path.join(
    repoRoot,
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/broll/catalog/pexels-267669.jpg",
  );
  const cherriesStock = path.join(
    repoRoot,
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/broll/catalog/pexels-1307111.mp4",
  );
  if (!existsSync(cherriesGood) || !existsSync(dictionary) || !existsSync(cherriesStock)) {
    throw new Error("Need cherries loop-1, dictionary stock, and cherries stock.");
  }

  const source = prepareFlagshipCustomerStyleSource({ repoRoot });
  if (!source.ok) throw new Error(source.message);
  const intake = contentPackCertIntake();
  const musicDecision = decidePackMusic({
    spokenIdeas: intake.clips.map((clip) => clip.label),
    coordinatedSet: true,
  });
  const sharedBed = path.join(repoRoot, FLAGSHIP_UPBEAT_BED_REL);

  async function produce(job: {
    id: string;
    clipId: string;
    fileName: string;
    correction: PackClipCorrection;
  }) {
    const clip = intake.clips.find((row) => row.id === job.clipId);
    if (!clip) throw new Error(job.clipId);
    const produced = await runContentPackClip({
      repoRoot,
      workDir: path.join(work, `${job.id}-production`),
      outputRelativePath: `${STAMP}/quality-eyes/${job.fileName}`,
      sourceAbsolutePath: source.absolutePath,
      clip,
      ctaText: intake.ctaText,
      musicDecision,
      sharedMusicAbsolutePath:
        musicDecision.mode === "shared_set_bed" ? sharedBed : null,
      correction: job.correction,
    });
    if (!produced.ok) throw new Error(produced.message);
    return path.join(repoRoot, produced.outputRelativePath);
  }

  const cleanCherriesAbs = path.join(work, "clean-talking-head-cherries.mp4");
  const cleanLearnedAbs = path.join(work, "clean-speech-learned.mp4");
  const cleanCherries = existsSync(cleanCherriesAbs)
    ? cleanCherriesAbs
    : await produce({
        id: "clean-cherries",
        clipId: "clip-02-cherries",
        fileName: "clean-talking-head-cherries.mp4",
        correction: { omitBroll: true, omitMusic: false, brollTreatment: "none" },
      });
  const cleanLearned = existsSync(cleanLearnedAbs)
    ? cleanLearnedAbs
    : await produce({
        id: "clean-learned",
        clipId: "clip-03-learned",
        fileName: "clean-speech-learned.mp4",
        correction: { omitBroll: false, omitMusic: true, brollTreatment: null },
      });

  const weakAbs = path.join(work, "B-weak-dictionary.mp4");
  const weak = overlayFlagshipBroll({
    videoAbsolutePath: cleanCherries,
    brollAbsolutePath: dictionary,
    outputAbsolutePath: weakAbs,
    startSeconds: 1,
    endSeconds: 12,
    treatment: "picture_in_picture",
    mediaKind: "still",
  });
  if (!weak.ok) throw new Error(weak.message);

  const heavyAbs = path.join(work, "C-heavy-unstable.mp4");
  run("ffmpeg", [
    "-y",
    "-i",
    cleanCherries,
    "-stream_loop",
    "-1",
    "-i",
    cherriesStock,
    "-filter_complex",
    "[1:v]scale=900:720:force_original_aspect_ratio=increase,crop=900:720,format=yuv420p[br];[0:v][br]overlay=x='40+80*sin(2*PI*t)':y='180+70*sin(2*PI*t*0.7)':enable='between(t,0.4,14)'[v]",
    "-map",
    "[v]",
    "-map",
    "0:a",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    heavyAbs,
  ]);

  const drone = path.join(work, "somber-drone.m4a");
  run("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:sample_rate=48000:duration=20",
    "-af",
    "volume=0.7,lowpass=f=400,afade=t=in:st=0:d=0.4,afade=t=out:st=18.8:d=1.0",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    drone,
  ]);
  const wrongMusicAbs = path.join(work, "D-wrong-tone-music.mp4");
  run("ffmpeg", [
    "-y",
    "-i",
    cleanLearned,
    "-i",
    drone,
    "-filter_complex",
    "[1:a]volume=1.8,lowpass=f=400[d];[0:a]volume=0.85[s];[s][d]amix=inputs=2:duration=first:normalize=0[a]",
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    wrongMusicAbs,
  ]);

  const firstPass = [];
  const corrections = [];
  const cases: Array<{
    id: string;
    file: string;
    clipId: string;
  }> = [
    { id: "A-cherries-match", file: cherriesGood, clipId: "clip-02-cherries" },
    { id: "B-weak-dictionary", file: weakAbs, clipId: "clip-02-cherries" },
    { id: "C-heavy-unstable", file: heavyAbs, clipId: "clip-02-cherries" },
    { id: "D-wrong-tone-music", file: wrongMusicAbs, clipId: "clip-03-learned" },
  ];

  for (const row of cases) {
    const review = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: row.file,
      workDir: path.join(work, `${row.id}-quality-0`),
    });
    if ("ok" in review) throw new Error(review.message);
    const decision = machineDecideCorrection({
      review,
      loopIndex: 0,
      previousKinds: [],
    });
    firstPass.push({
      id: row.id,
      ...summary(review),
      decision: decision.route,
      kinds: decision.route === "production" ? decision.instruction.kinds : [],
      owner: "owner" in decision ? decision.owner : false,
      scout: "scout" in decision ? decision.scout : false,
    });
    if (row.id === "A-cherries-match" || process.argv.includes("--first-pass-only")) continue;
    if (decision.route !== "production") {
      corrections.push({
        id: row.id,
        skipped: true,
        reason: decision.route,
      });
      continue;
    }
    const previousKinds: PackCorrectionKind[] = [];
    let loopIndex = 0;
    let current = decision;
    let lastReview = review;
    while (current.route === "production" && loopIndex < 2) {
      const output = await produce({
        id: `${row.id}-loop-${loopIndex + 1}`,
        clipId: row.clipId,
        fileName: `${row.id}-corrected.mp4`,
        correction: {
          omitBroll: current.instruction.omitBroll,
          omitMusic: current.instruction.omitMusic,
          brollTreatment: current.instruction.brollTreatment,
        },
      });
      previousKinds.push(...current.instruction.kinds);
      const again = await reviewRenderedShort({
        repoRoot,
        videoAbsolutePath: output,
        workDir: path.join(work, `${row.id}-quality-${loopIndex + 1}`),
      });
      if ("ok" in again) throw new Error(again.message);
      lastReview = again;
      loopIndex += 1;
      current = machineDecideCorrection({
        review: again,
        loopIndex,
        previousKinds,
      });
      if (again.pass) break;
    }
    corrections.push({
      id: row.id,
      loops: loopIndex,
      finalRoute: current.route,
      ...summary(lastReview),
      owner: "owner" in current ? current.owner : false,
      scout: "scout" in current ? current.scout : false,
    });
  }

  const proof = {
    publicCatalogSwitched: false,
    doNotStartClip: true,
    cherriesTypeSpecificityHandled: firstPass.some(
      (row) =>
        row.id === "A-cherries-match" &&
        row.visualKind === "fruit_or_produce" &&
        !row.findings.includes("broll_visual_mismatch"),
    ),
    weakBrollOmitted: firstPass.some(
      (row) =>
        row.id === "B-weak-dictionary" &&
        (row.findings.includes("broll_visual_mismatch") ||
          row.findings.includes("broll_weak_generic")) &&
        row.kinds.includes("omit_broll"),
    ),
    unstableTreatmentRejected: firstPass.some(
      (row) =>
        row.id === "C-heavy-unstable" &&
        (row.findings.includes("broll_bouncing") ||
          row.findings.includes("broll_visually_heavy") ||
          row.findings.includes("broll_obstructs_speaker") ||
          row.findings.includes("broll_placement_inconsistent")) &&
        (row.kinds.includes("switch_broll_treatment") || row.kinds.includes("omit_broll")),
    ),
    wrongToneRejected: firstPass.some(
      (row) =>
        row.id === "D-wrong-tone-music" &&
        row.findings.includes("music_wrong_tone") &&
        row.kinds.includes("omit_music"),
    ),
    reinspectAfterCorrection: corrections
      .filter((row) => "pass" in row)
      .every((row) => row.pass === true),
    firstPass,
    corrections,
    routineWithoutScout: firstPass.every((row) => !row.scout),
    routineWithoutOwner: firstPass.every((row) => !row.owner),
  };
  writeFileSync(path.join(work, "QUALITY-EYES-PROOF.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
