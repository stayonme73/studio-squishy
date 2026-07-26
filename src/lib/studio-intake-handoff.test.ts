import { beforeEach, describe, expect, it, vi } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { CONVERSATION_ROOM_INTAKE_HREF } from "@/config/legacy-route-quarantine-v1";
import { studioBoard } from "@/config/studio-board";
import { ROUTE_MAP_INTAKE_STEP_HREF } from "@/lib/intake-edit";
import {
  applyIntakeHandoffPassport,
  completeIntakeHandoff,
  probeCustomerSessionSignedIn,
  resolveIntakeHandoffPlan,
} from "@/lib/studio-intake-handoff";
import {
  clearStudioVoiceBoardHandoff,
  markStudioVoiceBoardHandoffAwaitingSignIn,
  peekStudioVoiceBoardHandoffAwaitingSignIn,
  STUDIO_VOICE_BOARD_HANDOFF_KEY,
} from "@/lib/studio-voice-board-handoff";

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

describe("resolveIntakeHandoffPlan — Truthful Handoff", () => {
  it("signed-out: account-choice CTA, Voice, passport, and destination align", () => {
    const plan = resolveIntakeHandoffPlan(false);
    expect(plan.auth).toBe("signed-out");
    expect(plan.passport).toBe("awaiting-signin");
    expect(plan.destination).toBe(
      `/account-handoff?from=${encodeURIComponent(studioBoard.routes.studioBoard)}`,
    );
    expect(plan.submitCtaLabel).toBe(
      conversationRoomGuideV1.intakeSubmitCtaSignedOut,
    );
    expect(plan.submitCtaLabel).toMatch(/ACCOUNT/i);
    expect(plan.submitCtaLabel).not.toMatch(/SIGN IN/i);
    expect(plan.submitCtaLabel).not.toMatch(/STUDIO BOARD/i);
    expect(plan.nextStepBlurb).toBe(
      conversationRoomGuideV1.intakeNextStepBlurbSignedOut,
    );
    expect(plan.tabletNextReady).toBe(
      conversationRoomGuideV1.intakeTabletNextReadySignedOut,
    );
    expect(plan.tabletNextReady.toLowerCase()).toMatch(/create an account/);
    expect(plan.tabletNextReady.toLowerCase()).toMatch(/sign in/);
    expect(plan.voiceLine).toBe(
      conversationRoomGuideV1.intakeSubmitSuccessVoiceSignedOut,
    );
    expect(plan.voiceLine.toLowerCase()).toMatch(/create an account/);
    expect(plan.voiceLine.toLowerCase()).toMatch(/sign in/);
  });

  it("signed-in: Studio Board CTA, Voice, passport, and destination align", () => {
    const plan = resolveIntakeHandoffPlan(true);
    expect(plan.auth).toBe("signed-in");
    expect(plan.passport).toBe("awaiting-board-welcome");
    expect(plan.destination).toBe(studioBoard.routes.studioBoard);
    expect(plan.submitCtaLabel).toBe(
      conversationRoomGuideV1.intakeSubmitCtaSignedIn,
    );
    expect(plan.submitCtaLabel).toMatch(/STUDIO BOARD/i);
    expect(plan.submitCtaLabel).not.toMatch(/SIGN IN/i);
    expect(plan.nextStepBlurb).toBe(
      conversationRoomGuideV1.intakeNextStepBlurbSignedIn,
    );
    expect(plan.tabletNextReady).toBe(
      conversationRoomGuideV1.intakeTabletNextReadySignedIn,
    );
    expect(plan.tabletNextReady).not.toMatch(/Sign In/i);
    expect(plan.voiceLine).toBe(
      conversationRoomGuideV1.intakeSubmitSuccessVoiceSignedIn,
    );
    expect(plan.voiceLine.toLowerCase()).not.toMatch(/sign in/);
  });
});

describe("CR-5B1 — Intake fallback CTA customer truth", () => {
  it("uses Project Intake wording without Host and keeps the CR intake destination", () => {
    const cta = conversationRoomGuideV1.intakeHostFallbackCta;
    expect(cta).toBe("Open Project Intake");
    expect(cta).not.toMatch(/Host/i);
    expect(cta).not.toMatch(/Voice Host|Live Host|Studio Host/i);
    expect(cta).not.toMatch(/begin production|start review|recommend/i);
    expect(ROUTE_MAP_INTAKE_STEP_HREF).toBe(CONVERSATION_ROOM_INTAKE_HREF);
    expect(ROUTE_MAP_INTAKE_STEP_HREF).toBe(
      "/studio-conversation-room?stage=intake",
    );
  });
});

describe("applyIntakeHandoffPassport", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: memoryStorage(),
    });
    clearStudioVoiceBoardHandoff();
  });

  it("signed-out stamps awaiting-signin", () => {
    applyIntakeHandoffPassport(false);
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(true);
  });

  it("signed-in stamps awaiting-board-welcome and clears stuck awaiting-signin", () => {
    markStudioVoiceBoardHandoffAwaitingSignIn();
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(true);

    applyIntakeHandoffPassport(true);
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(false);
    const raw = sessionStorage.getItem(STUDIO_VOICE_BOARD_HANDOFF_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).phase).toBe("awaiting-board-welcome");
  });
});

describe("probeCustomerSessionSignedIn", () => {
  it("returns true when session has a user id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "cust_1" } }),
    });
    await expect(probeCustomerSessionSignedIn(fetchImpl)).resolves.toBe(true);
  });

  it("fail-closed to signed-out on non-ok, empty user, or throw", async () => {
    await expect(
      probeCustomerSessionSignedIn(
        vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
      ),
    ).resolves.toBe(false);

    await expect(
      probeCustomerSessionSignedIn(
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ user: null }),
        }),
      ),
    ).resolves.toBe(false);

    await expect(
      probeCustomerSessionSignedIn(vi.fn().mockRejectedValue(new Error("net"))),
    ).resolves.toBe(false);
  });
});

describe("completeIntakeHandoff — Conversation Room + Host Route Map contract", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: memoryStorage(),
    });
    clearStudioVoiceBoardHandoff();
  });

  it("signed-out completion: passport awaiting-signin + account-choice plan", async () => {
    const plan = await completeIntakeHandoff({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: null }),
      }),
    });
    expect(plan.auth).toBe("signed-out");
    expect(plan.destination).toContain("/account-handoff");
    expect(plan.destination).toContain(
      encodeURIComponent(studioBoard.routes.studioBoard),
    );
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(true);
  });

  it("signed-in completion: passport awaiting-board-welcome + Board plan (Host path shares this)", async () => {
    markStudioVoiceBoardHandoffAwaitingSignIn();
    const plan = await completeIntakeHandoff({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "cust_signed_in" } }),
      }),
    });
    expect(plan.auth).toBe("signed-in");
    expect(plan.destination).toBe(studioBoard.routes.studioBoard);
    expect(plan.voiceLine).not.toMatch(/sign in/i);
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(false);
    expect(JSON.parse(sessionStorage.getItem(STUDIO_VOICE_BOARD_HANDOFF_KEY)!).phase).toBe(
      "awaiting-board-welcome",
    );
  });
});
