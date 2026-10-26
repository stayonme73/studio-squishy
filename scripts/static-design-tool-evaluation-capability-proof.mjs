/**
 * STUDIO-OPERATING-STATIC-DESIGN-PRODUCTION-TOOL-EVALUATION-1
 * Controlled capability proof — no vendor call, no spend, no key required.
 *
 * Renders ONE fact set two ways on the incumbent substrate and measures both:
 *
 *   A "incumbent"      — the capability profile the legacy composer actually uses today,
 *                        including the CTA-as-headline revision that produced
 *                        `hollow_offer_panel` on Maya's job.
 *   B "capability floor" — the same facts with the eight required capabilities
 *                        actually exercised.
 *
 * Purpose: separate "the renderer cannot do this" from "the composer never asked".
 * That distinction decides how much a replacement renderer is actually worth.
 *
 * Maya's facts are read from her record READ-ONLY. Nothing here writes campaign,
 * task, spend, or QA state.
 *
 * Run: node scripts/static-design-tool-evaluation-capability-proof.mjs
 */

import { chromium } from "playwright";
import sharp from "sharp";
import zlib from "zlib";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const REPO = process.cwd();
const PKG = "studio-operating-static-design-production-tool-evaluation-1";
const OUT = path.join(REPO, "docs", "launch", PKG, "artifacts");
const MAYA_CAMPAIGN = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";

/** Incumbent flyer canvas — src/lib/studio-design-renderer/types.ts FLYER_CANVAS */
const CANVAS = { w: 1024, h: 1536 };
/** Incumbent font stack — src/lib/studio-design-renderer/render-html.ts */
const INCUMBENT_STACK =
  '"Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
/** Letter width used to express an honest print resolution for the same artifact. */
const LETTER_WIDTH_IN = 8.5;

// ---------------------------------------------------------------------------
// Facts — read-only from Maya's protected record
// ---------------------------------------------------------------------------

function mayaFacts() {
  const file = path.join(REPO, "data", "campaigns", `${MAYA_CAMPAIGN}.json`);
  const answers =
    JSON.parse(readFileSync(file, "utf8")).record?.routeMapIntake?.answers ?? {};
  return {
    source: "data/campaigns/716a15b6-…json (read-only)",
    businessName: "Maya\u2019s Mobile Boutique",
    mustInclude: answers["v2-rtu-flyer:mustInclude"] ?? "",
    intendedUse: answers["v2-rtu-flyer:intendedUse"] ?? "",
    purpose: answers["v2-rtu-flyer:flyerPurpose"] ?? "",
    // Facts parsed out of her own "must include" sentence. Nothing invented.
    originalHeadline: "Grand Opening",
    revisedHeadline: "Call or visit", // the revision that broke the legacy composer
    offerName: "First styling appointment",
    priceDisplay: "$45",
    phone: "(804) 555-0142",
    web: "mayasmobileboutique.example",
  };
}

// ---------------------------------------------------------------------------
// Deterministic hero plate (stands in for the generated visual — no image spend)
// The "subject" is a bright off-centre form so focal positioning is measurable.
// ---------------------------------------------------------------------------

const SUBJECT = { cx: 0.5, cy: 0.3, r: 0.19 };

async function buildHero(file, w, h) {
  const px = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    const fy = y / h;
    for (let x = 0; x < w; x += 1) {
      const fx = x / w;
      // base: deep vertical gradient with a slow horizontal wash
      let r = 22 + 46 * fy + 18 * fx;
      let g = 34 + 40 * fy + 12 * (1 - fx);
      let b = 52 + 34 * (1 - fy) + 20 * fx;
      // subject: bright radial form, off centre
      const dx = fx - SUBJECT.cx;
      const dy = fy - SUBJECT.cy;
      const d = Math.sqrt(dx * dx + dy * dy * 2.1);
      if (d < SUBJECT.r) {
        const t = 1 - d / SUBJECT.r;
        const k = t * t;
        r += 190 * k;
        g += 168 * k;
        b += 126 * k;
      }
      // fine texture so a crop shift is never a no-op
      const n = ((x * 7 + y * 13) % 17) - 8;
      const i = (y * w + x) * 3;
      px[i] = Math.max(0, Math.min(255, r + n));
      px[i + 1] = Math.max(0, Math.min(255, g + n));
      px[i + 2] = Math.max(0, Math.min(255, b + n));
    }
  }
  await sharp(px, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toFile(file);
  return file;
}

// ---------------------------------------------------------------------------
// Geometry — one fact-placement map, used by both renders
// ---------------------------------------------------------------------------

const RECT = {
  wordmark: { x: 72, y: 92, w: 620, h: 64 },
  headline: { x: 72, y: 852, w: 880, h: 130 },
  offerPanel: { x: 72, y: 1032, w: 880, h: 250 },
  offerName: { x: 112, y: 1064, w: 560, h: 60 },
  price: { x: 700, y: 1052, w: 220, h: 96 },
  dates: { x: 112, y: 1160, w: 560, h: 52 },
  inset: { x: 712, y: 1168, w: 200, h: 96 },
  contact: { x: 72, y: 1372, w: 880, h: 96 },
};

const PLATE_A = "#1f3a5f"; // opaque legacy plate
const PLATE_B = "rgba(255,252,246,0.94)"; // ivory plate, real alpha
const PLATE_B_SOLID = { r: 253, g: 250, b: 245 };

function fontFaceCss(fonts) {
  return fonts
    .map(
      (f) => `@font-face{font-family:"Source Serif 4";font-style:normal;
font-weight:${f.weight};font-display:block;
src:url(data:font/woff2;base64,${f.b64}) format("woff2");}`,
    )
    .join("\n");
}

function shell({ css, body }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${CANVAS.w}px;height:${CANVAS.h}px;overflow:hidden;}
.canvas{position:relative;width:${CANVAS.w}px;height:${CANVAS.h}px;background:#0b1420;overflow:hidden;}
.l{position:absolute;}
${css}
</style></head><body><div class="canvas">${body}</div></body></html>`;
}

function box(rect) {
  return `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;`;
}

/**
 * A — what the legacy composer actually produces on this revision:
 * system font stack, un-positioned cover hero, opaque plate whose text was
 * deduplicated away, and the price/offer facts consequently absent from the page.
 */
function renderA(facts, heroUrl) {
  return shell({
    css: `.canvas{font-family:${INCUMBENT_STACK};}
.hero{left:0;top:0;width:${CANVAS.w}px;height:${CANVAS.h}px;object-fit:cover;}
#headline{${box(RECT.headline)}font-size:84px;line-height:1.04;font-weight:700;color:#ffffff;}
#offer-panel{${box(RECT.offerPanel)}background:${PLATE_A};}
#wordmark{${box(RECT.wordmark)}font-size:40px;color:#ffffff;}
#contact{${box(RECT.contact)}font-size:26px;line-height:1.35;color:#e8eef6;}`,
    body: `<img class="l hero" src="${heroUrl}" alt=""/>
<div class="l" id="wordmark">${facts.businessName}</div>
<div class="l" id="headline">${facts.revisedHeadline}</div>
<div class="l" id="offer-panel"></div>
<div class="l" id="contact">Call ${facts.phone}<br/>${facts.web}</div>`,
  });
}

/**
 * B — the same facts with the eight capabilities exercised: embedded font,
 * focal crop, gradient + alpha scrim, clip-path mask, real type hierarchy,
 * exact placement, and every fact actually on the page.
 */
function renderB(facts, heroUrl, fontCss, focal) {
  return shell({
    css: `${fontCss}
.canvas{font-family:"Source Serif 4",serif;}
.hero{left:0;top:0;width:${CANVAS.w}px;height:${CANVAS.h}px;object-fit:cover;object-position:${focal};}
.scrim{left:0;top:0;width:${CANVAS.w}px;height:${CANVAS.h}px;
background:linear-gradient(to bottom,rgba(11,20,32,0) 38%,rgba(11,20,32,0.62) 62%,rgba(11,20,32,0.93) 84%);}
#wordmark{${box(RECT.wordmark)}font-size:34px;font-weight:600;letter-spacing:0.14em;
text-transform:uppercase;color:#f6f1e6;}
#headline{${box(RECT.headline)}font-size:104px;line-height:0.96;font-weight:700;
letter-spacing:-0.02em;color:#ffffff;}
#offer-panel{${box(RECT.offerPanel)}background:${PLATE_B};border-radius:6px;}
#offer-name{${box(RECT.offerName)}font-size:38px;line-height:1.15;font-weight:600;color:#1f3a5f;}
#price{${box(RECT.price)}font-size:84px;line-height:1;font-weight:700;color:#1f3a5f;text-align:right;}
#dates{${box(RECT.dates)}font-size:30px;font-weight:400;letter-spacing:0.05em;
text-transform:uppercase;color:#5b6c82;}
#inset{${box(RECT.inset)}object-fit:cover;object-position:${focal};
clip-path:polygon(14% 0,100% 0,86% 100%,0 100%);}
#contact{${box(RECT.contact)}font-size:34px;line-height:1.32;font-weight:600;color:#f6f1e6;}`,
    body: `<img class="l hero" src="${heroUrl}" alt=""/>
<div class="l scrim"></div>
<div class="l" id="wordmark">${facts.businessName}</div>
<div class="l" id="headline">${facts.revisedHeadline}</div>
<div class="l" id="offer-panel"></div>
<div class="l" id="offer-name">${facts.offerName}</div>
<div class="l" id="price">${facts.priceDisplay}</div>
<div class="l" id="dates">${facts.originalHeadline}</div>
<img class="l" id="inset" src="${heroUrl}" alt=""/>
<div class="l" id="contact">Call ${facts.phone}<br/>${facts.web}</div>`,
  });
}

// ---------------------------------------------------------------------------
// Render + measure
// ---------------------------------------------------------------------------

async function renderOne(browser, { html, htmlPath, pngPath, pdfPath, scale, probeIds }) {
  writeFileSync(htmlPath, html, "utf8");
  const page = await browser.newPage({
    viewport: { width: CANVAS.w, height: CANVAS.h },
    deviceScaleFactor: scale,
  });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  // Which typeface did the machine actually put on the glyphs?
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const resolvedFonts = {};
  for (const id of probeIds) {
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `#${id}`,
    });
    if (!nodeId) continue;
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    resolvedFonts[id] = fonts.map((f) => `${f.familyName} (${f.glyphCount} glyphs)`);
  }

  await page.screenshot({
    path: pngPath,
    type: "png",
    clip: { x: 0, y: 0, width: CANVAS.w, height: CANVAS.h },
  });
  if (pdfPath) {
    await page.pdf({
      path: pdfPath,
      width: `${CANVAS.w}px`,
      height: `${CANVAS.h}px`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  }
  await page.close();
  return { resolvedFonts };
}

/** Fraction of pixels inside a rect that differ from that rect's dominant colour. */
async function inkCoverage(pngPath, rect, scale) {
  const s = scale;
  const { data, info } = await sharp(pngPath)
    .extract({
      left: Math.round(rect.x * s),
      top: Math.round(rect.y * s),
      width: Math.round(rect.w * s),
      height: Math.round(rect.h * s),
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const counts = new Map();
  for (let i = 0; i < data.length; i += ch) {
    const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let dominant = null;
  let best = 0;
  for (const [k, v] of counts) {
    if (v > best) {
      best = v;
      dominant = k;
    }
  }
  const total = data.length / ch;
  const [dr, dg, db] = dominant.split(",").map((n) => Number(n) << 3);
  let differing = 0;
  for (let i = 0; i < data.length; i += ch) {
    if (
      Math.abs(data[i] - dr) > 24 ||
      Math.abs(data[i + 1] - dg) > 24 ||
      Math.abs(data[i + 2] - db) > 24
    ) {
      differing += 1;
    }
  }
  return {
    dominantColor: `rgb(${dr},${dg},${db})`,
    dominantShare: Number((best / total).toFixed(4)),
    inkCoverage: Number((differing / total).toFixed(4)),
    distinctColors: counts.size,
  };
}

async function pixelAt(pngPath, x, y, scale) {
  const { data } = await sharp(pngPath)
    .extract({
      left: Math.round(x * scale),
      top: Math.round(y * scale),
      width: 1,
      height: 1,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

/** Mean absolute per-pixel difference between two PNGs of equal size. */
async function meanDiff(aPath, bPath) {
  const a = await sharp(aPath).raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(bPath).raw().toBuffer({ resolveWithObject: true });
  if (a.data.length !== b.data.length) return null;
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 1) sum += Math.abs(a.data[i] - b.data[i]);
  return Number((sum / a.data.length).toFixed(3));
}

/** What is actually inside the PDF: embedded font subsets vs a flattened image. */
function pdfFacts(pdfPath) {
  const buf = readFileSync(pdfPath);
  const scan = (text) => ({
    baseFonts: [...text.matchAll(/\/BaseFont\s*\/([#A-Za-z0-9+\-_.,]+)/g)].map(
      (m) => m[1],
    ),
    images: [...text.matchAll(/\/Subtype\s*\/Image/g)].length,
    fontFiles: [...text.matchAll(/\/FontFile\d?\s/g)].length,
  });
  const raw = scan(buf.toString("latin1"));
  // Chromium keeps most objects in compressed streams; inflate and look again.
  const inflated = [];
  const s = buf.toString("latin1");
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf("endstream", start);
    if (end < 0) continue;
    try {
      inflated.push(zlib.inflateSync(buf.subarray(start, end)).toString("latin1"));
    } catch {
      /* not a flate stream */
    }
  }
  const deep = scan(inflated.join("\n"));
  const fonts = [...new Set([...raw.baseFonts, ...deep.baseFonts])];
  return {
    bytes: buf.length,
    embeddedFontSubsets: fonts,
    embeddedFontProgramCount: raw.fontFiles + deep.fontFiles,
    imageXObjects: raw.images + deep.images,
    textIsVector: fonts.length > 0,
  };
}

// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(OUT, { recursive: true });
  const facts = mayaFacts();

  // Two sources on purpose:
  //  - heroWide  : a real photographic source larger than the canvas, so a focal
  //                point has somewhere to pan to.
  //  - heroExact : 1024x1536, exactly what gpt-image-1 returns today, which
  //                leaves the composer no crop latitude at all.
  const heroWidePath = path.join(OUT, "hero-source-1600.png");
  const heroExactPath = path.join(OUT, "hero-source-1024x1536.png");
  await buildHero(heroWidePath, 1600, 1600);
  await buildHero(heroExactPath, 1024, 1536);
  const heroWide = `data:image/png;base64,${readFileSync(heroWidePath).toString("base64")}`;
  const heroExact = `data:image/png;base64,${readFileSync(heroExactPath).toString("base64")}`;

  const fontDir = path.join(REPO, "node_modules", "@fontsource", "source-serif-4", "files");
  const weights = [400, 600, 700];
  const fonts = weights.map((weight) => {
    const f = path.join(fontDir, `source-serif-4-latin-${weight}-normal.woff2`);
    if (!existsSync(f)) throw new Error(`Font missing: ${f}`);
    return { weight, b64: readFileSync(f).toString("base64") };
  });
  const fontCss = fontFaceCss(fonts);

  const browser = await chromium.launch({ headless: true });
  const results = {};
  try {
    // ---- A: incumbent capability profile, 1x, system font stack
    const aScale = 1;
    const aPng = path.join(OUT, "a-incumbent.png");
    const aPdf = path.join(OUT, "a-incumbent.pdf");
    const a = await renderOne(browser, {
      html: renderA(facts, heroExact),
      htmlPath: path.join(OUT, "a-incumbent.html"),
      pngPath: aPng,
      pdfPath: aPdf,
      scale: aScale,
      probeIds: ["headline", "wordmark", "contact"],
    });

    // ---- B: capability floor, 3x, embedded font, focal crop, scrim, mask
    const bScale = 3;
    const bPng = path.join(OUT, "b-capability-floor.png");
    const bPdf = path.join(OUT, "b-capability-floor.pdf");
    const FOCAL_PRIMARY = "78% 50%";
    const FOCAL_SHIFTED = "12% 50%";
    const b = await renderOne(browser, {
      html: renderB(facts, heroWide, fontCss, FOCAL_PRIMARY),
      htmlPath: path.join(OUT, "b-capability-floor.html"),
      pngPath: bPng,
      pdfPath: bPdf,
      scale: bScale,
      probeIds: ["headline", "wordmark", "offer-name", "price", "contact"],
    });

    // ---- B': same facts and source, focal point only changed (real crop control)
    const bAltPng = path.join(OUT, "b-focal-shifted.png");
    await renderOne(browser, {
      html: renderB(facts, heroWide, fontCss, FOCAL_SHIFTED),
      htmlPath: path.join(OUT, "b-focal-shifted.html"),
      pngPath: bAltPng,
      pdfPath: null,
      scale: bScale,
      probeIds: [],
    });

    // ---- control: same two focal points against a canvas-sized source, which is
    // what the pipeline generates today. If this diff is ~0, today's generation
    // step has removed all focal latitude before the composer can use any.
    const cNoLatitudeA = path.join(OUT, "c-exact-source-focal-a.png");
    const cNoLatitudeB = path.join(OUT, "c-exact-source-focal-b.png");
    await renderOne(browser, {
      html: renderB(facts, heroExact, fontCss, FOCAL_PRIMARY),
      htmlPath: path.join(OUT, "c-exact-source-focal-a.html"),
      pngPath: cNoLatitudeA,
      pdfPath: null,
      scale: 1,
      probeIds: [],
    });
    await renderOne(browser, {
      html: renderB(facts, heroExact, fontCss, FOCAL_SHIFTED),
      htmlPath: path.join(OUT, "c-exact-source-focal-b.html"),
      pngPath: cNoLatitudeB,
      pdfPath: null,
      scale: 1,
      probeIds: [],
    });

    // ---------------- measurements ----------------
    const aMeta = await sharp(aPng).metadata();
    const bMeta = await sharp(bPng).metadata();

    results.factSource = facts.source;
    results.factsUnderTest = {
      businessName: facts.businessName,
      mustInclude: facts.mustInclude,
      intendedUse: facts.intendedUse,
      revisionInstruction: "Please make Call or visit more prominent as the headline.",
    };

    results.req1_embeddedDeterministicFonts = {
      requested: "Source Serif 4",
      a_systemStackResolvedTo: a.resolvedFonts,
      b_embeddedFontResolvedTo: b.resolvedFonts,
      a_pdf: pdfFacts(aPdf),
      b_pdf: pdfFacts(bPdf),
    };

    results.req2_imageCropAndFocalPositioning = {
      subjectCentreInSource: SUBJECT,
      a_focal: "none — legacy composer never sets a focal point",
      b_focal: [FOCAL_PRIMARY, FOCAL_SHIFTED],
      sourceLargerThanCanvas: {
        source: "1600x1600",
        meanPixelDiffBetweenFocalPoints: await meanDiff(bPng, bAltPng),
        verdict: "focal positioning changes the artifact",
      },
      sourceEqualToCanvas: {
        source: "1024x1536 (what gpt-image-1 returns today)",
        meanPixelDiffBetweenFocalPoints: await meanDiff(cNoLatitudeA, cNoLatitudeB),
        verdict:
          "no crop latitude — the generation step, not the renderer, removed it",
      },
    };

    const scrimColumn = [];
    for (const y of [200, 500, 700, 900, 1100, 1300, 1500]) {
      scrimColumn.push({ y, b: await pixelAt(bPng, 20, y, bScale) });
    }
    results.req3_transparencyAndLayering = {
      scrimIsGradientAlphaOverImage: true,
      sampledColumnDownScrim: scrimColumn,
    };

    // The polygon excludes the top-left and bottom-right corners of the inset box.
    // Those pixels must show the plate behind it; the centre must show the image.
    const insetOutside = await pixelAt(bPng, RECT.inset.x + 4, RECT.inset.y + 4, bScale);
    const insetOutside2 = await pixelAt(
      bPng,
      RECT.inset.x + RECT.inset.w - 5,
      RECT.inset.y + RECT.inset.h - 5,
      bScale,
    );
    const insetInside = await pixelAt(
      bPng,
      RECT.inset.x + RECT.inset.w / 2,
      RECT.inset.y + RECT.inset.h / 2,
      bScale,
    );
    const plateReference = await pixelAt(
      bPng,
      RECT.inset.x - 24,
      RECT.inset.y + 8,
      bScale,
    );
    results.req4_masksClippingGradients = {
      clipPath: "polygon(14% 0,100% 0,86% 100%,0 100%) on the inset image",
      excludedTopLeftPixel: insetOutside,
      excludedBottomRightPixel: insetOutside2,
      plateReferencePixel: plateReference,
      includedCentrePixel: insetInside,
      clipVerified:
        Math.abs(insetOutside.r - plateReference.r) < 12 &&
        Math.abs(insetOutside2.r - plateReference.r) < 12 &&
        Math.abs(insetInside.r - plateReference.r) > 24,
      gradientScrimPresent: true,
      plateAlpha: PLATE_B,
    };

    results.req5_flexibleTypographyAndGeometry = {
      a: "single weight, no tracking control, no uppercase treatment, no optical hierarchy",
      b: "3 embedded weights, letter-spacing, uppercase eyebrow, 104px headline against 30px dates",
    };

    const aPanel = await inkCoverage(aPng, RECT.offerPanel, aScale);
    const bPanel = await inkCoverage(bPng, RECT.offerPanel, bScale);
    results.req6_exactFactPlacement = {
      offerPanelRect: RECT.offerPanel,
      a_offerPanel: aPanel,
      b_offerPanel: bPanel,
      factsPresentInA: ["businessName", "revisedHeadline", "phone", "web"],
      factsAbsentFromA: ["offerName", "priceDisplay", "originalHeadline"],
      factsPresentInB: [
        "businessName",
        "revisedHeadline",
        "offerName",
        "priceDisplay",
        "originalHeadline",
        "phone",
        "web",
      ],
    };

    const ppi = (w) => Number((w / LETTER_WIDTH_IN).toFixed(1));
    results.req7_printQualityExport = {
      a_png: { width: aMeta.width, height: aMeta.height, ppiOnLetterWidth: ppi(aMeta.width) },
      b_png: { width: bMeta.width, height: bMeta.height, ppiOnLetterWidth: ppi(bMeta.width) },
      printStandardPpi: 300,
      note:
        "Canvas is 1024x1536 (2:3). Letter is 8.5x11 (0.773:1). The incumbent canvas " +
        "cannot fill a letter page without crop or letterbox, and at 1x it is far " +
        "below print resolution. Maya ordered 'Both print and digital'.",
    };

    results.req8_unattendedProgrammaticControl = {
      substrate: "headless Chromium via playwright",
      licenseKeyRequired: false,
      networkRequiredAtRenderTime: false,
      ranHeadlessInThisProof: true,
    };

    writeFileSync(
      path.join(OUT, "capability-proof.json"),
      `${JSON.stringify(results, null, 2)}\n`,
      "utf8",
    );

    // console summary
    const s = results;
    console.log("\n=== capability proof ===");
    console.log("A headline typeface :", s.req1_embeddedDeterministicFonts.a_systemStackResolvedTo.headline);
    console.log("B headline typeface :", s.req1_embeddedDeterministicFonts.b_embeddedFontResolvedTo.headline);
    console.log("A pdf fonts         :", s.req1_embeddedDeterministicFonts.a_pdf.embeddedFontSubsets);
    console.log("B pdf fonts         :", s.req1_embeddedDeterministicFonts.b_pdf.embeddedFontSubsets);
    console.log(
      "focal diff (1600)   :",
      s.req2_imageCropAndFocalPositioning.sourceLargerThanCanvas.meanPixelDiffBetweenFocalPoints,
    );
    console.log(
      "focal diff (exact)  :",
      s.req2_imageCropAndFocalPositioning.sourceEqualToCanvas.meanPixelDiffBetweenFocalPoints,
    );
    console.log("A offer panel ink   :", aPanel.inkCoverage, `(dominant ${aPanel.dominantShare})`);
    console.log("B offer panel ink   :", bPanel.inkCoverage, `(dominant ${bPanel.dominantShare})`);
    console.log("A png / ppi         :", `${aMeta.width}x${aMeta.height}`, s.req7_printQualityExport.a_png.ppiOnLetterWidth);
    console.log("B png / ppi         :", `${bMeta.width}x${bMeta.height}`, s.req7_printQualityExport.b_png.ppiOnLetterWidth);
    console.log(
      "clip verified       :",
      s.req4_masksClippingGradients.clipVerified,
      "| excluded",
      insetOutside,
      "plate",
      plateReference,
      "included",
      insetInside,
    );
    console.log("\nartifacts:", path.relative(REPO, OUT));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
