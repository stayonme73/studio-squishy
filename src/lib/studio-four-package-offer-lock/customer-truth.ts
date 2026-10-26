import type { FourPackageHeadlineId } from "@/config/studio-four-package-offer-lock-v1";
import { threePackageRevisionRule } from "@/config/studio-three-package-revision-truth-v1";

export type CustomerTruthBlock = {
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
};

export const fourPackageCustomerTruth: Record<
  FourPackageHeadlineId,
  CustomerTruthBlock
> = {
  clip_repurposing: {
    packageName: "Clip Repurposing",
    whatThisIs:
      "You give The Studio one eligible longer video. We watch the whole recording, find the strongest distinct moments, and turn those into polished short videos you can use. You still post them yourself.",
    whoItIsFor:
      "A business that already recorded a longer talk, class, interview, or presentation and does not want to sit through it to find the usable pieces.",
    problemItHelpsSolve:
      "A 20-, 30-, or 60-minute recording is hard to use as-is. The useful moments are buried. This package is the search-and-finish job: The Studio finds those moments and edits them.",
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
      "Adds matching post captions, suggested titles, suggested hashtag keywords, and a posting companion for the set",
      "Runs Quality on the finished files and includes three revision rounds within the original package scope",
    ],
    whatComesWithIt: [
      "The clip set from one eligible source",
      "Supporting copy for those clips",
      "Optional Ad Creative or Email & Text if you choose them and supply the facts",
      "Optional Flyer or Business Card if you want those extras and can supply the facts",
    ],
    customerReceives: [
      "Up to five finished vertical shorts. Three is the usual delivered set when that is what the source honestly holds. Five is the maximum, not a promise",
      "A matching caption for each delivered short",
      "Suggested titles and hashtag keywords",
      "A posting companion that tells you what to do with the files",
    ],
    afterDelivery: [
      "Download the finished shorts",
      "Copy the captions",
      "Upload and post the videos yourself",
      "Use the posting companion as a checklist, not as a growth plan",
    ],
    howThisCanHelp: [
      "Saves you from watching your own long recording to hunt for clips",
      "Turns existing footage into reusable short videos",
      "Gives you finished files and paste-ready posting words instead of a raw timeline",
    ],
    whatItDoesNotDo: [
      "The Studio does not post, schedule, or manage your accounts",
      "It does not guarantee five clips, views, followers, or sales",
      "It does not invent a call to action",
      "It does not include designed cover graphics",
      "It is not Short-Form Video Editing. If you already know the moments, that is the other package",
    ],
    studioWillNotAccess: [
      "Your social accounts",
      "Your ad accounts",
      "Your email or text platforms",
      "Google Business Profile",
    ],
    revisionRule: threePackageRevisionRule("Clip Repurposing"),
    deliveryAndUse:
      "Finished files arrive in Final Delivery with the captions and posting companion. You download them and post them yourself. The Studio does not stay in your accounts after delivery.",
    importantLimits: [
      "The source must be eligible. A damaged or ineligible recording is stopped or given a notice-and-choice, not forced through",
      "If fewer than three strong standalone moments exist, The Studio stops before charging you for a weak set and may offer one replacement-source window",
      "Designed cover graphics are not part of this package",
      "Suggested hashtag keywords may be short word fragments. They are keywords, not a growth strategy",
      "This headline uses the Heavy production lane. Capacity rules still apply",
    ],
  },
  short_form_video_editing: {
    packageName: "Short-Form Video Editing",
    whatThisIs:
      "You point to the short moments you already want used. The Studio polishes those marked clips into a small finished set with captions, covers, and a use guide. You post the set yourself.",
    whoItIsFor:
      "A business that already knows which short clips or marked segments they want finished, and does not need The Studio to search a long recording.",
    problemItHelpsSolve:
      "Raw short clips are rarely ready to post. This package is the finish job: clean cuts, captions, audio, an ending, covers, and posting words for the moments you marked.",
    customerProvides: [
      "Up to three short-form source clips, or each desired clip clearly marked as a source segment of 45 seconds or less",
      "Your call to action",
      "Required facts, names, dates, links, or brand assets",
      "Rights-cleared footage",
    ],
    studioDoes: [
      "Uses the moments you marked. It may look a short distance around a mark only to find a clean opening, a complete ending, and the intended spoken thought",
      "Finishes each usable clip: captions, pacing, audio, music when it helps, B-roll when it helps, and a Studio ending",
      "Makes matching post captions, cover or title graphics, and a simple posting guide",
      "Includes three revision rounds within the original package scope",
    ],
    whatComesWithIt: [
      "The finished short-form set from your marked clips",
      "Optional Ad Creative or Email & Text if you choose them and supply the facts",
      "Optional Flyer or Business Card if you want those extras",
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
      "Follow the use guide for order and posting, not for promised results",
    ],
    howThisCanHelp: [
      "Reduces the editing, captioning, and cover work you would otherwise do yourself",
      "Turns marked footage into a ready-to-use mini content set",
      "Keeps the finish consistent across the set",
    ],
    whatItDoesNotDo: [
      "The Studio does not search an unmarked long recording. That is Clip Repurposing",
      "It does not invent weak extra videos just to reach three",
      "It does not post for you",
      "It does not include an email or text campaign unless you separately choose that support option",
    ],
    studioWillNotAccess: [
      "Your social accounts",
      "Your ad accounts",
      "Your email or text platforms",
      "Google Business Profile",
    ],
    revisionRule: threePackageRevisionRule("Short-Form Video Editing"),
    deliveryAndUse:
      "Finished videos, covers, captions, and the use guide arrive together. You post them. The Studio does not schedule or publish.",
    importantLimits: [
      "You must mark each moment. An unmarked long video is the wrong package",
      "Three finished videos are not guaranteed if the marked material cannot make three complete standalone shorts",
      "The lookaround around a mark is only to make that edit clean. It is not permission to send unmarked four-minute clips",
      "This headline uses the Heavy production lane. Capacity rules still apply",
    ],
  },
  social_and_promo_graphics: {
    packageName: "Social & Promo Graphics",
    whatThisIs:
      "The Studio designs a coordinated set of static social posts and promotional graphics from the facts and offer you supply. You post or share the files yourself.",
    whoItIsFor:
      "A business that needs finished graphics for one theme — something they can post, share, or use in a simple promotion — and already knows the words, offer, and facts that must appear.",
    problemItHelpsSolve:
      "Many owners have an offer or announcement and no finished graphics. This package makes the social posts and the matching promo pair so they are not designing those pieces themselves.",
    customerProvides: [
      "Business name and the one theme or offer",
      "Exact wording, prices, dates, and contact details that must appear",
      "Logo or photos you have the right to use, if they should appear",
      "Required disclosures",
    ],
    studioDoes: [
      "Designs four coordinated square social posts for one theme and one platform",
      "Writes one caption per post from your facts, plus a suggested posting order",
      "Designs two coordinated campaign graphics: one square and one portrait",
      "Keeps every claim inside the facts you supplied",
      "Includes three revision rounds within the original package scope",
    ],
    whatComesWithIt: [
      "The social set and the promo pair",
      "Ad Creative and Email & Text as natural included choices if you want them",
      "Menu / Price List or AI + Local Visibility only if they are useful and you supply the facts",
      "Optional Flyer or Business Card extras",
    ],
    customerReceives: [
      "Four square static posts (1024×1024) plus captions and a suggested posting order",
      "Two campaign graphics: 1024×1024 and 1024×1536 PNG",
    ],
    afterDelivery: [
      "Download the PNG files",
      "Copy the captions",
      "Post or share the graphics yourself",
      "Use the suggested order as a simple sequence, not as a calendar or growth plan",
    ],
    howThisCanHelp: [
      "Gives you finished promotional assets instead of a blank canvas",
      "Reduces the design and caption writing you would otherwise do yourself",
      "Keeps the posts and promo graphics on the same theme and facts",
    ],
    whatItDoesNotDo: [
      "The Studio does not post, boost, or manage your accounts",
      "It does not make carousels, Stories, Reels, video ads, or extra platform sizes",
      "It does not invent offers, prices, testimonials, or results",
      "Campaign graphics are digital files, not certified 300 DPI print files",
    ],
    studioWillNotAccess: [
      "Your social accounts",
      "Your ad accounts",
      "Your email platform",
      "Google Business Profile",
    ],
    revisionRule: threePackageRevisionRule("Social & Promo Graphics"),
    deliveryAndUse:
      "You receive the post files, captions, posting order, and promo PNGs. You upload them. The Studio does not publish them.",
    importantLimits: [
      "One theme. One platform treatment for the four posts",
      "Carousel is not on this menu",
      "If a support option is missing its facts, it is skipped. The Studio will not invent a menu, an ad offer, or a local listing",
    ],
  },
  reputation_customer_proof: {
    packageName: "Reputation & Customer Proof Kit",
    whatThisIs:
      "The Studio turns your real customer praise and your review link into words and files you can send, print, reply with, and post. You still ask, reply, and publish yourself.",
    whoItIsFor:
      "A business that already has real customers and wants a simple, honest way to ask for reviews and reuse real praise, without fake reviews or account management.",
    problemItHelpsSolve:
      "Asking for a review, answering one professionally, and turning a real quote into a graphic are easy to put off. This kit gives you those pieces ready to use.",
    customerProvides: [
      "Business name",
      "The exact review destination link",
      "One real customer review or testimonial in their words",
      "Confirmation you have permission to use that wording and name",
      "Preferred call to action and any required disclaimer",
    ],
    studioDoes: [
      "Writes review-request text and email, thank-you wording, and positive / neutral / negative reply templates",
      "Makes one QR review card that opens only the link you supplied",
      "Makes one square and one portrait quote graphic from that one real testimonial",
      "Writes a matching caption and a use guide",
      "Stops the job if rights are missing or if a quote would be rewritten into a different claim",
    ],
    whatComesWithIt: [
      "The reputation kit",
      "AI + Local Visibility as a natural included choice if you want clearer business wording from your facts",
      "Ad Creative or Email & Text only if you have a separate offer or campaign. The kit already includes review-request wording, so a second review-request campaign is skipped",
      "Optional Flyer or Business Card extras",
    ],
    customerReceives: [
      "Paste-ready review-request text and email",
      "Thank-you wording and three reply templates",
      "One QR review card",
      "Two quote graphics and one caption",
      "A short use guide",
    ],
    afterDelivery: [
      "Send the request text or email yourself",
      "Print or show the QR card",
      "Reply in your own review accounts using the templates",
      "Post the quote graphics and caption yourself",
    ],
    howThisCanHelp: [
      "Saves you from writing the ask, the replies, and the quote graphic from scratch",
      "Makes real customer praise easier to reuse appropriately",
      "Gives you a review link people can scan instead of hunting for it",
    ],
    whatItDoesNotDo: [
      "The Studio does not invent reviews, customers, star ratings, or outcomes",
      "It does not promise more reviews, rankings, leads, or sales",
      "It does not post replies or send the requests",
      "It does not edit testimonial video or create AI customers",
    ],
    studioWillNotAccess: [
      "Google Business Profile",
      "Review platforms",
      "Social accounts",
      "Your inbox",
    ],
    revisionRule:
      "One included kit revision. It can change the call to action or correct a fact or name you supply. It is not a new invented review.",
    deliveryAndUse:
      "You receive the text files, QR card, quote graphics, caption, and guide. You send, reply, and post. The Studio does not stay in your accounts.",
    importantLimits: [
      "Rights confirmation is required. No permission, no quote graphic",
      "The quote stays in the customer’s words",
      "The QR card encodes only the link you supplied. The Studio does not open or scrape it",
      "This is not monthly reputation management",
    ],
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
] as const;
