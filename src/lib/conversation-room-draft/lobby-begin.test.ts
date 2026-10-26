import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STUDIO_GUIDE_CAPTURE_STORAGE_KEY } from "@/lib/studio-guide-capture";
import { studioWorkingDraftV1 } from "@/config/studio-working-draft-v1";
import { stageLocation } from "@/config/conversation-room-stage-v1";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { STUDIO_PAYMENT_SANDBOX_SESSION_KEY } from "@/lib/studio-payment/sandbox-query";
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
    const local = memoryStorage();
    const session = memoryStorage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("window", {
      localStorage: local,
      sessionStorage: session,
      dispatchEvent: vi.fn(),
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

  it("clearCompletedConversationLocalState detaches campaign pointer and keeps sandbox", () => {
    localStorage.setItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY, "{}");
    localStorage.setItem(studioWorkingDraftV1.storageKey, "{}");
    localStorage.setItem(
      "studio-squishy:current-campaign",
      JSON.stringify({
        campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
        campaignName: "Maya’s Mobile Boutique",
        paymentReceivedAt: "2026-09-06T22:28:33.080Z",
        routeMapIntakeSubmittedAt: "2026-09-08T20:00:00.000Z",
      }),
    );
    sessionStorage.setItem(STUDIO_PAYMENT_SANDBOX_SESSION_KEY, "1");
    sessionStorage.setItem(
      "studioConversationSession",
      JSON.stringify({ journeyPhase: "intake", flowStep: "intake" }),
    );

    clearCompletedConversationLocalState();

    expect(localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(studioWorkingDraftV1.storageKey)).toBeNull();
    expect(localStorage.getItem("studio-squishy:current-campaign")).toBeNull();
    expect(sessionStorage.getItem("studioConversationSession")).toBeNull();
    expect(sessionStorage.getItem(STUDIO_PAYMENT_SANDBOX_SESSION_KEY)).toBe("1");
  });

  it("does not resume a frozen Maya campaign as a new customer", () => {
    localStorage.setItem(
      STUDIO_GUIDE_CAPTURE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        preferredName: "Maya",
        projectNeed: "Make Me a Flyer",
        businessName: "Maya’s Mobile Boutique",
        requestedDeadline: "",
        deadlineStatus: "unknown",
        existingMaterialsNote: "",
        confirmedAt: "2026-09-06T22:28:33.080Z",
        source: "lobby-guide-conversation",
      }),
    );
    localStorage.setItem(
      "studio-squishy:current-campaign",
      JSON.stringify({
        campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
        campaignName: "Maya’s Mobile Boutique",
        paymentReceivedAt: "2026-09-06T22:28:33.080Z",
        routeMapIntakeSubmittedAt: "2026-09-08T20:00:00.000Z",
      }),
    );

    expect(isConversationJourneyComplete()).toBe(true);
    expect(resolveLobbyConversationBeginInvite()).toBe("start");
    expect(localStorage.getItem("studio-squishy:current-campaign")).toBeNull();
    expect(localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toBeNull();
  });

  it("wires Let’s Get Started and Conversation Room boot to the isolate helper", () => {
    const lobby = readFileSync(
      join(process.cwd(), "src/components/entrance/WelcomeHallWelcomeScene.tsx"),
      "utf8",
    );
    expect(lobby).toContain("resolveLobbyConversationBeginInvite");
    expect(lobby).not.toContain("loadGuideDraft()");

    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("resolveLobbyConversationBeginInvite()");
    expect(runtime).toContain("detachCurrentCustomerBrowserSession()");
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
