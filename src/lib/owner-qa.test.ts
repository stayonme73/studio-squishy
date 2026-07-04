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
      "route-map",
      "payment-checkout-test",
      "studio-board",
      "project-record",
      "review-room-ready",
      "final-delivery-complete",
      "help-center",
    ]);

    const labels = ownerQa.journeyPresets.map((preset) => preset.label);
    expect(labels).toEqual([
      "Studio Lobby",
      "Route Map",
      "Payment / Checkout test",
      "Studio Board",
      "Project Record",
      "Review Room",
      "Final Delivery",
      "Help Center",
    ]);
    expect(labels).not.toContain("Discovery Room");
    expect(labels).not.toContain("Studio Plan Preview");
    expect(labels).not.toContain("Project Summary + Checkout");
    expect(labels).not.toContain("Project Details");
    const displayText = ownerQa.journeyPresets
      .flatMap((preset) => [preset.label, preset.description ?? ""])
      .join("\n");
    expect(displayText).not.toContain("Discovery Room");
    expect(displayText).not.toContain("Studio Plan Preview");
    expect(displayText).not.toContain("Project Summary + Checkout");
    expect(displayText).not.toContain("Project Details");

    const hrefs = ownerQa.journeyPresets.map((preset) => preset.href);
    expect(hrefs).toContain("/route-map");
    expect(hrefs).not.toContain("/payment");
    expect(hrefs).not.toContain("/business-discovery-studio");
    expect(hrefs).not.toContain("/project-summary");
    expect(hrefs).not.toContain("/project-details");
    expect(hrefs).not.toContain("/studio-guide-prototype");
    expect(hrefs).not.toContain("/studio-kitchen");
    expect(hrefs.some((href) => href.includes("package="))).toBe(false);
  });

  it("exposes active internal shortcuts and Reset Campaign", () => {
    expect(ownerQa.shortcuts.map((shortcut) => shortcut.label)).toEqual([
      "File Room",
      "Owner Console",
      "Production Workspace",
      "Team Offices",
      "Studio Self-Test",
      "Reset Campaign",
    ]);
    expect(ownerQa.shortcuts.filter((shortcut) => shortcut.kind === "link").map((shortcut) => shortcut.href)).toEqual([
      "/file-room",
      "/file-room/owner-console",
      "/file-room/studio-self-test/production/studio-self-test%3Asm-001",
      "/file-room/studio-self-test/office/strategy",
      "/file-room/studio-self-test",
    ]);
    expect(ownerQa.shortcuts.filter((shortcut) => shortcut.kind === "reset")).toHaveLength(1);
  });

  it("seeds a believable Green custom plan total for checkout steps", () => {
    const plan = buildOwnerQaGreenApprovedPlan();
    expect(plan.selectedServiceIds).toEqual(["bf-001", "sm-001", "em-001"]);
    expect(plan.amountDueTodayCents).toBe(121_500);
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

  it("seeds checkout test with a Route Map approved plan", () => {
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
      applyOwnerQaJourneySeed("payment-checkout-test");
      const raw = localStorage.getItem("studio-squishy:current-campaign");
      expect(raw).toBeTruthy();
      const campaign = JSON.parse(raw!) as {
        campaignStatus: string;
        paymentReceivedAt: string | null;
        approvedStudioPlan?: { amountDueTodayCents: number };
        routeMapContext?: { jobId: string; roadId: string };
      };
      expect(campaign.campaignStatus).toBe("DISCOVERY_COMPLETE");
      expect(campaign.paymentReceivedAt).toBeNull();
      expect(campaign.routeMapContext).toEqual(
        expect.objectContaining({ jobId: "v2-rtu-social-posts", roadId: "i20" }),
      );
      expect(campaign.approvedStudioPlan?.amountDueTodayCents).toBeGreaterThan(0);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
