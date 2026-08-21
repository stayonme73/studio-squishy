/**
 * Scenario 3 production authorization — separate from the frozen event brief.
 * The canonical brief SHA-256 stays feceace09e… (facts + photo rights unchanged).
 * Tagia authorized campaign production 2026-08-21 without mutating that brief.
 */

export const SCENARIO_3_PRODUCTION_AUTHORIZATION = {
  authorized: true as const,
  authorizedAt: "2026-08-21" as const,
  authorizedBy: "Tagia" as const,
  decision:
    "OWNER DECISION — Scenario 3 production authorized. Moss & Thread authoritative brief, four-photo manifest, and hash-bound rights record remain approved. Do not change approved event facts or photo rights during production." as const,
  requiredBriefSha256:
    "feceace09e382de7a5c59a79884727e86c6d613dbd8c324b8594c16a67e49904" as const,
  /**
   * Brief still carries ownerVerificationPending (frozen hash). Post-delivery
   * listening/approval is recorded in SCENARIO_3_OWNER_DELIVERY_APPROVAL —
   * owner delivery review is complete as of 2026-08-21.
   */
  postDeliveryOwnerReviewStillRequired: false as const,
} as const;

export function scenario3ProductionAuthorizedByOwner(): boolean {
  return SCENARIO_3_PRODUCTION_AUTHORIZATION.authorized === true;
}
