/**
 * STUDIO-OPERATING-STATIC-DESIGN-COMPOSITION-REBUILD-1 — Stage 0
 *
 * Stage 0 answers one question: can The Studio compose strong static design with
 * the capabilities already in the current stack, before any paid Polotno licence?
 *
 * The composition path is new and clean. It does not patch the legacy composer.
 * It sits behind a renderer seat so Polotno can replace Chromium later without
 * touching Machine, the truth contract, revision accounting, QA, or spend.
 */

export const studioStaticDesignCompositionV1 = {
  packageId: "STUDIO-OPERATING-STATIC-DESIGN-COMPOSITION-REBUILD-1",
  stage: 0 as const,
  schemaVersion: 1 as const,
  room: 4 as const,

  /** The document contract. Deliberately shaped like the Polotno design format. */
  documentContractVersion: "studio-design-document-1.0.0" as const,

  /**
   * Composition is authored in a resolution-independent logical space and
   * materialised per output. The logical space matches the legacy grading canvas
   * so every existing px-calibrated QA threshold stays valid.
   */
  logicalSpace: { widthPx: 1024, heightPx: 1536 },

  /**
   * Print materialisation. The reference sheet height is the same 11in the
   * existing readability gate grades against, so "300 DPI" here means the same
   * sheet the gate already assumes — not a new trim size invented by Stage 0.
   */
  print: { dpi: 300, referenceSheetHeightIn: 11 },

  /** Digital materialisation stays on the logical canvas. */
  digital: { scale: 1 },

  /**
   * Fonts travel with the document. A face that cannot be loaded is a hard
   * failure — never a substitution the customer discovers on the printed sheet.
   */
  fonts: {
    houseSerifFamily: "Source Serif 4",
    directoryRelative: "assets/fonts/source-serif-4",
    faces: [
      { weight: 400 as const, fileName: "source-serif-4-latin-400-normal.woff2" },
      { weight: 600 as const, fileName: "source-serif-4-latin-600-normal.woff2" },
      { weight: 700 as const, fileName: "source-serif-4-latin-700-normal.woff2" },
    ],
    licenceFile: "OFL.txt",
    /** Verify the face the renderer actually put on the glyphs, per text element. */
    verifyResolvedFaceAtRender: true,
  },

  /**
   * Image sources must be larger than the box they fill whenever a crop window
   * is requested, otherwise a focal point cannot move anything.
   */
  cropHeadroom: { minimumSourceScale: 1.25 },

  /**
   * A single element may be exempted from the headroom rule for a controlled
   * proof, and only when the shortfall is a provider ceiling rather than a
   * composition mistake.
   *
   * Owner decision 2026-09-15, Cedar & Stone: gpt-image-1 tops out at 1536px, so a
   * full-bleed 8.5in band at 300 DPI is physically unservable. Shrinking the image
   * to ~12% of the sheet would have made the proof judge composition quality on a
   * provider limit. The exemption exists so that judgement stays fair **without**
   * the global rule quietly moving.
   *
   * Deliberate design: the exemption is per element, must name who authorised it,
   * is reported on every validation result whether or not anyone asks, and does not
   * change `cropHeadroom`. An exempted document is not a clean document — it is a
   * document with a recorded exception.
   */
  printResolutionException: {
    label: "CONTROLLED PROOF EXCEPTION — provider ceiling, not launch print standard",
    allowedScopes: ["controlled_proof"] as const,
    globalRuleUnchanged: true as const,
    /** Never valid for a customer deliverable. */
    permittedForLaunchPrint: false as const,
  },

  /** A painted container with nothing in it is the `hollow_offer_panel` defect. */
  hollowContainer: {
    /** Containers at or above this share of the logical canvas must carry content. */
    minShareRequiringContent: 0.02,
    /** Content must cover at least this share of the container's height. */
    minContentHeightShare: 0.4,
  },

  /** Facts the composed flyer must carry, or composition fails closed. */
  requiredFactIds: [
    "businessName",
    "headline",
    "offerName",
    "priceDisplay",
    "phone",
    "webDisplay",
  ] as const,

  failureCodes: {
    fontFileMissing: "studio_design_font_file_missing",
    fontNotDeclared: "studio_design_font_not_declared",
    fontSubstitutedAtRender: "studio_design_font_substituted_at_render",
    requiredFactMissing: "studio_design_required_fact_missing",
    factTextAltered: "studio_design_fact_text_altered",
    factBoundTwice: "studio_design_fact_bound_twice",
    hollowContainer: "studio_design_hollow_container",
    cropWithoutHeadroom: "studio_design_crop_without_headroom",
    elementOutsideCanvas: "studio_design_element_outside_canvas",
    factNotRendered: "studio_design_fact_not_rendered",
    /**
     * A line that wrapped past the lines it declared, or grew past its own box.
     * Text can be perfectly correct and still collide with the element beneath it —
     * a wrapped price line orphaning "$225" over the call to action is not a
     * content defect, so no content check catches it.
     */
    textOverflowsDeclaredBox: "studio_design_text_overflows_declared_box",
  },

  /** Capabilities Stage 0 must actually exercise, not merely support. */
  requiredCapabilities: [
    "embedded_deterministic_fonts",
    "print_canvas_and_resolution",
    "oversized_image_source",
    "real_crop_and_focal",
    "transparency",
    "gradients",
    "masks_clipping",
    "layered_composition",
    "flexible_geometry",
    "typography_hierarchy",
  ] as const,

  /** Renderer seat. Stage 0 ships Chromium only; Polotno is a later swap. */
  renderers: {
    stage0: "chromium-static-design-1" as const,
    plannedSwap: "polotno-node-static-design-1" as const,
    swapRequiresPaidLicence: true,
  },

  boundaries: {
    doNotPatchLegacyComposer: true,
    doNotModifyMachineOrchestration: true,
    doNotModifyTruthContract: true,
    doNotModifyRevisionAccounting: true,
    doNotModifyQaOrCorrectionRules: true,
    doNotModifySpendControls: true,
    doNotModifyCustomerOneHistory: true,
    doNotModifyMayaLiveHistory: true,
    doNotPurchasePolotnoLicence: true,
    doNotRunLiveCustomerOneProduction: true,
  },
} as const;

export type StudioStaticDesignCompositionConfig =
  typeof studioStaticDesignCompositionV1;
