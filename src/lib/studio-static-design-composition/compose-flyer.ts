/**
 * Flyer composition — the clean Stage 0 path.
 *
 * This does not patch the legacy composer. It reads the same `FlyerProjectTruth`
 * and produces a `StudioDesignDocument`: a layered composition where every line of
 * customer copy is *bound* to a fact id rather than assembled from strings.
 *
 * That binding is the fix for Maya's defect. The legacy path deduplicated her
 * offer copy out of the panel and then painted the panel anyway, so she received
 * an empty navy card and lost her price. Here a container declares whether it
 * needs content, a fact declares which element carries it, and composition fails
 * closed if either promise is broken.
 *
 * Geometry is authored in the logical space only. Nothing here knows the output
 * resolution, and nothing here knows which renderer will draw it.
 */

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";

import { composeTypeLedFlyerDocument } from "./compose-flyer-type-led";
import { loadHouseFonts } from "./fonts";
import { applyPresentationCase } from "./presentation-case";
import type {
  StudioDesignDocument,
  StudioDesignElement,
  StudioDesignFactId,
} from "./types";

const HOUSE = cfg.fonts.houseSerifFamily;

/** Palette roles. Every colour has one job. */
const INK = {
  onLight: "#16283c",
  onLightMuted: "#41586f",
  onDark: "#f6f1e6",
  onDarkMuted: "#d8cdb8",
  accent: "#d9b970",
};

/**
 * The angled quad that masks the detail inset. Authored here as a data URI so the
 * mask travels inside the document — Polotno's `clipSrc` accepts the same string.
 */
const ANGLED_QUAD_MASK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
    '<polygon points="10,0 100,0 90,100 0,100" fill="#000"/></svg>',
)}`;

/**
 * Vertical slots in the logical space. Named so a later layout family can swap
 * the numbers without the fact bindings moving.
 */
const SLOT = {
  wordmark: { x: 72, y: 88, width: 880, height: 72 },
  eyebrow: { x: 72, y: 892, width: 880, height: 44 },
  panel: { x: 72, y: 968, width: 880, height: 272 },
  lead: { x: 112, y: 992, width: 800, height: 104 },
  offerName: { x: 112, y: 1116, width: 520, height: 52 },
  price: { x: 688, y: 1100, width: 224, height: 92 },
  dates: { x: 112, y: 1180, width: 520, height: 40 },
  /** A photographic hairline rule under the offer line, masked to an angled band. */
  inset: { x: 112, y: 1200, width: 520, height: 18 },
  cta: { x: 72, y: 1276, width: 880, height: 48 },
  contactPhone: { x: 72, y: 1336, width: 560, height: 48 },
  contactWeb: { x: 72, y: 1392, width: 700, height: 48 },
} as const;

function trimmed(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

/**
 * Keep a one-line lockup inside its slot. Stage 0 used to paint Maya-sized type
 * for every customer; a supported CTA-as-headline revision then wrapped and
 * died as RENDER_FAILURE instead of composing.
 */
function fitOneLineSize(input: {
  text: string;
  width: number;
  maxSize: number;
  minSize: number;
  letterSpacing: number;
  emWidth: number;
}): number {
  const glyphs = Array.from(input.text);
  if (glyphs.length === 0) return input.maxSize;
  let size = input.maxSize;
  while (size > input.minSize) {
    const width = glyphs.reduce(
      (sum) => sum + size * input.emWidth + input.letterSpacing,
      0,
    );
    if (width <= input.width) return size;
    size -= 2;
  }
  return input.minSize;
}

export type FlyerCompositionInput = {
  repoRoot: string;
  truth: FlyerProjectTruth;
  /** The hero material the document draws from, when the job has one. */
  heroMaterialId?: string;
  /**
   * Set when a customer revision reshaped the composition. `emphasizeExistingCtaAsHeadline`
   * is the exact instruction that broke the legacy composer on Maya's job.
   */
  revisionEmphasis?: { emphasizeExistingCtaAsHeadline: boolean; instruction: string };
  composedAt?: string;
};

/**
 * Compose the document. Deterministic: same truth in, byte-identical document out.
 */
export function composeFlyerDocument(
  input: FlyerCompositionInput,
): StudioDesignDocument {
  if (!input.heroMaterialId) {
    return composeTypeLedFlyerDocument(input);
  }
  const { truth } = input;
  const fonts = loadHouseFonts(input.repoRoot);

  const businessName = trimmed(truth.wordmark) || trimmed(truth.businessName);
  const headlineFact = trimmed(truth.headline);
  const ctaFact = trimmed(truth.cta);
  const offerName = trimmed(truth.offerName);
  const priceDisplay = trimmed(truth.priceDisplay);
  const dateWindow = trimmed(truth.dateWindow);
  const phone = trimmed(truth.phone);
  const webDisplay = trimmed(truth.webDisplay);

  /**
   * The revision under test: promote the CTA to the lead position. The previous
   * headline is *not* discarded — it keeps a real role above the lockup. Dropping
   * it is precisely the failure this rebuild exists to prevent.
   */
  const promoteCta = Boolean(
    input.revisionEmphasis?.emphasizeExistingCtaAsHeadline && ctaFact,
  );
  const leadFactId: StudioDesignFactId = promoteCta ? "cta" : "headline";
  const leadText = promoteCta ? ctaFact : headlineFact;
  /**
   * Only when the previous headline is actually a different message. If the truth
   * mapper has already overwritten `headline` with the CTA, there is no prior
   * headline left to retain and printing the same words twice is not composition.
   */
  const eyebrowText =
    promoteCta && headlineFact && headlineFact.toLowerCase() !== ctaFact.toLowerCase()
      ? headlineFact
      : "";

  const elements: StudioDesignElement[] = [];

  // 1 — the generated visual, full bleed, when the job has one. Type-led jobs
  // (no photos) skip this rather than inventing a hollow image binding.
  if (input.heroMaterialId) {
    elements.push({
      type: "image",
      id: "generated-hero",
      role: "hero",
      materialId: input.heroMaterialId,
      fit: "cover",
      focal: { x: 0.62, y: 0.5 },
      x: 0,
      y: 0,
      width: cfg.logicalSpace.widthPx,
      height: cfg.logicalSpace.heightPx,
    });
  }

  // 2 — legibility field. Decorative by contract: it carries no facts, and it says
  // so, which is what keeps the hollow-container rule honest instead of blanket.
  elements.push({
    type: "figure",
    id: "field-bleed",
    role: "plate",
    subType: "rect",
    fill:
      "linear-gradient(180deg,rgba(9,17,28,0) 26%,rgba(9,17,28,0.42) 52%," +
      "rgba(9,17,28,0.78) 72%,rgba(9,17,28,0.94) 100%)",
    requiresContent: false,
    decorativePurpose:
      "Graded legibility field over the generated visual. Type sits on it; it holds no fact of its own.",
    // What a reader perceives in the lower field, where the contact route sits.
    effectiveHex: "#0c1a2a",
    x: 0,
    y: 0,
    width: cfg.logicalSpace.widthPx,
    height: cfg.logicalSpace.heightPx,
  });

  const wordmarkText = applyPresentationCase(businessName, "upper");
  const wordmarkSize = fitOneLineSize({
    text: wordmarkText,
    width: SLOT.wordmark.width,
    maxSize: 34,
    minSize: 20,
    letterSpacing: 4.8,
    emWidth: 0.62,
  });
  const wordmarkTracking = wordmarkSize < 28 ? 2.4 : 4.8;
  // Type-led plates keep a light field at the top. Cream-on-cream made the
  // identity unreadable. Dark ink on a light plate; cream ink over a hero.
  const wordmarkInk = input.heroMaterialId ? INK.onDark : INK.onLight;

  // 3 — identity
  elements.push({
    type: "text",
    id: "wordmark",
    role: "wordmark",
    factId: "businessName",
    text: wordmarkText,
    presentationCase: "upper",
    fontFamily: HOUSE,
    fontSize: wordmarkSize,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: wordmarkTracking,
    align: "left",
    fill: wordmarkInk,
    maxLines: 1,
    ...SLOT.wordmark,
  });

  // 4 — the retained previous headline, when the CTA was promoted over it
  if (eyebrowText) {
    const eyebrowDisplay = applyPresentationCase(eyebrowText, "upper");
    elements.push({
      type: "text",
      id: "eyebrow",
      role: "eyebrow",
      factId: "headline",
      text: eyebrowDisplay,
      presentationCase: "upper",
      fontFamily: HOUSE,
      fontSize: fitOneLineSize({
        text: eyebrowDisplay,
        width: SLOT.eyebrow.width,
        maxSize: 30,
        minSize: 18,
        letterSpacing: 3.6,
        emWidth: 0.62,
      }),
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 3.6,
      align: "left",
      fill: INK.accent,
      maxLines: 1,
      ...SLOT.eyebrow,
    });
  }

  // 5 — the offer dock. Declared as a container that must carry content.
  elements.push({
    type: "figure",
    id: "offer-panel",
    role: "plate",
    subType: "rect",
    // Real alpha: the plate sits on the visual rather than blanking it out.
    fill: "rgba(252,249,243,0.95)",
    effectiveHex: "#f7f2ea",
    cornerRadius: 10,
    requiresContent: true,
    ...SLOT.panel,
  });

  // 6 — the lead line, inside the dock so identity, offer and price read as one lockup
  const leadSize = fitOneLineSize({
    text: leadText,
    width: SLOT.lead.width,
    maxSize: 100,
    minSize: 52,
    letterSpacing: -2,
    emWidth: 0.58,
  });
  elements.push({
    type: "text",
    id: "lead-line",
    role: "headline",
    factId: leadFactId,
    text: leadText,
    fontFamily: HOUSE,
    fontSize: leadSize,
    fontWeight: 700,
    lineHeight: 0.98,
    letterSpacing: -2,
    align: "left",
    fill: INK.onLight,
    maxLines: 1,
    ...SLOT.lead,
  });

  const offerText = applyPresentationCase(offerName, "sentence");
  const offerSize = fitOneLineSize({
    text: offerText,
    width: SLOT.offerName.width,
    maxSize: 38,
    minSize: 22,
    letterSpacing: 0,
    emWidth: 0.56,
  });
  elements.push({
    type: "text",
    id: "offer-name",
    role: "offer",
    factId: "offerName",
    text: offerText,
    presentationCase: "sentence",
    fontFamily: HOUSE,
    fontSize: offerSize,
    fontWeight: 600,
    lineHeight: 1.15,
    align: "left",
    fill: INK.onLightMuted,
    maxLines: 1,
    ...SLOT.offerName,
  });

  // Gradient on the price: a fill gradient is a capability Polotno carries on the
  // same field, so this survives the renderer swap unchanged.
  elements.push({
    type: "text",
    id: "price",
    role: "price",
    factId: "priceDisplay",
    text: priceDisplay,
    fontFamily: HOUSE,
    fontSize: 84,
    fontWeight: 700,
    lineHeight: 1,
    align: "right",
    fill: "linear-gradient(180deg,#1f3a5f 0%,#41719f 100%)",
    maxLines: 1,
    ...SLOT.price,
  });

  if (dateWindow) {
    elements.push({
      type: "text",
      id: "dates",
      role: "dates",
      factId: "dateWindow",
      text: applyPresentationCase(dateWindow, "upper"),
      presentationCase: "upper",
      fontFamily: HOUSE,
      fontSize: 26,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 2.4,
      align: "left",
      fill: INK.onLightMuted,
      maxLines: 1,
      ...SLOT.dates,
    });
  }

  // 7 — masked detail from the same source, cropped tighter. Proves clipping and a
  // second, independent crop window on one material. Type-led jobs have no hero.
  if (input.heroMaterialId) {
    elements.push({
      type: "image",
      id: "detail-inset",
      role: "hero",
      materialId: input.heroMaterialId,
      fit: "cover",
      // The letterbox inset takes its latitude vertically instead.
      focal: { x: 0.5, y: 0.34 },
      clipSrc: ANGLED_QUAD_MASK,
      x: SLOT.inset.x,
      y: SLOT.inset.y,
      width: SLOT.inset.width,
      height: SLOT.inset.height,
    });
  }

  // 8 — CTA stays on the first sheet. Promoting it to the lead later must not
  // be the only way the customer sees the words they supplied.
  if (
    !promoteCta &&
    ctaFact &&
    ctaFact.toLowerCase() !== headlineFact.toLowerCase()
  ) {
    elements.push({
      type: "text",
      id: "cta-line",
      role: "cta",
      factId: "cta",
      text: ctaFact,
      fontFamily: HOUSE,
      fontSize: fitOneLineSize({
        text: ctaFact,
        width: SLOT.cta.width,
        maxSize: 36,
        minSize: 22,
        letterSpacing: 0.4,
        emWidth: 0.56,
      }),
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 0.4,
      align: "left",
      fill: INK.accent,
      maxLines: 1,
      ...SLOT.cta,
    });
  }

  // 9 — the conversion route, never invented and never merged into one blob
  elements.push({
    type: "text",
    id: "contact-phone",
    role: "contact_phone",
    factId: "phone",
    text: phone,
    fontFamily: HOUSE,
    fontSize: 36,
    fontWeight: 600,
    lineHeight: 1.25,
    align: "left",
    fill: INK.onDark,
    maxLines: 1,
    ...SLOT.contactPhone,
  });

  elements.push({
    type: "text",
    id: "contact-web",
    role: "contact_web",
    factId: "webDisplay",
    text: webDisplay,
    fontFamily: HOUSE,
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.25,
    align: "left",
    fill: INK.onDarkMuted,
    maxLines: 1,
    ...SLOT.contactWeb,
  });

  return {
    contractVersion: cfg.documentContractVersion,
    logical: { ...cfg.logicalSpace },
    print: {
      dpi: cfg.print.dpi,
      referenceSheetHeightIn: cfg.print.referenceSheetHeightIn,
    },
    background: truth.brandColors.background || "#0b1420",
    fonts,
    elements,
    materials: truth.materials,
    provenance: {
      packageId: cfg.packageId,
      skuId: truth.skuId,
      campaignId: truth.campaignId,
      jobId: truth.jobId,
      dispatchId: truth.dispatchId,
      truthSpecVersion: "flyer-project-truth",
      creativeDirection: truth.creativeDirection,
      revisionEmphasis: input.revisionEmphasis,
      composedAt: input.composedAt ?? "1970-01-01T00:00:00.000Z",
    },
  };
}

/** The fact values the document is required to carry, read from the truth. */
export function requiredFactValues(
  truth: FlyerProjectTruth,
): Readonly<Record<string, string>> {
  return {
    businessName: trimmed(truth.wordmark) || trimmed(truth.businessName),
    headline: trimmed(truth.headline),
    offerName: trimmed(truth.offerName),
    priceDisplay: trimmed(truth.priceDisplay),
    phone: trimmed(truth.phone),
    webDisplay: trimmed(truth.webDisplay),
    cta: trimmed(truth.cta),
    dateWindow: trimmed(truth.dateWindow),
    wasPriceDisplay: trimmed(truth.wasPriceDisplay),
    descriptor: trimmed(truth.descriptor),
    body: trimmed(truth.body),
    disclaimer: trimmed(truth.disclaimer),
  };
}
