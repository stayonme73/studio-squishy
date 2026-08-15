/**
 * Creative reasoning → bounded FlyerDesignSpec.
 * Prefer Anthropic text-model path when available; always schema-constrained.
 * Does not require Tagia to lay out the flyer.
 */

import type {
  FlyerDesignLayer,
  FlyerDesignSpec,
  FlyerProjectTruth,
  FlyerTextLayer,
} from "./types";
import { FLYER_CANVAS, FLYER_DESIGN_SPEC_VERSION } from "./types";

function textLayer(
  partial: Omit<FlyerTextLayer, "type"> & { type?: "text" },
): FlyerTextLayer {
  return { type: "text", ...partial };
}

/**
 * Deterministic constrained reasoner — encodes hierarchy/layout from project truth.
 * Separable from rendering; still Owner-independent creative production for the proof.
 */
export function reasonFlyerDesignSpecDeterministic(
  truth: FlyerProjectTruth,
): FlyerDesignSpec {
  const c = truth.brandColors;
  const logo = truth.materials.find((m) => m.role === "logo");
  const yShift = logo ? 0 : -248;
  const longBody = truth.body.trim().length > 160;
  const bodyExtraY = longBody ? 120 : 0;


  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} (${truth.wasPriceDisplay})`
    : truth.priceDisplay;

  const identityLayers: FlyerDesignLayer[] = logo
    ? [
        {
          type: "shape",
          id: "logo-plate",
          role: "logo_plate",
          x: 392,
          y: 72,
          width: 240,
          height: 240,
          fill: "#FFFFFF",
          borderRadiusPx: 120,
        },
        {
          type: "image",
          id: "logo",
          role: "logo",
          materialId: logo.materialId,
          x: 416,
          y: 96,
          width: 192,
          height: 192,
          fit: "contain",
        },
      ]
    : [];

  return {
    specVersion: FLYER_DESIGN_SPEC_VERSION,
    skuId: truth.skuId,
    canvas: { ...FLYER_CANVAS },
    background: { color: c.background },
    colors: { ...c },
    materials: [...truth.materials],
    outputFormats: ["png", "pdf"],
    reasoningMode: "deterministic_constrained",
    layers: [
      {
        type: "shape",
        id: "plate-top",
        role: "accent_bar",
        x: 0,
        y: 0,
        width: FLYER_CANVAS.widthPx,
        height: 28,
        fill: c.primary,
      },
      ...identityLayers,
      textLayer({
        id: "wordmark",
        role: "wordmark",
        content: truth.wordmark,
        x: 72,
        y: 340 + yShift,
        width: 880,
        fontSizePx: 52,
        fontWeight: 700,
        lineHeight: 1.15,
        color: c.primary,
        align: "center",
      }),
      ...(truth.descriptor.trim()
        ? [
            textLayer({
              id: "descriptor",
              role: "descriptor",
              content: truth.descriptor,
              x: 72,
              y: 408 + yShift,
              width: 880,
              fontSizePx: 22,
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacingPx: 2,
              color: c.secondary,
              align: "center",
            }),
          ]
        : []),
      textLayer({
        id: "headline",
        role: "headline",
        content: truth.headline,
        x: 88,
        y: 480 + yShift,
        width: 848,
        fontSizePx: 40,
        fontWeight: 600,
        lineHeight: 1.2,
        color: c.text,
        align: "center",
      }),
      {
        type: "shape",
        id: "offer-rule",
        role: "footer_rule",
        x: 360,
        y: 560 + yShift,
        width: 304,
        height: 3,
        fill: c.secondary,
      },
      textLayer({
        id: "offer",
        role: "offer",
        content: truth.offerName,
        x: 72,
        y: 596 + yShift,
        width: 880,
        fontSizePx: 34,
        fontWeight: 700,
        lineHeight: 1.25,
        color: c.primary,
        align: "center",
      }),
      textLayer({
        id: "price",
        role: "price",
        content: priceLine,
        x: 72,
        y: 700 + yShift,
        width: 880,
        fontSizePx: 56,
        fontWeight: 700,
        lineHeight: 1.1,
        color: c.text,
        align: "center",
      }),
      textLayer({
        id: "dates",
        role: "dates",
        content: truth.dateWindow,
        x: 72,
        y: 780 + yShift,
        width: 880,
        fontSizePx: 26,
        fontWeight: 500,
        lineHeight: 1.2,
        color: c.muted,
        align: "center",
      }),
      textLayer({
        id: "body",
        role: "body",
        content: truth.body,
        x: 100,
        y: 860 + yShift,
        width: 824,
        fontSizePx: longBody ? 20 : 24,
        fontWeight: 400,
        lineHeight: 1.45,
        color: c.text,
        align: "center",
        maxLines: longBody ? 7 : 4,
      }),
      {
        type: "shape",
        id: "cta-plate",
        role: "plate",
        x: 212,
        y: 1040 + yShift + bodyExtraY,
        width: 600,
        height: 88,
        fill: c.primary,
        borderRadiusPx: 12,
      },
      textLayer({
        id: "cta",
        role: "cta",
        content: truth.cta,
        x: 212,
        y: 1064 + yShift + bodyExtraY,
        width: 600,
        fontSizePx: 28,
        fontWeight: 600,
        lineHeight: 1.2,
        color: "#F7F4EF",
        align: "center",
      }),
      textLayer({
        id: "phone",
        role: "contact_phone",
        content: `phone ${truth.phone}`,
        x: 72,
        y: 1180 + yShift + bodyExtraY,
        width: 880,
        fontSizePx: 24,
        fontWeight: 500,
        lineHeight: 1.2,
        color: c.text,
        align: "center",
      }),
      textLayer({
        id: "web",
        role: "contact_web",
        content: `web ${truth.webDisplay}`,
        x: 72,
        y: 1220 + yShift + bodyExtraY,
        width: 880,
        fontSizePx: 22,
        fontWeight: 500,
        lineHeight: 1.2,
        color: c.primary,
        align: "center",
      }),
      textLayer({
        id: "disclaimer",
        role: "disclaimer",
        content: truth.disclaimer,
        x: 72,
        y: 1420 + yShift + bodyExtraY,
        width: 880,
        fontSizePx: 14,
        fontWeight: 400,
        lineHeight: 1.35,
        color: c.muted,
        align: "center",
        maxLines: 3,
      }),
      {
        type: "shape",
        id: "plate-bottom",
        role: "accent_bar",
        x: 0,
        y: FLYER_CANVAS.heightPx - 28,
        width: FLYER_CANVAS.widthPx,
        height: 28,
        fill: c.primary,
      },
    ],
  };
}

type AnthropicReasonResult =
  | { ok: true; spec: FlyerDesignSpec }
  | { ok: false; message: string };

/**
 * Optional Anthropic path — same Messages API pattern as decision-learner.
 * Output must validate against FlyerDesignSpec; inventing prohibited claims fails later.
 */
export async function reasonFlyerDesignSpecAnthropic(
  truth: FlyerProjectTruth,
): Promise<AnthropicReasonResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "ANTHROPIC_API_KEY not set" };
  }

  const base = reasonFlyerDesignSpecDeterministic(truth);
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";

  const system = `You are The Studio design reasoner for SKU v2-rtu-flyer.
Return ONLY valid JSON for a FlyerDesignSpec. Do not invent prices, offers, or prohibited claims.
You may refine hierarchy (font sizes, y positions, wording polish) within the provided facts.
Preserve all required tokens. Canvas must remain ${FLYER_CANVAS.widthPx}x${FLYER_CANVAS.heightPx}.
outputFormats must be ["png","pdf"]. materials must be unchanged from input.
specVersion must be "${FLYER_DESIGN_SPEC_VERSION}". skuId must be "v2-rtu-flyer".
reasoningMode must be "anthropic_text_model".`;

  const user = JSON.stringify(
    {
      projectTruth: {
        businessName: truth.businessName,
        wordmark: truth.wordmark,
        descriptor: truth.descriptor,
        headline: truth.headline,
        offerName: truth.offerName,
        priceDisplay: truth.priceDisplay,
        wasPriceDisplay: truth.wasPriceDisplay,
        dateWindow: truth.dateWindow,
        body: truth.body,
        cta: truth.cta,
        phone: truth.phone,
        webDisplay: truth.webDisplay,
        requiredTextTokens: truth.requiredTextTokens,
        prohibitedClaimPatterns: truth.prohibitedClaimPatterns,
        brandColors: truth.brandColors,
      },
      seedSpec: base,
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
        max_tokens: 4000,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!response.ok) {
      return {
        ok: false,
        message: `Anthropic HTTP ${response.status}: ${await response.text()}`,
      };
    }
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced?.[1]?.trim() ?? text.trim();
    const parsed = JSON.parse(candidate) as FlyerDesignSpec;
    parsed.materials = [...truth.materials];
    parsed.reasoningMode = "anthropic_text_model";
    parsed.reasoningModel = model;
    parsed.specVersion = FLYER_DESIGN_SPEC_VERSION;
    parsed.skuId = truth.skuId;
    parsed.outputFormats = ["png", "pdf"];
    parsed.canvas = { ...FLYER_CANVAS };
    return { ok: true, spec: parsed };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function reasonFlyerDesignSpec(input: {
  truth: FlyerProjectTruth;
  preferAnthropic?: boolean;
}): Promise<FlyerDesignSpec> {
  if (input.preferAnthropic !== false) {
    const ai = await reasonFlyerDesignSpecAnthropic(input.truth);
    if (ai.ok) return ai.spec;
  }
  return reasonFlyerDesignSpecDeterministic(input.truth);
}
