import { describe, expect, it } from "vitest";

import { studioLobbyPodiumGuidanceV1 } from "@/config/studio-lobby-podium-guidance-v1";
import {
  clearStudioLobbyVisited,
  markStudioLobbyVisited,
  readStudioLobbyVisited,
  reconcileLobbyGuidanceEpoch,
  shouldArmLobbyHesitationGuidance,
  shouldOfferLobbyGuidance,
  type LobbyGuidanceStorage,
} from "@/lib/studio-lobby-podium-guidance";

function memoryStorage(seed: Record<string, string> = {}): LobbyGuidanceStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("studio lobby podium guidance", () => {
  it("arms hesitation only when Lobby has not been visited", () => {
    expect(shouldArmLobbyHesitationGuidance(false)).toBe(true);
    expect(shouldArmLobbyHesitationGuidance(true)).toBe(false);
  });

  it("offers guidance only after hesitation without progress", () => {
    expect(
      shouldOfferLobbyGuidance({
        armed: true,
        progressed: false,
        offeredThisVisit: false,
        elapsedMs: 7999,
        hesitationMs: 8000,
      }),
    ).toBe(false);

    expect(
      shouldOfferLobbyGuidance({
        armed: true,
        progressed: false,
        offeredThisVisit: false,
        elapsedMs: 8000,
        hesitationMs: 8000,
      }),
    ).toBe(true);
  });

  it("never offers after progress or a prior offer this visit", () => {
    expect(
      shouldOfferLobbyGuidance({
        armed: true,
        progressed: true,
        offeredThisVisit: false,
        elapsedMs: 9000,
        hesitationMs: 8000,
      }),
    ).toBe(false);

    expect(
      shouldOfferLobbyGuidance({
        armed: true,
        progressed: false,
        offeredThisVisit: true,
        elapsedMs: 9000,
        hesitationMs: 8000,
      }),
    ).toBe(false);

    expect(
      shouldOfferLobbyGuidance({
        armed: false,
        progressed: false,
        offeredThisVisit: false,
        elapsedMs: 9000,
        hesitationMs: 8000,
      }),
    ).toBe(false);
  });

  it("reads and marks studioLobbyVisited in storage", () => {
    const storage = memoryStorage();
    expect(readStudioLobbyVisited(storage)).toBe(false);
    markStudioLobbyVisited(storage);
    expect(readStudioLobbyVisited(storage)).toBe(true);
    expect(storage.getItem(studioLobbyPodiumGuidanceV1.storageKey)).toBe("1");
  });

  it("keeps the locked Lobby greeting and hesitation timing", () => {
    expect(studioLobbyPodiumGuidanceV1.hesitationMs).toBe(1200);
    expect(studioLobbyPodiumGuidanceV1.speakCooldownMs).toBe(30_000);
    expect(studioLobbyPodiumGuidanceV1.storageKey).toBe("studioLobbyVisited");
    expect(studioLobbyPodiumGuidanceV1.spokenLine).toBe(
      "Welcome to The Studio. I'm Studio Voice. I'll help you choose the right services, answer your questions, and guide you through your project from start to finish. Whenever you're ready, select Let's Get Started on the podium. I'll take it from there.",
    );
    expect(studioLobbyPodiumGuidanceV1.hesitationPrompt.title).toBe(
      "Welcome to The Studio.",
    );
    expect(studioLobbyPodiumGuidanceV1.hesitationPrompt.body).toBe(
      'I\'m Studio Voice. I\'ll help you choose the right services, answer your questions, and guide you through your project from start to finish. Whenever you\'re ready, select "Let\'s Get Started" on the podium. I\'ll take it from there.',
    );
  });

  it("clears the visit flag for cert retests", () => {
    const storage = memoryStorage({ studioLobbyVisited: "1" });
    expect(readStudioLobbyVisited(storage)).toBe(true);
    clearStudioLobbyVisited(storage);
    expect(readStudioLobbyVisited(storage)).toBe(false);
  });

  it("re-arms guidance when the epoch bumps after a stale visit flag", () => {
    const storage = memoryStorage({
      studioLobbyVisited: "1",
      studioLobbyGuidanceEpoch: "1",
    });
    reconcileLobbyGuidanceEpoch(storage);
    expect(readStudioLobbyVisited(storage)).toBe(false);
    expect(storage.getItem("studioLobbyGuidanceEpoch")).toBe(
      studioLobbyPodiumGuidanceV1.guidanceEpoch,
    );
  });
});
