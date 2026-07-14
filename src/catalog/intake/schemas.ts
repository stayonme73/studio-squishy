/**
 * Studio Service Catalog — Route Map intake form schemas.
 * Absorbed from route-map-intake-v1.ts; owned by catalog intake module.
 * RouteMapIntakeType remains defined in route-map-v1.ts (shelf routing).
 */

import type { RouteMapIntakeTemplateId } from "@/catalog/intake/types";

export type RouteMapIntakeField = {
  id: string;
  label: string;
  placeholder?: string;
  /** Short instructional sentence under the label (complete sentence, not truncated). */
  hint?: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: readonly string[];
  /**
   * Brand / logo / footage / reference capture — customer describes available
   * references or states they do not have materials yet. Not a file upload.
   */
  role?: "materials";
};

export type RouteMapIntakeSchema = {
  type: RouteMapIntakeTemplateId;
  title: string;
  lead: string;
  fields: readonly RouteMapIntakeField[];
  /** Shown above fields when Post/Publish add-on was purchased at checkout. */
  clientResponsibilityNote?: string;
};

export type RouteMapIntakeAnswers = Record<string, string>;

export type RouteMapIntakeSchemaOptions = {
  /** When true, append Post/Publish platform/access fields (v2-addon-post-publish). */
  includePostPublish?: boolean;
};

const POST_PUBLISH_INTAKE_FIELDS: readonly RouteMapIntakeField[] = [
  {
    id: "publishPlatform",
    label: "Which one connected platform should we publish on?",
    type: "select",
    required: true,
    options: ["Facebook", "Instagram", "TikTok"],
  },
  {
    id: "publishAccess",
    label: "How will you provide account access for publishing?",
    type: "text",
    required: true,
    placeholder: "Admin invite email, login method, or notes",
  },
  {
    id: "publishTiming",
    label: "Preferred publish date or time window",
    type: "text",
    required: true,
    placeholder: "e.g. June 15 after 9am, or ASAP after approval",
  },
];

const RTU_PRINT_CLIENT_NOTE =
  "You print and distribute finished files through your own printer or channels.";

const RTU_SOCIAL_CLIENT_NOTE =
  "You upload and post finished files through your own account.";

const EMAIL_KIT_CLIENT_NOTE =
  "You own your audience list, consent, sending account, replies, and opt-outs. The Studio delivers finished email content files only.";

const SMS_KIT_CLIENT_NOTE =
  "You own your contact list, consent, sending account, replies, and opt-outs. The Studio delivers finished message copy files only.";

export const ROUTE_MAP_INTAKE_SCHEMAS: Record<RouteMapIntakeTemplateId, RouteMapIntakeSchema> = {
  discovery: {
    type: "discovery",
    title: "Route Start Intake",
    lead: "Share context so we can recommend the first paid job that fits.",
    fields: [
      {
        id: "businessName",
        label: "Business or project name",
        type: "text",
        required: true,
      },
      {
        id: "whatYouDo",
        label: "What does your business do?",
        type: "textarea",
        required: true,
      },
      {
        id: "currentSituation",
        label: "What is your current situation?",
        type: "select",
        required: true,
        options: [
          "Starting fresh",
          "Trying to stay visible more consistently",
          "Refreshing how my business looks",
          "Promoting an offer, event, sale, or launch",
        ],
      },
      {
        id: "biggestChallenge",
        label: "What is the biggest challenge right now?",
        type: "textarea",
        required: true,
      },
      {
        id: "alreadyHave",
        label: "What do you already have (website, social, logo, etc.)?",
        type: "textarea",
        required: true,
      },
      {
        id: "successLooksLike",
        label: "What would success look like from this Route Start job?",
        type: "textarea",
        required: true,
      },
    ],
  },
  "social-setup": {
    type: "social-setup",
    title: "Social Profile Setup",
    lead: "Tell us which platform and what we should set up or update.",
    fields: [
      {
        id: "platform",
        label: "Platform",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      {
        id: "businessName",
        label: "Business or profile name",
        type: "text",
        required: true,
      },
      {
        id: "profileGoal",
        label: "What should this profile accomplish?",
        type: "textarea",
        required: true,
      },
      {
        id: "accountAccess",
        label: "How will you provide account access?",
        type: "text",
        required: true,
        placeholder: "Admin invite email, login method, or notes",
      },
      {
        id: "brandNotes",
        label: "Brand colors, fonts, or reference notes",
        type: "textarea",
        role: "materials",
        hint: "Describe filenames, links, or colors if you have them. You may also say you do not have this yet or will provide it later. Files are not uploaded on this form.",
        placeholder: "Example: logo named bakery-mark.png, or colors from our website.",
      },
    ],
  },
  promotion: {
    type: "promotion",
    title: "Social Promotion Intake",
    lead: "Answer only what we need for this social promotion job.",
    fields: [
      { id: "promoting", label: "What are you promoting?", type: "textarea", required: true },
      {
        id: "mustInclude",
        label: "What date, price, offer, or deadline must be included?",
        type: "textarea",
        required: true,
      },
      { id: "callToAction", label: "What do you want people to do next?", type: "text", required: true },
      {
        id: "platform",
        label: "Which one platform are we posting on?",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      {
        id: "accountControl",
        label: "Do you own and control that account?",
        type: "select",
        required: true,
        options: ["Yes", "No — I need help first"],
      },
      {
        id: "materials",
        label: "Photos, logo, footage, or exact wording references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe what you have (filenames, links, or notes), or choose that you do not have this yet or will provide it later. Files are not uploaded on this form.",
        placeholder: "Example: promo-photo.jpg on our phone, or our logo link.",
      },
    ],
  },
  video: {
    type: "video",
    title: "Short Video Intake",
    lead: "Tell us what the video should communicate.",
    fields: [
      { id: "videoGoal", label: "What is the video promoting or announcing?", type: "textarea", required: true },
      {
        id: "platform",
        label: "Which one platform is it for?",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      { id: "mustKnow", label: "What must people know or do?", type: "textarea", required: true },
      {
        id: "footageNotes",
        label: "Footage, photos, or example references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe filenames, links, or what you can share. If you do not have media yet, choose that option. Files are not uploaded on this form.",
        placeholder: "Example: phone video named storefront-clip.mp4, or stock we approve later.",
      },
      {
        id: "aiVoice",
        label: "Should AI voice be included?",
        type: "select",
        required: true,
        options: ["Yes", "No"],
      },
      {
        id: "mustInclude",
        label: "What date, price, offer, or deadline must appear?",
        type: "textarea",
        required: true,
      },
    ],
  },
  page: {
    type: "page",
    title: "Campaign Page Intake",
    lead: "Tell us what this one page is for.",
    fields: [
      { id: "pageFor", label: "What is the page for?", type: "textarea", required: true },
      { id: "afterReading", label: "What should people do after reading it?", type: "text", required: true },
      { id: "existingWebsite", label: "What website do you already use, if any?", type: "text" },
      {
        id: "actionLink",
        label: "What action link should we use?",
        type: "select",
        required: true,
        options: ["Call", "Booking", "Order", "Directions", "Other approved link"],
      },
      { id: "mustInclude", label: "What details must be included exactly?", type: "textarea", required: true },
      { id: "limitedTime", label: "Is this limited-time?", type: "select", required: true, options: ["Yes", "No"] },
      { id: "needsQr", label: "Do you need a QR code?", type: "select", required: true, options: ["Yes", "No"] },
    ],
  },
  voice: {
    type: "voice",
    title: "Voice Announcement Intake",
    lead: "Share what we are announcing and where it posts.",
    fields: [
      { id: "announcing", label: "What are we announcing?", type: "textarea", required: true },
      {
        id: "platform",
        label: "Which one platform is it for?",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      { id: "mustSay", label: "What details must be said exactly?", type: "textarea", required: true },
      { id: "callToAction", label: "What should people do next?", type: "text", required: true },
      {
        id: "voiceTone",
        label: "Choose voice tone",
        type: "select",
        required: true,
        options: ["Calm", "Energetic", "Warm", "Direct"],
      },
    ],
  },
  update: {
    type: "update",
    title: "Update Intake",
    lead: "Identify the exact item to update.",
    fields: [
      { id: "itemLink", label: "Paste a link or identify the exact item", type: "text", required: true },
      { id: "whatChange", label: "What needs to change?", type: "textarea", required: true },
      { id: "newInfo", label: "What is the correct new information?", type: "textarea", required: true },
      { id: "remove", label: "What needs to be removed?", type: "textarea" },
      { id: "whereLive", label: "Where is it currently live?", type: "text", required: true },
    ],
  },
  "rtu-flyer": {
    type: "rtu-flyer",
    title: "Flyer Intake",
    lead: "Share only what we need for this one flyer — we deliver finished print and digital files.",
    clientResponsibilityNote: RTU_PRINT_CLIENT_NOTE,
    fields: [
      { id: "flyerPurpose", label: "What is this flyer for?", type: "textarea", required: true },
      {
        id: "mustInclude",
        label: "Exact text, offer details, dates, prices, location, phone, website, or QR destination",
        type: "textarea",
        required: true,
      },
      {
        id: "materials",
        label: "Logo, photos, colors, or brand references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so — do not invent files. Files are not uploaded on this form.",
        placeholder: "Example: logo named store-mark.png, or brand colors from our site.",
      },
      {
        id: "intendedUse",
        label: "Intended use",
        type: "select",
        required: true,
        options: ["Print", "Digital", "Both print and digital"],
      },
      { id: "sizeNotes", label: "Required flyer size, if known", type: "text" },
      {
        id: "disclaimers",
        label: "Any required wording or disclosures (you supply and verify)",
        type: "textarea",
      },
    ],
  },
  "rtu-menu": {
    type: "rtu-menu",
    title: "Menu Intake",
    lead: "Provide your final menu content — up to 5 sections and 30 items total.",
    clientResponsibilityNote: RTU_PRINT_CLIENT_NOTE,
    fields: [
      { id: "businessName", label: "Business name and type", type: "text", required: true },
      {
        id: "sections",
        label: "Menu sections (up to 5) and section order",
        type: "textarea",
        required: true,
      },
      {
        id: "items",
        label: "Complete item list with names, descriptions, and prices (up to 30 items total)",
        type: "textarea",
        required: true,
      },
      {
        id: "dietaryLabels",
        label: "Dietary/allergen labels and required wording (you supply and verify)",
        type: "textarea",
        required: true,
      },
      {
        id: "materials",
        label: "Logo, photos, colors, or brand references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so — do not invent files. Files are not uploaded on this form.",
        placeholder: "Example: logo named cafe-mark.png, or food photos named plate-01.jpg.",
      },
      {
        id: "intendedUse",
        label: "Intended use",
        type: "select",
        required: true,
        options: ["Print", "Digital", "Both print and digital"],
      },
      { id: "sizeNotes", label: "Required menu size, if known", type: "text" },
      {
        id: "disclaimers",
        label: "Any required disclaimers or legal wording (you supply)",
        type: "textarea",
      },
    ],
  },
  "rtu-service-sheet": {
    type: "rtu-service-sheet",
    title: "Service Sheet Intake",
    lead: "List up to 10 services with brief descriptions — we design one finished page.",
    clientResponsibilityNote: RTU_PRINT_CLIENT_NOTE,
    fields: [
      {
        id: "services",
        label: "Final service names, descriptions, and any starting prices",
        type: "textarea",
        required: true,
      },
      {
        id: "contactDetails",
        label: "Contact details that must appear",
        type: "textarea",
        required: true,
      },
      {
        id: "wording",
        label: "Required wording or disclosures (you supply and verify)",
        type: "textarea",
        required: true,
      },
      {
        id: "materials",
        label: "Logo, photos, and brand references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so — do not invent files. Files are not uploaded on this form.",
        placeholder: "Example: service-photo.jpg, or logo colors from our website.",
      },
      { id: "sizeNotes", label: "Required size, if known", type: "text" },
    ],
  },
  /**
   * INTENTIONAL DIVERGENCE (Package 3 — F2):
   * Live customer Intake for Social Posts uses SocialPostsIntakeForm (custom UI),
   * not this catalog schema. This schema supports briefs, tests, and internal modeling.
   * Changing the live UI or this schema requires inspecting both surfaces.
   */
  "rtu-social-posts": {
    type: "rtu-social-posts",
    title: "Social Media Posts Intake",
    lead: "Four post graphics for one platform — share campaign details and material references.",
    clientResponsibilityNote: RTU_SOCIAL_CLIENT_NOTE,
    fields: [
      { id: "postsAbout", label: "What are these posts about?", type: "textarea", required: true },
      {
        id: "callToAction",
        label: "What do people need to know or do? (offer, date, deadline, price, link, phone, or CTA)",
        type: "textarea",
        required: true,
      },
      {
        id: "platform",
        label: "Which one platform are these for?",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      {
        id: "materials",
        label: "Logo, photos, colors, or brand references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Catalog-schema modeling only. Live Social Posts Intake uses the custom form. Describe references here for briefs/tests — files are not uploaded.",
        placeholder: "Example: logo or photo filenames, or later materials.",
      },
      {
        id: "wordingHashtags",
        label: "Any exact wording, required disclosures, or hashtags",
        type: "textarea",
      },
      {
        id: "mustNotSay",
        label: "Anything that must not be said or shown",
        type: "textarea",
      },
    ],
  },
  "rtu-promotion-graphics": {
    type: "rtu-promotion-graphics",
    title: "Campaign Graphics Intake",
    lead: "Two branded graphics for one campaign — tell us the focus and exact copy.",
    clientResponsibilityNote: RTU_PRINT_CLIENT_NOTE,
    fields: [
      {
        id: "campaignFocus",
        label: "Campaign, offer, event, or launch focus",
        type: "textarea",
        required: true,
      },
      { id: "mustInclude", label: "Exact copy that must appear", type: "textarea", required: true },
      {
        id: "dates",
        label: "Dates, deadlines, or event details",
        type: "textarea",
        required: true,
      },
      {
        id: "callToAction",
        label: "Call to action, link, phone, or QR destination",
        type: "text",
        required: true,
      },
      {
        id: "materials",
        label: "Logo, photos, colors, or brand references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so — do not invent files. Files are not uploaded on this form.",
        placeholder: "Example: event-hero.jpg, or logo from our Facebook page.",
      },
      {
        id: "intendedUse",
        label: "Intended use",
        type: "select",
        required: true,
        options: ["Print", "Social", "Email", "In-store", "Other"],
      },
      { id: "sizeNotes", label: "Required size or format, if known", type: "text" },
      {
        id: "disclaimers",
        label: "Any required wording or disclosures (you supply)",
        type: "textarea",
      },
    ],
  },
  "rtu-email-kit": {
    type: "rtu-email-kit",
    title: "Email Campaign Kit Intake",
    lead: "One campaign goal — we deliver up to two finished emails for your platform.",
    clientResponsibilityNote: EMAIL_KIT_CLIENT_NOTE,
    fields: [
      {
        id: "campaignGoal",
        label: "One campaign goal (offer, event, promotion, launch, or follow-up)",
        type: "textarea",
        required: true,
      },
      {
        id: "mustInclude",
        label: "Exact copy, offer details, dates, links, and required wording",
        type: "textarea",
        required: true,
      },
      {
        id: "callToAction",
        label: "Call to action for each email",
        type: "text",
        required: true,
      },
      {
        id: "materials",
        label: "Logo, photos, colors, or brand references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so — do not invent files. Files are not uploaded on this form.",
        placeholder: "Example: header-logo.png, or product photo filenames.",
      },
      {
        id: "listConsent",
        label: "Confirm you own your list and have consent to email this audience",
        type: "select",
        required: true,
        options: ["Yes — I own the list and have consent", "Not yet — I need to set this up first"],
      },
      {
        id: "sendingAccount",
        label: "Which email platform or sending account will you use?",
        type: "text",
        required: true,
        placeholder: "e.g. Mailchimp, Constant Contact, Gmail",
      },
      {
        id: "compliance",
        label: "Required disclaimers or compliance wording (you supply)",
        type: "textarea",
      },
      {
        id: "mustNotSay",
        label: "Anything that must not be said or shown",
        type: "textarea",
      },
    ],
  },
  "rtu-sms-kit": {
    type: "rtu-sms-kit",
    title: "Text Message Campaign Kit Intake",
    lead: "One campaign goal — we deliver up to four message files for your SMS platform.",
    clientResponsibilityNote: SMS_KIT_CLIENT_NOTE,
    fields: [
      {
        id: "campaignGoal",
        label: "One campaign goal (promotion, event, reminder, offer, launch, or follow-up)",
        type: "textarea",
        required: true,
      },
      {
        id: "mustInclude",
        label: "Exact offer details, dates, links, and required wording",
        type: "textarea",
        required: true,
      },
      {
        id: "callToAction",
        label: "What should people do when they receive the messages?",
        type: "text",
        required: true,
      },
      {
        id: "messageCopy",
        label: "Exact message copy or talking points for up to four SMS messages",
        type: "textarea",
        required: true,
      },
      {
        id: "listConsent",
        label: "Confirm you own your contact list and have SMS consent",
        type: "select",
        required: true,
        options: ["Yes — I own the list and have consent", "Not yet — I need to set this up first"],
      },
      {
        id: "sendingAccount",
        label: "Which SMS platform or sending account will you use?",
        type: "text",
        required: true,
        placeholder: "e.g. Twilio, SimpleTexting, platform name",
      },
      {
        id: "optOutWording",
        label: "Required opt-out or compliance wording (you supply and verify)",
        type: "textarea",
      },
      {
        id: "timingNotes",
        label: "Any timing preferences for the suggested sequence",
        type: "textarea",
      },
      {
        id: "mustNotSay",
        label: "Anything that must not be said or shown",
        type: "textarea",
      },
    ],
  },
  "rtu-voice": {
    type: "rtu-voice",
    title: "Voice Announcement Intake",
    lead: "Share approved details — The Studio writes the script and produces the audio.",
    clientResponsibilityNote:
      "You upload or distribute the finished audio through your own tools.",
    fields: [
      {
        id: "announcementPurpose",
        label: "Announcement purpose and key message",
        type: "textarea",
        required: true,
      },
      {
        id: "approvedDetails",
        label: "Approved details, facts, offers, dates, and required wording for The Studio to write the script",
        type: "textarea",
        required: true,
      },
      {
        id: "pronunciationNotes",
        label: "Pronunciation notes for names, products, and offers",
        type: "textarea",
      },
      {
        id: "voiceTone",
        label: "Preferred voice style/tone",
        type: "select",
        required: true,
        options: ["Calm", "Energetic", "Warm", "Direct"],
      },
      {
        id: "language",
        label: "Language (one language only)",
        type: "text",
        required: true,
        placeholder: "e.g. English",
      },
      {
        id: "mustNotSay",
        label: "Anything that must not be said",
        type: "textarea",
      },
    ],
  },
  "rtu-short-video": {
    type: "rtu-short-video",
    title: "Short Video Intake",
    lead: "One short video up to 45 seconds — share purpose, format, and media references.",
    clientResponsibilityNote: RTU_SOCIAL_CLIENT_NOTE,
    fields: [
      {
        id: "videoPurpose",
        label: "Video purpose (campaign, offer, event, service, or promotion focus)",
        type: "textarea",
        required: true,
      },
      {
        id: "format",
        label: "One format choice",
        type: "select",
        required: true,
        options: ["Vertical", "Square", "Landscape"],
      },
      {
        id: "footageMaterials",
        label: "Footage, photos, logo, or approved visual sources",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe client footage, photos, logos, or note that Studio/stock/AI visuals are fine once approved. If you do not have media yet, choose that option. Files are not uploaded on this form.",
        placeholder: "Example: phone clip named patio-tour.mp4, or use Studio-approved stock.",
      },
      {
        id: "onScreenText",
        label: "Exact on-screen text, offer details, dates, and CTA",
        type: "textarea",
        required: true,
      },
      {
        id: "brandStyle",
        label: "Brand colors, fonts, or style references",
        type: "textarea",
      },
      {
        id: "disclaimers",
        label: "Any required disclaimers or legal wording (you supply)",
        type: "textarea",
      },
      {
        id: "mustNotShow",
        label: "Anything that must not be shown or said",
        type: "textarea",
      },
    ],
  },
  "rtu-business-card": {
    type: "rtu-business-card",
    title: "Business Card Intake",
    lead: "Share the contact details and brand references for one finished business card design.",
    clientResponsibilityNote: RTU_PRINT_CLIENT_NOTE,
    fields: [
      { id: "businessName", label: "Business name", type: "text", required: true },
      { id: "cardNameTitle", label: "Name and title for the card", type: "text", required: true },
      { id: "phone", label: "Phone number", type: "text", required: true },
      { id: "email", label: "Email address", type: "text", required: true },
      { id: "webOrSocial", label: "Website or social link", type: "text" },
      { id: "address", label: "Business address, if desired", type: "text" },
      {
        id: "brandMaterials",
        label: "Logo and brand color references",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe your logo filename, brand colors, or links. If you do not have a logo yet, choose that option. Files are not uploaded on this form.",
        placeholder: "Example: logo named smith-co.svg, navy and cream colors.",
      },
      { id: "cardSize", label: "Preferred card size, if known", type: "text" },
    ],
  },
};

export function getRouteMapIntakeSchema(
  type: RouteMapIntakeTemplateId,
  options: RouteMapIntakeSchemaOptions = {},
): RouteMapIntakeSchema {
  const base = ROUTE_MAP_INTAKE_SCHEMAS[type];
  if (!options.includePostPublish) return base;

  return {
    ...base,
    fields: [...base.fields, ...POST_PUBLISH_INTAKE_FIELDS],
    lead: `${base.lead} Post/Publish add-on selected — include platform access details below.`,
  };
}
