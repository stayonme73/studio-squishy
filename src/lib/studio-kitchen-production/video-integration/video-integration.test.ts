import { createHash } from "crypto";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  CAPCUT_STATUS_CLOSED,
  DEFAULT_SUBMIT_RETRY,
  OWNER_SETUP_INSTRUCTIONS,
  READINESS_AFTER_LIVE_PROOF,
  READINESS_BEFORE_LIVE_PROOF,
  VIDEO_INTEGRATION_STARTING_CONTROL,
  buildShotstackEditPayload,
  hashShotstackRequest,
  integrationVerdictFromEvidence,
  loadShotstackWorkPacketV1,
  loadShotstackWorkPacketV2,
  mapProviderStatus,
  readinessForEvidence,
  readShotstackApiKey,
  redactSecretsForEvidence,
  runShotstackWorkPacketPipeline,
  shotstackCredentialPresence,
  shotstackDownloadMp4,
  shotstackGetRender,
  shotstackSubmitRender,
  validateShotstackWorkPacket,
} from "./index";

const repoRoot = path.resolve(__dirname, "../../../..");
const DURABLE_INTEGRATION_ARTIFACTS =
  "docs/launch/kitchen-video-integration-1/artifacts";
const DURABLE_TEST_FIXTURES = path.join(
  repoRoot,
  DURABLE_INTEGRATION_ARTIFACTS,
  "test-fixtures",
);

function fakeMp4Bytes(size = 4096): Buffer {
  const buf = Buffer.alloc(size, 0);
  buf.write("xxxxftypisom", 0, "ascii");
  return buf;
}

function listDurableMockLeakPaths(): string[] {
  if (!existsSync(DURABLE_TEST_FIXTURES)) return [];
  return readdirSync(DURABLE_TEST_FIXTURES).map((name) =>
    path.join(DURABLE_TEST_FIXTURES, name),
  );
}

describe("KITCHEN-VIDEO-INTEGRATION-1", () => {
  it("starts from sealed provider-selection tip", () => {
    expect(VIDEO_INTEGRATION_STARTING_CONTROL.startsWith("fb2c3b8")).toBe(true);
  });

  it("keeps CapCut closed and readiness non-customer until live proof", () => {
    expect(CAPCUT_STATUS_CLOSED).toContain("FAIL");
    expect(READINESS_BEFORE_LIVE_PROOF).toContain("NOT CUSTOMER READY");
    expect(READINESS_AFTER_LIVE_PROOF).toContain("NOT CUSTOMER READY");
    expect(READINESS_AFTER_LIVE_PROOF).toContain("NOT CERTIFIED");
    expect(READINESS_AFTER_LIVE_PROOF.startsWith("INTEGRATED / QA READY")).toBe(true);
    expect(integrationVerdictFromEvidence({ credentialsPresent: false, v1Bound: false })).toContain(
      "OWNER API SETUP",
    );
    expect(readinessForEvidence({ v1Bound: false })).toBe(READINESS_BEFORE_LIVE_PROOF);
  });

  it("loads Shotstack work packets with deterministic scene order and CTA", () => {
    const v1 = loadShotstackWorkPacketV1(repoRoot);
    const v2 = loadShotstackWorkPacketV2(repoRoot);
    expect(validateShotstackWorkPacket(v1).ok).toBe(true);
    expect(validateShotstackWorkPacket(v2).ok).toBe(true);
    expect(v1.productionMethod).toBe("shotstack");
    expect(v1.scenes.map((s) => s.sceneNumber)).toEqual([1, 2, 3, 4]);
    expect(v1.scenes[3]?.caption).toBe("Book a visit");
    expect(v2.scenes[3]?.caption).toBe("Book your visit today");
    expect(v2.correctionReason).toMatch(/CTA|hold|legibility/i);
    expect(v1.voiceArtifact.contentSha256.startsWith("d2831445")).toBe(true);
  });

  it("maps work packet → Shotstack payload with dimensions, captions, CTA, MP3, order", () => {
    const packet = loadShotstackWorkPacketV1(repoRoot);
    const urls = new Map<string, string>();
    for (const scene of packet.scenes) {
      urls.set(scene.relativePath, `https://example.test/${scene.assetId}.png`);
    }
    urls.set(
      packet.voiceArtifact.relativePath,
      "https://example.test/voice.mp3",
    );
    const built = buildShotstackEditPayload(packet, urls);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.payload.output.format).toBe("mp4");
    expect(built.payload.output.size).toEqual({ width: 1080, height: 1920 });
    expect(built.payload.timeline.soundtrack?.src).toContain("voice.mp3");
    const imageTrack = built.payload.timeline.tracks[1]!;
    const textTrack = built.payload.timeline.tracks[0]!;
    expect(imageTrack.clips).toHaveLength(4);
    expect(textTrack.clips).toHaveLength(4);
    expect((imageTrack.clips[0] as { start: number }).start).toBe(0);
    expect((imageTrack.clips[1] as { start: number }).start).toBe(5.5);
    const cta = textTrack.clips[3] as { asset: { text: string; font: { size: number } } };
    expect(cta.asset.text).toBe("Book a visit");
    expect(cta.asset.font.size).toBe(52);
    expect(hashShotstackRequest(built.payload)).toHaveLength(64);
  });

  it("rejects missing media URLs and unsupported music/stock packets", () => {
    const packet = loadShotstackWorkPacketV1(repoRoot);
    const built = buildShotstackEditPayload(packet, new Map());
    expect(built.ok).toBe(false);
    const bad = {
      ...packet,
      musicAllowed: true as unknown as false,
    };
    expect(validateShotstackWorkPacket(bad).ok).toBe(false);
  });

  it("maps provider statuses and isolates secrets", () => {
    expect(mapProviderStatus("queued")).toBe("queued");
    expect(mapProviderStatus("done")).toBe("done");
    expect(mapProviderStatus("failed")).toBe("failed");
    const redacted = redactSecretsForEvidence({
      apiKey: "super-secret-key-value-1234567890",
      note: "ok",
    });
    expect(String(redacted.apiKey)).toBe("[redacted]");
    expect(DEFAULT_SUBMIT_RETRY.maxAttempts).toBeLessThanOrEqual(3);
  });

  it("surfaces credentials_absent without inventing a key", async () => {
    const prev = process.env.SHOTSTACK_API_KEY;
    delete process.env.SHOTSTACK_API_KEY;
    expect(readShotstackApiKey()).toBeUndefined();
    expect(shotstackCredentialPresence().configured).toBe(false);
    const submit = await shotstackSubmitRender({
      timeline: { tracks: [] },
      output: { format: "mp4", size: { width: 1080, height: 1920 }, fps: 25 },
    });
    expect(submit.ok).toBe(false);
    if (!submit.ok) expect(submit.code).toBe("credentials_absent");
    if (prev !== undefined) process.env.SHOTSTACK_API_KEY = prev;
  });

  it("parses submit/poll/download with mocked fetch", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.endsWith("/render") && init?.method === "POST") {
        expect(String((init.headers as Record<string, string>)["x-api-key"])).toBe(
          "test-key",
        );
        return new Response(
          JSON.stringify({ success: true, response: { id: "rend-1", status: "queued" } }),
          { status: 200 },
        );
      }
      if (url.includes("/render/rend-1")) {
        return new Response(
          JSON.stringify({
            response: {
              status: "done",
              url: "https://cdn.example.test/out.mp4",
              data: { credits: 0.5 },
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("cdn.example.test/out.mp4")) {
        return new Response(fakeMp4Bytes(), {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });
      }
      return new Response("nope", { status: 404 });
    };

    const submit = await shotstackSubmitRender(
      {
        timeline: { tracks: [] },
        output: { format: "mp4", size: { width: 1080, height: 1920 }, fps: 25 },
      },
      { apiKey: "test-key", fetchImpl },
    );
    expect(submit.ok).toBe(true);
    if (!submit.ok) return;

    const poll = await shotstackGetRender("rend-1", { apiKey: "test-key", fetchImpl });
    expect(poll.ok).toBe(true);
    if (!poll.ok) return;
    expect(poll.status).toBe("done");
    expect(poll.outputUrl).toContain("out.mp4");

    const dl = await shotstackDownloadMp4(poll.outputUrl!, { fetchImpl });
    expect(dl.ok).toBe(true);
    expect(calls.some((c) => c.includes("x-api-key"))).toBe(false);
  });

  it("parses failure responses without readiness escalation", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ message: "bad edit" }), { status: 400 });
    const submit = await shotstackSubmitRender(
      {
        timeline: { tracks: [] },
        output: { format: "mp4", size: { width: 1080, height: 1920 }, fps: 25 },
      },
      { apiKey: "test-key", fetchImpl, retry: { maxAttempts: 1, baseDelayMs: 1 } },
    );
    expect(submit.ok).toBe(false);
    if (!submit.ok) expect(submit.code).toBe("invalid_request");
    expect(OWNER_SETUP_INSTRUCTIONS.doNotPasteKeyIntoChat).toBe(true);
  });

  it("runs mocked pipeline end-to-end without escalating customer ready", async () => {
    const base = loadShotstackWorkPacketV1(repoRoot);
    // Isolate mock writes outside durable Kitchen evidence trees.
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "kitchen-video-int-mock-"));
    const exportAbs = path.join(tmpDir, "mock-pipeline-not-a-deliverable.mp4");
    const exportRelativePath = path
      .relative(repoRoot, exportAbs)
      .split(path.sep)
      .join("/");
    const expectedJobAbs = path.join(tmpDir, "render-job-mock-rend.json");
    const packet = {
      ...base,
      exportRelativePath,
      workPacketVersion: "wp-mock-test",
    };
    const urls = new Map<string, string>();
    const hashes: Record<string, string> = {};
    for (const scene of packet.scenes) {
      urls.set(scene.relativePath, `https://example.test/${scene.assetId}.png`);
      hashes[scene.relativePath] = createHash("sha256")
        .update(scene.assetId)
        .digest("hex");
    }
    urls.set(packet.voiceArtifact.relativePath, "https://example.test/voice.mp3");
    hashes[packet.voiceArtifact.relativePath] = packet.voiceArtifact.contentSha256;

    let phase: "submit" | "poll" | "download" = "submit";
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/render") && init?.method === "POST") {
        phase = "poll";
        return new Response(
          JSON.stringify({ response: { id: "mock-rend", status: "queued" } }),
          { status: 200 },
        );
      }
      if (url.includes("/render/mock-rend")) {
        phase = "download";
        return new Response(
          JSON.stringify({
            response: {
              status: "done",
              url: "https://cdn.example.test/mock.mp4",
              completed: "2026-08-09T16:00:00.000Z",
              data: { credits: 0.38 },
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("mock.mp4")) {
        // Intentionally return bytes that will fail ffprobe bind —
        // assert pipeline reaches download; bind may fail without real mp4.
        return new Response(fakeMp4Bytes(2048), {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });
      }
      return new Response("no", { status: 404 });
    };

    try {
      const result = await runShotstackWorkPacketPipeline({
        repoRoot,
        packet,
        apiKey: "test-key",
        fetchImpl,
        assetUrlsOverride: urls,
        sourceHashesOverride: hashes,
        pollMaxAttempts: 2,
        pollDelayMs: 1,
        sleepFn: async () => undefined,
      });

      // Fake MP4 will not pass ffprobe — BIND_FAILED is acceptable for mocked bytes.
      // Path also contains not-a-deliverable, which refuses persist before probe.
      expect(["SHOTSTACK_INTEGRATION_STEP_OK", "BIND_FAILED"]).toContain(
        result.ok ? result.verdict : result.verdict,
      );
      if (!result.ok) {
        expect(result.verdict).toBe("BIND_FAILED");
      } else {
        expect(result.artifact.customerReady).toBe(false);
        expect(result.artifact.certified).toBe(false);
        expect(result.artifact.qaPass).toBe(false);
        expect(result.artifact.qaState).toBe("qa_ready");
      }
      expect(phase).toBe("download");
      // Mock render record must exist while the pipeline still needs it for evidence.
      expect(existsSync(expectedJobAbs)).toBe(true);
      expect(listDurableMockLeakPaths()).toEqual([]);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    expect(existsSync(expectedJobAbs)).toBe(false);
    expect(existsSync(DURABLE_TEST_FIXTURES)).toBe(false);
    expect(listDurableMockLeakPaths()).toEqual([]);
  });

  it("leaves no durable Kitchen mock fixtures after the mocked pipeline", () => {
    expect(existsSync(DURABLE_TEST_FIXTURES)).toBe(false);
    expect(listDurableMockLeakPaths()).toEqual([]);
  });

  it("applies motion to the background photograph only", () => {
    const packet = loadShotstackWorkPacketV1(repoRoot);
    const overlayPacket = {
      ...packet,
      primaryCtaText: undefined,
      scenes: packet.scenes.map((scene, idx) => ({
        ...scene,
        captionPresentation: "embedded_in_plate" as const,
        overlayRelativePath: `overlay-${idx + 1}.png`,
        motionEffect: "zoomIn" as const,
        backgroundScale: 1.12,
      })),
    };
    const urls = new Map<string, string>();
    for (const scene of overlayPacket.scenes) {
      urls.set(scene.relativePath, `https://example.test/${scene.assetId}.png`);
      urls.set(
        scene.overlayRelativePath!,
        `https://example.test/overlay-${scene.assetId}.png`,
      );
    }
    urls.set(packet.voiceArtifact.relativePath, "https://example.test/voice.mp3");
    const built = buildShotstackEditPayload(overlayPacket, urls);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const overlayTrack = built.payload.timeline.tracks[0]!;
    const photoTrack = built.payload.timeline.tracks.at(-1)!;
    expect(overlayTrack.clips).toHaveLength(4);
    expect(photoTrack.clips).toHaveLength(4);
    for (const clip of overlayTrack.clips) {
      expect(clip).not.toHaveProperty("effect");
      expect(clip.scale).toBe(1);
    }
    for (const clip of photoTrack.clips) {
      expect(clip.effect).toBe("zoomIn");
      expect(clip.scale).toBe(1.12);
    }
  });
});
