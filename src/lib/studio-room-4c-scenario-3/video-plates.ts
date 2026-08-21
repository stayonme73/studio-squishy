/**
 * Scenario 3 video plate copy — music-led; no spoken narration.
 * Maker plate must not claim a live demonstration.
 */

import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

export type Scenario3VideoPlateCopy = {
  file: string;
  photoAssetId: string;
  eyebrow: string;
  line1: string;
  line2?: string;
  line3?: string;
  spokenSubject: string;
};

export function scenario3VideoPlateCopy(): readonly Scenario3VideoPlateCopy[] {
  return [
    {
      file: "beat-01-intro.png",
      photoAssetId: "moss-thread-studio-interior",
      eyebrow: "MOSS & THREAD STUDIO",
      line1: brief.offer.name,
      line2: brief.offer.windowDisplay,
      spokenSubject: "studio-opening",
    },
    {
      file: "beat-02-product-a.png",
      photoAssetId: "moss-thread-product-textile-1",
      eyebrow: "IN THE STUDIO",
      line1: "View the studio",
      line2: "Shop available textile pieces",
      spokenSubject: "product-story-a",
    },
    {
      file: "beat-02-product-b.png",
      photoAssetId: "moss-thread-product-textile-2",
      eyebrow: "TEXTILE WORK",
      line1: "Shop available pieces",
      line2: "Visit in person",
      spokenSubject: "product-story-b",
    },
    {
      file: "beat-03-maker.png",
      photoAssetId: "moss-thread-maker-at-work",
      eyebrow: "OPEN WEEKEND",
      line1: "Meet the maker",
      line2: "Handmade textile work",
      spokenSubject: "meet-maker",
    },
    {
      file: "beat-04-visit.png",
      photoAssetId: "moss-thread-studio-interior",
      eyebrow: brief.offer.admissionDisplay.toUpperCase(),
      line1: "Sat 10:00 AM–5:00 PM",
      line2: "Sun 11:00 AM–4:00 PM",
      line3: brief.cta.label,
      spokenSubject: "visit-details",
    },
  ];
}

export function scenario3VideoCtaPlateCopy(): Scenario3VideoPlateCopy {
  const plates = scenario3VideoPlateCopy();
  const cta = plates[plates.length - 1];
  if (!cta) throw new Error("SCENARIO_3_CTA_PLATE_MISSING");
  return cta;
}

/** Music-led phrase windows for a ~23s instrumental (seconds). */
export const SCENARIO_3_MUSIC_LED_WINDOWS = [
  { startSeconds: 0, endSeconds: 4.8 },
  { startSeconds: 4.8, endSeconds: 8.8 },
  { startSeconds: 8.8, endSeconds: 12.6 },
  { startSeconds: 12.6, endSeconds: 16.4 },
  { startSeconds: 16.4, endSeconds: 23.0 },
] as const;
