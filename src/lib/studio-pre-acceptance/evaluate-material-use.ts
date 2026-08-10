import { studioMaterialUseV1 } from "@/config/studio-material-use-v1";

/**
 * Narrow pre-acceptance bridge for known material/rights signals.
 * Distinct from per-material approved-for-use clearance (post-payment ledger).
 * Does not rebuild the pre-acceptance gate.
 */
export function evaluateKnownMaterialRightsForAcceptance(input: {
  /** Known hard rights/policy block already established before payment. */
  hasHardRightsBlock?: boolean;
  /**
   * Ambiguity that must be resolved before The Studio can accept payment
   * (e.g. customer says they may not have logo permission and the project needs that logo).
   */
  hasAcceptanceBlockingRightsAmbiguity?: boolean;
  /** Genuine gray area needing Owner/policy before accept. */
  hasOwnerPolicyMaterialHold?: boolean;
  clarificationPrompt?: string;
}): {
  verdict: "clear" | "clarification_required" | "owner_policy_review" | "decline";
  reasons: string[];
  customerPrompt: string | null;
} {
  if (input.hasHardRightsBlock) {
    return {
      verdict: "decline",
      reasons: [
        "A known rights or authorization problem must be resolved before The Studio can accept this project.",
      ],
      customerPrompt: null,
    };
  }

  if (input.hasOwnerPolicyMaterialHold) {
    return {
      verdict: "owner_policy_review",
      reasons: [
        "A material or brand-authorization question needs a short Studio policy review before payment.",
      ],
      customerPrompt: null,
    };
  }

  if (input.hasAcceptanceBlockingRightsAmbiguity) {
    return {
      verdict: "clarification_required",
      reasons: [
        "Permission to use a required brand or media asset must be confirmed before payment.",
      ],
      customerPrompt:
        input.clarificationPrompt?.trim() ||
        studioMaterialUseV1.customerCopy.brandPermission,
    };
  }

  return { verdict: "clear", reasons: [], customerPrompt: null };
}
