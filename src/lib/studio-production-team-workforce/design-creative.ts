import {
  designCreativeReasoningAvailable,
} from "@/config/studio-production-team-workforce-v1";
import {
  recordAnthropicCall,
  type AnthropicUsagePayload,
} from "@/lib/studio-project-alpha/cost-telemetry";

export type DesignCreativeRefineResult<T> =
  | { ok: true; spec: T; runtime: "anthropic_text_model" | "deterministic_seed" }
  | { ok: false; message: string };

/**
 * Design Production creative pass. QA remains a guardrail, not the designer.
 * Falls back to the deterministic seed when the model is unkeyed or invalid.
 */
export async function refineLaunchDesignSpecCreative<T>(input: {
  skuId: string;
  seed: T;
  authorizedFacts: unknown;
  validate?: (spec: T) => { ok: boolean };
  /** When true, skip Anthropic and return the deterministic seed. */
  forbidBillableProviders?: boolean;
}): Promise<T> {
  if (input.forbidBillableProviders) return input.seed;
  const refined = await tryRefineLaunchDesignSpecCreative(input);
  if (refined.ok) return refined.spec;
  return input.seed;
}

export async function tryRefineLaunchDesignSpecCreative<T>(input: {
  skuId: string;
  seed: T;
  authorizedFacts: unknown;
  validate?: (spec: T) => { ok: boolean };
}): Promise<DesignCreativeRefineResult<T>> {
  if (!designCreativeReasoningAvailable()) {
    return { ok: true, spec: input.seed, runtime: "deterministic_seed" };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { ok: true, spec: input.seed, runtime: "deterministic_seed" };
  }
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";
  const system = `You are Design Production for The Studio SKU ${input.skuId}.
Return ONLY valid JSON in the same shape as seedSpec.
You may decide hierarchy, typography, scale, spacing, composition, grouping, offer emphasis, format within constraints, visual-material usage, and overall balance.
Do not invent prices, offers, contact details, guarantees, claims, photos, logos, or other customer facts.
Keep skuId, specVersion, canvas, outputFormats, and materials unchanged from seedSpec.
QA will guardrail. You are the designer.`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        temperature: 0.2,
        system,
        messages: [
          {
            role: "user",
            content: JSON.stringify(
              {
                authorizedFacts: input.authorizedFacts,
                seedSpec: input.seed,
              },
              null,
              2,
            ),
          },
        ],
      }),
    });
    if (!response.ok) {
      recordAnthropicCall({
        model,
        purpose: "creative_reasoning",
        httpStatus: response.status,
      });
      return {
        ok: false,
        message: `Anthropic HTTP ${response.status}`,
      };
    }
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: AnthropicUsagePayload;
    };
    recordAnthropicCall({
      model,
      purpose: "creative_reasoning",
      httpStatus: response.status,
      usage: data.usage,
    });
    const text = data.content?.find((row) => row.type === "text")?.text ?? "";
    const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced?.[1]?.trim() ?? text.trim();
    const parsed = JSON.parse(candidate) as T;
    if (input.validate && !input.validate(parsed).ok) {
      return { ok: false, message: "Creative spec failed SKU validation" };
    }
    return { ok: true, spec: parsed, runtime: "anthropic_text_model" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
