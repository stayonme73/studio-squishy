import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  shotstackDownloadMp4,
  shotstackPollUntilDone,
  shotstackSubmitRender,
} from "@/lib/studio-kitchen-production/video-integration/client";
import { readShotstackApiKey } from "@/lib/studio-kitchen-production/video-integration/config";

import { buildFootageCaptionAsset } from "./footage-payload";
import { applyDotenvLocal } from "./load-env-local";

const REPO = path.resolve(__dirname, "../../..");
const LIVE = process.env.LIVE_CAPTION_PROOF === "1";

describe.skipIf(!LIVE)("Caption spacing visual proof", () => {
  it("renders reusable caption assets and keeps word gaps", async () => {
    applyDotenvLocal(REPO);
    const apiKey = readShotstackApiKey(process.env, "stage");
    expect(apiKey, "SHOTSTACK_API_KEY absent").toBeTruthy();

    const speech = buildFootageCaptionAsset({
      text: "I am from the United States",
      role: "speech",
    });
    const cta = buildFootageCaptionAsset({
      text: "Read the project notes",
      role: "cta",
    });
    expect(String(speech.text)).toContain("\u2002");
    expect(String(cta.text)).toContain("\u2002");

    const submit = await shotstackSubmitRender(
      {
        timeline: {
          background: "#8A8A8A",
          tracks: [
            {
              clips: [
                {
                  asset: speech,
                  start: 0,
                  length: 2.4,
                  width: 980,
                  height: 240,
                  offset: { x: 0, y: -0.12 },
                },
                {
                  asset: cta,
                  start: 2.4,
                  length: 2.4,
                  width: 980,
                  height: 180,
                  offset: { x: 0, y: 0.08 },
                },
              ],
            },
          ],
        },
        output: {
          format: "mp4",
          size: { width: 1080, height: 1920 },
          fps: 25,
        },
      },
      {
        apiKey,
        envName: "stage",
        retry: { maxAttempts: 1, baseDelayMs: 0 },
      },
    );
    if (!submit.ok) {
      throw new Error(submit.message);
    }

    const poll = await shotstackPollUntilDone(submit.providerRenderId, {
      apiKey,
      envName: "stage",
      maxAttempts: 40,
      delayMs: 2000,
    });
    if (!poll.ok || poll.status !== "done" || !poll.outputUrl) {
      throw new Error(poll.ok ? poll.error ?? poll.status : poll.message);
    }

    const download = await shotstackDownloadMp4(poll.outputUrl);
    if (!download.ok) {
      throw new Error(download.message);
    }

    const outDir = path.join(
      REPO,
      "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof",
    );
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "caption-spacing-proof.mp4"), download.bytes);
    writeFileSync(
      path.join(outDir, "caption-spacing-proof.json"),
      JSON.stringify(
        {
          providerRenderId: submit.providerRenderId,
          credits: poll.credits ?? null,
          renderEnv: "stage",
          speechText: speech.text,
          ctaText: cta.text,
        },
        null,
        2,
      ),
    );
    expect(download.bytes.length).toBeGreaterThan(1000);
  }, 180_000);
});
