/** Studio policies & FAQ — single source for Help Center (and contextual links elsewhere). */

export type PolicyContentBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; intro?: string; items: readonly string[] };

export type FaqItem = {
  id: string;
  question: string;
  blocks: readonly PolicyContentBlock[];
};

export type PolicyItem = {
  id: string;
  title: string;
  blocks: readonly PolicyContentBlock[];
};

export const studioPolicies = {
  aboutTheStudio: {
    title: "About The Studio",
    blocks: [
      {
        kind: "p",
        text: "The Studio helps small business owners turn ideas, services, products, promotions, and events into ready-to-use marketing campaigns.",
      },
      {
        kind: "p",
        text: "You share your vision through intake. The Studio organizes that direction and creates campaign concepts, social posts, emails, SMS copy, calendars, and supporting materials based on the package you choose.",
      },
      {
        kind: "ul",
        intro: "The Studio is for owners who want clear marketing materials without building everything from scratch.",
        items: [
          "Launching a promotion, product, event, or new offer",
          "Getting consistent monthly marketing support",
          "Building a long-term marketing rhythm with strategic guidance",
        ] as const,
      },
      {
        kind: "ul",
        intro: "What you receive:",
        items: [
          "Campaign concepts to review and choose from",
          "Written marketing materials ready for your channels",
          "A clear package scope so you know what is included",
          "Status updates through your Studio Board",
        ] as const,
      },
      {
        kind: "ul",
        intro: "What The Studio is not:",
        items: [
          "An ad-buying or media placement service",
          "A social media management or posting service",
          "An email or SMS sending platform",
          "A guarantee of sales, leads, or business growth",
        ] as const,
      },
    ] as const,
  },
  faq: {
    title: "Frequently Asked Questions",
    philosophy: {
      title: "WHAT DOES THE STUDIO DO?",
      blocks: [
        { kind: "p", text: "The Studio helps turn your ideas into marketing campaigns." },
        { kind: "p", text: "You provide the vision." },
        {
          kind: "p",
          text: "The Studio helps organize, develop, and create marketing materials based on that vision.",
        },
        { kind: "p", text: "The Studio guides." },
        { kind: "p", text: "You lead the vision." },
      ] as const,
    },
    items: [
      {
        id: "payments-non-refundable",
        question: "WHY ARE PAYMENTS NON-REFUNDABLE?",
        blocks: [
          {
            kind: "p",
            text: "The Studio begins reviewing, organizing, planning, and preparing your campaign based on the information you provide.",
          },
          {
            kind: "p",
            text: "Because creative work begins immediately after payment, payments are non-refundable once submitted.",
          },
        ] as const,
      },
      {
        id: "results-expectations",
        question: "WHAT RESULTS SHOULD I EXPECT?",
        blocks: [
          {
            kind: "p",
            text: "The Studio creates marketing materials based on your vision and selected package.",
          },
          {
            kind: "p",
            text: "Marketing can help increase visibility, awareness, engagement, and opportunities.",
          },
          { kind: "p", text: "However, The Studio does not guarantee:" },
          {
            kind: "ul",
            items: [
              "sales",
              "revenue",
              "leads",
              "followers",
              "bookings",
              "website traffic",
              "business growth",
            ] as const,
          },
          {
            kind: "p",
            text: "Business results depend on many factors beyond marketing materials alone.",
          },
        ] as const,
      },
      {
        id: "switch-packages-after-payment",
        question: "CAN I SWITCH PACKAGES AFTER PAYMENT?",
        blocks: [
          { kind: "p", text: "No." },
          {
            kind: "p",
            text: "Once production begins, your package is locked for the duration of that campaign.",
          },
          {
            kind: "p",
            text: "If you would like a different package, complete the current campaign first and then start a new campaign using the package of your choice.",
          },
        ] as const,
      },
      {
        id: "change-mind-after-intake",
        question: "WHAT IF I CHANGE MY MIND AFTER SUBMITTING MY INTAKE?",
        blocks: [
          {
            kind: "p",
            text: "Your campaign is created using the information provided during intake and review.",
          },
          {
            kind: "p",
            text: "You may submit clarification and use your included revision rounds.",
          },
          {
            kind: "p",
            text: "Major direction changes may require a new campaign or additional work.",
          },
        ] as const,
      },
      {
        id: "creative-room-ideas",
        question: "CAN I KEEP ADDING IDEAS THROUGH THE CREATIVE ROOM?",
        blocks: [
          {
            kind: "p",
            text: "The Creative Room is intended for clarification, inspiration, feedback, and additional context.",
          },
          {
            kind: "p",
            text: "New requests that significantly change the original campaign direction may require a new campaign or additional work.",
          },
        ] as const,
      },
      {
        id: "revision-definition",
        question: "WHAT COUNTS AS A REVISION?",
        blocks: [
          {
            kind: "p",
            text: "A revision is an adjustment to materials that have already been created.",
          },
          {
            kind: "ul",
            intro: "Examples include:",
            items: [
              "wording changes",
              "design adjustments",
              "content refinements",
              "visual updates",
            ] as const,
          },
          {
            kind: "ul",
            intro: "A revision is not:",
            items: [
              "a completely new campaign",
              "a new audience",
              "a new offer",
              "a new business direction",
              "a replacement concept",
            ] as const,
          },
          { kind: "p", text: "Major changes may require a new campaign." },
        ] as const,
      },
      {
        id: "campaign-timeline",
        question: "HOW LONG DOES MY CAMPAIGN TAKE?",
        blocks: [
          {
            kind: "p",
            text: "Campaigns are completed within approximately 7 business days after payment is received.",
          },
          {
            kind: "p",
            text: "Business days do not include weekends or holidays.",
          },
          {
            kind: "p",
            text: "Your Campaign Page will display your current status and estimated completion date.",
          },
        ] as const,
      },
      {
        id: "after-payment",
        question: "WHAT HAPPENS AFTER I PAY?",
        blocks: [
          { kind: "p", text: "Your campaign enters production." },
          {
            kind: "p",
            text: "You can monitor progress through your Studio Board and Campaign Page.",
          },
          {
            kind: "p",
            text: "Status updates are provided throughout the campaign lifecycle.",
          },
        ] as const,
      },
      {
        id: "revision-count",
        question: "HOW MANY REVISIONS DO I GET?",
        blocks: [
          {
            kind: "p",
            text: "Each package includes a specific number of revision rounds.",
          },
          {
            kind: "p",
            text: "Your Campaign Page includes a Revision Tracker showing:",
          },
          {
            kind: "ul",
            items: ["revisions included", "revisions used", "revisions remaining"] as const,
          },
        ] as const,
      },
      {
        id: "email-notifications",
        question: "WILL I RECEIVE EMAIL UPDATES?",
        blocks: [
          {
            kind: "p",
            text: "In this version of The Studio, campaign progress is shown inside your Studio Board — not through automated email notifications.",
          },
          {
            kind: "p",
            text: "After payment and intake, return to your Studio Board to see status updates, review concepts, and open Final Delivery when your package is ready.",
          },
          {
            kind: "p",
            text: "If you received an email or link from a test or external tool, use it only as a reminder to sign in. Your official next step is always shown on the Studio Board.",
          },
        ] as const,
      },
    ] as const satisfies readonly FaqItem[],
  },

  policies: {
    title: "Studio Policies",
    items: [
      {
        id: "payment-policy",
        title: "PAYMENT POLICY",
        blocks: [
          { kind: "p", text: "Creative production begins after payment is received." },
          { kind: "p", text: "Submitting an intake form does not begin production." },
        ] as const,
      },
      {
        id: "package-lock-policy",
        title: "PACKAGE LOCK POLICY",
        blocks: [
          {
            kind: "p",
            text: "Once payment is received, the selected package remains active until the campaign is completed.",
          },
          {
            kind: "p",
            text: "Package changes are not available during active production.",
          },
          {
            kind: "p",
            text: "Clients wishing to use a different package may start a new campaign after the current campaign is delivered.",
          },
        ] as const,
      },
      {
        id: "timeline-policy",
        title: "TIMELINE POLICY",
        blocks: [
          {
            kind: "p",
            text: "Campaigns are completed within approximately 7 business days after payment is received.",
          },
          { kind: "p", text: "Business days exclude weekends and holidays." },
        ] as const,
      },
      {
        id: "revision-policy",
        title: "REVISION POLICY",
        blocks: [
          {
            kind: "p",
            text: "Revision rounds are limited to the amount included in the selected package.",
          },
          {
            kind: "p",
            text: "Additional revisions may require a new order or additional fee.",
          },
        ] as const,
      },
      {
        id: "refund-policy",
        title: "REFUND POLICY",
        blocks: [{ kind: "p", text: "All payments are non-refundable once submitted." }] as const,
      },
      {
        id: "vision-responsibility-policy",
        title: "VISION RESPONSIBILITY POLICY",
        blocks: [
          {
            kind: "p",
            text: "Campaign concepts are created using the information submitted during intake, review, and approved campaign materials.",
          },
          {
            kind: "p",
            text: "Clients are responsible for providing accurate direction, preferences, goals, and supporting information.",
          },
        ] as const,
      },
      {
        id: "results-disclaimer",
        title: "RESULTS DISCLAIMER",
        blocks: [
          { kind: "p", text: "The Studio does not guarantee:" },
          {
            kind: "ul",
            items: [
              "sales",
              "revenue",
              "leads",
              "followers",
              "engagement",
              "bookings",
              "website traffic",
              "business outcomes",
            ] as const,
          },
          {
            kind: "p",
            text: "The Studio creates marketing materials based on client direction.",
          },
          {
            kind: "p",
            text: "Business results depend on factors beyond marketing materials alone.",
          },
        ] as const,
      },
      {
        id: "creative-room-policy",
        title: "CREATIVE ROOM POLICY",
        blocks: [
          {
            kind: "p",
            text: "The Creative Room may be used to submit clarification, inspiration, feedback, references, and supporting information.",
          },
          {
            kind: "p",
            text: "Requests that substantially change the approved campaign direction may require a new campaign or additional work.",
          },
        ] as const,
      },
    ] as const satisfies readonly PolicyItem[],
  },

  routes: {
    creativeRoom: "/creative-room",
    campaignHistory: "/campaign-details",
  },
} as const;
