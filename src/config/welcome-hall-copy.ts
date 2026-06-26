/**
 * Welcome Hall copy — FINAL ART DIRECTION (LOCKED)
 * Customer-facing room name: Studio Lobby (@see customer-journey-v1)
 * @see welcome-hall-direction.ts
 */

import { customerJourneyStepName } from "@/config/customer-journey-v1";

export const welcomeHallCopy = {
  hallName: customerJourneyStepName("studio-lobby"),

  leftWall: {
    message: "Every project starts with an idea.",
    design: ["warm", "inspiring", "creative", "encouraging"] as const,
  },

  studioGuideBox: {
    artLabel: "HOW CAN WE HELP?",
  },

  rightWall: {
    headline: "Ideas Into Action",
    lines: ["Dream it.", "Shape it.", "Build it."] as const,
    design: ["warm", "encouraging", "confident", "human"] as const,
  },

  artTower: {
    label: "Art Tower",
  },

  viewAhead: {
    label: "The View Ahead",
  },

  /** @deprecated Orphaned layout route — not used by locked `/` scene */
  welcomeWall: {
    greeting: "Every project starts with an idea.",
    guideLabel: "Studio Guide",
    tagline: "You're in the right place.",
    spark: {
      label: "Today's Spark",
      quote: "Creativity connects things. Innovation builds the future.",
    },
    workspacesAvailable: {
      label: "Workspaces Available",
      count: "6",
      subtext: "Ready when you are.",
    },
    whatWeDo:
      "We plan, write, design, and produce campaigns — so you can stay focused on running your business.",
    kioskMessage: "HOW CAN WE HELP?",
    pricingLabel: "Choose your pace",
    tiers: {
      spark: { name: "Spark", price: "From $150" },
      momentum: { name: "Momentum", price: "From $350/mo" },
      growth: { name: "Growth", price: "From $650/mo" },
    },
    board: {
      headline: "No active campaigns yet.",
      prompt: "Ready to start your first campaign?",
    },
    cta: "Start New Campaign",
  },

  /** @deprecated Orphaned layout route */
  artPrism: {
    label: "Digital Art Prism",
  },

  /** @deprecated Orphaned layout route */
  studioDepth: {
    label: "Studio Depth",
    headline: "A full creative team behind the glass.",
    capabilities: [
      { name: "Copy & Content", detail: "Words that sound like you — not a template." },
      { name: "Strategy", detail: "Campaign direction before the first draft ships." },
      { name: "Design & Production", detail: "Visual work, video, and deliverables — handled." },
    ],
    future: "More Studio rooms opening as The Studio grows.",
  },

  /** @deprecated Orphaned layout route */
  endPortal: {
    label: "The View Ahead",
    viewAhead: "The View Ahead",
  },

  /** @deprecated Orphaned layout route */
  workspaces: {
    copywriter: { name: "Copywriter", side: "left" as const, depth: "near" as const },
    strategy: { name: "Strategy", side: "left" as const, depth: "mid" as const },
    "campaign-planning": {
      name: "Campaign Planning",
      side: "left" as const,
      depth: "far" as const,
    },
    "quality-review": {
      name: "Quality Review",
      side: "right" as const,
      depth: "near" as const,
    },
    "video-production": {
      name: "Video Production",
      side: "right" as const,
      depth: "mid" as const,
    },
    reserved: { name: "Reserved", side: "right" as const, depth: "far" as const },
  },
} as const;

export type WorkspaceConfigKey = keyof typeof welcomeHallCopy.workspaces;
