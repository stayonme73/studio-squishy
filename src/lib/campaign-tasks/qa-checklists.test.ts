import { describe, expect, it } from "vitest";

import { formatBlockedReasonDisplay } from "@/config/campaign-tasks";

import {
  QA_CHECKLIST_BY_PHASE,
  UNIVERSAL_QA_CHECKS,
  requiredChecksForPhase,
} from "./qa-checklists";

describe("requiredChecksForPhase", () => {
  it("prepends universal checks before phase-specific items for every phase", () => {
    const phases = Object.keys(QA_CHECKLIST_BY_PHASE) as (keyof typeof QA_CHECKLIST_BY_PHASE)[];
    for (const phase of phases) {
      const checks = requiredChecksForPhase(phase);
      expect(checks.slice(0, UNIVERSAL_QA_CHECKS.length)).toEqual([...UNIVERSAL_QA_CHECKS]);
      expect(checks.slice(UNIVERSAL_QA_CHECKS.length)).toEqual([...QA_CHECKLIST_BY_PHASE[phase]]);
    }
  });

  it("includes copy-specific additions after universal checks", () => {
    expect(requiredChecksForPhase("copy")).toEqual([
      ...UNIVERSAL_QA_CHECKS,
      "copy_accuracy",
      "brand_voice",
      "grammar",
    ]);
  });
});

describe("formatBlockedReasonDisplay", () => {
  it("maps workflow tokens to human labels", () => {
    expect(formatBlockedReasonDisplay("compliance_hold")).toBe(
      "Compliance hold — Owner review required",
    );
    expect(formatBlockedReasonDisplay("owner_escalation")).toBe(
      "Direction hold — Owner review required",
    );
  });

  it("passes through already human-readable reasons", () => {
    expect(formatBlockedReasonDisplay("Waiting on logo")).toBe("Waiting on logo");
  });
});
