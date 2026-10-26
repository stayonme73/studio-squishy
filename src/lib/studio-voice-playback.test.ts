import { afterEach, describe, expect, it } from "vitest";

import {
  cancelStudioVoicePlayback,
  playStudioVoice,
  setStudioVoicePlaybackDeps,
} from "./studio-voice-playback";

type FakeAudio = {
  src: string;
  paused: boolean;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  play: () => Promise<void>;
  pause: () => void;
};

function fakeAudio(): FakeAudio {
  return {
    src: "",
    paused: true,
    onended: null,
    onerror: null,
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
}

describe("Jessica playback", () => {
  afterEach(() => {
    cancelStudioVoicePlayback();
    setStudioVoicePlaybackDeps(null);
  });

  it("plays checked Jessica audio and does not also speak with Mark", async () => {
    const spoken: string[] = [];
    const audio = fakeAudio();
    setStudioVoicePlaybackDeps({
      narrationEnabled: () => true,
      createAudio: () => audio,
      speakFallback: (text) => {
        spoken.push(text);
        return true;
      },
      createObjectUrl: () => "blob:jessica",
      revokeObjectUrl: () => undefined,
      decodeBase64: () => new Uint8Array([1, 2, 3]),
      fetchSpeech: async () => {
        throw new Error("checked audio must not be fetched again");
      },
    });

    const result = await playStudioVoice({
      text: "Social and Promo Graphics is $199.",
      audioBase64: "AQID",
    });

    expect(result).toBe("jessica");
    expect(audio.paused).toBe(false);
    expect(audio.src).toBe("blob:jessica");
    expect(spoken).toEqual([]);
  });

  it("stops the previous clip when a newer line starts", async () => {
    const first = fakeAudio();
    const second = fakeAudio();
    const created = [first, second];
    setStudioVoicePlaybackDeps({
      narrationEnabled: () => true,
      createAudio: () => created.shift() ?? fakeAudio(),
      speakFallback: () => false,
      createObjectUrl: (bytes) => `blob:${bytes[0]}`,
      revokeObjectUrl: () => undefined,
      decodeBase64: (value) => new Uint8Array([value.charCodeAt(0)]),
    });

    await playStudioVoice({ text: "First line.", audioBase64: "A" });
    expect(first.paused).toBe(false);
    await playStudioVoice({ text: "Second line.", audioBase64: "B" });
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(false);
    expect(second.src).toBe("blob:66");
  });

  it("uses Mark once when ElevenLabs is unavailable and does not start Jessica", async () => {
    const spoken: string[] = [];
    let created = 0;
    setStudioVoicePlaybackDeps({
      narrationEnabled: () => true,
      createAudio: () => {
        created += 1;
        return fakeAudio();
      },
      speakFallback: (text) => {
        spoken.push(text);
        return true;
      },
      fetchSpeech: async () => null,
    });

    const result = await playStudioVoice({
      text: "I can help with the four Studio packages.",
      fallbackOnly: true,
    });

    expect(result).toBe("mark");
    expect(spoken).toEqual(["I can help with the four Studio packages."]);
    expect(created).toBe(0);
  });

  it("drops audio that arrives after the customer asks a new question", async () => {
    let release: (value: string | null) => void = () => undefined;
    const pending = new Promise<string | null>((resolve) => {
      release = resolve;
    });
    const spoken: string[] = [];
    let created = 0;
    setStudioVoicePlaybackDeps({
      narrationEnabled: () => true,
      createAudio: () => {
        created += 1;
        return fakeAudio();
      },
      speakFallback: (text) => {
        spoken.push(text);
        return true;
      },
      fetchSpeech: () => pending,
      revokeObjectUrl: () => undefined,
    });

    const playing = playStudioVoice({ text: "Please hold that thought." });
    cancelStudioVoicePlayback();
    release("blob:late");
    const result = await playing;

    expect(result).toBe("cancelled");
    expect(created).toBe(0);
    expect(spoken).toEqual([]);
  });

  it("speaks on the homepage when the Conversation Room voice choice is still unset", async () => {
    const audio = fakeAudio();
    setStudioVoicePlaybackDeps({
      narrationEnabled: () => false,
      createAudio: () => audio,
      speakFallback: () => false,
      createObjectUrl: () => "blob:homepage",
      revokeObjectUrl: () => undefined,
      decodeBase64: () => new Uint8Array([1]),
      fetchSpeech: async () => {
        throw new Error("checked audio must not be fetched again");
      },
    });

    const result = await playStudioVoice({
      text: "I can walk you through this page.",
      audioBase64: "AQID",
      withoutRoomPreference: true,
    });

    expect(result).toBe("jessica");
    expect(audio.src).toBe("blob:homepage");
  });

  it("stays quiet when the Conversation Room voice choice is off", async () => {
    let fetched = false;
    setStudioVoicePlaybackDeps({
      narrationEnabled: () => false,
      fetchSpeech: async () => {
        fetched = true;
        return "blob:no";
      },
      speakFallback: () => true,
    });

    const result = await playStudioVoice({ text: "This stays in the room." });

    expect(result).toBe("silent");
    expect(fetched).toBe(false);
  });
});
