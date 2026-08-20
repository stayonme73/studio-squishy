/**
 * Deterministic four-post social set reasoner.
 * Four square 1024x1024 layouts that differ in hierarchy and layer placement —
 * a coordinated set, never four clones of one template.
 */

import { resolveSocialPostPlate } from "./social-posts-contracts";
import {
  SOCIAL_POSTS_DESIGN_SPEC_VERSION,
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POST_TRUST_ROLE_ANGLE,
  type SocialPostAssetSpec,
  type SocialPostDesignLayer,
  type SocialPostMemberTruth,
  type SocialPostsProjectTruth,
  type SocialPostsQuad,
  type SocialPostsSetSpec,
  type SocialPostTextLayer,
} from "./social-posts-types";

function textLayer(partial: Omit<SocialPostTextLayer, "type">): SocialPostTextLayer {
  return { type: "text", ...partial };
}

/** Purpose / role chrome stays on identity JSON; never paint on customer art. */
function shouldPaintPurposeLabel(
  truth: Pick<SocialPostsProjectTruth, "outputMode">,
): boolean {
  return truth.outputMode !== "customer";
}

const ROLE_ANGLE_TITLES: Record<string, string> = {
  offer_lead: "Offer lead",
  cta_book: "Booking call to action",
  dates_window: "Offer window reminder",
  trust_brand: "Brand trust",
};

export function socialPostAuthorizedPurpose(
  truth: SocialPostsProjectTruth,
  member: SocialPostMemberTruth,
): string {
  const title = ROLE_ANGLE_TITLES[member.roleAngle] ?? member.roleAngle;
  return `${truth.platformLabel} — ${title}`;
}

function purposeLabelContent(
  truth: SocialPostsProjectTruth,
  member: SocialPostMemberTruth,
): string {
  return `Post ${member.orderIndex} of ${SOCIAL_POSTS_EXACT_COUNT} · ${socialPostAuthorizedPurpose(truth, member)} · ${member.roleAngle}`;
}

export function assertSocialPostsRequiredTruth(
  truth: SocialPostsProjectTruth,
): void {
  if (truth.skuId !== "v2-rtu-social-posts") {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: skuId must be v2-rtu-social-posts",
    );
  }
  if (!truth.businessName?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: businessName");
  }
  if (!truth.wordmark?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: wordmark");
  }
  if (!truth.offerName?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: offerName");
  }
  if (!truth.priceDisplay?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: priceDisplay");
  }
  if (!truth.dateWindow?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: dateWindow");
  }
  if (!truth.cta?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: cta");
  }
  if (!truth.phone?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: phone");
  }
  if (!truth.platformLabel?.trim()) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: platformLabel (where the customer will publish)",
    );
  }
  if (
    !Array.isArray(truth.assets) ||
    truth.assets.length !== SOCIAL_POSTS_EXACT_COUNT
  ) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: exactly ${SOCIAL_POSTS_EXACT_COUNT} posts required`,
    );
  }

  const seenIds = new Set<string>();
  const seenOrder = new Set<number>();
  for (const member of truth.assets) {
    if (!member.assetId?.trim()) {
      throw new Error(
        "MISSING_REQUIRED_TRUTH: each post requires a semantic assetId",
      );
    }
    if (seenIds.has(member.assetId)) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: duplicate assetId ${member.assetId}`,
      );
    }
    seenIds.add(member.assetId);
    if (![1, 2, 3, 4].includes(member.orderIndex)) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: post ${member.assetId} orderIndex must be 1-4`,
      );
    }
    if (seenOrder.has(member.orderIndex)) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: duplicate orderIndex ${member.orderIndex}`,
      );
    }
    seenOrder.add(member.orderIndex);
    if (!member.roleAngle?.trim()) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: post ${member.assetId} roleAngle required (set variety is truth, not inference)`,
      );
    }
  }

  const angles = new Set(truth.assets.map((m) => m.roleAngle));
  if (angles.size !== SOCIAL_POSTS_EXACT_COUNT) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: each post requires a distinct roleAngle (coordinated set, not clones)",
    );
  }

  if (!truth.materials.some((m) => m.role === "logo")) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }
  if (!truth.dispatchWiringScopeNote?.trim()) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: dispatchWiringScopeNote must be documented on proof truth",
    );
  }
}

type LayoutContext = {
  truth: SocialPostsProjectTruth;
  member: SocialPostMemberTruth;
  logoMaterialId: string;
  width: number;
  height: number;
};

/** Post 1 — offer/price hero. Top colour band, left-aligned price stack. */
function layoutOfferLead(ctx: LayoutContext): SocialPostDesignLayer[] {
  const { truth, member, logoMaterialId: logo, width: W } = ctx;
  const c = truth.brandColors;
  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} · ${truth.wasPriceDisplay}`
    : truth.priceDisplay;
  const id = member.assetId;

  return [
    {
      type: "shape",
      id: `${id}-band`,
      role: "offer_band",
      x: 0,
      y: 0,
      width: W,
      height: 140,
      fill: c.primary,
    },
    textLayer({
      id: `${id}-purpose`,
      role: "purpose_label",
      content: purposeLabelContent(truth, member),
      x: 56,
      y: 52,
      width: W - 112,
      fontSizePx: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacingPx: 1,
      color: "#F7F4EF",
      align: "left",
    }),
    {
      type: "shape",
      id: `${id}-logo-plate`,
      role: "logo_plate",
      x: 56,
      y: 188,
      width: 150,
      height: 150,
      fill: "#FFFFFF",
      borderRadiusPx: 24,
    },
    {
      type: "image",
      id: `${id}-logo`,
      role: "logo",
      materialId: logo,
      x: 72,
      y: 204,
      width: 118,
      height: 118,
      fit: "contain",
    },
    textLayer({
      id: `${id}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 232,
      y: 202,
      width: W - 288,
      fontSizePx: 34,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${id}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 232,
      y: 252,
      width: W - 288,
      fontSizePx: 18,
      fontWeight: 500,
      lineHeight: 1.25,
      color: c.secondary,
      align: "left",
    }),
    textLayer({
      id: `${id}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 56,
      y: 396,
      width: W - 112,
      fontSizePx: 44,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${id}-price`,
      role: "price",
      content: priceLine,
      x: 56,
      y: 490,
      width: W - 112,
      fontSizePx: 66,
      fontWeight: 700,
      lineHeight: 1.05,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: 56,
      y: 596,
      width: W - 112,
      fontSizePx: 24,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "left",
    }),
    textLayer({
      id: `${id}-body`,
      role: "body",
      content: truth.body,
      x: 56,
      y: 664,
      width: W - 112,
      fontSizePx: 22,
      fontWeight: 400,
      lineHeight: 1.35,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-cta`,
      role: "cta",
      content: truth.cta,
      x: 56,
      y: 776,
      width: W - 112,
      fontSizePx: 28,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${id}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 56,
      y: 834,
      width: W - 112,
      fontSizePx: 24,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 56,
      y: 878,
      width: W - 112,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "left",
    }),
    textLayer({
      id: `${id}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 56,
      y: 950,
      width: W - 112,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "left",
    }),
  ];
}

/** Post 2 — booking CTA emphasis. Centred stack, contact block above the fold. */
function layoutCtaBook(ctx: LayoutContext): SocialPostDesignLayer[] {
  const { truth, member, logoMaterialId: logo, width: W } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;

  return [
    {
      type: "shape",
      id: `${id}-accent`,
      role: "accent_bar",
      x: 0,
      y: 0,
      width: W,
      height: 18,
      fill: c.primary,
    },
    textLayer({
      id: `${id}-purpose`,
      role: "purpose_label",
      content: purposeLabelContent(truth, member),
      x: 64,
      y: 56,
      width: W - 128,
      fontSizePx: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacingPx: 1,
      color: c.secondary,
      align: "center",
    }),
    {
      type: "shape",
      id: `${id}-logo-plate`,
      role: "logo_plate",
      x: 432,
      y: 112,
      width: 160,
      height: 160,
      fill: "#FFFFFF",
      // Rounded rect, not a circle: the approved mark ships on an opaque square
      // field, and a circular plate would expose its corners.
      borderRadiusPx: 28,
    },
    {
      type: "image",
      id: `${id}-logo`,
      role: "logo",
      materialId: logo,
      x: 452,
      y: 132,
      width: 120,
      height: 120,
      fit: "contain",
    },
    textLayer({
      id: `${id}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 64,
      y: 300,
      width: W - 128,
      fontSizePx: 40,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${id}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 64,
      y: 358,
      width: W - 128,
      fontSizePx: 20,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacingPx: 2,
      color: c.secondary,
      align: "center",
    }),
    textLayer({
      id: `${id}-cta`,
      role: "cta",
      content: truth.cta,
      x: 64,
      y: 436,
      width: W - 128,
      fontSizePx: 52,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${id}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 64,
      y: 524,
      width: W - 128,
      fontSizePx: 40,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${id}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 64,
      y: 586,
      width: W - 128,
      fontSizePx: 26,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "center",
    }),
    {
      type: "shape",
      id: `${id}-rule`,
      role: "footer_rule",
      x: 362,
      y: 654,
      width: 300,
      height: 3,
      fill: c.secondary,
    },
    textLayer({
      id: `${id}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 96,
      y: 692,
      width: W - 192,
      fontSizePx: 32,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${id}-price`,
      role: "price",
      content: truth.priceDisplay,
      x: 64,
      y: 748,
      width: W - 128,
      fontSizePx: 38,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${id}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: 64,
      y: 812,
      width: W - 128,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "center",
    }),
    textLayer({
      id: `${id}-headline`,
      role: "headline",
      content: truth.headline,
      x: 96,
      y: 866,
      width: W - 192,
      fontSizePx: 26,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${id}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 96,
      y: 948,
      width: W - 192,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "center",
    }),
  ];
}

/** Post 3 — offer window emphasis. Left rail, banded date block, offer beneath. */
function layoutDatesWindow(ctx: LayoutContext): SocialPostDesignLayer[] {
  const { truth, member, logoMaterialId: logo, width: W, height: H } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;

  return [
    {
      type: "shape",
      id: `${id}-accent`,
      role: "accent_bar",
      x: 0,
      y: 0,
      width: 24,
      height: H,
      fill: c.primary,
    },
    textLayer({
      id: `${id}-purpose`,
      role: "purpose_label",
      content: purposeLabelContent(truth, member),
      x: 72,
      y: 52,
      width: W - 144,
      fontSizePx: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacingPx: 1,
      color: c.secondary,
      align: "left",
    }),
    {
      type: "shape",
      id: `${id}-logo-plate`,
      role: "logo_plate",
      x: 72,
      y: 104,
      width: 132,
      height: 132,
      fill: "#FFFFFF",
      borderRadiusPx: 20,
    },
    {
      type: "image",
      id: `${id}-logo`,
      role: "logo",
      materialId: logo,
      x: 86,
      y: 118,
      width: 104,
      height: 104,
      fit: "contain",
    },
    textLayer({
      id: `${id}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 228,
      y: 120,
      width: W - 300,
      fontSizePx: 32,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${id}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 228,
      y: 168,
      width: W - 300,
      fontSizePx: 18,
      fontWeight: 500,
      lineHeight: 1.25,
      color: c.secondary,
      align: "left",
    }),
    {
      type: "shape",
      id: `${id}-window-band`,
      role: "offer_band",
      x: 72,
      y: 290,
      width: W - 144,
      height: 200,
      fill: c.secondary,
      borderRadiusPx: 18,
    },
    textLayer({
      id: `${id}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: 104,
      y: 330,
      width: W - 208,
      fontSizePx: 50,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-headline`,
      role: "headline",
      content: truth.headline,
      x: 104,
      y: 412,
      width: W - 208,
      fontSizePx: 26,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 72,
      y: 540,
      width: W - 144,
      fontSizePx: 36,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${id}-price`,
      role: "price",
      content: truth.priceDisplay,
      x: 72,
      y: 606,
      width: W - 144,
      fontSizePx: 46,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-body`,
      role: "body",
      content: truth.body,
      x: 72,
      y: 686,
      width: W - 144,
      fontSizePx: 22,
      fontWeight: 400,
      lineHeight: 1.35,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-cta`,
      role: "cta",
      content: truth.cta,
      x: 72,
      y: 786,
      width: W - 144,
      fontSizePx: 26,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${id}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 72,
      y: 842,
      width: W - 144,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "left",
    }),
    textLayer({
      id: `${id}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 72,
      y: 884,
      width: W - 144,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${id}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 72,
      y: 950,
      width: W - 144,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "left",
    }),
  ];
}

/**
 * Post 4 — brand trust. Deliberately omits price/dates/offer name:
 * a brand-only piece must not restate campaign offer facts it is not carrying.
 */
function layoutTrustBrand(ctx: LayoutContext): SocialPostDesignLayer[] {
  const { truth, member, logoMaterialId: logo, width: W } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;

  return [
    {
      type: "shape",
      id: `${id}-plate`,
      role: "plate",
      x: 0,
      y: 0,
      width: W,
      height: 520,
      fill: c.primary,
    },
    textLayer({
      id: `${id}-purpose`,
      role: "purpose_label",
      content: purposeLabelContent(truth, member),
      x: 64,
      y: 52,
      width: W - 128,
      fontSizePx: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacingPx: 1,
      color: "#F7F4EF",
      align: "center",
    }),
    {
      type: "shape",
      id: `${id}-logo-plate`,
      role: "logo_plate",
      x: 412,
      y: 124,
      width: 200,
      height: 200,
      fill: "#FFFFFF",
      borderRadiusPx: 32,
    },
    {
      type: "image",
      id: `${id}-logo`,
      role: "logo",
      materialId: logo,
      x: 442,
      y: 154,
      width: 140,
      height: 140,
      fit: "contain",
    },
    textLayer({
      id: `${id}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 64,
      y: 360,
      width: W - 128,
      fontSizePx: 46,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.background,
      align: "center",
    }),
    textLayer({
      id: `${id}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 64,
      y: 428,
      width: W - 128,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacingPx: 3,
      color: c.secondary,
      align: "center",
    }),
    textLayer({
      id: `${id}-headline`,
      role: "headline",
      content: truth.headline,
      x: 96,
      y: 580,
      width: W - 192,
      fontSizePx: 36,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.text,
      align: "center",
    }),
    {
      type: "shape",
      id: `${id}-rule`,
      role: "footer_rule",
      x: 412,
      y: 654,
      width: 200,
      height: 3,
      fill: c.secondary,
    },
    textLayer({
      id: `${id}-body`,
      role: "body",
      content: truth.body,
      x: 112,
      y: 692,
      width: W - 224,
      fontSizePx: 24,
      fontWeight: 400,
      lineHeight: 1.35,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${id}-cta`,
      role: "cta",
      content: truth.cta,
      x: 64,
      y: 788,
      width: W - 128,
      fontSizePx: 30,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${id}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 64,
      y: 844,
      width: W - 128,
      fontSizePx: 26,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${id}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 64,
      y: 890,
      width: W - 128,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "center",
    }),
    textLayer({
      id: `${id}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 96,
      y: 950,
      width: W - 192,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "center",
    }),
  ];
}

const LAYOUT_BY_ROLE_ANGLE: Record<
  string,
  (ctx: LayoutContext) => SocialPostDesignLayer[]
> = {
  offer_lead: layoutOfferLead,
  cta_book: layoutCtaBook,
  dates_window: layoutDatesWindow,
  [SOCIAL_POST_TRUST_ROLE_ANGLE]: layoutTrustBrand,
};

function reasonSocialPostAsset(
  truth: SocialPostsProjectTruth,
  member: SocialPostMemberTruth,
): SocialPostAssetSpec {
  const plate = resolveSocialPostPlate("cert-square-1024");
  const logo = truth.materials.find((m) => m.role === "logo")!;
  const layout = LAYOUT_BY_ROLE_ANGLE[member.roleAngle];
  if (!layout) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: no proven social layout for roleAngle "${member.roleAngle}". Do not clone another post to fill the slot.`,
    );
  }

  const layers = layout({
    truth,
    member,
    logoMaterialId: logo.materialId,
    width: plate.widthPx,
    height: plate.heightPx,
  });
  const painted = shouldPaintPurposeLabel(truth)
    ? layers
    : layers.filter(
        (l) => !(l.type === "text" && l.role === "purpose_label"),
      );

  return {
    assetId: member.assetId,
    orderIndex: member.orderIndex,
    roleAngle: member.roleAngle,
    authorizedPurpose: socialPostAuthorizedPurpose(truth, member),
    plateId: plate.plateId,
    canvas: { widthPx: plate.widthPx, heightPx: plate.heightPx },
    background: { color: truth.brandColors.background },
    layers: painted,
    outputFormats: ["png", "pdf"],
  };
}

export function reasonSocialPostsSetDeterministic(
  truth: SocialPostsProjectTruth,
): SocialPostsSetSpec {
  assertSocialPostsRequiredTruth(truth);

  const ordered = [...truth.assets].sort((a, b) => a.orderIndex - b.orderIndex);
  const assets = ordered.map((member) =>
    reasonSocialPostAsset(truth, member),
  ) as unknown as SocialPostsQuad<SocialPostAssetSpec>;

  return {
    specVersion: SOCIAL_POSTS_DESIGN_SPEC_VERSION,
    skuId: truth.skuId,
    platformLabel: truth.platformLabel,
    colors: { ...truth.brandColors },
    materials: [...truth.materials],
    sharedCampaign: {
      businessName: truth.businessName,
      wordmark: truth.wordmark,
      offerName: truth.offerName,
      priceDisplay: truth.priceDisplay,
      dateWindow: truth.dateWindow,
      phone: truth.phone,
      webDisplay: truth.webDisplay,
      cta: truth.cta,
    },
    assets,
    reasoningMode: "deterministic_constrained",
  };
}
