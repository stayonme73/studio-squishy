/**
 * Studio Tablet V1 — shell constants (architecture plan §10.11).
 * @see docs/studio-tablet-architecture-plan.md
 * @see docs/studio-tablet-v1-direction.md
 */

export const studioTabletV1 = {
  /** Preferred logical screen opening (CSS px). */
  viewportPreferred: { width: 834, height: 1112 },
  viewportMin: { width: 768, height: 960 },

  inset: {
    top: 56,
    bottom: 72,
    x: 24,
  },

  type: {
    bodyMinPx: 16,
    helperMinPx: 14,
    labelMinPx: 14,
    buttonMinPx: 16,
    stageTitleMinPx: 20,
    eyebrowMinPx: 12,
  },

  touch: {
    fieldMinH: 48,
    buttonMinH: 48,
    targetMin: 44,
    gapMin: 8,
  },

  keyboardRemainingMinH: 520,
  bezelOutsideMin: 16,
  cornerClearMin: 12,

  stages: [
    "route-map",
    "builder",
    "studio-plan",
    "review-confirm",
    "intake",
    "board-handoff",
  ] as const,

  stageLabels: {
    "route-map": "Project Type",
    builder: "Services",
    "studio-plan": "Review",
    "review-confirm": "Confirmation",
    intake: "Business Information",
    "board-handoff": "Studio Board",
  } as const,
} as const;

export type StudioTabletStage = (typeof studioTabletV1.stages)[number];
