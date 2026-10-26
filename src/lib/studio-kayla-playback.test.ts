import { afterEach, describe, expect, it } from "vitest";

import { cancelKaylaPlayback, playKaylaReply } from "./studio-kayla-playback";

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
    async play() {
      this.paused = false;
    },
    pause() {
      this.paused = true;
    },
  };
}

describe("Kayla desk playback", () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    cancelKaylaPlayback();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("stops the previous answer when a newer question starts", async () => {
    URL.createObjectURL = () => "blob:kayla";
    URL.revokeObjectURL = () => undefined;
    const first = fakeAudio();
    const second = fakeAudio();
    const created = [first, second];
    await playKaylaReply({
      audioBase64: btoa("a"),
      createAudio: () => created.shift() ?? fakeAudio(),
    });
    await playKaylaReply({
      audioBase64: btoa("b"),
      createAudio: () => created.shift() ?? fakeAudio(),
    });
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(false);
  });
});
