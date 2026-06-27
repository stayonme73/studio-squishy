/**
 * Project Summary — maps discovery brief answers to customer-readable Q&A rows.
 */

import {
  businessDiscoveryStudio,
  DISCOVERY_FORM_TILE_IDS,
} from "@/config/business-discovery-studio";
import type { DiscoveryBriefAnswers } from "@/recommendation/types";
import type { DiscoveryAnswerHeardItem } from "@/project-summary/types";

/** Ordered discovery answers for the Discovery Summary section. */
export function buildDiscoveryAnswersHeard(
  answers: DiscoveryBriefAnswers,
): readonly DiscoveryAnswerHeardItem[] {
  return DISCOVERY_FORM_TILE_IDS.filter((id) => answers[id]?.trim()).map((id) => ({
    label: businessDiscoveryStudio.tileLabels[id],
    value: answers[id]!.trim(),
  }));
}
