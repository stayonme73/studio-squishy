/**
 * STUDIO-OPERATING-DESIGN-MENU-PROOF-1
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import {
  BUSINESS_CARD_CANVAS,
  FLYER_CANVAS,
  MENU_CANVAS,
  MENU_MAX_ITEMS_TOTAL,
  MENU_MAX_SECTIONS,
  MENU_PROOF_ARTIFACT_ROOT,
  buildHarborOakBusinessCardProjectTruth,
  buildHarborOakFlyerProjectTruth,
  buildMaxLoadMenuSections,
  buildSaltCedarMenuProjectTruthMax,
  buildSaltCedarMenuProjectTruthMedium,
  buildSaltCedarMenuProjectTruthSmall,
  countMenuItems,
  fingerprintMenuDesignSpec,
  reasonBusinessCardDesignSpecDeterministic,
  reasonFlyerDesignSpecDeterministic,
  reasonMenuDesignSpecDeterministic,
  runBusinessCardProofPipeline,
  runDesignRendererProofPipeline,
  runMenuProofPipeline,
  validateBusinessCardDesignSpec,
  validateFlyerDesignSpec,
  validateMenuDesignSpec,
} from "./index";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("studio-design-renderer menu proof (v2-rtu-menu)", () => {
  it("dispatch primaryTool is studio_design_renderer after menu hook package", () => {
    const menu = resolveServiceProductionContract("v2-rtu-menu");
    expect(menu.status).toBe("resolved");
    if (menu.status !== "resolved") return;
    expect(menu.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("max-load fixture is exactly 5 sections / 30 items TOTAL", () => {
    const sections = buildMaxLoadMenuSections();
    expect(sections).toHaveLength(MENU_MAX_SECTIONS);
    expect(countMenuItems(sections)).toBe(MENU_MAX_ITEMS_TOTAL);
    for (const sec of sections) {
      expect(sec.items.length).toBeGreaterThan(0);
      for (const it of sec.items) {
        expect(it.name.trim().length).toBeGreaterThan(0);
        expect(it.priceDisplay.trim().length).toBeGreaterThan(0);
        expect((it.description ?? "").trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("valid max menu spec validates on portrait CERT canvas", () => {
    const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot: REPO_ROOT });
    const spec = reasonMenuDesignSpecDeterministic(truth);
    const v = validateMenuDesignSpec(REPO_ROOT, spec, truth);
    expect(v).toEqual({ ok: true });
    expect(spec.canvas).toEqual(MENU_CANVAS);
    expect(spec.outputFormats).toEqual(["png", "pdf"]);
    expect(spec.layoutMode).toBe("two_column");
    expect(countMenuItems(truth.sections)).toBe(30);
    // MENU-LAYOUT-1: two-column should unlock above-minimum type when possible
    expect(["comfortable", "compact", "minimum"]).toContain(spec.typographyMode);
  });

  it("spec fingerprint stable for identical truth", () => {
    const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot: REPO_ROOT });
    const a = reasonMenuDesignSpecDeterministic(truth);
    const b = reasonMenuDesignSpecDeterministic(truth);
    expect(fingerprintMenuDesignSpec(a)).toBe(fingerprintMenuDesignSpec(b));
  });

  it("empty section fails closed", async () => {
    const truth = buildSaltCedarMenuProjectTruthSmall({ repoRoot: REPO_ROOT });
    const bad = {
      ...truth,
      sections: [
        ...truth.sections,
        { sectionId: "empty", title: "Empty", items: [] },
      ],
    };
    const result = await runMenuProofPipeline({
      repoRoot: REPO_ROOT,
      truth: bad,
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-fail-empty-section`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("MISSING_REQUIRED_TRUTH");
    expect(result.message).toMatch(/empty section/i);
  });

  it("missing item name fails closed", async () => {
    const truth = buildSaltCedarMenuProjectTruthSmall({ repoRoot: REPO_ROOT });
    const sections = truth.sections.map((s, si) =>
      si === 0
        ? {
            ...s,
            items: s.items.map((it, ii) =>
              ii === 0 ? { ...it, name: "   " } : it,
            ),
          }
        : s,
    );
    const result = await runMenuProofPipeline({
      repoRoot: REPO_ROOT,
      truth: { ...truth, sections },
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-fail-missing-name`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("MISSING_REQUIRED_TRUTH");
  });

  it("missing price fails closed", async () => {
    const truth = buildSaltCedarMenuProjectTruthSmall({ repoRoot: REPO_ROOT });
    const sections = truth.sections.map((s, si) =>
      si === 0
        ? {
            ...s,
            items: s.items.map((it, ii) =>
              ii === 0 ? { ...it, priceDisplay: "" } : it,
            ),
          }
        : s,
    );
    const result = await runMenuProofPipeline({
      repoRoot: REPO_ROOT,
      truth: { ...truth, sections },
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-fail-missing-price`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("MISSING_REQUIRED_TRUTH");
  });

  it("malformed price fails closed", async () => {
    const truth = buildSaltCedarMenuProjectTruthSmall({ repoRoot: REPO_ROOT });
    const sections = truth.sections.map((s, si) =>
      si === 0
        ? {
            ...s,
            items: s.items.map((it, ii) =>
              ii === 0 ? { ...it, priceDisplay: "ask me later" } : it,
            ),
          }
        : s,
    );
    const result = await runMenuProofPipeline({
      repoRoot: REPO_ROOT,
      truth: { ...truth, sections },
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-fail-bad-price`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("MISSING_REQUIRED_TRUTH");
    expect(result.message).toMatch(/malformed price/i);
  });

  it("oversized content (31st item) fails closed", async () => {
    const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot: REPO_ROOT });
    const sections = truth.sections.map((s, i) =>
      i === 0
        ? {
            ...s,
            items: [
              ...s.items,
              {
                itemId: "overflow-31",
                name: "Extra Item Beyond Contract",
                priceDisplay: "$9.99",
                description: "Should fail closed — exceeds 30 total.",
              },
            ],
          }
        : s,
    );
    const result = await runMenuProofPipeline({
      repoRoot: REPO_ROOT,
      truth: { ...truth, sections },
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-fail-31-items`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("MISSING_REQUIRED_TRUTH");
    expect(result.message).toMatch(/exceed max 30/i);
  });

  it("density overflow with absurd descriptions fails closed", async () => {
    const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot: REPO_ROOT });
    const long =
      "A very long customer-supplied description that repeats. ".repeat(8);
    const sections = truth.sections.map((s) => ({
      ...s,
      items: s.items.map((it) => ({ ...it, description: long })),
    }));
    const result = await runMenuProofPipeline({
      repoRoot: REPO_ROOT,
      truth: { ...truth, sections },
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-fail-density`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("DENSITY_OVERFLOW");
    expect(result.verdict).toBe("MENU_RENDERER_PROOF_FAIL");
  });

  it(
    "forced QA failure blocks readiness",
    async () => {
      const truth = buildSaltCedarMenuProjectTruthSmall({
        repoRoot: REPO_ROOT,
        campaignId: "camp-menu-qa-fail-proof",
      });
      const result = await runMenuProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        forceQaFail: true,
        artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-fail-qa`,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("QA_FAILURE");
    },
    180_000,
  );

  it(
    "small fixture renders without bizarre packing failure",
    async () => {
      const truth = buildSaltCedarMenuProjectTruthSmall({ repoRoot: REPO_ROOT });
      const result = await runMenuProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-small`,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error(result);
        return;
      }
      expect(result.identity.itemCount).toBe(5);
      expect(result.overflowOk).toBe(true);
    },
    180_000,
  );

  it(
    "medium fixture renders",
    async () => {
      const truth = buildSaltCedarMenuProjectTruthMedium({
        repoRoot: REPO_ROOT,
      });
      const result = await runMenuProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-medium`,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error(result);
        return;
      }
      expect(result.identity.itemCount).toBe(14);
      expect(result.overflowOk).toBe(true);
    },
    180_000,
  );

  it(
    "MAXIMUM-LOAD seal: 5 sections / 30 items TOTAL — PNG/PDF, completeness, overflow, Owner NONE",
    async () => {
      const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot: REPO_ROOT });
      const result = await runMenuProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        artifactRootRel: MENU_PROOF_ARTIFACT_ROOT,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error("MAX-LOAD FAIL:", result);
        return;
      }
      expect(result.verdict).toBe("MENU_RENDERER_PROOF_PASS");
      expect(result.identity.widthPx).toBe(1024);
      expect(result.identity.heightPx).toBe(1536);
      expect(result.identity.sectionCount).toBe(5);
      expect(result.identity.itemCount).toBe(30);
      expect(result.designSpec.layoutMode).toBe("two_column");
      expect(result.itemCompletenessOk).toBe(true);
      expect(result.priceTruthOk).toBe(true);
      expect(result.overflowOk).toBe(true);
      expect(result.ownerRoutineProduction).toBe("NONE");
      expect(result.canvaUsed).toBe(false);
      expect(result.makeUsed).toBe(false);
      expect(result.identity.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.identity.pdfContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(
        existsSync(path.join(REPO_ROOT, result.identity.pngRelativePath)),
      ).toBe(true);
      expect(
        existsSync(path.join(REPO_ROOT, result.identity.pdfRelativePath)),
      ).toBe(true);
      // All 30 names + prices present in declared text
      for (const sec of truth.sections) {
        for (const it of sec.items) {
          expect(result.declaredText).toContain(it.name);
          expect(result.declaredText).toContain(it.priceDisplay);
        }
      }
      expect(result.declaredText).toContain(truth.dietaryLabels);
    },
    180_000,
  );

  it("flyer schema and canvas remain untouched by menu modules", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    expect(spec.canvas).toEqual(FLYER_CANVAS);
    expect(spec.skuId).toBe("v2-rtu-flyer");
    expect(validateFlyerDesignSpec(REPO_ROOT, spec, truth)).toEqual({
      ok: true,
    });
  });

  it("business-card schema and canvas remain untouched by menu modules", () => {
    const truth = buildHarborOakBusinessCardProjectTruth({
      repoRoot: REPO_ROOT,
    });
    const spec = reasonBusinessCardDesignSpecDeterministic(truth);
    expect(spec.canvas).toEqual(BUSINESS_CARD_CANVAS);
    expect(spec.skuId).toBe("v2-rtu-business-card");
    expect(validateBusinessCardDesignSpec(REPO_ROOT, spec, truth)).toEqual({
      ok: true,
    });
  });
});

describe("flyer/card regression protection (menu proof package)", () => {
  it(
    "flyer proof pipeline still PASSes",
    async () => {
      const truth = buildHarborOakFlyerProjectTruth({
        repoRoot: REPO_ROOT,
        campaignId: "camp-flyer-regression-during-menu-proof",
      });
      const result = await runDesignRendererProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
      });
      expect(result.ok).toBe(true);
    },
    180_000,
  );

  it(
    "business-card proof pipeline still PASSes",
    async () => {
      const truth = buildHarborOakBusinessCardProjectTruth({
        repoRoot: REPO_ROOT,
        campaignId: "camp-card-regression-during-menu-proof",
      });
      const result = await runBusinessCardProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
      });
      expect(result.ok).toBe(true);
    },
    180_000,
  );
});
