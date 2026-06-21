/**
 * Studio Guide V1 — LOCKED package content.
 * Do not paraphrase, invent, or substitute copy without Tagia approval.
 */

import type { StudioGuidePackageId } from "@/config/studio-guide";

export type StudioGuideDeliverable = {
  title: string;
  lines: readonly string[];
};

export type StudioGuideV1Package = {
  id: StudioGuidePackageId;
  label: string;
  tagline: string;
  price: string;
  marginNote?: string;
  bestFor: string;
  deliverables: readonly StudioGuideDeliverable[];
  timeline: string;
  revisions: string;
  refundPolicy: readonly [string, string];
  selectCta: string;
  marginNotes: readonly string[];
};

export const studioGuideCustomerClarifications = {
  lead: "The Studio creates marketing assets.",
  studioDoesNot: [
    "Send emails",
    "Send text messages",
    "Run paid advertising",
    "Manage social media accounts",
    "Create television commercials",
    "Guarantee business results",
  ] as const,
  closing: [
    "The Studio creates the marketing package.",
    "The client executes the package.",
  ] as const,
} as const;

export const studioGuideV1Packages: readonly StudioGuideV1Package[] = [
  {
    id: "spark",
    label: "SPARK",
    tagline: "One-Time Campaign",
    price: "$299",
    marginNote: "Great for testing a new idea.",
    bestFor:
      "Business owners who want to test a promotion, product, event, or offer before investing in a larger marketing system.",
    deliverables: [
      {
        title: "3 Campaign Concepts",
        lines: [
          "Three different campaign directions",
          "Each concept includes headline, theme, and messaging angle",
          "Customer selects one direction to move forward",
        ],
      },
      {
        title: "3 Social Media Posts",
        lines: [
          "Written copy only",
          "Client chooses platform: Facebook, Instagram, LinkedIn, or TikTok",
          "All 3 posts are created for the selected platform",
        ],
      },
      {
        title: "3 Marketing Emails",
        lines: [
          "Written email content",
          "Delivered as copy the client can send through their email platform",
          "Studio does not send emails",
        ],
      },
      {
        title: "3 SMS Messages",
        lines: [
          "Written text message copy",
          "Delivered as copy the client can send through their SMS platform",
          "Studio does not send SMS",
        ],
      },
      {
        title: "1 Marketing Calendar",
        lines: [
          "Simple campaign schedule",
          "Shows what to post and when",
          "Helps organize campaign rollout",
        ],
      },
      {
        title: "1 Video Script",
        lines: [
          "Short-form video script",
          "Designed for TikTok, Instagram Reels, or YouTube Shorts",
          "Client chooses platform",
        ],
      },
    ],
    timeline: "First concepts delivered within 7 business days",
    revisions: "1 Revision Round Included",
    refundPolicy: [
      "Full refund available before project begins.",
      "No refunds after campaign development starts.",
    ],
    selectCta: "START WITH SPARK",
    marginNotes: [
      "Delivered in 7 business days",
      "1 revision included",
      "Full refund before work begins",
      "No refunds after production starts",
      "review below",
    ],
  },
  {
    id: "momentum",
    label: "MOMENTUM",
    tagline: "Ongoing Support",
    price: "$499 per month",
    marginNote: "Built for consistent visibility.",
    bestFor:
      "Businesses that want consistent marketing support and regular content creation.",
    deliverables: [
      {
        title: "3 Campaign Concepts Per Month",
        lines: [],
      },
      {
        title: "6 Social Media Posts",
        lines: ["Written copy only", "Client selects preferred platform"],
      },
      {
        title: "6 Marketing Emails",
        lines: ["Delivered as ready-to-send copy"],
      },
      {
        title: "6 SMS Messages",
        lines: ["Delivered as ready-to-send copy"],
      },
      {
        title: "Monthly Marketing Calendar",
        lines: ["Organized monthly schedule"],
      },
      {
        title: "2 Video Scripts",
        lines: ["Short-form content", "TikTok, Reels, or Shorts"],
      },
    ],
    timeline: "First concepts delivered within 7 business days",
    revisions: "1 Revision Round Included",
    refundPolicy: [
      "Refund available before monthly work begins.",
      "No refunds once monthly production starts.",
    ],
    selectCta: "START WITH MOMENTUM",
    marginNotes: [
      "Delivered in 7 business days",
      "1 revision included",
      "Refund before monthly work begins",
      "No refunds once production starts",
      "review below",
    ],
  },
  {
    id: "growth",
    label: "GROWTH",
    tagline: "Done-With-You Partnership",
    price: "$799 per month",
    marginNote: "Designed for businesses ready to scale.",
    bestFor:
      "Businesses ready to build a complete marketing system instead of running one-off campaigns.",
    deliverables: [
      {
        title: "3 Campaign Concepts",
        lines: [],
      },
      {
        title: "10 Social Media Posts",
        lines: ["Written copy only", "Client selects preferred platform"],
      },
      {
        title: "10 Marketing Emails",
        lines: ["Delivered as ready-to-send copy"],
      },
      {
        title: "10 SMS Messages",
        lines: ["Delivered as ready-to-send copy"],
      },
      {
        title: "Monthly Marketing Calendar",
        lines: [],
      },
      {
        title: "3 Video Scripts",
        lines: ["TikTok, Reels, or Shorts"],
      },
      {
        title: "Quarterly Strategy Session",
        lines: [],
      },
      {
        title: "Priority Production Queue",
        lines: [],
      },
      {
        title: "3 Revision Rounds Included",
        lines: [],
      },
    ],
    timeline: "First concepts delivered within 7 business days",
    revisions: "3 Revision Rounds Included",
    refundPolicy: [
      "Refund available before project begins.",
      "No refunds once campaign development starts.",
    ],
    selectCta: "START WITH GROWTH",
    marginNotes: [
      "Delivered in 7 business days",
      "3 revisions included",
      "Refund before work begins",
      "No refunds once production starts",
      "review below",
    ],
  },
] as const;

export function getStudioGuideV1Package(packageId: StudioGuidePackageId | string | undefined) {
  if (!packageId) return null;
  return studioGuideV1Packages.find((pkg) => pkg.id === packageId) ?? null;
}
