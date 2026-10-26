import { FLAGSHIP_SOURCE_REL } from "@/lib/studio-flagship-short-form-edit/source-prep";

import type { ContentPackIntake } from "./intake";

/**
 * Realistic customer: a speaker sending one rights-cleared talking-head
 * and identifying three short segments. The Studio does not search the rest.
 */
export const CONTENT_PACK_CERT_SCENARIO = {
  customer: "Daniel",
  situation:
    "Customer wants three ready-to-post English shorts from one talking-head recording. They mark the exact moments.",
  ctaFirst: "Start at thestudiocompany7.com",
  ctaRevision: "Visit thestudiocompany7.com",
  sourceRelativePath: FLAGSHIP_SOURCE_REL,
} as const;

export function contentPackCertIntake(): ContentPackIntake {
  return {
    skuId: "v2-rtu-short-form-video-edit",
    ctaText: CONTENT_PACK_CERT_SCENARIO.ctaFirst,
    language: "en",
    rightsCleared: true,
    supportedFacts: [
      { key: "speaker_name", value: "Daniel", source: "customer_provided" },
      { key: "favorite_word", value: "cherries", source: "spoken_on_identified_clip" },
      {
        key: "cta",
        value: CONTENT_PACK_CERT_SCENARIO.ctaFirst,
        source: "customer_provided",
      },
    ],
    clips: [
      {
        id: "clip-01-intro",
        label: "Introduce myself",
        sourceRelativePath: FLAGSHIP_SOURCE_REL,
        startSeconds: 2.2,
        endSeconds: 22.2,
        rightsCleared: true,
      },
      {
        id: "clip-02-cherries",
        label: "Favorite English word: cherries",
        sourceRelativePath: FLAGSHIP_SOURCE_REL,
        startSeconds: 85.6,
        endSeconds: 101.5,
        rightsCleared: true,
      },
      {
        id: "clip-03-learned",
        label: "How I learned English",
        sourceRelativePath: FLAGSHIP_SOURCE_REL,
        startSeconds: 142,
        endSeconds: 160.5,
        rightsCleared: true,
      },
    ],
    customerAsksStudioToFindBestMoments: false,
  };
}
