import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { runFlagshipShortFormEdit } from "./pipeline";

const LIVE = process.env.FLAGSHIP_LIVE === "1";

describe.skipIf(!LIVE)("flagship $349 live candidate", () => {
  it(
    "renders a first cut and a different-opening revision",
    { timeout: 900_000 },
    async () => {
      const repoRoot = process.cwd();
      const firstPath = path.join(
        repoRoot,
        "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/first-cut.json",
      );
      const reuseFirst =
        process.env.FLAGSHIP_REUSE_FIRST === "1" && existsSync(firstPath);
      const first = reuseFirst
        ? (JSON.parse(readFileSync(firstPath, "utf8")) as Awaited<
            ReturnType<typeof runFlagshipShortFormEdit>
          >)
        : await runFlagshipShortFormEdit({ repoRoot });
      expect(first.ok, first.ok ? "" : first.message).toBe(true);
      if (!first.ok) return;
      expect(first.inspect.width).toBe(1080);
      expect(first.inspect.height).toBe(1920);
      expect(first.inspect.hasAudio).toBe(true);
      expect(first.brollUsed).toBe(true);
      expect(first.brollSource).toBe("studio_pexels");
      expect(first.musicMethod).toBe("eleven_music");
      expect(first.musicUsed).toBe(true);

      const revised = await runFlagshipShortFormEdit({
        repoRoot,
        priorHookIndex: first.hookIndex,
        revision: {
          kind: "different_opening",
          note: "Use a different spoken opening.",
        },
      });
      expect(revised.ok, revised.ok ? "" : revised.message).toBe(true);
      if (!revised.ok) return;
      expect(revised.revisionApplied).toBe(true);
      expect(revised.hookText).not.toBe(first.hookText);
      expect(revised.brollUsed).toBe(true);
      expect(revised.brollSource).toBe("studio_pexels");
      expect(revised.musicMethod).toBe("eleven_music");
    },
  );
});
