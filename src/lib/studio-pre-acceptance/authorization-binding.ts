import type { CampaignRecord } from "@/config/studio-board";
import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";

import { isClearToAccept } from "./payment-gate";
import type { PreAcceptanceDecision } from "./types";

export type PreAcceptancePaymentAuthorization = NonNullable<
  CampaignRecord["preAcceptancePaymentAuthorization"]
>;

/**
 * Build durable payment-authorization evidence from a qualifying CLEAR decision.
 * Returns null for non-CLEAR outcomes — never bind blocked decisions.
 */
export function buildPreAcceptancePaymentAuthorization(
  decision: PreAcceptanceDecision,
  authorizedAt: string = new Date().toISOString(),
): PreAcceptancePaymentAuthorization | null {
  if (!isClearToAccept(decision)) return null;
  if (decision.outcome !== studioPreAcceptanceV1.outcomes.clearToAccept) {
    return null;
  }

  return {
    decisionId: decision.decisionId,
    outcome: "CLEAR_TO_ACCEPT",
    paymentAuthorized: true,
    evaluatedDraftRevision: decision.draftRevision,
    selectedServiceIds: [...decision.selectedServiceIds],
    factFingerprint: decision.factFingerprint,
    decisionSchemaVersion: decision.schemaVersion,
    evaluatedAt: decision.evaluatedAt,
    authorizedAt,
    packageId: decision.packageId,
  };
}

/** Reconstruct: which CLEAR decision authorized this paid campaign? */
export function readAuthorizedPreAcceptanceDecisionId(
  campaign: CampaignRecord | null | undefined,
): string | null {
  const auth = campaign?.preAcceptancePaymentAuthorization;
  if (!auth?.paymentAuthorized) return null;
  if (auth.outcome !== "CLEAR_TO_ACCEPT") return null;
  return auth.decisionId || null;
}
