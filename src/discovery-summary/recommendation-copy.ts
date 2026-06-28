import type { ServiceId } from "@/catalog/types";
import { briefIndicatesStartingFresh } from "@/lib/discovery-brief";
import type { DiscoveryBrief } from "@/recommendation/types";

/** Customer-facing Why? copy for specific recommended services (all discovery scenarios). */
const RECOMMENDATION_WHY: Partial<Record<ServiceId, string>> = {
  "em-001":
    "Email gives you a direct way to reach customers with updates, offers, or announcements.",
  "em-001-monthly":
    "Ongoing email support helps you stay in touch with customers without writing every message yourself.",
  "cc-001":
    "Polished promotional copy helps your offers and announcements sound clear and professional.",
  "ap-001":
    "Voice-over adds a polished audio layer to videos, social clips, or campaign assets.",
  "sm-001-monthly":
    "Monthly social content support keeps your business visible without you creating every post.",
};

/** Customer-facing Why? copy for starting-fresh default foundation recommendations. */
const STARTING_FRESH_FOUNDATION_WHY: Partial<Record<ServiceId, string>> = {
  "bf-001":
    "A clearer, more consistent visual foundation helps your business look ready before you begin promoting it.",
  "sm-001":
    "A starter set of social content helps introduce your business and begin building visibility.",
  "ma-001":
    "A starter set of promotional pieces gives you polished visuals to use across your channels.",
};

/**
 * Maps engine output to one short natural Why? line — no service IDs, rule traces, or quoted answers.
 */
export function buildCustomerWhyExplanation(
  serviceId: ServiceId,
  brief: DiscoveryBrief,
  customerDescription: string,
): string {
  const recommendationCopy = RECOMMENDATION_WHY[serviceId];
  if (recommendationCopy) return recommendationCopy;

  if (briefIndicatesStartingFresh(brief)) {
    const scenarioCopy = STARTING_FRESH_FOUNDATION_WHY[serviceId];
    if (scenarioCopy) return scenarioCopy;
  }

  const trimmed = customerDescription.trim();
  if (trimmed) return trimmed;

  return "";
}
