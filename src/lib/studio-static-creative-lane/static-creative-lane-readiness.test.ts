/**
 * Static-creative lane readiness — shared rules, not a flyer repair.
 */

import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { SHARED_LANE_CAPABILITIES } from "@/config/studio-static-creative-lane-readiness-v1";
import { studioStaticCreativeLaneReadinessV1 as lane } from "@/config/studio-static-creative-lane-readiness-v1";
import { studioStaticDesignCompositionV1 as composition } from "@/config/studio-static-design-composition-v1";
import { checkBriefCompliance } from "@/lib/studio-static-design-composition/brief-compliance";
import { productionLane } from "@/config/studio-production-lane-doctrine-v1";

import {
  CEDAR_STONE_HERO_PRINT_CLAIM,
  evaluatePrintResolutionClaim,
  maxHeadroomBoxInches,
  outputIntentForSku,
} from "./print-resolution-policy";
import {
  STATIC_CREATIVE_LANE_MATRIX,
  laneOverallGrade,
  matrixCoversEveryLaunchDesignSku,
  sharedBlockers,
  skuLaneRow,
} from "./sku-lane-matrix";

const REPO = path.resolve(__dirname, "../../..");

describe("Static creative lane — shared contract", () => {
  it("names the twelve shared capabilities the Owner asked for, once", () => {
    expect(SHARED_LANE_CAPABILITIES.map((capability) => capability.id)).toEqual([
      "customer_direction_fidelity",
      "exact_fact_preservation",
      "openai_visual_generation_routing",
      "deterministic_fonts",
      "crop_focal_control",
      "composition_primitives",
      "print_vs_digital_resolution",
      "launch_blocking_exceptions",
      "qa_before_review",
      "revision_neutrality",
      "output_export",
      "delivery_readiness",
    ]);
    expect(lane.doNotCreatePerSkuFixes).toBe(true);
    expect(lane.cedarStoneIsProofCaseNotTheLane).toBe(true);
    expect(lane.proofCases).toHaveLength(2);
  });

  it("grades every launch design SKU and does not invent extras", () => {
    expect(matrixCoversEveryLaunchDesignSku()).toBe(true);
    expect(STATIC_CREATIVE_LANE_MATRIX).toHaveLength(lane.skus.length);
    expect(new Set(STATIC_CREATIVE_LANE_MATRIX.map((row) => row.skuId)).size).toBe(
      lane.skus.length,
    );
  });

  it("keeps the lane itself NOT CERTIFIED until the shared path is live", () => {
    expect(laneOverallGrade()).toBe("NOT_CERTIFIED");
    expect(productionLane("static_creative").certified).toBe(false);
    for (const row of STATIC_CREATIVE_LANE_MATRIX) {
      expect(row.overall).not.toBe("READY");
    }
  });

  it("does not turn Cedar & Stone into a flyer-only print-readiness package", () => {
    const flyer = skuLaneRow("v2-rtu-flyer");
    const menu = skuLaneRow("v2-rtu-menu");
    const card = skuLaneRow("v2-rtu-business-card");
    const sheet = skuLaneRow("v2-rtu-service-sheet");
    // The print-resolution gap is shared across print SKUs.
    for (const row of [flyer, menu, card, sheet]) {
      const print = row.capabilities.find(
        (entry) => entry.capabilityId === "print_vs_digital_resolution",
      )!;
      expect(print.scope).toBe("shared");
      expect(print.grade).toBe("READY_WITH_LIMITS");
    }
    // Digital SKUs inherit the policy, not the print blocker.
    const social = skuLaneRow("v2-rtu-social-posts");
    const promo = skuLaneRow("v2-rtu-promotion-graphics");
    expect(
      social.capabilities.find((entry) => entry.capabilityId === "print_vs_digital_resolution")
        ?.grade,
    ).toBe("READY_WITH_LIMITS");
    expect(
      promo.capabilities.find((entry) => entry.capabilityId === "print_vs_digital_resolution")
        ?.grade,
    ).toBe("READY_WITH_LIMITS");
  });

  it("keeps the smallest remaining blockers at the lane, not per SKU", () => {
    const blockers = sharedBlockers();
    expect(blockers.map((entry) => entry.capabilityId)).toEqual([
      "customer_direction_fidelity",
      "crop_focal_control",
      "composition_primitives",
      "delivery_readiness",
    ]);
    // SKU-specific notes exist, but they are holds on sold shape, not extra composers.
    for (const row of STATIC_CREATIVE_LANE_MATRIX) {
      for (const hold of row.skuSpecificHolds) {
        expect(hold.length).toBeGreaterThan(20);
      }
    }
  });
});

describe("Print vs digital resolution policy — lane, not flyer", () => {
  it("refuses a 300 DPI full-bleed claim from gpt-image-1 without an exception", () => {
    const verdict = evaluatePrintResolutionClaim(CEDAR_STONE_HERO_PRINT_CLAIM);
    expect(verdict.ok).toBe(false);
    expect(verdict.launchable).toBe(false);
    expect(verdict.code).toBe("below_headroom");
    expect(verdict.effectivePpi).toBe(181);
    expect(verdict.sourceScale).toBeCloseTo(0.6, 2);
  });

  it("records the Owner's proof exception without making it launchable", () => {
    const verdict = evaluatePrintResolutionClaim({
      ...CEDAR_STONE_HERO_PRINT_CLAIM,
      exception: {
        scope: "controlled_proof",
        authorisedBy: "Owner (Tagia) 2026-09-15 — Option 2",
        reason: "provider ceiling",
      },
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.launchable).toBe(false);
    expect(verdict.code).toBe("controlled_proof_exception");
    expect(composition.printResolutionException.permittedForLaunchPrint).toBe(false);
    expect(composition.cropHeadroom.minimumSourceScale).toBe(1.25);
  });

  it("does not let digital inherit a 300 DPI requirement", () => {
    const verdict = evaluatePrintResolutionClaim({
      intent: "digital",
      sourcePx: { width: 1024, height: 1024 },
      fit: "cover",
    });
    expect(verdict).toMatchObject({ ok: true, launchable: true, code: "digital_ok" });
    expect(outputIntentForSku("v2-rtu-social-posts")).toBe("digital");
    expect(outputIntentForSku("v2-rtu-promotion-graphics")).toBe("digital");
    expect(outputIntentForSku("v2-rtu-flyer")).toBe("print_customer_managed");
  });

  it("states the largest honest generated-art print box at the claimed DPI", () => {
    const box = maxHeadroomBoxInches({ width: 1536, height: 1024 });
    expect(box.width).toBeCloseTo(4.096, 3);
    expect(box.height).toBeCloseTo(2.731, 3);
  });
});

describe("Cedar & Stone remains evidence, not a discarded fixture", () => {
  it("keeps the authorised artifacts and the proof record on disk", () => {
    const root = path.join(REPO, lane.cedarStoneEvidenceRoot);
    for (const file of [
      "cedar-stone-print-8_5x11-300dpi.png",
      "cedar-stone-print-8_5x11-300dpi.pdf",
      "generated-hero-generated.png",
      "texture-inset-generated.png",
      "cedar-stone-direction-proof.json",
      "generation-record.json",
    ]) {
      expect(existsSync(path.join(root, file)), file).toBe(true);
    }
  });

  it("still uses the shared brief-compliance rule, not a flyer-only checker", () => {
    const report = checkBriefCompliance({
      supplied: [{ id: "headline", label: "Headline", text: "Make Space for What Matters" }],
      rendered: [
        {
          factId: "headline",
          elementId: "headline",
          renderedText: "Make Space for What Matters",
          visible: true,
          withinCanvas: true,
          resolvedFontFamilies: ["Source Serif 4"],
          requestedFontFamily: "Source Serif 4",
          fontHonoured: true,
          box: { x: 0, y: 0, width: 100, height: 40 },
          lineCount: 1,
          contentHeightPx: 40,
        },
      ],
    });
    expect(report.ok).toBe(true);
    expect(report.unaccounted).toEqual([]);
  });
});
