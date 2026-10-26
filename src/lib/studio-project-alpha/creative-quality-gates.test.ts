/**
 * CREATIVE QUALITY CALIBRATION — V19.
 *
 * Customer-One V19 passed every gate the Studio had and was still not sellable:
 * the bottom third was dead black, the body copy that explains the offer landed
 * at about 9pt on the sheet, and the route claimed `editorial_split` while the
 * composition was byte-for-byte the shape of `type_led_premium`.
 *
 * V19 is the required negative test here. It is a real stored artifact, not a
 * fixture, so these assertions fail if the gates stop catching the defect the
 * owner rejected. The positive controls are the compositions the repaired
 * composer produces, so a stricter gate cannot be satisfied by rejecting
 * everything.
 */

import { readFileSync } from "fs";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  deriveCreativeBrief,
  paletteForBrief,
  selectCreativeDirection,
} from "@/lib/studio-design-intelligence";
import {
  hybridLockupPlanFor,
  signatureFromFrames,
  signatureKey,
} from "@/lib/studio-design-intelligence/hybrid-layout-signatures";
import type { DesignLayoutFamilyId } from "@/lib/studio-design-intelligence/types";
import {
  effectiveOutputPointSize,
  evaluateFlyerOutputReadability,
  MIN_BODY_COPY_POINT_SIZE,
} from "@/lib/studio-design-renderer/flyer-output-readability";
import { reasonFlyerDesignSpecDeterministic } from "@/lib/studio-design-renderer/reason";
import type {
  FlyerDesignSpec,
  FlyerProjectTruth,
} from "@/lib/studio-design-renderer/types";
import {
  PRODUCTION_FAILURE_CLASS_STANDARDS,
  studioAutonomousProductionLoopV1,
} from "@/config/studio-autonomous-production-loop-v1";
import { buildProductionCorrectionBrief } from "@/lib/studio-production-correction/brief";
import { classifyFindingId } from "@/lib/studio-production-correction/types";

import { composeHybridSpec } from "./compose-hybrid";
import {
  checkComposedArtifactCreativeQuality,
  measureSubjectObstruction,
} from "./composed-artifact-quality";
import { evaluateHybridLayoutFamilyAgreement } from "./composition-checks";

const REPO_ROOT = process.cwd();

const V19_RENDER_DIR =
  "data/campaign-design-artifacts/9c6c25f2-2562-4192-97a5-44536e45cd18/dd_9c6c25f2-2562-4192-97a5-44536e45cd18_v2-rtu-flyer/renders/v19";
const V18_RENDER_DIR =
  "data/campaign-design-artifacts/9c6c25f2-2562-4192-97a5-44536e45cd18/dd_9c6c25f2-2562-4192-97a5-44536e45cd18_v2-rtu-flyer/renders/v18";

function storedSpec(renderDir: string): FlyerDesignSpec {
  return JSON.parse(
    readFileSync(path.join(REPO_ROOT, renderDir, "design-spec.json"), "utf8"),
  ) as FlyerDesignSpec;
}

const ALL_FAMILIES: readonly DesignLayoutFamilyId[] = [
  "type_led_premium",
  "editorial_split",
  "bold_asymmetric",
  "service_rail",
  "modular_thirds",
  "centered_promotional_plate",
];

function truthForFamily(familyId: DesignLayoutFamilyId): FlyerProjectTruth {
  const mustInclude =
    "Atelier Noir\nFall collection night\nEditorial ready-to-wear for the season.\n(212) 555-0144\nateliernoir.example\n$180";
  const brief = deriveCreativeBrief({
    businessName: "Atelier Noir",
    flyerPurpose: "Fall collection night",
    mustInclude,
    materials: "Fashion-forward. Choose for me.",
    intendedUse: "Both print and digital",
    sizeNotes: "",
    cta: "Reserve a seat",
    headline: "Fall collection night",
    offerName: "Fall collection night",
    body: "Editorial ready-to-wear for the season.",
    logoAvailable: false,
    suppliedImagery: false,
    requiredFacts: ["Atelier Noir", "(212) 555-0144", "$180"],
  });
  const palette = paletteForBrief(brief);
  const direction = selectCreativeDirection({ brief, recent: [] });
  return {
    campaignId: "creative-quality-gates",
    jobId: "creative-quality-gates:v2-rtu-flyer",
    dispatchId: "dd:creative-quality-gates:v2-rtu-flyer",
    skuId: "v2-rtu-flyer",
    fixtureId: "creative-quality-gates",
    label: "Creative quality gates",
    outputMode: "customer",
    businessName: "Atelier Noir",
    wordmark: "Atelier Noir",
    descriptor: "",
    headline: "Fall collection night",
    offerName: "Fall collection night",
    priceDisplay: "$180",
    dateWindow: "",
    body: "Editorial ready-to-wear for the season.",
    cta: "Reserve a seat",
    phone: "(212) 555-0144",
    webDisplay: "ateliernoir.example",
    webUrl: "",
    disclaimer: "",
    intendedUse: "Both print and digital",
    brandColors: {
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      text: palette.text,
      muted: palette.muted,
    },
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: ["Atelier"],
    prohibitedClaimPatterns: ["guarantee"],
    creativeDirection: {
      ...direction,
      selectedRoute: { ...direction.selectedRoute, layoutFamilyId: familyId },
    },
  };
}

function composedFor(familyId: DesignLayoutFamilyId): FlyerDesignSpec {
  return composeHybridSpec(
    reasonFlyerDesignSpecDeterministic(truthForFamily(familyId)),
    {
      ok: true,
      relativePath: "data/qa/generated/hybrid-visual-a1.png",
      contentSha256: "abc",
      model: "gpt-image-1",
      prompt: "atmosphere",
      bytes: 120,
    },
  );
}

function plateOf(spec: FlyerDesignSpec) {
  const plate = spec.layers.find((layer) => layer.id === "offer-panel");
  if (!plate || plate.type !== "shape") throw new Error("no type plate in spec");
  return plate;
}

/** Reads the same measure the Creative Director gate reads — no second copy. */
function familySignatureKey(spec: FlyerDesignSpec): string {
  const plate = plateOf(spec);
  const firstText = spec.layers.find((layer) => layer.type === "text");
  return signatureKey(
    signatureFromFrames({
      canvasWidthPx: spec.canvas.widthPx,
      canvasHeightPx: spec.canvas.heightPx,
      plateX: plate.x,
      plateY: plate.y,
      plateWidth: plate.width,
      plateHeight: plate.height,
      textAlign:
        firstText && firstText.type === "text"
          ? (firstText.align as "left" | "center" | "right")
          : "left",
      hasFullHeightRail: spec.layers.some((layer) => layer.id === "service-rail"),
    }),
  );
}

async function writeSynthetic(
  name: string,
  image: sharp.Sharp,
): Promise<{ repoRoot: string; absolutePath: string }> {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "studio-creative-gate-"));
  const absolutePath = path.join(repoRoot, name);
  writeFileSync(absolutePath, await image.png().toBuffer());
  return { repoRoot, absolutePath };
}

describe("Creative Director — dead canvas (composed pixels)", () => {
  it("rejects Customer-One V19 for a dead region the customer can point at", async () => {
    const result = await checkComposedArtifactCreativeQuality({
      repoRoot: REPO_ROOT,
      composedAbsolutePath: path.join(REPO_ROOT, V19_RENDER_DIR, "flyer.png"),
      spec: storedSpec(V19_RENDER_DIR),
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((finding) => finding.code);
    expect(codes).toContain("composed_dead_canvas_region");
    expect(codes).toContain("composed_unfinished_below_lockup");
    // The rejection carries a number, so it is arguable on measurement only.
    expect(
      Number(result.measured.largestInertRegionShareOfCanvas),
    ).toBeGreaterThan(0.25);
  });

  it("does not reject V18, the better draw of the same brief, for dead canvas", async () => {
    const result = await checkComposedArtifactCreativeQuality({
      repoRoot: REPO_ROOT,
      composedAbsolutePath: path.join(REPO_ROOT, V18_RENDER_DIR, "flyer.png"),
      spec: storedSpec(V18_RENDER_DIR),
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([]);
  });

  it("passes a lit, worked field with the same lockup", async () => {
    // Graded field: luminance and texture everywhere, nothing inert.
    const width = 512;
    const height = 768;
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const base = (y * width + x) * 3;
        const value = 70 + Math.round(80 * (y / height)) + ((x * 7 + y * 5) % 24);
        pixels[base] = value;
        pixels[base + 1] = Math.min(255, value + 10);
        pixels[base + 2] = Math.min(255, value + 24);
      }
    }
    const { repoRoot, absolutePath } = await writeSynthetic(
      "lit.png",
      sharp(pixels, { raw: { width, height, channels: 3 } }),
    );
    const result = await checkComposedArtifactCreativeQuality({
      repoRoot,
      composedAbsolutePath: absolutePath,
      spec: composedFor("type_led_premium"),
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([]);
  });

  it("rejects a field that is black below the lockup even when the top is worked", async () => {
    const spec = composedFor("modular_thirds");
    const width = 512;
    const height = 768;
    const pixels = Buffer.alloc(width * height * 3);
    const plate = plateOf(spec);
    const deadFromY = Math.round(
      ((plate.y + plate.height) / spec.canvas.heightPx) * height,
    );
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const base = (y * width + x) * 3;
        if (y >= deadFromY) continue; // left at 0,0,0 — dead
        const value = 90 + ((x * 11 + y * 3) % 40);
        pixels[base] = value;
        pixels[base + 1] = value;
        pixels[base + 2] = value;
      }
    }
    const { repoRoot, absolutePath } = await writeSynthetic(
      "dead-bottom.png",
      sharp(pixels, { raw: { width, height, channels: 3 } }),
    );
    const result = await checkComposedArtifactCreativeQuality({
      repoRoot,
      composedAbsolutePath: absolutePath,
      spec,
    });
    expect(result.findings.map((finding) => finding.code)).toContain(
      "composed_unfinished_below_lockup",
    );
  });
});

describe("Creative Director — subject obstruction", () => {
  const SYNTHETIC_WIDTH = 512;
  const SYNTHETIC_HEIGHT = 768;

  /** A generated field whose subject — busy, bright — sits in one half. */
  function detailBandField(band: "top" | "bottom"): sharp.Sharp {
    const pixels = Buffer.alloc(SYNTHETIC_WIDTH * SYNTHETIC_HEIGHT * 3);
    for (let y = 0; y < SYNTHETIC_HEIGHT; y += 1) {
      const inBand =
        band === "top" ? y < SYNTHETIC_HEIGHT * 0.45 : y > SYNTHETIC_HEIGHT * 0.55;
      for (let x = 0; x < SYNTHETIC_WIDTH; x += 1) {
        const base = (y * SYNTHETIC_WIDTH + x) * 3;
        // Busy inside the band, smooth gradient outside it. The blocks are 24px so
        // the structure survives the gate's viewing-scale blur — a subject a person
        // can see, not pixel grain the blur is meant to erase.
        const value = inBand
          ? (Math.floor(x / 24) + Math.floor(y / 24)) % 2 === 0
            ? 30
            : 230
          : 110 + Math.round(30 * (y / SYNTHETIC_HEIGHT));
        pixels[base] = value;
        pixels[base + 1] = value;
        pixels[base + 2] = value;
      }
    }
    return sharp(pixels, {
      raw: { width: SYNTHETIC_WIDTH, height: SYNTHETIC_HEIGHT, channels: 3 },
    });
  }

  /**
   * Writes the pair the gate actually reads: the generated field, and the composed
   * artifact with the spec's plate genuinely painted onto it. Coverage is measured
   * by differencing the two, so a test that hands over one file twice proves nothing.
   */
  async function obstructionPair(
    band: "top" | "bottom",
    spec: FlyerDesignSpec,
  ): Promise<{
    repoRoot: string;
    generatedAbsolutePath: string;
    composedAbsolutePath: string;
  }> {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "studio-creative-gate-"));
    const generatedAbsolutePath = path.join(repoRoot, `generated-${band}.png`);
    const composedAbsolutePath = path.join(repoRoot, `composed-${band}.png`);
    const field = detailBandField(band);
    writeFileSync(generatedAbsolutePath, await field.clone().png().toBuffer());

    const plate = plateOf(spec);
    const scaleX = SYNTHETIC_WIDTH / spec.canvas.widthPx;
    const scaleY = SYNTHETIC_HEIGHT / spec.canvas.heightPx;
    const plateWidth = Math.max(1, Math.round(plate.width * scaleX));
    const plateHeight = Math.max(1, Math.round(plate.height * scaleY));
    writeFileSync(
      composedAbsolutePath,
      await field
        .clone()
        .composite([
          {
            input: {
              create: {
                width: plateWidth,
                height: plateHeight,
                channels: 4,
                background: { r: 12, g: 14, b: 18, alpha: 1 },
              },
            },
            left: Math.max(0, Math.round(plate.x * scaleX)),
            top: Math.max(0, Math.round(plate.y * scaleY)),
          },
        ])
        .png()
        .toBuffer(),
    );
    return { repoRoot, generatedAbsolutePath, composedAbsolutePath };
  }

  it("rejects a plate parked on the busiest part of the image", async () => {
    // type_led_premium docks the plate on the bottom edge; put the subject there.
    const spec = composedFor("type_led_premium");
    const paths = await obstructionPair("bottom", spec);
    const obstruction = await measureSubjectObstruction({ ...paths, spec });
    expect(obstruction).not.toBeNull();
    expect(obstruction!.detailConcentrationRatio).toBeGreaterThan(2);
    const result = await checkComposedArtifactCreativeQuality({ ...paths, spec });
    expect(result.findings.map((finding) => finding.code)).toContain(
      "subject_obscured_by_type_plate",
    );
  });

  it("accepts the same plate when the subject is in the open half", async () => {
    const spec = composedFor("type_led_premium");
    const paths = await obstructionPair("top", spec);
    const obstruction = await measureSubjectObstruction({ ...paths, spec });
    expect(obstruction).not.toBeNull();
    expect(obstruction!.detailConcentrationRatio).toBeLessThan(2);
    expect(obstruction!.topDecileDetailCoveredShare).toBeLessThan(0.5);
    const result = await checkComposedArtifactCreativeQuality({ ...paths, spec });
    expect(result.findings.map((finding) => finding.code)).not.toContain(
      "subject_obscured_by_type_plate",
    );
  });
});

describe("Creative Director — readability at output size", () => {
  it("rejects Customer-One V19 body copy as unreadable on the sheet", () => {
    const spec = storedSpec(V19_RENDER_DIR);
    const findings = evaluateFlyerOutputReadability(spec);
    expect(findings.map((finding) => finding.id)).toContain(
      "body_copy_below_output_readability",
    );
    const body = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "body",
    );
    expect(body && body.type === "text" ? body.fontSizePx : 0).toBe(18);
    expect(effectiveOutputPointSize(18, spec.canvas.heightPx)).toBeLessThan(
      MIN_BODY_COPY_POINT_SIZE,
    );
  });

  it("passes body copy the repaired composer sets", () => {
    for (const familyId of ALL_FAMILIES) {
      const findings = evaluateFlyerOutputReadability(composedFor(familyId));
      expect(
        findings.map((finding) => `${familyId}:${finding.id}`),
        `${familyId} readability`,
      ).toEqual([]);
    }
  });

  it("rejects body copy that cannot be read against the plate behind it", () => {
    const spec = composedFor("type_led_premium");
    const plate = plateOf(spec);
    const dimmed: FlyerDesignSpec = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.type === "text" && layer.role === "body"
          ? { ...layer, color: plate.fill }
          : layer,
      ),
    };
    expect(evaluateFlyerOutputReadability(dimmed).map((f) => f.id)).toContain(
      "body_copy_contrast_below_output_floor",
    );
  });
});

describe("Creative reasoner materially affects composition", () => {
  it("gives editorial_split a composition distinguishable from type_led_premium", () => {
    const editorial = composedFor("editorial_split");
    const typeLed = composedFor("type_led_premium");
    expect(familySignatureKey(editorial)).not.toBe(familySignatureKey(typeLed));
    // Not a cosmetic difference: the plate frame itself moves.
    expect(plateOf(editorial).width).toBeLessThan(plateOf(typeLed).width * 0.75);
  });

  it("produces a distinct composition for most families, not one dock with labels", () => {
    const keys = ALL_FAMILIES.map((familyId) =>
      familySignatureKey(composedFor(familyId)),
    );
    expect(new Set(keys).size).toBeGreaterThanOrEqual(4);
  });

  it("asks the image generator for a zone that matches the composition", () => {
    const zones = ALL_FAMILIES.map(
      (familyId) => hybridLockupPlanFor(familyId, 1024, 1536).reservedImageZone,
    );
    expect(new Set(zones).size).toBe(ALL_FAMILIES.length);
  });
});

describe("Creative Director — layout family agreement", () => {
  it("rejects Customer-One V19: the route said editorial_split, the artifact did not", () => {
    const spec = storedSpec(V19_RENDER_DIR);
    expect(spec.creativeDirection?.layoutFamilyId).toBe("editorial_split");
    const findings = evaluateHybridLayoutFamilyAgreement(spec);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.map((finding) => finding.id)).toContain(
      "layout_family_composition_mismatch",
    );
  });

  it("accepts every composition the repaired composer produces for its own family", () => {
    for (const familyId of ALL_FAMILIES) {
      const findings = evaluateHybridLayoutFamilyAgreement(composedFor(familyId));
      expect(
        findings.map((finding) => `${familyId}:${finding.id}`),
        `${familyId} agreement`,
      ).toEqual([]);
    }
  });

  it("rejects a composition relabelled as a family it does not match", () => {
    const spec = composedFor("type_led_premium");
    const relabelled: FlyerDesignSpec = {
      ...spec,
      creativeDirection: {
        ...spec.creativeDirection!,
        layoutFamilyId: "editorial_split",
      },
    };
    expect(evaluateHybridLayoutFamilyAgreement(relabelled).length).toBeGreaterThan(0);
  });

  it("catches a plate that ignores the family's bottom margin", () => {
    // editorial_split lifts its lockup 48px off the trim. Drop it flush and the
    // plate geometry still passes while the layout no longer reads as that family.
    const spec = composedFor("editorial_split");
    const dropped: FlyerDesignSpec = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.id === "offer-panel" && layer.type === "shape"
          ? { ...layer, y: spec.canvas.heightPx - layer.height }
          : layer,
      ),
    };
    expect(evaluateHybridLayoutFamilyAgreement(dropped).map((f) => f.id)).toContain(
      "layout_family_bottom_margin_mismatch",
    );
  });

  it("catches type set at another family's scale", () => {
    // Plate geometry, anchor, alignment and rail all still agree. Only the type
    // scale is wrong, and type scale is part of what the family means:
    // editorial_split sets a 30px wordmark, type_led_premium a 52px one.
    const spec = composedFor("editorial_split");
    const planned = hybridLockupPlanFor("editorial_split", 1024, 1536).scale.wordmarkPx;
    const rescaled: FlyerDesignSpec = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.type === "text" && layer.role === "wordmark"
          ? { ...layer, fontSizePx: planned + 22 }
          : layer,
      ),
    };
    const ids = evaluateHybridLayoutFamilyAgreement(rescaled).map((f) => f.id);
    expect(ids).toContain("layout_family_type_scale_mismatch");
    expect(ids).not.toContain("layout_family_composition_mismatch");
  });
});

describe("REJECT — technically correct, creatively insufficient", () => {
  it("classifies every new creative finding as its own failure class", () => {
    for (const id of [
      "composed_dead_canvas_region",
      "composed_unfinished_below_lockup",
      "subject_obscured_by_type_plate",
      "creative_director_rejected_creatively_insufficient",
    ]) {
      expect(classifyFindingId(id), id).toBe("creatively_insufficient");
    }
  });

  it("routes a relabelled composition to a composition failure, not a legibility one", () => {
    expect(classifyFindingId("layout_family_composition_mismatch")).toBe(
      "template_generated_composition",
    );
    expect(classifyFindingId("body_copy_below_output_readability")).toBe(
      "legibility_failure",
    );
  });

  it("corrects a creative rejection internally instead of spending the customer's revision", () => {
    // The class exists so the loop can retry on the Studio's own budget. If this
    // ever became a customer-visible revision, the customer would pay for the
    // Studio's taste.
    expect(studioAutonomousProductionLoopV1.customerRevisionPolicyUnchanged).toBe(true);
    expect(studioAutonomousProductionLoopV1.ownerEscalation.notOnFirstFailure).toBe(true);
    expect(
      PRODUCTION_FAILURE_CLASS_STANDARDS.creatively_insufficient,
    ).toContain("never consumes a customer revision");

    const brief = buildProductionCorrectionBrief({
      sourceAttemptNumber: 1,
      findings: [
        {
          id: "composed_dead_canvas_region",
          severity: "fail",
          checkKind: "creative_quality",
          message: "49% of the artifact is one continuous dead region.",
        },
      ],
    });
    expect(brief.failureClasses).toContain("creatively_insufficient");
    // The next attempt is told to close the composition and try another family,
    // rather than asking the customer for different facts.
    expect(brief.constraints.tightenComposition).toBe(true);
    expect(brief.constraints.preferAlternateLayoutFamily).toBe(true);
  });
});
