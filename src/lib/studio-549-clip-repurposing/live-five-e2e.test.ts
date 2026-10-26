import path from "path";
import { describe, expect, it } from "vitest";

import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { readDeepgramApiKey } from "@/lib/studio-short-form-video-editing/deepgram";

import { runClip549LiveFiveE2e } from "./live-five-e2e";
import { discoverDesignatedClipSource } from "./probe-designated-source";

const REPO = path.resolve(__dirname, "../../..");

describe("Clip 549 live five-output E2E", () => {
  it("has a designated source that yields at least five distinct clips", () => {
    const { discovery } = discoverDesignatedClipSource(REPO);
    expect(discovery.viableDistinctCount).toBeGreaterThanOrEqual(5);
    expect(discovery.selected).toHaveLength(5);
  });

  it(
    "finishes five real MP4s and Quality-watches them",
    async () => {
      applyDotenvLocal(REPO);
      if (!readDeepgramApiKey()) {
        throw new Error(
          "DEEPGRAM_API_KEY absent after applyDotenvLocal. Cannot close the live five-clip gap.",
        );
      }
      const result = await runClip549LiveFiveE2e(REPO);
      expect(result.ok, result.ok ? "ok" : result.message).toBe(true);
      if (!result.ok) return;
      expect(result.proof.allFiveRendered).toBe(true);
      expect(result.proof.qualityInspectedAllFive).toBe(true);
      expect(result.proof.files).toHaveLength(5);
      expect(
        result.proof.files.every((file) => file.clipId === result.proof.discovery.selectedIds[
          result.proof.files.indexOf(file)
        ]),
      ).toBe(true);
    },
    60 * 60 * 1000,
  );
});
