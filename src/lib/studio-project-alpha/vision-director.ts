/**
 * Pixel-level Creative Director — inspects the composed PNG, not the spec.
 * REJECT — technically correct, creatively insufficient — is a Studio correction.
 */

import { readFile } from "fs/promises";

import { openaiImageConfigured } from "./tool-chest";
import { recordProviderCall } from "./cost-telemetry";

export type VisionDirectorVerdict =
  | {
      ok: true;
      inspectedArtifact: true;
      summary: string;
    }
  | {
      ok: false;
      inspectedArtifact: true;
      action: "studio_correction_required";
      summary: string;
      rejectReason: "technically_correct_creatively_insufficient" | "unfinished" | "derivative";
      /**
       * Concrete visual direction for regenerating the background layer. Without
       * this the correction loop can only reroll the same prompt and hope.
       */
      visualFix?: string;
    };

function extractOutputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}): string {
  if (payload.output_text?.trim()) return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.text?.trim()) return content.text;
    }
  }
  return "";
}

export async function inspectComposedArtifact(input: {
  pngAbsolutePath: string;
  lockedFacts: readonly string[];
  industry: string;
  mood: string;
  /** Serious-attempt number, for cost telemetry attribution. */
  attempt?: number;
}): Promise<VisionDirectorVerdict> {
  if (!openaiImageConfigured()) {
    throw new Error("OPENAI_VISION_NOT_CONFIGURED");
  }
  const png = await readFile(input.pngAbsolutePath);
  const key = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: `You are The Studio Creative Director. Inspect the actual composed PNG.
This is an image-plus-renderer campaign: generated visual atmosphere plus a designed type dock that must carry exact names, prices, phones, URLs, and CTAs. A designed lower lockup on a full-canvas photograph is not unfinished "words on a background."
Return ONLY JSON:
{"pass":true|false,"rejectReason":null|"technically_correct_creatively_insufficient"|"unfinished"|"derivative","summary":"one sentence","visualFix":"one sentence of concrete direction for regenerating the background image only — camera angle, lighting, subject, density, composition. Never mention any customer name, price, phone, URL, date, or wording. Null when passing."}
Pass only if a reasonable paying customer would become more confident after seeing this.
Reject a flat or empty generated field, accidental dead space, tiny type, derivative house plates, repeated customer copy, a price with no offer context, or bland technically-correct work.
Do not invent customer facts.`
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                industry: input.industry,
                mood: input.mood,
                lockedFacts: input.lockedFacts,
              }),
            },
            {
              type: "input_image",
              image_url: `data:image/png;base64,${png.toString("base64")}`,
            },
          ],
        },
      ],
    }),
  });
  const attempt = input.attempt ?? 1;
  if (!response.ok) {
    recordProviderCall({
      provider: "openai",
      model,
      purpose: "vision_creative_director",
      attempt,
      httpStatus: response.status,
      billable: false,
    });
    throw new Error(`OPENAI_VISION_HTTP_${response.status}:${(await response.text()).slice(0, 240)}`);
  }
  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      input_tokens_details?: { cached_tokens?: number };
    };
  };
  const cachedInput = payload.usage?.input_tokens_details?.cached_tokens ?? 0;
  recordProviderCall({
    provider: "openai",
    model,
    purpose: "vision_creative_director",
    attempt,
    httpStatus: response.status,
    usage: {
      // The Responses API bills the attached PNG inside input_tokens.
      textInputTokens: Math.max(0, (payload.usage?.input_tokens ?? 0) - cachedInput),
      cachedTextInputTokens: cachedInput,
      textOutputTokens: payload.usage?.output_tokens ?? 0,
    },
  });
  const text = extractOutputText(payload);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  type ParsedVerdict = {
    pass?: boolean;
    rejectReason?: Extract<
      VisionDirectorVerdict,
      { ok: false }
    >["rejectReason"];
    summary?: string;
    visualFix?: string | null;
  };
  const parsed: ParsedVerdict = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as ParsedVerdict)
    : {
        pass: false,
        rejectReason: "unfinished",
        summary: "Vision returned no structured critique.",
      };
  // Only a literal boolean true passes. A malformed verdict — a string, a number,
  // a missing field — must not buy a pass for paid work.
  if (parsed.pass === true) {
    return {
      ok: true,
      inspectedArtifact: true,
      summary: parsed.summary || "Creative Director inspected the composed PNG and passed.",
    };
  }
  return {
    ok: false,
    inspectedArtifact: true,
    action: "studio_correction_required",
    summary: parsed.summary || "REJECT — technically correct, creatively insufficient.",
    rejectReason: parsed.rejectReason || "technically_correct_creatively_insufficient",
    visualFix:
      typeof parsed.visualFix === "string" && parsed.visualFix.trim()
        ? parsed.visualFix.trim()
        : undefined,
  };
}
