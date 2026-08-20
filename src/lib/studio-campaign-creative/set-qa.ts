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
  if (!formatIds.has("social_square")) {
    findings.push({
      id: "missing_format_social_square",
      severity: "fail",
      message: "Missing format social_square",
    });
  }
  if (!formatIds.has("social_vertical")) {
    findings.push({
      id: "missing_format_social_vertical",
      severity: "fail",
      message: "Missing format social_vertical",
    });
  }
  if (!formatIds.has("print_handout") && !formatIds.has("print_counter_card")) {
    findings.push({
      id: "missing_print_format",
      severity: "fail",
      message: "Missing print_handout or print_counter_card",
    });
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

    const declared = declaredTextFromCampaignAsset(asset);
    const declaredLower = declared.toLowerCase();
    if (
      declaredLower.includes("nia rooted wellness") ||
      declaredLower.includes("nia rooted")
    ) {
      findings.push({
        id: `brand_mismatch_${asset.assetId}`,
        severity: "fail",
        message: `Forbidden brand string in artwork text on ${asset.assetId}`,
      });
    }
    if (
      !declared.includes(setSpec.brief.businessName) &&
      !asset.layers.some((l) => l.type === "image" && l.role === "logo")
    ) {
      findings.push({
        id: `brand_missing_${asset.assetId}`,
        severity: "fail",
        message: `Business identity missing on ${asset.assetId}`,
      });
    }

    const hasBody = asset.layers.some(
      (l) => l.type === "text" && l.role === "body" && l.content.trim().length >= 24,
    );
    if (asset.familyId === "full_bleed_hero" && !hasBody) {
      findings.push({
        id: `sell_copy_missing_${asset.assetId}`,
        severity: "fail",
        message: `Full-bleed asset ${asset.assetId} needs supporting proposition copy`,
      });
    }

    if (asset.formatId === "print_handout") {
      const hasWebButton = asset.layers.some(
        (l) => l.type === "shape" && l.role === "cta_button",
      );
      if (hasWebButton) {
        findings.push({
          id: `print_cta_web_button_${asset.assetId}`,
          severity: "fail",
          message: `Print handout must not use a web-style CTA button on ${asset.assetId}`,
        });
      }
      const hasContact = asset.layers.some(
        (l) =>
          l.type === "text" &&
          (l.role === "contact" || l.content === setSpec.brief.facts.bookingContact),
      );
      if (!hasContact || !setSpec.brief.facts.bookingContact.trim()) {
        findings.push({
          id: `print_cta_contact_${asset.assetId}`,
          severity: "fail",
          message: `Print handout needs contact/URL with CTA on ${asset.assetId}`,
        });
      }
    }

    if (asset.formatId === "print_counter_card") {
      const hasWebButton = asset.layers.some(
        (l) => l.type === "shape" && l.role === "cta_button",
      );
      if (hasWebButton) {
        findings.push({
          id: `print_cta_web_button_${asset.assetId}`,
          severity: "fail",
          message: `Counter card must not use a web-style CTA button on ${asset.assetId}`,
        });
      }
      if (setSpec.brief.facts.priceDisplay.trim()) {
        const hasPrice = asset.layers.some(
          (l) =>
            l.type === "text" &&
            (l.role === "price" ||
              l.content.includes(setSpec.brief.facts.priceDisplay)),
        );
        if (!hasPrice) {
          findings.push({
            id: `print_price_missing_${asset.assetId}`,
            severity: "fail",
            message: `Counter card needs the authorized price on ${asset.assetId}`,
          });
        }
      }
      if (setSpec.brief.facts.bookingContact.trim()) {
        const hasContact = asset.layers.some(
          (l) =>
            l.type === "text" &&
            (l.role === "contact" ||
              l.content.includes(setSpec.brief.facts.bookingContact)),
        );
        if (!hasContact) {
          findings.push({
            id: `print_cta_contact_${asset.assetId}`,
            severity: "fail",
            message: `Counter card needs the authorized product URL on ${asset.assetId}`,
          });
        }
      }
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
