import { beforeEach, describe, expect, it } from "vitest";

import { STUDIO_VOICE_NARRATION_PREFERENCE_KEY } from "@/config/studio-voice-preference-v1";
import {
  isVoiceNarrationEnabled,
  readVoiceNarrationPreference,
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
});
