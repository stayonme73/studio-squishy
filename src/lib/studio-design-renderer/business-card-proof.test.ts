/**
 * STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import {
  BUSINESS_CARD_CANVAS,
  BUSINESS_CARD_PROOF_ARTIFACT_ROOT,
  buildHarborOakBusinessCardProjectTruth,
  buildHarborOakFlyerProjectTruth,
  fingerprintBusinessCardDesignSpec,
  reasonBusinessCardDesignSpecDeterministic,
  reasonFlyerDesignSpecDeterministic,
  runBusinessCardProofPipeline,
  runDesignRendererProofPipeline,
  validateBusinessCardDesignSpec,
  validateFlyerDesignSpec,
  FLYER_CANVAS,
} from "./index";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("studio-design-renderer business-card proof (v2-rtu-business-card)", () => {
  it("dispatch primaryTool is studio_design_renderer after card hook package", () => {
    const card = resolveServiceProductionContract("v2-rtu-business-card");
    expect(card.status).toBe("resolved");
    if (card.status !== "resolved") return;
    expect(card.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("valid Harbor card spec validates with front+back landscape canvas", () => {
    const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonBusinessCardDesignSpecDeterministic(truth);
    const v = validateBusinessCardDesignSpec(REPO_ROOT, spec, truth);
    expect(v).toEqual({ ok: true });
    expect(spec.canvas).toEqual(BUSINESS_CARD_CANVAS);
    expect(spec.front.side).toBe("front");
    expect(spec.back.side).toBe("back");
    expect(spec.outputFormats).toEqual(["png", "pdf"]);
  });

  it("missing required truth fails closed", async () => {
    const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot: REPO_ROOT });
    const bad = { ...truth, phone: "" };
    const result = await runBusinessCardProofPipeline({
      repoRoot: REPO_ROOT,
      truth: bad,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("MISSING_REQUIRED_TRUTH");
  });

  it("missing logo material fails closed", () => {
    const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonBusinessCardDesignSpecDeterministic(truth);
    const bad = {
      ...spec,
      materials: [
        {
          ...spec.materials[0]!,
          relativePath: `${BUSINESS_CARD_PROOF_ARTIFACT_ROOT}/materials/MISSING.svg`,
        },
      ],
    };
    const v = validateBusinessCardDesignSpec(REPO_ROOT, bad, truth);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe("BROKEN_ASSET_REFERENCE");
  });

  it("optional address omitted does not invent placeholder", () => {
    const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot: REPO_ROOT });
    const withoutAddress = { ...truth, address: undefined };
    const spec = reasonBusinessCardDesignSpecDeterministic(withoutAddress);
    const addressLayer = spec.front.layers.find(
      (l) => l.type === "text" && l.role === "address",
    );
    expect(addressLayer).toBeUndefined();
  });

  it("spec fingerprint stable for identical truth", () => {
    const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot: REPO_ROOT });
    const a = reasonBusinessCardDesignSpecDeterministic(truth);
    const b = reasonBusinessCardDesignSpecDeterministic(truth);
    expect(fingerprintBusinessCardDesignSpec(a)).toBe(
      fingerprintBusinessCardDesignSpec(b),
    );
  });

  it(
    "full proof produces front+back PNG, PDF, dual hashes, QA PASS, Owner NONE",
    async () => {
      const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot: REPO_ROOT });
      const result = await runBusinessCardProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error(result);
        return;
      }
      expect(result.verdict).toBe("BUSINESS_CARD_RENDERER_PROOF_PASS");
      expect(result.identity.widthPx).toBe(1536);
      expect(result.identity.heightPx).toBe(1024);
      expect(result.identity.sides).toHaveLength(2);
      const front = result.identity.sides.find((s) => s.side === "front");
      const back = result.identity.sides.find((s) => s.side === "back");
      expect(front).toBeTruthy();
      expect(back).toBeTruthy();
      expect(front!.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(back!.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(front!.pngContentSha256).not.toBe(back!.pngContentSha256);
      expect(result.identity.pdfContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(existsSync(path.join(REPO_ROOT, front!.pngRelativePath))).toBe(true);
      expect(existsSync(path.join(REPO_ROOT, back!.pngRelativePath))).toBe(true);
      expect(existsSync(path.join(REPO_ROOT, result.identity.pdfRelativePath))).toBe(
        true,
      );
      expect(front!.overflowOk).toBe(true);
      expect(back!.overflowOk).toBe(true);
      expect(result.declaredTextFront).toContain("Jordan Hale");
      expect(result.declaredTextFront).toContain("(804) 555-0142");
      expect(result.declaredTextBack).toContain("Harbor");
      // PDF should contain more than one page object for front+back
      const pdfBytes = readFileSync(
        path.join(REPO_ROOT, result.identity.pdfRelativePath),
        "utf8",
      );
      const pageCount = (pdfBytes.match(/\/Type\s*\/Page\b/g) ?? []).length;
      expect(pageCount).toBeGreaterThanOrEqual(2);
    },
    180_000,
  );

  it(
    "forced QA failure blocks readiness",
    async () => {
      const truth = buildHarborOakBusinessCardProjectTruth({
        repoRoot: REPO_ROOT,
        campaignId: "camp-card-qa-fail-proof",
      });
      const result = await runBusinessCardProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        forceQaFail: true,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("QA_FAILURE");
    },
    180_000,
  );

  it("flyer schema and canvas remain untouched by card modules", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    expect(spec.canvas).toEqual(FLYER_CANVAS);
    expect(spec.skuId).toBe("v2-rtu-flyer");
    expect(validateFlyerDesignSpec(REPO_ROOT, spec, truth)).toEqual({ ok: true });
  });
});

describe("flyer regression protection (business-card proof package)", () => {
  it(
    "flyer proof pipeline still PASSes",
    async () => {
      const truth = buildHarborOakFlyerProjectTruth({
        repoRoot: REPO_ROOT,
        campaignId: "camp-flyer-regression-during-card-proof",
      });
      const result = await runDesignRendererProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        preferAnthropic: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.identity.widthPx).toBe(1024);
      expect(result.identity.heightPx).toBe(1536);
    },
    120_000,
  );
});
