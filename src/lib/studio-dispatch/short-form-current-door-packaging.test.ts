import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { composeCurrentDoorPresentation, writeCurrentDoorPresentationFiles } from "./short-form-current-door-packaging";

const SPOKEN =
  "The studio is designed to make creative work easier for business owners. You should be able to choose what you need, provide the information, and let the studio handle the production.";

describe("current-door presentation", () => {
  it("turns the spoken idea into a caption, a short cover title, and a posting guide", () => {
    const presentation = composeCurrentDoorPresentation({
      spokenIdea: SPOKEN,
      ctaText: "",
      clipCount: 1,
    });
    expect(presentation).toMatchObject({
      coverTitle: "Creative work, made easier",
      postCaption:
        "The studio makes creative work easier for business owners.\n\nChoose what you need. Provide the information. Let the studio handle the production.",
    });
    if ("ok" in presentation) return;
    expect(presentation.postCaption).not.toBe(SPOKEN);
    expect(presentation.postCaption).not.toMatch(/\b(visit|book|call|click|tap)\b/i);
    expect(presentation.postingGuide).toContain("Short-Form Video Editing");
    expect(presentation.postingGuide).toContain("This set does not include a call to action.");
    expect(presentation.postingGuide).toContain("Three revision rounds are included.");
    expect(presentation.postingGuide).not.toMatch(/349|Content Pack|one revision/i);
    expect(presentation.postingGuide).not.toContain(SPOKEN);
    expect(presentation.postingGuide).not.toContain(
      "The studio is designed to make creative work easier for business owners",
    );
  });

  it("keeps a supplied call to action exact and does not invent one", () => {
    const supplied = "Book the marked moment.";
    const presentation = composeCurrentDoorPresentation({
      spokenIdea: SPOKEN,
      ctaText: supplied,
      clipCount: 1,
    });
    expect(presentation).toMatchObject({
      postCaption: expect.stringMatching(new RegExp(`${supplied.replace(".", "\\.")}$`)),
    });
    if ("ok" in presentation) return;
    expect(presentation.postingGuide).toContain(`End the post with these customer words: ${supplied}`);
    const blank = composeCurrentDoorPresentation({
      spokenIdea: "Our shop opens early. You should be able to bring the keys, set the lights, and start the day.",
      ctaText: " ",
      clipCount: 1,
    });
    expect(blank).toMatchObject({
      coverTitle: "Our shop opens early",
      postCaption: "Our shop opens early.\n\nBring the keys. Set the lights. Start the day.",
    });
  });

  it("paints a title-only 1080x1920 cover", async () => {
    const work = mkdtempSync(path.join(tmpdir(), "sf-cover-"));
    const written = await writeCurrentDoorPresentationFiles({
      spokenIdea: SPOKEN,
      ctaText: "",
      clipCount: 1,
      clipId: "clip-1",
      setIndex: 1,
      setCount: 1,
      coverAbsolutePath: path.join(work, "cover.png"),
      postCaptionAbsolutePath: path.join(work, "post-caption.txt"),
      guideAbsolutePath: path.join(work, "use-guide.md"),
    });
    expect(written.ok).toBe(true);
    const meta = await sharp(path.join(work, "cover.png")).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1920);
    rmSync(work, { recursive: true, force: true });
  });
});
