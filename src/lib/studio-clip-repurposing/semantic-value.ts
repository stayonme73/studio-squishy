/**
 * Set-level editorial value. Hook words are a weak bonus, never a requirement.
 * Does not modify the frozen $349 scorer.
 */

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";

import { contentTokens } from "./set-discovery-tokens";

const OFFER = studioClipRepurposingBuildV1.proposedOffer;

const HOOK_WORD_RE =
  /\b(favorite|best|secret|never|always|weird|strange|love|hate)\b/i;
const CONTRARIAN_RE =
  /\b(rather|instead|does not mean|doesn't mean|not the same|not always|but cheap|but that does not|versus|vs\.?|than \d+)\b/i;
const ECONOMIC_RE =
  /\b(pay|paid|cheap|expensive|money|hire|hiring|sell|price|cost|twice)\b/i;
const STAKE_RE =
  /\b(customer|customers|people|viewer|client|trust|trusting|headache|project manager)\b/i;
const CONCRETE_RE =
  /\b(button|page|menu|service|services|quality|spacing|sound|video|home|homes|studio)\b/i;
const EMOTION_RE =
  /\b(exhausting|irritated|awkward|trust|headache|terrible|funny)\b/i;
const USEFUL_RE =
  /\b(should|rather|because|do not|don't|cannot|can't|that defeats|makes you|feel finished)\b/i;
const VAGUE_RE =
  /\b(i think about a lot|that's who i am|that is probably enough|oops|you know|does that make sense)\b/i;
const NUMBER_RE = /\b\d+\b/;

export const MIN_SEMANTIC_VIABLE = 7;

export type SemanticRead = {
  claim: string;
  whyViewerCares: string;
  canStandAlone: boolean;
  hasSpokenEntry: boolean;
  hasEnoughToLand: boolean;
  score: number;
  reasons: string[];
  hookWordBonus: number;
};

function firstSentence(text: string): string {
  const match = text.trim().match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? text).trim();
}

export function scoreSemanticValue(input: {
  hookText: string;
  bodyText: string;
  durationSeconds: number;
  standalone: boolean;
}): SemanticRead {
  const body = input.bodyText.trim();
  const hook = input.hookText.trim();
  const claim = firstSentence(hook || body);
  const reasons: string[] = [];
  let score = 0;

  const tokens = [...contentTokens(body)];
  if (tokens.length >= 8) {
    score += 2;
    reasons.push("specific");
  }
  if (NUMBER_RE.test(body)) {
    score += 2;
    reasons.push("concrete-number");
  }
  if (CONTRARIAN_RE.test(body)) {
    score += 3;
    reasons.push("contrarian");
  }
  if (ECONOMIC_RE.test(body)) {
    score += 2;
    reasons.push("economically-meaningful");
  }
  if (STAKE_RE.test(body)) {
    score += 2;
    reasons.push("relatable-stake");
  }
  if (CONCRETE_RE.test(body)) {
    score += 2;
    reasons.push("concrete");
  }
  if (EMOTION_RE.test(body)) {
    score += 1;
    reasons.push("emotionally-clear");
  }
  if (USEFUL_RE.test(body)) {
    score += 2;
    reasons.push("useful");
  }
  if (tokens.some((word) => word.length >= 8)) {
    score += 1;
    reasons.push("memorable-language");
  }
  if (input.standalone) {
    score += 2;
    reasons.push("self-contained");
  } else {
    score -= 6;
    reasons.push("needs-other-clip-context");
  }
  if (
    input.durationSeconds >= OFFER.outputMinSeconds &&
    input.durationSeconds <= OFFER.outputMaxSeconds
  ) {
    score += 1;
    reasons.push("short-form-length");
  }
  if (VAGUE_RE.test(body) && score < 10) {
    score -= 4;
    reasons.push("vague-or-filler");
  }

  const hookWordBonus = HOOK_WORD_RE.test(body) || HOOK_WORD_RE.test(hook) ? 1 : 0;
  if (hookWordBonus) {
    score += hookWordBonus;
    reasons.push("hook-word-weak-bonus");
  }

  const hasSpokenEntry = claim.split(/\s+/).length >= 6 && !/^(um|uh|so|okay|yeah)\b/i.test(claim);
  const hasEnoughToLand =
    input.durationSeconds >= MIN_SEMANTIC_WINDOW_HINT &&
    (body.length - claim.length > 20 || /because|but |rather|when /i.test(body));

  if (hasSpokenEntry) reasons.push("spoken-entry-exists");
  if (hasEnoughToLand) reasons.push("enough-spoken-material-to-land");

  const why =
    reasons
      .filter((reason) => reason !== "hook-word-weak-bonus" && reason !== "short-form-length")
      .slice(0, 4)
      .join(", ") || "no clear viewer stake";

  return {
    claim,
    whyViewerCares: why,
    canStandAlone: input.standalone && hasSpokenEntry,
    hasSpokenEntry,
    hasEnoughToLand,
    score,
    reasons,
    hookWordBonus,
  };
}

const MIN_SEMANTIC_WINDOW_HINT = 12;
