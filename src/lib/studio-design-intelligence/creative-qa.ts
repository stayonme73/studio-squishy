import { DESIGN_INTELLIGENCE_VERSION } from "@/config/studio-design-intelligence-v1";
import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";
import type { FlyerDesignSpec, FlyerProjectTruth } from "@/lib/studio-design-renderer/types";

import { evaluateFullCanvasComposition } from "@/lib/studio-project-alpha/full-canvas";
import { critiqueAsCreativeDirector } from "@/lib/studio-project-alpha/creative-director";
import { evaluateAntiCopy, isMayaLikeDefault, BLOCKED_SEED_SIGNATURES } from "./anti-copy";
import type { VisualSignature } from "./types";

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

export const DESIGNED_HERO_IDS = new Set([
  "split-field",
  "hero-slab",
  "field-bleed",
  "service-rail",
  "footer-band",
  "visual-anchor",
  "cta-bar",
  "mid-band",
]);

export function evaluateDesignIntelligenceCreativeQa(input: {
  spec: FlyerDesignSpec;
  truth: FlyerProjectTruth;
  recent?: readonly VisualSignature[];
}): DesignQualityFinding[] {
  const findings: DesignQualityFinding[] = [];
  if (input.truth.outputMode !== "customer") return findings;
  const direction = input.truth.creativeDirection;
  const body = input.spec.layers.find(
    (layer) => layer.type === "text" && layer.role === "body",
  );
  if (body && body.type === "text" && body.fontSizePx < 16) {
    pushFail(
      findings,
      "tiny_body_copy",
      "Body copy is set too small for the intended flyer size — do not cram authorized facts into unreadably tiny type",
    );
  }
  if (!direction) return findings;
  const medallion = input.spec.layers.some((layer) => layer.id === "offer-medallion");
  const stamp = input.spec.creativeDirection;
  const layoutFamilyId =
    stamp?.layoutFamilyId ??
    direction?.selectedRoute.layoutFamilyId ??
    (medallion ? "centered_promotional_plate" : "unknown");
  const geometryId =
    stamp?.geometryId ??
    direction?.selectedRoute.geometryId ??
    (medallion ? "centered_circle" : "none");
  if (
    isMayaLikeDefault({
      primaryHex: input.spec.colors.primary,
      secondaryHex: input.spec.colors.secondary,
      geometryId,
      layoutFamilyId,
    }) &&
    !direction?.brief.existingBrandColors
  ) {
    pushFail(
      findings,
      "maya_like_default",
      "This flyer repeats the Maya-like navy/gold centered-circle house recipe. Design Production must choose a distinct direction from the brief.",
    );
  }
  if (direction) {
    const anti = evaluateAntiCopy({
      route: direction.selectedRoute,
      recent: input.recent ?? BLOCKED_SEED_SIGNATURES,
      independentlyJustified: Boolean(direction.brief.existingBrandColors),
      currentCampaignId: input.truth.campaignId,
    });
    if (!anti.ok) {
      pushFail(findings, anti.id, anti.message);
    }
  }
  const centeredCount = input.spec.layers.filter(
    (layer) => layer.type === "text" && layer.align === "center",
  ).length;
  const textCount = input.spec.layers.filter((layer) => layer.type === "text").length;
  if (
    medallion &&
    layoutFamilyId === "centered_promotional_plate" &&
    centeredCount >= Math.max(4, textCount - 1)
  ) {
    pushFail(
      findings,
      "template_generated_composition",
      "Composition reads as the Studio house plate (centered type + circular seal) rather than a brief-specific design.",
    );
  }
  if (
    direction &&
    direction.intelligenceVersion !== DESIGN_INTELLIGENCE_VERSION
  ) {
    pushFail(
      findings,
      "stale_creative_direction",
      "Creative direction stamp is not the current Design Intelligence version.",
    );
  }
  findings.push(...evaluateFullCanvasComposition({ spec: input.spec, truth: input.truth }));
  const director = critiqueAsCreativeDirector({
    spec: input.spec,
    truth: input.truth,
  });
  if (!director.ok) {
    for (const finding of director.findings) {
      if (!findings.some((item) => item.id === finding.id)) {
        findings.push(finding);
      }
    }
  }
  return findings;
}
