/**
 * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1
 * Proof only — primaryTool stays Canva. No dispatch. No sealed-lane edits.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import { runDesignRendererProofPipeline } from "./pipeline";
import { buildHarborOakFlyerProjectTruth, PROOF_ARTIFACT_ROOT } from "./fixtures";
import {
  buildHarborOakBusinessCardProjectTruth,
  BUSINESS_CARD_PROOF_ARTIFACT_ROOT,
} from "./card-fixtures";
import { runBusinessCardProofPipeline } from "./card-pipeline";
import {
  buildSaltCedarMenuProjectTruthMax,
  MENU_PROOF_ARTIFACT_ROOT,
} from "./menu-fixtures";
import { runMenuProofPipeline } from "./menu-pipeline";
import {
  buildHarborOakServiceSheetProjectTruthMax,
  SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
} from "./service-sheet-fixtures";
import { runServiceSheetProofPipeline } from "./service-sheet-pipeline";
import { PROMO_PROOF_CONTRACT } from "./promo-contracts";
import {
  buildHarborOakPromoCampaignSetTruth,
  LIVE_INTAKE_PER_ASSET_PURPOSE_GAP,
  PROMO_PROOF_ARTIFACT_ROOT,
} from "./promo-fixtures";
import { runPromoProofPipeline } from "./promo-pipeline";
import {
  assertPromoRequiredTruth,
  reasonPromoCampaignSetDeterministic,
} from "./promo-reason";
import { PROMO_PORTRAIT_PLATE, PROMO_SQUARE_PLATE } from "./promo-types";
import { validatePromoCampaignSetSpec } from "./promo-validate";

const repoRoot = process.cwd();

describe("studio-design-renderer promotion-graphics proof (v2-rtu-promotion-graphics)", () => {
  it("points primaryTool at studio_design_renderer after DISPATCH-HOOK-1", () => {
    const resolved = resolveServiceProductionContract("v2-rtu-promotion-graphics");
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("records intake-truth resolution note (per-asset fields authoritative)", () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    expect(truth.liveIntakePerAssetPurposeGap).toContain("RESOLVED");
    expect(truth.liveIntakePerAssetPurposeGap).toContain(
      "graphicA_authorizedPurpose",
    );
    expect(truth.liveIntakePerAssetPurposeGap).toBe(LIVE_INTAKE_PER_ASSET_PURPOSE_GAP);
    expect(PROMO_PROOF_CONTRACT.liveIntakePerAssetPurposeResolved).toBe(true);
  });

  it("valid campaign-set reasoner produces square + portrait with distinct purposes", () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    const spec = reasonPromoCampaignSetDeterministic(truth);
    const validated = validatePromoCampaignSetSpec(repoRoot, spec, truth);
    expect(validated.ok).toBe(true);
    expect(spec.assets).toHaveLength(2);
    expect(spec.assets[0]!.plateId).toBe(PROMO_SQUARE_PLATE.plateId);
    expect(spec.assets[0]!.canvas).toEqual({
      widthPx: 1024,
      heightPx: 1024,
    });
    expect(spec.assets[1]!.plateId).toBe(PROMO_PORTRAIT_PLATE.plateId);
    expect(spec.assets[1]!.canvas).toEqual({
      widthPx: 1024,
      heightPx: 1536,
    });
    expect(spec.assets[0]!.authorizedPurpose).not.toBe(
      spec.assets[1]!.authorizedPurpose,
    );
    expect(spec.assets[0]!.layoutVariant).not.toBe(
      spec.assets[1]!.layoutVariant,
    );
  });

  it("missing Asset A purpose fails closed", () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    const broken = {
      ...truth,
      assets: [
        { ...truth.assets[0]!, authorizedPurpose: "" },
        truth.assets[1]!,
      ] as typeof truth.assets,
    };
    expect(() => assertPromoRequiredTruth(broken)).toThrow(/Asset A authorizedPurpose/);
  });

  it("missing Asset B purpose fails closed", () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    const broken = {
      ...truth,
      assets: [
        truth.assets[0]!,
        { ...truth.assets[1]!, authorizedPurpose: "" },
      ] as typeof truth.assets,
    };
    expect(() => assertPromoRequiredTruth(broken)).toThrow(/Asset B authorizedPurpose/);
  });

  it("invalid/unsupported plate fails closed", () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    const broken = {
      ...truth,
      assets: [
        {
          ...truth.assets[0]!,
          plateId: "cert-square-1024" as const,
          canvas: { widthPx: 1080, heightPx: 1080 },
        },
        truth.assets[1]!,
      ] as typeof truth.assets,
    };
    expect(() => assertPromoRequiredTruth(broken)).toThrow(/INVALID_PLATE/);
  });

  it("missing logo material fails closed", () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    const broken = { ...truth, materials: [] };
    expect(() => assertPromoRequiredTruth(broken)).toThrow(/MISSING_REQUIRED_MATERIAL/);
  });

  it("full proof produces two-asset set with square + portrait", async () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    const result = await runPromoProofPipeline({ repoRoot, truth });
    if (!result.ok) {
      throw new Error(`${result.failureCode}: ${result.message}`);
    }
    expect(result.ok).toBe(true);
    expect(result.verdict).toBe("PROMOTION_GRAPHICS_RENDERER_PROOF_PASS");
    expect(result.squarePlateProven).toEqual({
      plateId: "cert-square-1024",
      widthPx: 1024,
      heightPx: 1024,
    });
    expect(result.portraitPlateReused).toEqual({
      plateId: "cert-portrait-1024x1536",
      widthPx: 1024,
      heightPx: 1536,
    });
    expect(result.identity.assets).toHaveLength(2);
    const [a, b] = result.identity.assets;
    expect(a.assetId).toBe("spring-tuneup-social-square");
    expect(b.assetId).toBe("spring-tuneup-print-portrait");
    expect(a.widthPx).toBe(1024);
    expect(a.heightPx).toBe(1024);
    expect(b.widthPx).toBe(1024);
    expect(b.heightPx).toBe(1536);
    expect(a.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(b.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(a.pngContentSha256).not.toBe(b.pngContentSha256);
    expect(a.authorizedPurpose).toContain("Social");
    expect(b.authorizedPurpose).toContain("Print");
    expect(result.identity.campaignSetRenderVersion).toBeGreaterThanOrEqual(1);
    expect(a.individualQaOk).toBe(true);
    expect(b.individualQaOk).toBe(true);
    expect(result.identity.setQaOk).toBe(true);
    expect(result.identity.liveIntakePerAssetPurposeGap).toContain(
      "graphicA_authorizedPurpose",
    );

    for (const asset of result.identity.assets) {
      expect(existsSync(path.join(repoRoot, asset.pngRelativePath))).toBe(true);
      expect(existsSync(path.join(repoRoot, asset.pdfRelativePath))).toBe(true);
      expect(existsSync(path.join(repoRoot, asset.htmlRelativePath))).toBe(true);
    }
    expect(
      existsSync(
        path.join(repoRoot, result.identity.designSpecRelativePath),
      ),
    ).toBe(true);

    const textA = result.declaredTextByAsset[a.assetId]!;
    const textB = result.declaredTextByAsset[b.assetId]!;
    expect(textA).toContain("$189");
    expect(textB).toContain("$189");
    expect(textA).toContain(a.authorizedPurpose);
    expect(textB).toContain(b.authorizedPurpose);
  }, 180_000);

  it("whole-set versioning binds both assets to the same vN", async () => {
    const truth = buildHarborOakPromoCampaignSetTruth({
      repoRoot,
      campaignId: "camp-design-promo-graphics-proof-versioning",
    });
    const first = await runPromoProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${PROMO_PROOF_ARTIFACT_ROOT}-versioning`,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.campaignSetRenderVersion;
    expect(first.identity.assets[0]!.pngRelativePath).toContain(`/v${v1}/`);
    expect(first.identity.assets[1]!.pngRelativePath).toContain(`/v${v1}/`);

    const second = await runPromoProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${PROMO_PROOF_ARTIFACT_ROOT}-versioning`,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const v2 = second.identity.campaignSetRenderVersion;
    expect(v2).toBe(v1 + 1);
    expect(second.identity.assets[0]!.pngRelativePath).toContain(`/v${v2}/`);
    expect(second.identity.assets[1]!.pngRelativePath).toContain(`/v${v2}/`);
    // Prior pair retained
    expect(
      existsSync(
        path.join(repoRoot, first.identity.assets[0]!.pngRelativePath),
      ),
    ).toBe(true);
  }, 240_000);

  it("forced individual/set QA failure blocks success", async () => {
    const truth = buildHarborOakPromoCampaignSetTruth({
      repoRoot,
      campaignId: "camp-design-promo-graphics-proof-fail-qa",
    });
    const result = await runPromoProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${PROMO_PROOF_ARTIFACT_ROOT}-fail-qa`,
      forceQaFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("QA_FAILURE");
    expect(result.verdict).toBe("PROMOTION_GRAPHICS_RENDERER_PROOF_FAIL");
  }, 180_000);

  it("Asset A success + Asset B export fail → set FAIL (partial)", async () => {
    const truth = buildHarborOakPromoCampaignSetTruth({
      repoRoot,
      campaignId: "camp-design-promo-graphics-proof-partial",
    });
    const result = await runPromoProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${PROMO_PROOF_ARTIFACT_ROOT}-partial`,
      forceSecondAssetExportFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("PARTIAL_SET_FAILURE");
  }, 180_000);

  it("set-level consistency failure blocks success even if renders exist", async () => {
    const truth = buildHarborOakPromoCampaignSetTruth({
      repoRoot,
      campaignId: "camp-design-promo-graphics-proof-set-fail",
    });
    const result = await runPromoProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${PROMO_PROOF_ARTIFACT_ROOT}-set-fail`,
      forceSetConsistencyFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SET_CONSISTENCY_FAILURE");
  }, 180_000);
});

describe("promotion-graphics proof — sealed-lane regression protection", () => {
  it("flyer proof still green", async () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot });
    const result = await runDesignRendererProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
  }, 120_000);

  it("business-card proof still green", async () => {
    const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot });
    const result = await runBusinessCardProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: BUSINESS_CARD_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
  }, 120_000);

  it("menu proof still green", async () => {
    const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot });
    const result = await runMenuProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: MENU_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
  }, 180_000);

  it("service-sheet proof still green", async () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot });
    const result = await runServiceSheetProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
  }, 180_000);
});
