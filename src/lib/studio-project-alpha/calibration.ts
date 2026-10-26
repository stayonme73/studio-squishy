/**
 * Owner calibration → reusable Studio rules.
 * Tagia should not have to catch the same failure twice.
 */

import type { StudioLearningLevel } from "@/config/studio-project-alpha-v1";

export type StudioCalibrationLesson = {
  id: string;
  level: StudioLearningLevel;
  rule: string;
  encodedAs: string;
};

export const OWNER_QUALITY_DOCTRINE: readonly StudioCalibrationLesson[] = [
  {
    id: "anti-copy-signature",
    level: "owner_quality_doctrine",
    rule: "Do not recycle prior-customer visual signatures.",
    encodedAs: "evaluateAntiCopy + blocked Maya-like default",
  },
  {
    id: "colors-are-not-design",
    level: "owner_quality_doctrine",
    rule: "Different colors alone do not equal different design.",
    encodedAs: "anti-copy compares layout skeleton, geometry, CTA, and content distribution",
  },
  {
    id: "full-canvas",
    level: "owner_quality_doctrine",
    rule: "Use the entire canvas intelligently.",
    encodedAs: "evaluateFullCanvasComposition top/mid/bottom thirds",
  },
  {
    id: "intentional-negative-space",
    level: "owner_quality_doctrine",
    rule: "Negative space must look intentional.",
    encodedAs: "accidental_dead_space vs compositionPlan.intentionalNegativeSpace",
  },
  {
    id: "not-words-on-a-field",
    level: "owner_quality_doctrine",
    rule: "Text on a background is not automatically professional design.",
    encodedAs: "words_on_background Creative Director fail",
  },
  {
    id: "bland-is-fail",
    level: "owner_quality_doctrine",
    rule: "Bland but technically correct is still a QA failure.",
    encodedAs: "Creative Director REJECT creatively_insufficient",
  },
  {
    id: "customer-does-not-compensate",
    level: "owner_quality_doctrine",
    rule: "The customer should not compensate for weak creative intelligence.",
    encodedAs: "chooseForMe + Creative Brief + Studio Manager; do not interrogate designer jargon",
  },
  {
    id: "attempt-budget",
    level: "owner_quality_doctrine",
    rule: "Quality should be achieved within 1-3 serious attempts for routine launch work.",
    encodedAs: "maxInternalProductionAttempts remains 3; origin studio_quality_correction",
  },
  {
    id: "choose-for-me",
    level: "owner_quality_doctrine",
    rule: "Customer should not have to know professional design terminology. Choose for me is valid.",
    encodedAs: "studioStudioWideOrchestrationV1 + creative brief chooseForMe",
  },
  {
    id: "strongest-tool",
    level: "owner_quality_doctrine",
    rule: "Use the strongest appropriate production tool. Do not force every service through flyer tooling.",
    encodedAs: "routeStudioProduction by job_type",
  },
  {
    id: "owner-not-routine-qa",
    level: "owner_quality_doctrine",
    rule: "Owner is not routine first-line QA.",
    encodedAs: "classifyEscalation: empty canvas and boring video are Studio corrections",
  },
];

export function classifyFeedback(input: {
  text: string;
}): StudioLearningLevel {
  const hay = input.text.toLowerCase();
  if (
    /commercially competitive|must look professionally|owner quality|doctrine/.test(
      hay,
    )
  ) {
    return "owner_quality_doctrine";
  }
  if (
    /unreadable|mobile size|cta|hierarchy|dead space|top-heavy|derivative|generic/.test(
      hay,
    )
  ) {
    return "studio_quality_lesson";
  }
  return "customer_preference";
}
