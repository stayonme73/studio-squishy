/**
 * Studio locked design system — owner-approved palette.
 * Studio Paper (#EBE2D4): primary utility background — do not lighten or darken.
 */

export const studioDesignSystem = {
  colors: {
    /** Warm sketchbook / drafting paper — locked middle ground between linen and cork */
    paper: "#EBE2D4",
    ink: "#2E2B28",
    denim: "#2C3E50",
    brass: "#B08D57",
    /** Secondary labels — ink at reduced strength (not steel-gray) */
    muted: "color-mix(in srgb, #2E2B28 56%, transparent)",
  },
  intake: {
    cardMaxWidth: "42rem",
    cardHeight: "min(34rem, calc(100dvh - 4rem))",
    visionStep: 8,
  },
} as const;
