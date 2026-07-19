import { describe, expect, it } from "vitest";

import {
  isPurchasedScopeFrozen,
  isWorkingDraftEditable,
  studioWorkingDraftV1,
  WORKING_DRAFT_PERSISTED_FIELDS,
  WORKING_DRAFT_PRESERVE_ON,
} from "@/config/studio-working-draft-v1";

describe("pre-payment working draft contract", () => {
  it("locks payment as the commitment boundary", () => {
    expect(studioWorkingDraftV1.prePayment).toEqual({
      status: "working_draft",
      editable: true,
    });
    expect(studioWorkingDraftV1.postPayment).toEqual({
      status: "purchased",
      editableScope: false,
    });
    expect(isWorkingDraftEditable("working_draft")).toBe(true);
    expect(isWorkingDraftEditable("purchased")).toBe(false);
    expect(isPurchasedScopeFrozen("purchased")).toBe(true);
  });

  it("requires confirmation for reset and forbids silent Back wipe", () => {
    expect(studioWorkingDraftV1.resetRequiresConfirmation).toBe(true);
    expect(WORKING_DRAFT_PRESERVE_ON).toContain("back");
    expect(WORKING_DRAFT_PRESERVE_ON).toContain("return-to-lobby");
    expect(WORKING_DRAFT_PRESERVE_ON).toContain("page-refresh");
  });

  it("lists minimum persisted fields including attribution and conversation location", () => {
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain("discoveryAnswers");
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain("selectedServices");
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain("actionAttributionHistory");
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain(
      "currentConversationLocation",
    );
  });

  it("states that Conversation Room session alone is insufficient", () => {
    expect(studioWorkingDraftV1.conversationRoomSessionInsufficient).toBe(true);
  });
});
