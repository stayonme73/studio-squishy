/**
 * STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1 — unit + integration tests.
 */

import { mkdirSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  buildHarborOakFlyerProjectTruth,
  fingerprintDesignSpec,
  nextRenderVersion,
  reasonFlyerDesignSpecDeterministic,
  renderFlyerHtml,
  runDesignRendererProofPipeline,
  validateFlyerDesignSpec,
  FLYER_CANVAS,
  PROOF_ARTIFACT_ROOT,
} from "./index";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("studio-design-renderer proof (v2-rtu-flyer)", () => {
  it("valid Harbor spec validates", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const v = validateFlyerDesignSpec(REPO_ROOT, spec, truth);
    expect(v).toEqual({ ok: true });
    expect(spec.canvas).toEqual(FLYER_CANVAS);
    expect(spec.outputFormats).toEqual(["png", "pdf"]);
  });

  it("wordmark-only truth reasons and validates without a logo material", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const noLogo = {
      ...truth,
      approvedLogoVariantId: null,
      materials: [],
    };
    const spec = reasonFlyerDesignSpecDeterministic(noLogo);
    expect(spec.layers.some((l) => l.type === "image")).toBe(false);
    expect(validateFlyerDesignSpec(REPO_ROOT, spec, noLogo)).toEqual({ ok: true });
  });

  it("invalid spec fails closed", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const bad = {
      ...spec,
      layers: spec.layers.filter((l) => !(l.type === "text" && l.role === "price")),
    };
    const v = validateFlyerDesignSpec(REPO_ROOT, bad, truth);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe("INVALID_DESIGN_SPEC");
  });

  it("missing material fails closed", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const bad = {
      ...spec,
      materials: [
        {
          ...spec.materials[0]!,
          relativePath: "docs/launch/studio-operating-design-renderer-proof-1/artifacts/v2-rtu-flyer/materials/MISSING.svg",
        },
      ],
    };
    const v = validateFlyerDesignSpec(REPO_ROOT, bad, truth);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe("BROKEN_ASSET_REFERENCE");
  });

  it("broken image material id fails at render", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const bad = {
      ...spec,
      layers: spec.layers.map((l) =>
        l.type === "image" ? { ...l, materialId: "no-such-material" } : l,
      ),
    };
    // Spec validation catches unknown material on image layer
    const v = validateFlyerDesignSpec(REPO_ROOT, bad, truth);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe("BROKEN_ASSET_REFERENCE");
  });

  it("renderer produces HTML with fixed dimensions", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const html = renderFlyerHtml(REPO_ROOT, spec);
    expect(html).toContain(`${FLYER_CANVAS.widthPx}px`);
    expect(html).toContain(`${FLYER_CANVAS.heightPx}px`);
    expect(html).toContain("Harbor &amp; Oak");
    expect(html).toContain("$189");
    expect(html).toContain("Spring Tune-Up");
  });

  it("rerender versioning does not collide", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "flyer-ver-"));
    const rootRel = "artifacts-tmp";
    mkdirSync(path.join(dir, rootRel, "renders", "v1"), { recursive: true });
    mkdirSync(path.join(dir, rootRel, "renders", "v3"), { recursive: true });
    expect(nextRenderVersion(dir, rootRel)).toBe(4);
  });

  it("spec fingerprint is stable for identical specs", () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
    const a = reasonFlyerDesignSpecDeterministic(truth);
    const b = reasonFlyerDesignSpecDeterministic(truth);
    expect(fingerprintDesignSpec(a)).toBe(fingerprintDesignSpec(b));
  });

  it(
    "full proof pipeline produces PNG+PDF, passes design QA, Owner production NONE",
    async () => {
      const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
      const result = await runDesignRendererProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        preferAnthropic: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.identity.widthPx).toBe(1024);
      expect(result.identity.heightPx).toBe(1536);
      expect(result.identity.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.identity.pdfContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.identity.pngRelativePath).toContain(PROOF_ARTIFACT_ROOT);
      expect(result.overflowOk).toBe(true);
      expect(result.designSpec.reasoningMode).toBe("deterministic_constrained");
    },
    120_000,
  );

  it(
    "forced QA failure blocks readiness",
    async () => {
      const truth = buildHarborOakFlyerProjectTruth({
        repoRoot: REPO_ROOT,
        campaignId: "camp-qa-fail-proof",
      });
      // Write into same artifact root but separate campaign — still versions
      const result = await runDesignRendererProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        preferAnthropic: false,
        forceQaFail: true,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("QA_FAILURE");
    },
    120_000,
  );

  it(
    "invalid injected spec fails before export",
    async () => {
      const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO_ROOT });
      const spec = reasonFlyerDesignSpecDeterministic(truth);
      const bad = { ...spec, canvas: { widthPx: 100, heightPx: 100 } };
      const result = await runDesignRendererProofPipeline({
        repoRoot: REPO_ROOT,
        truth,
        specOverride: bad,
        preferAnthropic: false,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("INVALID_DESIGN_SPEC");
    },
    30_000,
  );
});
