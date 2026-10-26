import { describe, expect, it } from "vitest";
import path from "node:path";

import { classifyFindingId } from "@/lib/studio-production-correction/types";

import { buildHarborOakFlyerProjectTruth } from "./fixtures";
import {
  evaluateFlyerSpecCreativeQuality,
  liveAreaOccupancy,
} from "./flyer-creative-quality";
import {
  FLYER_FORMAT_POSTER,
  FLYER_FORMAT_SQUARE,
  evaluateContentProportionalComposition,
  parseCustomerSelectedFlyerFormat,
  resolveFlyerFormat,
  trailingUnusedRatio,
} from "./flyer-content-proportional-composition";
import { reasonFlyerDesignSpecDeterministic } from "./reason";
import type { FlyerProjectTruth } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function northsideSparse(overrides: Partial<FlyerProjectTruth> = {}): FlyerProjectTruth {
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
    sizeNotes: "",
    intendedUse: "Both print and digital",
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: ["$45", "Grand Opening", "styling"],
    prohibitedClaimPatterns: ["See offer details", "Book online or call", "flyer for"],
    ...overrides,
  };
}

describe("content-proportional flyer composition", () => {
  it("does not shrink a sparse flyer merely because copy is short", () => {
    const truth = northsideSparse();
    const resolved = resolveFlyerFormat(truth);
    expect(resolved.format).toEqual(FLYER_FORMAT_POSTER);
    expect(resolved.reason).toBe("default_poster");
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    expect(spec.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });
  });

  it("keeps customer-selected 8.5x11 on the poster plate even with short copy", () => {
    const truth = northsideSparse({
      sizeNotes: "8.5x11",
      intendedUse: "Digital only — share online",
    });
    const resolved = resolveFlyerFormat(truth);
    expect(resolved.sizeLocked).toBe(true);
    expect(resolved.format).toEqual(FLYER_FORMAT_POSTER);
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    expect(spec.canvas.heightPx).toBe(1536);
  });

  it("uses the square plate when the customer selected square", () => {
    expect(parseCustomerSelectedFlyerFormat("square 1024")).toEqual(
      FLYER_FORMAT_SQUARE,
    );
    const spec = reasonFlyerDesignSpecDeterministic(
      northsideSparse({ sizeNotes: "square" }),
      { capDominantGeometry: true },
    );
    expect(spec.canvas).toEqual({ widthPx: 1024, heightPx: 1024 });
  });

  it("may choose square for digital-only short copy when size was not specified", () => {
    const resolved = resolveFlyerFormat(
      northsideSparse({ intendedUse: "Digital — share online", sizeNotes: "" }),
    );
    expect(resolved.sizeLocked).toBe(false);
    expect(resolved.format).toEqual(FLYER_FORMAT_SQUARE);
    expect(resolved.reason).toBe("digital_use_with_short_copy");
  });

  it("keeps Harbor Oak on the poster plate because the content justifies it", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO });
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    expect(spec.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });
    expect(liveAreaOccupancy(spec)).toBeGreaterThan(0.72);
    expect(
      evaluateContentProportionalComposition(spec, truth).filter(
        (finding) => finding.severity === "fail",
      ),
    ).toEqual([]);
  });

  it("fails a large-canvas cluster that occupies space only with decorative chrome", () => {
    const truth = northsideSparse();
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    const clustered = {
      ...spec,
      canvas: { widthPx: 1024, heightPx: 1536 },
      layers: spec.layers.map((layer) => {
        if (layer.id.startsWith("corner-") || layer.id.startsWith("frame-")) {
          return layer;
        }
        if (layer.id === "plate-bottom" || layer.id === "paper-mat") {
          return layer;
        }
        if (layer.y > 780) {
          const next = { ...layer, y: layer.y - 560 };
          return next;
        }
        return layer;
      }),
    };
    const findings = evaluateContentProportionalComposition(clustered, truth);
    expect(findings.map((finding) => finding.id)).toContain(
      "content_disproportionate_format",
    );
    expect(classifyFindingId("content_disproportionate_format")).toBe(
      "hollow_unused_composition",
    );
    expect(trailingUnusedRatio(clustered)).toBeGreaterThan(0.18);
  });

  it("docks the contact band and uses the poster live area without inventing facts", () => {
    const truth = northsideSparse();
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
      tightenComposition: true,
    });
    const footer = spec.layers.find(
      (layer) => layer.id === "footer-band" && layer.type === "shape",
    );
    expect(footer?.type).toBe("shape");
    if (footer?.type !== "shape") return;
    expect(footer.y + footer.height).toBeGreaterThan(spec.canvas.heightPx - 140);
    expect(trailingUnusedRatio(spec)).toBeLessThanOrEqual(0.18);
    const declared = spec.layers
      .filter((layer): layer is Extract<typeof layer, { type: "text" }> => layer.type === "text")
      .map((layer) => layer.content)
      .join("\n");
    expect(declared).not.toMatch(/hours/i);
    expect(declared).not.toMatch(/instagram/i);
    expect(declared).not.toMatch(/follow us/i);
    const identityRule = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "identity-rule",
    );
    const panel = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-panel",
    );
    const offer = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "offer",
    );
    const price = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "price",
    );
    expect(identityRule?.type).toBe("shape");
    expect(panel?.type).toBe("shape");
    if (identityRule?.type === "shape" && panel?.type === "shape") {
      expect(panel.y - (identityRule.y + identityRule.height)).toBeLessThanOrEqual(
        180,
      );
    }
    expect(offer?.type === "text" && offer.content).not.toMatch(/\$45/);
    expect(price?.type === "text" && price.content).toMatch(/\$45/);
    expect(
      evaluateFlyerSpecCreativeQuality(spec, truth).filter(
        (finding) => finding.severity === "fail",
      ),
    ).toEqual([]);
  });
});
