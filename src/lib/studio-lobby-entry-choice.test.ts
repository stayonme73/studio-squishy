import { beforeEach, describe, expect, it } from "vitest";

import {
  clearLobbyEntryVisitState,
  LOBBY_ENTRY_CHOICE_COOKIE,
  readLobbyEntryChoice,
  readLobbyEntryChoiceCookie,
  writeLobbyEntryChoice,
} from "@/config/studio-lobby-entry-v1";

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

describe("lobby entry choice unlock", () => {
  beforeEach(() => {
    const storage = memoryStorage();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    let cookieJar = "";
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return cookieJar;
        },
        set cookie(value: string) {
          const [pair] = value.split(";");
          const name = pair?.split("=")[0]?.trim() ?? "";
          if (/Max-Age=0/i.test(value)) {
            cookieJar = cookieJar
              .split(";")
              .map((part) => part.trim())
              .filter((part) => part && !part.startsWith(`${name}=`))
              .join("; ");
            return;
          }
          const others = cookieJar
            .split(";")
            .map((part) => part.trim())
            .filter((part) => part && !part.startsWith(`${name}=`));
          cookieJar = [...others, pair?.trim() ?? ""].filter(Boolean).join("; ");
        },
      },
    });
    clearLobbyEntryVisitState();
  });

  it("unlocks only from sessionStorage, not a stale cookie alone", () => {
    document.cookie = `${LOBBY_ENTRY_CHOICE_COOKIE}=new-to-studio; Path=/`;
    expect(readLobbyEntryChoiceCookie()).toBe("new-to-studio");
    expect(readLobbyEntryChoice()).toBeNull();
  });

  it("reads new-to-studio from sessionStorage after an intentional write", () => {
    writeLobbyEntryChoice("new-to-studio");
    expect(readLobbyEntryChoice()).toBe("new-to-studio");
  });
});
