import { describe, expect, it } from "vitest";

import {
  isClip549PostingCompanion,
  writeClip549PostingCompanion,
} from "./companion";

const short = {
  clipId: "short-1",
  fileName: "short-1.mp4",
  spokenIdea: "A finished moment from the recording.",
  durationLabel: "0:18",
};

const caption = { clipId: "short-1", text: "Caption" };
const title = { clipId: "short-1", text: "Title" };
const discovery = {
  clipId: "short-1",
  hashtags: ["#studio"],
  keywords: ["recording"],
  suggestionOnly: true as const,
};

describe("clip posting companion", () => {
  it("keeps a matched set and refuses a row that does not match the delivered shorts", () => {
    const ready = writeClip549PostingCompanion({
      delivered: [short],
      captions: [caption],
      titles: [title],
      discovery: [discovery],
    });
    expect(isClip549PostingCompanion(ready)).toBe(true);
    if (!isClip549PostingCompanion(ready)) return;
    expect(ready.title).toBe("How to use this Clip Repurposing set");
    expect(ready.whatEachFileContains).toHaveLength(1);

    const failed = writeClip549PostingCompanion({
      delivered: [short],
      captions: [],
      titles: [title],
      discovery: [discovery],
    });
    expect(failed).toEqual({
      ok: false,
      message: "Companion requires one extras row for each delivered short.",
    });
    expect(isClip549PostingCompanion(failed)).toBe(false);
  });
});
