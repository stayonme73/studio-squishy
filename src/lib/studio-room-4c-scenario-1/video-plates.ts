/**
 * Scenario 1 video plate copy — the render source for on-screen video facts.
 */

import { studioRoom4cScenario1CedarLaneV1 as brief } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";

export type Scenario1VideoPlateCopy = {
  file: string;
  eyebrow: string;
  line1: string;
  line2?: string;
  line3?: string;
};

export function scenario1VideoPlateCopy(): readonly Scenario1VideoPlateCopy[] {
  return [
    {
      file: "beat-01-brand.png",
      eyebrow: "CEDAR LANE HOME ORGANIZING",
      line1: "Richmond, VA",
      line2: "Calm. Practical. Clear.",
    },
    {
      file: "beat-02-offer.png",
      eyebrow: "FALL PROMO",
      line1: brief.offer.name,
      line2: "Keep what you use.",
      line3: "Let the rest go.",
    },
    {
      file: "beat-03-dates.png",
      eyebrow: "OPEN WINDOW",
      line1: "September 15",
      line2: "through October 15",
      line3: "2026",
    },
    {
      file: "beat-04-cta.png",
      eyebrow: "BOOK A CONSULT",
      line1: brief.cta.phoneDisplay,
      line2: brief.cta.bookingUrl,
    },
  ];
}

export function scenario1VideoCtaPlateCopy(): Scenario1VideoPlateCopy {
  const plates = scenario1VideoPlateCopy();
  const cta = plates[3];
  if (!cta) throw new Error("SCENARIO_1_CTA_PLATE_MISSING");
  return cta;
}
