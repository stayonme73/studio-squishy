import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";
import { discoverClipSet, sameIdea } from "@/lib/studio-clip-repurposing/set-discovery";
import type {
  LongSourceSentences,
  SetCandidate,
} from "@/lib/studio-clip-repurposing/types";

export const CLIP_549_SET_QUESTION =
  "If the customer posted these clips separately, would each feel like a distinct piece worth publishing?" as const;

export type Clip549Discovery = {
  ok: boolean;
  productionAllowed: boolean;
  viableDistinctCount: number;
  selected: readonly SetCandidate[];
  alternates: readonly SetCandidate[];
  rejected: readonly SetCandidate[];
  setQuestion: typeof CLIP_549_SET_QUESTION;
  setQuestionPass: boolean;
  sourceDurationSeconds: number;
};

function rankDistinct(candidates: readonly SetCandidate[]): SetCandidate[] {
  const ranked = [...candidates].sort(
    (left, right) => right.semanticScore - left.semanticScore,
  );
  const kept: SetCandidate[] = [];
  for (const candidate of ranked) {
    if (kept.some((prior) => sameIdea(prior, candidate))) continue;
    kept.push(candidate);
  }
  return kept;
}

export function discoverClip549Set(source: LongSourceSentences): Clip549Discovery {
  const historical = discoverClipSet(source);
  const distinct = rankDistinct([...historical.selected, ...historical.alternates]);
  const maximum = freeze.upToFive.maximumDelivered;
  const selected = distinct.slice(0, maximum);
  const alternates = distinct.slice(maximum);
  const pairwiseDistinct = selected.every((candidate, index) =>
    selected.every(
      (other, otherIndex) => index === otherIndex || !sameIdea(candidate, other),
    ),
  );
  const viableDistinctCount = distinct.length;
  const productionAllowed =
    selected.length >= 3 && selected.length <= 5 && pairwiseDistinct;

  return {
    ok: productionAllowed,
    productionAllowed,
    viableDistinctCount,
    selected: productionAllowed ? selected : selected.slice(0, Math.min(2, selected.length)),
    alternates: productionAllowed ? alternates : distinct.filter(
      (candidate) => !selected.slice(0, Math.min(2, selected.length)).includes(candidate),
    ),
    rejected: historical.rejected,
    setQuestion: CLIP_549_SET_QUESTION,
    setQuestionPass: productionAllowed,
    sourceDurationSeconds: source.sourceDurationSeconds,
  };
}

export function selectStrongestDistinct(
  candidates: readonly SetCandidate[],
  count = freeze.upToFive.ifMoreThanFiveQualifySelectStrongest,
): SetCandidate[] {
  return rankDistinct(candidates).slice(0, count);
}

export { sameIdea };
