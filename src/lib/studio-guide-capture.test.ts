import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GUIDE_SCRIM_DISMISS_DELAY_MS,
  STUDIO_GUIDE_CAPTURE_STORAGE_KEY,
} from "@/config/studio-guide-conversation-v1";
import {
  canConfirmGuideCaptureDraft,
  confirmGuideCaptureDraft,
  createEmptyGuideCaptureDraft,
  getGuideConversationResumeStep,
  guideHasReviewableAnswers,
  isAcceptableGuideDeadlineInput,
  normalizeGuideCaptureDraft,
  readGuideCaptureDraft,
  startNewGuideCaptureConversation,
  writeGuideCaptureDraft,
} from "@/lib/studio-guide-capture";

const CAMPAIGN_KEY = "studio-squishy:current-campaign";

function mockStorage() {
  const store: Record<string, string> = {};
  return {
    store,
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
}

describe("studio-guide-capture Phase 1A", () => {
  it("keeps a Samsung-safe scrim dismiss delay so the opening tap cannot close the sheet", () => {
    expect(GUIDE_SCRIM_DISMISS_DELAY_MS).toBeGreaterThanOrEqual(300);
  });

  it("creates an empty draft with unconfirmed-ready defaults", () => {
    const draft = createEmptyGuideCaptureDraft();
    expect(draft.schemaVersion).toBe(1);
    expect(draft.source).toBe("lobby-guide-conversation");
    expect(draft.deadlineStatus).toBe("not_requested");
    expect(draft.confirmedAt).toBeNull();
    expect(draft.preferredName).toBe("");
    expect(draft.projectNeed).toBe("");
  });

  it("forces deadlineStatus to unconfirmed when a date is present", () => {
    const draft = normalizeGuideCaptureDraft({
      schemaVersion: 1,
      projectNeed: "Logo refresh",
      requestedDeadline: "September 15",
      deadlineStatus: "not_requested",
    });
    expect(draft.deadlineStatus).toBe("unconfirmed");
    expect(draft.requestedDeadline).toBe("September 15");
  });

  it("forces deadlineStatus to not_requested when date is empty", () => {
    const draft = normalizeGuideCaptureDraft({
      schemaVersion: 1,
      projectNeed: "Logo refresh",
      requestedDeadline: "  ",
      deadlineStatus: "unconfirmed",
    });
    expect(draft.deadlineStatus).toBe("not_requested");
    expect(draft.requestedDeadline).toBe("");
  });

  it("requires projectNeed before confirm", () => {
    expect(canConfirmGuideCaptureDraft(createEmptyGuideCaptureDraft())).toBe(false);
    expect(
      canConfirmGuideCaptureDraft(
        normalizeGuideCaptureDraft({
          schemaVersion: 1,
          projectNeed: "Website update",
        }),
      ),
    ).toBe(true);
  });

  it("sets confirmedAt on confirm without inventing a service", () => {
    const confirmed = confirmGuideCaptureDraft({
      ...createEmptyGuideCaptureDraft(),
      projectNeed: "Flyer for spring sale",
      businessName: "Green Yard Co",
      requestedDeadline: "2026-09-01",
    });
    expect(confirmed.confirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(confirmed.deadlineStatus).toBe("unconfirmed");
    expect(confirmed.source).toBe("lobby-guide-conversation");
  });

  it("rejects unknown schema versions", () => {
    const draft = normalizeGuideCaptureDraft({
      schemaVersion: 99 as 1,
      projectNeed: "Nope",
    });
    expect(draft.projectNeed).toBe("");
  });

  it("rejects ambiguous compact deadline numbers such as 081526", () => {
    expect(isAcceptableGuideDeadlineInput("081526")).toBe(false);
    expect(isAcceptableGuideDeadlineInput("81526")).toBe(false);
    expect(isAcceptableGuideDeadlineInput("08 15 26")).toBe(false);
    expect(isAcceptableGuideDeadlineInput("09/15/26")).toBe(false);
  });

  it("accepts clear deadline formats and empty skip", () => {
    expect(isAcceptableGuideDeadlineInput("")).toBe(true);
    expect(isAcceptableGuideDeadlineInput("September 15")).toBe(true);
    expect(isAcceptableGuideDeadlineInput("September 15, 2026")).toBe(true);
    expect(isAcceptableGuideDeadlineInput("09/15/2026")).toBe(true);
    expect(isAcceptableGuideDeadlineInput("2026-09-15")).toBe(true);
  });

  it("treats confirmed opening answers as reviewable", () => {
    expect(guideHasReviewableAnswers(createEmptyGuideCaptureDraft())).toBe(false);
    expect(
      guideHasReviewableAnswers({
        ...createEmptyGuideCaptureDraft(),
        preferredName: "Mira",
        projectNeed: "Campaign graphics",
        confirmedAt: "2026-08-25T22:00:00.000Z",
      }),
    ).toBe(true);
  });
});

describe("studio-guide-capture Phase 1A reset and restore", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: mockStorage(),
    });
  });

  it("resets a completed capture fully", () => {
    const confirmed = confirmGuideCaptureDraft({
      ...createEmptyGuideCaptureDraft(),
      projectNeed: "Logo refresh",
      businessName: "Green Horizon Landscaping",
      requestedDeadline: "September 15, 2026",
      existingMaterialsNote: "PNG and business card",
    });
    writeGuideCaptureDraft(confirmed);
    expect(readGuideCaptureDraft()?.confirmedAt).toBeTruthy();

    const empty = startNewGuideCaptureConversation();
    expect(empty.projectNeed).toBe("");
    expect(empty.businessName).toBe("");
    expect(empty.requestedDeadline).toBe("");
    expect(empty.existingMaterialsNote).toBe("");
    expect(empty.confirmedAt).toBeNull();
    expect(empty.deadlineStatus).toBe("not_requested");
    expect(readGuideCaptureDraft()).toBeNull();
    expect(window.localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toBeNull();
  });

  it("starts a new conversation at the first question after reset", () => {
    writeGuideCaptureDraft(
      confirmGuideCaptureDraft({
        ...createEmptyGuideCaptureDraft(),
        projectNeed: "Logo refresh",
      }),
    );
    expect(getGuideConversationResumeStep(readGuideCaptureDraft())).toBe("confirmed");

    const empty = startNewGuideCaptureConversation();
    expect(getGuideConversationResumeStep(empty)).toBe("ask_preferred_name");
    expect(getGuideConversationResumeStep(readGuideCaptureDraft())).toBe(
      "ask_preferred_name",
    );
  });

  it("removes all previous answers on reset", () => {
    writeGuideCaptureDraft({
      ...createEmptyGuideCaptureDraft(),
      projectNeed: "Old need",
      businessName: "Old Biz",
      requestedDeadline: "2026-09-15",
      existingMaterialsNote: "Old files",
      confirmedAt: "2026-07-17T12:00:00.000Z",
    });

    const empty = startNewGuideCaptureConversation();
    expect(empty).toEqual(createEmptyGuideCaptureDraft());
    expect(readGuideCaptureDraft()).toBeNull();
  });

  it("still restores an unfinished session draft", () => {
    const unfinished = normalizeGuideCaptureDraft({
      schemaVersion: 1,
      projectNeed: "I need my current logo refreshed.",
      businessName: "Green Horizon Landscaping",
      requestedDeadline: "September 15, 2026",
      existingMaterialsNote: "PNG and business card",
    });
    writeGuideCaptureDraft(unfinished);

    const restored = readGuideCaptureDraft();
    expect(restored?.projectNeed).toBe("I need my current logo refreshed.");
    expect(restored?.businessName).toBe("Green Horizon Landscaping");
    expect(restored?.confirmedAt).toBeNull();
    expect(getGuideConversationResumeStep(restored)).toBe("summary");
  });

  it("affects only studio-guide:capture-draft:v1", () => {
    window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ campaignId: "keep-me" }));
    window.localStorage.setItem("unrelated-app:key", "keep");
    writeGuideCaptureDraft({
      ...createEmptyGuideCaptureDraft(),
      projectNeed: "Logo refresh",
      confirmedAt: "2026-07-17T12:00:00.000Z",
    });

    startNewGuideCaptureConversation();

    expect(window.localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(CAMPAIGN_KEY)).toContain("keep-me");
    expect(window.localStorage.getItem("unrelated-app:key")).toBe("keep");
  });
});
