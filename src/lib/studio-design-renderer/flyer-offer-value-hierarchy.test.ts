import path from "node:path";
import { describe, expect, it } from "vitest";

import { classifyFindingId } from "@/lib/studio-production-correction/types";

import { buildHarborOakFlyerProjectTruth } from "./fixtures";
import { evaluateFlyerSpecCreativeQuality } from "./flyer-creative-quality";
import {
  CAPPED_DECORATIVE_GEOMETRY_PX,
  isPromotionalPricePrimaryAttention,
  promotionalPriceCalloutMinPx,
  promotionalPriceCalloutTargetPx,
  resolvePriceCalloutSizePx,
} from "./flyer-offer-value-hierarchy";
import { reasonFlyerDesignSpecDeterministic } from "./reason";
import type { FlyerProjectTruth } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function northsideSparse(): FlyerProjectTruth {
  const harbor = buildHarborOakFlyerProjectTruth({ repoRoot: REPO });
  return {
    ...harbor,
    outputMode: "customer",
    businessName: "Northside Atelier",
    wordmark: "Northside Atelier",
    descriptor: "",
    headline: "Grand Opening",
    offerName: "first styling appointment",
    priceDisplay: "$45",
    wasPriceDisplay: "",
    dateWindow: "",
    body: "",
    cta: "Call or visit",
    phone: "(804) 555-0142",
    webDisplay: "northsideatelier.example",
    webUrl: "https://northsideatelier.example",
    disclaimer: "",
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: ["$45", "Grand Opening", "styling"],
    prohibitedClaimPatterns: [
      "See offer details",
      "Book online or call",
      "flyer for",
    ],
  };
}

describe("offer-value hierarchy", () => {
  it("treats a sparse no-photo price as a primary attention element", () => {
    expect(isPromotionalPricePrimaryAttention(northsideSparse())).toBe(true);
  });

  it("does not treat Harbor's priced flyer as a swagger callout when imagery and body lead", () => {
    const harbor = buildHarborOakFlyerProjectTruth({ repoRoot: REPO });
    expect(isPromotionalPricePrimaryAttention(harbor)).toBe(false);
    expect(
      resolvePriceCalloutSizePx({
        canvasWidthPx: 1024,
        availablePx: 700,
        innerWidthPx: 800,
        promotionalPricePrimary: false,
        capGeometry: false,
      }),
    ).toBeLessThanOrEqual(280);
  });

  it("sizes a primary promotional price as a substantial callout, not a button", () => {
    const truth = northsideSparse();
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const medallion = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-medallion",
    );
    const wordmark = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "wordmark",
    );
    const phone = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "contact_phone",
    );
    const offer = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "offer",
    );
    const price = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "price",
    );
    expect(medallion?.type).toBe("shape");
    if (medallion?.type !== "shape") return;
    expect(medallion.height).toBe(promotionalPriceCalloutTargetPx(1024));
    expect(medallion.height).toBeGreaterThanOrEqual(
      promotionalPriceCalloutMinPx(1024),
    );
    expect(wordmark?.type === "text" && wordmark.fontSizePx).toBeGreaterThanOrEqual(
      42,
    );
    expect(phone?.type === "text" && phone.fontSizePx).toBeGreaterThanOrEqual(28);
    expect(offer?.type === "text" && offer.content).not.toMatch(/\$45/);
    expect(price?.type === "text" && price.content).toMatch(/\$45/);
    expect(
      evaluateFlyerSpecCreativeQuality(spec, truth).filter(
        (finding) => finding.severity === "fail",
      ),
    ).toEqual([]);
  });

  it("fails a hollow oversized seal that is not a price callout", () => {
    const truth = northsideSparse();
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const hollow = {
      ...spec,
      layers: spec.layers
        .filter((layer) => layer.role !== "price")
        .map((layer) =>
          layer.id === "offer-medallion" && layer.type === "shape"
            ? { ...layer, width: 520, height: 520 }
            : layer,
        ),
    };
    const findings = evaluateFlyerSpecCreativeQuality(hollow, truth);
    expect(findings.map((finding) => finding.id)).toContain(
      "excessive_dominant_geometry",
    );
  });

  it("fails an underscaled promotional price treated as a decorative button", () => {
    const truth = northsideSparse();
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const tiny = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.id === "offer-medallion" && layer.type === "shape"
          ? {
              ...layer,
              width: CAPPED_DECORATIVE_GEOMETRY_PX,
              height: CAPPED_DECORATIVE_GEOMETRY_PX,
            }
          : layer,
      ),
    };
    const findings = evaluateFlyerSpecCreativeQuality(tiny, truth);
    expect(findings.map((finding) => finding.id)).toContain(
      "underscaled_promotional_price",
    );
    expect(classifyFindingId("underscaled_promotional_price")).toBe(
      "hierarchy_failure",
    );
  });

  it("still rejects a promotional callout that swallows the plate", () => {
    const truth = northsideSparse();
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const huge = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.id === "offer-medallion" && layer.type === "shape"
          ? { ...layer, width: 720, height: 720 }
          : layer,
      ),
    };
    const findings = evaluateFlyerSpecCreativeQuality(huge, truth);
    expect(findings.map((finding) => finding.id)).toContain(
      "excessive_dominant_geometry",
    );
  });

  it("keeps Harbor's supporting price from dominating the flyer", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO });
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    const medallion = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-medallion",
    );
    expect(medallion?.type === "shape" && medallion.height).toBeLessThanOrEqual(
      280,
    );
    const findings = evaluateFlyerSpecCreativeQuality(spec, truth).filter(
      (finding) => finding.severity === "fail",
    );
    expect(findings.map((finding) => finding.id)).not.toContain(
      "excessive_dominant_geometry",
    );
    expect(findings.map((finding) => finding.id)).not.toContain(
      "underscaled_promotional_price",
    );
  });
});
