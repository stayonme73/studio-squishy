import { beforeEach, describe, expect, it } from "vitest";

import { STUDIO_GUIDE_CAPTURE_STORAGE_KEY } from "@/config/studio-guide-conversation-v1";
import {
  GUIDE_STEP_STORAGE_KEY,
  nextGuideStep,
  processGuideHardNavSearchParams,
} from "@/lib/studio-guide-hard-nav";

function mockStorage() {
  const store: Record<string, string> = {};
  return {
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

describe("studio-guide-hard-nav", () => {
  beforeEach(() => {
    const local = mockStorage();
    const session = mockStorage();
    Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: session,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: local, sessionStorage: session },
      configurable: true,
    });
  });

  it("advances project need via GET params and stores the next step", () => {
    const params = new URLSearchParams({
      guide: "1",
      gact: "continue",
      gfrom: "ask_project_need",
      ganswer: "My new business",
    });
    const result = processGuideHardNavSearchParams(params);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") return;
    expect(result.step).toBe("ask_business_name");
    expect(result.fromStep).toBe("ask_project_need");
    expect(result.draft.projectNeed).toBe("My new business");
    expect(result.cleanHref).toContain("gstep=ask_business_name");
    expect(window.localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY)).toContain(
      "My new business",
    );
    expect(window.sessionStorage.getItem(GUIDE_STEP_STORAGE_KEY)).toBe(
      "ask_business_name",
    );
  });

  it("rejects empty project need", () => {
    const params = new URLSearchParams({
      guide: "1",
      gact: "continue",
      gfrom: "ask_project_need",
      ganswer: "   ",
    });
    const result = processGuideHardNavSearchParams(params);
    expect(result.kind).toBe("error");
  });

  it("accepts a relative deadline choice without treating it as a calendar date", () => {
    const params = new URLSearchParams({
      guide: "1",
      gact: "continue",
      gfrom: "ask_deadline",
      ganswer: "Within 2 weeks",
    });
    const result = processGuideHardNavSearchParams(params);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") return;
    expect(result.step).toBe("ask_materials");
    expect(result.draft.requestedDeadline).toBe("Within 2 weeks");
  });

  it("orders steps through the guided sequence", () => {
    expect(nextGuideStep("ask_preferred_name")).toBe("ask_project_need");
    expect(nextGuideStep("ask_project_need")).toBe("ask_business_name");
    expect(nextGuideStep("ask_business_name")).toBe("ask_deadline");
    expect(nextGuideStep("ask_deadline")).toBe("ask_materials");
    expect(nextGuideStep("ask_materials")).toBe("summary");
  });

  it("carries prior answers across Continue so summary Confirm can succeed", () => {
    const params = new URLSearchParams({
      guide: "1",
      gact: "continue",
      gfrom: "ask_materials",
      ganswer: "Logo files",
      g_need: "New brand launch",
      g_biz: "Acme",
      g_deadline: "September 15, 2026",
      g_materials: "",
    });
    const result = processGuideHardNavSearchParams(params);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") return;
    expect(result.step).toBe("summary");
    expect(result.draft.projectNeed).toBe("New brand launch");
    expect(result.draft.businessName).toBe("Acme");
    expect(result.draft.existingMaterialsNote).toBe("Logo files");

    const confirm = processGuideHardNavSearchParams(
      new URLSearchParams({
        guide: "1",
        gact: "confirm",
        g_need: "New brand launch",
        g_biz: "Acme",
        g_deadline: "September 15, 2026",
        g_materials: "Logo files",
      }),
    );
    expect(confirm.kind).toBe("advanced");
    if (confirm.kind !== "advanced") return;
    expect(confirm.step).toBe("confirmed");
    expect(confirm.draft.confirmedAt).toBeTruthy();
  });
});
