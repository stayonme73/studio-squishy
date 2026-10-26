/**
 * Controlled customer-direction proof — Cedar & Stone Home Organizing.
 *
 * The Stage 0 acceptance proof answered "can the new path compose a strong sheet?"
 * using Maya's failed revision. This one answers a harder and more commercially
 * important question: **can it follow instructions it did not choose?**
 *
 * The brief below is fixed. It was not derived from the composition, and the
 * composition may not negotiate with it. Every line of copy, the palette
 * direction, the layout direction, and the trim were supplied by the customer, and
 * the proof passes only if the artifact carries all of them, invents nothing, and
 * still clears the QA gates the Studio already runs.
 *
 * Nothing here touches Maya's or Customer-One's history, and no paid provider is
 * called.
 *
 * ROLE CORRECTION, Owner directive 2026-09-15
 * (`docs/studio-production-lane-doctrine-v1-locked.md`): the visual sources below
 * are **geometry fixtures**, not artwork, and this file no longer claims otherwise.
 * They exist so crop, focal latitude, integration, contrast, and readability can be
 * graded with known pixel dimensions. Hand-authored vector scenes are not permitted
 * to stand in for the customer's hero art, so the visual-quality half of this proof
 * is deferred to a provider-generated asset — see
 * `cedar-stone-image-spend-gate.test.ts` for the request awaiting authorization.
 * What this file proves is the composition and fact machinery around that asset.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";
import {
  BLOCKED_SEED_SIGNATURES,
  deriveCreativeBrief,
  paletteForBrief,
  selectCreativeDirection,
} from "@/lib/studio-design-intelligence";
import {
  liveAreaOccupancy,
  offerPanelContentFillRatio,
  evaluateFlyerSpecCreativeQuality,
} from "@/lib/studio-design-renderer/flyer-creative-quality";
import { resolveFlyerFormat } from "@/lib/studio-design-renderer/flyer-content-proportional-composition";
import { evaluateFlyerOutputReadability } from "@/lib/studio-design-renderer/flyer-output-readability";
import type {
  DesignMaterialRef,
  FlyerProjectTruth,
} from "@/lib/studio-design-renderer/types";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { mapFlyerProjectTruthFromJob } from "@/lib/studio-dispatch/map-flyer-job-truth";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { checkComposedArtifactCreativeQuality } from "@/lib/studio-project-alpha/composed-artifact-quality";

import { checkBriefCompliance, type SuppliedCustomerLine } from "./brief-compliance";
import { composeModularThirdsFlyer } from "./compose-flyer-modular-thirds";
import { requiredFactValues } from "./compose-flyer";
import { toFlyerDesignSpec } from "./flyer-spec-projection";
import { toPolotnoDesign, validateWithPolotnoSchema } from "./polotno-interop";
import {
  chromiumStaticDesignRenderer,
  printDimensions,
  resolveCropWindow,
} from "./render-chromium";
import type { StudioDesignDocument, StudioImageElement } from "./types";
import { validateDesignDocument } from "./validate-document";

const REPO = path.resolve(__dirname, "../../..");
const PKG = "studio-operating-static-design-composition-rebuild-1";
const ARTIFACTS = path.join(REPO, "docs", "launch", PKG, "artifacts", "cedar-stone");

const HERO_ID = "cedar-stone-interior";
const TEXTURE_ID = "cedar-stone-texture";
/**
 * The provider-generated assets, produced once under Owner authorisation by
 * `scripts/cedar-stone-generate-visuals.mjs` and committed as proof artifacts. The
 * proof reads them; it does not regenerate them, so re-running costs nothing.
 */
const HERO_RELATIVE = path.posix.join(
  "docs/launch",
  PKG,
  "artifacts/cedar-stone/generated-hero-generated.png",
);
const TEXTURE_RELATIVE = path.posix.join(
  "docs/launch",
  PKG,
  "artifacts/cedar-stone/texture-inset-generated.png",
);

/**
 * Owner decision 2026-09-15, recorded rather than applied silently.
 *
 * gpt-image-1 tops out at 1536px, so the full-bleed 8.5in band cannot be served at
 * 300 DPI with crop headroom. Shrinking the hero to the ~4.1in the provider can
 * serve would have made this proof judge composition on a provider limit. The band
 * stays full width and the shortfall travels with the artifact.
 */
const CONTROLLED_PROOF_EXCEPTION = {
  scope: "controlled_proof",
  authorisedBy: "Owner (Tagia) 2026-09-15 — Option 2",
  reason:
    "gpt-image-1 maximum output is 1536px; a full-bleed 8.5in band at 300 DPI needs 2550px. Provider ceiling, not a composition mistake. Not the launch print standard.",
} as const;

/**
 * THE FIXED CUSTOMER BRIEF. Do not adjust to suit the composition.
 */
const BRIEF = {
  customer: "Cedar & Stone Home Organizing",
  deliverable: "8.5 × 11 inch promotional flyer, print + digital",
  purpose:
    "announce a spring organizing special and get prospective clients to book a consultation",
  audience:
    "busy homeowners, especially women 35–60, who want their homes to feel calmer and more organized",
  styleDirection:
    "bright, elevated, warm, calm, editorial, polished; not childish, not cluttered, not overly corporate",
  visualDirection:
    "airy sunlit home interior with natural textures, soft neutral palette with one muted green accent; image should feel premium and realistic, not generic stock-photo-like",
  layoutDirection:
    "strong visual hierarchy, generous breathing room, image and type should feel intentionally integrated; avoid one giant opaque text box covering the art",
  headline: "Make Space for What Matters",
  body: "Refresh your home this spring with thoughtful, practical organizing support designed around the way you actually live.",
  offerName: "Spring Reset Special",
  offerDetail: "3-hour home organizing session — $225",
  price: "$225",
  cta: "Book Your Consultation",
  web: "cedarandstone.com",
  phone: "(404) 555-0187",
  footer: "Serving Metro Atlanta",
} as const;

/** Every line the customer supplied. Nothing else may appear on the sheet. */
const SUPPLIED_LINES: readonly SuppliedCustomerLine[] = [
  { id: "businessName", label: "Customer name", text: BRIEF.customer },
  { id: "headline", label: "Headline", text: BRIEF.headline },
  { id: "body", label: "Body copy", text: BRIEF.body },
  { id: "offerName", label: "Offer", text: BRIEF.offerName },
  { id: "offerDetail", label: "Offer detail", text: BRIEF.offerDetail },
  { id: "cta", label: "Call to action", text: BRIEF.cta },
  { id: "phone", label: "Contact — phone", text: BRIEF.phone },
  { id: "web", label: "Contact — web", text: BRIEF.web },
  { id: "footer", label: "Required footer", text: BRIEF.footer },
];

/**
 * The provider-generated assets are read from disk, not built here.
 *
 * Two hand-authored SVG fixture builders used to live at this spot. They are gone
 * under `docs/studio-production-lane-doctrine-v1-locked.md`: composing artwork is
 * not this layer's job, and a vector scene standing in for a photograph made the
 * visual half of this proof unfalsifiable.
 */

function material(materialId: string, relativePath: string): DesignMaterialRef {
  return {
    materialId,
    role: "hero",
    relativePath,
    contentSha256: "0".repeat(64),
  };
}

/**
 * The brief's facts, placed verbatim into the unmodified truth contract. This is
 * the composition path under test, so the facts enter it exactly as supplied
 * rather than through the intake heuristics — which are then probed separately.
 */
function briefTruth(campaignId: string, jobId: string): FlyerProjectTruth {
  return {
    campaignId,
    jobId,
    dispatchId: `dispatch:${jobId}`,
    skuId: "v2-rtu-flyer",
    fixtureId: `controlled-${campaignId}`,
    label: "CONTROLLED CUSTOMER-DIRECTION PROOF — not a live job",
    outputMode: "customer",
    businessName: BRIEF.customer,
    wordmark: BRIEF.customer,
    // The offer detail line, as the customer wrote it. The price rides inside it.
    descriptor: BRIEF.offerDetail,
    headline: BRIEF.headline,
    offerName: BRIEF.offerName,
    priceDisplay: BRIEF.price,
    dateWindow: "",
    body: BRIEF.body,
    cta: BRIEF.cta,
    phone: BRIEF.phone,
    webDisplay: BRIEF.web,
    webUrl: `https://${BRIEF.web}`,
    disclaimer: BRIEF.footer,
    sizeNotes: BRIEF.deliverable,
    intendedUse: "print + digital",
    brandColors: {
      primary: "#3F5A4A",
      secondary: "#B89A6A",
      background: "#F4F0E6",
      text: "#2A2824",
      muted: "#6A655C",
    },
    approvedLogoVariantId: null,
    materials: [
      material(HERO_ID, HERO_RELATIVE),
      material(TEXTURE_ID, TEXTURE_RELATIVE),
    ],
    requiredTextTokens: [
      BRIEF.price,
      "Spring",
      "Reset",
      "Special",
      BRIEF.phone,
      BRIEF.web,
      BRIEF.footer,
    ],
    prohibitedClaimPatterns: [
      "guarantee",
      "% off",
      "#1",
      "best in",
      "See offer details",
      "Book online or call",
    ],
  };
}

/** The same brief expressed as Route Map intake, for the upstream chain probe. */
function intakeCampaign(campaignId: string): CampaignRecord {
  const at = "2026-09-15T00:00:00.000Z";
  const key = (field: string) => projectIntakeServiceFieldKey("v2-rtu-flyer", field);
  return {
    campaignId,
    campaignName: BRIEF.customer,
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Controlled customer-direction proof — not a live job",
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
        [key("flyerPurpose")]: BRIEF.purpose,
        [key("mustInclude")]: [
          BRIEF.headline,
          BRIEF.body,
          BRIEF.offerName,
          BRIEF.offerDetail,
          BRIEF.cta,
          BRIEF.phone,
          BRIEF.web,
          BRIEF.footer,
        ].join("\n"),
        [key("intendedUse")]: "print + digital",
        [key("sizeNotes")]: BRIEF.deliverable,
        [key("materials")]: `${BRIEF.styleDirection}. ${BRIEF.visualDirection}. ${BRIEF.layoutDirection}.`,
        [key("styleNotes")]: BRIEF.styleDirection,
        [key("disclaimers")]: BRIEF.footer,
        callToAction: BRIEF.cta,
      },
    },
    routeMapIntakeSubmittedAt: at,
  } as CampaignRecord;
}

function dispatchRecord(campaignId: string): JobDispatchRecord {
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
      factFingerprint: "fp-cedar-stone-direction",
      capabilityReadiness: "contract_ready" as const,
      evaluatedAt: "2026-09-15T00:00:00.000Z",
      reason: null,
      blocker: null,
      ownerActionRequired: false as const,
    },
  });
}

/** The composition with the type stripped — the art as it stands before words. */
function artOnly(document: StudioDesignDocument): StudioDesignDocument {
  return {
    ...document,
    elements: document.elements.filter((element) => element.type === "image"),
  };
}

async function meanAbsoluteDifference(a: string, b: string): Promise<number> {
  const load = (file: string) =>
    sharp(file).resize(360, 480, { fit: "fill" }).greyscale().raw().toBuffer();
  const [left, right] = await Promise.all([load(a), load(b)]);
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += Math.abs(left[index]! - right[index]!);
  }
  return sum / left.length;
}

/** Mean luminance and warmth of a region, for grading the style direction. */
async function regionTone(
  pngPath: string,
  box?: { left: number; top: number; width: number; height: number },
): Promise<{ luminance: number; warmth: number }> {
  const base = sharp(pngPath);
  const { data, info } = await (box ? base.extract(box) : base)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let luminance = 0;
  let warmth = 0;
  const total = info.width * info.height;
  for (let index = 0; index < total; index += 1) {
    const offset = index * info.channels;
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    luminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    warmth += r - b;
  }
  return { luminance: luminance / total, warmth: warmth / total };
}

type Harness = {
  truth: FlyerProjectTruth;
  document: StudioDesignDocument;
  validation: ReturnType<typeof validateDesignDocument>;
  render: Awaited<ReturnType<typeof chromiumStaticDesignRenderer.render>>;
  artOnlyPath: string;
  focalVariantPath: string;
  certifiedPlate: {
    document: StudioDesignDocument;
    render: Awaited<ReturnType<typeof chromiumStaticDesignRenderer.render>>;
  };
  brief: ReturnType<typeof deriveCreativeBrief>;
  direction: ReturnType<typeof selectCreativeDirection>;
  /** What the existing intake heuristics do to the customer's supplied wording. */
  upstream: FlyerProjectTruth;
  qa: {
    creative: ReturnType<typeof evaluateFlyerSpecCreativeQuality>;
    readability: ReturnType<typeof evaluateFlyerOutputReadability>;
    composed: Awaited<ReturnType<typeof checkComposedArtifactCreativeQuality>>;
  };
  compliance: ReturnType<typeof checkBriefCompliance>;
  sources: Record<string, { width: number; height: number }>;
};

let harness: Harness;

const CAMPAIGN_ID = "controlled-cedar-stone-spring-reset";

beforeAll(async () => {
  const heroAbsolute = path.join(REPO, HERO_RELATIVE);
  const textureAbsolute = path.join(REPO, TEXTURE_RELATIVE);
  for (const asset of [heroAbsolute, textureAbsolute]) {
    if (!existsSync(asset)) {
      throw new Error(
        `Generated asset missing: ${asset}. Run scripts/cedar-stone-generate-visuals.mjs under Owner authorisation. This proof does not generate, and does not substitute a fixture.`,
      );
    }
  }
  mkdirSync(ARTIFACTS, { recursive: true });
  const materialPaths = { [HERO_ID]: heroAbsolute, [TEXTURE_ID]: textureAbsolute };
  const [heroMeta, textureMeta] = await Promise.all([
    sharp(heroAbsolute).metadata(),
    sharp(textureAbsolute).metadata(),
  ]);
  const sources = {
    [HERO_ID]: { width: heroMeta.width ?? 0, height: heroMeta.height ?? 0 },
    [TEXTURE_ID]: { width: textureMeta.width ?? 0, height: textureMeta.height ?? 0 },
  };

  const jobId = `${CAMPAIGN_ID}::v2-rtu-flyer`;
  const base = briefTruth(CAMPAIGN_ID, jobId);

  /**
   * Palette and route come from the customer's own words through the existing
   * Design Intelligence, not from a hand-picked direction. "soft neutral palette"
   * is what selects botanical sage; "elevated ... editorial" is what sets the mood.
   */
  const brief = deriveCreativeBrief({
    businessName: BRIEF.customer,
    flyerPurpose: BRIEF.purpose,
    mustInclude: [BRIEF.offerName, BRIEF.offerDetail, BRIEF.cta, BRIEF.footer].join("\n"),
    materials: `${BRIEF.styleDirection}. ${BRIEF.visualDirection}. ${BRIEF.layoutDirection}. Audience: ${BRIEF.audience}.`,
    intendedUse: "print + digital",
    sizeNotes: BRIEF.deliverable,
    cta: BRIEF.cta,
    headline: BRIEF.headline,
    offerName: BRIEF.offerName,
    body: BRIEF.body,
    logoAvailable: false,
    suppliedImagery: true,
    requiredFacts: base.requiredTextTokens,
  });
  const direction = selectCreativeDirection({
    brief,
    recent: BLOCKED_SEED_SIGNATURES,
  });
  const palette = paletteForBrief(brief);

  const truth: FlyerProjectTruth = {
    ...base,
    brandColors: {
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      text: palette.text,
      muted: palette.muted,
    },
    creativeDirection: direction,
  };

  /**
   * The trim the customer asked for. 3300px is 11in at 300 DPI — the same graded
   * sheet height every existing readability threshold assumes — and 1187 logical
   * units materialise to 2550px, which is 8.5in. The height stays 1536 so no
   * px-calibrated QA threshold shifts underneath the proof.
   */
  const logical = { widthPx: 1187, heightPx: 1536 };

  const document = composeModularThirdsFlyer({
    repoRoot: REPO,
    truth,
    heroMaterialId: HERO_ID,
    textureMaterialId: TEXTURE_ID,
    palette,
    logical,
    heroPrintResolutionException: CONTROLLED_PROOF_EXCEPTION,
    composedAt: "2026-09-15T00:00:00.000Z",
  });

  const validation = validateDesignDocument({
    document,
    factValues: requiredFactValues(truth),
    sourceDimensions: sources,
  });

  // The art with no words on it, rendered first: the obstruction gate needs to
  // know what the photograph looked like before the type arrived, otherwise it
  // cannot tell whether the type landed on the subject.
  const artOnlyPath = path.join(ARTIFACTS, "cedar-stone-art-only.png");
  await chromiumStaticDesignRenderer.render({
    document: artOnly(document),
    repoRoot: REPO,
    materialPaths,
    outputs: { printPngAbsolutePath: artOnlyPath },
  });

  const render = await chromiumStaticDesignRenderer.render({
    document,
    repoRoot: REPO,
    materialPaths,
    outputs: {
      printPngAbsolutePath: path.join(ARTIFACTS, "cedar-stone-print-8_5x11-300dpi.png"),
      printPdfAbsolutePath: path.join(ARTIFACTS, "cedar-stone-print-8_5x11-300dpi.pdf"),
      digitalPngAbsolutePath: path.join(ARTIFACTS, "cedar-stone-digital.png"),
    },
  });

  // Same document, hero focal moved. Proves the focal number decides pixels.
  const focalVariantPath = path.join(ARTIFACTS, "cedar-stone-focal-variant.png");
  await chromiumStaticDesignRenderer.render({
    document: {
      ...document,
      elements: document.elements.map((element) =>
        element.id === "generated-hero"
          ? ({ ...(element as StudioImageElement), focal: { x: 0.5, y: 0.08 } } as const)
          : element,
      ),
    },
    repoRoot: REPO,
    materialPaths,
    outputs: { printPngAbsolutePath: focalVariantPath },
  });

  /**
   * The same composition on the certified 1024x1536 plate that `resolveFlyerFormat`
   * returns for this customer's stated size. It is a 7.33x11in sheet, not the
   * 8.5x11in they asked for — which is the trim blocker, rendered rather than
   * asserted.
   */
  const certifiedDocument = composeModularThirdsFlyer({
    repoRoot: REPO,
    truth,
    heroMaterialId: HERO_ID,
    textureMaterialId: TEXTURE_ID,
    palette,
    logical: { widthPx: 1024, heightPx: 1536 },
    heroPrintResolutionException: CONTROLLED_PROOF_EXCEPTION,
    composedAt: "2026-09-15T00:00:00.000Z",
  });
  const certifiedRender = await chromiumStaticDesignRenderer.render({
    document: certifiedDocument,
    repoRoot: REPO,
    materialPaths,
    outputs: {
      printPngAbsolutePath: path.join(ARTIFACTS, "cedar-stone-certified-plate-7_33x11.png"),
    },
  });

  // What the existing intake path does to the same brief, recorded not repaired.
  const mapped = mapFlyerProjectTruthFromJob({
    repoRoot: REPO,
    campaign: intakeCampaign(CAMPAIGN_ID),
    dispatchRecord: dispatchRecord(CAMPAIGN_ID),
    materials: [],
  });
  if (!mapped.ok) throw new Error(`intake probe failed: ${mapped.code} ${mapped.message}`);

  const spec = toFlyerDesignSpec(document, truth);
  const qa = {
    creative: evaluateFlyerSpecCreativeQuality(spec, truth),
    readability: evaluateFlyerOutputReadability(spec),
    composed: await checkComposedArtifactCreativeQuality({
      repoRoot: REPO,
      composedAbsolutePath: render.outputs.printPngAbsolutePath,
      generatedAbsolutePath: artOnlyPath,
      spec,
    }),
  };

  harness = {
    truth,
    document,
    validation,
    render,
    artOnlyPath,
    focalVariantPath,
    certifiedPlate: { document: certifiedDocument, render: certifiedRender },
    brief,
    direction,
    upstream: mapped.truth,
    qa,
    compliance: checkBriefCompliance({
      supplied: SUPPLIED_LINES,
      rendered: render.renderedFacts,
    }),
    sources,
  };
}, 300_000);

describe("Controlled customer-direction proof — Cedar & Stone", () => {
  it("prints every supplied line verbatim, once, and invents nothing", () => {
    const report = harness.compliance;
    expect(report.missing).toEqual([]);
    expect(report.duplicated).toEqual([]);
    // The strongest assertion here: nothing on the sheet is unaccounted for.
    expect(report.unaccounted).toEqual([]);
    expect(report.ok).toBe(true);
    // Case is presentation; the customer name is the only line set in caps.
    expect(report.caseTransformed).toEqual(["businessName"]);
    expect(report.lines).toHaveLength(SUPPLIED_LINES.length);
    for (const line of report.lines) {
      expect(line.verbatim, `${line.id} not verbatim`).toBe(true);
    }
  });

  it("passes composition validation, with the price carried inside the offer line", () => {
    expect(harness.validation.failures).toEqual([]);
    expect(harness.validation.ok).toBe(true);
    // The price is on the sheet without being printed a second time.
    expect(harness.validation.measured.satisfiedWithinLine).toEqual([
      { factId: "priceDisplay", carrierElementId: "offer-detail" },
    ]);
  });

  it("renders every line in the embedded face, including the em dash", () => {
    expect(harness.render.failures).toEqual([]);
    for (const fact of harness.render.renderedFacts) {
      expect(fact.requestedFontFamily).toBe(cfg.fonts.houseSerifFamily);
      expect(fact.fontHonoured, `${fact.elementId} substituted`).toBe(true);
      for (const resolved of fact.resolvedFontFamilies) {
        expect(resolved).toMatch(/^Source Serif 4( (Regular|Medium|SemiBold|Bold))?$/);
      }
    }
    // The offer line contains U+2014; a missing glyph would resolve a second face.
    const detail = harness.render.renderedFacts.find(
      (fact) => fact.elementId === "offer-detail",
    );
    expect(detail?.renderedText).toContain("—");
    expect(detail?.resolvedFontFamilies).toHaveLength(1);
  });

  it("keeps every line inside the box composition reserved for it", () => {
    // The first render of this sheet wrapped the offer detail onto two lines,
    // orphaning "$225" over the call to action. The text was correct, so no content
    // check saw it. This is the measurement that does.
    for (const fact of harness.render.renderedFacts) {
      const element = harness.document.elements.find(
        (candidate) => candidate.id === fact.elementId,
      )!;
      if (element.type !== "text") continue;
      if (element.maxLines != null) {
        expect(fact.lineCount, `${fact.elementId} line count`).toBeLessThanOrEqual(
          element.maxLines,
        );
      }
      // Graded on the leading the lines were laid out at, not on the face's
      // ascent/descent metric box — that box is ~1.38em whatever the leading, so
      // it measures font whitespace rather than whether the text fits.
      const laidOut = fact.lineCount * element.fontSize * element.lineHeight;
      expect(laidOut, `${fact.elementId} overflows its box`).toBeLessThanOrEqual(
        element.height + 3,
      );
    }
    // The offer detail specifically: one line, price included.
    const detail = harness.render.renderedFacts.find(
      (fact) => fact.elementId === "offer-detail",
    )!;
    expect(detail.lineCount).toBe(1);
    expect(detail.renderedText.trim()).toBe(BRIEF.offerDetail);
  });

  it("exports the 8.5 x 11 inch sheet the customer asked for", async () => {
    const print = printDimensions(harness.document);
    expect(print).toMatchObject({ widthPx: 2550, heightPx: 3300 });
    expect(harness.render.print.dpi).toBe(300);
    expect(print.trimWidthIn).toBeCloseTo(8.5, 3);
    expect(print.trimHeightIn).toBeCloseTo(11, 3);

    const png = await sharp(harness.render.outputs.printPngAbsolutePath).metadata();
    expect(png.width).toBe(2550);
    expect(png.height).toBe(3300);

    // A physical sheet in the PDF, read out of the file rather than requested.
    expect(harness.render.pdfMediaBoxPoints!.widthPt).toBeCloseTo(8.5 * 72, 0);
    expect(harness.render.pdfMediaBoxPoints!.heightPt).toBeCloseTo(11 * 72, 0);
    expect(harness.render.pdfHasVectorText).toBe(true);
    expect(
      harness.render.pdfEmbeddedFontSubsets.some((name) => /SourceSerif4/i.test(name)),
    ).toBe(true);

    // And the digital export off the same document.
    expect(harness.render.digital).toEqual({ widthPx: 1187, heightPx: 1536 });
  });

  it("records the hero's provider-ceiling shortfall instead of hiding or forgiving it", () => {
    // The document is valid, and it is not clean. Both are true, and both are said.
    expect(harness.validation.ok).toBe(true);
    expect(harness.validation.printResolutionExceptions).toHaveLength(1);
    const exception = harness.validation.printResolutionExceptions[0]!;
    expect(exception.elementId).toBe("generated-hero");
    expect(exception.label).toBe(cfg.printResolutionException.label);
    expect(exception.scope).toBe("controlled_proof");
    expect(exception.authorisedBy).toContain("Owner");
    expect(exception.permittedForLaunchPrint).toBe(false);
    // The measurement travels with the artifact rather than living in a memory.
    expect(exception.measuredSourceScale).toBeCloseTo(0.6, 2);
    expect(exception.requiredSourceScale).toBe(1.25);
    expect(exception.effectivePpi).toBe(181);
    // The global rule did not move.
    expect(cfg.cropHeadroom.minimumSourceScale).toBe(1.25);
    expect(cfg.printResolutionException.globalRuleUnchanged).toBe(true);
    // And an identical document without the authorisation still fails closed.
    const unauthorised = validateDesignDocument({
      document: {
        ...harness.document,
        elements: harness.document.elements.map((element) =>
          element.id === "generated-hero"
            ? { ...(element as StudioImageElement), printResolutionException: undefined }
            : element,
        ),
      },
      factValues: requiredFactValues(harness.truth),
      sourceDimensions: harness.sources,
    });
    expect(unauthorised.ok).toBe(false);
    expect(unauthorised.failures.map((failure) => failure.code)).toContain(
      cfg.failureCodes.cropWithoutHeadroom,
    );
  });

  it("crops the hero from a real window, and the focal point moves pixels", async () => {
    const print = printDimensions(harness.document);
    const hero = harness.document.elements.find(
      (element) => element.id === "generated-hero",
    ) as StudioImageElement;
    const heroSource = harness.sources[hero.materialId]!;
    // 1536x1024 into a 2550x1280 box: no horizontal latitude, real vertical latitude.
    const heroCrop = resolveCropWindow({
      source: heroSource,
      box: { width: hero.width, height: hero.height },
      focal: hero.focal!,
    });
    expect(heroCrop.width).toBe(1);
    expect(heroCrop.height).toBeLessThan(0.8);

    // The inset is the one that meets the headroom rule outright.
    const inset = harness.document.elements.find(
      (element) => element.id === "texture-inset",
    ) as StudioImageElement;
    const insetSource = harness.sources[inset.materialId]!;
    const insetHeadroom = Math.min(
      insetSource.width / (inset.width * print.scale),
      insetSource.height / (inset.height * print.scale),
    );
    expect(insetHeadroom).toBeGreaterThan(cfg.cropHeadroom.minimumSourceScale);
    /**
     * Stated rather than glossed: a 1024x1024 source in a square box is the one
     * geometry where `fit: cover` forms no crop window, so the inset's focal point
     * moves nothing. Its headroom is real — the pixels are downsampled, not
     * stretched — but the crop latitude on this sheet belongs to the hero.
     */
    const insetCrop = resolveCropWindow({
      source: insetSource,
      box: { width: inset.width, height: inset.height },
      focal: inset.focal!,
    });
    expect(insetCrop).toMatchObject({ width: 1, height: 1 });

    const difference = await meanAbsoluteDifference(
      harness.render.outputs.printPngAbsolutePath,
      harness.focalVariantPath,
    );
    expect(difference).toBeGreaterThan(1.5);
  });

  it("matches the supplied style direction: bright, warm, one green accent", async () => {
    const sheet = await regionTone(harness.render.outputs.printPngAbsolutePath);
    // "bright" — the sheet reads light, unlike Maya's dark editorial poster.
    expect(sheet.luminance).toBeGreaterThan(170);
    // "warm" — red consistently ahead of blue across the whole sheet.
    expect(sheet.warmth).toBeGreaterThan(8);

    // The muted green is an accent, not the field: the sage dock is a minority of
    // the sheet and the paper is the dominant tone.
    const print = printDimensions(harness.document);
    const dock = harness.document.elements.find(
      (element) => element.id === "offer-panel",
    )!;
    const dockShare =
      (dock.width * dock.height) /
      (harness.document.logical.widthPx * harness.document.logical.heightPx);
    expect(dockShare).toBeLessThan(0.2);
    const dockTone = await regionTone(harness.render.outputs.printPngAbsolutePath, {
      left: Math.round(dock.x * print.scale),
      top: Math.round(dock.y * print.scale),
      width: Math.round(dock.width * print.scale),
      height: Math.round(dock.height * print.scale),
    });
    // The accent is genuinely darker than the paper it sits on — a real contrast
    // step rather than a tint that disappears in print.
    expect(dockTone.luminance).toBeLessThan(sheet.luminance - 60);
  });

  it("does not cover the art with a type plate — measured, not asserted", () => {
    const measured = harness.qa.composed.measured;
    // The customer's instruction was explicit. These are the numbers that answer it.
    expect(measured.detailConcentrationUnderPlate).toBeLessThan(2);
    expect(measured.lightConcentrationUnderPlate).toBeLessThan(1.6);
    expect(measured.topDecileDetailCoveredShare).toBeLessThan(0.5);
    // Coverage came from differencing against the art, not from declared geometry.
    expect(measured.coverageFromDeclaredGeometry).toBe(0);
  });

  it("keeps the offer dock filled and the format used in proportion", () => {
    const spec = toFlyerDesignSpec(harness.document, harness.truth);
    expect(offerPanelContentFillRatio(spec)).toBeLessThan(1.85);
    expect(liveAreaOccupancy(spec)).toBeGreaterThan(0.72);
    const dockFill = harness.validation.measured.containerFill.find(
      (entry) => entry.containerId === "offer-panel",
    )!;
    expect(dockFill.contentHeightShare).toBeGreaterThan(
      cfg.hollowContainer.minContentHeightShare,
    );
    expect(dockFill.contentElementIds).toContain("cta");
  });

  it("passes the existing QA gates unchanged, Creative Director included", () => {
    expect(harness.qa.creative.filter((finding) => finding.severity === "fail")).toEqual(
      [],
    );
    expect(
      harness.qa.readability.filter((finding) => finding.severity === "fail"),
    ).toEqual([]);
    expect(harness.qa.composed.findings).toEqual([]);
    expect(harness.qa.composed.ok).toBe(true);

    // Creative direction is present, so the Creative Director and full-canvas gates
    // actually ran rather than short-circuiting on a missing stamp.
    expect(harness.truth.outputMode).toBe("customer");
    expect(harness.truth.creativeDirection).toBeTruthy();
  });

  it("takes its palette and layout family from the customer's own words", () => {
    expect(harness.brief.existingBrandColors?.familyId).toBe("botanical_sage");
    expect(harness.brief.moodId).toBe("elegant_premium");
    expect(harness.brief.moodSource).toBe("customer_language");
    // Muted green accent, warm neutrals — chosen by the existing engine.
    expect(harness.truth.brandColors.primary).toBe("#3F5A4A");
    expect(harness.truth.brandColors.background).toBe("#F4F0E6");
    expect(harness.direction.selectedRoute.layoutFamilyId).not.toBe(
      "centered_promotional_plate",
    );
  });

  it("stays renderer-swappable: the same document validates as Polotno", async () => {
    const design = toPolotnoDesign({
      document: harness.document,
      materialUrls: {
        [HERO_ID]: `file:///${HERO_RELATIVE}`,
        [TEXTURE_ID]: `file:///${TEXTURE_RELATIVE}`,
      },
      sourceDimensions: harness.sources,
      fontUrls: {
        [cfg.fonts.houseSerifFamily]: `file:///${cfg.fonts.directoryRelative}/${cfg.fonts.faces[1]!.fileName}`,
      },
    });
    const validated = await validateWithPolotnoSchema(design);
    if (validated.available) {
      expect(validated.errors).toEqual([]);
      expect(validated.valid).toBe(true);
    }
    expect(design.pages[0]!.children).toHaveLength(harness.document.elements.length);
    // Polotno pages are in pixels, so the design is emitted at the output
    // resolution the swap would render — 8.5 x 11in at 300 DPI, not logical units.
    expect(design.width).toBe(2550);
    expect(design.height).toBe(3300);
    expect(design.dpi).toBe(300);
    writeFileSync(
      path.join(ARTIFACTS, "cedar-stone-polotno-design.json"),
      JSON.stringify(design, null, 2),
      "utf8",
    );
  });

  it("composes the same document onto the certified plate, at a different trim", async () => {
    const certified = printDimensions(harness.certifiedPlate.document);
    expect(certified).toMatchObject({ widthPx: 2200, heightPx: 3300 });
    // Which is 7.33in wide, not the 8.5in the customer asked for.
    expect(certified.trimWidthIn).toBeCloseTo(7.3333, 3);
    expect(harness.certifiedPlate.render.failures).toEqual([]);

    // The Studio's own frozen format rule maps "8.5 x 11 inch" onto this plate.
    const resolved = resolveFlyerFormat(harness.truth);
    expect(resolved.sizeLocked).toBe(true);
    expect(resolved.reason).toBe("customer_selected_size");
    expect(resolved.format.widthPx).toBe(1024);
    expect(resolved.format.heightPx).toBe(1536);
    // 1024/1536 is 2:3. At 300 DPI that is 7.33 x 11in. The rule cannot express
    // 8.5 x 11, which is the open trim decision this proof is not allowed to make.
    expect(resolved.format.widthPx / resolved.format.heightPx).toBeCloseTo(2 / 3, 3);
  });

  it("records what the existing intake path does to the supplied wording", () => {
    // Not a repair — a measurement. The composition path received the customer's
    // exact facts; this is what the upstream heuristics would have handed it.
    const upstream = harness.upstream;
    expect(upstream.priceDisplay).toBe("$225");
    expect(upstream.phone).toBe(BRIEF.phone);
    expect(upstream.webDisplay).toBe(BRIEF.web);
    // The truth contract has no verbatim customer-headline field: the mapper
    // derives one. Whatever it produces, record it rather than assume it.
    expect(typeof upstream.headline).toBe("string");
    expect(upstream.descriptor).toBe("");
  });

  it("writes the proof record a reviewer can check against the artifacts", async () => {
    const spec = toFlyerDesignSpec(harness.document, harness.truth);
    const print = printDimensions(harness.document);
    const sheet = await regionTone(harness.render.outputs.printPngAbsolutePath);
    const record = {
      packageId: cfg.packageId,
      stage: cfg.stage,
      proof: "CONTROLLED-CUSTOMER-DIRECTION-PROOF",
      scenario: {
        description:
          "Fixed Cedar & Stone brief executed on the Stage 0 composition path",
        customer: BRIEF.customer,
        briefSuppliedByOwner: true,
        mayaOrCustomerOneHistoryTouched: false,
        /**
         * A paid provider **was** called for this proof, once, under Owner
         * authorisation, and the visual assets are its output. The proof itself
         * spends nothing on re-run: it reads the committed assets.
         */
        visualAssetOrigin: "openai_gpt_image_1_owner_authorised",
        visualAssetGenerationRecord: path.posix.join(
          "docs/launch",
          PKG,
          "artifacts/cedar-stone/generation-record.json",
        ),
        paidProviderCalledDuringThisRun: false,
      },
      visualAssets: JSON.parse(
        readFileSync(path.join(ARTIFACTS, "generation-record.json"), "utf8"),
      ),
      brief: BRIEF,
      suppliedLines: SUPPLIED_LINES,
      briefCompliance: harness.compliance,
      creativeDirectionFromCustomerWords: {
        paletteFamilyId: harness.brief.existingBrandColors?.familyId,
        moodId: harness.brief.moodId,
        moodSource: harness.brief.moodSource,
        industryFamily: harness.brief.industryFamily,
        selectedRoute: harness.direction.selectedRoute,
        candidateRoutes: harness.direction.candidateRoutes.map((route) => route.routeId),
      },
      truthFacts: requiredFactValues(harness.truth),
      renderer: harness.render.rendererId,
      logicalCanvas: harness.document.logical,
      print,
      pdfMediaBoxPoints: harness.render.pdfMediaBoxPoints,
      digital: harness.render.digital,
      fonts: harness.document.fonts.map((font) => ({
        family: font.family,
        weight: font.weight,
        embeddedAs: "inline woff2 base64 in the document",
        relativePath: font.relativePath,
        contentSha256: font.contentSha256,
      })),
      pdfEmbeddedFontSubsets: harness.render.pdfEmbeddedFontSubsets,
      imageSources: Object.fromEntries(
        harness.document.elements
          .filter((element): element is StudioImageElement => element.type === "image")
          .map((element) => {
            const source = harness.sources[element.materialId]!;
            return [
              element.id,
              {
                source,
                logicalBox: { width: element.width, height: element.height },
                printBox: {
                  width: Math.round(element.width * print.scale),
                  height: Math.round(element.height * print.scale),
                },
                headroomTighterAxis: Number(
                  Math.min(
                    source.width / (element.width * print.scale),
                    source.height / (element.height * print.scale),
                  ).toFixed(3),
                ),
                focal: element.focal,
                resolvedCrop: resolveCropWindow({
                  source,
                  box: { width: element.width, height: element.height },
                  focal: element.focal ?? { x: 0.5, y: 0.5 },
                }),
                masked: Boolean(element.clipSrc),
                cornerRadius: element.cornerRadius ?? 0,
              },
            ];
          }),
      ),
      renderedFacts: harness.render.renderedFacts,
      compositionValidation: harness.validation,
      measuredStyle: {
        sheetMeanLuminance: Number(sheet.luminance.toFixed(1)),
        sheetWarmthRedMinusBlue: Number(sheet.warmth.toFixed(1)),
        offerPanelContentFillRatio: Number(offerPanelContentFillRatio(spec).toFixed(3)),
        liveAreaOccupancy: Number(liveAreaOccupancy(spec).toFixed(3)),
      },
      existingQa: {
        flyerSpecCreativeQuality: harness.qa.creative,
        flyerOutputReadability: harness.qa.readability,
        composedArtifactCreativeQuality: harness.qa.composed,
        creativeDirectorRan: true,
      },
      trimBlocker: {
        customerAsked: "8.5 x 11 in",
        renderedPrimary: `${print.trimWidthIn.toFixed(3)} x ${print.trimHeightIn.toFixed(3)} in`,
        certifiedPlateWouldBe: "7.333 x 11 in",
        frozenRule: "resolveFlyerFormat -> FLYER_FORMAT_POSTER (1024x1536, 2:3)",
        note: "The certified format list cannot express 8.5x11. Owner decision, outside Stage 0.",
      },
      upstreamIntakeProbe: {
        note: "Recorded, not repaired. The composition path received the brief verbatim.",
        headline: harness.upstream.headline,
        offerName: harness.upstream.offerName,
        descriptor: harness.upstream.descriptor,
        body: harness.upstream.body,
        cta: harness.upstream.cta,
        priceDisplay: harness.upstream.priceDisplay,
        phone: harness.upstream.phone,
        webDisplay: harness.upstream.webDisplay,
        disclaimer: harness.upstream.disclaimer,
      },
      artifacts: {
        print: path
          .relative(REPO, harness.render.outputs.printPngAbsolutePath)
          .replace(/\\/g, "/"),
        printPdf: path
          .relative(REPO, harness.render.outputs.printPdfAbsolutePath!)
          .replace(/\\/g, "/"),
        digital: path
          .relative(REPO, harness.render.outputs.digitalPngAbsolutePath!)
          .replace(/\\/g, "/"),
        artOnly: path.relative(REPO, harness.artOnlyPath).replace(/\\/g, "/"),
        focalVariant: path.relative(REPO, harness.focalVariantPath).replace(/\\/g, "/"),
        certifiedPlate: path
          .relative(REPO, harness.certifiedPlate.render.outputs.printPngAbsolutePath)
          .replace(/\\/g, "/"),
      },
    };

    writeFileSync(
      path.join(ARTIFACTS, "cedar-stone-direction-proof.json"),
      JSON.stringify(record, null, 2),
      "utf8",
    );
    expect(record.briefCompliance.ok).toBe(true);
    expect(record.existingQa.composedArtifactCreativeQuality.ok).toBe(true);
  });
});
