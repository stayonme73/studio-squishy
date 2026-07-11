import { describe, expect, it } from "vitest";

import {
  buildClarifyingQuestion,
  buildReviewSummary,
  buildSubmitTarget,
  extractRequestedValue,
  matchProjectRecordIntent,
  resolveGroundedAnswer,
  resolveSquishyProjectRecordMessage,
  SQUISHY_PROJECT_RECORD_COPY,
  SQUISHY_PROJECT_RECORD_GROUNDED_COPY,
  type ProjectRecordSquishySnapshot,
  validateRequestedValue,
} from "@/lib/project-record-squishy";

function snapshot(overrides: Partial<ProjectRecordSquishySnapshot> = {}): ProjectRecordSquishySnapshot {
  return {
    paymentReceivedAt: "2026-07-08T12:00:00.000Z",
    justArrived: false,
    hasGreeted: false,
    campaignStatusLabel: "Building Concepts",
    pendingRequestCount: 0,
    revisionDataReady: true,
    revisionIncluded: 1,
    revisionUsed: 0,
    revisionRemaining: 1,
    projectStatusReady: true,
    projectStatusError: false,
    blockingMaterialsCount: 0,
    waitingOnClientJobCount: 0,
    jobStatusLabels: ["Social Media Launch Set — Building Concepts"],
    ...overrides,
  };
}

describe("matchProjectRecordIntent", () => {
  it("detects project status questions", () => {
    expect(matchProjectRecordIntent("What is my project status?").intent).toBe("project_status");
  });

  it("detects revision questions", () => {
    expect(matchProjectRecordIntent("How many revisions do I have left?").intent).toBe("revision_count");
  });

  it("detects phone change requests", () => {
    const match = matchProjectRecordIntent("Can I change my phone number?");
    expect(match.intent).toBe("change_phone");
    expect(match.targetKey).toBe("phone_number");
  });

  it("detects scope-changing requests for Studio review", () => {
    const match = matchProjectRecordIntent("Can you add another service?");
    expect(match.intent).toBe("scope_change");
    expect(match.requiresStudioReview).toBe(true);
  });

  it("detects logo upload intent", () => {
    const match = matchProjectRecordIntent("I need to upload a new logo");
    expect(match.intent).toBe("upload_logo");
    expect(match.materialKey).toBe("logo_material");
  });
});

describe("extractRequestedValue", () => {
  it("extracts values after 'to'", () => {
    expect(extractRequestedValue("Change my email to new@example.com")).toBe("new@example.com");
  });

  it("extracts embedded email addresses", () => {
    expect(extractRequestedValue("Please update approver email tagia@local.dev")).toBe("tagia@local.dev");
  });
});

describe("resolveGroundedAnswer", () => {
  it("answers status from snapshot without save claims", () => {
    const answer = resolveGroundedAnswer(snapshot(), matchProjectRecordIntent("project status"));
    expect(answer?.text).toContain("Building Concepts");
    expect(answer?.text.toLowerCase()).not.toContain("saved");
    expect(answer?.text.toLowerCase()).not.toContain("applied");
  });

  it("answers revision count from snapshot", () => {
    const answer = resolveGroundedAnswer(snapshot(), matchProjectRecordIntent("revisions remaining"));
    expect(answer?.text).toBe(
      SQUISHY_PROJECT_RECORD_GROUNDED_COPY.revisionSummary(1, 0, 1),
    );
  });

  it("routes file questions to materials copy", () => {
    const answer = resolveGroundedAnswer(
      snapshot(),
      matchProjectRecordIntent("upload a new logo"),
    );
    expect(answer?.text).toContain("materials form");
  });

  it("fails safely when project status is unavailable", () => {
    const answer = resolveGroundedAnswer(
      snapshot({ projectStatusError: true, jobStatusLabels: [] }),
      matchProjectRecordIntent("project status"),
    );
    expect(answer?.text).toBe(SQUISHY_PROJECT_RECORD_GROUNDED_COPY.statusUnavailable);
  });

  it("fails safely when revision data is unavailable", () => {
    const answer = resolveGroundedAnswer(
      snapshot({ revisionDataReady: false }),
      matchProjectRecordIntent("revisions remaining"),
    );
    expect(answer?.text).toBe(SQUISHY_PROJECT_RECORD_GROUNDED_COPY.revisionUnavailable);
  });
});

describe("resolveSquishyProjectRecordMessage", () => {
  it("greets on first paid visit", () => {
    const result = resolveSquishyProjectRecordMessage(
      snapshot({ justArrived: true, hasGreeted: false }),
    );
    expect(result).toEqual({
      key: "first-paid-visit",
      text: SQUISHY_PROJECT_RECORD_COPY["first-paid-visit"],
    });
  });

  it("stays silent by default", () => {
    expect(resolveSquishyProjectRecordMessage(snapshot())).toBeNull();
  });
});

describe("review-before-submit copy", () => {
  it("builds a review summary without claiming applied", () => {
    const match = matchProjectRecordIntent("Change phone number to 555-0100");
    const summary = buildReviewSummary(match, "555-0100");
    expect(summary.text).toContain("Here is the request I will submit");
    expect(summary.text).toContain("Nothing is applied until The Studio reviews");
  });

  it("asks only one clarifying question for missing value", () => {
    const match = matchProjectRecordIntent("Can I change my phone number?");
    expect(buildClarifyingQuestion(match)).toBe(
      SQUISHY_PROJECT_RECORD_GROUNDED_COPY.clarifyValue("Phone number"),
    );
  });

  it("builds submit target for information update intents", () => {
    const match = matchProjectRecordIntent("Change phone number to 555-0100");
    expect(buildSubmitTarget(match, "Change phone number to 555-0100")).toEqual({
      targetKey: "phone_number",
      requestedValue: "555-0100",
    });
  });

  it("validates phone numbers before review", () => {
    const match = matchProjectRecordIntent("Change my phone number");
    expect(validateRequestedValue(match, "abc")).toMatch(/phone number/i);
    expect(validateRequestedValue(match, "555-010-9999")).toBeNull();
  });
});
