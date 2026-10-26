/**
 * Image-generation requests derived from a customer's own visual direction.
 *
 * Per `docs/studio-production-lane-doctrine-v1-locked.md`, the picture comes from
 * the provider and the Studio finishes the deliverable. This module builds the
 * request and does the arithmetic that decides whether the provider can actually
 * serve the box the composition wants to fill — before any money is spent.
 *
 * Two hard rules it enforces:
 *
 * 1. **No customer fact reaches the provider.** Visual and style direction are
 *    direction, not facts. Names, prices, phone numbers, URLs, headlines, and CTAs
 *    stay in the renderer. Reuses the existing leak guard rather than a second one.
 * 2. **No pretending about resolution.** A generated asset has a fixed pixel size.
 *    If it cannot cover its printed box with real crop headroom, that is reported
 *    as a shortfall, not smoothed over by upscaling.
 */

import {
  GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE,
  STUDIO_PROVIDER_RATE_CARD_V1,
} from "@/config/studio-production-cost-telemetry-v1";
import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import { promptOwnsNoCustomerFacts } from "@/lib/studio-project-alpha/hybrid-image";

/** The only sizes gpt-image-1 produces. Read from the priced table, not retyped. */
export const GPT_IMAGE_1_SIZES = Object.keys(
  GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE,
) as readonly GptImageSize[];

export type GptImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export function sizePixels(size: GptImageSize): { width: number; height: number } {
  const [width, height] = size.split("x").map(Number);
  return { width: width!, height: height! };
}

/**
 * Customer direction, separated from customer facts.
 *
 * `visualDirection` and `styleDirection` are the customer's words about how the
 * piece should look and feel. `lockedFacts` is everything that must never appear
 * in a prompt, checked rather than trusted.
 */
export type CustomerVisualDirection = {
  visualDirection: string;
  styleDirection: string;
  layoutDirection?: string;
  audience?: string;
  lockedFacts: readonly string[];
};

/** A box in the composition that a generated asset has to fill. */
export type GeneratedAssetSlot = {
  elementId: string;
  role: "hero" | "texture_inset";
  /** What this asset has to depict. Machine-owned subject, customer-owned mood. */
  subject: string;
  /** The box, in the document's logical units. */
  logicalBox: { width: number; height: number };
  /** Logical → print scale for the sheet under test. */
  printScale: number;
  dpi: number;
  /**
   * Whether the composition moves a focal point inside this asset. Focal latitude
   * needs the crop window to be smaller than the source on that axis.
   */
  focalControlled: boolean;
};

export type ResolutionAccounting = {
  /** The box at output resolution — the pixels that must be covered. */
  boxPrintPx: { width: number; height: number };
  /** The same box as a physical measurement on the sheet. */
  boxInches: { width: number; height: number };
  sourcePx: { width: number; height: number };
  /**
   * The crop window the focal maths will take out of the source, as a fraction of
   * the source. Mirrors `resolveCropWindow`, which is what actually runs.
   */
  cropWindow: { width: number; height: number };
  /** Source pixels available per box pixel, on the tighter axis, after cropping. */
  sourceScale: number;
  /** Effective print resolution of the placed asset, in pixels per inch. */
  effectivePpi: number;
  meetsCropHeadroom: boolean;
  /** Focal movement is only real where the crop window is narrower than the source. */
  focalLatitude: { horizontal: boolean; vertical: boolean };
  /**
   * Largest box, in inches at this DPI, that this source can fill while keeping
   * crop headroom. What the composition would have to shrink to.
   */
  maxHeadroomBoxInches: { width: number; height: number };
};

export type CustomerDirectionImageRequest = {
  slot: GeneratedAssetSlot;
  provider: "openai";
  model: "gpt-image-1";
  size: GptImageSize;
  quality: "high";
  n: 1;
  prompt: string;
  /** Verified, not assumed: the prompt carries none of the customer's facts. */
  factLeakFree: boolean;
  resolution: ResolutionAccounting;
  cost: RequestCostEstimate;
};

export type RequestCostEstimate = {
  imageOutputTokens: number;
  estimatedTextInputTokens: number;
  imageOutputUsd: number;
  textInputUsd: number;
  totalUsd: number;
  ratesVerifiedAgainstLiveBilling: boolean;
  source: string;
};

/**
 * Pick the offered size whose shape is closest to the box. gpt-image-1 has three,
 * so this is a choice between portrait, landscape, and square — nothing more.
 */
export function bestSizeForBox(box: { width: number; height: number }): GptImageSize {
  const wanted = box.width / Math.max(1, box.height);
  let best: GptImageSize = "1024x1024";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const size of GPT_IMAGE_1_SIZES) {
    const pixels = sizePixels(size);
    const distance = Math.abs(pixels.width / pixels.height - wanted);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = size;
    }
  }
  return best;
}

/**
 * The crop window `resolveCropWindow` will take, as source fractions. Duplicated
 * deliberately in fraction-only form so the spend gate can do this arithmetic
 * without constructing a document or booting a renderer.
 */
function cropWindowFractions(
  source: { width: number; height: number },
  box: { width: number; height: number },
): { width: number; height: number } {
  const boxAspect = box.width / Math.max(1, box.height);
  const sourceAspect = source.width / Math.max(1, source.height);
  return sourceAspect > boxAspect
    ? { width: Math.min(1, boxAspect / sourceAspect), height: 1 }
    : { width: 1, height: Math.min(1, sourceAspect / boxAspect) };
}

export function accountForResolution(input: {
  slot: GeneratedAssetSlot;
  size: GptImageSize;
}): ResolutionAccounting {
  const { slot } = input;
  const sourcePx = sizePixels(input.size);
  const boxPrintPx = {
    width: Math.round(slot.logicalBox.width * slot.printScale),
    height: Math.round(slot.logicalBox.height * slot.printScale),
  };
  const boxInches = {
    width: boxPrintPx.width / slot.dpi,
    height: boxPrintPx.height / slot.dpi,
  };
  const cropWindow = cropWindowFractions(sourcePx, boxPrintPx);
  const usable = {
    width: sourcePx.width * cropWindow.width,
    height: sourcePx.height * cropWindow.height,
  };
  const sourceScale = Math.min(
    usable.width / Math.max(1, boxPrintPx.width),
    usable.height / Math.max(1, boxPrintPx.height),
  );
  const headroom = cfg.cropHeadroom.minimumSourceScale;
  return {
    boxPrintPx,
    boxInches,
    sourcePx,
    cropWindow,
    sourceScale: Number(sourceScale.toFixed(4)),
    effectivePpi: Math.round(usable.width / Math.max(0.0001, boxInches.width)),
    meetsCropHeadroom: sourceScale >= headroom,
    focalLatitude: {
      horizontal: cropWindow.width < 0.999,
      vertical: cropWindow.height < 0.999,
    },
    maxHeadroomBoxInches: {
      width: Number((sourcePx.width / headroom / slot.dpi).toFixed(3)),
      height: Number((sourcePx.height / headroom / slot.dpi).toFixed(3)),
    },
  };
}

/**
 * Prompt text. The customer's style and visual words go in as written, because
 * that is the direction being executed. The refusals at the end are the Studio's,
 * not the customer's: generated pixels never carry a fact.
 */
export function buildCustomerDirectionPrompt(input: {
  direction: CustomerVisualDirection;
  slot: GeneratedAssetSlot;
  size: GptImageSize;
  attempt: number;
}): string {
  const { direction, slot, size } = input;
  const pixels = sizePixels(size);
  return [
    `Subject: ${slot.subject}`,
    `Visual direction from the client: ${direction.visualDirection}`,
    `Style: ${direction.styleDirection}`,
    direction.audience ? `It is made for ${direction.audience}.` : "",
    "Photographic realism: real light falling through a real window, real material texture, real depth of field. Not an illustration, not a render, not a flat vector scene.",
    slot.focalControlled
      ? "Compose loosely, with the subject well inside the frame and material continuing to every edge, so the frame can be re-cropped without losing the subject."
      : "Fill the frame edge to edge with material.",
    "No large empty, blown-out, or featureless regions; every part of the frame carries light or texture.",
    "Absolutely no text, letters, numbers, words, signage, labels, logos, watermarks, or any written mark anywhere in the frame.",
    `Output ${pixels.width}x${pixels.height}. Attempt ${input.attempt}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function estimateRequestCost(input: {
  size: GptImageSize;
  quality: "low" | "medium" | "high";
  prompt: string;
}): RequestCostEstimate {
  const rates = STUDIO_PROVIDER_RATE_CARD_V1.models["gpt-image-1"]!;
  const imageOutputTokens =
    GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE[input.size]?.[input.quality] ?? 0;
  /**
   * Prompt tokens are estimated at 4 characters per token. The generated pixels
   * dominate this bill by roughly two orders of magnitude, so the estimate does
   * not need to be tighter than that to be useful.
   */
  const estimatedTextInputTokens = Math.ceil(input.prompt.length / 4);
  const imageOutputUsd = (imageOutputTokens * (rates.imageOutputPerMillion ?? 0)) / 1_000_000;
  const textInputUsd = (estimatedTextInputTokens * rates.textInputPerMillion) / 1_000_000;
  return {
    imageOutputTokens,
    estimatedTextInputTokens,
    imageOutputUsd: Number(imageOutputUsd.toFixed(6)),
    textInputUsd: Number(textInputUsd.toFixed(6)),
    totalUsd: Number((imageOutputUsd + textInputUsd).toFixed(6)),
    ratesVerifiedAgainstLiveBilling:
      STUDIO_PROVIDER_RATE_CARD_V1.ratesVerifiedAgainstLiveBilling,
    source: rates.source,
  };
}

export function buildCustomerDirectionImageRequest(input: {
  direction: CustomerVisualDirection;
  slot: GeneratedAssetSlot;
  attempt?: number;
  /** Override the shape when the composition wants a specific one. */
  size?: GptImageSize;
}): CustomerDirectionImageRequest {
  const size = input.size ?? bestSizeForBox(input.slot.logicalBox);
  const attempt = input.attempt ?? 1;
  const prompt = buildCustomerDirectionPrompt({
    direction: input.direction,
    slot: input.slot,
    size,
    attempt,
  });
  return {
    slot: input.slot,
    provider: "openai",
    model: "gpt-image-1",
    size,
    quality: "high",
    n: 1,
    prompt,
    factLeakFree: promptOwnsNoCustomerFacts(prompt, input.direction.lockedFacts),
    resolution: accountForResolution({ slot: input.slot, size }),
    cost: estimateRequestCost({ size, quality: "high", prompt }),
  };
}

export type SpendGateReport = {
  requests: readonly CustomerDirectionImageRequest[];
  /** Facts that stay in the renderer. The provider never sees these. */
  factsOutsideImageLayer: readonly { factId: string; value: string }[];
  totalEstimatedUsd: number;
  /** Worst case if every request needs the full internal attempt budget. */
  worstCaseUsd: number;
  attemptBudget: number;
  /** Empty means the provider can serve every box at the requested print size. */
  resolutionShortfalls: readonly {
    elementId: string;
    boxInches: string;
    sourcePx: string;
    sourceScale: number;
    requiredScale: number;
    effectivePpi: number;
    maxHeadroomBoxInches: string;
  }[];
  allPromptsFactLeakFree: boolean;
  authorized: false;
};

export function buildSpendGateReport(input: {
  requests: readonly CustomerDirectionImageRequest[];
  factsOutsideImageLayer: readonly { factId: string; value: string }[];
  attemptBudget: number;
}): SpendGateReport {
  const total = input.requests.reduce((sum, request) => sum + request.cost.totalUsd, 0);
  return {
    requests: input.requests,
    factsOutsideImageLayer: input.factsOutsideImageLayer,
    totalEstimatedUsd: Number(total.toFixed(4)),
    worstCaseUsd: Number((total * input.attemptBudget).toFixed(4)),
    attemptBudget: input.attemptBudget,
    resolutionShortfalls: input.requests
      .filter((request) => !request.resolution.meetsCropHeadroom)
      .map((request) => ({
        elementId: request.slot.elementId,
        boxInches: `${request.resolution.boxInches.width.toFixed(2)}in x ${request.resolution.boxInches.height.toFixed(2)}in`,
        sourcePx: `${request.resolution.sourcePx.width}x${request.resolution.sourcePx.height}`,
        sourceScale: request.resolution.sourceScale,
        requiredScale: cfg.cropHeadroom.minimumSourceScale,
        effectivePpi: request.resolution.effectivePpi,
        maxHeadroomBoxInches: `${request.resolution.maxHeadroomBoxInches.width}in x ${request.resolution.maxHeadroomBoxInches.height}in`,
      })),
    allPromptsFactLeakFree: input.requests.every((request) => request.factLeakFree),
    /** This module never spends. Authorization is an Owner act, recorded elsewhere. */
    authorized: false,
  };
}
