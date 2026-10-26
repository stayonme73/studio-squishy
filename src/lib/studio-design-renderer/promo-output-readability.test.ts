/**
 * Descriptor contrast must be measured before promotion-graphics readability can pass.
 * No Playwright. Does not render or touch customer files.
 */

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { mapSocialPromoThemeLedPromoTruth } from "@/lib/studio-dispatch/map-social-promo-theme-led-truth";

import { MIN_BODY_COPY_CONTRAST_RATIO } from "./flyer-output-readability";
import { evaluatePromoCampaignSetReadability } from "./promo-output-readability";
import { buildHarborOakPromoCampaignSetTruth } from "./promo-fixtures";
import { reasonPromoCampaignSetDeterministic } from "./promo-reason";
import { declaredTextFromPromoAsset } from "./promo-render-html";
import { evaluatePromoSetConsistency } from "./promo-set-qa";
import type { PromoCampaignSetSpec } from "./promo-types";

const repoRoot = process.cwd();

function withDescriptorColor(spec: PromoCampaignSetSpec, color: string): PromoCampaignSetSpec {
  return {
    ...spec,
    assets: spec.assets.map((asset) => ({
      ...asset,
      layers: asset.layers.map((layer) =>
        layer.type === "text" && layer.role === "descriptor" ? { ...layer, color } : layer,
      ),
    })) as PromoCampaignSetSpec["assets"],
  };
}

function withDescriptorContent(spec: PromoCampaignSetSpec, content: string): PromoCampaignSetSpec {
  return {
    ...spec,
    assets: spec.assets.map((asset) => ({
      ...asset,
      layers: asset.layers.map((layer) =>
        layer.type === "text" && layer.role === "descriptor" ? { ...layer, content } : layer,
      ),
    })) as PromoCampaignSetSpec["assets"],
  };
}

function themeLedCampaign(): CampaignRecord {
  return {
    campaignId: "theme-led-proof",
    campaignName: "Proof Test Co",
    routeMapIntake: {
      submittedAt: "2026-10-10T08:49:04.923Z",
      answers: {
        "shared:businessName": "The Studio",
        "social_and_promo_graphics:purpose":
          "Promote The Studio as an easy creative-production partner for small business owners who need polished social media and promotional materials without spending hours creating everything themselves.",
        "social_and_promo_graphics:mustKeep":
          "Choose what you need, provide the information, and let The Studio handle the production.",
        "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
      },
    },
  } as unknown as CampaignRecord;
}

describe("promotion-graphics descriptor readability gate", () => {
  it("passes a measured navy descriptor and rejects gold on cream", () => {
    const spec = reasonPromoCampaignSetDeterministic(
      buildHarborOakPromoCampaignSetTruth({ repoRoot }),
    );
    const passing = evaluatePromoCampaignSetReadability(spec);
    expect(passing.readabilityReviewed).toBe(true);
    expect(passing.ok).toBe(true);
    const descriptors = passing.lines.filter((line) => line.role === "descriptor");
    expect(descriptors).toHaveLength(2);
    for (const line of descriptors) {
      expect(line.color).toBe("#1F3A5F");
      expect(line.backdrop).toBe("#F7F4EF");
      expect(line.ratio).toBeGreaterThanOrEqual(MIN_BODY_COPY_CONTRAST_RATIO);
      expect(Number(line.ratio.toFixed(2))).toBe(10.47);
    }
    expect(passing.evidence).toContain("10.47:1");

    const gold = evaluatePromoCampaignSetReadability(withDescriptorColor(spec, "#C4A574"));
    expect(gold.readabilityReviewed).toBe(false);
    expect(gold.ok).toBe(false);
    expect(gold.evidence).toContain("2.13:1");
    expect(gold.evidence).toContain("4.5");
  });

  it("refuses a readability pass when the descriptor contrast was not measured", () => {
    const spec = withDescriptorColor(
      reasonPromoCampaignSetDeterministic(buildHarborOakPromoCampaignSetTruth({ repoRoot })),
      "",
    );
    const missing = evaluatePromoCampaignSetReadability(spec);
    expect(missing.readabilityReviewed).toBe(false);
    expect(missing.ok).toBe(false);
    expect(missing.evidence).toContain("not measured");
  });

  it("fails a required descriptor that has no text", () => {
    const spec = withDescriptorContent(
      reasonPromoCampaignSetDeterministic(buildHarborOakPromoCampaignSetTruth({ repoRoot })),
      " ",
    );
    const missingText = evaluatePromoCampaignSetReadability(spec);
    expect(missingText.readabilityReviewed).toBe(false);
    expect(missingText.ok).toBe(false);
    expect(missingText.evidence).toContain("no text");
    expect(missingText.evidence).not.toContain("not required");
  });

  it("passes a valid theme-led set that has no descriptor", () => {
    const mapped = mapSocialPromoThemeLedPromoTruth({
      repoRoot,
      campaign: themeLedCampaign(),
      dispatchRecord: {
        dispatchId: "dd:theme-led-proof:social_and_promo_graphics:branch:campaign_graphics",
        jobId: "theme-led-proof:social_and_promo_graphics:branch:campaign_graphics",
        skuId: "v2-rtu-promotion-graphics",
        executionIdentityReady: true,
        status: "EXECUTION_IDENTITY_READY",
        requirements: { primaryTool: { toolId: "studio_design_renderer" } },
      } as never,
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    expect(spec.assets.every((asset) => asset.layers.every((layer) => layer.type !== "text" || layer.role !== "descriptor"))).toBe(true);
    const readability = evaluatePromoCampaignSetReadability(spec);
    expect(readability.ok).toBe(true);
    expect(readability.readabilityReviewed).toBe(true);
    expect(readability.lines.filter((line) => line.role === "descriptor")).toHaveLength(0);
    expect(readability.evidence).toContain("not required");
    const declaredTextByAsset = Object.fromEntries(
      spec.assets.map((asset) => [asset.assetId, declaredTextFromPromoAsset(asset)]),
    );
    const setQa = evaluatePromoSetConsistency({
      truth: mapped.truth,
      spec,
      declaredTextByAsset,
    });
    expect(setQa.ok).toBe(true);

    const incomplete = {
      ...mapped.truth,
      themeLed: { theme: "", coreMessage: "Choose what you need, provide the information, and let The Studio handle the production." },
    };
    expect(() => reasonPromoCampaignSetDeterministic(incomplete)).toThrow(/MISSING_REQUIRED_TRUTH/);
  });
});
