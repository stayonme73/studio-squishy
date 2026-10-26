/**
 * Full-canvas composition intelligence.
 * A solid-color background does not count as using the canvas.
 * Negative space is legitimate only when planned.
 */

import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";
import type {
  FlyerDesignSpec,
  FlyerProjectTruth,
  FlyerTextLayer,
} from "@/lib/studio-design-renderer/types";

export type CanvasThirdRatios = {
  top: number;
  mid: number;
  bottom: number;
};

export type CanvasCompositionReport = {
  textMass: CanvasThirdRatios;
  lowerThirdHasDesignedContent: boolean;
  midHasDesignedContent: boolean;
  atmosphereOnlyField: boolean;
  topHeavy: boolean;
};

const ATMOSPHERE_IDS = new Set([
  "field-bleed",
  "paper-mat",
  "split-field",
  "hero-slab",
  "service-rail",
  "identity-rule",
  "cta-rule",
  "tick-square",
]);

const DESIGNED_CONTENT_IDS = new Set([
  "offer-panel",
  "mid-band",
  "footer-band",
  "cta-bar",
  "cta-plate",
  "lower-dock",
  "visual-anchor",
]);

function textHeight(layer: FlyerTextLayer): number {
  const maxLines = layer.maxLines ?? 2;
  const approx = Math.max(
    12,
    Math.floor(layer.width / Math.max(10, layer.fontSizePx * 0.5)),
  );
  const lines = Math.min(
    maxLines,
    Math.max(1, Math.ceil(layer.content.length / approxCharsSafe(approx))),
  );
  return Math.round(layer.fontSizePx * (layer.lineHeight || 1.2) * lines);
}

function approxCharsSafe(value: number): number {
  return Math.max(1, value);
}

export function measureCanvasDistribution(
  spec: FlyerDesignSpec,
): CanvasCompositionReport {
  const height = spec.canvas.heightPx;
  const third = height / 3;
  const mass = { top: 0, mid: 0, bottom: 0 };
  for (const layer of spec.layers) {
    if (layer.type !== "text") continue;
    const h = textHeight(layer);
    const center = layer.y + h / 2;
    if (center < third) mass.top += h;
    else if (center < third * 2) mass.mid += h;
    else mass.bottom += h;
  }
  const total = mass.top + mass.mid + mass.bottom || 1;
  const textMass = {
    top: mass.top / total,
    mid: mass.mid / total,
    bottom: mass.bottom / total,
  };
  const lowerStart = height * 0.68;
  const midStart = height * 0.32;
  const midEnd = height * 0.68;
  let lowerThirdHasDesignedContent = false;
  let midHasDesignedContent = false;
  let atmosphereArea = 0;
  let designedArea = 0;
  for (const layer of spec.layers) {
    if (layer.type === "text") {
      const h = textHeight(layer);
      const bottom = layer.y + h;
      if (bottom > lowerStart || layer.y >= lowerStart) {
        lowerThirdHasDesignedContent = true;
      }
      if (layer.y < midEnd && layer.y + h > midStart) {
        midHasDesignedContent = true;
      }
      continue;
    }
    if (layer.type !== "shape" && layer.type !== "image") continue;
    const area = layer.width * layer.height;
    if (DESIGNED_CONTENT_IDS.has(layer.id) || layer.type === "image") {
      designedArea += area;
      if (layer.y + layer.height > lowerStart) lowerThirdHasDesignedContent = true;
      if (layer.y < midEnd && layer.y + layer.height > midStart) {
        midHasDesignedContent = true;
      }
    } else if (ATMOSPHERE_IDS.has(layer.id)) {
      atmosphereArea += area;
    }
  }
  const canvasArea = spec.canvas.widthPx * height;
  return {
    textMass,
    lowerThirdHasDesignedContent,
    midHasDesignedContent,
    atmosphereOnlyField: atmosphereArea > canvasArea * 0.45 && designedArea < canvasArea * 0.12,
    topHeavy: textMass.top >= 0.62 && textMass.bottom < 0.18,
  };
}

function pushFail(
  findings: DesignQualityFinding[],
  id: string,
  message: string,
): void {
  findings.push({
    id,
    severity: "fail",
    checkKind: "creative_quality",
    message,
  });
}

export function evaluateFullCanvasComposition(input: {
  spec: FlyerDesignSpec;
  truth: FlyerProjectTruth;
}): DesignQualityFinding[] {
  const findings: DesignQualityFinding[] = [];
  if (input.truth.outputMode !== "customer") return findings;
  if (!input.truth.creativeDirection) return findings;
  const report = measureCanvasDistribution(input.spec);
  if (report.topHeavy) {
    pushFail(
      findings,
      "top_heavy_composition",
      "Copy huddles in the upper canvas. A paying customer would read this as unfinished, not as intentional negative space.",
    );
  }
  if (!report.lowerThirdHasDesignedContent) {
    pushFail(
      findings,
      "unfinished_lower_canvas",
      "The lower canvas has no designed content (CTA dock, contact, offer region, or visual anchor). A solid field is not a composition.",
    );
  }
  if (!report.midHasDesignedContent) {
    pushFail(
      findings,
      "accidental_dead_space",
      "The middle of the canvas is unused. Negative space must be planned; leftover middle is accidental dead space.",
    );
  }
  if (report.atmosphereOnlyField && report.topHeavy) {
    pushFail(
      findings,
      "words_on_background",
      "This is words placed on a background. A solid-color field does not count as using the canvas.",
    );
  }
  return findings;
}
