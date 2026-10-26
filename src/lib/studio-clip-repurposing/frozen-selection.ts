/**
 * Frozen set for resumed positive live certification.
 * Do not replace a selected clip because another window is easier to render.
 */

export const FROZEN_POSITIVE_SELECTION_IDS = [
  "c-56-423",
  "c-17-127",
  "c-82-641",
] as const;

export const FROZEN_POSITIVE_CLAIMS = [
  "They think a bigger menu looks more impressive.",
  "If a customer is paying real money, it should feel finished.",
  "A button in the wrong place can make the whole page feel awkward.",
] as const;

export const PREFERRED_REVISION_ALTERNATE_ID = "c-3-36" as const;

export const CERTIFICATION_SHARED_CTA = "The Studio" as const;

export const POSITIVE_SOURCE_REL =
  "docs/launch/studio-operating-clip-repurposing-build-1/live-sources/positive-live-source.mp4.mp4" as const;
