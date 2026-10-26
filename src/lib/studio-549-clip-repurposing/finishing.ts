import path from "path";

import { FLAGSHIP_UPBEAT_BED_REL } from "@/lib/studio-flagship-short-form-edit/music";
import { runContentPackClip, type PackClipResult } from "@/lib/studio-short-form-content-pack/clip";
import type { ContentPackIdentifiedClip } from "@/lib/studio-short-form-content-pack/intake";
import { decidePackMusic } from "@/lib/studio-short-form-content-pack/music-decision";
import type { SetCandidate } from "@/lib/studio-clip-repurposing/types";
import { clipCorrectionFromDirection } from "@/lib/studio-video-creative-direction/apply-to-production";
import type { StudioVideoCreativeDirectionV1 } from "@/lib/studio-video-creative-direction/contract";

export type Clip549FinishedFile = {
  clipId: string;
  idea: string;
  outputRelativePath: string;
  width: 1080;
  height: 1920;
  extrasIncluded: {
    postCaptions: false;
    coverGraphics: false;
    useGuide: false;
  };
};

export function identifiedClipFromCandidate(
  candidate: SetCandidate,
  sourceRelativePath: string,
): ContentPackIdentifiedClip {
  return {
    id: candidate.id,
    label: candidate.idea.slice(0, 80),
    sourceRelativePath,
    startSeconds: candidate.windowStart,
    endSeconds: candidate.windowEnd,
    rightsCleared: true,
  };
}

export async function finishClip549Set(input: {
  repoRoot: string;
  stampDir: string;
  sourceAbsolutePath: string;
  sourceRelativePath: string;
  selected: readonly SetCandidate[];
  ctaText: string;
  direction?: StudioVideoCreativeDirectionV1 | null;
  produceClip?: typeof runContentPackClip;
}): Promise<
  | { ok: true; files: Clip549FinishedFile[]; hitchhikedLane: "v2-rtu-short-form-video-edit" }
  | { ok: false; message: string }
> {
  if (input.selected.length < 3 || input.selected.length > 5) {
    return {
      ok: false,
      message: "Finishing begins only for 3 to 5 strong standalone shorts. Do not manufacture filler.",
    };
  }
  const produce = input.produceClip ?? runContentPackClip;
  const musicDecision = decidePackMusic({
    spokenIdeas: input.selected.map((candidate) => candidate.idea),
    coordinatedSet: true,
  });
  const sharedBed = path.join(input.repoRoot, FLAGSHIP_UPBEAT_BED_REL);
  const files: Clip549FinishedFile[] = [];
  const correction = input.direction
    ? clipCorrectionFromDirection(input.direction)
    : null;

  for (const candidate of input.selected) {
    const clip = identifiedClipFromCandidate(candidate, input.sourceRelativePath);
    const produced = await produce({
      repoRoot: input.repoRoot,
      workDir: path.join(input.repoRoot, input.stampDir, "work", clip.id),
      outputRelativePath: `${input.stampDir}/delivery/${clip.id}.mp4`,
      sourceAbsolutePath: input.sourceAbsolutePath,
      clip,
      ctaText: input.ctaText,
      musicDecision,
      sharedMusicAbsolutePath:
        musicDecision.mode === "shared_set_bed" ? sharedBed : null,
      direction: input.direction ?? null,
      correction,
    });
    if (!produced.ok) return produced;
    files.push(toFinishedFile(produced, candidate.idea));
  }
  return {
    ok: true,
    files,
    hitchhikedLane: "v2-rtu-short-form-video-edit",
  };
}

function toFinishedFile(
  produced: PackClipResult,
  idea: string,
): Clip549FinishedFile {
  return {
    clipId: produced.clipId,
    idea,
    outputRelativePath: produced.outputRelativePath,
    width: 1080,
    height: 1920,
    extrasIncluded: {
      postCaptions: false,
      coverGraphics: false,
      useGuide: false,
    },
  };
}
