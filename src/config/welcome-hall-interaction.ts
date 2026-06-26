/**
 * Welcome Hall interaction pass — copy and routes.
 * @see welcome-hall-direction.ts — FINAL ART DIRECTION (LOCKED)
 */

export const welcomeHallInteraction = {
  studioGuide: {
    welcome: "Welcome to Team Studio.",
    prompt: "What brings you here today?",
    options: {
      draftIdea: {
        label: "Start Drafting",
        description: "Shape a spark in the Draft Room.",
      },
      planProject: {
        label: "Plan a Project",
        description: "Intake and discovery for something bigger.",
      },
      explore: {
        label: "Explore The Studio",
        description: "Coming soon.",
        disabled: true,
      },
    },
  },
  artTower: {
    label: "Art Tower",
  },
  viewAhead: {
    label: "The View Ahead",
    /** Not a click target — responds when Start Drafting is selected */
    triggeredBy: "startDrafting" as const,
  },
  routes: {
    /** @deprecated legacy URLs — redirect to Project Discovery */
    draftRoom: "/business-discovery-studio",
    intake: "/business-discovery-studio",
  },
  transitionMs: 1400,
} as const;
