/**
 * Embedded deterministic fonts.
 *
 * The legacy composer asked for `"Source Serif 4", "Iowan Old Style", "Palatino
 * Linotype", Palatino, Georgia, serif` while the repository contained no font
 * file at all, so Chromium silently resolved whatever the host happened to have
 * and the same flyer set in a different typeface on a different machine.
 *
 * Here the bytes travel with the document and there is no fallback list. A face
 * that cannot be loaded raises. A face that the renderer silently substitutes is
 * caught at render time and fails the artifact.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";

import type { StudioEmbeddedFont } from "./types";

export class StudioFontUnavailableError extends Error {
  readonly code = cfg.failureCodes.fontFileMissing;
  constructor(message: string) {
    super(message);
    this.name = "StudioFontUnavailableError";
  }
}

/**
 * Load the house faces from the repository. Throws rather than degrade: a missing
 * font is a production defect, not a styling preference.
 */
export function loadHouseFonts(repoRoot: string): readonly StudioEmbeddedFont[] {
  const dir = path.join(repoRoot, cfg.fonts.directoryRelative);
  return cfg.fonts.faces.map((face) => {
    const absolute = path.join(dir, face.fileName);
    if (!existsSync(absolute)) {
      throw new StudioFontUnavailableError(
        `Font file missing: ${path.relative(repoRoot, absolute)}. The Studio will not ` +
          "render customer work in a substituted typeface.",
      );
    }
    const bytes = readFileSync(absolute);
    return {
      family: cfg.fonts.houseSerifFamily,
      weight: face.weight,
      style: "normal" as const,
      format: "woff2" as const,
      relativePath: path
        .join(cfg.fonts.directoryRelative, face.fileName)
        .replace(/\\/g, "/"),
      contentSha256: createHash("sha256").update(bytes).digest("hex"),
      bytesBase64: bytes.toString("base64"),
    };
  });
}

/** `@font-face` rules with the bytes inline. No `src` can fall back to the host. */
export function fontFaceCss(fonts: readonly StudioEmbeddedFont[]): string {
  return fonts
    .map(
      (font) =>
        `@font-face{font-family:"${font.family}";font-style:${font.style};` +
        `font-weight:${font.weight};font-display:block;` +
        `src:url(data:font/woff2;base64,${font.bytesBase64}) format("woff2");}`,
    )
    .join("\n");
}

/**
 * Families the document is allowed to reference. Anything else is a composition
 * failure, because the renderer would have to invent a face to satisfy it.
 */
export function declaredFamilies(
  fonts: readonly StudioEmbeddedFont[],
): ReadonlySet<string> {
  return new Set(fonts.map((font) => font.family));
}

/**
 * Style suffixes a platform may append when it names the concrete face it used.
 * Chromium reports weight 600 of the embedded family as "Source Serif 4 SemiBold",
 * which is the right face, not a substitution. Anything outside this list is a
 * different typeface.
 */
const FACE_STYLE_TOKENS = new Set([
  "thin",
  "extralight",
  "ultralight",
  "light",
  "regular",
  "book",
  "normal",
  "medium",
  "semibold",
  "demibold",
  "bold",
  "extrabold",
  "ultrabold",
  "black",
  "heavy",
  "italic",
  "oblique",
]);

/**
 * Did the renderer honour the face we asked for? Chromium reports the family it
 * actually put on the glyphs, so a silent substitution is measurable rather than
 * a thing the customer discovers on the printed sheet.
 */
export function resolvedFaceHonoursRequest(
  requested: string,
  resolved: readonly string[],
): boolean {
  if (resolved.length === 0) return false;
  const want = requested.trim().toLowerCase();
  return resolved.every((name) => {
    const actual = name.trim().toLowerCase();
    if (actual === want) return true;
    if (!actual.startsWith(`${want} `)) return false;
    return actual
      .slice(want.length)
      .trim()
      .split(/\s+/)
      .every((token) => FACE_STYLE_TOKENS.has(token));
  });
}
