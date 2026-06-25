import type { AiPredictionResponse } from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

function extractJson(text: string): AiPredictionResponse {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  const parsed = JSON.parse(candidate) as Partial<AiPredictionResponse>;
  if (!parsed.decision || !parsed.rationale) {
    throw new Error("Model response missing decision or rationale.");
  }

  return {
    decision: String(parsed.decision).trim(),
    rationale: String(parsed.rationale).trim(),
    citations: Array.isArray(parsed.citations)
      ? parsed.citations.map((c) => String(c).trim()).filter(Boolean)
      : [],
  };
}

export async function predictDecision(input: {
  system: string;
  user: string;
}): Promise<AiPredictionResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to run predictions.",
    );
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.2,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic API returned an empty response.");
  }

  try {
    return extractJson(text);
  } catch {
    throw new Error(`Could not parse model JSON. Raw response:\n${text}`);
  }
}
