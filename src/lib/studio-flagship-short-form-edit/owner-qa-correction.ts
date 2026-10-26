/**
 * Smallest Owner-QA correction: reuse the cherries first-cut range,
 * the already-minted Eleven bed, and the approved caption words.
 * Does not remint music. Does not rerun Discovery/Deepgram.
 */

import { execFileSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import {
  assembleBurnedShort,
  exactWords,
  paintExactCtaCard,
} from "@/lib/studio-short-form-video-editing/caption-burn";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import type { EditDecisionList, TimedCaption } from "@/lib/studio-short-form-video-editing/types";

import {
  chooseFlagshipBrollTreatment,
  overlayFlagshipBroll,
  type FlagshipBrollAsset,
} from "./broll";
import { inspectFlagshipRender } from "./inspect";
import {
  FLAGSHIP_MUSIC_PROMPT,
  mixMusicUnderSpeech,
  planFlagshipMusicFade,
  resolveFlagshipMusicBed,
} from "./music";
import { landFlagshipSpeakerEndCue, writeFlagshipSpeakerEndCue } from "./speaker-finish";
import { FLAGSHIP_SOURCE_META } from "./source-prep";
import { resolveStudioSourcedBroll } from "./studio-stock";
import { applyHookPunchIn } from "./visual";

const PROOF_REL =
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1" as const;

function parseAssSeconds(stamp: string): number {
  const [h, m, rest] = stamp.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(rest);
}

function captionsFromAss(assText: string): TimedCaption[] {
  return assText
    .split(/\r?\n/)
    .filter((line) => line.startsWith("Dialogue:"))
    .map((line, index) => {
      const parts = line.split(",");
      const start = parseAssSeconds(parts[1] ?? "0:00:00.00");
      const end = parseAssSeconds(parts[2] ?? "0:00:00.00");
      const text = parts.slice(9).join(",").trim();
      return {
        start,
        end,
        text,
        role: index === 0 ? ("hook" as const) : ("speech" as const),
      };
    });
}

export async function runFlagshipOwnerQaCorrection(input: {
  repoRoot: string;
}): Promise<
  | {
      ok: true;
      outputRelativePath: string;
      hookText: string;
      musicMethod: string;
      musicGain: number;
      plannedBedMeanDb: number | null;
      brollTreatment: string;
      brollId: string;
      inspect: ReturnType<typeof inspectFlagshipRender>;
      reusedElevenBed: true;
      remintedEleven: false;
    }
  | { ok: false; message: string }
> {
  applyDotenvLocal(input.repoRoot);
  const proofDir = path.join(input.repoRoot, PROOF_REL);
  const rangeCut = path.join(proofDir, "work/first-cut/range-cut.mp4");
  const assPath = path.join(proofDir, "work/first-cut/burn/speech.ass");
  if (!existsSync(rangeCut) || !existsSync(assPath)) {
    return {
      ok: false,
      message: "First-cut range or captions missing. Cannot correct without reminting the whole job.",
    };
  }

  const captions = captionsFromAss(readFileSync(assPath, "utf8"));
  if (!captions.length) {
    return { ok: false, message: "Could not read approved first-cut captions." };
  }
  const lastSpeech = captions[captions.length - 1]!;
  const ctaHold = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
  const speechEnd = lastSpeech.end;
  const ctaText = FLAGSHIP_SOURCE_META.customerCta;
  const edl: EditDecisionList = {
    ok: true,
    sourceDurationSeconds: speechEnd,
    outputDurationSeconds: speechEnd + ctaHold,
    clips: [
      {
        sourceTrim: 0,
        sourceLength: speechEnd,
        timelineStart: 0,
        timelineLength: speechEnd,
        text: captions.map((caption) => caption.text).join(" "),
        role: "hook",
      },
    ],
    captions: [
      ...captions,
      {
        start: speechEnd,
        end: speechEnd + ctaHold,
        text: ctaText,
        role: "cta",
      },
    ],
    droppedFalseStarts: 0,
    droppedDeadSpaceSeconds: 0,
    selection: "performance_watch",
  };

  const workDir = path.join(proofDir, "work/corrected-speaker-listen");
  mkdirSync(workDir, { recursive: true });
  const reusedPunched = path.join(
    proofDir,
    "work/corrected-owner-qa/punched.mp4",
  );
  let punched = reusedPunched;
  let brollTreatment = "picture_in_picture";
  let brollId = "pexels-1307111.mp4";

  if (!existsSync(reusedPunched)) {
  const studio = await resolveStudioSourcedBroll({
    repoRoot: input.repoRoot,
    spokenIdea: captions.map((caption) => caption.text).join(" "),
  });
  if (!studio.ok) return studio;
  if (!studio.use) {
    return { ok: false, message: studio.reason };
  }
  const asset: FlagshipBrollAsset = studio.asset;
  const treatment = chooseFlagshipBrollTreatment(asset);
  const storyCaption =
    captions.find((caption) =>
      asset.supportsSpokenIdea
        .toLowerCase()
        .split(/[\s,/]+/)
        .filter((token) => token.length > 3)
        .some((token) => caption.text.toLowerCase().includes(token)),
    ) ?? captions[1] ?? captions[0]!;
  const brollStart = storyCaption.start + 0.08;
  const brollEnd = Math.min(speechEnd - 1.2, brollStart + 2.2);
  const withBroll = path.join(workDir, "with-broll.mp4");
  const over = overlayFlagshipBroll({
    videoAbsolutePath: rangeCut,
    brollAbsolutePath: asset.absolutePath,
    outputAbsolutePath: withBroll,
    startSeconds: brollStart,
    endSeconds: brollEnd,
    treatment,
    mediaKind: asset.mediaKind,
  });
  if (!over.ok) return over;

  const burned = await assembleBurnedShort({
    sourceAbsolutePath: withBroll,
    edl,
    workDirectory: path.join(workDir, "burn"),
    outputAbsolutePath: path.join(workDir, "burned.mp4"),
    approvedCta: ctaText,
    transcriptWordsInRange: exactWords(
      captions.map((caption) => caption.text).join(" "),
    ),
    ctaHoldSeconds: ctaHold,
  });
  if (!burned.ok) return burned;

  punched = path.join(workDir, "punched.mp4");
  const punch = applyHookPunchIn({
    videoAbsolutePath: burned.outputAbsolutePath,
    outputAbsolutePath: punched,
    hookSeconds: 2.2,
  });
  if (!punch.ok) return punch;
  brollTreatment = over.treatment;
  brollId = path.basename(asset.absolutePath);
  }

  const music = await resolveFlagshipMusicBed({
    repoRoot: input.repoRoot,
    durationSeconds: edl.outputDurationSeconds,
    reuseExisting: false,
  });
  if (!music.ok) return music;
  const mixed = path.join(workDir, "mixed.mp4");
  const mix = mixMusicUnderSpeech({
    videoAbsolutePath: punched,
    musicAbsolutePath: music.absolutePath,
    outputAbsolutePath: mixed,
    speechEndSeconds: speechEnd,
  });
  if (!mix.ok) return mix;

  const cueWav = path.join(workDir, "speaker-end-cue.wav");
  const cueWritten = writeFlagshipSpeakerEndCue(cueWav);
  if (!cueWritten.ok) return cueWritten;
  const withCue = path.join(workDir, "mixed-with-cue.mp4");
  const landed = landFlagshipSpeakerEndCue({
    videoAbsolutePath: mixed,
    cueAbsolutePath: cueWav,
    outputAbsolutePath: withCue,
    atSeconds: speechEnd,
  });
  if (!landed.ok) return landed;

  const finalRel = `${PROOF_REL}/corrected-upbeat-fit.mp4`;
  const finalAbs = path.join(input.repoRoot, finalRel);
  mkdirSync(path.dirname(finalAbs), { recursive: true });
  copyFileSync(withCue, finalAbs);

  const inspect = inspectFlagshipRender({
    repoRoot: input.repoRoot,
    videoAbsolutePath: finalAbs,
    workDirectory: path.join(proofDir, "watch/corrected-upbeat-fit"),
  });
  const fade = planFlagshipMusicFade(speechEnd);

  const result = {
    ok: true as const,
    outputRelativePath: finalRel,
    hookText: captions[0]!.text,
    musicMethod: music.method,
    musicPrompt: FLAGSHIP_MUSIC_PROMPT,
    musicGain: mix.gain,
    plannedBedMeanDb: mix.plannedBedMeanDb,
    fade,
    elevenCredits: music.estimatedCredits,
    brollTreatment,
    brollId,
    inspect,
    reusedElevenBed: false as const,
    remintedEleven: true as const,
    visualsUnchanged: true as const,
  };
  writeFileSync(
    path.join(proofDir, "corrected-upbeat-fit.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  return result;
}

/** Studio champagne pill. Not the shared teal CTA used by other lanes. */
export const FLAGSHIP_STUDIO_CTA_PILL = "#C8B59B" as const;
export const FLAGSHIP_STUDIO_CTA_TEXT = "#2E2B28" as const;

/**
 * Recolor only the Studio ending card. Reuses the approved cherries picture
 * and the upbeat Eleven bed. Does not remint music.
 */
export async function runFlagshipCtaRecolor(input: {
  repoRoot: string;
}): Promise<
  | {
      ok: true;
      outputRelativePath: string;
      ctaPill: string;
      ctaText: string;
      remintedEleven: false;
      inspect: ReturnType<typeof inspectFlagshipRender>;
    }
  | { ok: false; message: string }
> {
  applyDotenvLocal(input.repoRoot);
  const proofDir = path.join(input.repoRoot, PROOF_REL);
  const assPath = path.join(proofDir, "work/first-cut/burn/speech.ass");
  const burnedCued = path.join(proofDir, "work/corrected-owner-qa/burn/burned-cued.mp4");
  if (!existsSync(assPath) || !existsSync(burnedCued)) {
    return { ok: false, message: "Approved cherries cut is missing. Cannot recolor the ending." };
  }
  const captions = captionsFromAss(readFileSync(assPath, "utf8"));
  const lastSpeech = captions[captions.length - 1];
  if (!lastSpeech) return { ok: false, message: "No speech captions to land the CTA after." };
  const speechEnd = lastSpeech.end;
  const ctaHold = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
  const offer = studioShortFormVideoEditingBuildV1.offer;
  const workDir = path.join(proofDir, "work/corrected-cta-color");
  mkdirSync(workDir, { recursive: true });

  const ctaPng = path.join(workDir, "cta-card.png");
  const painted = await paintExactCtaCard({
    text: FLAGSHIP_SOURCE_META.customerCta,
    outputAbsolutePath: ctaPng,
    width: offer.width,
    height: offer.height,
    fontSize: 48,
    fill: FLAGSHIP_STUDIO_CTA_TEXT,
    background: FLAGSHIP_STUDIO_CTA_PILL,
  });
  if (!painted.ok) return painted;

  const endCard = path.join(workDir, "end-card.mp4");
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        ctaPng,
        "-f",
        "lavfi",
        "-i",
        `anullsrc=r=48000:cl=stereo:d=${ctaHold}`,
        "-t",
        String(ctaHold),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-shortest",
        endCard,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `End-card color render failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  const concatenated = path.join(workDir, "concat.mp4");
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        burnedCued,
        "-i",
        endCard,
        "-filter_complex",
        "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        concatenated,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `CTA concat failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  const punched = path.join(workDir, "punched.mp4");
  const punch = applyHookPunchIn({
    videoAbsolutePath: concatenated,
    outputAbsolutePath: punched,
    hookSeconds: 2.2,
  });
  if (!punch.ok) return punch;

  const music = await resolveFlagshipMusicBed({
    repoRoot: input.repoRoot,
    durationSeconds: speechEnd + ctaHold,
    reuseExisting: true,
  });
  if (!music.ok) return music;
  const mixed = path.join(workDir, "mixed.mp4");
  const mix = mixMusicUnderSpeech({
    videoAbsolutePath: punched,
    musicAbsolutePath: music.absolutePath,
    outputAbsolutePath: mixed,
    speechEndSeconds: speechEnd,
  });
  if (!mix.ok) return mix;

  const cueWav = path.join(workDir, "speaker-end-cue.wav");
  const cueWritten = writeFlagshipSpeakerEndCue(cueWav);
  if (!cueWritten.ok) return cueWritten;
  const withCue = path.join(workDir, "mixed-with-cue.mp4");
  const landed = landFlagshipSpeakerEndCue({
    videoAbsolutePath: mixed,
    cueAbsolutePath: cueWav,
    outputAbsolutePath: withCue,
    atSeconds: speechEnd,
  });
  if (!landed.ok) return landed;

  const finalRel = `${PROOF_REL}/corrected-cta-color.mp4`;
  const finalAbs = path.join(input.repoRoot, finalRel);
  copyFileSync(withCue, finalAbs);
  const inspect = inspectFlagshipRender({
    repoRoot: input.repoRoot,
    videoAbsolutePath: finalAbs,
    workDirectory: path.join(proofDir, "watch/corrected-cta-color"),
  });
  const result = {
    ok: true as const,
    outputRelativePath: finalRel,
    ctaPill: FLAGSHIP_STUDIO_CTA_PILL,
    ctaText: FLAGSHIP_STUDIO_CTA_TEXT,
    remintedEleven: false as const,
    inspect,
  };
  writeFileSync(
    path.join(proofDir, "corrected-cta-color.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  return result;
}

/**
 * Same cherries cut and champagne Studio ending. Speech words only —
 * no caption rectangle. Dark stroke keeps them readable on the wall.
 */
export async function runFlagshipBareCaptions(input: {
  repoRoot: string;
}): Promise<
  | {
      ok: true;
      outputRelativePath: string;
      captionBox: "hidden";
      remintedEleven: false;
      inspect: ReturnType<typeof inspectFlagshipRender>;
    }
  | { ok: false; message: string }
> {
  applyDotenvLocal(input.repoRoot);
  const proofDir = path.join(input.repoRoot, PROOF_REL);
  const assPath = path.join(proofDir, "work/first-cut/burn/speech.ass");
  const withBroll = path.join(proofDir, "work/corrected-owner-qa/with-broll.mp4");
  if (!existsSync(assPath) || !existsSync(withBroll)) {
    return { ok: false, message: "Approved cherries cut is missing." };
  }
  const captions = captionsFromAss(readFileSync(assPath, "utf8"));
  const lastSpeech = captions[captions.length - 1];
  if (!lastSpeech) return { ok: false, message: "No speech captions." };
  const speechEnd = lastSpeech.end;
  const ctaHold = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
  const ctaText = FLAGSHIP_SOURCE_META.customerCta;
  const edl: EditDecisionList = {
    ok: true,
    sourceDurationSeconds: speechEnd,
    outputDurationSeconds: speechEnd + ctaHold,
    clips: [
      {
        sourceTrim: 0,
        sourceLength: speechEnd,
        timelineStart: 0,
        timelineLength: speechEnd,
        text: captions.map((caption) => caption.text).join(" "),
        role: "hook",
      },
    ],
    captions: [
      ...captions,
      {
        start: speechEnd,
        end: speechEnd + ctaHold,
        text: ctaText,
        role: "cta",
      },
    ],
    droppedFalseStarts: 0,
    droppedDeadSpaceSeconds: 0,
    selection: "performance_watch",
  };

  const workDir = path.join(proofDir, "work/corrected-bare-captions");
  mkdirSync(workDir, { recursive: true });
  const burned = await assembleBurnedShort({
    sourceAbsolutePath: withBroll,
    edl,
    workDirectory: path.join(workDir, "burn"),
    outputAbsolutePath: path.join(workDir, "burned.mp4"),
    approvedCta: ctaText,
    transcriptWordsInRange: exactWords(
      captions.map((caption) => caption.text).join(" "),
    ),
    ctaHoldSeconds: ctaHold,
    captionBackground: "transparent",
    captionStroke: "#111111",
    ctaFill: FLAGSHIP_STUDIO_CTA_TEXT,
    ctaBackground: FLAGSHIP_STUDIO_CTA_PILL,
  });
  if (!burned.ok) return burned;

  const punched = path.join(workDir, "punched.mp4");
  const punch = applyHookPunchIn({
    videoAbsolutePath: burned.outputAbsolutePath,
    outputAbsolutePath: punched,
    hookSeconds: 2.2,
  });
  if (!punch.ok) return punch;

  const music = await resolveFlagshipMusicBed({
    repoRoot: input.repoRoot,
    durationSeconds: edl.outputDurationSeconds,
    reuseExisting: true,
  });
  if (!music.ok) return music;
  const mixed = path.join(workDir, "mixed.mp4");
  const mix = mixMusicUnderSpeech({
    videoAbsolutePath: punched,
    musicAbsolutePath: music.absolutePath,
    outputAbsolutePath: mixed,
    speechEndSeconds: speechEnd,
  });
  if (!mix.ok) return mix;

  const cueWav = path.join(workDir, "speaker-end-cue.wav");
  const cueWritten = writeFlagshipSpeakerEndCue(cueWav);
  if (!cueWritten.ok) return cueWritten;
  const withCue = path.join(workDir, "mixed-with-cue.mp4");
  const landed = landFlagshipSpeakerEndCue({
    videoAbsolutePath: mixed,
    cueAbsolutePath: cueWav,
    outputAbsolutePath: withCue,
    atSeconds: speechEnd,
  });
  if (!landed.ok) return landed;

  const finalRel = `${PROOF_REL}/corrected-bare-captions.mp4`;
  const finalAbs = path.join(input.repoRoot, finalRel);
  copyFileSync(withCue, finalAbs);
  const inspect = inspectFlagshipRender({
    repoRoot: input.repoRoot,
    videoAbsolutePath: finalAbs,
    workDirectory: path.join(proofDir, "watch/corrected-bare-captions"),
  });
  const result = {
    ok: true as const,
    outputRelativePath: finalRel,
    captionBox: "hidden" as const,
    remintedEleven: false as const,
    inspect,
  };
  writeFileSync(
    path.join(proofDir, "corrected-bare-captions.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  return result;
}
