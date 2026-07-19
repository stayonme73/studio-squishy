import { beforeEach, describe, expect, it } from "vitest";

import {
  hasTrustedProjectContextForVerificationPending,
  resolveVerificationPendingLead,
  VERIFY_PENDING_LEAD_DIRECT,
  VERIFY_PENDING_LEAD_WITH_PROJECT,
} from "@/lib/auth/verification-pending-context";
import { STUDIO_VOICE_BOARD_HANDOFF_KEY } from "@/lib/studio-voice-board-handoff";

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

describe("verification pending context", () => {
  beforeEach(() => {
    const session = memoryStorage();
    const local = memoryStorage();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: session,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
  });

  it("does not infer a project from signup alone", () => {
    expect(hasTrustedProjectContextForVerificationPending()).toBe(false);
    expect(resolveVerificationPendingLead(false)).toBe(VERIFY_PENDING_LEAD_DIRECT);
  });

  it("uses Intake Voice handoff passport for project-safe copy", () => {
    sessionStorage.setItem(
      STUDIO_VOICE_BOARD_HANDOFF_KEY,
      JSON.stringify({
        version: 1,
        phase: "awaiting-signin",
        setAt: new Date().toISOString(),
      }),
    );
    expect(hasTrustedProjectContextForVerificationPending()).toBe(true);
    expect(resolveVerificationPendingLead(true)).toBe(
      VERIFY_PENDING_LEAD_WITH_PROJECT,
    );
  });

  it("uses an existing local campaign as trusted project state", () => {
    localStorage.setItem(
      "studio-squishy:current-campaign",
      JSON.stringify({
        campaignId: "camp-intake-1",
        campaignName: "Test",
        campaignStatus: "PAYMENT_RECEIVED",
        updatedAt: new Date().toISOString(),
      }),
    );
    expect(hasTrustedProjectContextForVerificationPending()).toBe(true);
  });
});
