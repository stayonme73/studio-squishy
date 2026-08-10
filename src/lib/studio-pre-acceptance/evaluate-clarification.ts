import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";

import type { PreAcceptanceClarificationVerdict } from "./types";

/**
 * Material ambiguity only — not ordinary creative discretion.
 * Layout, spacing, routine wording polish stay production discretion.
 */
export function evaluateMaterialClarification(input: {
  routeId: string | null;
  selectedServiceIds: readonly string[];
  projectNeed: string;
}): {
  verdict: PreAcceptanceClarificationVerdict;
  gaps: string[];
  customerPrompt: string | null;
} {
  const gaps: string[] = [];

  if (!input.routeId) {
    gaps.push(studioPreAcceptanceV1.customerCopy.noRoute);
  }
  if (input.selectedServiceIds.length === 0) {
    gaps.push(studioPreAcceptanceV1.customerCopy.noServices);
  }
  if (!input.projectNeed.trim()) {
    gaps.push(studioPreAcceptanceV1.customerCopy.needMissing);
  }

  if (gaps.length === 0) {
    return { verdict: "sufficient", gaps: [], customerPrompt: null };
  }

  return {
    verdict: "material_gap",
    gaps,
    customerPrompt: gaps[0] ?? studioPreAcceptanceV1.customerCopy.clarificationLead,
  };
}
