import path from "path";
import { describe, expect, it } from "vitest";

import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { readDeepgramApiKey } from "@/lib/studio-short-form-video-editing/deepgram";

import { runClip549QualityCorrectionRewatch } from "./quality-correction-rewatch";

const REPO = path.resolve(__dirname, "../../..");

describe("Clip 549 Quality correction rewatch", () => {
  it(
    "rewatches the real five remasters and does not invent B-roll on talking-head pixels",
    async () => {
      applyDotenvLocal(REPO);
      if (!readDeepgramApiKey()) {
        throw new Error("DEEPGRAM_API_KEY absent. Cannot Quality-rewatch the five remasters.");
      }
      const result = await runClip549QualityCorrectionRewatch(REPO);
      expect(result.ok, result.ok ? "ok" : result.message).toBe(true);
      if (!result.ok) return;
      expect(result.report.fiveOutputCount).toBe(5);
      expect(result.report.withBrollWrittenAnywhere).toBe(false);
      expect(result.report.machineOmitBrollReachedProduction).toBe(true);
      expect(result.report.qualityWatchedCorrectedFiles).toBe(true);
      expect(result.report.allFiveNoFalseBroll).toBe(true);
      expect(
        result.report.clips.every((clip) => clip.remasterRewatch.finalPassFromLoopExhaustion === false),
      ).toBe(true);
      expect(
        result.report.clips.every((clip) => clip.remasterRewatch.finalPassFromQualityPass === clip.remasterRewatch.pass),
      ).toBe(true);
    },
    40 * 60 * 1000,
  );
});
