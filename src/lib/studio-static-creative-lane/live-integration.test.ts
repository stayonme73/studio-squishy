/**
 * Live static-creative lane — dispatch actually uses the shared path.
 */

import path from "path";
import { describe, expect, it } from "vitest";

import { applyExistingCtaHeadlineEmphasis } from "@/lib/studio-review-revision/flyer-revision-emphasis";
import { FLYER_DESIGN_SPEC_VERSION } from "@/lib/studio-design-renderer/types";
import { renderFlyerHtml } from "@/lib/studio-design-renderer/render-html";
import type { FlyerDesignSpec } from "@/lib/studio-design-renderer/types";

import {
  LIVE_HOUSE_FONT_STACK,
  fontStackIsDeterministic,
  liveHouseFontCss,
} from "./house-fonts-live";
import {
  liveCustomerJobSpecOverride,
  shouldUseLiveStage0Composition,
} from "./live-flyer-compose";
import {
  blocksSellablePrint,
  evaluateLivePrintDelivery,
  intakeClaimsMeasuredPrint,
} from "./live-print-claim";
import {
  headlineWasReplacedByCta,
  missingSuppliedFacts,
} from "./preserve-supplied-facts";
import { skuLaneRow, laneOverallGrade } from "./sku-lane-matrix";

const REPO = path.resolve(__dirname, "../../..");

function flyerSpec(): FlyerDesignSpec {
  return {
    specVersion: FLYER_DESIGN_SPEC_VERSION,
    skuId: "v2-rtu-flyer",
    canvas: { widthPx: 1024, heightPx: 1536 },
    background: { color: "#0b1420" },
    colors: {
      primary: "#16283c",
      secondary: "#d9b970",
      background: "#0b1420",
      text: "#f6f1e6",
      muted: "#d8cdb8",
    },
    layers: [
      {
        type: "text",
        id: "headline",
        role: "headline",
        content: "Grand Opening",
        x: 80,
        y: 200,
        width: 800,
        fontSizePx: 48,
        fontWeight: 600,
        lineHeight: 1.2,
        color: "#f6f1e6",
        align: "left",
      },
    ],
    materials: [],
    outputFormats: ["png", "pdf"],
    reasoningMode: "deterministic_constrained",
  };
}

describe("Live static-creative lane integration", () => {
  it("puts Stage 0 on the customer job path and keeps Harbor CERT on the legacy composer", () => {
    expect(shouldUseLiveStage0Composition({ outputMode: "customer" })).toBe(true);
    expect(
      shouldUseLiveStage0Composition({
        outputMode: "certification_fixture",
      }),
    ).toBe(false);
    expect(
      shouldUseLiveStage0Composition({
        outputMode: "customer",
        specOverride: {},
      }),
    ).toBe(false);
    expect(liveCustomerJobSpecOverride("customer", flyerSpec())).toBeUndefined();
    expect(liveCustomerJobSpecOverride("certification_fixture", flyerSpec())).toEqual(
      flyerSpec(),
    );
  });

  it("refuses the Maya headline→CTA truth mutation", () => {
    expect(
      headlineWasReplacedByCta({
        suppliedHeadline: "Grand Opening",
        mappedHeadline: "Book Your Reset",
        mappedCta: "Book Your Reset",
      }),
    ).toBe(true);
    expect(
      applyExistingCtaHeadlineEmphasis({
        headline: "Grand Opening",
        callToAction: "Book Your Reset",
        emphasis: {
          packageId: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
          instruction: "Make the CTA the headline.",
          emphasizeExistingCtaAsHeadline: true,
          sourceRevisionPackageId: "pkg",
          priorWorkVersionId: "v1",
          recordedAt: "2026-09-16T00:00:00.000Z",
        },
      }),
    ).toBe("Grand Opening");
    expect(
      missingSuppliedFacts({
        supplied: [{ id: "headline", text: "Grand Opening" }],
        truthValues: ["Book Your Reset", "Book Your Reset"],
      }),
    ).toEqual(["headline"]);
  });

  it("embeds the house face and drops named host substitutes", () => {
    expect(fontStackIsDeterministic(LIVE_HOUSE_FONT_STACK)).toBe(true);
    const css = liveHouseFontCss(REPO);
    expect(css).toMatch(/@font-face/);
    expect(css).toMatch(/Source Serif 4/);
    expect(css).not.toMatch(/Palatino|Iowan|Georgia/);
    const html = renderFlyerHtml(REPO, flyerSpec());
    expect(html).toMatch(/@font-face/);
    expect(html).not.toMatch(/Palatino|Iowan Old Style|Georgia/);
  });

  it("does not invent a 300 DPI claim from an 8.5×11 size note, and blocks sellable print when 300 DPI is claimed without headroom", () => {
    expect(intakeClaimsMeasuredPrint("8.5 x 11", "print")).toBe(false);
    const digital = evaluateLivePrintDelivery({
      sizeNotes: "8.5 x 11",
      intendedUse: "print and digital",
      sourcePx: { width: 1536, height: 1024 },
    });
    expect(digital.code).toBe("digital_ok");
    expect(blocksSellablePrint(digital)).toBe(false);

    const claimed = evaluateLivePrintDelivery({
      sizeNotes: "8.5 x 11 at 300 DPI",
      intendedUse: "print",
      sourcePx: { width: 1536, height: 1024 },
      boxInches: { width: 8.5, height: 11 },
    });
    expect(claimed.launchable).toBe(false);
    expect(claimed.code).toBe("below_headroom");
    expect(blocksSellablePrint(claimed)).toBe(true);
  });

  it("grades the six SKUs from live evidence — flyer READY_WITH_LIMITS, others not certified, lane not certified", () => {
    expect(skuLaneRow("v2-rtu-flyer").overall).toBe("READY_WITH_LIMITS");
    expect(skuLaneRow("v2-rtu-promotion-graphics").overall).toBe("READY_WITH_LIMITS");
    expect(skuLaneRow("v2-rtu-social-posts").overall).toBe("READY_WITH_LIMITS");
    expect(skuLaneRow("v2-rtu-business-card").overall).toBe("NOT_CERTIFIED");
    expect(skuLaneRow("v2-rtu-menu").overall).toBe("READY_WITH_LIMITS");
    expect(skuLaneRow("v2-rtu-service-sheet").overall).toBe("READY_WITH_LIMITS");
    expect(laneOverallGrade()).toBe("NOT_CERTIFIED");
  });
});
