/**
 * Page 1 homepage / Lobby rebuild.
 * Layout reference only — not a pixel copy. Existing Studio identity stays.
 */

import { threePackageRevisionHomeAnswer } from "@/config/studio-three-package-revision-truth-v1";

export const STUDIO_HOMEPAGE_LOBBY_REBUILD_PACKAGE_ID =
  "STUDIO-HOMEPAGE-LOBBY-REBUILD-1" as const;

export const studioHomepageLobbyRebuildV1 = {
  packageId: STUDIO_HOMEPAGE_LOBBY_REBUILD_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  pageOnly: "home_lobby" as const,
  productionCodebase: true as const,
  noSeparatePrototype: true as const,
  visualReference:
    "First dark faded-background homepage concept. Layout/visual target, not pixel-for-pixel." as const,
  preserveIdentity: true as const,
  existingLoungeBackground: true as const,
  existingGlassTint: true as const,
  champagneTrim: true as const,
  noNewColorFamily: true as const,
  noHeavyBlackCards: true as const,
  noPerSectionImprovising: true as const,
  noPricesOnHomepage: true as const,
  noIntakeDump: true as const,
  noPackageDetailPages: true as const,
  noCheckoutChange: true as const,
  noMyStudioRebuild: true as const,
  noFinalDeliveryChange: true as const,
  noPublish: true as const,
  noMerge: true as const,
  noPush: true as const,
  myStudioHref: "/studio-board" as const,
  helpHref: "/help-center?from=studio-lobby" as const,
  studioVoiceHref: "/studio-conversation-room" as const,
  /** Monitored inbox until hello@thestudiocompany7.com is verified. Planned address stays in domain readiness. */
  studioVoiceEmailHref: "mailto:thestudio7273@gmail.com" as const,
  stampDoc:
    "docs/launch/studio-homepage-lobby-rebuild-1/STUDIO-HOMEPAGE-LOBBY-REBUILD-1.md" as const,
} as const;

export const homepageBrand = {
  name: "The Studio Company",
  mark: "THE STUDIO COMPANY",
} as const;

export const homepageNavInformational = [
  { id: "home", label: "Home", href: "/" },
  { id: "what-we-do", label: "What We Do", href: "#our-work" },
  { id: "our-work", label: "Our Work", href: "#packages" },
  { id: "how-it-works", label: "How It Works", href: "#how-it-works" },
  { id: "about", label: "About", href: "#about" },
  { id: "faq", label: "FAQ", href: "#faq" },
  { id: "contact", label: "Contact", href: "#contact" },
] as const;

export const homepageHero = {
  eyebrow: "Creative support for busy businesses",
  headline: "Creative support for busy businesses.",
  headlineLead: "Creative support",
  headlineBridge: "for",
  headlineAccent: "busy businesses.",
  body: "The Studio turns your ideas, footage, and business information into polished videos, graphics, and promotional materials without making you manage the whole creative process.",
  seeWhatWeCreate: "See Our Work",
  seeWhatWeCreateHref: "#our-work",
  /** Held off the hero. The words and link stay so it can come back. */
  showSeeOurWork: false,
  choosePackage: "Choose a Package",
  choosePackageHref: "#packages",
  supportingLine: "We create it. You stay in control.",
  assurances: [
    { id: "control", icon: "clock", text: "We create it. You stay in control." },
    { id: "quality", icon: "people", text: "Professional quality." },
    { id: "support", icon: "check", text: "Reliable support for your business." },
  ],
} as const;

export const homepageDemo = {
  label: "Studio Demo",
  supportingLine:
    "See how The Studio works from start to finished delivery.",
  playLabel: "Play Studio Demo",
  src: "/studio-demo/clip-repurposing-studio-tour-v1-polish-9.mp4?v=polish9-20261022",
  poster: "/studio-demo/clip-repurposing-studio-tour-v1-polish-9-poster.jpg?v=polish9-20261022",
  approved: true,
  closeLabel: "Close",
  replayLabel: "Replay",
  playerLabel: "Studio Demo player",
  preparingNote:
    "The Studio Demo is being prepared. Sample work is shown below.",
  placeholderNote: "Playable Studio Demo reserved for a later asset.",
  sampleLabel: "Studio Demo",
} as const;

export const homepageWhatWeCreate = {
  eyebrow: "What We Create",
  headline: "A wide range of creative materials to help your business.",
  clarifier: "Examples of work The Studio can create. Current packages are below.",
  items: [
    // Locked lead-with-core order. Do not reshuffle without Tagia.
    {
      id: "long-to-short",
      label: "Long video to short clips",
      tilePreview: "/studio-homepage/what-we-create/long-to-short-hero.jpg?v=hero-20261016",
    },
    {
      id: "short-form",
      label: "Short-form video editing",
      tilePreview: "/studio-homepage/what-we-create/short-form-hero.jpg?v=hero2-20261016",
    },
    {
      id: "social-graphics",
      label: "Social graphics",
      tilePreview: "/studio-homepage/what-we-create/social-graphics-hero.jpg?v=hero3-20261016",
    },
    {
      id: "ad-creative",
      label: "Ad creative",
      tilePreview: "/studio-homepage/what-we-create/ad-creative-hero.jpg?v=hero2-20261016",
    },
    {
      id: "email-text",
      label: "Email & text campaign materials",
      tilePreview: "/studio-homepage/what-we-create/email-text-hero.jpg?v=hero2-20261016",
    },
    {
      id: "menu-price",
      label: "Menu / price list",
      tilePreview: "/studio-homepage/what-we-create/menu-price-hero.jpg?v=hero-20261016",
    },
    {
      id: "reviews-proof",
      label: "Reviews & customer-proof materials",
      tilePreview: "/studio-homepage/what-we-create/reviews-proof-hero.jpg?v=hero-20261016",
    },
    {
      id: "flyer-card",
      label: "Promotional flyers",
      tilePreview: "/studio-homepage/what-we-create/flyer-hero.jpg?v=hero-20261016",
    },
  ],
  sampleLabel: "Sample",
} as const;

export const homepagePackages = {
  eyebrow: "Our Four Packages",
  headline: "Simple, flexible creative support.",
  prompt: "Choose the package that best fits what you need.",
  viewDetails: "View Details",
  hideDetails: "Hide details",
  items: [
    {
      id: "clip_repurposing",
      name: "Clip Repurposing",
      description:
        "Turn qualifying long-form video into polished short-form clips.",
      detail:
        "You provide a qualifying long-form video. The Studio turns it into polished short-form clips. Ask Studio Voice if you want help choosing.",
      icon: "play",
      anchor: "package-clip-repurposing",
      detailHref: "/package/clip-repurposing",
    },
    {
      id: "short_form_video_editing",
      name: "Short-Form Video Editing",
      description:
        "Turn customer-selected English short clips or marked moments into polished short-form videos.",
      detail:
        "You provide English short clips or marked moments. The Studio edits them into polished short-form videos. Ask Studio Voice if you want help choosing.",
      icon: "cut",
      anchor: "package-short-form-video-editing",
      detailHref: "/package/short-form-video-editing",
    },
    {
      id: "social_and_promo_graphics",
      name: "Social & Promo Graphics",
      description:
        "Create coordinated social and promotional graphics for one campaign or theme.",
      detail:
        "You provide the campaign or theme details. The Studio creates coordinated social and promotional graphics. Ask Studio Voice if you want help choosing.",
      icon: "image",
      anchor: "package-social-and-promo-graphics",
      detailHref: "/package/social-promo-graphics",
    },
    {
      id: "campaign_launch_kit",
      name: "Campaign Launch Kit",
      description: "One campaign, coordinated across the materials you need.",
      detail:
        "You provide one offer, event, launch, or announcement. The Studio turns it into a polished set of campaign materials. Ask Studio Voice if you want help choosing.",
      icon: "stack",
      anchor: "package-campaign-launch-kit",
      detailHref: "/package/campaign-launch-kit",
    },
  ],
} as const;

export const homepageHowItWorks = {
  eyebrow: "How It Works",
  headline: "A simple process from start to finish.",
  steps: [
    {
      id: "choose",
      title: "Choose what you need",
      copy: "Explore The Studio and choose the package that fits.",
    },
    {
      id: "tell-us",
      title: "Tell us about your project",
      copy: "Share the information and preferences we need.",
    },
    {
      id: "review-pay",
      title: "Review & pay",
      copy: "Confirm your project, package, and total.",
    },
    {
      id: "materials",
      title: "Provide your materials",
      copy: "After checkout, add your files in My Studio.",
    },
    {
      id: "create-deliver",
      title: "We create & deliver",
      copy: "The Studio creates your project, you review it, and finished files arrive through Final Delivery.",
    },
  ],
} as const;

export const homepageAbout = {
  eyebrow: "About",
  headline: "The Studio",
  paragraphs: [
    "The Studio Company helps businesses get polished creative work made without having to manage a complicated production process.",
    "Your accounts remain yours. You decide where and when the finished work is published.",
    "Work with The Studio from wherever your business is.",
  ],
} as const;

export const homepageFaq = {
  eyebrow: "Frequently Asked Questions",
  headline: "Quick answers to common questions.",
  items: [
    {
      id: "what-create",
      question: "What does The Studio Company create?",
      answer:
        "The Studio creates polished videos, graphics, and promotional materials from your ideas, footage, and business information. We build the work you requested. We do not run your business, buy ads, manage your accounts, or send campaigns for you.",
    },
    {
      id: "which-package",
      question: "How do I know which package I need?",
      answer:
        "Choose the package that best matches what you want created. Each package includes a clear description of what you provide and what The Studio delivers.",
    },
    {
      id: "posting",
      question: "Do you post to my social media accounts?",
      answer:
        "No. The Studio does not post or manage your accounts. You receive the finished files and post or share them yourself.",
    },
    {
      id: "passwords",
      question: "Do I need to give you my passwords?",
      answer:
        "No. The Studio does not take passwords and does not log into social, ads, email, reviews, or Google Business.",
    },
    {
      id: "provide",
      question: "What do I need to provide?",
      answer:
        "That depends on the package. You share the information, wording, and rights The Studio needs. After checkout, you add the actual files in My Studio. We do not invent missing facts.",
    },
    {
      id: "samples",
      question: "Can I see sample work before I order?",
      answer:
        "Yes. You can view Studio demos and sample outputs before choosing a package. These examples show the type of work The Studio can create and are not presented as client results.",
    },
    {
      id: "revisions",
      question: "How do revisions work?",
      answer: threePackageRevisionHomeAnswer,
    },
    {
      id: "delivery",
      question: "How will I receive my finished project?",
      answer:
        "Your completed project is delivered through Final Delivery. Approved files are ready to download there.",
    },
  ],
} as const;

export const homepageVoice = {
  label: "Ask Studio Voice",
  shortLabel: "Need Help?",
} as const;

export const homepageContact = {
  eyebrow: "Contact",
  headline: "Have a question before you start?",
  paths: [
    {
      id: "voice",
      title: "Ask Studio Voice",
      body: "Quick answers about packages, the process, revisions, delivery, and what to do next.",
    },
    {
      id: "email",
      title: "Email The Studio",
      body: "For matters requiring human follow-up.",
    },
    {
      id: "help",
      title: "Help Center",
      body: "Policies, common questions, and guidance.",
    },
  ],
} as const;

export const homepageFooter = {
  brand: "The Studio Company",
} as const;

export const homepageForbiddenCopy = [
  "fast turnaround",
  "worldwide",
  "testimonial",
  "started in 2026",
  "years of experience",
] as const;
