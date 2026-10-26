import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  applyCaptionTimingRevision,
  buildDeepgramFileListenRequest,
  buildEditDecisionList,
  finishFootageAudio,
  inspectAudioHandoffFile,
  runFootageEditingPipeline,
  transcribeFootageFile,
} from "./index";
import { TALKING_HEAD_INTAKE, TALKING_HEAD_WORDS } from "./talking-head-fixture";

function makeVerticalClip(dir: string): string {
  const abs = path.join(dir, "source.mp4");
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=1080x1920:d=12",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=12",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      abs,
    ],
    { stdio: "pipe" },
  );
  return abs;
}

describe("Footage spine — not the stills hook", () => {
  it("stops before Shotstack when Deepgram is not configured", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "sfve-"));
    const source = makeVerticalClip(dir);
    const result = await runFootageEditingPipeline({
      repoRoot: dir,
      sourceAbsolutePath: source,
      sourceRelativePath: "source.mp4",
      deepgramKey: null,
      anthropicKey: null,
      shotstackKey: "should-not-be-used",
      intake: {
        ctaText: "Read the project notes",
        rightsCleared: true,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.verdict).toBe("DEEPGRAM_KEY_ABSENT");
    expect(result.spend.renders).toBe(0);
    expect(result.spend.deepgramUsdList).toBe(0);
  });

  it("does not buy a second render after a provider ID times out", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "sfve-to-"));
    const source = makeVerticalClip(dir);
    let renderPosts = 0;
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href.includes("deepgram.com")) {
        return new Response(
          JSON.stringify({
            metadata: { duration: 12, request_id: "dg-1" },
            results: {
              channels: [
                {
                  alternatives: [
                    {
                      words: TALKING_HEAD_WORDS,
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200 },
        );
      }
      if (href.includes("/upload") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: { id: "src-1", attributes: { id: "src-1", url: "https://example.test/put" } },
          }),
          { status: 200 },
        );
      }
      if (href.includes("example.test/put")) {
        return new Response("", { status: 200 });
      }
      if (href.includes("/sources/")) {
        return new Response(
          JSON.stringify({
            data: { attributes: { status: "ready", source: "https://example.test/src.mp4" } },
          }),
          { status: 200 },
        );
      }
      if (href.includes("/render") && init?.method === "POST") {
        renderPosts += 1;
        return new Response(
          JSON.stringify({ response: { id: "render-1", status: "queued" } }),
          { status: 200 },
        );
      }
      if (href.includes("/render/render-1")) {
        return new Response(
          JSON.stringify({ response: { id: "render-1", status: "rendering" } }),
          { status: 200 },
        );
      }
      return new Response("no", { status: 404 });
    };

    const result = await runFootageEditingPipeline({
      repoRoot: dir,
      sourceAbsolutePath: source,
      sourceRelativePath: "source.mp4",
      deepgramKey: "dg-test",
      anthropicKey: null,
      shotstackKey: "ss-test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      pollMaxAttempts: 2,
      pollDelayMs: 1,
      intake: { ctaText: "Read the project notes", rightsCleared: true },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.verdict).toBe("RENDER_TIMEOUT");
    expect(result.providerRenderId).toBe("render-1");
    expect(renderPosts).toBe(1);
    expect(result.spend.renders).toBe(1);
  }, 20_000);

  it("keeps revision from rewriting speech or CTA", () => {
    const edl = buildEditDecisionList({
      words: TALKING_HEAD_WORDS,
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: 52,
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    const revised = applyCaptionTimingRevision(edl, 0.15);
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    expect(revised.captions.map((c) => c.text)).toEqual(edl.captions.map((c) => c.text));
  });

  it("remuxes loudnorm audio as h264 + aac 48k that inspects audible", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "sfve-audio-"));
    const source = makeVerticalClip(dir);
    const output = path.join(dir, "finished.mp4");
    const finished = finishFootageAudio({
      sourceAbsolutePath: source,
      outputAbsolutePath: output,
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    const inspect = inspectAudioHandoffFile(output);
    expect(inspect.ok).toBe(true);
    expect(inspect.hasAudio).toBe(true);
    expect(inspect.codec).toBe("aac");
    expect(inspect.sampleRateHz).toBe(48000);
    expect(inspect.channels).toBe(2);
    expect(inspect.videoCodec).toBe("h264");
    expect(inspect.audible).toBe(true);
    expect(inspect.meanVolumeDb).not.toBeNull();
    expect(inspect.meanVolumeDb ?? -99).toBeGreaterThan(-40);
    expect(inspect.maxVolumeDb ?? 1).toBeLessThanOrEqual(0);
  }, 30_000);

  it("refuses a Deepgram file request without opt-out", async () => {
    expect(() =>
      buildDeepgramFileListenRequest({ apiKey: "x", mipOptOut: false }),
    ).toThrow(/mip_opt_out/);
    const missing = await transcribeFootageFile({
      apiKey: null,
      absolutePath: __filename,
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe("KEY_ABSENT");
  });
});
