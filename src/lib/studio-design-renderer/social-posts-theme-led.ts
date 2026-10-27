/**
 * Theme-led four-post social set. Posts carry the customer's theme, core
 * message, its three steps, and the wordmark. No price, dates, contact, or
 * call to action appears unless the customer supplied it.
 */

import {
  assertThemeLedCampaignTruth,
  themeLedCopyPlan,
  themeLedInventedCtaFinding,
  themeLedRepetitionFinding,
  themeLedStatement,
  themeLedUnsuppliedFactLeak,
} from "./theme-led-campaign";
import {
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POST_THEME_LED_ROLE_ANGLES,
  type SocialPostAssetSpec,
  type SocialPostCaption,
  type SocialPostDesignLayer,
  type SocialPostMemberTruth,
  type SocialPostOrderIndex,
  type SocialPostsProjectTruth,
  type SocialPostsQuad,
  type SocialPostTextLayer,
} from "./social-posts-types";

export function isThemeLedSocialPostsTruth(truth: SocialPostsProjectTruth): boolean {
  return truth.contentMode === "theme_led";
}

export function themeLedSocialPostMembers(): SocialPostsQuad<SocialPostMemberTruth> {
  return SOCIAL_POST_THEME_LED_ROLE_ANGLES.map((roleAngle, index) => {
    const orderIndex = (index + 1) as SocialPostOrderIndex;
    return { assetId: `social-post-${orderIndex}`, orderIndex, roleAngle };
  }) as unknown as SocialPostsQuad<SocialPostMemberTruth>;
}

export function assertThemeLedSocialPostsTruth(truth: SocialPostsProjectTruth): void {
  assertThemeLedCampaignTruth(truth.themeLed);
  const angles = new Set(truth.assets.map((member) => member.roleAngle));
  for (const angle of SOCIAL_POST_THEME_LED_ROLE_ANGLES) {
    if (!angles.has(angle)) {
      throw new Error(`MISSING_REQUIRED_TRUTH: theme-led set requires the ${angle} post`);
    }
  }
  const leak = themeLedUnsuppliedFactLeak(
    [truth.themeLed.theme, truth.themeLed.coreMessage, truth.cta].join(" "),
    truth,
  );
  if (leak) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: theme-led copy carries a ${leak} the customer did not supply as a fact`,
    );
  }
}

function text(partial: Omit<SocialPostTextLayer, "type">): SocialPostTextLayer {
  return { type: "text", ...partial };
}

type ThemeLayoutContext = {
  truth: SocialPostsProjectTruth;
  member: SocialPostMemberTruth;
  width: number;
  height: number;
};

function copyOf(truth: SocialPostsProjectTruth) {
  const plan = themeLedCopyPlan({ theme: truth.themeLed!, wordmark: truth.wordmark, cta: truth.cta });
  return { ...plan, theme: plan.statement };
}

/** Customer-supplied optional facts from intake — must appear on-artifact when present (design-quality tokens). */
export function themeLedCustomerSuppliedFactsLine(truth: SocialPostsProjectTruth): string | null {
  if (!truth.themeLed) return null;
  const statement = themeLedStatement(truth.themeLed.theme).trim();
  const body = truth.body.trim();
  if (!body || body === statement) return null;
  if (body.startsWith(statement)) {
    const facts = body.slice(statement.length).trim();
    return facts || null;
  }
  return body;
}

function supportLayer(
  id: string,
  content: string | null,
  partial: Omit<SocialPostTextLayer, "type" | "id" | "role" | "content">,
): SocialPostDesignLayer[] {
  if (!content) return [];
  return [text({ id: `${id}-body`, role: "body", content, ...partial })];
}

function ctaLayer(
  truth: SocialPostsProjectTruth,
  id: string,
  y: number,
  align: SocialPostTextLayer["align"],
): SocialPostDesignLayer[] {
  if (!truth.cta.trim()) return [];
  return [
    text({
      id: `${id}-cta`,
      role: "cta",
      content: truth.cta.trim(),
      x: 72,
      y,
      width: 880,
      fontSizePx: 30,
      fontWeight: 700,
      lineHeight: 1.2,
      color: truth.brandColors.primary,
      align,
    }),
  ];
}

function themeLedHeroHeadlineTypography(truth: SocialPostsProjectTruth): {
  fontSizePx: number;
  fontWeight: 600 | 700;
} {
  const note = truth.revisionInstruction?.trim() ?? "";
  if (/headline|tone|softer|less salesy|warmer/i.test(note)) {
    return { fontSizePx: 50, fontWeight: 600 };
  }
  return { fontSizePx: 56, fontWeight: 700 };
}

/** Post 1 — the whole idea: wordmark band, core message, theme. */
function layoutThemeHero(ctx: ThemeLayoutContext): SocialPostDesignLayer[] {
  const { truth, member, width: W } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;
  const copy = copyOf(truth);
  const headlineType = themeLedHeroHeadlineTypography(truth);
  return [
    { type: "shape", id: `${id}-band`, role: "offer_band", x: 0, y: 0, width: W, height: 200, fill: c.primary },
    text({ id: `${id}-wordmark`, role: "wordmark", content: truth.wordmark, x: 72, y: 72, width: W - 144, fontSizePx: 46, fontWeight: 700, lineHeight: 1.15, letterSpacingPx: 1, color: c.background, align: "left" }),
    text({ id: `${id}-headline`, role: "headline", content: copy.core, x: 72, y: 268, width: W - 144, fontSizePx: headlineType.fontSizePx, fontWeight: headlineType.fontWeight, lineHeight: 1.15, color: c.primary, align: "left" }),
    { type: "shape", id: `${id}-rule`, role: "footer_rule", x: 72, y: 584, width: 180, height: 6, fill: c.secondary },
    text({ id: `${id}-body`, role: "body", content: copy.theme, x: 72, y: 632, width: W - 144, fontSizePx: 28, fontWeight: 400, lineHeight: 1.4, color: c.text, align: "left" }),
    ...supportLayer(id, themeLedCustomerSuppliedFactsLine(truth), {
      x: 72,
      y: 720,
      width: W - 144,
      fontSizePx: 24,
      fontWeight: 400,
      lineHeight: 1.35,
      color: c.muted,
      align: "left",
    }),
    ...ctaLayer(truth, id, 880, "left"),
  ];
}

/** Post 2 — first step large on a left rail, one supporting line of its own. */
function layoutThemeStepFirst(ctx: ThemeLayoutContext): SocialPostDesignLayer[] {
  const { truth, member, width: W, height: H } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;
  const copy = copyOf(truth);
  return [
    { type: "shape", id: `${id}-rail`, role: "accent_bar", x: 0, y: 0, width: 28, height: H, fill: c.primary },
    text({ id: `${id}-eyebrow`, role: "eyebrow", content: "Step 1 of 3", x: 100, y: 180, width: W - 200, fontSizePx: 26, fontWeight: 600, lineHeight: 1.2, letterSpacingPx: 3, color: c.secondary, align: "left" }),
    text({ id: `${id}-headline`, role: "headline", content: copy.beats[0], x: 100, y: 240, width: W - 200, fontSizePx: 84, fontWeight: 700, lineHeight: 1.1, color: c.primary, align: "left" }),
    { type: "shape", id: `${id}-rule`, role: "footer_rule", x: 100, y: 480, width: 240, height: 6, fill: c.secondary },
    ...supportLayer(id, copy.stepSupport[0], { x: 100, y: 528, width: W - 200, fontSizePx: 40, fontWeight: 500, lineHeight: 1.35, color: c.text, align: "left" }),
    text({ id: `${id}-wordmark`, role: "wordmark", content: truth.wordmark, x: 100, y: 820, width: W - 200, fontSizePx: 36, fontWeight: 700, lineHeight: 1.15, color: c.primary, align: "left" }),
  ];
}

/** Post 3 — second step centred inside a gold band, one supporting line of its own. */
function layoutThemeStepSecond(ctx: ThemeLayoutContext): SocialPostDesignLayer[] {
  const { truth, member, width: W } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;
  const copy = copyOf(truth);
  return [
    { type: "shape", id: `${id}-accent`, role: "accent_bar", x: 0, y: 0, width: W, height: 20, fill: c.primary },
    text({ id: `${id}-eyebrow`, role: "eyebrow", content: "Step 2 of 3", x: 72, y: 170, width: W - 144, fontSizePx: 26, fontWeight: 600, lineHeight: 1.2, letterSpacingPx: 3, color: c.primary, align: "center" }),
    { type: "shape", id: `${id}-band`, role: "offer_band", x: 72, y: 240, width: W - 144, height: 300, fill: c.secondary, borderRadiusPx: 28 },
    text({ id: `${id}-headline`, role: "headline", content: copy.beats[1], x: 112, y: 312, width: W - 224, fontSizePx: 68, fontWeight: 700, lineHeight: 1.1, color: c.text, align: "center" }),
    ...supportLayer(id, copy.stepSupport[1], { x: 112, y: 604, width: W - 224, fontSizePx: 36, fontWeight: 500, lineHeight: 1.35, color: c.text, align: "center" }),
    text({ id: `${id}-wordmark`, role: "wordmark", content: truth.wordmark, x: 72, y: 830, width: W - 144, fontSizePx: 36, fontWeight: 700, lineHeight: 1.15, color: c.primary, align: "center" }),
  ];
}

/** Post 4 — brand close: wordmark plate carrying the third step, one closing line beneath. */
function layoutThemeBrandClose(ctx: ThemeLayoutContext): SocialPostDesignLayer[] {
  const { truth, member, width: W } = ctx;
  const c = truth.brandColors;
  const id = member.assetId;
  const copy = copyOf(truth);
  return [
    { type: "shape", id: `${id}-plate`, role: "plate", x: 0, y: 0, width: W, height: 600, fill: c.primary },
    text({ id: `${id}-wordmark`, role: "wordmark", content: truth.wordmark, x: 72, y: 140, width: W - 144, fontSizePx: 76, fontWeight: 700, lineHeight: 1.1, color: c.background, align: "center" }),
    text({ id: `${id}-eyebrow`, role: "eyebrow", content: "Step 3 of 3", x: 72, y: 290, width: W - 144, fontSizePx: 26, fontWeight: 600, lineHeight: 1.2, letterSpacingPx: 3, color: c.secondary, align: "center" }),
    text({ id: `${id}-headline`, role: "headline", content: copy.beats[2], x: 92, y: 352, width: W - 184, fontSizePx: 52, fontWeight: 700, lineHeight: 1.15, color: c.background, align: "center" }),
    ...(copy.stepSupport[2]
      ? [
          { type: "shape" as const, id: `${id}-rule`, role: "footer_rule" as const, x: (W - 160) / 2, y: 730, width: 160, height: 6, fill: c.secondary },
          ...supportLayer(id, copy.stepSupport[2], { x: 92, y: 770, width: W - 184, fontSizePx: 44, fontWeight: 700, lineHeight: 1.2, color: c.primary, align: "center" }),
        ]
      : []),
    ...ctaLayer(truth, id, 900, "center"),
  ];
}

export const THEME_LED_SOCIAL_LAYOUTS: Record<string, (ctx: ThemeLayoutContext) => SocialPostDesignLayer[]> = {
  theme_hero: layoutThemeHero,
  theme_step_first: layoutThemeStepFirst,
  theme_step_second: layoutThemeStepSecond,
  theme_brand_close: layoutThemeBrandClose,
};

const THEME_LED_PURPOSE: Record<string, string> = {
  theme_hero: "Theme hero",
  theme_step_first: "First customer step",
  theme_step_second: "Second customer step",
  theme_brand_close: "Brand close with third step",
};

export function themeLedSocialPostPurpose(
  truth: SocialPostsProjectTruth,
  member: SocialPostMemberTruth,
): string {
  return `${truth.platformLabel} — ${THEME_LED_PURPOSE[member.roleAngle] ?? member.roleAngle}`;
}

function themeCaption(truth: SocialPostsProjectTruth, roleAngle: string): string {
  const index = SOCIAL_POST_THEME_LED_ROLE_ANGLES.indexOf(
    roleAngle as (typeof SOCIAL_POST_THEME_LED_ROLE_ANGLES)[number],
  );
  if (index < 0) {
    throw new Error(`CAPTION_FAILURE: no theme-led caption for roleAngle "${roleAngle}"`);
  }
  return copyOf(truth).captions[index]!;
}

function paintedLines(asset: SocialPostAssetSpec): string[] {
  return asset.layers.flatMap((layer) => (layer.type === "text" ? [layer.content] : []));
}

export function reasonThemeLedSocialPostCaptions(
  truth: SocialPostsProjectTruth,
  assets: readonly SocialPostAssetSpec[],
): SocialPostsQuad<SocialPostCaption> {
  if (assets.length !== SOCIAL_POSTS_EXACT_COUNT) {
    throw new Error(
      `CAPTION_FAILURE: captions require exactly ${SOCIAL_POSTS_EXACT_COUNT} posts, received ${assets.length}`,
    );
  }
  return [...assets]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((asset) => ({
      captionId: `caption-${asset.orderIndex}`,
      assetId: asset.assetId,
      orderIndex: asset.orderIndex,
      text: themeCaption(truth, asset.roleAngle),
    })) as unknown as SocialPostsQuad<SocialPostCaption>;
}

/** Theme-led set rules: wordmark everywhere, the full message and every step present, nothing unsupplied. */
export function evaluateThemeLedSocialSet(input: {
  truth: SocialPostsProjectTruth;
  assets: readonly SocialPostAssetSpec[];
  declaredTextByAsset: Record<string, string>;
  captions: readonly SocialPostCaption[];
}): { ok: true } | { ok: false; code: "SET_CONSISTENCY_FAILURE" | "CAPTION_FAILURE"; message: string } {
  const copy = copyOf(input.truth);
  const allText = input.assets.map((a) => input.declaredTextByAsset[a.assetId] ?? "").join("\n");
  for (const asset of input.assets) {
    const painted = input.declaredTextByAsset[asset.assetId] ?? "";
    if (!painted.includes(input.truth.wordmark)) {
      return { ok: false, code: "SET_CONSISTENCY_FAILURE", message: `Post ${asset.assetId} missing the wordmark` };
    }
    const leak = themeLedUnsuppliedFactLeak(painted, input.truth);
    if (leak) {
      return { ok: false, code: "SET_CONSISTENCY_FAILURE", message: `Post ${asset.assetId} paints a ${leak} the customer did not supply` };
    }
    const invented = themeLedInventedCtaFinding(painted, input.truth.cta);
    if (invented) {
      return { ok: false, code: "SET_CONSISTENCY_FAILURE", message: `Post ${asset.assetId} paints a call to action ("${invented}") the customer left blank` };
    }
    if (!input.truth.cta.trim() && asset.layers.some((l) => l.type === "text" && l.role === "cta")) {
      return { ok: false, code: "SET_CONSISTENCY_FAILURE", message: `Post ${asset.assetId} paints a call to action the customer left blank` };
    }
  }
  for (const required of [copy.core, copy.theme, ...copy.beats]) {
    if (!allText.includes(required)) {
      return { ok: false, code: "SET_CONSISTENCY_FAILURE", message: `Set is missing customer wording: "${required}"` };
    }
  }
  const repetition = themeLedRepetitionFinding(
    [
      ...input.assets.map((asset) => ({ id: asset.assetId, lines: paintedLines(asset) })),
      ...input.captions.map((caption) => ({ id: caption.captionId, lines: [caption.text] })),
    ],
    copy.core,
    copy.beats,
  );
  if (repetition) {
    return { ok: false, code: "SET_CONSISTENCY_FAILURE", message: `Repeated copy: ${repetition}` };
  }
  for (const caption of input.captions) {
    const post = input.assets.find((asset) => asset.assetId === caption.assetId);
    if (post && paintedLines(post).some((line) => line.length >= 40 && caption.text.includes(line))) {
      return { ok: false, code: "CAPTION_FAILURE", message: `Caption ${caption.captionId} transcribes its post instead of adding to it` };
    }
    const invented = themeLedInventedCtaFinding(caption.text, input.truth.cta);
    if (invented) {
      return { ok: false, code: "CAPTION_FAILURE", message: `Caption ${caption.captionId} adds a call to action ("${invented}") the customer left blank` };
    }
    if (!caption.text.includes(input.truth.wordmark)) {
      return { ok: false, code: "CAPTION_FAILURE", message: `Caption ${caption.captionId} does not name ${input.truth.wordmark}` };
    }
    const leak = themeLedUnsuppliedFactLeak(caption.text, input.truth);
    if (leak) {
      return { ok: false, code: "CAPTION_FAILURE", message: `Caption ${caption.captionId} states a ${leak} the customer did not supply` };
    }
  }
  return { ok: true };
}
