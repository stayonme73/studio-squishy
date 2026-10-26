import {
  CLIP_549_VALUE_FORBIDDEN_SERVICES,
  CLIP_549_VALUE_PATHWAY_SKUS,
} from "@/config/studio-549-clip-repurposing-value-delivery-v1";

export type Clip549PathwayService = {
  skuId: (typeof CLIP_549_VALUE_PATHWAY_SKUS)[number];
  name: string;
  priceLabel: string;
  definition: string;
  whatItProvides: string;
  howItMayComplement: string;
  availableNow: true;
};

export const CLIP_549_PATHWAY_SERVICES: readonly Clip549PathwayService[] = [
  {
    skuId: "v2-rtu-short-form-video-edit",
    name: "Short-Form Content Pack",
    priceLabel: "$349",
    definition:
      "This is the service where you point to the moments. You mark up to three clips, or mark each source segment at 45 seconds or less.",
    whatItProvides:
      "The Studio finishes those marked moments as polished 15–30 second shorts, with matching post captions, cover or title graphics, and a simple posting guide for that set.",
    howItMayComplement:
      "If you later have specific moments you already know you want finished, and you do not need The Studio to search a longer recording, this is the service that works from your marks.",
    availableNow: true,
  },
  {
    skuId: "v2-rtu-social-posts",
    name: "Make My Social Media Posts",
    priceLabel: "$99",
    definition:
      "This is a still-graphics service. The Studio makes four coordinated square posts for one campaign or theme, on one agreed platform.",
    whatItProvides:
      "Four PNG graphics, one caption for each post, and a suggested posting order. You upload and post them yourself.",
    howItMayComplement:
      "If a still post is a better fit than a video for one of these ideas, this service makes coordinated stills. It does not edit or repost these shorts.",
    availableNow: true,
  },
  {
    skuId: "v2-rtu-promotion-graphics",
    name: "Make My Campaign Graphics",
    priceLabel: "$79",
    definition:
      "This is a small still-graphics set for one campaign. The Studio makes two coordinated static graphics.",
    whatItProvides:
      "Two finished campaign graphics you can use on a page, a print piece, or a still post. You place them yourself.",
    howItMayComplement:
      "If one of these spoken thoughts also needs a still companion — a simple graphic that sits beside the short — this is the service that makes that still.",
    availableNow: true,
  },
  {
    skuId: "v2-rtu-email-kit",
    name: "Make My Email Campaign Kit",
    priceLabel: "$129",
    definition:
      "This is an email-writing service for one campaign. The Studio writes up to two marketing emails that you paste into your own email platform.",
    whatItProvides:
      "Subject, preview, body, and call to action for each email, as plain text and simple HTML-ready files. The Studio does not send the emails.",
    howItMayComplement:
      "If you want the same thought written as an email you send yourself, this kit prepares that copy. It does not promise opens, clicks, or sales.",
    availableNow: true,
  },
  {
    skuId: "v2-rtu-sms-kit",
    name: "Make My Text Message Campaign Kit",
    priceLabel: "$69",
    definition:
      "This is a short-message writing service. The Studio writes text messages for one campaign that you send from your own phone or platform.",
    whatItProvides:
      "Finished message copy you can paste and send. The Studio does not send texts or manage replies.",
    howItMayComplement:
      "If you want a brief text version of one of these thoughts, this kit writes that message. It does not promise replies or bookings.",
    availableNow: true,
  },
];

export function clip549PathwayCopy(): {
  eyebrow: string;
  title: string;
  lead: string;
  services: readonly Clip549PathwayService[];
  closing: string;
  omittedUnfinished: readonly string[];
} {
  return {
    eyebrow: "Studio Pathway",
    title: "Other Studio work that can sit beside this set",
    lead:
      "These are services The Studio already sells. They are here so you can see what they are, what they make, and how they may sit beside these shorts. They are not required. Buying another service is not promised to improve sales, rankings, traffic, bookings, or recommendations.",
    services: CLIP_549_PATHWAY_SERVICES,
    closing:
      "If you have another longer recording and you want The Studio to search it, that is a new Clip Repurposing order. Ad Creative and AI + Local Visibility are not offered here because they are not sellable yet.",
    omittedUnfinished: CLIP_549_VALUE_FORBIDDEN_SERVICES,
  };
}

export function pathwayMentionsUnfinishedOffer(text: string): boolean {
  return /ad creative|ai \+ local visibility|local visibility/i.test(text);
}
