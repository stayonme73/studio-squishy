import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";

import type { PreAcceptanceRiskVerdict } from "./types";

/**
 * Bounded risk/policy input — not full P1 compliance automation.
 * Obvious hard stops decline; gray areas escalate to Owner/policy.
 */
export function evaluateMaterialRiskPolicy(scanText: string): {
  verdict: PreAcceptanceRiskVerdict;
  reasons: string[];
} {
  const text = scanText.trim();
  if (!text) {
    return { verdict: "clear", reasons: [] };
  }

  for (const pattern of studioPreAcceptanceV1.hardDeclineNeedPatterns) {
    if (pattern.test(text)) {
      return {
        verdict: "decline",
        reasons: [
          "This request includes something The Studio cannot accept as described.",
        ],
      };
    }
  }

  for (const pattern of studioPreAcceptanceV1.ownerPolicyNeedPatterns) {
    if (pattern.test(text)) {
      return {
        verdict: "owner_policy_review",
        reasons: [
          "This request needs a short Studio policy review before payment.",
        ],
      };
    }
  }

  return { verdict: "clear", reasons: [] };
}
