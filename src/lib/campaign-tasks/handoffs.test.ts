import { describe, expect, it } from "vitest";

import { validateHandoffPayload, validateReassignmentReason, appendHandoff, buildHandoffRecord } from "./handoffs";
import type { TaskHandoffRecord } from "./types";

const validPayload = {
  completedSummary: "Drafted social copy set.",
  sourceContext: "Brand guide v2 and content direction.",
  nextSteps: "QA review for tone and CTA alignment.",
  openQuestions: "Confirm holiday promo dates.",
};

describe("validateHandoffPayload", () => {
  it("accepts required fields", () => {
    const result = validateHandoffPayload(validPayload);
    expect(result.ok).toBe(true);
  });

  it("rejects missing completed summary", () => {
    const result = validateHandoffPayload({
      ...validPayload,
      completedSummary: "   ",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty payload", () => {
    const result = validateHandoffPayload(undefined);
    expect(result.ok).toBe(false);
  });

  it("trims optional fields", () => {
    const result = validateHandoffPayload({
      ...validPayload,
      risks: "  Minor tone drift on post 3  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.risks).toBe("Minor tone drift on post 3");
    }
  });
});

describe("validateReassignmentReason", () => {
  it("requires reason when scope flag set", () => {
    expect(
      validateReassignmentReason({ changesClientFacingScope: true }, undefined),
    ).toMatch(/reason is required/i);
  });

  it("allows empty reason when no approval flags", () => {
    expect(validateReassignmentReason({}, undefined)).toBeNull();
  });
});

describe("appendHandoff", () => {
  it("appends without mutating prior entries", () => {
    const first = buildHandoffRecord({
      campaignId: "c-1",
      taskId: "sm-001:copy",
      fromUserId: "u-1",
      fromDisplayName: "Copy Dev",
      fromRole: "copy",
      toRole: "qa",
      fromState: "in_progress",
      toState: "ready_for_qa",
      action: "submit_for_handoff",
      payload: validPayload,
    });
    const second = buildHandoffRecord({
      campaignId: "c-1",
      taskId: "sm-001:copy",
      fromUserId: "u-2",
      fromDisplayName: "Producer",
      fromRole: "producer_dispatcher",
      toRole: "copy",
      fromState: "unstarted",
      toState: "in_progress",
      action: "reassign",
      payload: validPayload,
    });

    const ledger = appendHandoff([first], second);
    expect(ledger).toHaveLength(2);
    expect(ledger[0]).toEqual(first);
    expect((ledger[1] as TaskHandoffRecord).action).toBe("reassign");
  });

  it("rejects duplicate handoff ids", () => {
    const record = buildHandoffRecord({
      campaignId: "c-1",
      taskId: "sm-001:copy",
      fromUserId: "u-1",
      fromDisplayName: "Copy Dev",
      fromRole: "copy",
      toRole: "qa",
      fromState: "in_progress",
      toState: "ready_for_qa",
      action: "submit_for_handoff",
      payload: validPayload,
    });
    expect(() => appendHandoff([record], { ...record })).toThrow(/duplicate/i);
  });
});
