import { STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS } from "@/config/studio-549-clip-repurposing-build-v1";

import type { Clip549DeliveredShort } from "./copy";
import type { Clip549DeliveryIdentity } from "./presentation";

export const CLIP_549_VALUE_CERT_CTA = "Start at thestudiocompany7.com" as const;

export const CLIP_549_VALUE_CERT_IDENTITY: Clip549DeliveryIdentity = {
  customerName: "The Studio Company",
  projectName: "Clip Repurposing — Owner-accepted certification set",
  orderLabel: "CERT-CLIP-549-VALUE-1",
  deliveredOn: "September 30, 2026",
  ctaText: CLIP_549_VALUE_CERT_CTA,
};

export const CLIP_549_VALUE_CERT_SHORTS: readonly Clip549DeliveredShort[] = [
  {
    clipId: "c-56-423",
    fileName: "01-c-56-423.mp4",
    spokenIdea:
      "They think a bigger menu looks more impressive. I do not. I would rather sell 10 things we can do extremely well than 50 things we can barely manage.",
    durationLabel: "28 seconds",
  },
  {
    clipId: "c-17-127",
    fileName: "02-c-17-127.mp4",
    spokenIdea:
      "If a customer is paying real money, it should feel finished. And finished does not mean fancy for no reason. Sometimes simple is better.",
    durationLabel: "19 seconds",
  },
  {
    clipId: "c-82-641",
    fileName: "03-c-82-641.mp4",
    spokenIdea:
      "A button in the wrong place can make the whole page feel awkward. I was building this site. It took me a lot of time because I pay attention to details.",
    durationLabel: "20 seconds",
  },
  {
    clipId: "c-97-723",
    fileName: "04-c-97-723.mp4",
    spokenIdea:
      "No. We're not gonna do that. You know, upselling and you know, if we know you don't need it, we're not gonna offer it to you. Does that make sense? If somebody needs one flyer, we sell them one good flyer. If they need three clips from one long video, then those three clips should be actually be worth posting.",
    durationLabel: "27 seconds",
  },
  {
    clipId: "c-50-377",
    fileName: "05-c-50-377.mp4",
    spokenIdea:
      "Now you have paid twice, and you're irritated. I'm not saying expensive always means good.",
    durationLabel: "20 seconds",
  },
];

export const CLIP_549_VALUE_SOURCE_MP4S = {
  "c-56-423":
    "docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open/delivery/c-56-423.mp4",
  "c-17-127":
    "docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open/delivery/c-17-127.mp4",
  "c-82-641":
    "docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open/delivery/c-82-641.mp4",
  "c-97-723":
    "docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open/delivery/c-97-723.mp4",
  "c-50-377":
    "docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open/delivery/c-50-377.mp4",
} as const;

export function assertCertSetMatchesVideoQuality(): boolean {
  return CLIP_549_VALUE_CERT_SHORTS.every(
    (short, index) => short.clipId === STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS[index],
  );
}
