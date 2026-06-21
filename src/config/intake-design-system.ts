/**

 * Intake Form — uses locked site-wide Studio Paper palette.

 * @see src/config/studio-design-system.ts

 */



export const intakeDesignSystem = {

  colors: {

    paper: "#EBE2D4",

    ink: "#2E2B28",

    denim: "#2C3E50",

    brass: "#B08D57",

    catSignYellow: "#f9d134",

    studioYellow: "#f9d134",

    studioOptional: "#d94e2b",

    mushroomGreen: "#6a8f5c",

  },

  layout: {

    shellMaxWidth: "42rem",

    shellHeight: "min(34rem, calc(100dvh - 4rem))",

    visionStep: 7,

  },

  /** Handwritten director notes — steps 1–8 */

  studioNotes: {

    1: "Don't overthink it.",

    2: "Plain language is perfect.",

    3: "Who do you want to reach?",

    4: "Tell us what success looks like.",

    5: "Your personality matters more than trends.",

    6: "Colors help set the mood.",

    7: "Guardrails matter as much as goals.",

    8: "Inspiration helps us understand your taste.",

  },

  /** Steps that show a tiny spark beside the handwritten note */

  studioNoteSparkSteps: [7, 8] as const,

} as const;

