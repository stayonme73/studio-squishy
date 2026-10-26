import path from "path";
import { describe, expect, it } from "vitest";

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";

import { composeFlyerDocument, requiredFactValues } from "./compose-flyer";
import { loadHouseFonts, resolvedFaceHonoursRequest } from "./fonts";
import { toFlyerDesignSpec } from "./flyer-spec-projection";
import { toPolotnoDesign } from "./polotno-interop";
import {
  buildDocumentHtml,
  pdfLayoutScaleFor,
  printDimensions,
  resolveCropWindow,
} from "./render-chromium";
import type { StudioDesignDocument, StudioTextElement } from "./types";
import { validateDesignDocument } from "./validate-document";

const REPO = path.resolve(__dirname, "../../..");

/**
 * Maya's Mobile Boutique grand-opening facts, as her live intake carries them.
 * A controlled copy: nothing here reads or writes her protected job history.
 */
const MAYA_TRUTH: FlyerProjectTruth = {
  campaignId: "stage0-controlled-maya",
  jobId: "stage0-controlled-maya::v2-rtu-flyer",
  dispatchId: "stage0-controlled-maya-dispatch",
  skuId: "v2-rtu-flyer",
  fixtureId: "stage0-maya-grand-opening",
  label: "Stage 0 controlled acceptance",
  outputMode: "certification_fixture",
  businessName: "Maya\u2019s Mobile Boutique",
  wordmark: "Maya\u2019s Mobile Boutique",
  descriptor: "",
  headline: "Grand Opening",
  offerName: "First styling appointment",
  priceDisplay: "$45",
  dateWindow: "",
  body: "",
  cta: "Call or visit",
  phone: "(804) 555-0142",
  webDisplay: "mayasmobileboutique.example",
  webUrl: "https://mayasmobileboutique.example",
  disclaimer: "",
  sizeNotes: "",
  intendedUse: "Both print and digital",
  brandColors: {
    primary: "#1f3a5f",
    secondary: "#d9b970",
    background: "#0b1420",
    text: "#f6f1e6",
    muted: "#d8cdb8",
  },
  approvedLogoVariantId: null,
  materials: [
    {
      materialId: "stage0-hero",
      role: "hero",
      relativePath: "docs/launch/stage0/hero.png",
      contentSha256: "0".repeat(64),
    },
  ],
  requiredTextTokens: ["First styling appointment", "$45"],
  prohibitedClaimPatterns: ["flyer for"],
};

/** The revision that broke the legacy composer on her job. */
const REVISION = {
  emphasizeExistingCtaAsHeadline: true,
  instruction: "Please make Call or visit more prominent as the headline.",
};

function compose(overrides: Partial<FlyerProjectTruth> = {}): StudioDesignDocument {
  return composeFlyerDocument({
    repoRoot: REPO,
    truth: { ...MAYA_TRUTH, ...overrides },
    heroMaterialId: "stage0-hero",
    revisionEmphasis: REVISION,
  });
}

function validate(document: StudioDesignDocument, truth = MAYA_TRUTH) {
  return validateDesignDocument({
    document,
    factValues: requiredFactValues(truth),
  });
}

describe("Stage 0 — embedded deterministic fonts", () => {
  it("carries the house faces as bytes, with provenance, from the repository", () => {
    const fonts = loadHouseFonts(REPO);
    expect(fonts).toHaveLength(cfg.fonts.faces.length);
    for (const font of fonts) {
      expect(font.family).toBe(cfg.fonts.houseSerifFamily);
      expect(font.bytesBase64.length).toBeGreaterThan(1000);
      expect(font.contentSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(font.relativePath.startsWith(cfg.fonts.directoryRelative)).toBe(true);
    }
  });

  it("raises rather than let a missing face become a substitution", () => {
    expect(() => loadHouseFonts(path.join(REPO, "does-not-exist"))).toThrow(
      /Font file missing/,
    );
  });

  it("inlines the bytes with no fallback stack the host could satisfy", async () => {
    const { html } = await buildDocumentHtml({
      document: compose(),
      materialPaths: {},
    });
    expect(html).toContain("data:font/woff2;base64,");
    expect(html).not.toMatch(/font-family:[^;}]*(Georgia|Palatino|serif\s*[;}])/);
  });

  it("treats a substituted face at render time as a failure, not a detail", () => {
    expect(resolvedFaceHonoursRequest("Source Serif 4", ["Source Serif 4"])).toBe(true);
    // The concrete weight of the same embedded family is the right face.
    expect(
      resolvedFaceHonoursRequest("Source Serif 4", ["Source Serif 4 SemiBold"]),
    ).toBe(true);
    expect(resolvedFaceHonoursRequest("Source Serif 4", ["Palatino Linotype"])).toBe(false);
    expect(resolvedFaceHonoursRequest("Source Serif 4", [])).toBe(false);
    expect(
      resolvedFaceHonoursRequest("Source Serif 4", ["Source Serif 4", "Times New Roman"]),
    ).toBe(false);
    // A different family that merely starts with the same words is still a swap.
    expect(
      resolvedFaceHonoursRequest("Source Serif 4", ["Source Serif 4 Condensed"]),
    ).toBe(false);
  });

  it("refuses a face the document does not carry", () => {
    const document = compose();
    const elements = document.elements.map((element) =>
      element.id === "lead-line"
        ? ({ ...(element as StudioTextElement), fontFamily: "Helvetica Neue" } as const)
        : element,
    );
    const result = validate({ ...document, elements });
    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain(
      cfg.failureCodes.fontNotDeclared,
    );
  });

  it("refuses a weight the document does not carry, rather than synthesise one", () => {
    const document = compose();
    const elements = document.elements.map((element) =>
      element.id === "offer-name"
        ? ({ ...(element as StudioTextElement), fontWeight: 500 } as const)
        : element,
    );
    const result = validate({ ...document, elements });
    expect(result.failures.map((failure) => failure.code)).toContain(
      cfg.failureCodes.fontNotDeclared,
    );
  });
});

describe("Stage 0 — no silently dropped facts", () => {
  it("binds every required fact Maya supplied", () => {
    const result = validate(compose());
    expect(result.failures).toEqual([]);
    expect(result.measured.boundFactIds).toEqual(
      expect.arrayContaining([
        "businessName",
        "cta",
        "headline",
        "offerName",
        "phone",
        "priceDisplay",
        "webDisplay",
      ]),
    );
  });

  it("keeps the previous headline when the revision promotes the CTA over it", () => {
    const document = compose();
    const lead = document.elements.find((element) => element.id === "lead-line");
    const eyebrow = document.elements.find((element) => element.id === "eyebrow");
    expect(lead).toMatchObject({ role: "headline", factId: "cta", text: "Call or visit" });
    expect(eyebrow).toMatchObject({ factId: "headline", text: "GRAND OPENING" });
  });

  it("does not print the same message twice when the truth already overwrote the headline", () => {
    // What `mapFlyerProjectTruthFromJob` hands over for this revision: headline === cta.
    const document = compose({ headline: "Call or visit" });
    expect(document.elements.some((element) => element.id === "eyebrow")).toBe(false);
    const lines = document.elements
      .filter((element): element is StudioTextElement => element.type === "text")
      .map((element) => element.text.toLowerCase());
    expect(new Set(lines).size).toBe(lines.length);

    // The headline's words are still on the sheet, carried by the promoted line.
    const result = validate(document, { ...MAYA_TRUTH, headline: "Call or visit" });
    expect(result.ok).toBe(true);
    expect(result.measured.satisfiedBySharedLine).toEqual([
      { factId: "headline", elementIds: ["lead-line"] },
    ]);
  });

  it("still fails when the words themselves never reach the sheet", () => {
    const document = compose();
    const result = validateDesignDocument({
      document: {
        ...document,
        elements: document.elements.filter((element) => element.id !== "contact-phone"),
      },
      factValues: requiredFactValues(MAYA_TRUTH),
    });
    expect(result.failures.map((failure) => failure.code)).toContain(
      cfg.failureCodes.requiredFactMissing,
    );
  });

  it("applies case as presentation without rewriting the customer's words", () => {
    const document = compose();
    const offer = document.elements.find(
      (element) => element.id === "offer-name",
    ) as StudioTextElement;
    expect(offer.text).toBe("First styling appointment");
    expect(offer.presentationCase).toBe("sentence");
    // Same words, different case, so validation accepts it.
    expect(validate(document, { ...MAYA_TRUTH, offerName: "first styling appointment" }).ok).toBe(
      true,
    );
    // Different words never pass, whatever the case.
    expect(
      validate(document, { ...MAYA_TRUTH, offerName: "first styling session" }).failures.map(
        (failure) => failure.code,
      ),
    ).toContain(cfg.failureCodes.factTextAltered);
  });

  it("fails when a required fact is dropped — the legacy failure mode", () => {
    const document = compose();
    const result = validate({
      ...document,
      elements: document.elements.filter((element) => element.id !== "price"),
    });
    expect(result.ok).toBe(false);
    const failure = result.failures.find(
      (item) => item.code === cfg.failureCodes.requiredFactMissing,
    );
    expect(failure?.message).toMatch(/priceDisplay/);
    expect(failure?.message).toMatch(/\$45/);
  });

  it("fails when a fact is rewritten rather than placed", () => {
    const document = compose();
    const elements = document.elements.map((element) =>
      element.id === "price"
        ? ({ ...(element as StudioTextElement), text: "Only $45!" } as const)
        : element,
    );
    const result = validate({ ...document, elements });
    expect(result.failures.map((failure) => failure.code)).toContain(
      cfg.failureCodes.factTextAltered,
    );
  });

  it("fails when one fact is bound twice — how deduplication bugs start", () => {
    const document = compose();
    const price = document.elements.find(
      (element) => element.id === "price",
    ) as StudioTextElement;
    const result = validate({
      ...document,
      elements: [...document.elements, { ...price, id: "price-echo", y: price.y + 4 }],
    });
    expect(result.failures.map((failure) => failure.code)).toContain(
      cfg.failureCodes.factBoundTwice,
    );
  });

  it("does not invent copy for facts the customer never supplied", () => {
    const document = compose();
    const bound = document.elements
      .filter((element): element is StudioTextElement => element.type === "text")
      .map((element) => element.factId);
    expect(bound).not.toContain("dateWindow");
    expect(bound).not.toContain("body");
    expect(bound).not.toContain("descriptor");
    expect(bound).not.toContain("disclaimer");
  });
});

describe("Stage 0 — no hollow decorative containers", () => {
  it("fills the offer dock rather than painting an empty card", () => {
    const result = validate(compose());
    const panel = result.measured.containerFill.find(
      (item) => item.containerId === "offer-panel",
    );
    expect(panel?.contentHeightShare).toBeGreaterThanOrEqual(
      cfg.hollowContainer.minContentHeightShare,
    );
    expect(panel?.contentElementIds).toEqual(
      expect.arrayContaining(["lead-line", "offer-name", "price"]),
    );
  });

  it("fails when the dock's content is removed but the plate is still painted", () => {
    const document = compose();
    const emptied = document.elements.filter(
      (element) => !["lead-line", "offer-name", "price", "detail-inset"].includes(element.id),
    );
    const result = validateDesignDocument({
      document: { ...document, elements: emptied },
      // Only ask about the container contract here; the dropped facts are covered above.
      factValues: {},
    });
    const failure = result.failures.find(
      (item) => item.code === cfg.failureCodes.hollowContainer,
    );
    expect(failure?.message).toMatch(/hollow offer panel/i);
  });

  it("allows a decorative field only when it says why it carries nothing", () => {
    const document = compose();
    const scrim = document.elements.find((element) => element.id === "field-bleed");
    expect(scrim).toMatchObject({ requiresContent: false });
    expect((scrim as { decorativePurpose?: string }).decorativePurpose).toBeTruthy();

    const stripped = document.elements.map((element) =>
      element.id === "field-bleed"
        ? { ...element, decorativePurpose: undefined }
        : element,
    );
    const result = validateDesignDocument({
      document: { ...document, elements: stripped as typeof document.elements },
      factValues: {},
    });
    expect(result.failures.map((failure) => failure.code)).toContain(
      cfg.failureCodes.hollowContainer,
    );
  });
});

describe("Stage 0 — print canvas, crop, and focal positioning", () => {
  it("materialises 300 DPI print geometry from the logical space", () => {
    const print = printDimensions(compose());
    expect(print.heightPx).toBe(cfg.print.dpi * cfg.print.referenceSheetHeightIn);
    expect(print.heightPx).toBe(3300);
    expect(print.widthPx).toBe(2200);
    expect(print.scale).toBeCloseTo(2.148, 3);
    // The physical sheet those pixels stand for.
    expect(print.trimHeightIn).toBeCloseTo(11, 6);
    expect(print.trimWidthIn).toBeCloseTo(7.3333, 3);
  });

  it("lays the PDF out as a physical sheet, inside Chromium's scale range", () => {
    const scale = pdfLayoutScaleFor(compose());
    // 1024 CSS px is 10.667in at 96 per inch; the sheet is 7.333in wide.
    expect(scale).toBeCloseTo(0.6875, 4);
    expect(scale).toBeGreaterThanOrEqual(0.1);
    expect(scale).toBeLessThanOrEqual(2);
  });

  it("resolves a focal point into a real crop window with the box's aspect", () => {
    const square = { width: 4500, height: 4500 };
    const portraitBox = { width: 1024, height: 1536 };
    const right = resolveCropWindow({ source: square, box: portraitBox, focal: { x: 0.62, y: 0.5 } });
    const left = resolveCropWindow({ source: square, box: portraitBox, focal: { x: 0.1, y: 0.5 } });
    expect(right.height).toBe(1);
    expect(right.width).toBeCloseTo(0.6667, 3);
    expect(right.x).toBeGreaterThan(left.x);
    // Clamped inside the source rather than sampling past the edge.
    expect(left.x).toBe(0);
    expect(right.x + right.width).toBeLessThanOrEqual(1.000001);
  });

  it("moves the crop window vertically for a letterbox box", () => {
    const source = { width: 4500, height: 4500 };
    const box = { width: 224, height: 62 };
    const high = resolveCropWindow({ source, box, focal: { x: 0.5, y: 0.34 } });
    const low = resolveCropWindow({ source, box, focal: { x: 0.5, y: 0.8 } });
    expect(high.width).toBe(1);
    expect(high.height).toBeLessThan(0.3);
    expect(low.y).toBeGreaterThan(high.y);
  });

  it("refuses a focal point on a source with no room to crop at output size", () => {
    const document = compose();
    const result = validateDesignDocument({
      document,
      factValues: requiredFactValues(MAYA_TRUTH),
      // Exactly the logical canvas — how Maya's hero was actually generated.
      sourceDimensions: { "stage0-hero": { width: 1024, height: 1536 } },
    });
    const failure = result.failures.find(
      (item) => item.code === cfg.failureCodes.cropWithoutHeadroom,
    );
    expect(failure?.message).toMatch(/under the 1.25x headroom/);
    expect(failure?.message).toMatch(/300 DPI/);
  });

  it("accepts a source generated with headroom", () => {
    const result = validateDesignDocument({
      document: compose(),
      factValues: requiredFactValues(MAYA_TRUTH),
      sourceDimensions: { "stage0-hero": { width: 4500, height: 4500 } },
    });
    expect(result.failures).toEqual([]);
  });
});

describe("Stage 0 — determinism", () => {
  it("produces a byte-identical document from identical truth", () => {
    expect(JSON.stringify(compose())).toBe(JSON.stringify(compose()));
  });

  it("produces byte-identical html from identical truth", async () => {
    const first = await buildDocumentHtml({ document: compose(), materialPaths: {} });
    const second = await buildDocumentHtml({ document: compose(), materialPaths: {} });
    expect(first.html).toBe(second.html);
  });
});

describe("Stage 0 — renderer swappability", () => {
  it("converts to a Polotno design at print geometry with the crop, mask, and facts intact", () => {
    const document = compose();
    const design = toPolotnoDesign({
      document,
      materialUrls: { "stage0-hero": "file:///hero.png" },
      sourceDimensions: { "stage0-hero": { width: 4500, height: 4500 } },
      fontUrls: { "Source Serif 4": "file:///source-serif-4.woff2" },
    });

    expect(design.width).toBe(2200);
    expect(design.height).toBe(3300);
    expect(design.dpi).toBe(300);
    expect(design.fonts).toEqual([
      { fontFamily: "Source Serif 4", url: "file:///source-serif-4.woff2" },
    ]);

    const children = design.pages[0]!.children;
    const hero = children.find((child) => child.id === "generated-hero")!;
    expect(hero.type).toBe("image");
    expect(hero.cropWidth).toBeCloseTo(0.6667, 3);
    expect(hero.cropX).toBeGreaterThan(0);

    const inset = children.find((child) => child.id === "detail-inset")!;
    expect(String(inset.clipSrc)).toContain("svg");

    const price = children.find((child) => child.id === "price")!;
    expect(String(price.fill)).toContain("linear-gradient");
    expect(price.fontSize).toBeCloseTo(84 * printDimensions(document).scale, 1);

    const panel = children.find((child) => child.id === "offer-panel")!;
    expect(String(panel.fill)).toBe("rgba(252,249,243,0.95)");

    // Copy ownership does not move to the renderer.
    const bindings = (design.custom.studioFactBindings ?? []) as { factId: string }[];
    expect(bindings.map((binding) => binding.factId)).toEqual(
      expect.arrayContaining(["businessName", "cta", "headline", "offerName", "priceDisplay"]),
    );
    const contracts = (design.custom.studioContainerContracts ?? []) as {
      elementId: string;
      requiresContent: boolean;
    }[];
    expect(contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ elementId: "offer-panel", requiresContent: true }),
      ]),
    );
  });

  it("keeps geometry proportional so a renderer swap cannot reflow the composition", () => {
    const document = compose();
    const design = toPolotnoDesign({
      document,
      materialUrls: { "stage0-hero": "file:///hero.png" },
      sourceDimensions: { "stage0-hero": { width: 4500, height: 4500 } },
      fontUrls: { "Source Serif 4": "file:///f.woff2" },
    });
    const scale = printDimensions(document).scale;
    for (const element of document.elements) {
      const child = design.pages[0]!.children.find((item) => item.id === element.id)!;
      expect(Number(child.x)).toBeCloseTo(element.x * scale, 1);
      expect(Number(child.width)).toBeCloseTo(element.width * scale, 1);
    }
  });
});

describe("Stage 0 — the existing QA projection", () => {
  it("projects onto a certified canvas so px-calibrated gates stay valid", () => {
    const spec = toFlyerDesignSpec(compose(), MAYA_TRUTH);
    expect(spec.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });
    expect(spec.layers.some((layer) => layer.id === "offer-panel")).toBe(true);
    expect(spec.layers.some((layer) => layer.id === "generated-hero")).toBe(true);
  });

  it("projects the colour a reader perceives, not an ungradeable alpha fill", () => {
    const spec = toFlyerDesignSpec(compose(), MAYA_TRUTH);
    const panel = spec.layers.find((layer) => layer.id === "offer-panel");
    expect(panel?.type === "shape" && panel.fill).toBe("#f7f2ea");
    const price = spec.layers.find((layer) => layer.id === "price");
    expect(price?.type === "text" && price.color).toBe("#1f3a5f");
  });
});
