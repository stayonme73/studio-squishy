import type { ServiceId } from "@/catalog/types";
import { briefIndicatesStartingFresh } from "@/lib/discovery-brief";
import type { DiscoveryBrief } from "@/recommendation/types";

/** Customer-facing Why? copy for starting-fresh foundation recommendations. */
const STARTING_FRESH_FOUNDATION_WHY: Partial<Record<ServiceId, string>> = {
  "bf-001":
    "A clearer, more consistent visual foundation helps your business look ready before you begin promoting it.",
  "bf-002":
    "Clear messaging helps customers quickly understand what you offer and why it matters to them.",
  "cp-001":
    "A focused campaign gives your new marketing a clear message, direction, and next step for customers.",
  "sm-001":
    "A starter set of social content helps introduce your business and begin building visibility.",
};

/**
 * Maps engine output to one short natural Why? line — no service IDs, rule traces, or quoted answers.
 */
export function buildCustomerWhyExplanation(
  serviceId: ServiceId,
  brief: DiscoveryBrief,
  customerDescription: string,
): string {
  if (briefIndicatesStartingFresh(brief)) {
    const scenarioCopy = STARTING_FRESH_FOUNDATION_WHY[serviceId];
    if (scenarioCopy) return scenarioCopy;
  }

  return customerDescription.trim();
}
