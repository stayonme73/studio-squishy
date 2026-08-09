import { existsSync, readFileSync } from "fs";
import path from "path";

import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { applyQaFail, applyQaPass } from "@/lib/campaign-tasks/actions";
import { requiredChecksForPhase } from "@/lib/campaign-tasks/qa-checklists";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  ownerEscalationForRoutineOperationalEvent,
  projectKitchenCommsLedger,
} from "@/lib/studio-kitchen-comms";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import {
  VOICE_PRODUCTION_CHAIN,
  VOICE_PRODUCTION_SKUS,
  VOICE_SCRIPT_WORD_LIMIT,
  defaultVoiceAudioBrief,
  evaluateAudioQuality,
  gateAudioQualityForQaPass,
  isVoiceProductionSku,
  projectVoiceKitchenStates,
  registerBoundAudioArtifact,
  requiresAudioQualityGate,
  resolveClaimableVoiceKitchenLabels,
  sha256AudioFileRelative,
  summarizeVoiceAudioInventory,
  voiceSkuContractTruth,
} from "./index";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

const now = "2026-08-09T18:00:00.000Z";
const repoRoot = process.cwd();
const BINDING_FIXTURE_REL =
  "docs/launch/kitchen-voice-production-1/artifacts/binding-fixture-not-a-deliverable.bin.mp3";

const qaStaff: StudioUser = {
  id: "staff-voice-qa",
  email: "voice-qa@local.dev",
  displayName: "Voice QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-voice-qa": ["voice-prod-1"] },
  staffCapabilities: { "staff-voice-qa": ["qa"] },
};

const campaign: CampaignRecord = {
  campaignId: "voice-prod-1",
  campaignName: "KITCHEN-VOICE-PRODUCTION-1 FIXTURE",
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "PRODUCTION PATH FIXTURE / INTERNAL TEST — NOT CERTIFIED",
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
    lineItems: [
      {
        skuId: "ap-001",
        serviceName: "AI Voice Over Production",
        billingType: "one_time",
        exactPriceCents: 17500,
        priceDisplay: "$175",
        deliverables: [],
        exclusions: [],
        timingWindowLabel: "quick",
        revisionRule: "One revision round",
        clientResponsibilities: [],
        executionResponsibility: "studio",
      },
    ],
    approvedAt: now,
  },
  projectDetailsSubmittedAt: now,
  paymentReceivedAt: now,
};

function voiceTask(skuId: "ap-001" | "v2-rtu-voice"): CampaignTaskItem {
  return {
    id: `${skuId}:creative`,
    title: `Voice — Creative`,
    phase: "creative",
    status: "ready_for_qa",
    relatedServiceIds: [skuId],
    familyId: "video_audio",
    catalogFamilyId: "ai_voice_over",
    serviceName: "AI Voice",
    dependsOn: [],
    workflowState: "ready_for_qa",
    responsibleRole: "creative_production",
  };
}

function envelope(tasks: CampaignTaskItem[]): ServerTasksEnvelope {
  return {
    campaignId: campaign.campaignId,
    tasks,
    handoffs: [],
    qaRecords: [],
    updatedAt: now,
  };
}

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i + 1}`).join(" ");
}

const listeningNotesWithHash = (hash: string) =>
  `Listened to bound file sha256=${hash}. Script fidelity, pronunciation, pacing, intelligibility, and clipping/silence reviewed against this exact artifact.`;

describe("KITCHEN-VOICE-PRODUCTION-1", () => {
  it("resolves active voice SKUs with contract_ready_integration_required", () => {
    for (const sku of VOICE_PRODUCTION_SKUS) {
      expect(isVoiceProductionSku(sku)).toBe(true);
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") return;
      expect(resolved.contract.readiness).toBe("contract_ready_integration_required");
      expect(resolved.contract.primaryTool.toolId).toBe("ai_voice_tool");
      expect(resolved.contract.primaryTool.integrationState).toBe("partial_adapter");
      const truth = voiceSkuContractTruth(sku);
      expect(truth.scriptWordLimit).toBe(VOICE_SCRIPT_WORD_LIMIT);
      expect(truth.promisedFormats).toEqual(["mp3", "wav"]);
      expect(truth.primaryToolIntegrationState).toBe("partial_adapter");
    }
  });

  it("inventories audio capability honestly — adapter wired, live key may be absent", () => {
    const summary = summarizeVoiceAudioInventory();
    expect(summary.studioVoiceUntouched).toBe(true);
    expect(summary.provider).toBe("elevenlabs");
    const browser = summary.findings.find((f) => f.id === "browser_speech_synthesis");
    expect(browser?.classification).toBe("present_but_not_exportable");
    const vendor = summary.findings.find((f) => f.id === "elevenlabs_tts_api");
    expect(vendor?.classification).toBe("integration_required");
    const contract = summary.findings.find((f) => f.id === "ai_voice_tool_contract");
    expect(contract?.classification).toBe("integration_required");
  });

  it("enforces script word limit", () => {
    const brief = defaultVoiceAudioBrief("ap-001");
    const over = evaluateAudioQuality({
      brief,
      submission: {
        scriptText: words(301),
        scriptVersionId: "script-v1",
        claimsStudioGeneratedAudio: false,
        artifacts: [],
      },
    });
    expect(over.ok).toBe(false);
    expect(over.findings.some((f) => f.checkKind === "script_limit")).toBe(true);
  });

  it("does not claim an audio file exists when none exists", () => {
    const evaln = evaluateAudioQuality({
      brief: {
        ...defaultVoiceAudioBrief("ap-001"),
        generationCapability: "manual_operational_authorized",
      },
      submission: {
        scriptText: words(40),
        scriptVersionId: "script-v1",
        claimsStudioGeneratedAudio: false,
        artifacts: [
          {
            id: "missing",
            relativePath: "docs/launch/kitchen-voice-production-1/artifacts/does-not-exist.mp3",
            extension: "mp3",
            scriptVersionId: "script-v1",
            contentSha256: "deadbeef",
          },
        ],
      },
    });
    expect(evaln.ok).toBe(false);
    expect(evaln.findings.some((f) => f.checkKind === "phantom_file")).toBe(true);
  });

  it("binds real on-disk bytes to path + hash + script version", () => {
    expect(existsSync(path.join(repoRoot, BINDING_FIXTURE_REL))).toBe(true);
    const registered = registerBoundAudioArtifact({
      repoRoot,
      id: "binding-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-v1",
      extension: "mp3",
    });
    expect("error" in registered).toBe(false);
    if ("error" in registered) return;
    expect(registered.contentSha256).toBe(sha256AudioFileRelative(repoRoot, BINDING_FIXTURE_REL));
    expect(registered.scriptVersionId).toBe("script-v1");

    const mismatch = evaluateAudioQuality({
      brief: {
        ...defaultVoiceAudioBrief("ap-001"),
        generationCapability: "manual_operational_authorized",
        artifactRepoRoot: repoRoot,
      },
      submission: {
        scriptText: words(40),
        scriptVersionId: "script-v1",
        claimsStudioGeneratedAudio: false,
        artifacts: [{ ...registered, contentSha256: "0".repeat(64) }],
      },
    });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.findings.some((f) => f.id.startsWith("hash_mismatch_"))).toBe(true);
  });

  it("fails missing production capability honestly (integration_required)", () => {
    const registered = registerBoundAudioArtifact({
      repoRoot,
      id: "binding-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-v1",
      extension: "mp3",
    });
    if ("error" in registered) throw new Error(registered.error);
    const hash = registered.contentSha256!;
    const gated = gateAudioQualityForQaPass({
      brief: defaultVoiceAudioBrief("ap-001"),
      submission: {
        scriptText: words(40),
        scriptVersionId: "script-v1",
        claimsStudioGeneratedAudio: true,
        artifacts: [registered],
      },
      attestations: {
        scriptFidelityReviewed: true,
        pronunciationReviewed: true,
        pacingNaturalnessReviewed: true,
        intelligibilityReviewed: true,
        artifactsClippingSilenceReviewed: true,
        listeningMatchesBoundArtifact: true,
        notes: listeningNotesWithHash(hash),
      },
    });
    expect(gated.ok).toBe(false);
    if (gated.ok) return;
    expect(gated.findings.some((f) => f.checkKind === "generation_capability")).toBe(true);
  });

  it("blocks qa_pass without audioQuality payload on voice SKUs", () => {
    const task = voiceTask("ap-001");
    expect(requiresAudioQualityGate(task)).toBe(true);
    const result = applyQaPass(
      envelope([task]),
      {
        action: "qa_pass",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("creative")],
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/audioQuality/i);
  });

  it("blocks qa_pass when capability is unwired even with bound fixture + attestations", () => {
    const task = voiceTask("v2-rtu-voice");
    const registered = registerBoundAudioArtifact({
      repoRoot,
      id: "binding-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-v1",
      extension: "mp3",
    });
    if ("error" in registered) throw new Error(registered.error);
    const result = applyQaPass(
      envelope([task]),
      {
        action: "qa_pass",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("creative")],
        audioQuality: {
          brief: defaultVoiceAudioBrief("v2-rtu-voice"),
          submission: {
            scriptText: words(40),
            scriptVersionId: "script-v1",
            claimsStudioGeneratedAudio: true,
            artifacts: [registered],
          },
          attestations: {
            scriptFidelityReviewed: true,
            pronunciationReviewed: true,
            pacingNaturalnessReviewed: true,
            intelligibilityReviewed: true,
            artifactsClippingSilenceReviewed: true,
            listeningMatchesBoundArtifact: true,
            notes: listeningNotesWithHash(registered.contentSha256!),
          },
        },
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(result.ok).toBe(false);
  });

  it("keeps routine audio correction on Producer → QA path (owner_not_required)", () => {
    const task = voiceTask("ap-001");
    const fail = applyQaFail(
      envelope([task]),
      {
        action: "qa_fail",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        notes: "Pronunciation of Harbor & Oak incorrect; regenerate pacing on CTA.",
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(fail.ok).toBe(true);
    if (!fail.ok) return;
    expect(fail.envelope.tasks[0]?.workflowState).toBe("needs_revision");
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");

    const ledger = projectKitchenCommsLedger({
      campaignId: campaign.campaignId,
      tasksEnvelope: fail.envelope,
    });
    expect(
      [...ledger.active, ...ledger.history]
        .filter((e) => e.category === "qa")
        .every((e) => e.ownerEscalation === "owner_not_required"),
    ).toBe(true);

    const apContract = resolveServiceProductionContract("ap-001");
    expect(apContract.status).toBe("resolved");
    if (apContract.status !== "resolved") return;
    expect(apContract.contract.escalation.producerHandles.join(" ")).toMatch(/audio/i);
  });

  it("read-only kitchen projection invents no fake audio artifact", () => {
    const snap = projectVoiceKitchenStates("ap-001");
    expect(snap.canRepresentAudioArtifactProduced).toBe(false);
    expect(snap.generationIntegrated).toBe(true);
    expect(snap.adapterWired).toBe(true);
    expect(snap.customerReady).toBe(false);
    if (!snap.credentialsPresent) {
      expect(snap.blockedStepIds).toContain("voice_generation");
      expect(snap.blockedStepIds).toContain("export");
    }

    const claimable = resolveClaimableVoiceKitchenLabels({
      skuId: "ap-001",
      hasApprovedScript: true,
      hasBoundAudioArtifact: false,
      audioQaPassed: false,
    });
    expect(claimable.inventedArtifact).toBe(false);
    expect(claimable.customerReady).toBe(false);
    expect(claimable.claimable).toContain("script ready");
    expect(claimable.blocked).toContain("audio generated");
    expect(claimable.blocked).toContain("generation pending");

    const ledger = projectKitchenCommsLedger({
      campaignId: campaign.campaignId,
      tasksEnvelope: envelope([voiceTask("ap-001")]),
    });
    const blob = JSON.stringify(ledger);
    expect(blob).not.toMatch(/\.mp3|\.wav|contentSha256/i);
  });

  it("defines production chain roles without inventing new roles", () => {
    const roles = new Set(VOICE_PRODUCTION_CHAIN.map((s) => s.ownerRole));
    for (const role of roles) {
      expect([
        "copy",
        "creative_production",
        "qa",
        "producer_dispatcher",
        "system",
      ]).toContain(role);
    }
  });

  it("does not certify untested services and leaves Studio Voice files present", () => {
    // No CUSTOMER READY certification emitted by this package.
    for (const sku of VOICE_PRODUCTION_SKUS) {
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") return;
      expect(resolved.contract.readiness).toBe("contract_ready_integration_required");
    }

    // Studio Voice browser path still exists and is classified separately.
    for (const p of [
      "src/lib/studio-conversation-speech.ts",
      "src/config/studio-browser-voice-v1.ts",
    ]) {
      expect(existsSync(path.join(repoRoot, p))).toBe(true);
      const src = readFileSync(path.join(repoRoot, p), "utf8");
      expect(src.length).toBeGreaterThan(0);
    }
  });

  it("allows binding machinery when capability is explicitly authorized (unit only — not certification)", () => {
    const registered = registerBoundAudioArtifact({
      repoRoot,
      id: "binding-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-v1",
      extension: "mp3",
    });
    if ("error" in registered) throw new Error(registered.error);
    const gated = gateAudioQualityForQaPass({
      brief: {
        ...defaultVoiceAudioBrief("ap-001"),
        generationCapability: "manual_operational_authorized",
        artifactRepoRoot: repoRoot,
      },
      submission: {
        scriptText: words(40),
        scriptVersionId: "script-v1",
        claimsStudioGeneratedAudio: false,
        artifacts: [registered],
      },
      attestations: {
        scriptFidelityReviewed: true,
        pronunciationReviewed: true,
        pacingNaturalnessReviewed: true,
        intelligibilityReviewed: true,
        artifactsClippingSilenceReviewed: true,
        listeningMatchesBoundArtifact: true,
        notes: listeningNotesWithHash(registered.contentSha256!),
      },
    });
    expect(gated.ok).toBe(true);
  });
});
