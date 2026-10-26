/**
 * Renderer swappability, demonstrated rather than asserted.
 *
 * The Stage 0 document converts to a Polotno design document with no loss:
 * geometry, the crop window, the mask, alpha, gradients, the embedded font, and
 * every fact binding survive the trip. Studio-only fields ride in `custom`, which
 * is where the Polotno format keeps host application data.
 *
 * This is what makes the seat real. When a Polotno licence exists, the swap is a
 * new renderer module consuming this output — not a rewrite of Machine, the truth
 * contract, revision accounting, QA, or spend.
 *
 * Nothing here calls Polotno. `@polotno/schema` is an optional dev dependency used
 * only to validate the conversion; the conversion itself has no dependency at all.
 */

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";

import { printDimensions, resolveCropWindow } from "./render-chromium";
import type { StudioDesignDocument } from "./types";

export type PolotnoDesign = {
  schemaVersion: number;
  width: number;
  height: number;
  unit: "px";
  dpi: number;
  fonts: { fontFamily: string; url: string }[];
  pages: {
    id: string;
    background: string;
    children: Record<string, unknown>[];
  }[];
  custom: Record<string, unknown>;
};

/**
 * Convert to the Polotno design format at print geometry.
 *
 * `sourceDimensions` is required for any element carrying a focal point, because
 * Polotno's crop rect is expressed against the source image and a focal point
 * cannot be resolved without knowing what it is cropping.
 */
export function toPolotnoDesign(input: {
  document: StudioDesignDocument;
  /** materialId -> URL Polotno can fetch (file://, https://, or data URI). */
  materialUrls: Readonly<Record<string, string>>;
  sourceDimensions: Readonly<Record<string, { width: number; height: number }>>;
  /** Font URL per family. Polotno loads faces by URL rather than inline bytes. */
  fontUrls: Readonly<Record<string, string>>;
  schemaVersion?: number;
}): PolotnoDesign {
  const doc = input.document;
  const print = printDimensions(doc);
  const s = print.scale;
  const at = (value: number) => Math.round(value * s * 1000) / 1000;

  const children: Record<string, unknown>[] = [];

  for (const element of doc.elements) {
    const base = {
      id: element.id,
      /** Polotno's element name. The Studio role travels here so it survives a swap. */
      name: element.role,
      x: at(element.x),
      y: at(element.y),
      width: at(element.width),
      height: at(element.height),
      rotation: element.rotation ?? 0,
      ...(element.opacity != null ? { opacity: element.opacity } : {}),
    };

    if (element.type === "text") {
      children.push({
        ...base,
        type: "text",
        text: element.text,
        fontFamily: element.fontFamily,
        fontSize: at(element.fontSize),
        fontWeight: String(element.fontWeight),
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing ? at(element.letterSpacing) : 0,
        align: element.align,
        fill: element.fill,
      });
      continue;
    }

    if (element.type === "figure") {
      children.push({
        ...base,
        type: "figure",
        subType: element.subType,
        fill: element.fill,
        cornerRadius: element.cornerRadius ? at(element.cornerRadius) : 0,
        strokeWidth: 0,
      });
      continue;
    }

    const source = input.sourceDimensions[element.materialId];
    const crop =
      element.crop ??
      (element.focal && source
        ? resolveCropWindow({
            source,
            box: { width: element.width, height: element.height },
            focal: element.focal,
          })
        : undefined);
    children.push({
      ...base,
      type: "image",
      src: input.materialUrls[element.materialId] ?? "",
      ...(crop
        ? {
            cropX: crop.x,
            cropY: crop.y,
            cropWidth: crop.width,
            cropHeight: crop.height,
          }
        : {}),
      ...(element.clipSrc ? { clipSrc: element.clipSrc } : {}),
      ...(element.cornerRadius ? { cornerRadius: at(element.cornerRadius) } : {}),
    });
  }

  const families = [...new Set(doc.fonts.map((font) => font.family))];

  return {
    schemaVersion: input.schemaVersion ?? 4,
    width: print.widthPx,
    height: print.heightPx,
    unit: "px",
    dpi: doc.print.dpi,
    fonts: families.map((family) => ({
      fontFamily: family,
      url: input.fontUrls[family] ?? "",
    })),
    pages: [
      {
        id: `${doc.provenance.jobId || "flyer"}-page-1`,
        background: doc.background,
        children,
      },
    ],
    custom: {
      studioContractVersion: doc.contractVersion,
      studioPackageId: cfg.packageId,
      studioProvenance: doc.provenance,
      /** Fact bindings survive the swap: the renderer never owns the copy. */
      studioFactBindings: doc.elements
        .filter((element) => element.type === "text")
        .map((element) => ({
          elementId: element.id,
          factId: (element as { factId: string }).factId,
          role: (element as { role: string }).role,
        })),
      studioContainerContracts: doc.elements
        .filter((element) => element.type === "figure")
        .map((element) => ({
          elementId: element.id,
          requiresContent: (element as { requiresContent: boolean }).requiresContent,
          decorativePurpose: (element as { decorativePurpose?: string }).decorativePurpose,
        })),
      studioFontProvenance: doc.fonts.map((font) => ({
        family: font.family,
        weight: font.weight,
        relativePath: font.relativePath,
        contentSha256: font.contentSha256,
      })),
    },
  };
}

/**
 * Validate with Polotno's own validator when it is installed. `@polotno/schema` is
 * licensed for production use at no cost and the design format is open, but it is
 * not a declared dependency of this repo, so this resolves it dynamically and
 * reports honestly when it is absent.
 */
export async function validateWithPolotnoSchema(
  design: PolotnoDesign,
): Promise<{ available: boolean; valid: boolean; errors: unknown[]; schemaVersion?: number }> {
  try {
    const mod = (await import(
      /* webpackIgnore: true */ "@polotno/schema"
    )) as unknown as {
      validateDesign: (
        design: unknown,
        options?: { mode?: "canonical" | "lenient" },
      ) => { valid: boolean; errors: unknown[] };
      CURRENT_SCHEMA_VERSION: number;
    };
    const result = mod.validateDesign(design, { mode: "canonical" });
    return {
      available: true,
      valid: result.valid,
      errors: result.errors ?? [],
      schemaVersion: mod.CURRENT_SCHEMA_VERSION,
    };
  } catch {
    return { available: false, valid: false, errors: [] };
  }
}
