import { describe, expect, it } from "vitest";

import { studioOwnerResolveOnceTeachForwardV1 } from "@/config/studio-owner-resolve-once-teach-forward-v1";
import {
  evaluateIncomingOwnerIssue,
  evaluateTeachForward,
  similarCaseReturnsToOwner,
} from "./index";

describe("Resolve once, teach forward", () => {
  it("is a shared playbook, not a scenario farm", () => {
    expect(studioOwnerResolveOnceTeachForwardV1.notANewPackage).toBe(true);
    expect(studioOwnerResolveOnceTeachForwardV1.notAScenarioFarm).toBe(true);
    expect(studioOwnerResolveOnceTeachForwardV1.doNotMakeOwnerDecideTheSameClassTwice).toBe(
      true,
    );
    expect(
      studioOwnerResolveOnceTeachForwardV1.certificationDoesNotMeanEveryScenarioTested,
    ).toBe(true);
    expect(studioOwnerResolveOnceTeachForwardV1.certificationMeans).toContain(
      "the system can learn reusable rules from new exceptions",
    );
    expect(studioOwnerResolveOnceTeachForwardV1.sharedAcross).toEqual([
      "Owner Console",
      "Machine",
      "Studio Voice",
      "Production",
    ]);
  });

  it("keeps missing promised materials off Owner", () => {
    const decision = evaluateIncomingOwnerIssue({
      classId: "missing_promised_materials",
      taughtRuleExists: true,
      factsMateriallyDifferentFromTaughtRule: false,
      taughtRuleConflicts: false,
      ownerJudgmentStillRequired: false,
    });
    expect(decision.route).toBe("ROUTINE_TEAM_HANDLES");
    expect(decision.ownerEscalation).toBe(false);
    expect(decision.machineRoute).toBe("studio_voice_follow_up");
    expect(similarCaseReturnsToOwner({
      classId: "missing_promised_materials",
      taughtRuleExists: true,
      factsMateriallyDifferentFromTaughtRule: false,
      taughtRuleConflicts: false,
      ownerJudgmentStillRequired: false,
    })).toBe(false);
  });

  it("routes authorized Studio-created visuals without Owner", () => {
    const decision = evaluateIncomingOwnerIssue({
      classId: "studio_created_visuals_authorized",
      taughtRuleExists: true,
      factsMateriallyDifferentFromTaughtRule: false,
      taughtRuleConflicts: false,
      ownerJudgmentStillRequired: false,
    });
    expect(decision.route).toBe("APPLY_TAUGHT_RULE");
    expect(decision.ownerEscalation).toBe(false);
    expect(decision.machineRoute).toBe("studio_created_visual_path");
  });

  it("sends an unfitted refund to Owner once, then can teach forward", () => {
    const first = evaluateIncomingOwnerIssue({
      classId: "refund_exception",
      taughtRuleExists: false,
      factsMateriallyDifferentFromTaughtRule: false,
      taughtRuleConflicts: false,
      ownerJudgmentStillRequired: true,
    });
    expect(first.route).toBe("OWNER_EXCEPTION");
    expect(first.ownerEscalation).toBe(true);
    expect(evaluateTeachForward({
      classId: "refund_exception",
      ownerDecisionIsReusable: true,
      alreadyTaught: false,
    })).toBe("ENCODE_SHARED_RULE");

    const nextSimilar = evaluateIncomingOwnerIssue({
      classId: "refund_exception",
      taughtRuleExists: true,
      factsMateriallyDifferentFromTaughtRule: false,
      taughtRuleConflicts: false,
      ownerJudgmentStillRequired: false,
    });
    expect(nextSimilar.ownerEscalation).toBe(false);
    expect(nextSimilar.route).toBe("APPLY_TAUGHT_RULE");
  });

  it("applies a taught revision-exhausted rule and escalates only when judgment remains", () => {
    const taught = evaluateIncomingOwnerIssue({
      classId: "revisions_exhausted",
      taughtRuleExists: true,
      factsMateriallyDifferentFromTaughtRule: false,
      taughtRuleConflicts: false,
      ownerJudgmentStillRequired: false,
    });
    expect(taught.ownerEscalation).toBe(false);

    const stillNeedsJudgment = evaluateIncomingOwnerIssue({
      classId: "revisions_exhausted",
      taughtRuleExists: true,
      factsMateriallyDifferentFromTaughtRule: false,
      taughtRuleConflicts: false,
      ownerJudgmentStillRequired: true,
    });
    expect(stillNeedsJudgment.ownerEscalation).toBe(true);
  });

  it("keeps a one-off Owner decision case-specific when it is not reusable", () => {
    expect(
      evaluateTeachForward({
        classId: "other_exception",
        ownerDecisionIsReusable: false,
        alreadyTaught: false,
      }),
    ).toBe("KEEP_CASE_SPECIFIC");
  });
});
