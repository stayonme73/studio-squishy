import { existsSync, readFileSync, rmSync } from "fs";
import path from "path";

import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { applyQaFail } from "@/lib/campaign-tasks/actions";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  ownerEscalationForRoutineOperationalEvent,
  projectKitchenCommsLedger,
} from "@/lib/studio-kitchen-comms";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import {
  VOICE_PRODUCTION_SKUS,
  discoverElevenLabsAccountCapability,
  elevenLabsCredentialPresence,
  generateVoiceArtifact,
  redactSecretsForEvidence,
  resolveApprovedVoiceConfiguration,
  voiceSkuProductionProvider,
} from "./index";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

const repoRoot = process.cwd();
const now = "2026-08-09T20:00:00.000Z";

const SEALED_BINDING_FIXTURE =
  "docs/launch/kitchen-voice-production-1/artifacts/binding-fixture-not-a-deliverable.bin.mp3";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i + 1}`).join(" ");
}

/** Minimal fake MPEG frame header-ish bytes for mock audio — not a customer deliverable. */
function mockMp3Bytes(tag = "mock-elevenlabs-audio"): Buffer {
  return Buffer.from(`ID3${tag}-${"x".repeat(64)}`);
}

function mockFetchOkAudio(bytes: Buffer = mockMp3Bytes()): typeof fetch {
  return vi.fn(async () => {
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "request-id": "req_test_internal_only",
      },
    });
  }) as unknown as typeof fetch;
}

function mockFetchUserAndVoices(tier: string): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/v1/user")) {
      return new Response(JSON.stringify({ subscription: { tier } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/v1/voices")) {
      return new Response(JSON.stringify({ voices: [{ voice_id: "v1" }, { voice_id: "v2" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(mockMp3Bytes(), {
      status: 200,
      headers: { "content-type": "audio/mpeg", "request-id": "req_live_mock" },
    });
  }) as unknown as typeof fetch;
}

describe("KITCHEN-VOICE-INTEGRATION-1", () => {
  it("resolves ap-001 and v2-rtu-voice to ElevenLabs production path", () => {
    for (const sku of VOICE_PRODUCTION_SKUS) {
      const pathInfo = voiceSkuProductionProvider(sku);
      expect(pathInfo).toEqual({
        skuId: sku,
        provider: "elevenlabs",
        api: "text-to-speech",
        toolId: "ai_voice_tool",
        customerReady: false,
      });
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") return;
      expect(resolved.contract.readiness).toBe("contract_ready_integration_required");
      expect(resolved.contract.primaryTool.integrationState).toBe("partial_adapter");
      expect(resolved.contract.primaryTool.note).toMatch(/ElevenLabs/i);
      expect(resolved.contract.readinessNotes).toMatch(/NOT CUSTOMER READY/i);
    }
  });

  it("rejects scripts over 300 words", async () => {
    const result = await generateVoiceArtifact({
      campaignId: "voice-int-1",
      skuId: "ap-001",
      approvedScript: words(301),
      scriptVersionId: "script-v1",
      outputFormat: "mp3",
      env: { ELEVENLABS_API_KEY: "test-key-not-real" },
      fetchImpl: mockFetchOkAudio(),
      repoRoot,
      internalTest: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("script_invalid");
    expect(result.qaPassed).toBe(false);
    expect(result.customerReady).toBe(false);
  });

  it("rejects missing scriptVersionId", async () => {
    const result = await generateVoiceArtifact({
      campaignId: "voice-int-1",
      skuId: "ap-001",
      approvedScript: words(20),
      scriptVersionId: "   ",
      outputFormat: "mp3",
      env: { ELEVENLABS_API_KEY: "test-key-not-real" },
      fetchImpl: mockFetchOkAudio(),
      repoRoot,
      internalTest: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("script_version_missing");
  });

  it("fails honestly when credentials are absent", async () => {
    const presence = elevenLabsCredentialPresence({} as NodeJS.ProcessEnv);
    expect(presence.configured).toBe(false);
    expect(presence.envVarName).toBe("ELEVENLABS_API_KEY");

    const result = await generateVoiceArtifact({
      campaignId: "voice-int-1",
      skuId: "v2-rtu-voice",
      approvedScript: words(20),
      scriptVersionId: "script-v1",
      outputFormat: "mp3",
      env: {},
      repoRoot,
      internalTest: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("credentials_absent");
    expect(result.kitchenState).toBe("generation_failed");
    expect(JSON.stringify(result)).not.toMatch(/sk_|xi-api-key\s*[:=]\s*[a-z0-9]/i);
  });

  it("provider error cannot create fake success", async () => {
    const fetchFail = vi.fn(async () => new Response("upstream boom", { status: 500 })) as unknown as typeof fetch;
    const result = await generateVoiceArtifact({
      campaignId: "voice-int-1",
      skuId: "ap-001",
      approvedScript: words(20),
      scriptVersionId: "script-v1",
      outputFormat: "mp3",
      env: { ELEVENLABS_API_KEY: "test-key-not-real" },
      fetchImpl: fetchFail,
      capability: {
        discoveredAt: now,
        credentialsPresent: true,
        ttsAccessible: true,
        mp3Supported: true,
        wavSupported: "unknown",
        wavSupportNote: "n/a",
        subscriptionTier: "creator",
        commercialUseNote: "n/a",
        availableVoiceCount: 1,
        approvedVoiceId: "voice",
        approvedModelId: "model",
        catalogWavDiscrepancy: false,
        discoveryMode: "live",
      },
      repoRoot,
      internalTest: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("provider_network_failure");
  });

  it("empty audio cannot create an artifact", async () => {
    const fetchEmpty = vi.fn(async () => new Response(new Uint8Array(), { status: 200 })) as unknown as typeof fetch;
    const result = await generateVoiceArtifact({
      campaignId: "voice-int-1",
      skuId: "ap-001",
      approvedScript: words(20),
      scriptVersionId: "script-v1",
      outputFormat: "mp3",
      env: { ELEVENLABS_API_KEY: "test-key-not-real" },
      fetchImpl: fetchEmpty,
      capability: {
        discoveredAt: now,
        credentialsPresent: true,
        ttsAccessible: true,
        mp3Supported: true,
        wavSupported: true,
        wavSupportNote: "n/a",
        subscriptionTier: "pro",
        commercialUseNote: "n/a",
        availableVoiceCount: 1,
        approvedVoiceId: "voice",
        approvedModelId: "model",
        catalogWavDiscrepancy: false,
        discoveryMode: "live",
      },
      repoRoot,
      internalTest: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("empty_audio");
  });

  it("persists artifact with SHA-256 + scriptVersionId + job association; stops at QA-ready", async () => {
    const campaignId = "voice-int-mock-gen";
    const scriptVersionId = "script-v-mock-1";
    const bytes = mockMp3Bytes("bound-success");
    const result = await generateVoiceArtifact({
      campaignId,
      skuId: "ap-001",
      approvedScript: "Harbor and Oak welcomes you to scheduled service.",
      scriptVersionId,
      outputFormat: "mp3",
      env: { ELEVENLABS_API_KEY: "test-key-not-real", ELEVENLABS_VOICE_ID: "approved-voice-id" },
      fetchImpl: mockFetchOkAudio(bytes),
      capability: {
        discoveredAt: now,
        credentialsPresent: true,
        ttsAccessible: true,
        mp3Supported: true,
        wavSupported: false,
        wavSupportNote: "Creator tier — WAV blocked",
        subscriptionTier: "creator",
        commercialUseNote: "n/a",
        availableVoiceCount: 2,
        approvedVoiceId: "approved-voice-id",
        approvedModelId: "eleven_multilingual_v2",
        catalogWavDiscrepancy: true,
        discoveryMode: "live",
      },
      repoRoot,
      internalTest: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.qaPassed).toBe(false);
    expect(result.customerReady).toBe(false);
    expect(result.kitchenState).toBe("qa_ready");
    expect(result.provider).toBe("elevenlabs");
    expect(result.artifact.scriptVersionId).toBe(scriptVersionId);
    expect(result.artifact.campaignId).toBe(campaignId);
    expect(result.artifact.skuId).toBe("ap-001");
    expect(result.artifact.contentSha256).toHaveLength(64);
    expect(result.evidence.contentSha256).toBe(result.artifact.contentSha256);
    expect(existsSync(result.artifact.absolutePath)).toBe(true);
    expect(result.artifact.label).toBe("INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE");
    expect(JSON.stringify(result)).not.toMatch(/test-key-not-real/);

    // cleanup mock artifact
    rmSync(path.dirname(result.artifact.absolutePath), { recursive: true, force: true });
  });

  it("rejects unsupported WAV when account capability says unavailable", async () => {
    const result = await generateVoiceArtifact({
      campaignId: "voice-int-1",
      skuId: "ap-001",
      approvedScript: words(20),
      scriptVersionId: "script-v1",
      outputFormat: "wav",
      env: { ELEVENLABS_API_KEY: "test-key-not-real" },
      fetchImpl: mockFetchOkAudio(),
      capability: {
        discoveredAt: now,
        credentialsPresent: true,
        ttsAccessible: true,
        mp3Supported: true,
        wavSupported: false,
        wavSupportNote: "CONTRACT DISCREPANCY",
        subscriptionTier: "creator",
        commercialUseNote: "n/a",
        availableVoiceCount: 1,
        approvedVoiceId: "v",
        approvedModelId: "m",
        catalogWavDiscrepancy: true,
        discoveryMode: "live",
      },
      repoRoot,
      internalTest: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unsupported_output");
  });

  it("discovers WAV restriction from subscription tier without exposing secrets", async () => {
    const capability = await discoverElevenLabsAccountCapability({
      env: { ELEVENLABS_API_KEY: "test-key-not-real" } as NodeJS.ProcessEnv,
      fetchImpl: mockFetchUserAndVoices("creator"),
      now,
    });
    expect(capability.credentialsPresent).toBe(true);
    expect(capability.mp3Supported).toBe(true);
    expect(capability.wavSupported).toBe(false);
    expect(capability.catalogWavDiscrepancy).toBe(true);
    expect(JSON.stringify(capability)).not.toMatch(/test-key-not-real/);
  });

  it("credentials-absent discovery reports blocker without inventing MP3/WAV truth", async () => {
    const capability = await discoverElevenLabsAccountCapability({
      env: {} as NodeJS.ProcessEnv,
      now,
    });
    expect(capability.discoveryMode).toBe("credentials_absent");
    expect(capability.mp3Supported).toBe("unknown");
    expect(capability.wavSupported).toBe("unknown");
    expect(capability.blockingGap).toMatch(/ELEVENLABS_API_KEY/);
  });

  it("treats missing user_read as live_partial — MP3 may proceed, WAV unknown", async () => {
    const fetchMissingUserRead = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/v1/user")) {
        return new Response(
          JSON.stringify({
            detail: {
              status: "missing_permissions",
              message: "The API key you used is missing the permission user_read",
            },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as unknown as typeof fetch;

    const capability = await discoverElevenLabsAccountCapability({
      env: { ELEVENLABS_API_KEY: "test-key-not-real" } as NodeJS.ProcessEnv,
      fetchImpl: fetchMissingUserRead,
      now,
    });
    expect(capability.discoveryMode).toBe("live_partial");
    expect(capability.mp3Supported).toBe(true);
    expect(capability.wavSupported).toBe("unknown");
    expect(capability.catalogWavDiscrepancy).toBe(false);

    const gen = await generateVoiceArtifact({
      campaignId: "voice-int-partial",
      skuId: "ap-001",
      approvedScript: words(20),
      scriptVersionId: "script-partial-1",
      outputFormat: "mp3",
      env: { ELEVENLABS_API_KEY: "test-key-not-real" },
      fetchImpl: mockFetchOkAudio(),
      capability,
      repoRoot,
      internalTest: true,
    });
    expect(gen.ok).toBe(true);
    if (gen.ok) {
      rmSync(path.dirname(gen.artifact.absolutePath), { recursive: true, force: true });
    }
  });

  it("uses deterministic approved voice configuration — not customer cloning", () => {
    const cfg = resolveApprovedVoiceConfiguration({
      ELEVENLABS_VOICE_ID: "locked-voice-id",
      ELEVENLABS_MODEL_ID: "eleven_multilingual_v2",
    } as NodeJS.ProcessEnv);
    expect(cfg.provider).toBe("elevenlabs");
    expect(cfg.voiceId).toBe("locked-voice-id");
    expect(cfg.source).toBe("env");
  });

  it("redacts secret-like fields from evidence objects", () => {
    const redacted = redactSecretsForEvidence({
      provider: "elevenlabs",
      apiKey: "super-secret",
      xi_api_key: "also-secret",
      voiceId: "safe-id",
    });
    expect(redacted.apiKey).toBe("[redacted]");
    expect(redacted.xi_api_key).toBe("[redacted]");
    expect(redacted.voiceId).toBe("safe-id");
  });

  it("routine generation correction remains owner_not_required", () => {
    const qaStaff: StudioUser = {
      id: "staff-voice-int-qa",
      email: "voice-int-qa@local.dev",
      displayName: "Voice Int QA",
      roles: ["staff"],
    };
    const assignments: CampaignAssignmentsFile = {
      staffByUserId: { "staff-voice-int-qa": ["voice-int-1"] },
      staffCapabilities: { "staff-voice-int-qa": ["qa"] },
    };
    const campaign: CampaignRecord = {
      campaignId: "voice-int-1",
      campaignName: "KITCHEN-VOICE-INTEGRATION-1",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "INTERNAL PRODUCTION TEST",
      estimatedCompletion: "Soon",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      approvedStudioPlan: {
        selectedServiceIds: ["ap-001"],
        includedServiceIds: ["ap-001"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 17500,
        monthlyTotalCents: 0,
        amountDueTodayCents: 17500,
        lineItems: [],
        approvedAt: now,
      },
      projectDetailsSubmittedAt: now,
      paymentReceivedAt: now,
    };
    const task: CampaignTaskItem = {
      id: "ap-001:creative",
      title: "Voice — Creative",
      phase: "creative",
      status: "ready_for_qa",
      relatedServiceIds: ["ap-001"],
      familyId: "video_audio",
      catalogFamilyId: "ai_voice_over",
      serviceName: "AI Voice",
      dependsOn: [],
      workflowState: "ready_for_qa",
      responsibleRole: "creative_production",
    };
    const envelope: ServerTasksEnvelope = {
      campaignId: campaign.campaignId,
      tasks: [task],
      handoffs: [],
      qaRecords: [],
      updatedAt: now,
    };
    const fail = applyQaFail(
      envelope,
      {
        action: "qa_fail",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        notes: "Regenerate — pacing too fast on CTA.",
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(fail.ok).toBe(true);
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");
    const ledger = projectKitchenCommsLedger({
      campaignId: campaign.campaignId,
      tasksEnvelope: fail.ok ? fail.envelope : envelope,
    });
    expect(
      [...ledger.active, ...ledger.history]
        .filter((e) => e.category === "qa")
        .every((e) => e.ownerEscalation === "owner_not_required"),
    ).toBe(true);
  });

  it("sealed binding fixture remains non-deliverable; Studio Voice untouched", () => {
    expect(existsSync(path.join(repoRoot, SEALED_BINDING_FIXTURE))).toBe(true);
    const fixtureText = readFileSync(path.join(repoRoot, SEALED_BINDING_FIXTURE), "utf8");
    expect(fixtureText).toMatch(/NOT A CERTIFIED DELIVERABLE|BINDING FIXTURE/i);
    expect(SEALED_BINDING_FIXTURE).toMatch(/not-a-deliverable/);

    for (const p of [
      "src/lib/studio-conversation-speech.ts",
      "src/config/studio-browser-voice-v1.ts",
    ]) {
      expect(existsSync(path.join(repoRoot, p))).toBe(true);
    }
  });

  it("does not certify unrelated SKUs", () => {
    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    expect(flyer.status).toBe("resolved");
    if (flyer.status !== "resolved") return;
    expect(flyer.contract.primaryTool.toolId).not.toBe("ai_voice_tool");
    expect(voiceSkuProductionProvider("v2-rtu-flyer")).toBeNull();
  });
});
