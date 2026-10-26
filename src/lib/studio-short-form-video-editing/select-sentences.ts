/**
 * Existing text-model may pick sentence indexes only.
 * It may not rewrite speech, invent dialogue, or invent a CTA.
 */

import { recordAnthropicCall } from "@/lib/studio-project-alpha/cost-telemetry";

import {
  parseSentenceIndexPick,
  type SentenceIndexPick,
  type TranscriptSentence,
} from "./sentences";
import type { EditorialRole } from "./story-order";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export type SentenceIndexSelection =
  | {
      ok: true;
      pick: SentenceIndexPick;
      roles: EditorialRole[];
      idea?: string;
      why?: string;
      excludedWhy?: string;
      model: string;
      estimatedUsd: number;
    }
  | {
      ok: false;
      reason: "KEY_ABSENT" | "PROVIDER_REJECTED" | "INVALID_INDEXES";
      message: string;
      estimatedUsd: number;
    };

function sentenceCatalog(sentences: readonly TranscriptSentence[]): string {
  return sentences
    .map(
      (sentence) =>
        `${sentence.index}. [${sentence.start.toFixed(1)}-${sentence.end.toFixed(1)}s] ${sentence.text}`,
    )
    .join("\n");
}

export async function pickSentenceIndexes(input: {
  sentences: readonly TranscriptSentence[];
  apiKey?: string | null;
  minSeconds: number;
  maxSeconds: number;
  mustKeepLine?: string;
  excludeIndexes?: readonly number[];
  fetchImpl?: typeof fetch;
}): Promise<SentenceIndexSelection> {
  const apiKey = input.apiKey?.trim() ?? "";
  if (!apiKey) {
    return {
      ok: false,
      reason: "KEY_ABSENT",
      message: "ANTHROPIC_API_KEY absent. Deterministic EDL remains.",
      estimatedUsd: 0,
    };
  }
  if (input.sentences.length < 2) {
    return {
      ok: false,
      reason: "INVALID_INDEXES",
      message: "Not enough sentence boundaries for index selection.",
      estimatedUsd: 0,
    };
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const mustKeep = input.mustKeepLine?.trim();
  const system = `You are a short-form editor. Coherent order is not enough.
First ask: what is the most interesting, useful, surprising, emotionally engaging, or memorable idea already spoken?
Then build the short around THAT idea. Do not default to the first polite 15-30 seconds.
Prefer specific, memorable, surprising, useful, opinionated, concrete, hookable material.
Penalize greetings, biographies, generic setup, polite filler, and first-block bias.
Example: "My name is Daniel" may be coherent. "My favorite word is cherries" may be the stronger short. Choose the latter if it is.
Then: strongest spoken hook for that idea → only beats that develop it → a clean ending already spoken.
Roles: hook, context, body, proof, transition, close, cta_signoff.
You may NOT rewrite speech, invent dialogue, invent facts, invent CTA text, paraphrase, or manufacture a hook the customer never said.
Return ONLY JSON:
{"idea":"one sentence naming the idea","why":"why this beats a first-block intro","excludedWhy":"what you left out and why","beats":[{"index":0,"role":"hook"},{"index":4,"role":"body"},{"index":9,"role":"close"}]}
Spoken duration should land between ${input.minSeconds} and ${input.maxSeconds} seconds.`;

  const excluded = (input.excludeIndexes ?? []).filter((index) =>
    Number.isInteger(index),
  );
  const user = [
    "Sentences:",
    sentenceCatalog(input.sentences),
    mustKeep ? `Must keep this spoken line verbatim if present: ${mustKeep}` : "",
    excluded.length
      ? `Do not use these sentence indexes as the hook or in the short: ${excluded.join(", ")}. Pick a different spoken opening.`
      : "",
    'First answer: what is this short actually about?',
    'Then: would a professional editor choose this idea over the first coherent 15-30 seconds?',
    'JSON only with idea, why, excludedWhy, and beats.',
  ]
    .filter(Boolean)
    .join("\n\n");

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  const record = recordAnthropicCall({
    model,
    purpose: "creative_reasoning",
    httpStatus: response.status,
    usage: data.usage,
  });
  if (!response.ok) {
    return {
      ok: false,
      reason: "PROVIDER_REJECTED",
      message: `Sentence-index model HTTP ${response.status}`,
      estimatedUsd: record.costUsd,
    };
  }
  const text = data.content?.find((row) => row.type === "text")?.text ?? "";
  const pick = parseSentenceIndexPick(text);
  if (!pick || !wordsRangeValid(input.sentences, pick)) {
    return {
      ok: false,
      reason: "INVALID_INDEXES",
      message: "Model did not return usable story beats. Deterministic EDL remains.",
      estimatedUsd: record.costUsd,
    };
  }
  return {
    ok: true,
    pick,
    roles: pick.roles,
    idea: pick.idea,
    why: pick.why,
    excludedWhy: pick.excludedWhy,
    model,
    estimatedUsd: record.costUsd,
  };
}

function wordsRangeValid(
  sentences: readonly TranscriptSentence[],
  pick: SentenceIndexPick,
): boolean {
  const indexes = pick.indexes?.length ? pick.indexes : [pick.startIndex, pick.endIndex];
  return indexes.every(
    (index) =>
      Number.isInteger(index) && index >= 0 && index < sentences.length,
  );
}
