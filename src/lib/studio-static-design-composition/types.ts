/**
 * The Studio design document — the Stage 0 composition contract.
 *
 * Shaped deliberately like the Polotno design format so the renderer underneath
 * is replaceable: field names, the element union, the crop rect as 0-1 fractions
 * of the source, `clipSrc` for masks, and CSS gradient strings as fills all map
 * one-to-one onto Polotno. What is Studio-specific (fact binding, roles,
 * container contracts, provenance) rides in fields that Polotno carries under
 * `custom`, so nothing is lost in translation either way.
 *
 * Geometry is authored once in a logical space and materialised per output. The
 * document does not know or care whether Chromium or Polotno draws it.
 */

import type { FlyerCreativeDirection } from "@/lib/studio-design-intelligence/types";
import type {
  DesignMaterialRef,
  DesignRendererProofSku,
  FlyerImageRole,
  FlyerShapeRole,
  FlyerTextRole,
} from "@/lib/studio-design-renderer/types";

import type { PresentationCase } from "./presentation-case";

export type StudioDesignFactId =
  | "businessName"
  | "descriptor"
  | "headline"
  | "offerName"
  | "priceDisplay"
  | "dateWindow"
  | "body"
  | "cta"
  | "phone"
  | "webDisplay"
  | "wasPriceDisplay"
  | "disclaimer";

/** A face that travels with the document. `bytesBase64` is the embedded payload. */
export type StudioEmbeddedFont = {
  family: string;
  weight: 400 | 500 | 600 | 700;
  style: "normal" | "italic";
  format: "woff2";
  /** Repo-relative source, kept for provenance and for the Polotno `url` field. */
  relativePath: string;
  contentSha256: string;
  bytesBase64: string;
};

/** Fill may be a solid colour, an rgba with real alpha, or a CSS gradient string. */
export type StudioFill = string;

type StudioElementBase = {
  id: string;
  /** Logical-space geometry. Materialised by the renderer, never pre-scaled. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  /** Real alpha on the element itself, independent of the fill's alpha. */
  opacity?: number;
};

export type StudioTextElement = StudioElementBase & {
  type: "text";
  role: FlyerTextRole;
  /**
   * The customer fact this line carries. Bound, not paraphrased: validation
   * requires `text` to equal the truth value for this id (case-preserved, or the
   * declared uppercase presentation of it). This is what makes facts
   * renderer-owned and deterministic.
   */
  factId: StudioDesignFactId;
  text: string;
  /**
   * Case-only transform applied to the bound fact. Declared here so validation can
   * reapply it and confirm the words are the customer's, whatever the case.
   */
  presentationCase?: PresentationCase;
  fontFamily: string;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  lineHeight: number;
  letterSpacing?: number;
  align: "left" | "center" | "right";
  fill: StudioFill;
  maxLines?: number;
};

export type StudioImageElement = StudioElementBase & {
  type: "image";
  role: FlyerImageRole;
  materialId: string;
  fit: "cover" | "contain";
  /**
   * Crop window as 0-1 fractions of the SOURCE image — a real crop rect, not a
   * CSS alignment hint. Requires a source larger than the box.
   */
  crop?: { x: number; y: number; width: number; height: number };
  /** Where the subject should sit, 0-1 of the source. Resolves into `crop`. */
  focal?: { x: number; y: number };
  /** SVG or image mask, data URI or repo-relative. Maps to Polotno `clipSrc`. */
  clipSrc?: string;
  cornerRadius?: number;
  /**
   * A recorded exemption from the crop-headroom rule for this one element.
   *
   * Present only when the shortfall is a provider ceiling rather than a composition
   * mistake, and only for a controlled proof. It does not make the document clean:
   * validation still measures the shortfall and reports it as an exception on every
   * result. See `printResolutionException` in the Stage 0 config.
   */
  printResolutionException?: {
    scope: "controlled_proof";
    /** Who decided. A blank or absent value is not an authorisation. */
    authorisedBy: string;
    /** Why the source cannot be larger. */
    reason: string;
  };
};

export type StudioFigureElement = StudioElementBase & {
  type: "figure";
  role: FlyerShapeRole;
  subType: "rect";
  fill: StudioFill;
  cornerRadius?: number;
  /**
   * A container that exists to hold content. If nothing lands inside it, that is
   * the `hollow_offer_panel` defect and composition must fail rather than paint
   * an empty card. Decorative fields set this false and say why.
   */
  requiresContent: boolean;
  /** Why a decorative field is allowed to carry no content. */
  decorativePurpose?: string;
  /**
   * The flattened colour a reader actually perceives here, for gates that grade
   * contrast. An alpha or gradient fill cannot be graded as a hex on its own.
   */
  effectiveHex: string;
};

export type StudioDesignElement =
  | StudioTextElement
  | StudioImageElement
  | StudioFigureElement;

export type StudioDesignDocument = {
  contractVersion: "studio-design-document-1.0.0";
  /** Resolution-independent authoring space. */
  logical: { widthPx: number; heightPx: number };
  /** Print materialisation target. */
  print: { dpi: number; referenceSheetHeightIn: number };
  background: string;
  fonts: readonly StudioEmbeddedFont[];
  /** Paint order is array order: index 0 is the bottom layer. */
  elements: readonly StudioDesignElement[];
  materials: readonly DesignMaterialRef[];
  provenance: {
    packageId: string;
    skuId: DesignRendererProofSku;
    campaignId: string;
    jobId: string;
    dispatchId: string;
    /** The truth contract this document was composed from. Unmodified. */
    truthSpecVersion: string;
    creativeDirection?: FlyerCreativeDirection;
    /** Set when a customer revision reshaped the composition. */
    revisionEmphasis?: { emphasizeExistingCtaAsHeadline: boolean; instruction: string };
    composedAt: string;
  };
};

/** What the renderer seat must accept and return, whoever fills it. */
export type StaticDesignRenderRequest = {
  document: StudioDesignDocument;
  repoRoot: string;
  /** Absolute paths for each materialId referenced by image elements. */
  materialPaths: Readonly<Record<string, string>>;
  outputs: {
    printPngAbsolutePath: string;
    /** Omit for comparison renders that only need pixels. */
    printPdfAbsolutePath?: string;
    digitalPngAbsolutePath?: string;
    /**
     * The document HTML, written for inspection. Self-contained, so it carries the
     * embedded font bytes and image sources and is correspondingly large. Omit it
     * unless a reviewer needs to open the intermediate.
     */
    htmlAbsolutePath?: string;
  };
};

export type RenderedFactCheck = {
  factId: StudioDesignFactId;
  elementId: string;
  /** Text measured in the rendered page, not the text we asked for. */
  renderedText: string;
  visible: boolean;
  withinCanvas: boolean;
  /** The face the renderer actually put on the glyphs. */
  resolvedFontFamilies: readonly string[];
  requestedFontFamily: string;
  fontHonoured: boolean;
  box: { x: number; y: number; width: number; height: number };
  /** Line boxes the text actually occupied after layout. */
  lineCount: number;
  /** Height those line boxes occupied, against the element's declared height. */
  contentHeightPx: number;
};

export type StaticDesignRenderResult = {
  rendererId: string;
  ok: boolean;
  failures: readonly { code: string; message: string }[];
  print: {
    widthPx: number;
    heightPx: number;
    dpi: number;
    scale: number;
    trimWidthIn: number;
    trimHeightIn: number;
  };
  /** Page box of the exported PDF, in points, when a PDF was written. */
  pdfMediaBoxPoints?: { widthPt: number; heightPt: number } | null;
  digital?: { widthPx: number; heightPx: number };
  /** Per-fact evidence measured in the rendered page. */
  renderedFacts: readonly RenderedFactCheck[];
  /** Embedded font subsets found inside the exported PDF. */
  pdfEmbeddedFontSubsets: readonly string[];
  pdfHasVectorText: boolean;
  outputs: {
    printPngAbsolutePath: string;
    printPdfAbsolutePath?: string;
    digitalPngAbsolutePath?: string;
    htmlAbsolutePath?: string;
  };
};

export type StaticDesignRenderer = {
  rendererId: string;
  /** True when this renderer needs a paid licence to run. */
  requiresPaidLicence: boolean;
  render(request: StaticDesignRenderRequest): Promise<StaticDesignRenderResult>;
};
