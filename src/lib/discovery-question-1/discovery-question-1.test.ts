import { beforeEach, describe, expect, it } from "vitest";

import {
  discoveryLiveQuestionsV1,
  discoveryQuestion1V1,
  getNextDiscoveryLiveQuestion,
} from "@/config/discovery-question-1-v1";
import {
  bootDiscoveryQuestion1Draft,
  buildDiscoveryAcknowledgment,
  captureDiscoveryAnswer,
  captureDiscoveryQuestion1Answer,
  confirmDiscoveryQuestion1,
  isDiscoveryQuestion1Confirmed,
  readActiveDiscoveryKey,
  readDiscoveryQuestion,
  readDiscoveryQuestion1,
} from "@/lib/discovery-question-1";
import {
  clearWorkingDraft,
  type WorkingDraftStorage,
} from "@/lib/studio-working-draft";

function memoryStorage(): WorkingDraftStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe("discovery conversation live wire", () => {
  let storage: WorkingDraftStorage;

  beforeEach(() => {
    storage = memoryStorage();
    clearWorkingDraft(storage);
  });

  it("keeps the conversation as question → answer → next question", () => {
    expect(discoveryLiveQuestionsV1[0].question).toBe(
      "What are you trying to accomplish?",
    );
    expect(discoveryLiveQuestionsV1[1].question).toBe(
      "Tell me a little about your business.",
    );
    expect(getNextDiscoveryLiveQuestion("q1")?.storageKey).toBe("q2");
    expect(getNextDiscoveryLiveQuestion("q2")?.storageKey).toBe("q3");
    expect(getNextDiscoveryLiveQuestion("q3")?.storageKey).toBe("q4");
    expect(getNextDiscoveryLiveQuestion("q4")).toBeNull();
    expect(discoveryLiveQuestionsV1).toHaveLength(4);
    expect(discoveryQuestion1V1.conversationIsTheInterface).toBe(true);
    expect(discoveryQuestion1V1.unlockRemainingDiscoveryQuestions).toBe(false);
  });

  it("saves voice capture with initiator and executor attribution", () => {
    let draft = bootDiscoveryQuestion1Draft(storage);
    const captured = captureDiscoveryQuestion1Answer({
      draft,
      answer: "I need a flyer for my grand opening",
      captureMethod: "voice",
      initiatedBy: "voice",
      executedBy: "customer",
      phase: "captured",
      storage,
    });
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;
    draft = captured.draft;

    const q1 = readDiscoveryQuestion1(draft);
    expect(q1?.answer).toBe("I need a flyer for my grand opening");
    expect(q1?.phase).toBe("captured");
    expect(q1?.initiatedBy).toBe("voice");
    expect(q1?.executedBy).toBe("customer");

    const event = draft.attribution.at(-1);
    expect(event?.initiatedBy).toBe("voice");
    expect(event?.executedBy).toBe("customer");
    expect(event?.actionCode).toBe("discovery.q1.capture");
  });

  it("confirms without losing the answer (Back/refresh-safe store)", () => {
    let draft = bootDiscoveryQuestion1Draft(storage);
    const captured = captureDiscoveryQuestion1Answer({
      draft,
      answer: "Grow my email list",
      captureMethod: "text",
      initiatedBy: "customer",
      executedBy: "customer",
      phase: "captured",
      storage,
    });
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;

    const confirmed = confirmDiscoveryQuestion1({
      draft: captured.draft,
      initiatedBy: "customer",
      executedBy: "customer",
      storage,
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const restored = bootDiscoveryQuestion1Draft(storage);
    const q1 = readDiscoveryQuestion1(restored);
    expect(isDiscoveryQuestion1Confirmed(q1)).toBe(true);
    expect(q1?.phase).toBe("ready");
    expect(q1?.answer).toBe("Grow my email list");
  });

  it("advances the active key after Q1 so the conversation can continue to Q2", () => {
    let draft = bootDiscoveryQuestion1Draft(storage);
    const q1Ready = captureDiscoveryAnswer({
      draft,
      storageKey: "q1",
      answer: "Grow my business",
      captureMethod: "voice",
      initiatedBy: "voice",
      executedBy: "customer",
      phase: "ready",
      storage,
    });
    expect(q1Ready.ok).toBe(true);
    if (!q1Ready.ok) return;
    draft = q1Ready.draft;

    expect(buildDiscoveryAcknowledgment("q1")).toBe("Got it.");
    expect(readActiveDiscoveryKey(draft)).toBe("q2");

    const q2 = captureDiscoveryAnswer({
      draft,
      storageKey: "q2",
      answer: "We help local shops get found online",
      captureMethod: "text",
      initiatedBy: "voice",
      executedBy: "customer",
      phase: "ready",
      storage,
    });
    expect(q2.ok).toBe(true);
    if (!q2.ok) return;
    expect(readDiscoveryQuestion(q2.draft, "q2")?.answer).toContain(
      "local shops",
    );
  });

  it("survives a second boot (refresh / Lobby resume)", () => {
    const first = bootDiscoveryQuestion1Draft(storage);
    const saved = captureDiscoveryQuestion1Answer({
      draft: first,
      answer: "Launch a new service",
      captureMethod: "voice",
      initiatedBy: "voice",
      executedBy: "customer",
      phase: "ready",
      storage,
    });
    expect(saved.ok).toBe(true);

    const second = bootDiscoveryQuestion1Draft(storage);
    expect(readDiscoveryQuestion1(second)?.answer).toBe("Launch a new service");
    expect(readDiscoveryQuestion1(second)?.phase).toBe("ready");
  });
});
