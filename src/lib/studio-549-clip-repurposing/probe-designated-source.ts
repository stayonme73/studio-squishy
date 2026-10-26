import { readFileSync } from "fs";
import path from "path";

import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

import { discoverClip549Set } from "./discovery";

export const DESIGNATED_CLIP_SOURCE_REL =
  "docs/launch/studio-operating-clip-repurposing-build-1/live-sources/positive-live-source.mp4.mp4" as const;

export const DESIGNATED_TRANSCRIPT_REL =
  "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/positive-transcript-words.json" as const;

export function loadDesignatedClipTranscript(repoRoot: string) {
  const saved = JSON.parse(
    readFileSync(path.join(repoRoot, DESIGNATED_TRANSCRIPT_REL), "utf8"),
  ) as {
    requestId?: string;
    durationSeconds: number;
    estimatedUsdList: number;
    estimatedUsdOptOutCeiling?: number;
    wordCount: number;
    words: SpeechWord[];
  };
  return saved;
}

export function discoverDesignatedClipSource(repoRoot: string) {
  const saved = loadDesignatedClipTranscript(repoRoot);
  const sentences = buildTranscriptSentences(saved.words);
  const discovery = discoverClip549Set({
    sourceDurationSeconds: saved.durationSeconds,
    sentences,
  });
  return { saved, sentences, discovery };
}
