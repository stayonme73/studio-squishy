/**
 * Once Owner submits a valid decision, Machine clears WAITING ON OWNER.
 * Owner must not need Scout to take the siren down by hand.
 */

export const studioOwnerDecisionClearsWaitV1 = {
  locked: true as const,
  class: "shared_lane" as const,
  lane: "owner_console_operating_model",
  defectId: "OWNER-SEND-LEAVES-STALE-WAITING-ON-OWNER",
  foundAt: "2026-10-04",
  rule: "A valid Owner send / approve / reject / send-back clears WAITING ON OWNER when no other Owner-action files remain.",
  ownerMustNotNeedScoutToClearSiren: true as const,
  decisionActions: ["send", "approve", "reject", "send_back"] as const,
  stayWaitingIfOtherOwnerFilesRemain: true as const,
  afterProductionPath: "WAITING_ON_SYSTEM",
  afterScoutPath: "ACTIVE_WORK",
  afterRejectOrRecorded: "ACTIVE_WORK",
} as const;
