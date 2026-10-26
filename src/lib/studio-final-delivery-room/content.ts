import {
  CLIP_549_VALUE_CERT_IDENTITY,
  CLIP_549_VALUE_CERT_SHORTS,
} from "@/lib/studio-549-clip-repurposing-value-delivery/cert-set";
import {
  isClip549PostingCompanion,
  writeClip549PostingCompanion,
} from "@/lib/studio-549-clip-repurposing-value-delivery/companion";
import { scaleClip549ValueLayer } from "@/lib/studio-549-clip-repurposing-value-delivery/copy";
import { clip549PathwayCopy } from "@/lib/studio-549-clip-repurposing-value-delivery/pathway";
import type { Clip549DeliveryIdentity } from "@/lib/studio-549-clip-repurposing-value-delivery/presentation";
import {
  CLIP_DELIVERY_PATHWAY_CLOSING,
  canonicalClipDeliveryPathwayServices,
  type CanonicalPathwayService,
} from "@/lib/studio-canonical-menu-enforcement/final-delivery-pathway";

export type FinalRoomGroupId =
  | "studio"
  | "videos"
  | "captions"
  | "titles"
  | "hashtags"
  | "guide"
  | "support"
  | "pathway"
  | "extras"
  | "files"
  | "feedback";

export type FinalRoomShort = {
  clipId: string;
  fileName: string;
  downloadName: string;
  src: string;
  title: string;
  caption: string;
  hashtags: readonly string[];
  keywords: readonly string[];
  durationLabel: string;
};

export function clip549CustomerShortFileName(index: number): string {
  return `Clip-Repurposing-Short-${String(index + 1).padStart(2, "0")}.mp4`;
}

export type FinalRoomProof = {
  identity: Clip549DeliveryIdentity;
  customerFacing: {
    serviceName: string;
    customerName: string;
  };
  shorts: readonly FinalRoomShort[];
  companionTitle: string;
  companionReminder: string;
  companionOrder: readonly string[];
  companionNotes: readonly string[];
  revision: readonly string[];
  studioCard: {
    kicker: string;
    title: string;
    thanks: readonly string[];
    contactTitle: string;
    contact: readonly string[];
    helpLabel: string;
    helpHref: string;
    boardLabel: string;
    boardHref: string;
    websiteHref: string;
    feedbackTitle: string;
    feedback: readonly string[];
  };
  pathway: Omit<ReturnType<typeof clip549PathwayCopy>, "services"> & {
    services: readonly CanonicalPathwayService[];
  };
  groups: readonly { id: FinalRoomGroupId; label: string; hint: string }[];
};

const layer = scaleClip549ValueLayer({
  delivered: CLIP_549_VALUE_CERT_SHORTS,
  ctaText: CLIP_549_VALUE_CERT_IDENTITY.ctaText,
});

if (!layer.ok) {
  throw new Error(layer.message);
}

const companion = writeClip549PostingCompanion({
  delivered: CLIP_549_VALUE_CERT_SHORTS,
  captions: layer.captions,
  titles: layer.titles,
  discovery: layer.discovery,
});

if (!isClip549PostingCompanion(companion)) {
  throw new Error(companion.message);
}

export const clip549FinalRoomProof: FinalRoomProof = {
  identity: CLIP_549_VALUE_CERT_IDENTITY,
  customerFacing: {
    serviceName: "Clip Repurposing",
    customerName: CLIP_549_VALUE_CERT_IDENTITY.customerName,
  },
  shorts: CLIP_549_VALUE_CERT_SHORTS.map((short, index) => ({
    clipId: short.clipId,
    fileName: short.fileName,
    downloadName: clip549CustomerShortFileName(index),
    src: `/final-delivery-room/shorts/${short.fileName}`,
    title: layer.titles[index]!.text,
    caption: layer.captions[index]!.text,
    hashtags: layer.discovery[index]!.hashtags,
    keywords: layer.discovery[index]!.keywords,
    durationLabel: short.durationLabel,
  })),
  companionTitle: companion.title,
  companionReminder: companion.suggestionReminder,
  companionOrder: CLIP_549_VALUE_CERT_SHORTS.map((_, index) => clip549CustomerShortFileName(index)),
  companionNotes: companion.postingConsiderations,
  revision: [
    "This Clip Repurposing order includes one revision round for the delivered set.",
    "A revision is a correction to the finished shorts or the supporting copy. It is not a new search of the recording.",
    "If something is wrong, name the short by number, such as Short 1 or Clip-Repurposing-Short-01. The Help Center explains Studio policies in complete sentences.",
  ],
  studioCard: {
    kicker: "Your delivery",
    title: "Thank you",
    thanks: [
      "Thank you for trusting The Studio with this recording.",
      `We searched it, chose the strongest standalone moments, and finished this Clip Repurposing set for ${CLIP_549_VALUE_CERT_IDENTITY.customerName}.`,
      "You received five finished vertical shorts, matching captions, suggested titles, suggested tags, and a guide for using the set.",
      "One revision round is included.",
      `This set was delivered on ${CLIP_549_VALUE_CERT_IDENTITY.deliveredOn}.`,
      "Designed cover graphics are not part of this delivery.",
      "The Studio did not post these files for you.",
    ],
    contactTitle: "Contact",
    contact: [
      "The Help Center has Studio policies in complete sentences.",
      "On a live project, you also reach The Studio from your Studio Board. This page does not publish a public email or phone number.",
    ],
    helpLabel: "Open the Help Center",
    helpHref: "/help-center?from=final-delivery-room",
    boardLabel: "Return to Studio Board",
    boardHref: "/studio-board",
    websiteHref: "https://thestudiocompany7.com",
    feedbackTitle: "Feedback",
    feedback: [
      "If a delivered file is wrong, name that file. That is a revision, not a new search of the recording. Support explains what a revision covers.",
      "If this delivery was good and you want to say so, tell The Studio on your project. This card is not a rating form, and it is not a new Review Room.",
    ],
  },
  pathway: {
    ...clip549PathwayCopy(),
    services: canonicalClipDeliveryPathwayServices(),
    closing: CLIP_DELIVERY_PATHWAY_CLOSING,
  },
  groups: [
    { id: "studio", label: "Thank you", hint: "Appreciation, contact, and feedback" },
    { id: "videos", label: "Shorts", hint: "Five finished vertical videos" },
    { id: "captions", label: "Captions", hint: "Matching post copy" },
    { id: "titles", label: "Titles", hint: "Suggested hooks" },
    { id: "hashtags", label: "Tags", hint: "Suggested discovery terms" },
    { id: "guide", label: "Guide", hint: "How to use the set" },
    { id: "support", label: "Support", hint: "Revision and help" },
    { id: "pathway", label: "Pathway", hint: "Other Studio work" },
  ],
};
