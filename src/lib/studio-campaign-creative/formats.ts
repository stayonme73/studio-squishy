import type { CampaignFormatId } from "./contracts";

/** US Letter at 300 DPI. 8.5 × 11 in → 2550 × 3300 px. */
export const US_LETTER_300DPI = {
  widthPx: 2550,
  heightPx: 3300,
} as const;

export const US_LETTER_PAGE = {
  widthIn: 8.5,
  heightIn: 11,
  widthPt: 612,
  heightPt: 792,
} as const;

export const CAMPAIGN_FORMAT_CANVASES = {
  social_square: { widthPx: 1080, heightPx: 1080 },
  social_vertical: { widthPx: 1080, heightPx: 1920 },
  print_handout: { widthPx: US_LETTER_300DPI.widthPx, heightPx: US_LETTER_300DPI.heightPx },
} as const satisfies Record<
  CampaignFormatId,
  { widthPx: number; heightPx: number }
>;

export const CAMPAIGN_FORMAT_ORDER: readonly CampaignFormatId[] = [
  "social_square",
  "social_vertical",
  "print_handout",
] as const;
