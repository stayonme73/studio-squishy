import type { ThreePackageHeadlineId } from "@/config/studio-three-package-architecture-reconciliation-v1";
import { threePackageRevisionRule } from "@/config/studio-three-package-revision-truth-v1";
import { visibleSupportForHeadline } from "./combinations";

export type HeadlineCustomerTruth = {
  packageName: string;
  whatThisIs: string;
  whoItIsFor: string;
  problemItHelpsSolve: string;
  customerProvides: readonly string[];
  studioDoes: readonly string[];
  whatComesWithIt: readonly string[];
  customerReceives: readonly string[];
  afterDelivery: readonly string[];
  howThisCanHelp: readonly string[];
  whatItDoesNotDo: readonly string[];
  studioWillNotAccess: readonly string[];
  revisionRule: string;
  deliveryAndUse: string;
  importantLimits: readonly string[];
  includedSupportChoices: readonly string[];
};

export const threeHeadlineCustomerTruth: Record<
  ThreePackageHeadlineId,
  HeadlineCustomerTruth
> = {
  clip_repurposing: {
    packageName: "Clip Repurposing",
    whatThisIs:
      "You give The Studio one eligible longer video. We watch the whole recording, find the strongest distinct moments, and turn those into polished short videos you can use. You still post them yourself.",
    whoItIsFor:
      "A business that already recorded a longer talk, class, interview, or presentation and does not want to sit through it to find the usable pieces.",
    problemItHelpsSolve:
      "A 20-, 30-, or 60-minute recording is hard to use as-is. The useful moments are buried. This package is the search-and-finish job.",
    customerProvides: [
      "One eligible recording: 15–60 minutes, vertical, English talking-head, one primary speaker, speech clear enough to follow, MP4 or MOV",
      "Rights and likeness clearance for everyone who appears",
      "Exact call-to-action wording",
      "Optional notes about who it is for and what to keep or cut",
    ],
    studioDoes: [
      "Reviews the full source and checks that it is eligible, including the audio gate",
      "Identifies the strongest distinct standalone moments",
      "Edits those moments into polished vertical shorts with captions, pacing, audio finish, and an ending treatment",
      "Adds matching post captions, suggested titles, suggested hashtag keywords, and a posting companion",
      "Runs Quality and includes three revision rounds within the original package scope",
    ],
    whatComesWithIt: [
      "The clip set and supporting copy from one eligible source",
      "Optional included support, each skippable: Reputation & Customer Proof, Ad Creative, Email & Text Campaign — only if they fit and you supply the facts",
    ],
    customerReceives: [
      "Up to five finished vertical shorts. Three is a common honest set. Five is the maximum, not a promise",
      "A matching caption for each delivered short",
      "Suggested titles and hashtag keywords",
      "A posting companion",
    ],
    afterDelivery: [
      "Download the finished shorts",
      "Copy the captions",
      "Upload and post the videos yourself",
    ],
    howThisCanHelp: [
      "Saves you from watching your own long recording to hunt for clips",
      "Turns existing footage into reusable short videos",
    ],
    whatItDoesNotDo: [
      "The Studio does not post or manage your accounts",
      "It does not guarantee five clips, views, or sales",
      "It does not include designed cover graphics",
      "Reputation & Customer Proof is not part of this headline unless you select that support option and have a real testimonial with permission",
    ],
    studioWillNotAccess: [
      "Social accounts",
      "Ad accounts",
      "Email or text platforms",
      "Google Business Profile",
      "Review platforms",
    ],
    revisionRule: threePackageRevisionRule("Clip Repurposing"),
    deliveryAndUse:
      "Files arrive in Final Delivery with captions and the posting companion. You post them.",
    importantLimits: [
      "Eligible source is 15–60 minutes",
      "If fewer than three strong standalone moments exist, The Studio stops before charging for a weak set",
      "Menu / Price List and AI + Local Visibility are not appropriate on this headline",
      "Heavy lane. Capacity rules still apply",
    ],
    includedSupportChoices: visibleSupportForHeadline("clip_repurposing").map(
      (row) => `${row.id}:${row.fit}:default_SKIP`,
    ),
  },
  short_form_video_editing: {
    packageName: "Short-Form Video Editing",
    whatThisIs:
      "You point to the short moments you already want used. The Studio polishes those marked clips into a small finished set with captions, covers, and a use guide. You post the set yourself.",
    whoItIsFor:
      "A business that already knows which short clips they want finished and does not need The Studio to search a long recording.",
    problemItHelpsSolve:
      "Raw short clips are rarely ready to post. This is the finish job.",
    customerProvides: [
      "Up to three short-form source clips, or each desired clip marked as a segment of 45 seconds or less",
      "Your call to action",
      "Required facts and rights-cleared footage",
    ],
    studioDoes: [
      "Uses the moments you marked",
      "Finishes each usable clip: captions, pacing, audio, music when it helps, B-roll when it helps, and a Studio ending",
      "Makes matching post captions, cover or title graphics, and a simple posting guide",
      "Includes three revision rounds within the original package scope",
    ],
    whatComesWithIt: [
      "The finished short-form set",
      "Optional included support, each skippable: Reputation & Customer Proof, Ad Creative, Email & Text Campaign — only if they fit and you supply the facts",
    ],
    customerReceives: [
      "Up to three polished short-form videos",
      "Three matching post captions",
      "Three cover or title graphics",
      "One simple posting and use guide",
    ],
    afterDelivery: [
      "Download the videos and covers",
      "Copy the captions",
      "Upload and post the set yourself",
    ],
    howThisCanHelp: [
      "Reduces the editing, captioning, and cover work you would otherwise do",
      "Turns marked footage into a ready-to-use mini set",
    ],
    whatItDoesNotDo: [
      "The Studio does not search an unmarked long recording. That is Clip Repurposing",
      "It does not invent weak extra videos just to reach three",
      "It does not post for you",
      "Reputation & Customer Proof is not automatic. Select it only if you have a real testimonial and permission",
    ],
    studioWillNotAccess: [
      "Social accounts",
      "Ad accounts",
      "Email or text platforms",
      "Google Business Profile",
      "Review platforms",
    ],
    revisionRule: threePackageRevisionRule("Short-Form Video Editing"),
    deliveryAndUse:
      "Videos, covers, captions, and the use guide arrive together. You post them.",
    importantLimits: [
      "You must mark each moment",
      "Three finished videos are not guaranteed",
      "Menu / Price List and AI + Local Visibility are not appropriate on this headline",
      "Heavy lane. Capacity rules still apply",
    ],
    includedSupportChoices: visibleSupportForHeadline("short_form_video_editing").map(
      (row) => `${row.id}:${row.fit}:default_SKIP`,
    ),
  },
  social_and_promo_graphics: {
    packageName: "Social & Promo Graphics",
    whatThisIs:
      "The Studio designs a coordinated set of static social posts and promotional graphics from the facts and offer you supply. You post or share the files yourself.",
    whoItIsFor:
      "A business that needs finished graphics for one theme and already knows the words, offer, and facts that must appear.",
    problemItHelpsSolve:
      "They have an offer or announcement and no finished graphics.",
    customerProvides: [
      "Business name and the one theme or offer",
      "Exact wording, prices, dates, and contact details that must appear",
      "Rights-cleared logo or photos if they should appear",
      "Required disclosures",
    ],
    studioDoes: [
      "Designs four coordinated square social posts",
      "Writes one caption per post from your facts, plus a suggested posting order",
      "Designs two coordinated campaign graphics: square and portrait",
      "Keeps every claim inside the facts you supplied",
      "Includes three revision rounds within the original package scope",
    ],
    whatComesWithIt: [
      "The social set and the promo pair",
      "Natural included support, each still skippable: Reputation & Customer Proof, Ad Creative, Email & Text Campaign",
      "Optional Menu / Price List or AI + Local Visibility if useful",
    ],
    customerReceives: [
      "Four square static posts (1024×1024) plus captions and a suggested posting order",
      "Two campaign graphics: 1024×1024 and 1024×1536 PNG",
    ],
    afterDelivery: [
      "Download the PNG files",
      "Copy the captions",
      "Post or share the graphics yourself",
    ],
    howThisCanHelp: [
      "Gives you finished promotional assets instead of a blank canvas",
      "Reduces the design and caption writing you would otherwise do",
    ],
    whatItDoesNotDo: [
      "The Studio does not post, boost, or manage your accounts",
      "It does not make carousels, Stories, Reels, or video ads",
      "It does not invent offers, prices, testimonials, or results",
      "Reputation & Customer Proof is available here as included support, not as its own public package. Skip it if you do not have a real testimonial and permission",
    ],
    studioWillNotAccess: [
      "Social accounts",
      "Ad accounts",
      "Email platform",
      "Google Business Profile",
      "Review platforms",
    ],
    revisionRule: threePackageRevisionRule("Social & Promo Graphics"),
    deliveryAndUse:
      "You receive the post files, captions, posting order, and promo PNGs. You upload them.",
    importantLimits: [
      "One theme. One platform treatment for the four posts",
      "Carousel is not on this menu",
      "If a support option is missing its facts, it is skipped. The Studio will not invent a review, a menu, or a listing",
    ],
    includedSupportChoices: visibleSupportForHeadline("social_and_promo_graphics").map(
      (row) => `${row.id}:${row.fit}:default_SKIP`,
    ),
  },
};

export const customerTruthFieldIds = [
  "whatThisIs",
  "whoItIsFor",
  "problemItHelpsSolve",
  "customerProvides",
  "studioDoes",
  "whatComesWithIt",
  "customerReceives",
  "afterDelivery",
  "howThisCanHelp",
  "whatItDoesNotDo",
  "studioWillNotAccess",
  "revisionRule",
  "deliveryAndUse",
  "importantLimits",
  "includedSupportChoices",
] as const;
