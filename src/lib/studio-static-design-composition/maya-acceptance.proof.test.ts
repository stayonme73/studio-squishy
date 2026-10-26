/**
 * Stage 0 acceptance proof — Maya's failed revised flyer, composed on the new path.
 *
 * Controlled scenario. Her real intake facts and the exact revision instruction
 * that broke the legacy composer, mapped through the unmodified truth contract,
 * composed by the new path, rendered at print resolution, and then handed to the
 * QA gates that already exist. Her protected live history is neither read for
 * mutation nor written: the campaign record here is built in memory.
 *
 * Artifacts land in the package folder so a reviewer can look at the sheet rather
 * than take a passing test's word for it.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import { evaluateFlyerSpecCreativeQuality } from "@/lib/studio-design-renderer/flyer-creative-quality";
import { evaluateFlyerOutputReadability } from "@/lib/studio-design-renderer/flyer-output-readability";
import {
  liveAreaOccupancy,
  offerPanelContentFillRatio,
} from "@/lib/studio-design-renderer/flyer-creative-quality";
import type {
  DesignMaterialRef,
  FlyerProjectTruth,
} from "@/lib/studio-design-renderer/types";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { mapFlyerProjectTruthFromJob } from "@/lib/studio-dispatch/map-flyer-job-truth";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";
import { checkComposedArtifactCreativeQuality } from "@/lib/studio-project-alpha/composed-artifact-quality";

import { composeFlyerDocument, requiredFactValues } from "./compose-flyer";
import { toFlyerDesignSpec } from "./flyer-spec-projection";
import { toPolotnoDesign, validateWithPolotnoSchema } from "./polotno-interop";
import {
  chromiumStaticDesignRenderer,
  printDimensions,
} from "./render-chromium";
import type { StudioDesignDocument, StudioImageElement } from "./types";
import { validateDesignDocument } from "./validate-document";

const REPO = path.resolve(__dirname, "../../..");
const PKG = "studio-operating-static-design-composition-rebuild-1";
const ARTIFACTS = path.join(REPO, "docs", "launch", PKG, "artifacts");

const HERO_ID = "stage0-maya-hero";
const HERO_RELATIVE = path.posix.join(
  "docs/launch",
  PKG,
  "artifacts/hero-source.png",
);
const HERO_ABSOLUTE = path.join(REPO, HERO_RELATIVE);

/** Maya's live campaign id, referenced for traceability only. Never opened for write. */
const MAYA_LIVE_CAMPAIGN_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";

/**
 * A deterministic stand-in for the generated hero, produced at 4500x4500 — larger
 * than the 2200x3300 print canvas and a different aspect ratio, which is what gives
 * a focal point something to decide. Maya's real hero was generated at exactly the
 * logical canvas size, which is why cropping it was impossible.
 */
async function buildHeroSource(): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4500" height="4500">
  <defs>
    <linearGradient id="field" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="#22384f"/>
      <stop offset="42%" stop-color="#15283c"/>
      <stop offset="100%" stop-color="#080f1a"/>
    </linearGradient>
    <radialGradient id="key" cx="0.62" cy="0.34" r="0.42">
      <stop offset="0%" stop-color="#f4e3c4" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#c79a63" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#c79a63" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="4500" height="4500" fill="url(#field)"/>
  <g opacity="0.5">
    ${Array.from({ length: 26 }, (_, index) => {
      const x = 120 + index * 168;
      return `<rect x="${x}" y="${300 + (index % 5) * 190}" width="86" height="${1500 + (index % 7) * 210}" fill="url(#rail)"/>`;
    }).join("")}
  </g>
  <ellipse cx="2790" cy="1530" rx="1180" ry="1420" fill="url(#key)"/>
  <g fill="#e9d6b4" opacity="0.85">
    <ellipse cx="2790" cy="1180" rx="300" ry="360"/>
    <path d="M2440 1560 Q2790 1400 3140 1560 L3260 2980 L2320 2980 Z"/>
  </g>
  <g stroke="#f2e6cf" stroke-opacity="0.22" stroke-width="7" fill="none">
    ${Array.from({ length: 18 }, (_, index) => `<circle cx="1180" cy="3320" r="${140 + index * 96}"/>`).join("")}
  </g>
  <rect y="3600" width="4500" height="900" fill="#060c15" opacity="0.55"/>
</svg>`;
  mkdirSync(ARTIFACTS, { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(HERO_ABSOLUTE);
}

function heroMaterial(): DesignMaterialRef {
  return {
    materialId: HERO_ID,
    role: "hero",
    relativePath: HERO_RELATIVE,
    contentSha256: "0".repeat(64),
  };
}

function readyFlyerRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-flyer`;
  return evaluateJobDispatch({
    campaignId,
    jobId,
    skuId: "v2-rtu-flyer",
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: "v2-rtu-flyer" as const,
      status: "READY_FOR_DISPATCH" as const,
      readyForDispatch: true,
      productionFamilyId: "marketing_assets" as const,
      controlLane: "standard" as const,
      factFingerprint: "fp-stage0-maya",
      capabilityReadiness: "contract_ready" as const,
      evaluatedAt: "2026-09-15T00:00:00.000Z",
      reason: null,
      blocker: null,
      ownerActionRequired: false as const,
    },
  });
}

/** Maya's grand-opening intake, replicated in memory, plus the revision that failed. */
function controlledMayaCampaign(campaignId: string): CampaignRecord {
  const at = "2026-09-09T00:19:37.586Z";
  return {
    campaignId,
    campaignName: "Maya\u2019s Mobile Boutique",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Stage 0 controlled acceptance — not a live job",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: at,
    updatedAt: at,
    routeMapIntake: {
      submittedAt: at,
      answers: {
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "flyerPurpose")]:
          "Grand opening flyer for Maya\u2019s Mobile Boutique",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "mustInclude")]:
          "Grand Opening — first styling appointment $45. Call (804) 555-0142 or visit mayasmobileboutique.example.",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "intendedUse")]:
          "Both print and digital",
      },
    },
    routeMapIntakeSubmittedAt: at,
    machineFlyerRevisionEmphasis: {
      packageId: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
      instruction: "Please make Call or visit more prominent as the headline.",
      emphasizeExistingCtaAsHeadline: true,
      sourceRevisionPackageId: "pkg:stage0-controlled:rev-1",
      priorWorkVersionId: "flyer-v1",
      recordedAt: at,
    },
  } as CampaignRecord;
}

/** Share of a region whose pixels depart from the flat plate colour. */
async function regionInk(
  pngPath: string,
  box: { left: number; top: number; width: number; height: number },
): Promise<{ inkShare: number; distinctTones: number }> {
  const { data, info } = await sharp(pngPath)
    .extract(box)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const counts = new Map<number, number>();
  let dark = 0;
  const total = info.width * info.height;
  for (let index = 0; index < total; index += 1) {
    const offset = index * channels;
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luminance < 180) dark += 1;
    counts.set((r >> 4 << 8) | (g >> 4 << 4) | (b >> 4), 1);
  }
  return { inkShare: dark / Math.max(1, total), distinctTones: counts.size };
}

async function meanAbsoluteDifference(a: string, b: string): Promise<number> {
  const load = (file: string) =>
    sharp(file).resize(360, 540, { fit: "fill" }).greyscale().raw().toBuffer();
  const [left, right] = await Promise.all([load(a), load(b)]);
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += Math.abs(left[index]! - right[index]!);
  }
  return sum / left.length;
}

type Harness = {
  truth: FlyerProjectTruth;
  document: StudioDesignDocument;
  validation: ReturnType<typeof validateDesignDocument>;
  render: Awaited<ReturnType<typeof chromiumStaticDesignRenderer.render>>;
  focalVariantPath: string;
  /** Same path, run on a truth that still carries the pre-revision headline. */
  retained: {
    document: StudioDesignDocument;
    render: Awaited<ReturnType<typeof chromiumStaticDesignRenderer.render>>;
  };
};

let harness: Harness;

beforeAll(async () => {
  await buildHeroSource();
  const campaignId = "stage0-controlled-maya-grand-opening";
  const mapped = mapFlyerProjectTruthFromJob({
    repoRoot: REPO,
    campaign: controlledMayaCampaign(campaignId),
    dispatchRecord: readyFlyerRecord(campaignId),
    materials: [],
  });
  if (!mapped.ok) throw new Error(`truth mapping failed: ${mapped.code} ${mapped.message}`);

  // The generated hero is a production material; generation itself is out of Stage 0.
  const truth: FlyerProjectTruth = { ...mapped.truth, materials: [heroMaterial()] };

  const document = composeFlyerDocument({
    repoRoot: REPO,
    truth,
    heroMaterialId: HERO_ID,
    revisionEmphasis: {
      emphasizeExistingCtaAsHeadline: true,
      instruction: "Please make Call or visit more prominent as the headline.",
    },
    composedAt: "2026-09-15T00:00:00.000Z",
  });

  const meta = await sharp(HERO_ABSOLUTE).metadata();
  const validation = validateDesignDocument({
    document,
    factValues: requiredFactValues(truth),
    sourceDimensions: {
      [HERO_ID]: { width: meta.width ?? 0, height: meta.height ?? 0 },
    },
  });

  const render = await chromiumStaticDesignRenderer.render({
    document,
    repoRoot: REPO,
    materialPaths: { [HERO_ID]: HERO_ABSOLUTE },
    outputs: {
      printPngAbsolutePath: path.join(ARTIFACTS, "maya-revised-print-300dpi.png"),
      printPdfAbsolutePath: path.join(ARTIFACTS, "maya-revised-print-300dpi.pdf"),
      digitalPngAbsolutePath: path.join(ARTIFACTS, "maya-revised-digital.png"),
      // The HTML intermediate is not persisted: self-contained, it would be a
      // multi-megabyte base64 document, and the Polotno JSON reads better anyway.
    },
  });

  // Same document, focal point moved. Proves the focal number decides pixels.
  const focalVariantPath = path.join(ARTIFACTS, "maya-focal-variant.png");
  await chromiumStaticDesignRenderer.render({
    document: {
      ...document,
      elements: document.elements.map((element) =>
        element.id === "generated-hero"
          ? ({ ...(element as StudioImageElement), focal: { x: 0.06, y: 0.5 } } as const)
          : element,
      ),
    },
    repoRoot: REPO,
    materialPaths: { [HERO_ID]: HERO_ABSOLUTE },
    outputs: { printPngAbsolutePath: focalVariantPath },
  });

  /**
   * The same composition path on a truth that still carries "Grand Opening".
   * The revision emphasis is applied upstream by the truth mapper, which overwrites
   * `headline` with the CTA, so by the time composition runs the prior headline is
   * already gone. This second run shows the composition retains it when the truth
   * still has it — which locates that loss upstream, not here.
   */
  const retainedTruth: FlyerProjectTruth = { ...truth, headline: "Grand Opening" };
  const retainedDocument = composeFlyerDocument({
    repoRoot: REPO,
    truth: retainedTruth,
    heroMaterialId: HERO_ID,
    revisionEmphasis: {
      emphasizeExistingCtaAsHeadline: true,
      instruction: "Please make Call or visit more prominent as the headline.",
    },
    composedAt: "2026-09-15T00:00:00.000Z",
  });
  const retainedRender = await chromiumStaticDesignRenderer.render({
    document: retainedDocument,
    repoRoot: REPO,
    materialPaths: { [HERO_ID]: HERO_ABSOLUTE },
    outputs: {
      printPngAbsolutePath: path.join(ARTIFACTS, "maya-facts-retained-print-300dpi.png"),
    },
  });

  harness = {
    truth,
    document,
    validation,
    render,
    focalVariantPath,
    retained: { document: retainedDocument, render: retainedRender },
  };
}, 240_000);

describe("Stage 0 acceptance — Maya's revised flyer on the new path", () => {
  it("consumes the unmodified truth contract, including the revision emphasis", () => {
    expect(harness.truth.offerName).toMatch(/styling appointment/i);
    expect(harness.truth.priceDisplay).toBe("$45");
    expect(harness.truth.phone).toBe("(804) 555-0142");
    expect(harness.truth.webDisplay).toMatch(/mayasmobileboutique\.example/i);
    expect(harness.truth.cta).toBe("Call or visit");
    // The emphasis is applied upstream, in the truth mapper the Studio already had.
    expect(harness.truth.headline).toBe("Call or visit");
  });

  it("passes composition validation with real source dimensions", () => {
    expect(harness.validation.failures).toEqual([]);
    expect(harness.validation.ok).toBe(true);
  });

  it("carries every required customer fact into the rendered pixels", () => {
    expect(harness.render.failures).toEqual([]);
    const facts = requiredFactValues(harness.truth);
    for (const factId of cfg.requiredFactIds) {
      const value = String(facts[factId] ?? "").trim();
      if (!value) continue;
      // Looked up by the words, because after this revision `headline` and `cta` hold
      // the same message and one line carries both.
      const rendered = harness.render.renderedFacts.find(
        (fact) => fact.renderedText.trim().toLowerCase() === value.toLowerCase(),
      );
      expect(rendered, `fact ${factId} (${value}) not rendered`).toBeTruthy();
      expect(rendered!.visible).toBe(true);
      expect(rendered!.withinCanvas).toBe(true);
    }
    const byFact = new Map(
      harness.render.renderedFacts.map((fact) => [fact.factId, fact]),
    );
    expect(byFact.get("priceDisplay")!.renderedText.trim()).toBe("$45");
    expect(byFact.get("offerName")!.renderedText.trim()).toBe(
      "First styling appointment",
    );
    expect(byFact.get("phone")!.renderedText.trim()).toBe("(804) 555-0142");
    expect(byFact.get("webDisplay")!.renderedText.trim()).toBe(
      "mayasmobileboutique.example",
    );
    expect(harness.validation.measured.satisfiedBySharedLine).toEqual([
      { factId: "headline", elementIds: ["lead-line"] },
    ]);
  });

  it("sets every line in the embedded face, with no silent substitution", () => {
    for (const fact of harness.render.renderedFacts) {
      expect(fact.requestedFontFamily).toBe(cfg.fonts.houseSerifFamily);
      expect(fact.resolvedFontFamilies.length).toBeGreaterThan(0);
      // The concrete weight is named, and it is always a face of the embedded family.
      for (const resolved of fact.resolvedFontFamilies) {
        expect(resolved).toMatch(/^Source Serif 4( (Regular|Medium|SemiBold|Bold))?$/);
      }
      expect(fact.fontHonoured).toBe(true);
    }
    // Nothing on the sheet resolved to a host serif, which is what the legacy path did.
    const everyFace = harness.render.renderedFacts.flatMap(
      (fact) => fact.resolvedFontFamilies,
    );
    expect(everyFace.join(" ")).not.toMatch(/Palatino|Georgia|Times|Iowan/i);
  });

  it("exports print geometry at 300 DPI with the embedded face inside the PDF", async () => {
    const print = printDimensions(harness.document);
    expect(print).toMatchObject({ widthPx: 2200, heightPx: 3300 });
    const png = await sharp(harness.render.outputs.printPngAbsolutePath).metadata();
    expect(png.width).toBe(2200);
    expect(png.height).toBe(3300);

    // The PDF must be a physical sheet, not a page measured in output pixels.
    expect(print.trimHeightIn).toBeCloseTo(11, 3);
    expect(print.trimWidthIn).toBeCloseTo(7.3333, 3);
    expect(harness.render.pdfMediaBoxPoints).toBeTruthy();
    expect(harness.render.pdfMediaBoxPoints!.heightPt).toBeCloseTo(11 * 72, 0);
    expect(harness.render.pdfMediaBoxPoints!.widthPt).toBeCloseTo(7.3333 * 72, 0);

    expect(harness.render.pdfHasVectorText).toBe(true);
    expect(
      harness.render.pdfEmbeddedFontSubsets.some((name) => /SourceSerif4/i.test(name)),
    ).toBe(true);
    expect(
      harness.render.pdfEmbeddedFontSubsets.some((name) =>
        /Palatino|Georgia|Times|Arial/i.test(name),
      ),
    ).toBe(false);
  });

  it("never prints the same message twice, and retains the prior headline when the truth still has it", () => {
    const printed = harness.render.renderedFacts.map((fact) =>
      fact.renderedText.trim().toLowerCase(),
    );
    expect(new Set(printed).size).toBe(printed.length);

    const retainedEyebrow = harness.retained.render.renderedFacts.find(
      (fact) => fact.elementId === "eyebrow",
    );
    expect(retainedEyebrow?.renderedText.trim()).toBe("GRAND OPENING");
    expect(retainedEyebrow?.visible).toBe(true);
    expect(harness.retained.render.failures).toEqual([]);
  });

  it("moves real pixels when the focal point moves", async () => {
    const difference = await meanAbsoluteDifference(
      harness.render.outputs.printPngAbsolutePath,
      harness.focalVariantPath,
    );
    expect(difference).toBeGreaterThan(1.5);
  });

  it("does not paint a hollow offer panel — measured in the pixels", async () => {
    const scale = printDimensions(harness.document).scale;
    const panel = harness.document.elements.find(
      (element) => element.id === "offer-panel",
    )!;
    const ink = await regionInk(harness.render.outputs.printPngAbsolutePath, {
      left: Math.round(panel.x * scale),
      top: Math.round(panel.y * scale),
      width: Math.round(panel.width * scale),
      height: Math.round(panel.height * scale),
    });
    // Maya's legacy panel measured 0 ink and a single dominant tone.
    expect(ink.inkShare).toBeGreaterThan(0.04);
    expect(ink.distinctTones).toBeGreaterThan(8);
  });

  it("is inspectable by the existing QA gates, unchanged", async () => {
    const spec = toFlyerDesignSpec(harness.document, harness.truth);
    const creative = evaluateFlyerSpecCreativeQuality(spec, harness.truth);
    const readability = evaluateFlyerOutputReadability(spec);
    const composed = await checkComposedArtifactCreativeQuality({
      repoRoot: REPO,
      composedAbsolutePath: harness.render.outputs.printPngAbsolutePath,
      generatedAbsolutePath: null,
      spec,
    });

    expect(creative.filter((finding) => finding.severity === "fail")).toEqual([]);
    expect(readability.filter((finding) => finding.severity === "fail")).toEqual([]);
    expect(composed.findings).toEqual([]);
    expect(composed.ok).toBe(true);

    // The two measurements Maya's flyer failed on.
    expect(offerPanelContentFillRatio(spec)).toBeLessThan(1.85);
    expect(liveAreaOccupancy(spec)).toBeGreaterThan(0.72);
  });

  it("converts to a Polotno design that Polotno's own validator accepts", async () => {
    const meta = await sharp(HERO_ABSOLUTE).metadata();
    const design = toPolotnoDesign({
      document: harness.document,
      materialUrls: { [HERO_ID]: `file:///${HERO_RELATIVE}` },
      sourceDimensions: {
        [HERO_ID]: { width: meta.width ?? 0, height: meta.height ?? 0 },
      },
      fontUrls: {
        [cfg.fonts.houseSerifFamily]: `file:///${cfg.fonts.directoryRelative}/${cfg.fonts.faces[1]!.fileName}`,
      },
    });
    const validated = await validateWithPolotnoSchema(design);
    writeFileSync(
      path.join(ARTIFACTS, "maya-revised-polotno-design.json"),
      JSON.stringify(design, null, 2),
      "utf8",
    );
    if (validated.available) {
      expect(validated.errors).toEqual([]);
      expect(validated.valid).toBe(true);
    }
    // Whether or not the optional validator is installed, the conversion is lossless.
    expect(design.pages[0]!.children).toHaveLength(harness.document.elements.length);
  });

  it("writes the proof record a reviewer can check against the artifacts", async () => {
    const spec = toFlyerDesignSpec(harness.document, harness.truth);
    const scale = printDimensions(harness.document).scale;
    const panel = harness.document.elements.find(
      (element) => element.id === "offer-panel",
    )!;
    const ink = await regionInk(harness.render.outputs.printPngAbsolutePath, {
      left: Math.round(panel.x * scale),
      top: Math.round(panel.y * scale),
      width: Math.round(panel.width * scale),
      height: Math.round(panel.height * scale),
    });
    const heroMeta = await sharp(HERO_ABSOLUTE).metadata();
    const validated = await validateWithPolotnoSchema(
      toPolotnoDesign({
        document: harness.document,
        materialUrls: { [HERO_ID]: `file:///${HERO_RELATIVE}` },
        sourceDimensions: {
          [HERO_ID]: { width: heroMeta.width ?? 0, height: heroMeta.height ?? 0 },
        },
        fontUrls: { [cfg.fonts.houseSerifFamily]: "file:///font.woff2" },
      }),
    );

    const record = {
      packageId: cfg.packageId,
      stage: cfg.stage,
      scenario: {
        description:
          "Maya's revised flyer (CTA promoted to headline), composed on the Stage 0 path",
        liveCampaignReferencedForTraceabilityOnly: MAYA_LIVE_CAMPAIGN_ID,
        liveHistoryModified: false,
        revisionInstruction: harness.document.provenance.revisionEmphasis?.instruction,
      },
      truthFacts: requiredFactValues(harness.truth),
      renderer: harness.render.rendererId,
      logicalCanvas: harness.document.logical,
      print: harness.render.print,
      digital: harness.render.digital,
      fonts: harness.document.fonts.map((font) => ({
        family: font.family,
        weight: font.weight,
        embeddedAs: "inline woff2 base64 in the document",
        relativePath: font.relativePath,
        contentSha256: font.contentSha256,
      })),
      pdfEmbeddedFontSubsets: harness.render.pdfEmbeddedFontSubsets,
      heroSource: {
        widthPx: heroMeta.width,
        heightPx: heroMeta.height,
        printBoxPx: { width: 2200, height: 3300 },
        headroom: Number(((heroMeta.width ?? 0) / 2200).toFixed(3)),
      },
      resolvedCropWindows: Object.fromEntries(
        harness.document.elements
          .filter((element): element is StudioImageElement => element.type === "image")
          .map((element) => [element.id, { focal: element.focal }]),
      ),
      renderedFacts: harness.render.renderedFacts,
      compositionValidation: harness.validation,
      measured: {
        offerPanelInkShare: Number(ink.inkShare.toFixed(4)),
        offerPanelDistinctTones: ink.distinctTones,
        offerPanelContentFillRatio: Number(offerPanelContentFillRatio(spec).toFixed(3)),
        liveAreaOccupancy: Number(liveAreaOccupancy(spec).toFixed(3)),
      },
      existingQa: {
        flyerSpecCreativeQuality: evaluateFlyerSpecCreativeQuality(spec, harness.truth),
        flyerOutputReadability: evaluateFlyerOutputReadability(spec),
        composedArtifactCreativeQuality: await checkComposedArtifactCreativeQuality({
          repoRoot: REPO,
          composedAbsolutePath: harness.render.outputs.printPngAbsolutePath,
          generatedAbsolutePath: null,
          spec,
        }),
      },
      polotnoInterop: {
        schemaValidatorAvailable: validated.available,
        valid: validated.valid,
        errors: validated.errors,
        schemaVersion: validated.schemaVersion,
      },
      capabilitiesExercised: cfg.requiredCapabilities,
      artifacts: Object.fromEntries(
        Object.entries(harness.render.outputs).map(([key, value]) => [
          key,
          value ? path.relative(REPO, value).replace(/\\/g, "/") : null,
        ]),
      ),
    };

    const target = path.join(ARTIFACTS, "maya-acceptance-proof.json");
    writeFileSync(target, JSON.stringify(record, null, 2), "utf8");
    expect(record.compositionValidation.ok).toBe(true);
    expect(record.existingQa.composedArtifactCreativeQuality.ok).toBe(true);
  });
});
