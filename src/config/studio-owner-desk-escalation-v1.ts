/**
 * Owner Desk Escalation Rule — LOCKED 2026-09-21.
 * The Owner Console is an exception desk, not a general activity feed.
 *
 * Authority: docs/launch/studio-operating-single-page-owner-work-and-attention-console-1/OWNER-DESK-ESCALATION-RULE-LOCKED.md
 */

export const STUDIO_OWNER_DESK_ESCALATION_LOCKED_AT = "2026-09-21" as const;

export const ownerDeskEscalationV1 = {
  locked: true as const,
  lockedAt: STUDIO_OWNER_DESK_ESCALATION_LOCKED_AT,
  owner: "Tagia",
  deskIsExceptionDeskNotActivityFeed: true as const,
  normalWorkStaysOffOwnerDesk: true as const,
  requiredArrivalLines: [
    "WHY YOU ARE GETTING THIS",
    "WHAT I NEED FROM YOU",
  ] as const,
  ifThoseTwoLinesCannotBeStatedClearlyDoNotSend: true as const,
  doNotCreateOwnerMatterJustBecause: [
    "a customer has active work",
    "a new job exists",
    "a package is certified",
    "materials are missing",
    "production is running",
    "QA is doing routine corrections",
    "the customer asked a normal question",
    "the team can resolve the issue under existing rules",
  ] as const,
  thoseStayWith: [
    "Studio Voice",
    "Machine",
    "Production",
    "QA",
  ] as const,
  materialsAndSubstituteAssetRule:
    "docs/studio-materials-and-substitute-asset-v1-locked.md" as const,
  resolveOnceTeachForwardRule:
    "docs/studio-owner-resolve-once-teach-forward-v1-locked.md" as const,
  missingPromisedMaterialsStayWithVoiceAndMachine: true as const,
  doNotMakeOwnerDecideTheSameClassTwice: true as const,
  createOwnerMatterOnlyWhen: [
    "refund or cancellation exception",
    "pricing or scope exception",
    "revision exception, such as all included revisions used",
    "customer asks for the Owner and the team cannot resolve it",
    "policy conflict or ambiguous rule",
    "brand-direction decision",
    "final judgment that requires Owner taste/approval",
    "unusual customer exception",
    "money-sensitive decision",
    "Scout/system is blocked and genuinely cannot continue without Owner judgment",
  ] as const,
  newWorkOpenedByMistake: {
    whyYouAreGettingThis:
      "New work was opened and Scout cannot continue without your direction.",
    whatINeedFromYou:
      "Tell Scout what the new work is, or put the matter away if it was opened by mistake.",
  } as const,
  authorityDoc:
    "docs/launch/studio-operating-single-page-owner-work-and-attention-console-1/OWNER-DESK-ESCALATION-RULE-LOCKED.md" as const,
} as const;

export function ownerMatterMayBeCreated(input: {
  whyYouAreGettingThis: string;
  whatINeedFromYou: string;
}): boolean {
  return (
    Boolean(String(input.whyYouAreGettingThis ?? "").trim()) &&
    Boolean(String(input.whatINeedFromYou ?? "").trim())
  );
}
