/**
 * STUDIO-OPERATING-STATIC-DESIGN-PRODUCTION-TOOL-EVALUATION-1
 * Polotno adapter proof — zero cost, zero license key, no vendor network call.
 *
 * Question this answers: can The Studio's existing flyer truth contract be
 * expressed as a valid Polotno design document, with all eight required
 * capabilities carried as real fields — without adopting the paid SDK?
 *
 * Method: adapt a FlyerDesignSpec-shaped input built from Maya's own facts into
 * Polotno's canonical design format, then validate it with Polotno's own
 * validator (`@polotno/schema`, which is free for production use and whose
 * design format is explicitly open — see node_modules/@polotno/schema/LICENSE.md).
 *
 * What this does NOT prove: the render. `polotno-node` and the Polotno SDK are
 * subscription software and require a license key, so no pixels are produced
 * here. That step is the Owner's decision gate.
 *
 * Run: node scripts/static-design-tool-evaluation-polotno-adapter-proof.mjs
 */

import { validateDesign, normalizeDesign, CURRENT_SCHEMA_VERSION } from "@polotno/schema";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";

const REPO = process.cwd();
const PKG = "studio-operating-static-design-production-tool-evaluation-1";
const OUT = path.join(REPO, "docs", "launch", PKG, "artifacts");
const MAYA_CAMPAIGN = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";

/** Print-correct letter geometry, which the incumbent 1024x1536 canvas cannot express. */
const PAGE = { dpi: 300, widthPx: 2550, heightPx: 3300 };

function mayaFacts() {
  const file = path.join(REPO, "data", "campaigns", `${MAYA_CAMPAIGN}.json`);
  const answers =
    JSON.parse(readFileSync(file, "utf8")).record?.routeMapIntake?.answers ?? {};
  return {
    businessName: "Maya\u2019s Mobile Boutique",
    mustInclude: answers["v2-rtu-flyer:mustInclude"] ?? "",
    intendedUse: answers["v2-rtu-flyer:intendedUse"] ?? "",
    originalHeadline: "Grand Opening",
    revisedHeadline: "Call or visit",
    offerName: "First styling appointment",
    priceDisplay: "$45",
    phone: "(804) 555-0142",
    web: "mayasmobileboutique.example",
  };
}

/**
 * The Studio's existing truth contract, in the shape of
 * src/lib/studio-design-renderer/types.ts FlyerDesignSpec, scaled to print.
 * Layer roles are the repo's own FlyerTextRole / FlyerImageRole / FlyerShapeRole.
 */
function studioFlyerDesignSpec(facts) {
  const S = PAGE.widthPx / 1024; // incumbent layout coordinates -> print canvas
  const at = (x, y, w, h) => ({
    x: Math.round(x * S),
    y: Math.round(y * S),
    width: Math.round(w * S),
    height: Math.round(h * S),
  });
  return {
    specVersion: "flyer-design-spec-1.0.0",
    skuId: "v2-rtu-flyer",
    canvas: { widthPx: PAGE.widthPx, heightPx: PAGE.heightPx },
    background: { color: "#0b1420" },
    colors: {
      primary: "#1f3a5f",
      secondary: "#c9a227",
      background: "#0b1420",
      text: "#f6f1e6",
      muted: "#5b6c82",
    },
    reasoningMode: "deterministic_constrained",
    creativeDirection: {
      intelligenceVersion: "design-intelligence-1",
      routeId: "image_plus_renderer",
      layoutFamilyId: "type_led_premium",
      paletteFamilyId: "deep_evening",
      typeSystemId: "source_serif_editorial",
      geometryId: "lower_third_dock",
    },
    outputFormats: ["png", "pdf"],
    materials: [
      { materialId: "hybrid-generated-visual", relativePath: "generated/hero.png" },
    ],
    layers: [
      {
        type: "image",
        id: "generated-hero",
        role: "hero",
        materialId: "hybrid-generated-visual",
        fit: "cover",
        // Focal intent the incumbent composer has no field for:
        focal: { x: 0.78, y: 0.5 },
        ...at(0, 0, 1024, 1536),
      },
      {
        type: "shape",
        id: "legibility-scrim",
        role: "plate",
        // Alpha gradient the incumbent shape layer cannot express:
        gradient: "linear-gradient(180deg,rgba(11,20,32,0) 38%,rgba(11,20,32,0.93) 90%)",
        ...at(0, 0, 1024, 1536),
      },
      {
        type: "text",
        id: "wordmark",
        role: "wordmark",
        text: facts.businessName,
        fontSizePx: 34,
        weight: 600,
        trackingEm: 0.14,
        uppercase: true,
        color: "#f6f1e6",
        ...at(72, 92, 620, 64),
      },
      {
        type: "text",
        id: "headline",
        role: "headline",
        text: facts.revisedHeadline,
        fontSizePx: 104,
        weight: 700,
        trackingEm: -0.02,
        color: "#ffffff",
        ...at(72, 852, 880, 130),
      },
      {
        type: "shape",
        id: "offer-panel",
        role: "plate",
        fillRgba: "rgba(255,252,246,0.94)",
        cornerRadiusPx: 6,
        ...at(72, 1032, 880, 250),
      },
      {
        type: "text",
        id: "offer-name",
        role: "offer",
        text: facts.offerName,
        fontSizePx: 38,
        weight: 600,
        color: "#1f3a5f",
        ...at(112, 1064, 560, 60),
      },
      {
        type: "text",
        id: "price",
        role: "price",
        text: facts.priceDisplay,
        fontSizePx: 84,
        weight: 700,
        gradient: "linear-gradient(180deg,#1f3a5f 0%,#3f6ea8 100%)",
        align: "right",
        ...at(700, 1052, 220, 96),
      },
      {
        type: "text",
        id: "dates",
        role: "dates",
        text: facts.originalHeadline,
        fontSizePx: 30,
        weight: 400,
        trackingEm: 0.05,
        uppercase: true,
        color: "#5b6c82",
        ...at(112, 1160, 560, 52),
      },
      {
        type: "image",
        id: "detail-inset",
        role: "hero",
        materialId: "hybrid-generated-visual",
        fit: "cover",
        focal: { x: 0.78, y: 0.5 },
        maskShape: "angled-quad",
        ...at(712, 1168, 200, 96),
      },
      {
        type: "text",
        id: "contact",
        role: "contact_phone",
        text: `Call ${facts.phone}\n${facts.web}`,
        fontSizePx: 34,
        weight: 600,
        color: "#f6f1e6",
        ...at(72, 1372, 880, 96),
      },
    ],
  };
}

const ANGLED_QUAD_MASK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<polygon points="14,0 100,0 86,100 0,100" fill="black"/></svg>',
  );

/**
 * The adapter under evaluation: FlyerDesignSpec -> Polotno design document.
 * Every capability the Owner asked about must land on a real Polotno field.
 */
function toPolotnoDesign(spec, fontUrl) {
  const mapping = [];
  const children = [];

  for (const layer of spec.layers) {
    const base = {
      id: layer.id,
      name: layer.role,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: 0,
    };

    if (layer.type === "image") {
      const el = {
        ...base,
        type: "image",
        src: `file://${path.join(OUT, "hero-source-1600.png").replace(/\\/g, "/")}`,
      };
      if (layer.focal) {
        // Polotno crop rect is a fraction of the SOURCE image, so a focal point
        // becomes a real crop window rather than a CSS hint.
        const visible = 0.66;
        el.cropX = Math.max(0, Math.min(1 - visible, layer.focal.x - visible / 2));
        el.cropY = Math.max(0, Math.min(1 - visible, layer.focal.y - visible / 2));
        el.cropWidth = visible;
        el.cropHeight = visible;
        mapping.push({
          capability: "real image crop and focal positioning",
          layer: layer.id,
          polotnoFields: ["cropX", "cropY", "cropWidth", "cropHeight"],
        });
      }
      if (layer.maskShape) {
        el.clipSrc = ANGLED_QUAD_MASK;
        mapping.push({
          capability: "masks / clipping",
          layer: layer.id,
          polotnoFields: ["clipSrc"],
        });
      }
      children.push(el);
      continue;
    }

    if (layer.type === "shape") {
      const el = {
        ...base,
        type: "figure",
        subType: "rect",
        fill: layer.gradient ?? layer.fillRgba ?? spec.colors.primary,
        cornerRadius: layer.cornerRadiusPx ?? 0,
        strokeWidth: 0,
      };
      if (layer.gradient) {
        mapping.push({
          capability: "gradients",
          layer: layer.id,
          polotnoFields: ["fill (CSS linear-gradient string)"],
        });
      }
      if (layer.fillRgba) {
        mapping.push({
          capability: "transparency / layering",
          layer: layer.id,
          polotnoFields: ["fill (rgba)", "paint order in children[]"],
        });
      }
      children.push(el);
      continue;
    }

    const el = {
      ...base,
      type: "text",
      text: layer.uppercase ? layer.text.toUpperCase() : layer.text,
      fontFamily: "Source Serif 4",
      fontSize: layer.fontSizePx,
      fontWeight: String(layer.weight),
      letterSpacing: layer.trackingEm ?? 0,
      lineHeight: 1.1,
      align: layer.align ?? "left",
      fill: layer.gradient ?? layer.color,
    };
    mapping.push({
      capability: "exact fact placement",
      layer: layer.id,
      polotnoFields: ["x", "y", "width", "height", "align"],
      fact: layer.text,
    });
    if (layer.gradient) {
      mapping.push({
        capability: "gradients",
        layer: layer.id,
        polotnoFields: ["fill (CSS linear-gradient string on text)"],
      });
    }
    children.push(el);
  }

  const design = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    width: spec.canvas.widthPx,
    height: spec.canvas.heightPx,
    unit: "px",
    dpi: PAGE.dpi,
    // Deterministic font: travels with the document, not resolved from the host OS.
    fonts: [{ fontFamily: "Source Serif 4", url: fontUrl }],
    pages: [{ id: "flyer-page-1", children, background: spec.background.color }],
    custom: {
      studioTruth: {
        specVersion: spec.specVersion,
        skuId: spec.skuId,
        creativeDirection: spec.creativeDirection,
      },
    },
  };
  mapping.push({
    capability: "embedded deterministic fonts",
    layer: "(document)",
    polotnoFields: ["fonts[].fontFamily", "fonts[].url"],
  });
  mapping.push({
    capability: "print-quality export geometry",
    layer: "(document)",
    polotnoFields: ["width", "height", "dpi"],
    detail: `${spec.canvas.widthPx}x${spec.canvas.heightPx} @ ${PAGE.dpi}dpi = ${(
      spec.canvas.widthPx / PAGE.dpi
    ).toFixed(2)}in x ${(spec.canvas.heightPx / PAGE.dpi).toFixed(2)}in`,
  });
  mapping.push({
    capability: "flexible typography and geometry",
    layer: "(text elements)",
    polotnoFields: ["fontSize", "fontWeight", "letterSpacing", "lineHeight", "align", "rotation"],
  });
  return { design, mapping };
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const facts = mayaFacts();
  const spec = studioFlyerDesignSpec(facts);
  const fontUrl =
    "file:///" +
    path
      .join(REPO, "node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2")
      .replace(/\\/g, "/");

  const { design, mapping } = toPolotnoDesign(spec, fontUrl);

  // Polotno's own validator, canonical mode (rejects unknown keys).
  const canonical = validateDesign(design, { mode: "canonical" });
  const lenient = validateDesign(design, { mode: "lenient" });
  let normalized = null;
  let normalizeError = null;
  try {
    normalized = normalizeDesign(design);
  } catch (err) {
    normalizeError = String(err?.message ?? err);
  }

  // Negative control: the validator must reject a document The Studio should never
  // ship. Without this, "valid: true" above would prove nothing.
  const negatives = [
    {
      name: "unknown element field",
      doc: structuredClone(design),
      mutate: (d) => {
        d.pages[0].children[0].studioMadeThisUp = "focal";
      },
    },
    {
      name: "text element with no text",
      doc: structuredClone(design),
      mutate: (d) => {
        const t = d.pages[0].children.find((c) => c.type === "text");
        t.text = 42;
      },
    },
    {
      name: "unknown element type",
      doc: structuredClone(design),
      mutate: (d) => {
        d.pages[0].children.push({ type: "offer-plate", x: 0, y: 0, width: 10, height: 10 });
      },
    },
  ].map((n) => {
    n.mutate(n.doc);
    const r = validateDesign(n.doc, { mode: "canonical" });
    return {
      case: n.name,
      rejected: r.valid === false,
      firstError: (r.errors ?? [])[0]
        ? JSON.stringify((r.errors ?? [])[0]).slice(0, 200)
        : null,
    };
  });

  const capabilities = [
    "embedded deterministic fonts",
    "real image crop and focal positioning",
    "transparency / layering",
    "masks / clipping",
    "gradients",
    "flexible typography and geometry",
    "exact fact placement",
    "print-quality export geometry",
  ];
  const covered = capabilities.map((c) => ({
    capability: c,
    expressedBy: mapping.filter((m) => m.capability === c).map((m) => m.polotnoFields).flat(),
    covered: mapping.some((m) => m.capability === c),
  }));

  const factsOnPage = design.pages[0].children
    .filter((c) => c.type === "text")
    .map((c) => c.text);

  const result = {
    package: PKG,
    polotnoSchemaVersion: CURRENT_SCHEMA_VERSION,
    schemaPackageLicense:
      "free for production, no time limit, design format explicitly open (node_modules/@polotno/schema/LICENSE.md)",
    studioTruthContractPreserved: {
      specVersion: spec.specVersion,
      layerCount: spec.layers.length,
      carriedInPolotnoDocument: "custom.studioTruth",
    },
    validation: {
      validator: "@polotno/schema validateDesign",
      canonicalMode: { valid: canonical.valid, errors: canonical.errors ?? [] },
      lenientMode: { valid: lenient.valid, errors: lenient.errors ?? [] },
      normalizeDesign: normalizeError ? `FAILED: ${normalizeError}` : "ok",
      normalizedElementCount: normalized?.pages?.[0]?.children?.length ?? null,
      negativeControls: negatives,
      negativeControlsAllRejected: negatives.every((n) => n.rejected),
    },
    capabilityCoverage: covered,
    everyFactOnThePage: factsOnPage,
    printGeometry: {
      widthPx: design.width,
      heightPx: design.height,
      dpi: design.dpi,
      inches: `${(design.width / design.dpi).toFixed(2)} x ${(design.height / design.dpi).toFixed(2)}`,
      incumbentComparison: "1024x1536 @1x = 120.5 ppi on an 8.5in page",
    },
    renderGate: {
      blocked: true,
      reason:
        "Rendering requires the Polotno SDK / polotno-node, which is subscription software " +
        "and refuses to run without a license key. The 60-day trial key is dev/staging only " +
        "and cannot be used in production, including internal-only tools.",
      whatIsNeeded: "Owner obtains a 60-day trial key at polotno.com/cabinet",
      paidCommitmentIfAdopted: "USD 899/month or 9,990/year, one domain / one brand family",
    },
  };

  writeFileSync(
    path.join(OUT, "polotno-adapter-proof.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(OUT, "polotno-design-from-studio-truth.json"),
    `${JSON.stringify(design, null, 2)}\n`,
    "utf8",
  );

  console.log("\n=== polotno adapter proof ===");
  console.log("polotno schemaVersion :", CURRENT_SCHEMA_VERSION);
  console.log("canonical validation  :", JSON.stringify(result.validation.canonicalMode));
  console.log("lenient validation    :", JSON.stringify(result.validation.lenientMode));
  console.log("normalizeDesign       :", result.validation.normalizeDesign);
  for (const n of negatives) {
    console.log(`negative control      : ${n.rejected ? "rejected" : "ACCEPTED (bad)"} — ${n.case}`);
  }
  console.log("elements              :", result.validation.normalizedElementCount);
  console.log("print geometry        :", result.printGeometry.inches, "in @", design.dpi, "dpi");
  for (const c of covered) {
    console.log(c.covered ? "  [ok]  " : "  [GAP] ", c.capability, "->", c.expressedBy.join(", "));
  }
  console.log("render gate           :", result.renderGate.reason.slice(0, 80), "...");
  console.log("\nartifacts:", path.relative(REPO, OUT));
}

main();
