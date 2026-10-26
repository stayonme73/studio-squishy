/**
 * Stage 0 renderer — Chromium, sitting in the replaceable renderer seat.
 *
 * It consumes a `StudioDesignDocument` and knows nothing about Machine, the truth
 * contract, revisions, QA, or spend. Swapping it for `polotno-node` later means
 * writing another module with this same `StaticDesignRenderer` shape.
 *
 * Two things here are not cosmetic:
 *
 *  - Crop is resolved as a real window on the source and materialised by scaling
 *    and offsetting the image inside a clipping box, so a focal point is exact
 *    geometry rather than a CSS alignment hint. The same numbers become Polotno's
 *    `cropX/cropY/cropWidth/cropHeight`.
 *  - After painting, the renderer asks Chromium which typeface it actually put on
 *    the glyphs of every line, and fails the artifact on substitution. That is the
 *    check the legacy path never had.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { pathToFileURL } from "url";
import { inflateSync } from "zlib";

import sharp from "sharp";

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";

import { fontFaceCss, resolvedFaceHonoursRequest } from "./fonts";
import type {
  RenderedFactCheck,
  StaticDesignRenderRequest,
  StaticDesignRenderResult,
  StaticDesignRenderer,
  StudioDesignDocument,
  StudioDesignElement,
  StudioImageElement,
  StudioTextElement,
} from "./types";

export const CHROMIUM_STATIC_DESIGN_RENDERER_ID = cfg.renderers.stage0;

/** Logical space -> print pixels. One number, derived, never hand-tuned. */
export function printScaleFor(document: StudioDesignDocument): number {
  return (
    (document.print.dpi * document.print.referenceSheetHeightIn) /
    document.logical.heightPx
  );
}

/** CSS reference pixels per inch. Fixed by the CSS spec, not by the display. */
const CSS_PX_PER_INCH = 96;

/**
 * Slack between the lines a face actually laid out and the box composition
 * reserved. Sub-pixel rounding is metrics, not a layout mistake.
 */
const LAYOUT_TOLERANCE_PX = 3;

export function printDimensions(document: StudioDesignDocument): {
  widthPx: number;
  heightPx: number;
  scale: number;
  /** The physical sheet those pixels represent at the document's DPI. */
  trimWidthIn: number;
  trimHeightIn: number;
} {
  const scale = printScaleFor(document);
  const widthPx = Math.round(document.logical.widthPx * scale);
  const heightPx = Math.round(document.logical.heightPx * scale);
  return {
    widthPx,
    heightPx,
    scale,
    trimWidthIn: widthPx / document.print.dpi,
    trimHeightIn: heightPx / document.print.dpi,
  };
}

/**
 * The PDF page is a physical sheet, so it is specified in inches and the layout is
 * scaled to fill it. Chromium lays PDFs out in CSS pixels at 96 per inch, so asking
 * for a page measured in output pixels produces a 22.9in × 34.4in sheet with the
 * composition stranded in one corner — which is exactly what the first Stage 0 export
 * did before this was measured.
 */
export function pdfLayoutScaleFor(document: StudioDesignDocument): number {
  return (CSS_PX_PER_INCH * printScaleFor(document)) / document.print.dpi;
}

/** Page box of an exported PDF, in points. 72pt = 1in. */
export function pdfMediaBoxPoints(
  pdfAbsolutePath: string,
): { widthPt: number; heightPt: number } | null {
  const text = readFileSync(pdfAbsolutePath).toString("latin1");
  const box = text.match(/\/MediaBox\s*\[([^\]]+)\]/)?.[1];
  if (!box) return null;
  const numbers = box.trim().split(/\s+/).map(Number);
  if (numbers.length < 4 || numbers.some((value) => !Number.isFinite(value))) return null;
  return { widthPt: numbers[2]! - numbers[0]!, heightPt: numbers[3]! - numbers[1]! };
}

/**
 * A focal point becomes the largest crop window with the box's aspect ratio,
 * centred on the focal point and clamped inside the source. Same maths Polotno's
 * crop rect expects.
 */
export function resolveCropWindow(input: {
  source: { width: number; height: number };
  box: { width: number; height: number };
  focal: { x: number; y: number };
}): { x: number; y: number; width: number; height: number } {
  const boxAspect = input.box.width / Math.max(1, input.box.height);
  const sourceAspect = input.source.width / Math.max(1, input.source.height);
  let cropWidth = 1;
  let cropHeight = 1;
  if (sourceAspect > boxAspect) {
    cropHeight = 1;
    cropWidth = Math.min(1, boxAspect / sourceAspect);
  } else {
    cropWidth = 1;
    cropHeight = Math.min(1, sourceAspect / boxAspect);
  }
  const clamp = (value: number, span: number) =>
    Math.max(0, Math.min(1 - span, value - span / 2));
  return {
    x: Number(clamp(input.focal.x, cropWidth).toFixed(6)),
    y: Number(clamp(input.focal.y, cropHeight).toFixed(6)),
    width: Number(cropWidth.toFixed(6)),
    height: Number(cropHeight.toFixed(6)),
  };
}

function isGradient(fill: string): boolean {
  return /gradient\(/i.test(fill);
}

function dataUri(absolutePath: string): string {
  const bytes = readFileSync(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const mime = ext === ".svg" ? "image/svg+xml" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function textCss(element: StudioTextElement): string {
  const base = [
    `left:${element.x}px`,
    `top:${element.y}px`,
    `width:${element.width}px`,
    `height:${element.height}px`,
    `font-family:"${element.fontFamily}"`,
    `font-size:${element.fontSize}px`,
    `font-weight:${element.fontWeight}`,
    `line-height:${element.lineHeight}`,
    `text-align:${element.align}`,
  ];
  if (element.letterSpacing) base.push(`letter-spacing:${element.letterSpacing}px`);
  if (element.opacity != null) base.push(`opacity:${element.opacity}`);
  if (element.rotation) base.push(`transform:rotate(${element.rotation}deg)`);
  if (isGradient(element.fill)) {
    // Gradient-filled type. Polotno accepts the same string on `fill`.
    base.push(
      `background-image:${element.fill}`,
      "-webkit-background-clip:text",
      "background-clip:text",
      "color:transparent",
    );
  } else {
    base.push(`color:${element.fill}`);
  }
  return base.join(";");
}

function figureCss(element: Extract<StudioDesignElement, { type: "figure" }>): string {
  const base = [
    `left:${element.x}px`,
    `top:${element.y}px`,
    `width:${element.width}px`,
    `height:${element.height}px`,
    isGradient(element.fill) ? `background-image:${element.fill}` : `background:${element.fill}`,
  ];
  if (element.cornerRadius) base.push(`border-radius:${element.cornerRadius}px`);
  if (element.opacity != null) base.push(`opacity:${element.opacity}`);
  return base.join(";");
}

/**
 * The crop is materialised here: the box clips, and the image inside it is sized
 * and offset so the crop window exactly fills the box with no distortion.
 */
function imageMarkup(
  element: StudioImageElement,
  crop: { x: number; y: number; width: number; height: number },
  source: { width: number; height: number },
  src: string,
): { css: string; html: string } {
  const drawnWidth = element.width / Math.max(1e-6, crop.width);
  const drawnHeight = element.height / Math.max(1e-6, crop.height);
  const offsetX = -crop.x * drawnWidth;
  const offsetY = -crop.y * drawnHeight;
  const boxRules = [
    `left:${element.x}px`,
    `top:${element.y}px`,
    `width:${element.width}px`,
    `height:${element.height}px`,
    "overflow:hidden",
  ];
  if (element.cornerRadius) boxRules.push(`border-radius:${element.cornerRadius}px`);
  if (element.opacity != null) boxRules.push(`opacity:${element.opacity}`);
  if (element.clipSrc) {
    // Mask travels in the document; Polotno reads the same value as `clipSrc`.
    boxRules.push(
      `-webkit-mask-image:url("${element.clipSrc}")`,
      `mask-image:url("${element.clipSrc}")`,
      "-webkit-mask-size:100% 100%",
      "mask-size:100% 100%",
      "-webkit-mask-repeat:no-repeat",
      "mask-repeat:no-repeat",
    );
  }
  const innerRules = [
    "position:absolute",
    `left:${offsetX}px`,
    `top:${offsetY}px`,
    `width:${drawnWidth}px`,
    `height:${drawnHeight}px`,
    "display:block",
  ];
  return {
    css: `#${element.id}{${boxRules.join(";")};}\n#${element.id}>img{${innerRules.join(";")};}`,
    html:
      `<div class="el" id="${element.id}" data-source="${source.width}x${source.height}">` +
      `<img src="${src}" alt=""/></div>`,
  };
}

async function sourceDimensions(
  materialPaths: Readonly<Record<string, string>>,
): Promise<Record<string, { width: number; height: number }>> {
  const out: Record<string, { width: number; height: number }> = {};
  for (const [materialId, absolute] of Object.entries(materialPaths)) {
    const meta = await sharp(absolute).metadata();
    out[materialId] = { width: meta.width ?? 0, height: meta.height ?? 0 };
  }
  return out;
}

export async function buildDocumentHtml(input: {
  document: StudioDesignDocument;
  materialPaths: Readonly<Record<string, string>>;
}): Promise<{ html: string; crops: Record<string, { x: number; y: number; width: number; height: number }> }> {
  const doc = input.document;
  const sources = await sourceDimensions(input.materialPaths);
  const css: string[] = [fontFaceCss(doc.fonts)];
  const body: string[] = [];
  const crops: Record<string, { x: number; y: number; width: number; height: number }> = {};

  for (const element of doc.elements) {
    if (element.type === "text") {
      css.push(`#${element.id}{${textCss(element)};}`);
      body.push(
        `<div class="el txt" id="${element.id}" data-fact="${element.factId}" ` +
          `data-family="${element.fontFamily}">${escapeHtml(element.text)}</div>`,
      );
      continue;
    }
    if (element.type === "figure") {
      css.push(`#${element.id}{${figureCss(element)};}`);
      body.push(`<div class="el" id="${element.id}"></div>`);
      continue;
    }
    const source = sources[element.materialId];
    if (!source) continue;
    const crop =
      element.crop ??
      resolveCropWindow({
        source,
        box: { width: element.width, height: element.height },
        focal: element.focal ?? { x: 0.5, y: 0.5 },
      });
    crops[element.id] = crop;
    const markup = imageMarkup(
      element,
      crop,
      source,
      dataUri(input.materialPaths[element.materialId]!),
    );
    css.push(markup.css);
    body.push(markup.html);
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${doc.logical.widthPx}px;height:${doc.logical.heightPx}px;overflow:hidden;}
.canvas{position:relative;width:${doc.logical.widthPx}px;height:${doc.logical.heightPx}px;
background:${doc.background};overflow:hidden;}
.el{position:absolute;}
.txt{white-space:pre-wrap;}
${css.join("\n")}
</style></head><body><div class="canvas">${body.join("\n")}</div></body></html>`;

  return { html, crops };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Embedded font subsets inside the exported PDF, including compressed objects. */
export function pdfEmbeddedFonts(pdfAbsolutePath: string): {
  subsets: string[];
  hasVectorText: boolean;
} {
  const buf = readFileSync(pdfAbsolutePath);
  const scan = (text: string) =>
    [...text.matchAll(/\/BaseFont\s*\/([#A-Za-z0-9+\-_.,]+)/g)].map((match) => match[1]!);
  const raw = buf.toString("latin1");
  const found = new Set(scan(raw));
  const streamRe = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    try {
      for (const name of scan(
        inflateSync(buf.subarray(start, end)).toString("latin1"),
      )) {
        found.add(name);
      }
    } catch {
      /* not a flate stream */
    }
  }
  const subsets = [...found].sort();
  return { subsets, hasVectorText: subsets.length > 0 };
}

export const chromiumStaticDesignRenderer: StaticDesignRenderer = {
  rendererId: CHROMIUM_STATIC_DESIGN_RENDERER_ID,
  requiresPaidLicence: false,

  async render(request: StaticDesignRenderRequest): Promise<StaticDesignRenderResult> {
    const doc = request.document;
    const failures: { code: string; message: string }[] = [];
    const print = printDimensions(doc);
    const { html } = await buildDocumentHtml({
      document: doc,
      materialPaths: request.materialPaths,
    });

    for (const target of [
      request.outputs.printPngAbsolutePath,
      request.outputs.printPdfAbsolutePath,
      request.outputs.digitalPngAbsolutePath,
      request.outputs.htmlAbsolutePath,
    ]) {
      if (target) mkdirSync(path.dirname(target), { recursive: true });
    }

    // The page is loaded from a file so relative resolution matches what a reviewer
    // sees when opening the intermediate. When no HTML output was asked for, it goes
    // to a temp file rather than leaving a multi-megabyte self-contained document in
    // the artifacts folder.
    const keepHtml = Boolean(request.outputs.htmlAbsolutePath);
    const htmlPath =
      request.outputs.htmlAbsolutePath ??
      path.join(
        tmpdir(),
        `studio-static-design-${Date.now()}-${Math.random().toString(36).slice(2)}.html`,
      );
    writeFileSync(htmlPath, html, "utf8");

    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const renderedFacts: RenderedFactCheck[] = [];
    try {
      const page = await browser.newPage({
        viewport: { width: doc.logical.widthPx, height: doc.logical.heightPx },
        deviceScaleFactor: print.scale,
      });
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
      // `font-display: block` plus this wait means text is never painted in a
      // fallback face while the embedded bytes are still decoding.
      await page.evaluate(() => document.fonts.ready);

      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const { root } = (await cdp.send("DOM.getDocument", { depth: -1 })) as {
        root: { nodeId: number };
      };

      const measured = await page.evaluate(() => {
        const out: Record<
          string,
          {
            text: string;
            visible: boolean;
            box: { x: number; y: number; width: number; height: number };
            lineCount: number;
            contentHeight: number;
          }
        > = {};
        for (const node of Array.from(document.querySelectorAll<HTMLElement>(".txt"))) {
          const style = window.getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          // Line boxes, from a range over the text itself. The element's own rect is
          // the box we asked for, so it cannot tell us whether the text outgrew it.
          const range = document.createRange();
          range.selectNodeContents(node);
          let top = Number.POSITIVE_INFINITY;
          let bottom = Number.NEGATIVE_INFINITY;
          const lineTops = new Set<number>();
          for (const line of Array.from(range.getClientRects())) {
            if (line.width <= 0 || line.height <= 0) continue;
            lineTops.add(Math.round(line.top));
            top = Math.min(top, line.top);
            bottom = Math.max(bottom, line.bottom);
          }
          out[node.id] = {
            text: node.textContent ?? "",
            visible:
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number(style.opacity) > 0.01 &&
              rect.width > 0 &&
              rect.height > 0,
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            lineCount: lineTops.size,
            contentHeight: Number.isFinite(top) && bottom > top ? bottom - top : 0,
          };
        }
        return out;
      });

      for (const element of doc.elements) {
        if (element.type !== "text") continue;
        const { nodeId } = (await cdp.send("DOM.querySelector", {
          nodeId: root.nodeId,
          selector: `#${element.id}`,
        })) as { nodeId: number };
        let resolved: string[] = [];
        if (nodeId) {
          const { fonts } = (await cdp.send("CSS.getPlatformFontsForNode", {
            nodeId,
          })) as { fonts: { familyName: string; glyphCount: number }[] };
          resolved = fonts.filter((font) => font.glyphCount > 0).map((font) => font.familyName);
        }
        const seen = measured[element.id];
        const honoured = resolvedFaceHonoursRequest(element.fontFamily, resolved);
        const withinCanvas = Boolean(
          seen &&
            seen.box.x >= -0.5 &&
            seen.box.y >= -0.5 &&
            seen.box.x + seen.box.width <= doc.logical.widthPx + 0.5 &&
            seen.box.y + seen.box.height <= doc.logical.heightPx + 0.5,
        );
        renderedFacts.push({
          factId: element.factId,
          elementId: element.id,
          renderedText: seen?.text ?? "",
          visible: Boolean(seen?.visible),
          withinCanvas,
          resolvedFontFamilies: resolved,
          requestedFontFamily: element.fontFamily,
          fontHonoured: honoured,
          box: seen?.box ?? { x: 0, y: 0, width: 0, height: 0 },
          lineCount: seen?.lineCount ?? 0,
          contentHeightPx: Number((seen?.contentHeight ?? 0).toFixed(2)),
        });

        if (cfg.fonts.verifyResolvedFaceAtRender && !honoured) {
          failures.push({
            code: cfg.failureCodes.fontSubstitutedAtRender,
            message: `Element ${element.id} asked for "${element.fontFamily}" and the renderer used ${
              resolved.length ? resolved.join(", ") : "no measurable face"
            }. The Studio does not ship customer work in a substituted typeface.`,
          });
        }
        if (!seen || !seen.visible || seen.text.trim() !== element.text.trim()) {
          failures.push({
            code: cfg.failureCodes.factNotRendered,
            message: `Fact "${element.factId}" did not reach the pixels as composed: expected "${element.text}", rendered "${seen?.text ?? ""}" (visible=${Boolean(
              seen?.visible,
            )}).`,
          });
        }
        if (!withinCanvas) {
          failures.push({
            code: cfg.failureCodes.elementOutsideCanvas,
            message: `Fact "${element.factId}" rendered outside the canvas.`,
          });
        }
        // A line may be exactly the customer's words and still be laid out wrong.
        // `maxLines` is a promise about the composition, so hold the render to it.
        const lines = seen?.lineCount ?? 0;
        if (element.maxLines != null && lines > element.maxLines) {
          failures.push({
            code: cfg.failureCodes.textOverflowsDeclaredBox,
            message: `Element ${element.id} declared ${element.maxLines} line(s) and wrapped onto ${lines}. "${element.text}" does not fit ${element.width}px at ${element.fontSize}px, so it runs into whatever sits beneath it.`,
          });
        }
        /**
         * Height of the lines as they were laid out: the number of line boxes that
         * actually formed, at the leading the composition asked for.
         *
         * Deliberately not `contentHeight`. That is the range rect, which is the
         * face's own ascent-plus-descent box — measured at ~1.38em for this serif
         * regardless of `line-height`, and unchanged when leading is increased. It
         * is metric whitespace, not ink, so grading a box against it condemns
         * correct layouts: it flagged Maya's 100px lead line, which has never
         * collided with anything.
         */
        const laidOutHeight = lines * element.fontSize * element.lineHeight;
        if (laidOutHeight > element.height + LAYOUT_TOLERANCE_PX) {
          failures.push({
            code: cfg.failureCodes.textOverflowsDeclaredBox,
            message: `Element ${element.id} laid out ${lines} line(s) needing ${laidOutHeight.toFixed(1)}px in a ${element.height}px box. Composition reserved less room than the type needs.`,
          });
        }
      }

      await page.screenshot({
        path: request.outputs.printPngAbsolutePath,
        type: "png",
        clip: { x: 0, y: 0, width: doc.logical.widthPx, height: doc.logical.heightPx },
      });

      if (request.outputs.printPdfAbsolutePath) {
        const pdfScale = pdfLayoutScaleFor(doc);
        if (pdfScale < 0.1 || pdfScale > 2) {
          // Chromium clamps outside this range, which would silently mis-size the
          // sheet. Better to refuse than to hand over a wrongly trimmed print file.
          throw new Error(
            `PDF layout scale ${pdfScale.toFixed(4)} is outside Chromium's 0.1-2 range for a ` +
              `${print.trimWidthIn.toFixed(3)}x${print.trimHeightIn.toFixed(3)}in sheet.`,
          );
        }
        await page.pdf({
          path: request.outputs.printPdfAbsolutePath,
          width: `${print.trimWidthIn}in`,
          height: `${print.trimHeightIn}in`,
          printBackground: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
          scale: pdfScale,
        });
      }
      await page.close();

      if (request.outputs.digitalPngAbsolutePath) {
        const digital = await browser.newPage({
          viewport: { width: doc.logical.widthPx, height: doc.logical.heightPx },
          deviceScaleFactor: cfg.digital.scale,
        });
        await digital.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
        await digital.evaluate(() => document.fonts.ready);
        await digital.screenshot({
          path: request.outputs.digitalPngAbsolutePath,
          type: "png",
          clip: { x: 0, y: 0, width: doc.logical.widthPx, height: doc.logical.heightPx },
        });
        await digital.close();
      }
    } finally {
      await browser.close();
      if (!keepHtml) rmSync(htmlPath, { force: true });
    }

    const pdf = request.outputs.printPdfAbsolutePath
      ? pdfEmbeddedFonts(request.outputs.printPdfAbsolutePath)
      : { subsets: [] as string[], hasVectorText: false };

    return {
      rendererId: CHROMIUM_STATIC_DESIGN_RENDERER_ID,
      ok: failures.length === 0,
      failures,
      print: { ...print, dpi: doc.print.dpi },
      pdfMediaBoxPoints: request.outputs.printPdfAbsolutePath
        ? pdfMediaBoxPoints(request.outputs.printPdfAbsolutePath)
        : null,
      digital: request.outputs.digitalPngAbsolutePath
        ? { widthPx: doc.logical.widthPx, heightPx: doc.logical.heightPx }
        : undefined,
      renderedFacts,
      pdfEmbeddedFontSubsets: pdf.subsets,
      pdfHasVectorText: pdf.hasVectorText,
      outputs: {
        ...request.outputs,
        htmlAbsolutePath: keepHtml ? htmlPath : undefined,
      },
    };
  },
};
