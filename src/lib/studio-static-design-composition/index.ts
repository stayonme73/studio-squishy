/**
 * STUDIO-OPERATING-STATIC-DESIGN-COMPOSITION-REBUILD-1 — Stage 0
 *
 * The new static-design composition path, behind an adapter. Machine, the truth
 * contract, revision accounting, QA rules, and spend controls are untouched: this
 * module only turns approved truth into a composed artifact.
 */

export { composeFlyerDocument, requiredFactValues } from "./compose-flyer";
export type { FlyerCompositionInput } from "./compose-flyer";
export {
  declaredFamilies,
  fontFaceCss,
  loadHouseFonts,
  resolvedFaceHonoursRequest,
  StudioFontUnavailableError,
} from "./fonts";
export { toFlyerDesignSpec, representativeHex } from "./flyer-spec-projection";
export { applyPresentationCase } from "./presentation-case";
export type { PresentationCase } from "./presentation-case";
export { toPolotnoDesign, validateWithPolotnoSchema } from "./polotno-interop";
export type { PolotnoDesign } from "./polotno-interop";
export {
  CHROMIUM_STATIC_DESIGN_RENDERER_ID,
  buildDocumentHtml,
  chromiumStaticDesignRenderer,
  pdfEmbeddedFonts,
  pdfLayoutScaleFor,
  pdfMediaBoxPoints,
  printDimensions,
  printScaleFor,
  resolveCropWindow,
} from "./render-chromium";
export {
  containerContentHeightShare,
  validateDesignDocument,
} from "./validate-document";
export type {
  CompositionFailure,
  CompositionValidationResult,
} from "./validate-document";
export type {
  RenderedFactCheck,
  StaticDesignRenderRequest,
  StaticDesignRenderResult,
  StaticDesignRenderer,
  StudioDesignDocument,
  StudioDesignElement,
  StudioDesignFactId,
  StudioEmbeddedFont,
  StudioFigureElement,
  StudioImageElement,
  StudioTextElement,
} from "./types";
