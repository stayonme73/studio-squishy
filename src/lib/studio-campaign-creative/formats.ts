import type { CampaignFormatId } from "./contracts";

export const CAMPAIGN_FORMAT_CANVASES = {
  social_square: { widthPx: 1080, heightPx: 1080 },
  social_vertical: { widthPx: 1080, heightPx: 1920 },
  print_handout: { widthPx: 1024, heightPx: 1536 },
} as const satisfies Record<
  CampaignFormatId,
  { widthPx: number; heightPx: number }
>;

export const CAMPAIGN_FORMAT_ORDER: readonly CampaignFormatId[] = [
  "social_square",
  "social_vertical",
  "print_handout",
] as const;
