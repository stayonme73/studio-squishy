import { createHash } from "crypto";
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
  defaultVoiceAudioBrief,
  evaluateAudioQuality,
  fullListeningPassAttestations,
  gateAudioQualityForQaPass,
  listeningNotesForHash,
  registerBoundAudioArtifact,
  validateAudioQualityAttestations,
} from "@/lib/studio-kitchen-production/voice-production";

import {
  CERT_VOICE_APPROVED_ARTIFACT,
  CERT_VOICE_APPROVED_SCRIPT,
  CERT_VOICE_ARTIFACT_ROOT,
  CERT_VOICE_BINDING_MANIFEST_REL,
  CERT_VOICE_CAMPAIGN_ID,
  CERT_VOICE_CUSTOMER_READY_STATUS,
  CERT_VOICE_FIXTURE_LABEL,
  CERT_VOICE_GENERATION_SCRIPT,
  CERT_VOICE_OWNER_LISTENING_APPROVAL,
  CERT_VOICE_PACKAGE_ID,
  CERT_VOICE_PRONUNCIATION_NOTES,
  CERT_VOICE_SCRIPT_VERSION_ID,
  CERT_VOICE_TESTED_SKUS,
  certVoiceScriptDiffSummary,
  countScriptWords,
  expectedCertVoiceDefaults,
  gateCertVoiceListeningApproval,
  ownerListeningPassAttestationsForCertifiedArtifact,
  readCertVoiceBindingManifest,
} from "./index";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

const repoRoot = process.cwd();
const now = "2026-08-09T22:00:00.000Z";
const INTEGRATION_FIXTURE =
  "docs/launch/kitchen-voice-integration-1/artifacts/voice-int-live-fixture/ap-001_voice-int-live-script-v1_48fbafa29e3e.mp3";

const qaStaff: StudioUser = {
  id: "staff-cert-voice-qa",
  email: "cert-voice-qa@local.dev",
  displayName: "Cert Voice QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-cert-voice-qa": [CERT_VOICE_CAMPAIGN_ID] },
  staffCapabilities: { "staff-cert-voice-qa": ["qa"] },
};

const campaign: CampaignRecord = {
  campaignId: CERT_VOICE_CAMPAIGN_ID,
  campaignName: CERT_VOICE_FIXTURE_LABEL,
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: CERT_VOICE_FIXTURE_LABEL,
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

function voiceTask(): CampaignTaskItem {
  return {
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

function certBrief() {
  return {
    ...defaultVoiceAudioBrief("ap-001"),
    generationCapability: "present_and_usable" as const,
    artifactRepoRoot: repoRoot,
  };
}

describe("KITCHEN-PRODUCTION-CERT-VOICE-1", () => {
  it("keeps certification fixture within 300 words and preserves script versions", () => {
    expect(CERT_VOICE_PACKAGE_ID).toBe("KITCHEN-PRODUCTION-CERT-VOICE-1");
    expect(CERT_VOICE_FIXTURE_LABEL).toMatch(/CERTIFICATION FIXTURE/);
    const approvedWords = countScriptWords(CERT_VOICE_APPROVED_SCRIPT);
    const genWords = countScriptWords(CERT_VOICE_GENERATION_SCRIPT);
    expect(approvedWords).toBeLessThanOrEqual(300);
    expect(genWords).toBeLessThanOrEqual(300);
    expect(approvedWords).toBeGreaterThan(40);
    expect(CERT_VOICE_APPROVED_SCRIPT).not.toBe(CERT_VOICE_GENERATION_SCRIPT);
    const diff = certVoiceScriptDiffSummary();
    expect(diff.identical).toBe(false);
    expect(diff.differences.length).toBeGreaterThan(0);
    expect(CERT_VOICE_PRONUNCIATION_NOTES.phoneSpoken).toMatch(/five five five/i);
    expect(CERT_VOICE_SCRIPT_VERSION_ID).toBe("cert-voice-script-v1");
  });

  it("does not certify WAV by inference; catalog MP3/WAV discrepancy is reported", () => {
    for (const sku of CERT_VOICE_TESTED_SKUS) {
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") return;
      expect(resolved.contract.readiness).toBe("contract_ready");
      expect(resolved.contract.readinessNotes).toMatch(/CUSTOMER READY WITH LIMITS — MP3/i);
      expect(resolved.contract.readinessNotes).toMatch(/WAV UNVERIFIED/i);
      expect(resolved.contract.formatExportRequirements.join(" ")).toMatch(/UNVERIFIED/i);
    }
    const ap = resolveServiceProductionContract("ap-001");
    expect(ap.status).toBe("resolved");
    if (ap.status !== "resolved") return;
    // Catalog text still promises MP3 or WAV — discrepancy preserved, not silently edited.
    expect(ap.contract.deliverables.some((d) => /MP3 or WAV/i.test(d))).toBe(true);
    expect(CERT_VOICE_CUSTOMER_READY_STATUS).toBe("CUSTOMER READY WITH LIMITS — MP3");
    expect(CERT_VOICE_OWNER_LISTENING_APPROVAL.wavCertified).toBe(false);
  });

  it("fails missing artifact / wrong scriptVersion / hash mismatch / wrong format", () => {
    const baseSub = {
      scriptText: CERT_VOICE_APPROVED_SCRIPT,
      scriptVersionId: CERT_VOICE_SCRIPT_VERSION_ID,
      claimsStudioGeneratedAudio: true,
      artifacts: [] as const,
    };
    expect(evaluateAudioQuality({ brief: certBrief(), submission: baseSub }).ok).toBe(false);

    const wrongVersion = evaluateAudioQuality({
      brief: certBrief(),
      submission: {
        ...baseSub,
        artifacts: [
          {
            id: "a",
            relativePath: INTEGRATION_FIXTURE,
            extension: "mp3",
            scriptVersionId: "wrong-version",
            contentSha256: "0".repeat(64),
          },
        ],
      },
    });
    expect(wrongVersion.findings.some((f) => f.checkKind === "artifact_binding")).toBe(true);

    const registered = registerBoundAudioArtifact({
      repoRoot,
      id: "integration-prior",
      relativePath: INTEGRATION_FIXTURE,
      scriptVersionId: CERT_VOICE_SCRIPT_VERSION_ID,
      extension: "mp3",
    });
    if ("error" in registered) throw new Error(registered.error);

    const mismatch = evaluateAudioQuality({
      brief: certBrief(),
      submission: {
        ...baseSub,
        artifacts: [{ ...registered, contentSha256: "ab".repeat(32) }],
      },
    });
    expect(mismatch.findings.some((f) => f.id.startsWith("hash_mismatch_"))).toBe(true);

    const badFormat = evaluateAudioQuality({
      brief: certBrief(),
      submission: {
        ...baseSub,
        artifacts: [{ ...registered, extension: "aac" }],
      },
    });
    expect(badFormat.findings.some((f) => f.checkKind === "format")).toBe(true);
  });

  it("requires listening attestations — checklist/metadata alone cannot pass", () => {
    const manifest = readCertVoiceBindingManifest(repoRoot);
    // Gate machinery tests use a real on-disk prior or cert artifact when present.
    const relativePath =
      manifest?.relativePath ??
      INTEGRATION_FIXTURE;
    const scriptVersionId = manifest?.scriptVersionId ?? CERT_VOICE_SCRIPT_VERSION_ID;
    const registered = registerBoundAudioArtifact({
      repoRoot,
      id: "listen-gate",
      relativePath,
      scriptVersionId,
      extension: "mp3",
    });
    if ("error" in registered) throw new Error(registered.error);

    const thin = validateAudioQualityAttestations({
      ...fullListeningPassAttestations("too short"),
      notes: "short",
    });
    expect(thin.ok).toBe(false);

    const noCommercial = validateAudioQualityAttestations({
      ...fullListeningPassAttestations(
        `Listened to bound file sha256=${registered.contentSha256}. Notes without the required verdict word.`,
      ),
      commercialUsabilityReviewed: true,
    });
    expect(noCommercial.ok).toBe(false);

    const failPronunciation = gateAudioQualityForQaPass({
      brief: certBrief(),
      submission: {
        scriptText: CERT_VOICE_APPROVED_SCRIPT,
        scriptVersionId,
        claimsStudioGeneratedAudio: true,
        artifacts: [registered],
      },
      attestations: {
        ...fullListeningPassAttestations(
          listeningNotesForHash(registered.contentSha256!, "not commercially usable yet"),
        ),
        pronunciationReviewed: false,
      },
    });
    expect(failPronunciation.ok).toBe(false);

    const failPhone = gateAudioQualityForQaPass({
      brief: certBrief(),
      submission: {
        scriptText: CERT_VOICE_APPROVED_SCRIPT,
        scriptVersionId,
        claimsStudioGeneratedAudio: true,
        artifacts: [registered],
      },
      attestations: {
        ...fullListeningPassAttestations(
          listeningNotesForHash(registered.contentSha256!, "not commercially usable yet"),
        ),
        phoneReviewed: false,
      },
    });
    expect(failPhone.ok).toBe(false);

    const failClip = gateAudioQualityForQaPass({
      brief: certBrief(),
      submission: {
        scriptText: CERT_VOICE_APPROVED_SCRIPT,
        scriptVersionId,
        claimsStudioGeneratedAudio: true,
        artifacts: [registered],
      },
      attestations: {
        ...fullListeningPassAttestations(
          listeningNotesForHash(registered.contentSha256!, "not commercially usable yet"),
        ),
        clippingReviewed: false,
      },
    });
    expect(failClip.ok).toBe(false);

    const failCommercial = gateAudioQualityForQaPass({
      brief: certBrief(),
      submission: {
        scriptText: CERT_VOICE_APPROVED_SCRIPT,
        scriptVersionId,
        claimsStudioGeneratedAudio: true,
        artifacts: [registered],
      },
      attestations: {
        ...fullListeningPassAttestations(
          listeningNotesForHash(registered.contentSha256!, "not commercially usable yet"),
        ),
        commercialUsabilityReviewed: false,
      },
    });
    expect(failCommercial.ok).toBe(false);
  });

  it("blocks applyQaPass without audioQuality; correction remains owner_not_required", () => {
    const task = voiceTask();
    const noPayload = applyQaPass(
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
    expect(noPayload.ok).toBe(false);

    const fail = applyQaFail(
      envelope([task]),
      {
        action: "qa_fail",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        notes: "Pronunciation of Quinoa incorrect; regenerate with keen-wah treatment.",
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(fail.ok).toBe(true);
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");
    const ledger = projectKitchenCommsLedger({
      campaignId: campaign.campaignId,
      tasksEnvelope: fail.ok ? fail.envelope : envelope([task]),
    });
    expect(
      [...ledger.active, ...ledger.history]
        .filter((e) => e.category === "qa")
        .every((e) => e.ownerEscalation === "owner_not_required"),
    ).toBe(true);
  });

  it("keeps prior integration fixture internal-only; Studio Voice untouched; no unrelated SKU cert", () => {
    expect(existsSync(path.join(repoRoot, INTEGRATION_FIXTURE))).toBe(true);
    expect(INTEGRATION_FIXTURE).toMatch(/kitchen-voice-integration-1/);
    for (const p of [
      "src/lib/studio-conversation-speech.ts",
      "src/config/studio-browser-voice-v1.ts",
    ]) {
      expect(existsSync(path.join(repoRoot, p))).toBe(true);
    }
    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    expect(flyer.status).toBe("resolved");
    if (flyer.status !== "resolved") return;
    expect(flyer.contract.primaryTool.toolId).not.toBe("ai_voice_tool");
  });

  it("records Owner listening PASS only for the exact bound artifact hash", () => {
    const manifest = readCertVoiceBindingManifest(repoRoot);
    expect(manifest).not.toBeNull();
    if (!manifest) return;

    const defaults = expectedCertVoiceDefaults();
    expect(manifest.campaignId).toBe(defaults.campaignId);
    expect(manifest.scriptVersionId).toBe(defaults.scriptVersionId);
    expect(manifest.skuId).toBe("ap-001");
    expect(manifest.providerOutputFormat).toBe("mp3_44100_128");
    expect(manifest.qaState).toBe("qa_pass");
    expect(manifest.ownerListeningApproval).toBe("pass");
    expect(manifest.customerReadinessLabel).toBe("CUSTOMER READY WITH LIMITS — MP3");
    expect(manifest.wavCertified).toBe(false);
    expect(manifest.contentSha256).toBe(CERT_VOICE_APPROVED_ARTIFACT.contentSha256);

    const abs = path.join(repoRoot, manifest.relativePath);
    expect(existsSync(abs)).toBe(true);
    const diskHash = createHash("sha256").update(readFileSync(abs)).digest("hex");
    expect(diskHash).toBe(manifest.contentSha256);
    expect(existsSync(path.join(repoRoot, CERT_VOICE_BINDING_MANIFEST_REL))).toBe(true);

    const okGate = gateCertVoiceListeningApproval({
      artifactRelativePath: CERT_VOICE_APPROVED_ARTIFACT.relativePath,
      contentSha256: CERT_VOICE_APPROVED_ARTIFACT.contentSha256,
      attestations: ownerListeningPassAttestationsForCertifiedArtifact(),
    });
    expect(okGate.ok).toBe(true);

    const wrongHash = gateCertVoiceListeningApproval({
      artifactRelativePath: CERT_VOICE_APPROVED_ARTIFACT.relativePath,
      contentSha256: "0".repeat(64),
      attestations: ownerListeningPassAttestationsForCertifiedArtifact(),
    });
    expect(wrongHash.ok).toBe(false);

    const wrongPath = gateCertVoiceListeningApproval({
      artifactRelativePath: INTEGRATION_FIXTURE,
      contentSha256: CERT_VOICE_APPROVED_ARTIFACT.contentSha256,
      attestations: ownerListeningPassAttestationsForCertifiedArtifact(),
    });
    expect(wrongPath.ok).toBe(false);

    // Full audio QA pass for the certified artifact also requires listening attestations.
    const registered = registerBoundAudioArtifact({
      repoRoot,
      id: "cert-final",
      relativePath: CERT_VOICE_APPROVED_ARTIFACT.relativePath,
      scriptVersionId: CERT_VOICE_SCRIPT_VERSION_ID,
      extension: "mp3",
    });
    if ("error" in registered) throw new Error(registered.error);
    const gated = gateAudioQualityForQaPass({
      brief: certBrief(),
      submission: {
        scriptText: CERT_VOICE_APPROVED_SCRIPT,
        scriptVersionId: CERT_VOICE_SCRIPT_VERSION_ID,
        claimsStudioGeneratedAudio: true,
        artifacts: [registered],
      },
      attestations: ownerListeningPassAttestationsForCertifiedArtifact(),
    });
    expect(gated.ok).toBe(true);
    if (!gated.ok) return;
    const approval = gateCertVoiceListeningApproval({
      artifactRelativePath: registered.relativePath,
      contentSha256: registered.contentSha256!,
      attestations: gated.attestations,
    });
    expect(approval.ok).toBe(true);
  });
});
