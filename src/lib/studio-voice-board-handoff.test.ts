import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStudioVoiceBoardHandoff,
  consumeStudioVoiceBoardWelcome,
  markStudioVoiceBoardHandoffAwaitingSignIn,
  peekStudioVoiceBoardHandoffAwaitingSignIn,
  promoteStudioVoiceBoardHandoffToWelcome,
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

describe("studio-voice-board-handoff", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: memoryStorage(),
    });
    clearStudioVoiceBoardHandoff();
  });

  it("walks Intake → sign-in → Board welcome once", () => {
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(false);

    markStudioVoiceBoardHandoffAwaitingSignIn();
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(true);
    expect(sessionStorage.getItem(STUDIO_VOICE_BOARD_HANDOFF_KEY)).toBeTruthy();

    promoteStudioVoiceBoardHandoffToWelcome();
    expect(peekStudioVoiceBoardHandoffAwaitingSignIn()).toBe(false);

    expect(consumeStudioVoiceBoardWelcome()).toBe(true);
    expect(consumeStudioVoiceBoardWelcome()).toBe(false);
    expect(sessionStorage.getItem(STUDIO_VOICE_BOARD_HANDOFF_KEY)).toBeNull();
  });

  it("does not promote or welcome without a handoff", () => {
    promoteStudioVoiceBoardHandoffToWelcome();
    expect(consumeStudioVoiceBoardWelcome()).toBe(false);
  });
});
