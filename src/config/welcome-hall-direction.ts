/**
 * Welcome Hall — FINAL ART DIRECTION (LOCKED)
 *
 * Do not extend this phase without approval.
 */

export const welcomeHallDirection = {
  mission: {
    role: "The front door to Team Studio.",
    visitorState: "People arrive carrying ideas they want help bringing to life.",
    feel: [
      "welcoming",
      "innovative",
      "inspiring",
      "organized",
      "premium",
      "hopeful",
    ] as const,
    visitorThoughts: [
      "I can do this.",
      "I belong here.",
      "They know how to help me.",
    ] as const,
  },

  layout: {
    preserve: [
      "industrial ceiling and lighting",
      "flooring and premium atmosphere",
      "Art Tower location",
      "View Ahead city placement",
      "left wall location",
      "right wall location",
      "Studio Guide kiosk location",
    ] as const,
    remove: [
      "office hallway concept",
      "unused office doors along corridor",
      "building-tour framing",
    ] as const,
  },

  leftWall: {
    purpose: "Set the emotional tone.",
    message: "Every project starts with an idea.",
    design: ["warm", "inspiring", "creative", "encouraging"] as const,
    remove: [
      "workspace availability",
      "pricing",
      "coworking language",
      "operational dashboards",
      "studio event listings",
    ] as const,
  },

  studioGuideBox: {
    purpose: "Primary interaction point.",
    message: "HOW CAN WE HELP?",
    artRequirement: "Artwork must clearly communicate that this element is interactive. Avoid invisible hotspots.",
    prompt: "What brings you here today?",
    options: ["Start Drafting", "Plan a Project", "Explore The Studio"] as const,
  },

  startDrafting: {
    behavior: "Transitions visitors into the Draft Room experience.",
    usesViewAhead: true,
    viewAheadNotAButton: true,
    transitionExamples: ["fade", "dissolve", "cinematic movement", "elegant zoom"] as const,
  },

  artTower: {
    purpose: "Visual identity and transition into Studio Guide.",
    preserve: "Existing Art Tower remains in place.",
    transitionPoint: true,
    artwork: {
      visualOnly: true,
      noQuotes: true,
      noMenus: true,
      noOperationalInfo: true,
      themes: ["imagination", "creativity", "transformation", "possibility"] as const,
    },
    spin: "Future behavior — requires proper layered assets. Until then, preserve approved artwork.",
  },

  rightWall: {
    purpose: "Communicate why Team Studio exists.",
    headline: "Ideas Into Action",
    lines: ["Dream it.", "Shape it.", "Build it."] as const,
    design: ["warm", "encouraging", "confident", "human"] as const,
    avoid: [
      "pricing",
      "service menus",
      "coworking language",
      "generic corporate slogans",
      "duplicate Studio branding",
    ] as const,
  },

  experienceFlow: [
    "Visitor enters Welcome Hall — wonder, trust, curiosity",
    "Left Wall: Every project starts with an idea.",
    "Right Wall: Ideas Into Action — Dream it · Shape it · Build it.",
    "Tower or kiosk: transition into Studio Guide",
    "Studio Guide: compare Spark · Momentum · Growth",
    "Draft Room: confirm package, intake, begin",
  ] as const,
} as const;
