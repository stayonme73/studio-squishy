/**
 * LIVE certification generation — LIVE_VOICE_CERT_TEST=1 + ELEVENLABS_API_KEY.
 * Does NOT claim Owner listening approval or CUSTOMER READY.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  generateVoiceArtifact,
  resolveApprovedVoiceConfiguration,
} from "@/lib/studio-kitchen-production/voice-production";
import { verifyMp3BytesPlayable } from "@/lib/studio-kitchen-production/voice-production/mp3-playability";

import type { CertVoiceBoundArtifact } from "./artifact-registry";
import { CERT_VOICE_BINDING_MANIFEST_REL } from "./artifact-registry";
import {
  CERT_VOICE_ARTIFACT_ROOT,
  CERT_VOICE_CAMPAIGN_ID,
  CERT_VOICE_FIXTURE_LABEL,
  CERT_VOICE_GENERATION_SCRIPT,
  CERT_VOICE_PROVIDER,
  CERT_VOICE_SCRIPT_VERSION_ID,
  countScriptWords,
} from "./fixtures";

const LIVE = process.env.LIVE_VOICE_CERT_TEST === "1";
const repoRoot = process.cwd();

describe.skipIf(!LIVE)("KITCHEN-PRODUCTION-CERT-VOICE-1 live generation", () => {
  it("generates certification MP3 bound to scriptVersionId and stops at QA READY", async () => {
    expect(Boolean(process.env.ELEVENLABS_API_KEY?.trim())).toBe(true);
    expect(countScriptWords(CERT_VOICE_GENERATION_SCRIPT)).toBeLessThanOrEqual(300);

    const voice = resolveApprovedVoiceConfiguration();
    expect(voice.voiceId).toBe(CERT_VOICE_PROVIDER.voiceId);
    expect(voice.modelId).toBe(CERT_VOICE_PROVIDER.modelId);

    const result = await generateVoiceArtifact({
      campaignId: CERT_VOICE_CAMPAIGN_ID,
      skuId: "ap-001",
      approvedScript: CERT_VOICE_GENERATION_SCRIPT,
      scriptVersionId: CERT_VOICE_SCRIPT_VERSION_ID,
      outputFormat: "mp3",
      repoRoot,
      certificationFixture: true,
      artifactRoot: CERT_VOICE_ARTIFACT_ROOT,
      voiceConfiguration: {
        provider: "elevenlabs",
        voiceId: CERT_VOICE_PROVIDER.voiceId,
        modelId: CERT_VOICE_PROVIDER.modelId,
        source: "default_candidate",
      },
    });

    if (!result.ok) {
      throw new Error(`Cert live generation failed: ${result.code} — ${result.message}`);
    }

    expect(result.qaPassed).toBe(false);
    expect(result.customerReady).toBe(false);
    expect(result.kitchenState).toBe("qa_ready");
    expect(result.artifact.label).toBe(CERT_VOICE_FIXTURE_LABEL);
    expect(result.artifact.scriptVersionId).toBe(CERT_VOICE_SCRIPT_VERSION_ID);
    expect(result.artifact.campaignId).toBe(CERT_VOICE_CAMPAIGN_ID);
    expect(result.evidence.providerOutputFormat).toBe("mp3_44100_128");

    const bytes = readFileSync(result.artifact.absolutePath);
    const diskHash = createHash("sha256").update(bytes).digest("hex");
    expect(diskHash).toBe(result.artifact.contentSha256);
    expect(verifyMp3BytesPlayable(bytes).ok).toBe(true);

    const manifest: CertVoiceBoundArtifact = {
      id: "cert-voice-v1",
      relativePath: result.artifact.relativePath,
      contentSha256: result.artifact.contentSha256,
      byteLength: result.artifact.byteLength,
      extension: "mp3",
      scriptVersionId: CERT_VOICE_SCRIPT_VERSION_ID,
      campaignId: CERT_VOICE_CAMPAIGN_ID,
      skuId: "ap-001",
      provider: "elevenlabs",
      providerModelId: result.evidence.providerModelId,
      providerVoiceId: result.evidence.providerVoiceId,
      providerOutputFormat: "mp3_44100_128",
      generatedAt: result.artifact.generatedAt,
      label: CERT_VOICE_FIXTURE_LABEL,
      qaState: "qa_ready",
      ownerListeningApproval: "pending",
    };

    const manifestAbs = path.join(repoRoot, CERT_VOICE_BINDING_MANIFEST_REL);
    mkdirSync(path.dirname(manifestAbs), { recursive: true });
    writeFileSync(manifestAbs, JSON.stringify(manifest, null, 2), "utf8");
    expect(existsSync(manifestAbs)).toBe(true);

    const key = process.env.ELEVENLABS_API_KEY!.trim();
    expect(JSON.stringify(result)).not.toContain(key);
    expect(JSON.stringify(manifest)).not.toContain(key);
  }, 180_000);
});
