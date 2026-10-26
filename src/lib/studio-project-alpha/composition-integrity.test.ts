/**
 * The gates that do not depend on a model having a good day: deterministic
 * composition geometry, deterministic generated-pixel analysis, and text read
 * back out of the pixels.
 */
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deriveCreativeBrief,
  paletteForBrief,
  selectCreativeDirection,
} from "@/lib/studio-design-intelligence";
import { reasonFlyerDesignSpecDeterministic } from "@/lib/studio-design-renderer/reason";
import type {
  FlyerDesignSpec,
  FlyerProjectTruth,
} from "@/lib/studio-design-renderer/types";

import { composeHybridSpec } from "./compose-hybrid";
import {
  checkGeneratedFieldPixels,
  checkHybridComposition,
} from "./composition-checks";
import {
  auditComposedArtifactCarriesFacts,
  auditGeneratedLayerHasNoText,
} from "./pixel-text-audit";

const MUST_INCLUDE =
  "Atelier Noir\nFall collection night\nEditorial ready-to-wear.\n(212) 555-0144\nateliernoir.example\n$180";

function truth(): FlyerProjectTruth {
  const brief = deriveCreativeBrief({
    businessName: "Atelier Noir",
    flyerPurpose: "Fall collection night",
    mustInclude: MUST_INCLUDE,
    materials: "Fashion-forward. Choose for me.",
    intendedUse: "Both print and digital",
    sizeNotes: "",
    cta: "Reserve a seat",
    headline: "Fall collection night",
    offerName: "Fall collection night",
    body: "Editorial ready-to-wear.",
    logoAvailable: false,
    suppliedImagery: false,
    requiredFacts: ["Atelier Noir", "(212) 555-0144", "$180"],
  });
  const palette = paletteForBrief(brief);
  return {
    campaignId: "composition-integrity",
    jobId: "composition-integrity:v2-rtu-flyer",
    dispatchId: "dd:composition-integrity:v2-rtu-flyer",
    skuId: "v2-rtu-flyer",
    fixtureId: "composition-integrity",
    label: "Composition integrity QA",
    outputMode: "customer",
    businessName: "Atelier Noir",
    wordmark: "Atelier Noir",
    descriptor: "",
    headline: "Fall collection night",
    offerName: "Fall collection night",
    priceDisplay: "$180",
    dateWindow: "",
    body: "Editorial ready-to-wear.",
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
    creativeDirection: selectCreativeDirection({ brief, recent: [] }),
  };
}

function composedSpec(): FlyerDesignSpec {
  return composeHybridSpec(reasonFlyerDesignSpecDeterministic(truth()), {
    ok: true,
    relativePath: "data/qa/generated/hybrid-visual-a1.png",
    contentSha256: "abc",
    model: "gpt-image-1",
    prompt: "atmosphere",
    bytes: 120,
  });
}

async function writeImage(
  name: string,
  image: sharp.Sharp,
): Promise<{ repoRoot: string; relativePath: string }> {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "studio-composition-"));
  const relativePath = name;
  writeFileSync(path.join(repoRoot, relativePath), await image.png().toBuffer());
  return { repoRoot, relativePath };
}

describe("deterministic composition geometry", () => {
  it("passes the layout the composer actually produces", () => {
    const result = checkHybridComposition(composedSpec());
    expect(result.findings.map((finding) => finding.code)).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.measured.textLayers).toBeGreaterThan(0);
  });

  it("rejects a type dock that does not sit behind the text", () => {
    const spec = composedSpec();
    const shifted: FlyerDesignSpec = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.id === "offer-panel" ? { ...layer, y: 0, height: 80 } : layer,
      ),
    };
    const codes = checkHybridComposition(shifted).findings.map((f) => f.code);
    expect(codes).toContain("type_dock_does_not_back_text");
  });

  it("rejects a dock that covers the generated visual", () => {
    const spec = composedSpec();
    const swallowed: FlyerDesignSpec = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.id === "offer-panel"
          ? { ...layer, y: 0, height: spec.canvas.heightPx }
          : layer,
      ),
    };
    const codes = checkHybridComposition(swallowed).findings.map((f) => f.code);
    expect(codes).toContain("type_dock_swallows_canvas");
  });

  it("rejects dead space left below the last line of the lockup", () => {
    const spec = composedSpec();
    // Lift the lockup off the bottom of its own dock. Works for every layout
    // family, including the ones welded to the canvas edge.
    const lift = Math.round(spec.canvas.heightPx * 0.25);
    const stretched: FlyerDesignSpec = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.type === "text" ? { ...layer, y: layer.y - lift } : layer,
      ),
    };
    const codes = checkHybridComposition(stretched).findings.map((f) => f.code);
    expect(codes).toContain("dead_space_in_type_dock");
  });

  it("rejects a layer painted over the customer's text", () => {
    const spec = composedSpec();
    const firstText = spec.layers.find((layer) => layer.type === "text")!;
    const obstructed: FlyerDesignSpec = {
      ...spec,
      layers: [
        ...spec.layers,
        {
          type: "shape",
          id: "stray-plate",
          role: "plate",
          x: firstText.x,
          y: firstText.y,
          width: firstText.width,
          height: 60,
          fill: "#000000",
        },
      ],
    };
    const codes = checkHybridComposition(obstructed).findings.map((f) => f.code);
    expect(codes).toContain("text_obstructed_by_layer");
  });

  it("rejects text pushed outside the canvas", () => {
    const spec = composedSpec();
    const clipped: FlyerDesignSpec = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.type === "text" && layer.role === "cta"
          ? { ...layer, y: spec.canvas.heightPx - 4 }
          : layer,
      ),
    };
    const codes = checkHybridComposition(clipped).findings.map((f) => f.code);
    expect(codes).toContain("text_outside_canvas");
  });

  it("rejects a spec with no generated visual layer as not hybrid", () => {
    const spec = reasonFlyerDesignSpecDeterministic(truth());
    const codes = checkHybridComposition(spec).findings.map((f) => f.code);
    expect(codes).toContain("generated_layer_missing");
  });
});

describe("deterministic generated-pixel analysis", () => {
  it("rejects a flat single-tone field without asking a model", async () => {
    const { repoRoot, relativePath } = await writeImage(
      "flat.png",
      sharp({
        create: {
          width: 256,
          height: 384,
          channels: 3,
          background: { r: 60, g: 60, b: 60 },
        },
      }),
    );
    const result = await checkGeneratedFieldPixels({ repoRoot, relativePath });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "generated_field_is_one_tone",
    );
  });

  it("accepts a field with real variation across the whole canvas", async () => {
    const width = 256;
    const height = 384;
    const pixels = Buffer.alloc(width * height * 3);
    for (let index = 0; index < width * height; index += 1) {
      const x = index % width;
      const y = Math.floor(index / width);
      pixels[index * 3] = (x * 7 + y * 3) % 256;
      pixels[index * 3 + 1] = (x * 3 + y * 11) % 256;
      pixels[index * 3 + 2] = (x * 13 + y * 5) % 256;
    }
    const { repoRoot, relativePath } = await writeImage(
      "textured.png",
      sharp(pixels, { raw: { width, height, channels: 3 } }),
    );
    const result = await checkGeneratedFieldPixels({ repoRoot, relativePath });
    expect(result.findings.map((f) => f.code)).toEqual([]);
    expect(result.measured.uniformCells).toBe(0);
  });

  it("rejects a field whose regions are mostly dead canvas", async () => {
    const width = 256;
    const height = 384;
    const pixels = Buffer.alloc(width * height * 3, 40);
    // Only the bottom quarter carries any variation.
    for (let y = Math.floor(height * 0.75); y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 3;
        pixels[index] = (x * 9) % 256;
        pixels[index + 1] = (x * 5 + y) % 256;
        pixels[index + 2] = (y * 7) % 256;
      }
    }
    const { repoRoot, relativePath } = await writeImage(
      "top-dead.png",
      sharp(pixels, { raw: { width, height, channels: 3 } }),
    );
    const result = await checkGeneratedFieldPixels({ repoRoot, relativePath });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "generated_field_dead_regions",
    );
  });
});

describe("pixel text audit", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  function stubReading(payload: { text: string; noTextPresent: boolean }) {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify(payload),
            usage: { input_tokens: 2700, output_tokens: 40 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
  }

  async function pngFixture(): Promise<string> {
    const dir = mkdtempSync(path.join(tmpdir(), "studio-text-audit-"));
    const file = path.join(dir, "artifact.png");
    writeFileSync(
      file,
      await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 3,
          background: { r: 10, g: 20, b: 30 },
        },
      })
        .png()
        .toBuffer(),
    );
    return file;
  }

  it("rejects a generated layer with letters baked into the pixels", async () => {
    stubReading({ text: "GRAND OPENING\n$99", noTextPresent: false });
    const result = await auditGeneratedLayerHasNoText({
      pngAbsolutePath: await pngFixture(),
    });
    expect(result.ok).toBe(false);
    expect(result.findings[0]!.code).toBe("generated_layer_contains_text");
  });

  it("accepts a generated layer the instrument reads as textless", async () => {
    stubReading({ text: "", noTextPresent: true });
    const result = await auditGeneratedLayerHasNoText({
      pngAbsolutePath: await pngFixture(),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a composed artifact whose locked facts are not legible", async () => {
    stubReading({
      text: "Atelier Noir\nFall collection night",
      noTextPresent: false,
    });
    const result = await auditComposedArtifactCarriesFacts({
      pngAbsolutePath: await pngFixture(),
      lockedFacts: ["Atelier Noir", "(212) 555-0144", "$180"],
    });
    expect(result.ok).toBe(false);
    expect(result.findings[0]!.code).toBe(
      "composed_artifact_missing_locked_facts",
    );
    expect(result.findings[0]!.message).toContain("(212) 555-0144");
  });

  it("accepts a composed artifact carrying every locked fact, punctuation aside", async () => {
    stubReading({
      text: "ATELIER NOIR — Fall collection night — 212 555 0144 — ateliernoir.example — $180",
      noTextPresent: false,
    });
    const result = await auditComposedArtifactCarriesFacts({
      pngAbsolutePath: await pngFixture(),
      lockedFacts: [
        "Atelier Noir",
        "(212) 555-0144",
        "ateliernoir.example",
        "$180",
      ],
    });
    expect(result.findings.map((f) => f.code)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("treats an unreadable artifact as a failure, not a clean pass", async () => {
    stubReading({ text: "", noTextPresent: true });
    const result = await auditComposedArtifactCarriesFacts({
      pngAbsolutePath: await pngFixture(),
      lockedFacts: ["Atelier Noir"],
    });
    expect(result.ok).toBe(false);
    expect(result.findings[0]!.code).toBe(
      "composed_artifact_has_no_legible_text",
    );
  });
});

/**
 * The instrument is a model, so it can answer badly: an empty body, prose instead
 * of JSON, truncated JSON, or a shape carrying neither answer. Every one of those
 * is silence, and silence must never read as "the pixels are fine" — that failure
 * mode would let a flyer with a baked-in fake price sail through the one check
 * built to catch it.
 */
describe("pixel text audit fails closed on unusable model output", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  /** Stub the raw response body, bypassing the well-formed JSON helper. */
  function stubRawBody(body: unknown) {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
  }

  async function pngFixture(): Promise<string> {
    const dir = mkdtempSync(path.join(tmpdir(), "studio-text-audit-invalid-"));
    const file = path.join(dir, "artifact.png");
    writeFileSync(
      file,
      await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 3,
          background: { r: 5, g: 5, b: 5 },
        },
      })
        .png()
        .toBuffer(),
    );
    return file;
  }

  const unusable: Array<{ label: string; body: unknown }> = [
    { label: "an empty body", body: { output_text: "" } },
    { label: "no output at all", body: {} },
    {
      label: "prose instead of JSON",
      body: { output_text: "I cannot read this image." },
    },
    {
      label: "truncated JSON",
      body: { output_text: '{"text":"GRAND OPE' },
    },
    {
      label: "unparseable JSON",
      body: { output_text: '{"text": unquoted}' },
    },
    {
      label: "a shape carrying neither answer",
      body: { output_text: '{"confidence":0.9}' },
    },
    {
      label: "an empty transcription without the no-text declaration",
      body: { output_text: '{"text":""}' },
    },
    {
      label: "contradicting itself",
      body: { output_text: '{"text":"SALE","noTextPresent":true}' },
    },
    {
      label: "a non-object JSON value",
      body: { output_text: "{}[]" },
    },
  ];

  for (const { label, body } of unusable) {
    it(`fails the generated-layer audit on ${label}`, async () => {
      stubRawBody(body);
      const result = await auditGeneratedLayerHasNoText({
        pngAbsolutePath: await pngFixture(),
      });
      expect(result.ok).toBe(false);
      expect(result.reading.valid).toBe(false);
      expect(result.reading.invalidReason).toBeTruthy();
      expect(result.findings[0]!.code).toBe("pixel_text_audit_unreadable");
    });

    it(`fails the composed-facts audit on ${label}`, async () => {
      stubRawBody(body);
      const result = await auditComposedArtifactCarriesFacts({
        pngAbsolutePath: await pngFixture(),
        lockedFacts: ["Atelier Noir"],
      });
      expect(result.ok).toBe(false);
      expect(result.reading.valid).toBe(false);
      expect(result.findings[0]!.code).toBe("pixel_text_audit_unreadable");
    });
  }

  it("marks a well-formed answer valid so real readings still pass", async () => {
    stubRawBody({
      output_text: '{"text":"","noTextPresent":true}',
      usage: { input_tokens: 100, output_tokens: 10 },
    });
    const result = await auditGeneratedLayerHasNoText({
      pngAbsolutePath: await pngFixture(),
    });
    expect(result.reading.valid).toBe(true);
    expect(result.reading.reportedNoText).toBe(true);
    expect(result.ok).toBe(true);
  });
});
