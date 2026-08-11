import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  conversationRoomGuideV1,
  getConversationRoomGuideQuestion,
} from "@/config/conversation-room-guide-v1";
import { recommendRouteFromProjectNeed } from "@/config/conversation-room-route-recommendation-v1";
import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";
import {
  clearRouteRecommendation,
  persistRouteRecommendation,
  readActiveRouteRecommendation,
  readRouteRecommendation,
} from "@/lib/conversation-room-draft";
import { createEmptyGuideCaptureDraft } from "@/lib/studio-guide-capture";
import { applyGuideAnswerToDraft } from "@/lib/studio-guide-hard-nav";
import {
  assertPreAcceptanceAllowsPayment,
  buildPreAcceptanceFactFingerprint,
  clearPersistedPreAcceptanceDecision,
  evaluatePreAcceptance,
  evaluateTimingTruth,
  isClearToAccept,
  resolveRelativeDeadlineHorizon,
  runPreAcceptanceForCheckout,
  type PreAcceptanceProjectFacts,
} from "@/lib/studio-pre-acceptance";
import {
  resolveComposerSendAction,
  resolveGuideAnswerFromUi,
} from "@/lib/studio-guide-answer-resolve";
import {
  clearWorkingDraft,
  createEmptyWorkingDraft,
} from "@/lib/studio-working-draft";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    key: (index: number) => [...map.keys()][index] ?? null,
  };
}

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function baseFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: ["v2-rtu-flyer"],
    projectNeed: "Need a flyer for our spring open house",
    businessName: "Cedar Lane",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
    ...overrides,
  };
}

describe("Conversation Room operating-smoke regressions", () => {
  beforeEach(() => {
    const storage = memoryStorage();
    const session = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", session);
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: storage,
        sessionStorage: session,
        dispatchEvent: () => true,
      },
      configurable: true,
      writable: true,
    });
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent {
        type: string;
        detail: unknown;
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
    );
    clearWorkingDraft(storage);
    clearPersistedPreAcceptanceDecision();
  });

  it("renders exactly one Skip action per skippable guide step (button, not chip)", () => {
    const skippable = conversationRoomGuideV1.questions.filter((q) => q.canSkip);
    expect(skippable.length).toBeGreaterThan(0);
    for (const question of skippable) {
      expect(question.bubbles).not.toContain(conversationRoomGuideV1.skipLabel);
      expect(conversationRoomGuideV1.skipLabel).toBe("Skip for now");
    }

    const business = getConversationRoomGuideQuestion("ask_business_name");
    expect(business?.bubbles).toEqual([
      "I don’t have one yet",
      "Personal project",
      "I’m still deciding",
    ]);
    expect(business?.canSkip).toBe(true);

    const skipped = applyGuideAnswerToDraft(
      createEmptyGuideCaptureDraft(),
      "ask_business_name",
      "",
      true,
    );
    expect(skipped.businessName).toBe("");
  });

  it("keeps dock label Send while guide Send submits the Continue answer path", () => {
    expect(conversationRoomGuideV1.sendMessageLabel).toBe("Send");
    expect(conversationRoomGuideV1.continueLabel).toBe("Continue");
    expect(conversationRoomGuideV1.sendMessageLabel).not.toBe(
      conversationRoomGuideV1.continueLabel,
    );
    expect(
      resolveComposerSendAction({
        isAnsweringQuestion: true,
        typedText: "Within 2 weeks",
      }),
    ).toBe("submit_guide_answer");
  });

  it("typed and tablet deadline choices agree through draft and checkout decision", () => {
    const resolved = resolveGuideAnswerFromUi({
      step: "ask_deadline",
      typed: "Within 2 weeks",
      selectedBubbles: ["Within 2 weeks"],
    });
    const opening = applyGuideAnswerToDraft(
      createEmptyGuideCaptureDraft(),
      "ask_deadline",
      resolved.answer,
      resolved.skipped,
    );
    expect(opening.requestedDeadline).toBe("Within 2 weeks");

    const decision = evaluatePreAcceptance(
      baseFacts({
        requestedDeadline: opening.requestedDeadline,
        deadlineStatus: opening.deadlineStatus,
      }),
    );
    expect(decision.timing.requestedDeadline).toBe("Within 2 weeks");
    expect(decision.timing.reason).not.toBe(
      studioPreAcceptanceV1.customerCopy.timingInvalid,
    );
  });

  it("checkout cannot keep a CLEAR after deadline facts change", () => {
    clearPersistedPreAcceptanceDecision();
    const withRelative = baseFacts({
      requestedDeadline: "Within 2 weeks",
      deadlineStatus: "unconfirmed",
    });
    const clear = runPreAcceptanceForCheckout(withRelative);
    expect(isClearToAccept(clear)).toBe(true);

    const changed = baseFacts({
      requestedDeadline: "whenever works maybe",
      deadlineStatus: "unconfirmed",
      draftRevision: withRelative.draftRevision + 1,
    });
    expect(buildPreAcceptanceFactFingerprint(changed)).not.toBe(
      clear.factFingerprint,
    );
    const gate = assertPreAcceptanceAllowsPayment(changed);
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("stale_decision");
    expect(gate.decision?.timing.requestedDeadline).toBe(
      "whenever works maybe",
    );
    clearPersistedPreAcceptanceDecision();
  });

  it("evaluates Within 2 weeks as a planning horizon, not unreadable", () => {
    const horizon = resolveRelativeDeadlineHorizon("Within 2 weeks");
    expect(horizon.kind).toBe("horizon");
    if (horizon.kind !== "horizon") return;
    expect(horizon.calendarDays).toBe(14);

    const timing = evaluateTimingTruth({
      requestedDeadline: "Within 2 weeks",
      deadlineStatus: "unconfirmed",
      selectedServiceIds: ["v2-rtu-flyer"],
    });
    expect(timing.verdict).not.toBe("CLARIFICATION_NEEDED");
    expect(timing.reason).not.toBe(
      studioPreAcceptanceV1.customerCopy.timingInvalid,
    );
  });

  it("summary truth Within 2 weeks is not reinterpreted as unreadable at pre-acceptance", () => {
    const decision = evaluatePreAcceptance(
      baseFacts({
        requestedDeadline: "Within 2 weeks",
        deadlineStatus: "unconfirmed",
      }),
    );
    expect(decision.timing.reason).not.toBe(
      studioPreAcceptanceV1.customerCopy.timingInvalid,
    );
    expect(decision.timing.verdict).not.toBe("CLARIFICATION_NEEDED");
  });

  it("unreadable free-text deadline still fails at pre-acceptance (correct point)", () => {
    const timing = evaluateTimingTruth({
      requestedDeadline: "whenever works maybe",
      deadlineStatus: "unconfirmed",
    });
    expect(timing.verdict).toBe("CLARIFICATION_NEEDED");
    expect(timing.reason).toBe(
      studioPreAcceptanceV1.customerCopy.timingInvalid,
    );

    const decision = evaluatePreAcceptance(
      baseFacts({
        requestedDeadline: "whenever works maybe",
        deadlineStatus: "unconfirmed",
      }),
    );
    expect(isClearToAccept(decision)).toBe(false);
  });

  it("No deadline yet normalizes to not_requested at capture", () => {
    const next = applyGuideAnswerToDraft(
      createEmptyGuideCaptureDraft(),
      "ask_deadline",
      "No deadline yet",
      false,
    );
    expect(next.requestedDeadline).toBe("");
    expect(next.deadlineStatus).toBe("not_requested");
  });

  it("ASAP does not invent a fake calendar date but does not block as unreadable", () => {
    const timing = evaluateTimingTruth({
      requestedDeadline: "As soon as possible",
      deadlineStatus: "unconfirmed",
      selectedServiceIds: ["v2-rtu-flyer"],
    });
    expect(timing.verdict).toBe("NO_KNOWN_TIMING_CONFLICT");
    expect(timing.reason).not.toBe(
      studioPreAcceptanceV1.customerCopy.timingInvalid,
    );
  });

  it("exact dates still parse and past dates still fail closed", () => {
    const ok = evaluateTimingTruth({
      requestedDeadline: isoDaysFromToday(21),
      deadlineStatus: "unconfirmed",
      selectedServiceIds: ["v2-rtu-flyer"],
    });
    expect(ok.verdict).toBe("NO_KNOWN_TIMING_CONFLICT");

    const past = evaluateTimingTruth({
      requestedDeadline: "2020-01-01",
      deadlineStatus: "unconfirmed",
    });
    expect(past.verdict).toBe("UNSUPPORTED");
  });

  it("Business setup suggests i75 starting route only — does not invent SKUs", () => {
    expect(recommendRouteFromProjectNeed("Business setup")).toBe("i75");
    expect(recommendRouteFromProjectNeed("Not sure yet")).toBeNull();
    expect(recommendRouteFromProjectNeed("")).toBeNull();
  });

  it("stale route recommendation invalidates when project need changes", () => {
    let draft = createEmptyWorkingDraft();
    draft = persistRouteRecommendation(draft, "i75", "Business setup");
    expect(readRouteRecommendation(draft)?.roadId).toBe("i75");
    expect(
      readActiveRouteRecommendation(draft, "Business setup")?.roadId,
    ).toBe("i75");
    expect(
      readActiveRouteRecommendation(draft, "Marketing materials"),
    ).toBeNull();

    draft = clearRouteRecommendation(draft);
    expect(readRouteRecommendation(draft)).toBeNull();
  });

  it("checkout stays blocked when pre-acceptance legitimately needs clarification", () => {
    const decision = evaluatePreAcceptance(
      baseFacts({
        projectNeed: "",
        riskScanText: "",
        requestedDeadline: "whenever works maybe",
        deadlineStatus: "unconfirmed",
        selectedServiceIds: [],
      }),
    );
    expect(isClearToAccept(decision)).toBe(false);
  });
});
