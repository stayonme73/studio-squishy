/**
 * Welcome Hall V3 — interactive showroom.
 * PAUSED — tower/wall patterns live in Studio Guide; see welcome-hall-pivot.md.
 * @see docs/illustration/welcome-hall-v3-implementation-plan.md
 */

export const welcomeHallV3 = {
  journey: ["browse", "understand", "choose", "confirm", "proceed"] as const,

  /**
   * FOUNDER RULE: If Founder Tagia has to squint, the customer will too.
   *
   * showroomWall.behavior — INTERACTIVE (tower selects → wall updates → CTA → guide).
   * showroomWall.visualLanguage — readability benchmark from static "Ideas Into Action"
   *   (large type, scannable — NOT static, NOT a dashboard).
   *
   * Combine: interactive showroom behavior + Ideas Into Action readability.
   * Readability over realism — visitors are at a computer, not walking the hall.
   */
  /**
   * Layout: WALL + PORTAL — not WALL + CORNER + PORTAL.
   * Reclaim dead hallway corner for expanded showroom wall (digital, not real building).
   * Artwork (e.g. horn) stays — give words room to breathe via space, not shrink art.
   */
  layout: {
    model: "wall-plus-portal" as const,
    remove: "unnecessary corner section near end of hallway",
    reclaimFor: ["expand showroom wall", "swing wall toward visitor", "larger readable type"],
  },

  showroomWall: {
    behavior: "interactive" as const,
    visualLanguage: "ideas-into-action-readability" as const,
    structure: [
      "Large category title",
      "Three large scannable outcome statements",
      'Short "You may receive" section',
      "Large HOW CAN WE HELP button",
    ] as const,
    notAllowed: [
      "Tiny bullet lists",
      "Dense dashboards",
      "Small unreadable text",
      "Corporate software screens",
      "Reverting to static-only wall",
    ] as const,
  },

  readabilityRule:
    "Same information, scannable presentation — not less information, not a static wall.",

  towerFaces: [
    {
      id: "marketing",
      label: "Marketing",
      scanLines: ["Get noticed.", "Stay consistent.", "Reach more customers."] as const,
      deliverablesPreview: [
        "Campaign concepts.",
        "Content ideas.",
        "Email + SMS drafts.",
      ] as const,
    },
    {
      id: "content-creation",
      label: "Content Creation",
      scanLines: ["Turn ideas into posts.", "Build content themes.", "Stay on brand."] as const,
      deliverablesPreview: ["Content plan.", "Post ideas.", "Video scripts."] as const,
    },
    {
      id: "business-planning",
      label: "Consulting",
      scanLines: ["Clarify your idea.", "Shape the offer.", "Plan next steps."] as const,
      deliverablesPreview: ["Roadmap.", "Action plan.", "Priority list."] as const,
    },
    {
      id: "systems-automation",
      label: "Systems & Automation",
      scanLines: ["Streamline workflows.", "Recommend the right tools.", "Save time daily."] as const,
      deliverablesPreview: ["Process map.", "Automation ideas.", "Implementation plan."] as const,
    },
  ] as const,

  showroomDefault: {
    headline: "Ideas Into Action",
    lines: ["Dream it.", "Shape it.", "Build it."] as const,
  },

  leftWall: {
    message: "Every project starts with an idea.",
  },

  kiosk: {
    panelLabel: "HOW CAN WE HELP?",
    screenLabel: "Tap to Open the Studio Guide",
    earlyTapMessage:
      "Explore the showroom wall first so we can help you choose the right path.",
  },

  wallCta: "HOW CAN WE HELP?",

  status: "v3.1-approved-in-development" as const,
} as const;
