import { DESIGN_INTELLIGENCE_VERSION } from "@/config/studio-design-intelligence-v1";
import type { FlyerReasoningConstraints } from "@/config/studio-autonomous-production-loop-v1";
import {
  recordAnthropicCall,
  type AnthropicUsagePayload,
} from "@/lib/studio-project-alpha/cost-telemetry";

import { applySelectedRoute, proposeCreativeRoutes, selectCreativeDirection } from "./select-route";
import type { DesignCreativeBrief, FlyerCreativeDirection, VisualSignature } from "./types";

type AnthropicPick =
  | { ok: true; routeId: string; why: string; model: string }
  | { ok: false; message: string };

export async function selectRouteWithAnthropic(input: {
  brief: DesignCreativeBrief;
  recent: readonly VisualSignature[];
  constraints?: FlyerReasoningConstraints;
}): Promise<FlyerCreativeDirection> {
  const fallback = selectCreativeDirection({
    brief: input.brief,
    recent: input.recent,
    constraints: input.constraints,
    selectionMode: "deterministic_score",
  });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;
  const picked = await askAnthropicToPickRoute(input.brief, fallback, apiKey);
  if (!picked.ok) return fallback;
  const next = applySelectedRoute(fallback, picked.routeId);
  return {
    ...next,
    selectionMode: "anthropic_route_select",
  };
}

async function askAnthropicToPickRoute(
  brief: DesignCreativeBrief,
  direction: FlyerCreativeDirection,
  apiKey: string,
): Promise<AnthropicPick> {
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";
  const system = `You are The Studio Design Director. Choose ONE internal creative route for a customer flyer.
Return ONLY JSON: {"selectedRouteId":"route-A","why":"one sentence"}.
Do not invent facts, prices, contact, or artwork. Do not return a layout spec.
Prefer originality against a Maya-like navy/gold centered-circle house recipe.
Pick the route that best fits audience, use, readability, and production feasibility.
Intelligence version: ${DESIGN_INTELLIGENCE_VERSION}.`;
  const user = JSON.stringify(
    {
      brief: {
        industryFamily: brief.industryFamily,
        businessPurpose: brief.businessPurpose,
        targetAudience: brief.targetAudience,
        whatIsPromoted: brief.whatIsPromoted,
        primaryMessage: brief.primaryMessage,
        cta: brief.cta,
        moodId: brief.moodId,
        chooseForMe: brief.chooseForMe,
        wordmarkOnly: brief.wordmarkOnly,
        intendedUse: brief.intendedUse,
        dislikedNotes: brief.dislikedNotes,
      },
      routes: direction.candidateRoutes.map((route) => ({
        routeId: route.routeId,
        label: route.label,
        layoutFamilyId: route.layoutFamilyId,
        paletteFamilyId: route.paletteFamilyId,
        typeSystemId: route.typeSystemId,
        geometryId: route.geometryId,
        rationale: route.rationale,
      })),
    },
    null,
    2,
  );
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
        max_tokens: 400,
        temperature: 0.4,
        system,
        messages: [{ role: "user", content: user }],
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
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced?.[1]?.trim() ?? text.trim();
    const parsed = JSON.parse(candidate) as { selectedRouteId?: string };
    const routeId = String(parsed.selectedRouteId ?? "");
    if (!direction.candidateRoutes.some((route) => route.routeId === routeId)) {
      return { ok: false, message: "Anthropic returned an unknown route" };
    }
    return { ok: true, routeId, why: "selected", model };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export { proposeCreativeRoutes };
