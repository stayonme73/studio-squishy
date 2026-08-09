/**
 * LIVE internal generation — run only with LIVE_VOICE_INTERNAL_TEST=1 and ELEVENLABS_API_KEY.
 * Never prints API key material.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  generateVoiceArtifact,
  resolveApprovedVoiceConfiguration,
} from "./index";
import { verifyMp3BytesPlayable } from "./mp3-playability";

const LIVE = process.env.LIVE_VOICE_INTERNAL_TEST === "1";
const repoRoot = process.cwd();

const LIVE_SCRIPT = [
  "INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE.",
  "Welcome to Maple Harbor Outfitters.",
  "Our spring tune-up is forty-nine dollars through April twelfth, twenty twenty-six.",
  "Call five five five, zero one four, two eight six seven,",
  "or visit mapleharbor-outfitters.example.",
  "Ask for the Quinoa Care Package if you need the pronunciation check.",
].join(" ");

const SCRIPT_VERSION_ID = "voice-int-live-script-v1";
const CAMPAIGN_ID = "voice-int-live-fixture";
const SKU = "ap-001" as const;

const REPORT_PATH =
  "docs/launch/kitchen-voice-integration-1/LIVE-INTERNAL-GENERATION.md";

describe.skipIf(!LIVE)("KITCHEN-VOICE-INTEGRATION-1 live internal generation", () => {
  it("generates one real MP3 via ElevenLabs and binds the artifact", async () => {
    expect(Boolean(process.env.ELEVENLABS_API_KEY?.trim())).toBe(true);

    const voice = resolveApprovedVoiceConfiguration();
    const result = await generateVoiceArtifact({
      campaignId: CAMPAIGN_ID,
      skuId: SKU,
      approvedScript: LIVE_SCRIPT,
      scriptVersionId: SCRIPT_VERSION_ID,
      outputFormat: "mp3",
      repoRoot,
      internalTest: true,
    });

    if (!result.ok) {
      throw new Error(`Live generation failed: ${result.code} — ${result.message}`);
    }
    expect(result.ok).toBe(true);

    expect(result.qaPassed).toBe(false);
    expect(result.customerReady).toBe(false);
    expect(result.kitchenState).toBe("qa_ready");
    expect(result.provider).toBe("elevenlabs");
    expect(result.artifact.extension).toBe("mp3");
    expect(result.artifact.scriptVersionId).toBe(SCRIPT_VERSION_ID);
    expect(result.artifact.skuId).toBe(SKU);
    expect(result.artifact.campaignId).toBe(CAMPAIGN_ID);
    expect(result.artifact.label).toBe(
      "INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE",
    );

    const bytes = readFileSync(result.artifact.absolutePath);
    expect(bytes.byteLength).toBe(result.artifact.byteLength);
    expect(result.artifact.contentSha256).toHaveLength(64);

    // Hash must represent the exact persisted file.
    const { createHash } = await import("crypto");
    const diskHash = createHash("sha256").update(bytes).digest("hex");
    expect(diskHash).toBe(result.artifact.contentSha256);

    const playability = verifyMp3BytesPlayable(bytes);
    expect(playability.ok).toBe(true);

    const safeReport = [
      "# KITCHEN-VOICE-INTEGRATION-1 — Live Internal Generation",
      "",
      "**Label:** INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE",
      "**QA state:** QA READY (not QA pass)",
      "**Customer ready:** NO",
      "",
      "| Field | Value |",
      "|-------|-------|",
      `| Result | SUCCESS |`,
      `| Relative path | \`${result.artifact.relativePath}\` |`,
      `| Byte size | ${result.artifact.byteLength} |`,
      `| SHA-256 | \`${result.artifact.contentSha256}\` |`,
      `| Provider | elevenlabs |`,
      `| Model | \`${result.evidence.providerModelId}\` |`,
      `| Voice ID | \`${result.evidence.providerVoiceId}\` |`,
      `| Provider output format | \`${result.evidence.providerOutputFormat}\` |`,
      `| scriptVersionId | \`${SCRIPT_VERSION_ID}\` |`,
      `| SKU | \`${SKU}\` |`,
      `| Campaign fixture | \`${CAMPAIGN_ID}\` |`,
      `| Kitchen / generation state | \`${result.kitchenState}\` |`,
      `| QA passed | false |`,
      `| Playability | ${playability.ok ? "PASS (MPEG framing verified)" : "FAIL"} |`,
      `| Playability notes | ${playability.notes} |`,
      `| Voice config source | \`${voice.source}\` |`,
      "",
      "## Script (synthetic)",
      "",
      "```",
      LIVE_SCRIPT,
      "```",
      "",
      "Secrets are not recorded in this file.",
      "",
    ].join("\n");

    const absReport = path.join(repoRoot, REPORT_PATH);
    mkdirSync(path.dirname(absReport), { recursive: true });
    writeFileSync(absReport, safeReport, "utf8");
    expect(existsSync(absReport)).toBe(true);

    // Final secret hygiene on serialized result
    expect(JSON.stringify(result)).not.toMatch(/xi-api-key/i);
    const key = process.env.ELEVENLABS_API_KEY!.trim();
    expect(JSON.stringify(result)).not.toContain(key);
  }, 120_000);
});
