import {
  evaluateTextLayerCollisions,
  type TextLayerCollisionInput,
} from "@/lib/studio-design-renderer/text-layer-collision";

import type { AutomatedQaResult } from "./contracts";
import { declaredTextFromCampaignAsset } from "./render-html";
import { assertNoInternalLeakInCampaignText } from "./customer-safe";
import type { CampaignCreativeSetSpec } from "./types";

export function validateCampaignCreativeSetSpec(
  setSpec: CampaignCreativeSetSpec,
): AutomatedQaResult {
  const findings: AutomatedQaResult["findings"] = [];

  if (setSpec.assets.length !== 3) {
    findings.push({
      id: "format_count",
      severity: "fail",
      message: `Expected 3 format assets, got ${setSpec.assets.length}`,
    });
  }

  const formatIds = new Set(setSpec.assets.map((a) => a.formatId));
  for (const f of ["social_square", "social_vertical", "print_handout"] as const) {
    if (!formatIds.has(f)) {
      findings.push({
        id: `missing_format_${f}`,
        severity: "fail",
        message: `Missing format ${f}`,
      });
    }
  }

  for (const asset of setSpec.assets) {
    const hasHero = asset.layers.some(
      (l) => l.type === "image" && l.role === "hero",
    );
    const hasLogo = asset.layers.some(
      (l) => l.type === "image" && l.role === "logo",
    );
    if (!hasHero) {
      findings.push({
        id: `hero_missing_${asset.assetId}`,
        severity: "fail",
        message: `Asset ${asset.assetId} missing hero image layer`,
      });
    }
    if (!hasLogo) {
      findings.push({
        id: `logo_missing_${asset.assetId}`,
        severity: "fail",
        message: `Asset ${asset.assetId} missing logo image layer`,
      });
    }

    // Hero must dominate — not a tiny CERT thumbnail
    const hero = asset.layers.find(
      (l) => l.type === "image" && l.role === "hero",
    );
    if (hero && hero.type === "image") {
      const area = hero.width * hero.height;
      const canvasArea = asset.canvas.widthPx * asset.canvas.heightPx;
      if (area < canvasArea * 0.28) {
        findings.push({
          id: `hero_too_small_${asset.assetId}`,
          severity: "fail",
          message: `Hero area below 28% of canvas on ${asset.assetId}`,
        });
      }
    }

    try {
      assertNoInternalLeakInCampaignText(declaredTextFromCampaignAsset(asset));
    } catch (e) {
      findings.push({
        id: `leak_${asset.assetId}`,
        severity: "fail",
        message: e instanceof Error ? e.message : String(e),
      });
    }

    const textInputs: TextLayerCollisionInput[] = asset.layers
      .filter((l): l is Extract<typeof l, { type: "text" }> => l.type === "text")
      .map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        width: l.width,
        fontSizePx: l.fontSizePx,
        lineHeight: l.lineHeight,
        content: l.content,
        maxLines: l.maxLines,
      }));

    const collision = evaluateTextLayerCollisions(textInputs);
    if (!collision.ok) {
      findings.push({
        id: `collision_${asset.assetId}`,
        severity: "fail",
        message: collision.message,
      });
    }

    for (const layer of asset.layers) {
      if (layer.type !== "text") continue;
      if (layer.fontSizePx < 14) {
        findings.push({
          id: `font_too_small_${layer.id}`,
          severity: "fail",
          message: `Font below minimum on ${layer.id}`,
        });
      }
      if (
        layer.x < 0 ||
        layer.y < 0 ||
        layer.x + layer.width > asset.canvas.widthPx + 1
      ) {
        findings.push({
          id: `text_oob_${layer.id}`,
          severity: "fail",
          message: `Text layer out of bounds: ${layer.id}`,
        });
      }
    }
  }

  // Coordinated not cloned — recipe ids differ by format but same family
  const families = new Set(setSpec.assets.map((a) => a.familyId));
  if (families.size !== 1) {
    findings.push({
      id: "family_incoherent",
      severity: "fail",
      message: "All formats must share one layout family",
    });
  }

  return { pass: findings.every((f) => f.severity !== "fail"), findings };
}
