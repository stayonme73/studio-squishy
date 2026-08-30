import { beforeEach, describe, expect, it } from "vitest";

import {
  STUDIO_VOICE_FIRST_ENTRY_CHOICE_KEY,
  STUDIO_VOICE_FIRST_ENTRY_COOKIE,
  STUDIO_VOICE_NARRATION_PREFERENCE_KEY,
} from "@/config/studio-voice-preference-v1";
import {
  clearVoiceFirstEntryChoiceRequired,
  clearVoiceNarrationPreference,
  isVoiceFirstEntryChoiceRequired,
  isVoiceNarrationEnabled,
  markVoiceFirstEntryChoiceRequired,
  readVoiceNarrationPreference,
  resolveBootVoiceNarrationPreference,
  shouldHoldVoiceFirstEntryGate,
  writeVoiceNarrationPreference,
} from "@/lib/studio-voice-preference";

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

describe("studio voice narration preference", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: memoryStorage(),
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { cookie: "" },
    });
  });

  it("starts unset and does not enable narration", () => {
    expect(readVoiceNarrationPreference()).toBeNull();
    expect(isVoiceNarrationEnabled()).toBe(false);
  });

  it("persists on and off in sessionStorage", () => {
    writeVoiceNarrationPreference("on");
    expect(sessionStorage.getItem(STUDIO_VOICE_NARRATION_PREFERENCE_KEY)).toBe(
      "on",
    );
    expect(readVoiceNarrationPreference()).toBe("on");
    expect(isVoiceNarrationEnabled()).toBe(true);

    writeVoiceNarrationPreference("off");
    expect(readVoiceNarrationPreference()).toBe("off");
    expect(isVoiceNarrationEnabled()).toBe(false);
  });

  it("Let’s Get Started holds the gate even when leftover Voice Off exists", () => {
    writeVoiceNarrationPreference("off");
    markVoiceFirstEntryChoiceRequired();
    expect(readVoiceNarrationPreference()).toBeNull();
    expect(sessionStorage.getItem(STUDIO_VOICE_FIRST_ENTRY_CHOICE_KEY)).toBe(
      "required",
    );
    expect(isVoiceFirstEntryChoiceRequired()).toBe(true);
    expect(isVoiceFirstEntryChoiceRequired()).toBe(true);
    expect(
      shouldHoldVoiceFirstEntryGate({
        firstEntryRequired: true,
        hasConversationProgress: false,
      }),
    ).toBe(true);
    expect(
      resolveBootVoiceNarrationPreference({ requireFirstEntryChoice: true }),
    ).toBeNull();
    expect(readVoiceNarrationPreference()).toBeNull();
  });

  it("does not restore leftover preference on an unanswered opening", () => {
    writeVoiceNarrationPreference("on");
    expect(
      shouldHoldVoiceFirstEntryGate({
        firstEntryRequired: false,
        hasConversationProgress: false,
      }),
    ).toBe(true);
    expect(
      resolveBootVoiceNarrationPreference({ requireFirstEntryChoice: true }),
    ).toBeNull();
  });

  it("may restore preference after the conversation has real progress", () => {
    writeVoiceNarrationPreference("on");
    expect(
      shouldHoldVoiceFirstEntryGate({
        firstEntryRequired: false,
        hasConversationProgress: true,
      }),
    ).toBe(false);
    expect(
      resolveBootVoiceNarrationPreference({ requireFirstEntryChoice: false }),
    ).toBe("on");
  });

  it("begin-new cookie holds the gate until the customer chooses", () => {
    writeVoiceNarrationPreference("on");
    document.cookie = `${STUDIO_VOICE_FIRST_ENTRY_COOKIE}=1`;
    expect(isVoiceFirstEntryChoiceRequired()).toBe(true);
    expect(
      resolveBootVoiceNarrationPreference({ requireFirstEntryChoice: true }),
    ).toBeNull();
    clearVoiceFirstEntryChoiceRequired();
    expect(isVoiceFirstEntryChoiceRequired()).toBe(false);
  });

  it("clearVoiceNarrationPreference removes the stored choice", () => {
    writeVoiceNarrationPreference("on");
    clearVoiceNarrationPreference();
    expect(readVoiceNarrationPreference()).toBeNull();
  });
});
