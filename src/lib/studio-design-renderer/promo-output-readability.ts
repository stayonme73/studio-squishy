/**
 * Promotion-graphics readability gate.
 * Reuses the flyer prose floor. A descriptor that is part of the design must
 * have a measured contrast of at least 4.5:1. A design with no descriptor
 * line is not failed for that absence. The gold offer band and website line
 * are not prose and are not graded here.
 */

import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";

import {
  backdropFillFor,
  contrastRatio,
  evaluateFlyerOutputReadability,
  MIN_BODY_COPY_CONTRAST_RATIO,
} from "./flyer-output-readability";
import type { PromoAssetSpec, PromoCampaignSetSpec } from "./promo-types";
import {
  DESIGN_RENDERER_PROOF_SKU,
  FLYER_DESIGN_SPEC_VERSION,
  type FlyerDesignLayer,
  type FlyerDesignSpec,
  type FlyerTextLayer,
} from "./types";

const GRADED_ROLES = ["body", "descriptor"] as const;

export type PromoReadabilityLine = {
  assetId: string;
  role: (typeof GRADED_ROLES)[number];
  color: string;
  backdrop: string;
  ratio: number;
};

export type PromoReadabilityResult = {
  ok: boolean;
  readabilityReviewed: boolean;
  floor: number;
  lines: readonly PromoReadabilityLine[];
  findings: readonly DesignQualityFinding[];
  evidence: string;
};

function parseableHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function finding(id: string, message: string): DesignQualityFinding {
  return { id, severity: "fail", checkKind: "creative_quality", message };
}

function assetAsFlyerSpec(
  spec: PromoCampaignSetSpec,
  asset: PromoAssetSpec,
): FlyerDesignSpec {
  const layers: FlyerDesignLayer[] = [];
  for (const layer of asset.layers) {
    if (layer.type === "text" && layer.role !== "purpose_label") {
      layers.push(layer as FlyerDesignLayer);
    } else if (layer.type === "shape" && layer.role !== "offer_band") {
      layers.push(layer as FlyerDesignLayer);
    }
  }
  return {
    specVersion: FLYER_DESIGN_SPEC_VERSION,
    skuId: DESIGN_RENDERER_PROOF_SKU,
    canvas: asset.canvas,
    background: asset.background,
    colors: spec.colors,
    layers,
    materials: [],
    outputFormats: ["png"],
    reasoningMode: "deterministic_constrained",
  };
}

function descriptorLayers(spec: PromoCampaignSetSpec): Array<{ assetId: string; content: string }> {
  const included = [];
  for (const asset of spec.assets) {
    for (const layer of asset.layers) {
      if (layer.type === "text" && layer.role === "descriptor") {
        included.push({ assetId: asset.assetId, content: layer.content });
      }
    }
  }
  return included;
}

export function evaluatePromoCampaignSetReadability(
  spec: PromoCampaignSetSpec,
): PromoReadabilityResult {
  const findings: DesignQualityFinding[] = [];
  const lines: PromoReadabilityLine[] = [];
  const includedDescriptors = descriptorLayers(spec);

  for (const asset of spec.assets) {
    const flyerSpec = assetAsFlyerSpec(spec, asset);
    findings.push(
      ...evaluateFlyerOutputReadability(flyerSpec).filter(
        (entry) =>
          !(
            entry.id === "body_copy_contrast_below_output_floor" &&
            entry.message.startsWith("descriptor copy")
          ),
      ),
    );
    for (const layer of asset.layers) {
      if (layer.type !== "text" || layer.role !== "descriptor") continue;
      if (!layer.content.trim()) {
        findings.push(
          finding(
            "descriptor_content_missing",
            `${asset.assetId} includes a descriptor line with no text. Missing descriptor text is not a descriptor-free design.`,
          ),
        );
        continue;
      }
      const backdrop = backdropFillFor(flyerSpec, layer as FlyerTextLayer);
      if (!parseableHex(layer.color) || !parseableHex(backdrop)) {
        findings.push(
          finding(
            "descriptor_contrast_not_measured",
            `${asset.assetId} descriptor contrast was not measured. A descriptor that is part of the design requires a measured ratio against the plate.`,
          ),
        );
        continue;
      }
      const ratio = contrastRatio(layer.color, backdrop);
      lines.push({
        assetId: asset.assetId,
        role: "descriptor",
        color: layer.color.toUpperCase(),
        backdrop: backdrop.toUpperCase(),
        ratio,
      });
      if (ratio < MIN_BODY_COPY_CONTRAST_RATIO) {
        findings.push(
          finding(
            "body_copy_contrast_below_output_floor",
            `${asset.assetId} descriptor at ${layer.color.toUpperCase()} on ${backdrop.toUpperCase()} has ${ratio.toFixed(2)}:1 contrast, below the ${MIN_BODY_COPY_CONTRAST_RATIO}:1 floor.`,
          ),
        );
      }
    }
    for (const layer of flyerSpec.layers) {
      if (layer.type !== "text" || layer.role !== "body" || !layer.content.trim()) continue;
      const backdrop = backdropFillFor(flyerSpec, layer);
      if (!parseableHex(layer.color) || !parseableHex(backdrop)) {
        findings.push(
          finding(
            "body_copy_contrast_not_measured",
            `${asset.assetId} body contrast was not measured. A readability PASS requires a measured ratio against the plate.`,
          ),
        );
        continue;
      }
      lines.push({
        assetId: asset.assetId,
        role: "body",
        color: layer.color.toUpperCase(),
        backdrop: backdrop.toUpperCase(),
        ratio: contrastRatio(layer.color, backdrop),
      });
    }
  }

  const measuredDescriptors = lines.filter((line) => line.role === "descriptor");
  const descriptorsPass =
    includedDescriptors.length === 0 ||
    (measuredDescriptors.length === includedDescriptors.length &&
      measuredDescriptors.every((line) => line.ratio >= MIN_BODY_COPY_CONTRAST_RATIO));
  const ok = findings.length === 0 && descriptorsPass;
  const evidence = !ok
    ? findings.map((entry) => entry.message).join(" ")
    : includedDescriptors.length === 0
      ? "No descriptor line is part of this design. Descriptor contrast was not required."
      : `Descriptor contrast measured ${measuredDescriptors
          .map((line) => `${line.assetId} ${line.ratio.toFixed(2)}:1 ${line.color} on ${line.backdrop}`)
          .join("; ")}. Floor ${MIN_BODY_COPY_CONTRAST_RATIO}:1.`;

  return {
    ok,
    readabilityReviewed: ok,
    floor: MIN_BODY_COPY_CONTRAST_RATIO,
    lines,
    findings,
    evidence,
  };
}
