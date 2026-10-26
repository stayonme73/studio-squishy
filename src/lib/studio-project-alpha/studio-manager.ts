/**
 * Machine → AI Studio Manager / Creative guidance.
 * Dedicated Studio lane. Not Tagia's personal ChatGPT thread.
 * May not invent customer facts or make Owner-only business decisions.
 */

import type { StudioManagerAction } from "@/config/studio-project-alpha-v1";
import type { DesignCreativeBrief } from "@/lib/studio-design-intelligence/types";
import type { FlyerDesignSpec } from "@/lib/studio-design-renderer/types";
import { critiqueAsCreativeDirector } from "./creative-director";
import { measureCanvasDistribution } from "./full-canvas";
import { routeProductionMethod } from "./tool-chest";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";

export type CreativeGuidanceRequest = {
  campaignId: string;
  skuId: string;
  brief: DesignCreativeBrief;
  question: string;
  spec?: FlyerDesignSpec;
  truth?: FlyerProjectTruth;
  qaSummary?: string;
  previousAttemptCount?: number;
};

export type CreativeGuidanceResponse = {
  action: StudioManagerAction;
  why: string;
  preserveCustomerFacts: true;
  doNotInventCustomerFacts: true;
  ownerOnly: boolean;
  productionMethodHint: ReturnType<typeof routeProductionMethod>["method"];
};

function deterministicGuidance(
  request: CreativeGuidanceRequest,
): CreativeGuidanceResponse {
  const method = routeProductionMethod(request.brief);
  if (request.truth && request.spec) {
    const director = critiqueAsCreativeDirector({
      spec: request.spec,
      truth: request.truth,
    });
    if (!director.ok) {
      return {
        action:
          method.method === "image_plus_renderer"
            ? "use_image_generation"
            : "studio_correction_required",
        why: director.summary,
        preserveCustomerFacts: true,
        doNotInventCustomerFacts: true,
        ownerOnly: false,
        productionMethodHint: method.method,
      };
    }
    if (reportLooksTopHeavy(request.spec) === false) {
      return {
        action: "continue_production",
        why: "Creative Director pass. Continue.",
        preserveCustomerFacts: true,
        doNotInventCustomerFacts: true,
        ownerOnly: false,
        productionMethodHint: method.method,
      };
    }
  }
  if ((request.previousAttemptCount ?? 0) >= 3) {
    return {
      action: "owner_judgment_required",
      why: "Internal attempt budget exhausted. This is a genuine Owner judgment call.",
      preserveCustomerFacts: true,
      doNotInventCustomerFacts: true,
      ownerOnly: true,
      productionMethodHint: method.method,
    };
  }
  return {
    action: "reroute_design",
    why: request.question || method.why,
    preserveCustomerFacts: true,
    doNotInventCustomerFacts: true,
    ownerOnly: false,
    productionMethodHint: method.method,
  };
}

function reportLooksTopHeavy(spec: FlyerDesignSpec): boolean {
  return measureCanvasDistribution(spec).topHeavy;
}

export async function requestCreativeGuidance(
  request: CreativeGuidanceRequest,
): Promise<CreativeGuidanceResponse> {
  const fallback = deterministicGuidance(request);
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return fallback;
  if (process.env.OPENAI_API_KEY?.trim()) {
    const fromOpenAi = await askOpenAiStudioManager(request, fallback);
    if (fromOpenAi) return fromOpenAi;
  }
  return fallback;
}

async function askOpenAiStudioManager(
  request: CreativeGuidanceRequest,
  fallback: CreativeGuidanceResponse,
): Promise<CreativeGuidanceResponse | null> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: `You are The Studio's AI Studio Manager. Return ONLY JSON:
{"action":"continue_production|reroute_design|use_image_generation|research_references|request_missing_customer_information|studio_correction_required|engineering_recovery_required|owner_judgment_required","why":"one sentence"}
Do not invent customer facts, prices, phones, URLs, or legal copy.
Do not make Owner-only business decisions.
Paid creative must be commercially competitive, not merely technically complete.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              campaignId: request.campaignId,
              skuId: request.skuId,
              brief: {
                industryFamily: request.brief.industryFamily,
                moodId: request.brief.moodId,
                chooseForMe: request.brief.chooseForMe,
                whatIsPromoted: request.brief.whatIsPromoted,
              },
              question: request.question,
              qaSummary: request.qaSummary,
              previousAttemptCount: request.previousAttemptCount ?? 0,
            }),
          },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text =
      payload.output_text ||
      payload.output?.[0]?.content?.[0]?.text ||
      "";
    const parsed = JSON.parse(text) as { action?: StudioManagerAction; why?: string };
    if (!parsed.action) return fallback;
    return {
      ...fallback,
      action: parsed.action,
      why: parsed.why || fallback.why,
    };
  } catch {
    return fallback;
  }
}
