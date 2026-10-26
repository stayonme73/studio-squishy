/**
 * OpenAI image generation for image_plus_renderer.
 * Creates original visual material only. Must not own customer facts.
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { hybridLockupPlanFor } from "@/lib/studio-design-intelligence/hybrid-layout-signatures";
import type {
  DesignCreativeBrief,
  DesignIndustryFamily,
  DesignLayoutFamilyId,
} from "@/lib/studio-design-intelligence/types";
import { researchCategoryPrinciples } from "./reference-research";
import { openaiImageConfigured } from "./tool-chest";
import {
  documentedImageOutputTokens,
  recordProviderCall,
} from "./cost-telemetry";

const IMAGE_SIZE = "1024x1536" as const;

const FACT_LEAK =
  /\b(call|visit|www\.|\.com|\.example|\(\d{3}\)|\$\d+|http|phone|october|reserve now)\b/i;

export type HybridImageRequest = {
  brief: DesignCreativeBrief;
  lockedFacts: readonly string[];
  attempt: number;
  forceInsufficientVisual?: boolean;
  priorCritique?: string;
  /** Layout family the composition will use, so the image reserves the right zone. */
  layoutFamilyId?: DesignLayoutFamilyId;
};

export type HybridImageResult = {
  ok: true;
  relativePath: string;
  contentSha256: string;
  model: string;
  prompt: string;
  bytes: number;
};

/**
 * Machine-owned mood vocabulary. `brief.desiredBrandFeeling` is raw customer
 * intake prose and routinely contains the business name and other facts, so it
 * must never reach the image provider. `moodId` is a controlled token.
 */
const MOOD_ATMOSPHERE: Record<string, string> = {
  creative_edgy: "high-contrast, cinematic, ink and ember, slightly raw",
  elegant_premium: "restrained, elevated, editorial calm",
  modern_minimal: "clean, spacious, quiet geometry",
  warm_welcoming: "warm light, generous texture, inviting",
  bold_energetic: "high-contrast, direct, industrial energy",
  professional_polished: "structured, composed, quiet authority",
};

function moodAtmosphere(moodId: string): string {
  return MOOD_ATMOSPHERE[moodId] ?? "considered and professional";
}

function atmosphereSubject(industry: DesignIndustryFamily): string {
  if (industry === "creative_technology") {
    return "Subject: cinematic workspace atmosphere — directional light, raw surface, material texture, equipment silhouette, or abstract field. No letters or words in the frame.";
  }
  if (industry === "beauty_wellness") {
    return "Subject: spa treatment-room atmosphere — water, steam, linen, botanicals, stone, or unlabeled cream texture. Strictly no handbags, purses, leather goods, jewelry, glassware, or fashion accessories.";
  }
  if (industry === "retail_fashion") {
    return "Subject: editorial figure, garment, fabric, or architectural shadow. No letters or words in the frame.";
  }
  if (industry === "food_hospitality") {
    return "Subject: table atmosphere, food texture, or hospitality interior. Not unrelated luxury accessories.";
  }
  return "Subject: original campaign atmosphere for this category. Not a generic luxury accessory still-life.";
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The Creative Director inspects the *composed* artifact, so its critique can
 * name the customer's price, phone, or business. That critique is the most useful
 * signal a retry has, but it cannot reach the image provider as written. Strip
 * every locked fact and every fact-shaped token, keep the visual direction.
 */
export function sanitizeCritiqueForImagePrompt(
  critique: string,
  facts: readonly string[],
): string {
  let text = critique.replace(/\s+/g, " ").trim();
  const longestFirst = [...facts].sort((a, b) => b.length - a.length);
  for (const fact of longestFirst) {
    const token = fact.trim();
    if (token.length < 4) continue;
    text = text.replace(
      new RegExp(escapeForRegExp(token), "gi"),
      "the overlaid type",
    );
  }
  text = text
    .replace(/https?:\/\/\S+/gi, "the overlaid type")
    .replace(/\b[\w-]+\.(?:com|net|org|co|io|example)\b/gi, "the overlaid type")
    .replace(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "the overlaid type")
    .replace(/\$\s?\d[\d,.]*/g, "the overlaid type")
    .replace(/\d+/g, "")
    .replace(
      /\b(?:call|visit|phone|url|website|price|prices|pricing|coupon|discount|january|february|march|april|june|july|august|september|october|november|december|reserve now)\b/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  return text.slice(0, 400);
}

export function buildHybridImagePrompt(request: HybridImageRequest): string {
  if (request.forceInsufficientVisual) {
    return "A perfectly flat single solid dark gray rectangle filling the entire frame. No texture, no objects, no lighting variation, no atmosphere. No text, letters, numbers, logos, or watermarks.";
  }
  const principles = researchCategoryPrinciples(request.brief);
  const directed =
    request.attempt > 1 && request.priorCritique
      ? sanitizeCritiqueForImagePrompt(request.priorCritique, request.lockedFacts)
      : "";
  const correction =
    request.attempt > 1
      ? [
          "Correction pass: stay on the same category. Change camera angle, lighting, and density. Do not switch to wine, handbags, glassware, or unrelated luxury goods. Fill the frame. Still no text.",
          directed
            ? `The Studio's art director rejected the previous attempt: ${directed} Fix exactly that.`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "First serious attempt. Full-canvas campaign atmosphere.";
  return [
    atmosphereSubject(request.brief.industryFamily),
    "Create original campaign atmosphere for a poster-sized still.",
    `Visual language: ${principles.summary}`,
    `Mood: ${moodAtmosphere(request.brief.moodId)}.`,
    "Fill the entire frame with photographic or illustrated material: scene, texture, lighting, objects, or collage.",
    // The composition's own reserved zone, not a fixed lower third. Asking for a
    // quiet lower third while the type docks mid-canvas is what left V19 with an
    // empty bottom third nothing was ever going to cover.
    request.layoutFamilyId
      ? hybridLockupPlanFor(request.layoutFamilyId, 1024, 1536).reservedImageZone
      : "Leave the lower third slightly quieter so typography can overlay later.",
    "Quieter means lower contrast and simpler texture — not empty. No large black or featureless areas anywhere in the frame; every region must carry material or light.",
    "No text, letters, numbers, logos, watermarks, posters-within-posters, phones, URLs, prices, or brand names.",
    correction,
    `Attempt ${request.attempt}.`,
  ].join(" ");
}

export function promptOwnsNoCustomerFacts(
  prompt: string,
  facts: readonly string[],
): boolean {
  if (FACT_LEAK.test(prompt)) return false;
  const hay = prompt.toLowerCase();
  return facts.every((fact) => {
    const token = fact.trim().toLowerCase();
    if (token.length < 4) return true;
    return !hay.includes(token);
  });
}

export async function generateHybridVisual(
  repoRoot: string,
  artifactRootRel: string,
  request: HybridImageRequest,
): Promise<HybridImageResult> {
  if (!openaiImageConfigured()) {
    throw new Error("OPENAI_IMAGE_NOT_CONFIGURED");
  }
  // Prefer a directed retry, but never at the cost of leaking a fact. If the
  // sanitized critique still trips the leak check, drop the critique and generate
  // undirected rather than failing the customer's job.
  let prompt = buildHybridImagePrompt(request);
  if (
    request.priorCritique &&
    !promptOwnsNoCustomerFacts(prompt, request.lockedFacts)
  ) {
    prompt = buildHybridImagePrompt({ ...request, priorCritique: undefined });
  }
  if (!promptOwnsNoCustomerFacts(prompt, request.lockedFacts)) {
    throw new Error("HYBRID_PROMPT_FACT_LEAK");
  }
  const key = process.env.OPENAI_API_KEY!.trim();
  const model = "gpt-image-1";
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: IMAGE_SIZE,
      n: 1,
    }),
  });
  if (!response.ok) {
    recordProviderCall({
      provider: "openai",
      model,
      purpose: "image_generation",
      attempt: request.attempt,
      httpStatus: response.status,
      billable: false,
    });
    throw new Error(`OPENAI_IMAGE_HTTP_${response.status}:${(await response.text()).slice(0, 240)}`);
  }
  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      input_tokens_details?: { text_tokens?: number; image_tokens?: number };
    };
  };
  const reportedOutputTokens = payload.usage?.output_tokens ?? 0;
  const fallbackOutputTokens = reportedOutputTokens
    ? 0
    : (documentedImageOutputTokens(IMAGE_SIZE, "high") ?? 0);
  recordProviderCall({
    provider: "openai",
    model,
    purpose: "image_generation",
    attempt: request.attempt,
    httpStatus: response.status,
    usage: {
      textInputTokens:
        payload.usage?.input_tokens_details?.text_tokens ??
        payload.usage?.input_tokens ??
        0,
      imageInputTokens: payload.usage?.input_tokens_details?.image_tokens ?? 0,
      imageOutputTokens: reportedOutputTokens || fallbackOutputTokens,
    },
    usageEstimatedFrom: reportedOutputTokens
      ? undefined
      : `response omitted usage; priced at documented ${IMAGE_SIZE} high-quality output tokens`,
  });
  let bytes: Buffer | null = null;
  if (payload.data?.[0]?.b64_json) {
    bytes = Buffer.from(payload.data[0].b64_json, "base64");
  } else if (payload.data?.[0]?.url) {
    const download = await fetch(payload.data[0].url);
    if (!download.ok) throw new Error(`OPENAI_IMAGE_DOWNLOAD_${download.status}`);
    bytes = Buffer.from(await download.arrayBuffer());
  }
  if (!bytes || bytes.length < 80) {
    throw new Error("OPENAI_IMAGE_EMPTY");
  }
  const relativePath = `${artifactRootRel}/generated/hybrid-visual-a${request.attempt}.png`;
  const absolute = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
  return {
    ok: true,
    relativePath,
    contentSha256: createHash("sha256").update(bytes).digest("hex"),
    model,
    prompt,
    bytes: bytes.length,
  };
}
