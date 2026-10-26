import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

import { discoverClipSet } from "./set-discovery";

const NAMED = [
  { id: "ten_vs_fifty", needle: /10 things|fifty|50 things/i },
  { id: "project_manager", needle: /project manager/i },
  { id: "finished_not_fancy", needle: /finished does not mean fancy|feel finished/i },
  { id: "cheap_twice", needle: /cheap can become|paid twice/i },
  { id: "button_wrong_place", needle: /button in the wrong place/i },
] as const;

export function rerankSavedPositiveTranscript(repoRoot: string) {
  const proof = path.join(
    repoRoot,
    "docs/launch/studio-operating-clip-repurposing-build-1/live-proof",
  );
  const wordsPath = path.join(proof, "positive-transcript-words.json");
  const priorPath = path.join(proof, "positive-set-discovery.json");
  if (!existsSync(wordsPath)) {
    throw new Error("Existing positive transcript is missing. Do not invent one.");
  }
  const saved = JSON.parse(readFileSync(wordsPath, "utf8")) as {
    words: SpeechWord[];
    durationSeconds: number;
  };
  const sentences = buildTranscriptSentences(saved.words);
  const result = discoverClipSet({
    sourceDurationSeconds: saved.durationSeconds,
    sentences,
  });
  const prior = existsSync(priorPath)
    ? (JSON.parse(readFileSync(priorPath, "utf8")) as {
        selected?: Array<{ idea?: string }>;
        viableCount?: number;
      })
    : { selected: [], viableCount: 2 };

  const inspectNamed = NAMED.map((row) => {
    const hits = [...result.selected, ...result.alternates, ...result.rejected].filter((candidate) =>
      row.needle.test(`${candidate.idea} ${candidate.bodyText}`),
    );
    const best = hits.sort((left, right) => right.semanticScore - left.semanticScore)[0];
    return {
      id: row.id,
      found: Boolean(best),
      selected: result.selected.some((candidate) =>
        row.needle.test(`${candidate.idea} ${candidate.bodyText}`),
      ),
      status: best?.rejectionReason ?? (best ? "kept" : "not_found"),
      semanticScore: best?.semanticScore ?? null,
      hookWordBonus: best?.hookWordBonus ?? null,
      claim: best?.claim ?? null,
      whyViewerCares: best?.whyViewerCares ?? null,
    };
  });

  const compact = {
    paidProduction: false,
    transcriptUnchanged: true,
    sourceSeconds: saved.durationSeconds,
    priorViableCount: prior.viableCount ?? 2,
    priorSelected: (prior.selected ?? []).map((row) => row.idea),
    ok: result.ok,
    productionAllowed: result.productionAllowed,
    viableCount: result.viableCount,
    setQuestionPass: result.setQuestionPass,
    findings: result.ok ? [] : [...result.findings],
    selected: result.selected.map((candidate) => ({
      id: candidate.id,
      claim: candidate.claim,
      idea: candidate.idea,
      whyViewerCares: candidate.whyViewerCares,
      semanticScore: candidate.semanticScore,
      hookWordBonus: candidate.hookWordBonus,
      shortFormScore: candidate.shortFormScore,
      reasons: candidate.semanticReasons,
      window: [candidate.windowStart, candidate.windowEnd],
    })),
    alternates: result.alternates.map((candidate) => ({
      id: candidate.id,
      claim: candidate.claim,
      semanticScore: candidate.semanticScore,
      hookWordBonus: candidate.hookWordBonus,
      whyViewerCares: candidate.whyViewerCares,
    })),
    meaningfulRejected: result.rejected
      .filter((candidate) => candidate.semanticScore >= 7)
      .slice(0, 20)
      .map((candidate) => ({
        claim: candidate.claim,
        reason: candidate.rejectionReason,
        semanticScore: candidate.semanticScore,
        hookWordBonus: candidate.hookWordBonus,
      })),
    namedIdeaInspection: inspectNamed,
    selectedWithoutHookWords: result.selected.filter((candidate) => candidate.hookWordBonus === 0)
      .length,
  };

  mkdirSync(proof, { recursive: true });
  writeFileSync(
    path.join(proof, "positive-semantic-rerank.json"),
    `${JSON.stringify(compact, null, 2)}\n`,
  );
  return compact;
}
