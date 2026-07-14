import { describe, expect, it } from "vitest";

import { ownerQa } from "@/config/owner-qa";
import {
  applyOwnerQaJourneySeed,
  buildOwnerQaGreenApprovedPlan,
  clearAllOwnerQaBrowserState,
} from "@/lib/owner-qa-campaign";

describe("owner-qa menu config", () => {
  it("lists the certified customer journey in order with no legacy routes", () => {
    expect(ownerQa.journeyPresets.map((preset) => preset.id)).toEqual([
      "studio-lobby",
      "route-map",
      "project-builder",
      "studio-plan",
      "checkout",
      "project-intake",
      "studio-board",
      "production",
      "review-room",
      "final-delivery",
    ]);

    const labels = ownerQa.journeyPresets.map((preset) => preset.label);
    expect(labels).toEqual([
      "Studio Lobby",
      "Route Map",
      "Project Builder",
      "Studio Plan",
      "Checkout",
      "Project Intake",
      "Studio Board",
      "Production",
      "Review Room",
      "Final Delivery",
    ]);
    expect(labels).not.toContain("Project Record");
    expect(labels).not.toContain("Discovery Room");
    expect(labels).not.toContain("Payment / Checkout test");
    expect(labels).not.toContain("Project Summary + Checkout");
    const displayText = ownerQa.journeyPresets
      .flatMap((preset) => [preset.label, preset.description ?? ""])
      .join("\n");
    expect(displayText).not.toContain("Discovery Room");
    expect(displayText).not.toContain("Payment / Checkout test");
    expect(displayText).not.toContain("Project Record");
    expect(displayText).not.toContain("Campaign in production");

    const hrefs = ownerQa.journeyPresets.map((preset) => preset.href);
    expect(hrefs).toContain("/route-map");
    expect(hrefs).toContain("/project-builder?road=i75");
    expect(hrefs).toContain("/project-builder?road=i75&view=studio-plan");
    expect(hrefs).toContain("/checkout");
    expect(hrefs).toContain("/route-map?step=intake");
    expect(hrefs).toContain("/studio-board");
    expect(hrefs).toContain("/feedback-studio");
    expect(hrefs).toContain("/deliverables");
    expect(hrefs).not.toContain("/campaign-details");
    expect(hrefs).not.toContain("/project-details");
    expect(hrefs).not.toContain("/business-discovery-studio");
    expect(hrefs).not.toContain("/project-summary");
    expect(hrefs).not.toContain("/studio-guide-prototype");
    expect(hrefs).not.toContain("/studio-kitchen");
    expect(hrefs.some((href) => href.includes("/file-room"))).toBe(false);
    expect(hrefs.some((href) => href.includes("package="))).toBe(false);
  });

  it("uses customer journey section copy in the dev panel config", () => {
    expect(ownerQa.customerJourneySectionTitle).toBe("Customer Journey");
    expect(ownerQa.panelHint).toBe("Jump through the customer journey. Development only.");
  });

  it("exposes active internal shortcuts, help, and Reset Campaign", () => {
    expect(ownerQa.shortcuts.map((shortcut) => shortcut.label)).toEqual([
      "File Room",
      "Owner Console",
      "Production Workspace",
      "Team Offices",
      "Studio Self-Test",
      "Help Center",
      "Reset Campaign",
    ]);
    expect(ownerQa.shortcuts.filter((shortcut) => shortcut.kind === "link").map((shortcut) => shortcut.href)).toEqual([
      "/file-room",
      "/file-room/owner-console",
      "/file-room/studio-self-test/production/studio-self-test%3Asm-001",
      "/file-room/studio-self-test/office/strategy",
      "/file-room/studio-self-test",
      "/help-center",
    ]);
    expect(ownerQa.shortcuts.filter((shortcut) => shortcut.kind === "reset")).toHaveLength(1);
    expect(ownerQa.shortcuts.map((shortcut) => shortcut.label)).not.toContain("Final Delivery");
    expect(ownerQa.shortcuts.map((shortcut) => shortcut.label)).not.toContain("Project Record");
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

      clearAllOwnerQaBrowserState();
      localStorage.setItem("studio-squishy:last-draft", "{}");
      clearAllOwnerQaBrowserState();
      expect(localStorage.getItem("studio-squishy:last-draft")).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("seeds checkout with a Route Map approved plan", () => {
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
      applyOwnerQaJourneySeed("checkout");
      const raw = localStorage.getItem("studio-squishy:current-campaign");
      expect(raw).toBeTruthy();
      const campaign = JSON.parse(raw!) as {
        campaignStatus: string;
        paymentReceivedAt: string | null;
        approvedStudioPlan?: { amountDueTodayCents: number };
        routeMapContext?: { jobId: string; roadId: string; currentStep: string };
      };
      expect(campaign.campaignStatus).toBe("DISCOVERY_COMPLETE");
      expect(campaign.paymentReceivedAt).toBeNull();
      expect(campaign.routeMapContext).toEqual(
        expect.objectContaining({
          jobId: "v2-rtu-social-posts",
          roadId: "i20",
          currentStep: "checkout",
        }),
      );
      expect(campaign.approvedStudioPlan?.amountDueTodayCents).toBeGreaterThan(0);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("seeds project intake with paid Route Map context for current intake", () => {
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
      applyOwnerQaJourneySeed("project-intake");
      const raw = localStorage.getItem("studio-squishy:current-campaign");
      expect(raw).toBeTruthy();
      const campaign = JSON.parse(raw!) as {
        campaignStatus: string;
        paymentReceivedAt: string | null;
        routeMapContext?: { jobId: string; roadId: string; currentStep: string };
      };
      expect(campaign.campaignStatus).toBe("PAYMENT_RECEIVED");
      expect(campaign.paymentReceivedAt).toBeTruthy();
      expect(campaign.routeMapContext).toEqual(
        expect.objectContaining({
          jobId: "v2-rtu-social-posts",
          roadId: "i20",
          currentStep: "intake",
        }),
      );
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
