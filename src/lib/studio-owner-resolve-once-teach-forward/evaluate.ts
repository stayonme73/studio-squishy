/**
 * Resolve once, teach forward.
 * Owner Console, Machine, Studio Voice, and Production share this route.
 * This is not a catalog of every customer scenario.
 */

import {
  studioOwnerResolveOnceTeachForwardV1 as rule,
  type IncomingIssueRoute,
  type OwnerIssueClass,
  type TeachForwardResult,
} from "@/config/studio-owner-resolve-once-teach-forward-v1";

export type IncomingIssueFacts = {
  classId: OwnerIssueClass;
  taughtRuleExists: boolean;
  factsMateriallyDifferentFromTaughtRule: boolean;
  taughtRuleConflicts: boolean;
  ownerJudgmentStillRequired: boolean;
};

export type IncomingIssueDecision = {
  route: IncomingIssueRoute;
  ownerEscalation: boolean;
  machineRoute:
    | "studio_voice_follow_up"
    | "studio_created_visual_path"
    | "apply_taught_rule"
    | "owner_then_machine";
  why: string;
};

export type TeachForwardFacts = {
  classId: OwnerIssueClass;
  ownerDecisionIsReusable: boolean;
  alreadyTaught: boolean;
};

const TAUGHT = new Set<string>(rule.taughtRuleClasses);

export function evaluateIncomingOwnerIssue(
  facts: IncomingIssueFacts,
): IncomingIssueDecision {
  const taught = facts.taughtRuleExists || TAUGHT.has(facts.classId);

  if (taught && !facts.factsMateriallyDifferentFromTaughtRule && !facts.taughtRuleConflicts) {
    if (facts.ownerJudgmentStillRequired) {
      return {
        route: "OWNER_EXCEPTION",
        ownerEscalation: true,
        machineRoute: "owner_then_machine",
        why: "A taught rule exists, but this case still needs Owner judgment.",
      };
    }
    return {
      route: facts.classId === "missing_promised_materials"
        ? "ROUTINE_TEAM_HANDLES"
        : "APPLY_TAUGHT_RULE",
      ownerEscalation: false,
      machineRoute:
        facts.classId === "missing_promised_materials"
          ? "studio_voice_follow_up"
          : facts.classId === "studio_created_visuals_authorized"
            ? "studio_created_visual_path"
            : "apply_taught_rule",
      why: "A reusable rule already exists. The team handles this. Do not send it back to Owner.",
    };
  }

  if (
    facts.classId === "missing_promised_materials" &&
    !facts.ownerJudgmentStillRequired &&
    !facts.taughtRuleConflicts
  ) {
    return {
      route: "ROUTINE_TEAM_HANDLES",
      ownerEscalation: false,
      machineRoute: "studio_voice_follow_up",
      why: "Missing promised materials are routine. Voice follows up. Machine waits.",
    };
  }

  return {
    route: "OWNER_EXCEPTION",
    ownerEscalation: true,
    machineRoute: "owner_then_machine",
    why: "No reusable rule covers this. Owner resolves it once.",
  };
}

export function evaluateTeachForward(facts: TeachForwardFacts): TeachForwardResult {
  if (facts.alreadyTaught || TAUGHT.has(facts.classId)) return "ALREADY_TAUGHT";
  if (facts.ownerDecisionIsReusable) return "ENCODE_SHARED_RULE";
  return "KEEP_CASE_SPECIFIC";
}

export function similarCaseReturnsToOwner(facts: IncomingIssueFacts): boolean {
  return evaluateIncomingOwnerIssue(facts).ownerEscalation;
}
