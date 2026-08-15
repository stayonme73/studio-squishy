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
  "social-update": {
    type: "social-update",
    title: "Social Profile Update Kit Intake",
    lead:
      "Tell us which one existing platform profile to update, what is on it today, and what should change. You will apply the finished Update Kit yourself. The Studio never asks for your platform login, password, or admin invite, and does not inspect your live profile later.",
    fields: [
      {
        id: "platform",
        label: "Platform",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      {
        id: "customerControlsExistingProfile",
        label: "Do you already control this profile on that platform?",
        type: "select",
        required: true,
        options: ["Yes", "No — I need a new setup kit instead"],
      },
      {
        id: "businessName",
        label: "Business or profile name",
        type: "text",
        required: true,
      },
      {
        id: "beforeDisplayName",
        label: "Display name showing on the profile today",
        type: "text",
        required: true,
        placeholder: "Example: Harbor & Oak Studio — or write unknown / blank",
      },
      {
        id: "beforeBioOrAbout",
        label: "Bio or About text on the profile today",
        type: "textarea",
        required: true,
        placeholder: "Paste the current text, or write blank / none",
      },
      {
        id: "beforeWebsite",
        label: "Website or booking link on the profile today",
        type: "text",
        required: true,
        placeholder: "Example: https://old-site.example — or write none",
      },
      {
        id: "beforePhone",
        label: "Phone or contact number on the profile today",
        type: "text",
        required: true,
        placeholder: "Example: (555) 000-0000 — or write none",
      },
      {
        id: "beforeProfileImageNote",
        label: "Describe the current profile image, or note a screenshot",
        type: "textarea",
        required: true,
        placeholder:
          "Example: default platform avatar, low contrast — or screenshot named current-avatar.png",
      },
      {
        id: "beforePageCoverNote",
        label: "Facebook Page cover today (Facebook only)",
        type: "textarea",
        required: false,
        hint: "Required when Platform is Facebook. Leave blank for Instagram or TikTok.",
        placeholder:
          "Example: busy collage with expired promo — or write none",
      },
      {
        id: "afterDisplayName",
        label: "Approved display name after the update",
        type: "text",
        required: true,
      },
      {
        id: "profileGoal",
        label: "What should this updated profile accomplish?",
        type: "textarea",
        required: true,
      },
      {
        id: "updateIntentNotes",
        label: "What should change in this update?",
        type: "textarea",
        required: true,
        hint: "Describe the changes you want. The Studio still delivers a full replacement Update Kit for this platform, including unchanged pieces marked UNCHANGED.",
      },
      {
        id: "afterWebsite",
        label: "Approved website or booking link after the update",
        type: "text",
        required: true,
        placeholder: "Example: https://your-site.example — or write none",
      },
      {
        id: "afterPhone",
        label: "Approved phone or contact number after the update",
        type: "text",
        required: true,
        placeholder: "Example: (555) 014-2200 — or write none",
      },
      {
        id: "brandNotes",
        label: "Logo and brand notes for the profile image in this kit",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe the logo filename, link, or colors. Files are not uploaded on this form. Do not send passwords or admin invites.",
        placeholder: "Example: logo named harbor-oak-mark.svg, warm oak + soft harbor blue.",
      },
      {
        id: "avatarAction",
        label: "Profile image action",
        type: "select",
        required: true,
        options: [
          "Keep current look",
          "Replace with new from brand materials",
        ],
        hint: "Either way, the Update Kit still includes a profile image file so you receive one complete package.",
      },
      {
        id: "coverAction",
        label: "Facebook Page cover action (Facebook only)",
        type: "select",
        required: false,
        options: [
          "Keep current look",
          "Replace with new from brand materials",
          "Not applicable",
        ],
        hint: "Required when Platform is Facebook. Choose Not applicable for Instagram or TikTok.",
      },
    ],
  },
  "brand-refresh": {
    type: "brand-refresh",
    title: "Brand Identity Refresh Intake",
    lead:
      "This service refreshes the brand you already have. It does not invent a new one. Tell us your existing business name, what your brand looks like today, and which one graphic you want — a profile image or a cover graphic. The Studio does not name or rename your business, does not draw a new logo, and does not write brand messaging or taglines. Your existing logo is placed as supplied, never redrawn.",
    fields: [
      {
        id: "businessName",
        label: "Your existing business name",
        type: "text",
        required: true,
        hint: "This service refreshes your current name. Naming and renaming are not included.",
        placeholder: "Example: Harbor & Oak Studio",
      },
      {
        id: "graphicKind",
        label: "Which one graphic should the Studio deliver?",
        type: "select",
        required: true,
        options: ["Profile image", "Cover graphic"],
        hint: "Your refresh includes the Brand Direction Sheet plus exactly one graphic. Choose the one you need now.",
      },
      {
        id: "visualStartingPointNotes",
        label: "What does your brand look like today?",
        type: "textarea",
        required: true,
        hint: "Describe the colors, fonts, and materials you already use. The Studio refines this starting point instead of starting over.",
        placeholder:
          "Example: oval oak-anchor mark on cream, warm oak and soft harbor blue on our business cards.",
      },
      {
        id: "logoMaterialNote",
        label: "Your existing logo file or link",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe the logo filename, link, or colors. Files are not uploaded on this form. A supplied logo is required because the Studio places your existing mark and does not draw a new one.",
        placeholder:
          "Example: logo named harbor-oak-mark.svg, warm oak on cream.",
      },
      {
        id: "likesDislikes",
        label: "Examples of what you like and dislike",
        type: "textarea",
        required: true,
        hint: "These guide the palette and font pairing recommendations on your Brand Direction Sheet.",
        placeholder:
          "Example: like calm and timeless. Dislike neon accents and crowded layouts.",
      },
      {
        id: "businessFacts",
        label: "Accurate business information for the sheet",
        type: "textarea",
        required: true,
        hint: "Only facts you can stand behind. The Studio does not write taglines, slogans, or positioning statements.",
        placeholder:
          "Example: downtown portrait sessions, discovery calls by appointment.",
      },
    ],
  },
  "social-setup": {
    type: "social-setup",
    title: "Social Profile Kit Intake",
    lead:
      "Tell us which one platform and what the Studio should prepare in your setup kit. You will apply the finished kit on the platform yourself. The Studio never asks for your platform login, password, or admin invite.",
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
        id: "displayName",
        label: "Display name to show on the profile",
        type: "text",
        required: true,
        placeholder: "Example: Harbor & Oak Studio",
      },
      {
        id: "profileGoal",
        label: "What should this profile accomplish?",
        type: "textarea",
        required: true,
      },
      {
        id: "currentProfileNotes",
        label: "Current profile details or what should change",
        type: "textarea",
        required: true,
        placeholder:
          "Example: current bio text, website link, or what feels outdated. For a new setup, describe what the profile should say.",
      },
      {
        id: "website",
        label: "Website or booking link (if you have one)",
        type: "text",
        required: false,
        placeholder: "Example: https://your-site.example",
      },
      {
        id: "phone",
        label: "Phone or contact number (if it belongs on the profile)",
        type: "text",
        required: false,
      },
      {
        id: "brandNotes",
        label: "Logo and brand notes for the profile image",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "Describe the logo filename, link, or colors the Studio should use for the avatar. You may also say you will provide the logo later. Files are not uploaded on this form. Do not send passwords or admin invites.",
        placeholder: "Example: logo named harbor-oak-mark.svg, warm oak + soft harbor blue.",
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
    title: "Promotion Update Intake",
    lead:
      "Share your existing promotion as the reference, then the exact bounded changes. The Studio recreates one updated final — it does not edit your original source file in place.",
    fields: [
      {
        id: "businessName",
        label: "Business name on the promotion",
        type: "text",
        required: true,
      },
      {
        id: "itemLink",
        label: "Link or clear identity for the existing promotional item",
        type: "text",
        required: true,
      },
      {
        id: "referenceMaterialNote",
        label:
          "Describe the reference file you are supplying (PNG, JPG, or flattened PDF preferred)",
        type: "textarea",
        required: true,
      },
      {
        id: "whatChange",
        label: "What needs to change? (dates, prices, contact, wording, and/or one image)",
        type: "textarea",
        required: true,
      },
      {
        id: "newInfo",
        label: "What is the correct new information?",
        type: "textarea",
        required: true,
      },
      {
        id: "remove",
        label: "What needs to be removed?",
        type: "textarea",
      },
      {
        id: "replacementImageNote",
        label: "If replacing one image, describe the replacement image you are supplying",
        type: "textarea",
      },
      {
        id: "whereLive",
        label: "Where is it currently live?",
        type: "text",
        required: true,
      },
      {
        id: "acceptRecreationLimits",
        label:
          "I understand this is a reference-guided recreation with bounded edits — not a pixel-perfect or source-file edit",
        type: "select",
        required: true,
        options: ["Yes — I accept recreation with limits", "No"],
      },
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
        label: "Brand references you already have — or say you are using wordmark only",
        type: "textarea",
        required: true,
        role: "materials",
        hint: "A logo is not required for this flyer. If you have a logo or photo, name it here. If you do not, write that you want the business name set as a wordmark. You can send an actual file from your Studio Board after this form. Do not invent files.",
        placeholder: "Example: no logo and no photos — please use Cedar & Bloom Home Organizing as a wordmark.",
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
    lead: "Two branded graphics for one campaign — tell us the focus, exact copy, and the use and format for each graphic.",
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
        id: "graphicA_authorizedPurpose",
        label: "Graphic 1 — intended use",
        type: "select",
        required: true,
        options: ["Print", "Social", "Email", "In-store", "Other"],
        hint: "Choose how Graphic 1 will be used. The Studio will not invent a use for this graphic.",
      },
      {
        id: "graphicA_agreedPlate",
        label: "Graphic 1 — agreed format",
        type: "select",
        required: true,
        options: [
          "Square 1024×1024 (social / feed)",
          "Portrait 1024×1536 (print / tall)",
          "Landscape 1536×1024 (wide)",
        ],
        hint: "Choose one agreed Studio format for Graphic 1. Only these formats are available for this service.",
      },
      {
        id: "graphicB_authorizedPurpose",
        label: "Graphic 2 — intended use",
        type: "select",
        required: true,
        options: ["Print", "Social", "Email", "In-store", "Other"],
        hint: "Choose how Graphic 2 will be used. The Studio will not invent a use for this graphic.",
      },
      {
        id: "graphicB_agreedPlate",
        label: "Graphic 2 — agreed format",
        type: "select",
        required: true,
        options: [
          "Square 1024×1024 (social / feed)",
          "Portrait 1024×1536 (print / tall)",
          "Landscape 1536×1024 (wide)",
        ],
        hint: "Choose one agreed Studio format for Graphic 2. Only these formats are available for this service.",
      },
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
    lead: "One short video, 15–30 seconds — share purpose, format, and media references.",
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
