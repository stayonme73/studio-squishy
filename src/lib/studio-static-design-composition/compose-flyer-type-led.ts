/**
 * Type-led flyer — used when the job has no photograph.
 *
 * The photo-hero composer keeps a full-page legibility gradient that only makes
 * sense over a picture. Painting that gradient with nothing behind it leaves an
 * empty field. This layout places the approved facts on a paper sheet instead.
 */

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";

import type { FlyerCompositionInput } from "./compose-flyer";
import { loadHouseFonts } from "./fonts";
import { applyPresentationCase } from "./presentation-case";
import type {
  StudioDesignDocument,
  StudioDesignElement,
  StudioDesignFactId,
  StudioTextElement,
} from "./types";

const HOUSE = cfg.fonts.houseSerifFamily;

function trimmed(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

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

function luminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const raw = match[1]!;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function line(input: {
  id: string;
  role: StudioTextElement["role"];
  factId: StudioDesignFactId;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
  lineHeight: number;
  fill: string;
  align?: "left" | "center" | "right";
  maxLines: number;
  letterSpacing?: number;
  presentationCase?: StudioTextElement["presentationCase"];
}): StudioTextElement {
  return {
    type: "text",
    id: input.id,
    role: input.role,
    factId: input.factId,
    text: input.text,
    presentationCase: input.presentationCase,
    fontFamily: HOUSE,
    fontSize: input.fontSize,
    fontWeight: input.fontWeight,
    lineHeight: input.lineHeight,
    letterSpacing: input.letterSpacing,
    align: input.align ?? "center",
    fill: input.fill,
    maxLines: input.maxLines,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  };
}

export function composeTypeLedFlyerDocument(
  input: FlyerCompositionInput,
): StudioDesignDocument {
  const { truth } = input;
  const fonts = loadHouseFonts(input.repoRoot);
  const width = cfg.logicalSpace.widthPx;
  const height = cfg.logicalSpace.heightPx;
  const margin = 80;
  const inner = width - margin * 2;

  const paperLuma = luminance(truth.brandColors.background);
  const primaryLuma = luminance(truth.brandColors.primary);
  const paper = paperLuma != null && paperLuma >= 180 ? truth.brandColors.background : "#F7F4EF";
  const primary = primaryLuma != null && primaryLuma < 140 ? truth.brandColors.primary : "#1F3A5F";
  const accent = truth.brandColors.secondary || "#C4A574";
  const ink = truth.brandColors.text || "#1A1A1A";
  const muted = truth.brandColors.muted || "#5A6570";

  const businessName = trimmed(truth.wordmark) || trimmed(truth.businessName);
  const headlineFact = trimmed(truth.headline);
  const ctaFact = trimmed(truth.cta);
  const offerName = trimmed(truth.offerName);
  const priceDisplay = trimmed(truth.priceDisplay);
  const wasPrice = trimmed(truth.wasPriceDisplay);
  const dateWindow = trimmed(truth.dateWindow);
  const body = trimmed(truth.body);
  const phone = trimmed(truth.phone);
  const webDisplay = trimmed(truth.webDisplay);
  const promoteCta = Boolean(
    input.revisionEmphasis?.emphasizeExistingCtaAsHeadline && ctaFact,
  );

  const elements: StudioDesignElement[] = [];
  const logo = truth.materials.find((material) => material.role === "logo");
  let y = 48;

  if (logo) {
    elements.push({
      type: "image",
      id: "logo",
      role: "logo",
      materialId: logo.materialId,
      fit: "contain",
      x: (width - 132) / 2,
      y,
      width: 132,
      height: 132,
    });
    y += 148;
  }

  const wordmarkText = applyPresentationCase(businessName, "upper");
  const wordmarkSize = fitOneLineSize({
    text: wordmarkText,
    width: inner,
    maxSize: 32,
    minSize: 18,
    letterSpacing: 2.2,
    emWidth: 0.62,
  });
  elements.push(
    line({
      id: "wordmark",
      role: "wordmark",
      factId: "businessName",
      text: wordmarkText,
      presentationCase: "upper",
      x: margin,
      y,
      width: inner,
      height: wordmarkSize + 16,
      fontSize: wordmarkSize,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: wordmarkSize < 24 ? 1.2 : 2.2,
      fill: primary,
      maxLines: 1,
    }),
  );
  y += wordmarkSize + 28;

  elements.push({
    type: "figure",
    id: "accent-rule",
    role: "accent_bar",
    subType: "rect",
    fill: accent,
    effectiveHex: accent,
    requiresContent: false,
    decorativePurpose: "Short gold rule under the name. It holds no customer fact.",
    x: (width - 180) / 2,
    y,
    width: 180,
    height: 4,
  });
  y += 36;

  if (promoteCta && ctaFact) {
    const ctaSize = fitOneLineSize({
      text: ctaFact,
      width: inner,
      maxSize: 64,
      minSize: 32,
      letterSpacing: -0.6,
      emWidth: 0.56,
    });
    elements.push(
      line({
        id: "cta-line",
        role: "cta",
        factId: "cta",
        text: ctaFact,
        x: margin,
        y,
        width: inner,
        height: Math.ceil(ctaSize * 1.15),
        fontSize: ctaSize,
        fontWeight: 700,
        lineHeight: 1.05,
        letterSpacing: -0.6,
        fill: primary,
        maxLines: 1,
      }),
    );
    y += Math.ceil(ctaSize * 1.15) + 16;
  }

  if (headlineFact) {
    const headlineSize = fitOneLineSize({
      text: headlineFact,
      width: inner,
      maxSize: promoteCta ? 32 : 56,
      minSize: 22,
      letterSpacing: 0,
      emWidth: 0.56,
    });
    const headlineHeight = Math.ceil(headlineSize * 1.2);
    elements.push(
      line({
        id: "headline-line",
        role: "headline",
        factId: "headline",
        text: headlineFact,
        x: margin,
        y,
        width: inner,
        height: headlineHeight,
        fontSize: headlineSize,
        fontWeight: promoteCta ? 600 : 700,
        lineHeight: 1.15,
        fill: promoteCta ? muted : primary,
        maxLines: 1,
      }),
    );
    y += headlineHeight + 28;
  }

  const panelTop = y;
  const panelX = 64;
  const panelW = width - 128;
  const contentX = panelX + 40;
  const contentW = panelW - 80;
  let innerY = panelTop + 36;
  const panelChildren: StudioDesignElement[] = [];

  if (offerName) {
    const offerText = applyPresentationCase(offerName, "sentence");
    const offerSize = fitOneLineSize({
      text: offerText,
      width: contentW,
      maxSize: 36,
      minSize: 22,
      letterSpacing: 0,
      emWidth: 0.56,
    });
    const offerHeight = Math.ceil(offerSize * 1.25);
    panelChildren.push(
      line({
        id: "offer-name",
        role: "offer",
        factId: "offerName",
        text: offerText,
        presentationCase: "sentence",
        x: contentX,
        y: innerY,
        width: contentW,
        height: offerHeight,
        fontSize: offerSize,
        fontWeight: 600,
        lineHeight: 1.15,
        fill: ink,
        maxLines: 1,
      }),
    );
    innerY += offerHeight + 12;
  }

  if (priceDisplay) {
    const priceSize = fitOneLineSize({
      text: priceDisplay,
      width: contentW,
      maxSize: 84,
      minSize: 48,
      letterSpacing: -1,
      emWidth: 0.56,
    });
    const priceHeight = Math.ceil(priceSize * 1.05);
    panelChildren.push(
      line({
        id: "price",
        role: "price",
        factId: "priceDisplay",
        text: priceDisplay,
        x: contentX,
        y: innerY,
        width: contentW,
        height: priceHeight,
        fontSize: priceSize,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: -1,
        fill: primary,
        maxLines: 1,
      }),
    );
    innerY += priceHeight + 8;
  }

  if (wasPrice) {
    const wasHeight = 40;
    panelChildren.push(
      line({
        id: "was-price",
        role: "was_price",
        factId: "wasPriceDisplay",
        text: wasPrice,
        x: contentX,
        y: innerY,
        width: contentW,
        height: wasHeight,
        fontSize: 26,
        fontWeight: 400,
        lineHeight: 1.2,
        fill: muted,
        maxLines: 1,
      }),
    );
    innerY += wasHeight + 12;
  }

  if (dateWindow) {
    const dateText = applyPresentationCase(dateWindow, "upper");
    const dateSize = fitOneLineSize({
      text: dateText,
      width: contentW,
      maxSize: 22,
      minSize: 16,
      letterSpacing: 1.6,
      emWidth: 0.62,
    });
    const dateHeight = Math.ceil(dateSize * 1.3);
    panelChildren.push(
      line({
        id: "dates",
        role: "dates",
        factId: "dateWindow",
        text: dateText,
        presentationCase: "upper",
        x: contentX,
        y: innerY,
        width: contentW,
        height: dateHeight,
        fontSize: dateSize,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: 1.6,
        fill: muted,
        maxLines: 1,
      }),
    );
    innerY += dateHeight + 24;
  }

  if (body) {
    const bodySize = 28;
    const bodyHeight = Math.ceil(bodySize * 1.4 * 3);
    panelChildren.push(
      line({
        id: "body-copy",
        role: "body",
        factId: "body",
        text: body,
        x: contentX,
        y: innerY,
        width: contentW,
        height: bodyHeight,
        fontSize: bodySize,
        fontWeight: 400,
        lineHeight: 1.4,
        fill: ink,
        maxLines: 3,
      }),
    );
    innerY += bodyHeight + 20;
  }

  if (!promoteCta && ctaFact) {
    const ctaSize = fitOneLineSize({
      text: ctaFact,
      width: contentW,
      maxSize: 36,
      minSize: 22,
      letterSpacing: 0,
      emWidth: 0.56,
    });
    const ctaHeight = Math.ceil(ctaSize * 1.2);
    panelChildren.push(
      line({
        id: "cta-line",
        role: "cta",
        factId: "cta",
        text: ctaFact,
        x: contentX,
        y: innerY,
        width: contentW,
        height: ctaHeight,
        fontSize: ctaSize,
        fontWeight: 700,
        lineHeight: 1.1,
        fill: primary,
        maxLines: 1,
      }),
    );
    innerY += ctaHeight + 8;
  }

  const phoneSize = phone
    ? fitOneLineSize({
        text: phone,
        width: inner,
        maxSize: 36,
        minSize: 22,
        letterSpacing: 0,
        emWidth: 0.56,
      })
    : 0;
  const phoneBox = phone ? Math.ceil(phoneSize * 1.25) : 0;
  const phoneOnlyBand = Boolean(phone) && !webDisplay;
  const fillFloor = cfg.hollowContainer.minContentHeightShare;
  const footerHeight = phoneOnlyBand
    ? Math.floor(phoneBox / (fillFloor + 0.08))
    : 240;
  const footerTop = height - footerHeight;
  const panelHeight = Math.max(220, innerY - panelTop + 28);
  elements.push({
    type: "figure",
    id: "offer-panel",
    role: "plate",
    subType: "rect",
    fill: "#FFFFFF",
    effectiveHex: "#FFFFFF",
    cornerRadius: 16,
    requiresContent: true,
    x: panelX,
    y: panelTop,
    width: panelW,
    height: panelHeight,
  });
  elements.push(...panelChildren);

  elements.push({
    type: "figure",
    id: "contact-band",
    role: "plate",
    subType: "rect",
    fill: primary,
    effectiveHex: primary,
    requiresContent: true,
    x: 0,
    y: footerTop,
    width,
    height: footerHeight,
  });

  const contactY = phoneOnlyBand
    ? footerTop + Math.round((footerHeight - phoneBox) / 2)
    : footerTop + 44;
  if (phone) {
    elements.push(
      line({
        id: "contact-phone",
        role: "contact_phone",
        factId: "phone",
        text: phone,
        x: margin,
        y: contactY,
        width: inner,
        height: Math.ceil(phoneSize * 1.25),
        fontSize: phoneSize,
        fontWeight: 600,
        lineHeight: 1.2,
        fill: paper,
        maxLines: 1,
      }),
    );
  }
  if (webDisplay) {
    const webSize = fitOneLineSize({
      text: webDisplay,
      width: inner,
      maxSize: 26,
      minSize: 16,
      letterSpacing: 0,
      emWidth: 0.56,
    });
    elements.push(
      line({
        id: "contact-web",
        role: "contact_web",
        factId: "webDisplay",
        text: webDisplay,
        x: margin,
        y: contactY + 96,
        width: inner,
        height: Math.ceil(webSize * 1.3),
        fontSize: webSize,
        fontWeight: 400,
        lineHeight: 1.2,
        fill: paper,
        maxLines: 1,
      }),
    );
  }

  return {
    contractVersion: cfg.documentContractVersion,
    logical: { ...cfg.logicalSpace },
    print: {
      dpi: cfg.print.dpi,
      referenceSheetHeightIn: cfg.print.referenceSheetHeightIn,
    },
    background: paper,
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
