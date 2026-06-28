import { describe, expect, it } from "vitest";

import { ownerQa } from "@/config/owner-qa";
import {
  applyOwnerQaJourneySeed,
  buildOwnerQaGreenApprovedPlan,
  clearAllOwnerQaBrowserState,
  resetOwnerQaCampaignState,
} from "@/lib/owner-qa-campaign";

describe("owner-qa menu config", () => {
  it("lists the current Studio journey in order with no legacy routes", () => {
    expect(ownerQa.journeyPresets.map((preset) => preset.id)).toEqual([
      "studio-lobby",
      "discovery-room",
      "studio-plan-preview",
      "project-summary-checkout",
      "project-details",
      "studio-board-details-needed",
      "studio-board-building",
      "project-record",
      "review-room-ready",
      "final-delivery-complete",
      "help-center",
    ]);

    const hrefs = ownerQa.journeyPresets.map((preset) => preset.href);
    expect(hrefs).not.toContain("/payment");
    expect(hrefs).not.toContain("/studio-guide-prototype");
    expect(hrefs).not.toContain("/studio-kitchen");
    expect(hrefs.some((href) => href.includes("package="))).toBe(false);
  });

  it("exposes only Reset Campaign as a shortcut", () => {
    expect(ownerQa.shortcuts.map((shortcut) => shortcut.label)).toEqual(["Reset Campaign"]);
    expect(ownerQa.shortcuts.filter((shortcut) => shortcut.kind === "reset")).toHaveLength(1);
  });

  it("seeds a believable Green custom plan total for checkout steps", () => {
    const plan = buildOwnerQaGreenApprovedPlan();
    expect(plan.selectedServiceIds).toEqual(["bf-001", "sm-001", "ma-001"]);
    expect(plan.amountDueTodayCents).toBe(138_500);
  });
});

describe("owner-qa hard reset", () => {
  function createStorage() {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
    };
  }

  it("clears every studio-squishy key from local and session storage", () => {
    const localStorage = createStorage();
    const sessionStorage = createStorage();
    const events: string[] = [];

    localStorage.setItem("studio-squishy:current-campaign", "{}");
    localStorage.setItem("studio-squishy:business-discovery-answers", "{}");
    localStorage.setItem("studio-squishy:project-details-draft:owner-qa-dev", "{}");
    localStorage.setItem("studio-squishy:project-details-files:owner-qa-dev", "{}");
    localStorage.setItem("studio-squishy:feedback-session:owner-qa-dev:concept-a", "{}");
    localStorage.setItem("studio-squishy:owner-qa-discovery-panel", "summary");
    localStorage.setItem("unrelated-app:key", "keep");
    sessionStorage.setItem("studio-squishy:test-session", "1");

    const windowStub = {
      localStorage,
      sessionStorage,
      addEventListener: (_type: string, listener: EventListener) => {
        events.push(typeof listener === "function" ? "fn" : "obj");
      },
      removeEventListener: () => undefined,
      dispatchEvent: (event: Event) => {
        events.push(event.type);
        return true;
      },
    };

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: windowStub,
    });

    try {
      clearAllOwnerQaBrowserState();
      expect(localStorage.getItem("studio-squishy:current-campaign")).toBeNull();
      expect(localStorage.getItem("studio-squishy:project-details-draft:owner-qa-dev")).toBeNull();
      expect(localStorage.getItem("studio-squishy:feedback-session:owner-qa-dev:concept-a")).toBeNull();
      expect(localStorage.getItem("unrelated-app:key")).toBe("keep");
      expect(sessionStorage.getItem("studio-squishy:test-session")).toBeNull();
      expect(events).toContain("studio-squishy:campaign-updated");

      resetOwnerQaCampaignState();
      localStorage.setItem("studio-squishy:last-draft", "{}");
      resetOwnerQaCampaignState();
      expect(localStorage.getItem("studio-squishy:last-draft")).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("seeds project-details-needed with paid state and no submitted project details", () => {
    const localStorage = createStorage();
    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage,
        sessionStorage: createStorage(),
        dispatchEvent: () => true,
      },
    });

    try {
      applyOwnerQaJourneySeed("studio-board-details-needed");
      const raw = localStorage.getItem("studio-squishy:current-campaign");
      expect(raw).toBeTruthy();
      const campaign = JSON.parse(raw!) as {
        campaignStatus: string;
        projectDetailsSubmittedAt?: string;
        paymentReceivedAt: string | null;
        approvedStudioPlan?: { amountDueTodayCents: number };
      };
      expect(campaign.campaignStatus).toBe("PAYMENT_RECEIVED");
      expect(campaign.paymentReceivedAt).toBeTruthy();
      expect(campaign.projectDetailsSubmittedAt).toBeUndefined();
      expect(campaign.approvedStudioPlan?.amountDueTodayCents).toBe(138_500);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
