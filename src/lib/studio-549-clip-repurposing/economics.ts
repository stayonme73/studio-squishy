import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";
import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";

const DEEPGRAM_USD_PER_MINUTE =
  studioShortFormVideoEditingBuildV1.deepgram.listRateUsdPerMinute;

/** Surrounding review window on the shared $349 finish, minutes. */
const CLIP_REVIEW_MINUTES = pack.discovery.surroundingReviewMaxSeconds / 60;

/** One initial transcribe plus two Quality correction loops. */
const TRANSCRIBE_PASSES_WORST = 1 + 2;

/**
 * Conservative incremental vendor dollars. Studio stock is pinned Pexels
 * (no per-clip license fee). Shared music bed is local. Shotstack is not used.
 * Do not convert $349 / 3 into a Clip unit price.
 */
const STOCK_USD_PER_CLIP_WORST = 0;
const MUSIC_USD_PER_CLIP_WORST = 0;

export type Clip549WorstCaseEconomics = {
  priceCents: 54900;
  priceUsd: 549;
  discoveryMinutes: 60;
  discoveryDeepgramUsd: number;
  clipCount: 5;
  reviewMinutesPerClip: number;
  transcribePassesPerClip: number;
  finishingDeepgramUsd: number;
  stockUsd: number;
  musicUsd: number;
  vendorWorstUsd: number;
  vendorWorstCents: number;
  coversFiveClipWorstCase: boolean;
  qualityReduced: false;
  scopeNarrowed: false;
  priceChanged: false;
  reusedHistorical349or449: false;
  ownerRoutineQa: false;
  note: string;
};

export function estimateClip549WorstCaseEconomics(): Clip549WorstCaseEconomics {
  const discoveryDeepgramUsd = Number(
    (60 * DEEPGRAM_USD_PER_MINUTE).toFixed(4),
  );
  const finishingDeepgramUsd = Number(
    (
      5 *
      CLIP_REVIEW_MINUTES *
      DEEPGRAM_USD_PER_MINUTE *
      TRANSCRIBE_PASSES_WORST
    ).toFixed(4),
  );
  const stockUsd = STOCK_USD_PER_CLIP_WORST * 5;
  const musicUsd = MUSIC_USD_PER_CLIP_WORST * 5;
  const vendorWorstUsd = Number(
    (discoveryDeepgramUsd + finishingDeepgramUsd + stockUsd + musicUsd).toFixed(
      4,
    ),
  );
  return {
    priceCents: freeze.publicPriceCents,
    priceUsd: 549,
    discoveryMinutes: 60,
    discoveryDeepgramUsd,
    clipCount: 5,
    reviewMinutesPerClip: CLIP_REVIEW_MINUTES,
    transcribePassesPerClip: TRANSCRIBE_PASSES_WORST,
    finishingDeepgramUsd,
    stockUsd,
    musicUsd,
    vendorWorstUsd,
    vendorWorstCents: Math.ceil(vendorWorstUsd * 100),
    coversFiveClipWorstCase: vendorWorstUsd < 549,
    qualityReduced: false,
    scopeNarrowed: false,
    priceChanged: false,
    reusedHistorical349or449: false,
    ownerRoutineQa: false,
    note:
      "Five finishes occupy one Heavy job. Vendor cost is Deepgram on a 60-minute search plus per-clip review and two Quality loops. $349 extras and $349/$449 shortfall prices are not used.",
  };
}
