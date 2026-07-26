import { beforeEach, describe, expect, it, vi } from "vitest";

import { STUDIO_GUIDE_CAPTURE_STORAGE_KEY } from "@/lib/studio-guide-capture";
import { studioWorkingDraftV1 } from "@/config/studio-working-draft-v1";
import { stageLocation } from "@/config/conversation-room-stage-v1";
import {
  clearCompletedConversationLocalState,
  clearConversationGuideLocals,
  isConversationJourneyComplete,
  resolveLobbyConversationBeginInvite,
} from "./lobby-begin";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("lobby conversation begin", () => {
  beforeEach(() => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", memoryStorage());
    vi.stubGlobal("window", {
      localStorage: storage,
      sessionStorage: memoryStorage(),
    });
  });

  it("starts fresh when there is no progress", () => {
    expect(resolveLobbyConversationBeginInvite()).toBe("start");
    expect(isConversationJourneyComplete()).toBe(false);
  });

  it("resumes when opening answers exist and journey is not complete", () => {
    localStorage.setItem(
      STUDIO_GUIDE_CAPTURE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        preferredName: "Tagia",
        projectNeed: "Flyer for grand opening",
        businessName: "",
        requestedDeadline: "",
        deadlineStatus: "unknown",
        existingMaterialsNote: "",
        confirmedAt: "2026-07-21T12:00:00.000Z",
        source: "lobby-guide-conversation",
      }),
    );
    expect(resolveLobbyConversationBeginInvite()).toBe("resume");
  });

  it("clears and starts fresh when stage is complete", () => {
    localStorage.setItem(
      STUDIO_GUIDE_CAPTURE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        preferredName: "Tagia",
        projectNeed: "Flyer",
        businessName: "",
        requestedDeadline: "",
        deadlineStatus: "unknown",
        existingMaterialsNote: "",
        confirmedAt: "2026-07-21T12:00:00.000Z",
        source: "lobby-guide-conversation",
      }),
    );
    const location = stageLocation("complete");
    localStorage.setItem(
      studioWorkingDraftV1.storageKey,
      JSON.stringify({
        version: 1,
        status: "working_draft",
        editable: true,
        updatedAt: "2026-07-21T12:00:00.000Z",
        revision: 1,
        cursor: {
          conversationLocation: location,
          flowStep: "complete",
        },
        slices: {
          currentConversationLocation: location,
        },
        attribution: [],
      }),
    );

    expect(isConversationJourneyComplete()).toBe(true);
    expect(resolveLobbyConversationBeginInvite()).toBe("start");
    expect(localStorage.getItem(studioWorkingDraftV1.storageKey)).toBeNull();
    expect(localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toBeNull();
  });

  it("clearCompletedConversationLocalState removes guide + working draft only", () => {
    localStorage.setItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY, "{}");
    localStorage.setItem(studioWorkingDraftV1.storageKey, "{}");
    clearCompletedConversationLocalState();
    expect(localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(studioWorkingDraftV1.storageKey)).toBeNull();
  });

  it("clearConversationGuideLocals keeps working-draft attribution for handoff", () => {
    localStorage.setItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY, "{}");
    localStorage.setItem(
      studioWorkingDraftV1.storageKey,
      JSON.stringify({
        version: 1,
        status: "working_draft",
        editable: true,
        updatedAt: "2026-07-26T17:00:00.000Z",
        revision: 2,
        cursor: {},
        slices: {},
        attribution: [
          {
            id: "a1",
            at: "2026-07-26T17:00:00.000Z",
            actor: "customer",
            summary: "Customer submitted Project Intake",
            actionCode: "intake.submitted",
          },
        ],
      }),
    );
    clearConversationGuideLocals();
    expect(localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toBeNull();
    const raw = localStorage.getItem(studioWorkingDraftV1.storageKey);
    expect(raw).toBeTruthy();
    const draft = JSON.parse(raw!) as { attribution: unknown[] };
    expect(draft.attribution).toHaveLength(1);
  });
});
