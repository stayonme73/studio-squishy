import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { reviewRenderedShort } from "@/lib/studio-short-form-content-pack/quality-review";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { readDeepgramApiKey } from "@/lib/studio-short-form-video-editing/deepgram";

import { CLIP_549_OWNER_CERT_CORRECTION_STAMP } from "./owner-cert-correction";

const REPO = path.resolve(__dirname, "../../..");

describe("Clip 549 Owner unusual-cert correction", () => {
  it(
    "Quality-rewatches c-50-377 after the fingertip false B-roll gate",
    async () => {
      applyDotenvLocal(REPO);
      if (!readDeepgramApiKey()) {
        throw new Error("DEEPGRAM_API_KEY absent.");
      }
      const video = path.join(
        REPO,
        CLIP_549_OWNER_CERT_CORRECTION_STAMP,
        "delivery",
        "c-50-377.mp4",
      );
      const quality = await reviewRenderedShort({
        repoRoot: REPO,
        videoAbsolutePath: video,
        workDir: path.join(
          REPO,
          CLIP_549_OWNER_CERT_CORRECTION_STAMP,
          "quality-rewatch",
          "c-50-377-fingertip",
        ),
      });
      expect("ok" in quality).toBe(false);
      if ("ok" in quality) return;
      expect(quality.pass).toBe(true);
      expect(quality.findings).toEqual([]);
      expect(quality.brollSeenInRender).toBe(false);
      const reportPath = path.join(
        REPO,
        CLIP_549_OWNER_CERT_CORRECTION_STAMP,
        "OWNER-CERT-STABLE-OPEN.json",
      );
      const report = JSON.parse(readFileSync(reportPath, "utf8"));
      const fifth = report.files.find((file: { clipId: string }) => file.clipId === "c-50-377");
      fifth.quality = {
        pass: quality.pass,
        findings: quality.findings.map((finding) => finding.code),
        inspectedRenderedMp4: quality.inspectedRenderedMp4,
        renderedAbsolutePath: video,
      };
      writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    },
    5 * 60 * 1000,
  );
});
