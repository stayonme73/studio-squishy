/**
 * Studio Guide — LOCKED copy and config.
 * Self-service only — no discovery calls or booking links.
 */

import { customerJourneyStepName } from "@/config/customer-journey-v1";

export const studioGuide = {
  title: customerJourneyStepName("studio-guide"),
  subtitle: "Which package fits you?",
  headerLine: "Three paths. One goal—your growth.",
  routeToDraftRoom: "/draft-room",

  helpCard: {
    title: "NEED HELP CHOOSING?",
    description: "Answer a few questions and we'll recommend the best path for your business.",
    cta: "HELP ME CHOOSE",
  },

  footer: {
    backLabel: `Back to ${customerJourneyStepName("studio-lobby")}`,
    backHref: "/studio-lobby",
  },

  questionnaire: {
    resultPrefix: "WE RECOMMEND:",
    questions: [
      {
        id: "firstCampaign",
        prompt: "Is this your first marketing campaign?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "supportFrequency",
        prompt: "How often do you want marketing support?",
        options: [
          { value: "one-time", label: "One-time project" },
          { value: "monthly", label: "Monthly support" },
          { value: "long-term", label: "Long-term growth partner" },
        ],
      },
      {
        id: "involvement",
        prompt: "How involved do you want to be?",
        options: [
          { value: "do-it-for-me", label: "Do it for me" },
          { value: "do-it-with-me", label: "Do it with me" },
          { value: "get-started", label: "Just help me get started" },
        ],
      },
    ],
  },

  assets: {
    icons: {
      spark: "/studio-guide/icon-spark.png?v=4",
      momentum: "/studio-guide/icon-momentum.png?v=3",
      growth: "/studio-guide/icon-growth.png?v=3",
    },
    heroes: {
      spark: "/studio-guide/hero-spark.png?v=17",
      momentum: "/studio-guide/hero-momentum.png?v=16",
      growth: "/studio-guide/hero-growth.png?v=19",
    },
  },

  packageMood: {
    spark: "Energy · Ideas · Experimentation",
    momentum: "Movement · Consistency · Rhythm",
    growth: "Partnership · Strategy · Expansion",
  },

  whatHappensNext: {
    title: "What Happens Next",
    steps: [
      "Complete payment",
      "Meet your Studio Team",
      "Review your Vision Summary",
      "Receive your first campaign concepts",
    ] as const,
  },

  packages: [
    {
      id: "spark",
      label: "SPARK",
      tagline: "One-Time Campaign",
      sidebarDescription: "Launch your first campaign and see what resonates.",
      recommendationCopy:
        "Perfect for businesses launching their first campaign or testing a new idea.",
      accent: "orange" as const,
      features: [
        {
          icon: "rocket" as const,
          title: "Launch once.",
          description: "Start with a clear, focused campaign.",
          color: "teal" as const,
        },
        {
          icon: "flask" as const,
          title: "Test the waters.",
          description: "See what connects with your audience.",
          color: "orange" as const,
        },
        {
          icon: "target" as const,
          title: "See what lands.",
          description: "Learn what works best before you grow.",
          color: "blue" as const,
        },
      ],
      includes: [
        "3 Campaign Concepts",
        "3 Social Posts",
        "3 Emails",
        "3 SMS",
        "1 Marketing Calendar",
        "1 Video Script",
      ] as const,
      deliverableQuotas: [
        { id: "concepts", label: "Campaign Concepts", total: 3 },
        { id: "social", label: "Social Posts", total: 3 },
        { id: "emails", label: "Emails", total: 3 },
        { id: "sms", label: "SMS", total: 3 },
        { id: "calendar", label: "Marketing Calendar", total: 1 },
        { id: "video", label: "Video Script", total: 1 },
      ] as const,
      revisionRoundsIncluded: 1,
    },
    {
      id: "momentum",
      label: "MOMENTUM",
      tagline: "Ongoing Support",
      sidebarDescription: "Stay consistent with ongoing support that adapts as you learn.",
      recommendationCopy:
        "Ideal for businesses that need consistent visibility and ongoing support.",
      accent: "purple" as const,
      features: [
        {
          icon: "rocket" as const,
          title: "Stay visible.",
          description: "Keep your business showing up consistently.",
          color: "teal" as const,
        },
        {
          icon: "flask" as const,
          title: "Build momentum.",
          description: "Create steady marketing rhythm month after month.",
          color: "orange" as const,
        },
        {
          icon: "target" as const,
          title: "Improve over time.",
          description: "Use what works and refine what does not.",
          color: "blue" as const,
        },
      ],
      includes: [
        "3 Campaign Concepts per month",
        "6 Social Posts",
        "6 Emails",
        "6 SMS",
        "Monthly Marketing Calendar",
        "2 Video Scripts",
      ] as const,
      deliverableQuotas: [
        { id: "concepts", label: "Campaign Concepts", total: 3 },
        { id: "social", label: "Social Posts", total: 6 },
        { id: "emails", label: "Emails", total: 6 },
        { id: "sms", label: "SMS", total: 6 },
        { id: "calendar", label: "Marketing Calendar", total: 1 },
        { id: "video", label: "Video Scripts", total: 2 },
      ] as const,
      revisionRoundsIncluded: 1,
    },
    {
      id: "growth",
      label: "GROWTH",
      tagline: "Done-With-You Partnership",
      sidebarDescription:
        "For businesses ready to move beyond one-off promotions and build a complete marketing system.",
      recommendationCopy:
        "Designed for businesses ready for a strategic marketing partnership.",
      accent: "blue" as const,
      features: [
        {
          icon: "rocket" as const,
          title: "Build a complete marketing system.",
          description: "A full system — not scattered one-off campaigns.",
          color: "teal" as const,
        },
        {
          icon: "flask" as const,
          title: "Move from campaigns to consistency.",
          description: "Steady marketing rhythm instead of sporadic pushes.",
          color: "orange" as const,
        },
        {
          icon: "target" as const,
          title: "Scale with a long-term growth plan.",
          description: "Strategy that grows with your business over time.",
          color: "blue" as const,
        },
      ],
      includes: [
        "3 Campaign Concepts",
        "10 Social Media Posts",
        "10 Marketing Emails",
        "10 SMS Messages",
        "3 Video Scripts",
        "Monthly Marketing Calendar",
        "Quarterly Strategy Session",
        "Priority Production Queue",
        "3 Revision Rounds Included",
      ] as const,
      deliverableQuotas: [
        { id: "concepts", label: "Campaign Concepts", total: 3 },
        { id: "social", label: "Social Media Posts", total: 10 },
        { id: "emails", label: "Marketing Emails", total: 10 },
        { id: "sms", label: "SMS Messages", total: 10 },
        { id: "video", label: "Video Scripts", total: 3 },
        { id: "calendar", label: "Marketing Calendar", total: 1 },
      ] as const,
      revisionRoundsIncluded: 3,
    },
  ] as const,
} as const;

export type StudioGuidePackageId = (typeof studioGuide.packages)[number]["id"];

export type DeliverableQuotaId =
  (typeof studioGuide.packages)[number]["deliverableQuotas"][number]["id"];

export type DeliverableQuota = {
  id: DeliverableQuotaId;
  label: string;
  total: number;
};

export function getStudioGuidePackage(packageId: StudioGuidePackageId | string | undefined) {
  if (!packageId) return null;
  return studioGuide.packages.find((pkg) => pkg.id === packageId) ?? null;
}

export function getPackageDeliverableQuotas(
  packageId: StudioGuidePackageId | string | undefined,
): readonly DeliverableQuota[] {
  return getStudioGuidePackage(packageId)?.deliverableQuotas ?? [];
}

export function getPackageRevisionRounds(packageId: StudioGuidePackageId | string | undefined) {
  return getStudioGuidePackage(packageId)?.revisionRoundsIncluded ?? 1;
}

export function getPackageIncludes(packageId: StudioGuidePackageId | string | undefined) {
  return getStudioGuidePackage(packageId)?.includes ?? [];
}

export function packageStartCta(packageId: StudioGuidePackageId) {
  const pkg = studioGuide.packages.find((p) => p.id === packageId);
  return pkg ? `START WITH ${pkg.label}` : "CONTINUE";
}

export function draftRoomHref(packageId: StudioGuidePackageId) {
  return `${studioGuide.routeToDraftRoom}?package=${packageId}`;
}

export function paymentHref(packageId: StudioGuidePackageId) {
  return `/payment?package=${packageId}`;
}
