/**
 * Scenario 2 video plate copy — the render source for on-screen video facts.
 */

import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";

export type Scenario2VideoPlateCopy = {
  file: string;
  eyebrow: string;
  line1: string;
  line2?: string;
  line3?: string;
};

export function scenario2VideoPlateCopy(): readonly Scenario2VideoPlateCopy[] {
  return [
    {
      file: "beat-01-brand.png",
      eyebrow: "HARBOR ROAST COFFEE CO.",
      line1: "Autumn launch",
      line2: "Warm. Grounded. Clear.",
    },
    {
      file: "beat-02-offer.png",
      eyebrow: "LIMITED BOX",
      line1: brief.offer.name,
      line2: brief.offer.contentsDisplay,
    },
    {
      file: "beat-03-price.png",
      eyebrow: "LAUNCH WINDOW",
      line1: brief.offer.priceDisplay,
      line2: brief.offer.windowDisplay,
    },
    {
      file: "beat-04-cta.png",
      eyebrow: "SEASONAL LAUNCH",
      line1: brief.cta.label,
      line2: `${brief.offer.priceDisplay} · October 1–31`,
    },
  ];
}

export function scenario2VideoCtaPlateCopy(): Scenario2VideoPlateCopy {
  const plates = scenario2VideoPlateCopy();
  const cta = plates[3];
  if (!cta) throw new Error("SCENARIO_2_CTA_PLATE_MISSING");
  return cta;
}
