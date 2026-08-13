/**
 * Deterministic Launch Set reasoner for sm-001 (N ∈ {4,5,6}).
 *
 * Members 1–4 reuse the sealed social-posts reasoner (proven layout family) via a
 * temporary social truth — the sealed module is read, never modified. Members 5–6
 * are Launch Set extensions with their own hierarchy: proof point and soft close
 * are not clones of the first four.
 */

import { resolveSm001ExecutablePlate } from "./sm-001-contracts";
import { assertPlannedPostCountLocked } from "./sm-001-n-select";
import {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_DESIGN_SPEC_VERSION,
  SM_001_LAYOUT_TEMPLATES,
  SM_001_PLANNED_POST_COUNTS,
  SM_001_SQUARE_PLATE,
  type Sm001AssetSpec,
  type Sm001DesignLayer,
  type Sm001LayoutTemplate,
  type Sm001MemberTruth,
  type Sm001PlateId,
  type Sm001ProjectTruth,
  type Sm001SetSpec,
} from "./sm-001-types";
import { reasonSocialPostsSetDeterministic } from "./social-posts-reason";
import {
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  type SocialPostAssetSpec,
  type SocialPostDesignLayer,
  type SocialPostMemberTruth,
  type SocialPostsProjectTruth,
  type SocialPostsQuad,
} from "./social-posts-types";

/** Layout templates fulfilled by the sealed social reasoner. */
export const SM_001_SOCIAL_REUSED_TEMPLATES = [
  "offer_lead",
  "cta_book",
  "dates_window",
  "trust_brand",
] as const;

/** Launch Set extensions implemented natively for sm-001. */
export const SM_001_EXTENSION_TEMPLATES = ["proof_point", "soft_close"] as const;

/** The one layout template allowed to omit campaign price/offer facts on-asset. */
export const SM_001_BRAND_ONLY_TEMPLATE = "trust_brand" as const;

const LAYOUT_TEMPLATE_TITLES: Record<Sm001LayoutTemplate, string> = {
  offer_lead: "Offer lead",
  cta_book: "Booking call to action",
  dates_window: "Offer window reminder",
  trust_brand: "Brand trust",
  proof_point: "Proof point",
  soft_close: "Soft close reminder",
};

export function sm001AuthorizedPurpose(
  truth: Pick<Sm001ProjectTruth, "platformLabel">,
  member: Pick<Sm001MemberTruth, "layoutTemplate">,
): string {
  const title =
    LAYOUT_TEMPLATE_TITLES[member.layoutTemplate] ?? member.layoutTemplate;
  return `${truth.platformLabel} — ${title}`;
}

function sm001PurposeLabelContent(
  truth: Sm001ProjectTruth,
  member: Sm001MemberTruth,
): string {
  return `Post ${member.orderIndex} of ${truth.plannedPostCount} · ${sm001AuthorizedPurpose(truth, member)} · ${member.layoutTemplate}`;
}

export function assertSm001RequiredTruth(truth: Sm001ProjectTruth): void {
  if (truth.skuId !== DESIGN_RENDERER_SM_001_SKU) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: skuId must be ${DESIGN_RENDERER_SM_001_SKU}`,
    );
  }
  if (!truth.businessName?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: businessName");
  }
  if (!truth.wordmark?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: wordmark");
  }
  if (!truth.descriptor?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: descriptor");
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
  if (!truth.headline?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: headline");
  }
  if (!truth.body?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: body");
  }
  if (!truth.platformLabel?.trim()) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: platformLabel (where the customer will publish)",
    );
  }
  if (!truth.proofScopeNote?.trim()) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: proofScopeNote must be documented on proof truth",
    );
  }
  if (!truth.timingConstraints) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: timingConstraints (date governance is authoritative, even when empty)",
    );
  }

  if (
    !(SM_001_PLANNED_POST_COUNTS as readonly number[]).includes(
      truth.plannedPostCount,
    )
  ) {
    throw new Error(
      `INVALID_PLANNED_POST_COUNT: ${truth.plannedPostCount} is outside {4,5,6}`,
    );
  }
  assertPlannedPostCountLocked(truth);

  if (!Array.isArray(truth.assets)) {
    throw new Error("MISSING_REQUIRED_TRUTH: assets");
  }
  if (truth.assets.length !== truth.plannedPostCount) {
    throw new Error(
      `COUNT_MISMATCH: plannedPostCount=${truth.plannedPostCount} but ${truth.assets.length} members declared — never pad with phantoms and never shrink to fit`,
    );
  }

  const seenIds = new Set<string>();
  const seenOrder = new Set<number>();
  const seenTemplates = new Set<string>();
  for (const member of truth.assets) {
    if (!member.assetId?.trim()) {
      throw new Error(
        "MISSING_REQUIRED_TRUTH: each post requires a durable assetId",
      );
    }
    if (seenIds.has(member.assetId)) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: duplicate assetId ${member.assetId}`,
      );
    }
    seenIds.add(member.assetId);
    if (
      !Number.isInteger(member.orderIndex) ||
      member.orderIndex < 1 ||
      member.orderIndex > truth.plannedPostCount
    ) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: post ${member.assetId} orderIndex must be 1-${truth.plannedPostCount}`,
      );
    }
    if (seenOrder.has(member.orderIndex)) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: duplicate orderIndex ${member.orderIndex}`,
      );
    }
    seenOrder.add(member.orderIndex);
    if (member.assetId !== `social-post-${member.orderIndex}`) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: post ${member.assetId} must use durable id social-post-${member.orderIndex}`,
      );
    }
    if (
      !(SM_001_LAYOUT_TEMPLATES as readonly string[]).includes(
        member.layoutTemplate,
      )
    ) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: post ${member.assetId} has unknown layoutTemplate "${member.layoutTemplate}"`,
      );
    }
    if (seenTemplates.has(member.layoutTemplate)) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: duplicate layoutTemplate ${member.layoutTemplate} (coordinated set, not clones)`,
      );
    }
    seenTemplates.add(member.layoutTemplate);
  }

  if (!truth.materials.some((m) => m.role === "logo")) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }
}

type Sm001ResolvedPlate = {
  plateId: Sm001PlateId;
  widthPx: number;
  heightPx: number;
};

type Sm001LayoutContext = {
  truth: Sm001ProjectTruth;
  member: Sm001MemberTruth;
  logoMaterialId: string;
  width: number;
  height: number;
};

/**
 * Member 5 — proof point. Editorial top with right-aligned label, inset offer
 * band carrying price + prior price, contact rail beneath. Left-aligned body
 * hierarchy inverted from the offer-lead hero.
 */
function layoutProofPoint(ctx: Sm001LayoutContext): Sm001DesignLayer[] {
  const { truth, member, logoMaterialId: logo, width: W } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;
  const proofLine = truth.wasPriceDisplay
    ? `${truth.wasPriceDisplay} · ${truth.body}`
    : truth.body;

  return [
    {
      type: "shape",
      id: `${id}-accent`,
      role: "accent_bar",
      x: 0,
      y: 0,
      width: W,
      height: 10,
      fill: c.secondary,
    },
    {
      type: "text",
      id: `${id}-purpose`,
      role: "purpose_label",
      content: sm001PurposeLabelContent(truth, member),
      x: 64,
      y: 40,
      width: W - 128,
      fontSizePx: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.secondary,
      align: "right",
    },
    {
      type: "shape",
      id: `${id}-logo-plate`,
      role: "logo_plate",
      x: 820,
      y: 96,
      width: 140,
      height: 140,
      fill: "#FFFFFF",
      borderRadiusPx: 22,
    },
    {
      type: "image",
      id: `${id}-logo`,
      role: "logo",
      materialId: logo,
      x: 836,
      y: 112,
      width: 108,
      height: 108,
    },
    {
      type: "text",
      id: `${id}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 64,
      y: 110,
      width: 720,
      fontSizePx: 38,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 64,
      y: 162,
      width: 720,
      fontSizePx: 18,
      fontWeight: 500,
      lineHeight: 1.25,
      color: c.secondary,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-headline`,
      role: "headline",
      content: truth.headline,
      x: 64,
      y: 248,
      width: W - 128,
      fontSizePx: 40,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.text,
      align: "left",
    },
    {
      type: "shape",
      id: `${id}-offer-band`,
      role: "offer_band",
      x: 64,
      y: 352,
      width: W - 128,
      height: 216,
      fill: c.primary,
      borderRadiusPx: 20,
    },
    {
      type: "text",
      id: `${id}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 104,
      y: 384,
      width: W - 208,
      fontSizePx: 30,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.background,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-price`,
      role: "price",
      content: truth.priceDisplay,
      x: 104,
      y: 430,
      width: W - 208,
      fontSizePx: 58,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.background,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-body`,
      role: "body",
      content: proofLine,
      x: 104,
      y: 506,
      width: W - 208,
      fontSizePx: 20,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.secondary,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: 64,
      y: 604,
      width: W - 128,
      fontSizePx: 26,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-cta`,
      role: "cta",
      content: truth.cta,
      x: 64,
      y: 668,
      width: 620,
      fontSizePx: 32,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 64,
      y: 726,
      width: 620,
      fontSizePx: 26,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.text,
      align: "left",
    },
    {
      type: "text",
      id: `${id}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 64,
      y: 770,
      width: 720,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "left",
    },
    {
      type: "shape",
      id: `${id}-rule`,
      role: "footer_rule",
      x: 64,
      y: 892,
      width: W - 128,
      height: 3,
      fill: c.secondary,
    },
    {
      type: "text",
      id: `${id}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 64,
      y: 942,
      width: W - 128,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "left",
    },
  ];
}

/**
 * Member 6 — soft close. Bottom-weighted: quiet brand top on the ivory field,
 * closing invitation and contact block on a full-width lower plate. Inverted
 * plate position relative to the brand-trust member.
 */
function layoutSoftClose(ctx: Sm001LayoutContext): Sm001DesignLayer[] {
  const { truth, member, logoMaterialId: logo, width: W, height: H } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;

  return [
    {
      type: "shape",
      id: `${id}-plate`,
      role: "plate",
      x: 0,
      y: 560,
      width: W,
      height: H - 560,
      fill: c.primary,
    },
    {
      type: "text",
      id: `${id}-purpose`,
      role: "purpose_label",
      content: sm001PurposeLabelContent(truth, member),
      x: 64,
      y: 44,
      width: W - 128,
      fontSizePx: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.secondary,
      align: "center",
    },
    {
      type: "shape",
      id: `${id}-logo-plate`,
      role: "logo_plate",
      x: 452,
      y: 96,
      width: 120,
      height: 120,
      fill: "#FFFFFF",
      borderRadiusPx: 20,
    },
    {
      type: "image",
      id: `${id}-logo`,
      role: "logo",
      materialId: logo,
      x: 468,
      y: 112,
      width: 88,
      height: 88,
    },
    {
      type: "text",
      id: `${id}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 64,
      y: 240,
      width: W - 128,
      fontSizePx: 36,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 64,
      y: 292,
      width: W - 128,
      fontSizePx: 18,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-headline`,
      role: "headline",
      content: truth.headline,
      x: 128,
      y: 358,
      width: W - 256,
      fontSizePx: 34,
      fontWeight: 600,
      lineHeight: 1.25,
      color: c.text,
      align: "center",
    },
    {
      type: "shape",
      id: `${id}-rule`,
      role: "footer_rule",
      x: 412,
      y: 452,
      width: 200,
      height: 3,
      fill: c.secondary,
    },
    {
      type: "text",
      id: `${id}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 96,
      y: 486,
      width: W - 192,
      fontSizePx: 26,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.primary,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-cta`,
      role: "cta",
      content: truth.cta,
      x: 64,
      y: 604,
      width: W - 128,
      fontSizePx: 44,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.background,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-price`,
      role: "price",
      content: truth.priceDisplay,
      x: 64,
      y: 676,
      width: W - 128,
      fontSizePx: 34,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.secondary,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: 64,
      y: 736,
      width: W - 128,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.background,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 64,
      y: 788,
      width: W - 128,
      fontSizePx: 30,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.background,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 64,
      y: 840,
      width: W - 128,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-body`,
      role: "body",
      content: truth.body,
      x: 128,
      y: 886,
      width: W - 256,
      fontSizePx: 20,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.background,
      align: "center",
    },
    {
      type: "text",
      id: `${id}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 96,
      y: 966,
      width: W - 192,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.secondary,
      align: "center",
    },
  ];
}

const SM_001_EXTENSION_LAYOUTS: Record<
  (typeof SM_001_EXTENSION_TEMPLATES)[number],
  (ctx: Sm001LayoutContext) => Sm001DesignLayer[]
> = {
  proof_point: layoutProofPoint,
  soft_close: layoutSoftClose,
};

function isSocialReusedTemplate(
  template: Sm001LayoutTemplate,
): template is (typeof SM_001_SOCIAL_REUSED_TEMPLATES)[number] {
  return (SM_001_SOCIAL_REUSED_TEMPLATES as readonly string[]).includes(
    template,
  );
}

function mapSocialLayerToSm001(layer: SocialPostDesignLayer): Sm001DesignLayer {
  if (layer.type === "shape") {
    return {
      type: "shape",
      id: layer.id,
      role: layer.role,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      fill: layer.fill,
      borderRadiusPx: layer.borderRadiusPx,
    };
  }
  if (layer.type === "image") {
    return {
      type: "image",
      id: layer.id,
      role: "logo",
      materialId: layer.materialId,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
    };
  }
  return {
    type: "text",
    id: layer.id,
    role: layer.role,
    content: layer.content,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    fontSizePx: layer.fontSizePx,
    fontWeight: layer.fontWeight,
    lineHeight: layer.lineHeight,
    color: layer.color,
    align: layer.align,
  };
}

/**
 * Temporary social truth for the sealed reasoner — first four Launch Set members
 * only. The sealed lane keeps its exact-four contract; sm-001 keeps its own N.
 */
function buildTemporarySocialTruth(
  truth: Sm001ProjectTruth,
): SocialPostsProjectTruth {
  const firstFour = [...truth.assets]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .slice(0, 4);
  if (firstFour.length !== 4) {
    throw new Error(
      `COUNT_MISMATCH: Launch Set requires at least four members to reuse the sealed social layout family, found ${firstFour.length}`,
    );
  }
  for (const member of firstFour) {
    if (!isSocialReusedTemplate(member.layoutTemplate)) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: Launch Set members 1-4 must use the proven social layout family, found "${member.layoutTemplate}" at position ${member.orderIndex}`,
      );
    }
  }

  const members = firstFour.map((member) => ({
    assetId: member.assetId,
    orderIndex: member.orderIndex,
    roleAngle: member.layoutTemplate,
  })) as unknown as SocialPostsQuad<SocialPostMemberTruth>;

  return {
    campaignId: truth.campaignId,
    jobId: truth.jobId,
    dispatchId: truth.dispatchId,
    skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
    fixtureId: truth.fixtureId,
    label: truth.label,
    outputMode: truth.outputMode,
    businessName: truth.businessName,
    wordmark: truth.wordmark,
    descriptor: truth.descriptor,
    headline: truth.headline,
    offerName: truth.offerName,
    priceDisplay: truth.priceDisplay,
    wasPriceDisplay: truth.wasPriceDisplay,
    dateWindow: truth.dateWindow,
    body: truth.body,
    cta: truth.cta,
    phone: truth.phone,
    webDisplay: truth.webDisplay,
    webUrl: truth.webUrl,
    disclaimer: truth.disclaimer,
    platformLabel: truth.platformLabel,
    brandColors: { ...truth.brandColors },
    materials: truth.materials.map((m) => ({
      materialId: m.materialId,
      role: m.role,
      relativePath: m.relativePath,
      contentSha256: m.contentSha256,
      approvedIdentitySourceId: m.approvedIdentitySourceId,
    })),
    approvedLogoVariantId: truth.approvedLogoVariantId,
    requiredTextTokens: [...truth.requiredTextTokens],
    prohibitedClaimPatterns: [...truth.prohibitedClaimPatterns],
    assets: members,
    dispatchWiringScopeNote: truth.proofScopeNote,
  };
}

/**
 * Map a sealed social post spec onto an sm-001 member. Purpose text is rewritten
 * so a five- or six-post set never claims "Post 1 of 4".
 */
function mapSocialAssetToSm001(
  truth: Sm001ProjectTruth,
  member: Sm001MemberTruth,
  asset: SocialPostAssetSpec,
  plate: Sm001ResolvedPlate,
): Sm001AssetSpec {
  const purposeContent = sm001PurposeLabelContent(truth, member);
  const layers = asset.layers.map((layer) => {
    const mapped = mapSocialLayerToSm001(layer);
    if (mapped.type === "text" && mapped.role === "purpose_label") {
      return { ...mapped, content: purposeContent };
    }
    return mapped;
  });

  return {
    assetId: member.assetId,
    orderIndex: member.orderIndex,
    layoutTemplate: member.layoutTemplate,
    authorizedPurpose: sm001AuthorizedPurpose(truth, member),
    plateId: plate.plateId,
    canvas: { widthPx: plate.widthPx, heightPx: plate.heightPx },
    background: { color: truth.brandColors.background },
    layers,
    outputFormats: ["png", "pdf"],
  };
}

function reasonSm001ExtensionAsset(
  truth: Sm001ProjectTruth,
  member: Sm001MemberTruth,
  plate: Sm001ResolvedPlate,
): Sm001AssetSpec {
  const logo = truth.materials.find((m) => m.role === "logo");
  if (!logo) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }
  const layout =
    SM_001_EXTENSION_LAYOUTS[
      member.layoutTemplate as (typeof SM_001_EXTENSION_TEMPLATES)[number]
    ];
  if (!layout) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: no Launch Set layout for template "${member.layoutTemplate}". Do not clone another post to fill the slot.`,
    );
  }

  return {
    assetId: member.assetId,
    orderIndex: member.orderIndex,
    layoutTemplate: member.layoutTemplate,
    authorizedPurpose: sm001AuthorizedPurpose(truth, member),
    plateId: plate.plateId,
    canvas: { widthPx: plate.widthPx, heightPx: plate.heightPx },
    background: { color: truth.brandColors.background },
    layers: layout({
      truth,
      member,
      logoMaterialId: logo.materialId,
      width: plate.widthPx,
      height: plate.heightPx,
    }),
    outputFormats: ["png", "pdf"],
  };
}

/**
 * Build the whole Launch Set for the locked plannedPostCount.
 * `plateId` exists so an unauthorized plate request fails closed — the proof
 * executable path is square-only.
 */
export function reasonSm001SetDeterministic(
  truth: Sm001ProjectTruth,
  options?: { plateId?: string },
): Sm001SetSpec {
  assertSm001RequiredTruth(truth);

  const plate = resolveSm001ExecutablePlate(
    options?.plateId ?? SM_001_SQUARE_PLATE.plateId,
  );

  const ordered = [...truth.assets].sort((a, b) => a.orderIndex - b.orderIndex);
  const socialSet = reasonSocialPostsSetDeterministic(
    buildTemporarySocialTruth(truth),
  );
  const socialByAssetId = new Map(
    socialSet.assets.map((asset) => [asset.assetId, asset] as const),
  );

  const assets: Sm001AssetSpec[] = ordered.map((member) => {
    if (isSocialReusedTemplate(member.layoutTemplate)) {
      const reused = socialByAssetId.get(member.assetId);
      if (!reused) {
        throw new Error(
          `RENDER_FAILURE: sealed social reasoner returned no layout for ${member.assetId}`,
        );
      }
      return mapSocialAssetToSm001(truth, member, reused, plate);
    }
    return reasonSm001ExtensionAsset(truth, member, plate);
  });

  if (assets.length !== truth.plannedPostCount) {
    throw new Error(
      `COUNT_MISMATCH: reasoned ${assets.length} posts for plannedPostCount=${truth.plannedPostCount}`,
    );
  }
  for (const asset of assets) {
    if (asset.assetId !== `social-post-${asset.orderIndex}`) {
      throw new Error(
        `COUNT_MISMATCH: reasoned post ${asset.assetId} does not match durable id social-post-${asset.orderIndex}`,
      );
    }
  }

  return {
    specVersion: SM_001_DESIGN_SPEC_VERSION,
    skuId: truth.skuId,
    plannedPostCount: truth.plannedPostCount,
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
