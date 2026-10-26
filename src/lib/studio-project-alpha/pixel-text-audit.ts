/**
 * Read the text that is actually in the pixels.
 *
 * Two integrity questions the spec cannot answer:
 * 1. Did the image provider bake letters into the generated layer? It is told not
 *    to, and it sometimes does anyway — gibberish signage, watermarks, fake
 *    prices. A spec inspection cannot see that.
 * 2. Do the customer's exact facts survive to the rendered pixels? Declared text
 *    in the spec proves intent, not delivery — a fact can be clipped, hidden
 *    behind a plate, or rendered in a colour that vanishes into the photograph.
 *
 * HONEST LIMIT: this is model-based transcription, not a deterministic OCR
 * engine. It reads plain type reliably and can misread heavily stylized or
 * low-contrast type. It is used to *reject*, never to certify by itself — the
 * deterministic geometry checks and renderer-owned declared text still stand.
 */

import { readFile } from "fs/promises";

import { recordProviderCall } from "./cost-telemetry";
import { openaiImageConfigured } from "./tool-chest";

export type PixelTextReading = {
  model: string;
  /** Verbatim text the model read, empty string when it reported none. */
  text: string;
  /** True when the model explicitly reported no legible text. */
  reportedNoText: boolean;
  /**
   * True only when the model returned a structurally valid answer we can act on:
   * parseable JSON carrying either transcribed text, or an explicit
   * `noTextPresent: true` with no text. Anything else — empty body, prose instead
   * of JSON, unparseable JSON, a shape missing both fields — is invalid.
   *
   * An invalid reading is silence, not a clean bill of health. Every audit below
   * fails closed on it.
   */
  valid: boolean;
  /** Why the reading was rejected, for the proof record and the correction loop. */
  invalidReason?: string;
};

export type PixelTextFinding = {
  code: string;
  message: string;
};

export type PixelTextAuditResult = {
  ok: boolean;
  findings: PixelTextFinding[];
  reading: PixelTextReading;
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

/** Transcribe every legible character in an image. Metered like any paid call. */
export async function readTextInImage(input: {
  pngAbsolutePath: string;
  attempt?: number;
}): Promise<PixelTextReading> {
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
          content: `You are a transcription instrument, not a designer. Transcribe every legible character visible in the image, including partial words, watermarks, signage, and numbers.
Return ONLY JSON: {"text":"<verbatim transcription, newline separated>","noTextPresent":true|false}
Do not summarize, translate, correct spelling, or describe the picture. If there is genuinely no legible character anywhere, return an empty text and noTextPresent true.`,
        },
        {
          role: "user",
          content: [
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
      purpose: "vision_text_audit",
      attempt,
      httpStatus: response.status,
      billable: false,
    });
    throw new Error(
      `OPENAI_TEXT_AUDIT_HTTP_${response.status}:${(await response.text()).slice(0, 240)}`,
    );
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
    purpose: "vision_text_audit",
    attempt,
    httpStatus: response.status,
    usage: {
      textInputTokens: Math.max(
        0,
        (payload.usage?.input_tokens ?? 0) - cachedInput,
      ),
      cachedTextInputTokens: cachedInput,
      textOutputTokens: payload.usage?.output_tokens ?? 0,
    },
  });
  const raw = extractOutputText(payload);
  const invalid = (invalidReason: string): PixelTextReading => ({
    model,
    text: raw.trim(),
    reportedNoText: false,
    valid: false,
    invalidReason,
  });

  if (!raw.trim()) return invalid("model returned an empty body");

  const match = raw.match(/\{[\s\S]*\}/);
  // No structured answer is not evidence of a clean image.
  if (!match) return invalid("model returned no JSON object");

  let parsed: { text?: unknown; noTextPresent?: unknown };
  try {
    parsed = JSON.parse(match[0]) as { text?: unknown; noTextPresent?: unknown };
  } catch {
    return invalid("model returned unparseable JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    return invalid("model returned a non-object JSON value");
  }

  const hasTextField = typeof parsed.text === "string";
  const declaredNoText = parsed.noTextPresent === true;
  // Require one of the two answers the instrument was asked for. A shape carrying
  // neither tells us nothing about the pixels.
  if (!hasTextField && !declaredNoText) {
    return invalid(
      "model answer carried neither a text transcription nor an explicit noTextPresent:true",
    );
  }

  const text = hasTextField ? (parsed.text as string).trim() : "";
  // "No text present" and "here is the text I read" must not both be claimed.
  if (declaredNoText && text.length > 0) {
    return invalid(
      `model claimed noTextPresent:true while also transcribing "${text.slice(0, 80)}"`,
    );
  }
  // Empty transcription without the explicit no-text declaration is ambiguous:
  // it could mean a clean image or a model that simply did not answer.
  if (!declaredNoText && text.length === 0) {
    return invalid(
      "model returned an empty transcription without declaring noTextPresent:true",
    );
  }

  return {
    model,
    text,
    reportedNoText: declaredNoText,
    valid: true,
  };
}

/** Shared fail-closed finding for a reading we cannot trust. */
function unreadableFinding(reading: PixelTextReading): PixelTextFinding {
  return {
    code: "pixel_text_audit_unreadable",
    message: `Pixel text audit could not read the artifact — ${reading.invalidReason ?? "invalid model response"}. Treated as a failure: an unusable answer is not evidence the pixels are correct.`,
  };
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Letters and digits only — punctuation noise is not evidence of baked text. */
function legibleCharacterCount(value: string): number {
  return (value.match(/[A-Za-z0-9]/g) ?? []).length;
}

/**
 * A stray mark or a single misread character is not a text bake. Two or more
 * legible characters in a layer that was told to contain none is.
 */
const MAX_TOLERATED_CHARACTERS_IN_GENERATED_LAYER = 1;

/**
 * Enforce that the generated visual layer carries no text of its own. The
 * renderer owns every character the customer reads.
 */
export async function auditGeneratedLayerHasNoText(input: {
  pngAbsolutePath: string;
  attempt?: number;
}): Promise<PixelTextAuditResult> {
  const reading = await readTextInImage(input);
  if (!reading.valid) {
    return { ok: false, findings: [unreadableFinding(reading)], reading };
  }
  const characters = legibleCharacterCount(reading.text);
  const findings: PixelTextFinding[] = [];
  if (characters > MAX_TOLERATED_CHARACTERS_IN_GENERATED_LAYER) {
    findings.push({
      code: "generated_layer_contains_text",
      message: `Generated visual has ${characters} legible characters baked into the pixels ("${reading.text.replace(/\s+/g, " ").slice(0, 120)}") — the renderer must own every character the customer reads.`,
    });
  }
  return { ok: findings.length === 0, findings, reading };
}

/**
 * Enforce that every locked customer fact is actually legible in the composed
 * artifact. Declared spec text is intent; this reads delivery.
 */
export async function auditComposedArtifactCarriesFacts(input: {
  pngAbsolutePath: string;
  lockedFacts: readonly string[];
  attempt?: number;
}): Promise<PixelTextAuditResult> {
  const reading = await readTextInImage(input);
  if (!reading.valid) {
    return { ok: false, findings: [unreadableFinding(reading)], reading };
  }
  const haystack = normalizeForComparison(reading.text);
  const findings: PixelTextFinding[] = [];
  const missing = input.lockedFacts
    .map((fact) => fact.trim())
    .filter((fact) => fact.length >= 4)
    .filter((fact) => !haystack.includes(normalizeForComparison(fact)));

  if (haystack.length === 0) {
    findings.push({
      code: "composed_artifact_has_no_legible_text",
      message:
        "No legible text could be read from the composed artifact — customer facts are not reaching the pixels.",
    });
  } else if (missing.length > 0) {
    findings.push({
      code: "composed_artifact_missing_locked_facts",
      message: `Locked customer facts not legible in the composed pixels: ${missing.join(" | ")}.`,
    });
  }
  return { ok: findings.length === 0, findings, reading };
}
