/**
 * Scenario 2 video plate copy — on-screen text follows the spoken subject.
 */

import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";

export type Scenario2VideoPlateCopy = {
  file: string;
  eyebrow: string;
  line1: string;
  line2?: string;
  line3?: string;
  spokenSubject: string;
};

export function scenario2VideoPlateCopy(): readonly Scenario2VideoPlateCopy[] {
  return [
    {
      file: "beat-01-brand.png",
      eyebrow: "HARBOR ROAST COFFEE CO.",
      line1: brief.offer.name,
      line2: "This October",
      spokenSubject: "brand-and-offer",
    },
    {
      file: "beat-02-offer.png",
      eyebrow: "INSIDE THE BOX",
      line1: brief.offer.name,
      line2: brief.offer.contentsDisplay,
      spokenSubject: "contents",
    },
    {
      file: "beat-03-price.png",
      eyebrow: "THIS OCTOBER",
      line1: brief.offer.priceDisplay,
      line2: brief.offer.windowDisplay,
      spokenSubject: "price-and-dates",
    },
    {
      file: "beat-04-cta.png",
      eyebrow: "THIS OCTOBER",
      line1: brief.cta.label,
      line2: brief.cta.bookingUrl,
      line3: brief.offer.priceDisplay,
      spokenSubject: "purchase-action",
    },
  ];
}

export function scenario2VideoCtaPlateCopy(): Scenario2VideoPlateCopy {
  const plates = scenario2VideoPlateCopy();
  const cta = plates[3];
  if (!cta) throw new Error("SCENARIO_2_CTA_PLATE_MISSING");
  return cta;
}
