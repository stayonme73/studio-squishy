import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  clearLobbyEntryVisitState,
  LOBBY_ENTRY_CHOICE_COOKIE,
  LOBBY_ENTRY_PHONE_MAX_WIDTH_PX,
  readLobbyEntryChoice,
  readLobbyEntryChoiceCookie,
  shouldForceLobbyEntryFilmOnPhone,
  shouldShowLobbyEntryReopen,
  resolvePhoneLobbySurface,
  studioLobbyEntryV1,
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

describe("MJ-D11 phone Lobby after-film landing", () => {
  it("forces the real Entry Film on phone and never shows the reopen pill", () => {
    expect(LOBBY_ENTRY_PHONE_MAX_WIDTH_PX).toBe(1024);
    expect(studioLobbyEntryV1.routes.frontDoor).toBe(
      "/studio-lobby?lobbyEntry=reset",
    );
    expect(
      shouldForceLobbyEntryFilmOnPhone({
        transitioning: false,
        viewportWidth: 360,
      }),
    ).toBe(true);
    expect(
      shouldShowLobbyEntryReopen({
        filmVisible: false,
        transitioning: false,
        viewportWidth: 360,
      }),
    ).toBe(false);
  });

  it("keeps a stored New visit from unlocking the cropped phone Lobby", () => {
    expect(
      resolvePhoneLobbySurface({
        viewportWidth: 360,
        transitioning: false,
        choseNew: true,
        filmDismissed: true,
      }),
    ).toBe("entry-film");
    expect(
      resolvePhoneLobbySurface({
        viewportWidth: 360,
        transitioning: true,
        choseNew: true,
        filmDismissed: true,
      }),
    ).toBe("entry-film");
    expect(
      shouldForceLobbyEntryFilmOnPhone({
        transitioning: false,
        viewportWidth: 360,
      }),
    ).toBe(true);
    expect(
      shouldForceLobbyEntryFilmOnPhone({
        transitioning: true,
        viewportWidth: 360,
      }),
    ).toBe(true);
  });

  it("keeps desktop dismiss/reopen and does not auto-start a hire", () => {
    expect(
      shouldForceLobbyEntryFilmOnPhone({
        transitioning: false,
        viewportWidth: 1280,
      }),
    ).toBe(false);
    expect(
      shouldShowLobbyEntryReopen({
        filmVisible: false,
        transitioning: false,
        viewportWidth: 1280,
      }),
    ).toBe(true);
  });

  it("wires phone landing to the film, not the wrapped Choose how to begin pill", () => {
    const scene = readFileSync(
      join(
        process.cwd(),
        "src/components/entrance/WelcomeHallWelcomeScene.tsx",
      ),
      "utf8",
    );
    expect(scene).toContain("shouldForceLobbyEntryFilmOnPhone");
    expect(scene).toContain("shouldShowLobbyEntryReopen");
    expect(scene).toContain(
      "const showEntryFilm = filmOpen || phoneFrontDoor || transitioning",
    );
    expect(scene).toContain("allowDismiss={viewportWidth > LOBBY_ENTRY_PHONE_MAX_WIDTH_PX}");
    expect(scene).not.toContain("handleBeginNew();");
    const film = readFileSync(
      join(
        process.cwd(),
        "src/components/entrance/StudioLobbyEntryFilm.tsx",
      ),
      "utf8",
    );
    expect(film).toContain("allowDismiss");
    expect(film).toContain("copy.newToStudio");
    expect(film).toContain("returningSignedOut");
    const css = readFileSync(
      join(process.cwd(), "src/app/welcome-hall-phase1.css"),
      "utf8",
    );
    const phoneBlock = css.slice(css.indexOf("@media (max-width: 1024px)"));
    expect(phoneBlock).toContain(".lobby-entry-reopen");
    expect(phoneBlock).toContain("display: none !important");
    const panel = readFileSync(
      join(process.cwd(), "src/components/dev/OwnerQaPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("withStudioPaymentSandboxQuery");
    expect(panel).toContain("studioLobbyEntryV1.routes.frontDoor");
    const qa = readFileSync(
      join(process.cwd(), "src/config/owner-qa.ts"),
      "utf8",
    );
    expect(qa).toContain("studioLobbyEntryV1.routes.frontDoor");
    const seed = readFileSync(
      join(process.cwd(), "src/lib/owner-qa-campaign.ts"),
      "utf8",
    );
    expect(seed).toContain("clearLobbyEntryVisitState");
  });
});
