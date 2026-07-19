import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";

/**
 * Prefill Host intake answers from Conversation Room opening facts.
 * Only fills empty overlapping keys — never overwrites a saved draft answer.
 */
export function prefillIntakeAnswersFromOpening(
  draftAnswers: RouteMapIntakeAnswers | null | undefined,
  opening: { businessName?: string | null },
): RouteMapIntakeAnswers | null {
  const next: RouteMapIntakeAnswers = { ...(draftAnswers ?? {}) };
  const businessName = opening.businessName?.trim();
  if (businessName && !String(next.businessName ?? "").trim()) {
    next.businessName = businessName;
  }
  return Object.keys(next).length > 0 ? next : null;
}
