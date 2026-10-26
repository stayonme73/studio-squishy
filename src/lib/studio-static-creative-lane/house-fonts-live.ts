/**
 * Live HTML renderers share one embedded house face.
 *
 * The previous stack listed Palatino Linotype as a fallback, which is how the
 * live flyer silently changed typeface by machine. There is no substitute face
 * in this CSS. If the files are missing, loadHouseFonts throws.
 */

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import { fontFaceCss, loadHouseFonts } from "@/lib/studio-static-design-composition/fonts";

/** Generic `serif` only — never a named substitute face. */
export const LIVE_HOUSE_FONT_STACK = `"${cfg.fonts.houseSerifFamily}", serif`;

const FALLBACK_FACE = /Palatino|Iowan Old Style|Georgia/i;

export function liveHouseFontCss(repoRoot: string): string {
  return fontFaceCss(loadHouseFonts(repoRoot));
}

export function liveHouseFontStyleBlock(repoRoot: string): string {
  return `${liveHouseFontCss(repoRoot)}\n  .canvas, body, .layer.text { font-family: ${LIVE_HOUSE_FONT_STACK}; }`;
}

export function fontStackIsDeterministic(stack: string): boolean {
  return !FALLBACK_FACE.test(stack) && stack.includes(cfg.fonts.houseSerifFamily);
}
