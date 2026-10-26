/**
 * Owner Console — Resolve Once, Teach Forward — LOCKED 2026-09-22.
 * Shared playbook for Owner Console, Machine, Studio Voice, and Production.
 *
 * Authority: docs/studio-owner-resolve-once-teach-forward-v1-locked.md
 */

export const STUDIO_RESOLVE_ONCE_TEACH_FORWARD_LOCKED_AT = "2026-09-22" as const;

export const studioOwnerResolveOnceTeachForwardV1 = {
  locked: true as const,
  lockedAt: STUDIO_RESOLVE_ONCE_TEACH_FORWARD_LOCKED_AT,
  owner: "Tagia",
  sharedAcross: [
    "Owner Console",
    "Machine",
    "Studio Voice",
    "Production",
  ] as const,
  notANewPackage: true as const,
  notAScenarioFarm: true as const,
  doNotPredictEveryCustomerScenario: true as const,
  doNotMakeOwnerDecideTheSameClassTwice: true as const,
  afterOwnerResolves: [
    "Machine receives and carries out the decision",
    "Machine routes to Production, Studio Voice, or another internal team capability",
    "Evaluate whether the decision created a reusable operating rule",
    "If it did, encode that rule into shared Machine / Voice / Production logic",
    "Test the new rule",
    "Future materially similar cases stay off Owner",
  ] as const,
  escalateAgainOnlyWhen: [
    "the facts are materially different",
    "the taught rule conflicts",
    "real Owner judgment is still required",
  ] as const,
  taughtRuleClasses: [
    "missing_promised_materials",
    "studio_created_visuals_authorized",
  ] as const,
  certificationDoesNotMeanEveryScenarioTested: true as const,
  certificationMeans: [
    "core routing works",
    "true exceptions reach Owner",
    "routine work stays off Owner",
    "Owner can understand the issue",
    "Owner can make a decision",
    "Machine can carry it out",
    "history remains retrievable",
    "the system can learn reusable rules from new exceptions",
    "repeated materially similar issues should not keep returning to Owner",
  ] as const,
  authorityDoc: "docs/studio-owner-resolve-once-teach-forward-v1-locked.md" as const,
  materialsRule:
    "docs/studio-materials-and-substitute-asset-v1-locked.md" as const,
  ownerEscalationRule:
    "docs/launch/studio-operating-single-page-owner-work-and-attention-console-1/OWNER-DESK-ESCALATION-RULE-LOCKED.md" as const,
} as const;

export type OwnerIssueClass =
  | "missing_promised_materials"
  | "studio_created_visuals_authorized"
  | "refund_exception"
  | "revisions_exhausted"
  | "other_exception";

export type IncomingIssueRoute =
  | "ROUTINE_TEAM_HANDLES"
  | "APPLY_TAUGHT_RULE"
  | "OWNER_EXCEPTION";

export type TeachForwardResult =
  | "ENCODE_SHARED_RULE"
  | "KEEP_CASE_SPECIFIC"
  | "ALREADY_TAUGHT";
