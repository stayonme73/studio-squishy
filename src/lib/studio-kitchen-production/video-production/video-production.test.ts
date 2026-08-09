import { existsSync } from "fs";
import path from "path";

import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { applyQaFail } from "@/lib/campaign-tasks/actions";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  ownerEscalationForRoutineOperationalEvent,
} from "@/lib/studio-kitchen-comms";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import {
  CAPCUT_MANUAL_OPERATIONAL_TARGET,
  VIDEO_DURATION_MAX_SECONDS,
  VIDEO_DURATION_MIN_SECONDS,
  VIDEO_PRODUCTION_CHAIN,
  VIDEO_PRODUCTION_SKUS,
  classifyCapCutFinding,
  defaultVideoQualityBrief,
  evaluateCustomerAssetTruth,
  evaluateVideoQuality,
  fullVideoPassAttestations,
  gateVideoQualityForQaPass,
  isVideoProductionSku,
  projectVideoKitchenStates,
  registerBoundVideoArtifact,
  requiresVideoQualityGate,
  resolveClaimableVideoKitchenLabels,
  sha256VideoFileRelative,
  summarizeVideoCapabilityInventory,
  videoSkuContractTruth,
  viewingNotesForHash,
} from "./index";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

const now = "2026-08-09T18:00:00.000Z";
const repoRoot = process.cwd();
const BINDING_FIXTURE_REL =
  "docs/launch/kitchen-video-production-1/artifacts/binding-fixture-not-a-deliverable.bin.mp4";
const CERT_VOICE_HASH =
  "d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4";

const qaStaff: StudioUser = {
  id: "staff-video-qa",
  email: "video-qa@local.dev",
  displayName: "Video QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-video-qa": ["video-prod-1"] },
  staffCapabilities: { "staff-video-qa": ["qa"] },
};

const campaign: CampaignRecord = {
  campaignId: "video-prod-1",
  campaignName: "KITCHEN-VIDEO-PRODUCTION-1 FIXTURE",
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "PRODUCTION PATH FIXTURE / INTERNAL TEST — NOT CERTIFIED",
  estimatedCompletion: "Soon",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  approvedStudioPlan: {
    selectedServiceIds: ["v2-rtu-short-video"],
    includedServiceIds: ["v2-rtu-short-video"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 14900,
    monthlyTotalCents: 0,
    amountDueTodayCents: 14900,
    lineItems: [
      {
        skuId: "v2-rtu-short-video",
        serviceName: "Make Me a Short Video",
        billingType: "one_time",
        exactPriceCents: 14900,
        priceDisplay: "$149",
        deliverables: [],
        exclusions: [],
        timingWindowLabel: "standard",
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

function videoTask(): CampaignTaskItem {
  return {
    id: "v2-rtu-short-video:creative",
    title: "Short Video — Creative",
    phase: "creative",
    status: "ready_for_qa",
    relatedServiceIds: ["v2-rtu-short-video"],
    familyId: "video_audio",
    catalogFamilyId: "marketing_video",
    serviceName: "Short Video",
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

describe("KITCHEN-VIDEO-PRODUCTION-1", () => {
  it("resolves v2-rtu-short-video to Shotstack CUSTOMER READY WITH LIMITS — MP4", () => {
    for (const sku of VIDEO_PRODUCTION_SKUS) {
      expect(isVideoProductionSku(sku)).toBe(true);
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") return;
      expect(resolved.contract.readiness).toBe("contract_ready");
      expect(resolved.contract.primaryTool.toolId).toBe("shotstack");
      expect(resolved.contract.primaryTool.integrationState).toBe("partial_adapter");
      expect(resolved.contract.readinessNotes).toMatch(/CapCut CLOSED|OWNER-INDEPENDENCE FAIL/i);
      expect(resolved.contract.readinessNotes).toMatch(/CUSTOMER READY WITH LIMITS — MP4/i);
      expect(resolved.contract.readinessNotes).toMatch(/A\/V beat sync|beat synchronization/i);
      const truth = videoSkuContractTruth(sku);
      expect(truth.durationSecondsMin).toBe(VIDEO_DURATION_MIN_SECONDS);
      expect(truth.durationSecondsMax).toBe(VIDEO_DURATION_MAX_SECONDS);
      expect(truth.fileFormat).toBe("mp4");
      expect(truth.videoCount).toBe(1);
      expect(truth.publishingExcluded).toBe(true);
      expect(truth.intakeLeadDurationDiscrepancy).toMatch(/Reconciled|15–30/);
    }
  });

  it("records CapCut owner-independence FAIL — no Tagia export success path", () => {
    const cap = classifyCapCutFinding();
    expect(cap.finding).toBe("integration_required");
    expect(cap.ownerIndependence).toBe("fail");
    expect(cap.canCreateCustomerReadyMp4WithoutHumanCapCut).toBe(false);
    expect(cap.canCreateCustomerReadyMp4WithoutTagia).toBe(false);
    const summary = summarizeVideoCapabilityInventory();
    expect(summary.capCutOwnerIndependence).toBe("fail");
    expect(summary.canGenerateCustomerDeliverableMp4InStudio).toBe(true);
    expect(summary.customerReady).toBe(false);
    expect(summary.customerReadyWithLimits).toBe(true);
    expect(summary.customerReadyStatus).toBe("CUSTOMER READY WITH LIMITS — MP4");
    expect(summary.musicCapability).toBe("unresolved");
    expect(summary.stockMediaCapability).toBe("unresolved");
    expect(summary.studioVoiceUntouched).toBe(true);
    expect(summary.shotstackIntegrationProven).toBe(true);
    expect(summary.recommendedNextPackage).toBe("ROUTINE_PRODUCTION_AV_SYNC_QA");
    expect(CAPCUT_MANUAL_OPERATIONAL_TARGET.tagiaExportSuccessPath).toBe(false);
    expect(CAPCUT_MANUAL_OPERATIONAL_TARGET.ownerIndependence).toBe("fail");
  });

  it("fails honestly when required assets are missing or stock is unapproved", () => {
    expect(evaluateCustomerAssetTruth("no_usable_media").productionAllowed).toBe(false);
    expect(evaluateCustomerAssetTruth("logo_and_copy_only").findings.some((f) => f.checkKind === "stock_media")).toBe(
      true,
    );
    expect(evaluateCustomerAssetTruth("approved_studio_stock_ai").productionAllowed).toBe(false);
    expect(evaluateCustomerAssetTruth("requested_unavailable_footage").findings[0]?.checkKind).toBe(
      "assets_required",
    );
  });

  it("cannot create a phantom MP4 — missing path cannot register", () => {
    const missing = registerBoundVideoArtifact({
      repoRoot,
      id: "phantom",
      relativePath: "docs/launch/kitchen-video-production-1/artifacts/does-not-exist.mp4",
      scriptVersionId: "script-v1",
      campaignId: "video-prod-1",
      skuId: "v2-rtu-short-video",
      extension: "mp4",
    });
    expect("error" in missing).toBe(true);
  });

  it("binds real on-disk bytes to path + hash + script + campaign + SKU", () => {
    expect(existsSync(path.join(repoRoot, BINDING_FIXTURE_REL))).toBe(true);
    const registered = registerBoundVideoArtifact({
      repoRoot,
      id: "bind-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-v1",
      campaignId: "video-prod-1",
      skuId: "v2-rtu-short-video",
      extension: "mp4",
      declaredDurationSeconds: 22,
      declaredAspectRatio: "vertical",
      voiceArtifactSha256: CERT_VOICE_HASH,
    });
    expect("error" in registered).toBe(false);
    if ("error" in registered) return;
    const hash = sha256VideoFileRelative(repoRoot, BINDING_FIXTURE_REL);
    expect(registered.contentSha256).toBe(hash);

    const brief = {
      ...defaultVideoQualityBrief("v2-rtu-short-video", "video-prod-1", "script-v1"),
      assemblyCapability: "manual_operational_authorized" as const,
      artifactRepoRoot: repoRoot,
      requireVoiceArtifact: true,
    };
    const evaln = evaluateVideoQuality({
      brief,
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: false,
        renderState: "render_completed",
        voiceArtifactSha256: CERT_VOICE_HASH,
        artifacts: [registered],
      },
    });
    expect(evaln.ok).toBe(true);
  });

  it("rejects wrong script version and wrong campaign/SKU bindings", () => {
    const registered = registerBoundVideoArtifact({
      repoRoot,
      id: "bind-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-WRONG",
      campaignId: "other-campaign",
      skuId: "v2-rtu-voice",
      extension: "mp4",
      declaredDurationSeconds: 20,
    });
    expect("error" in registered).toBe(false);
    if ("error" in registered) return;

    const brief = {
      ...defaultVideoQualityBrief("v2-rtu-short-video", "video-prod-1", "script-v1"),
      assemblyCapability: "manual_operational_authorized" as const,
      artifactRepoRoot: repoRoot,
    };
    const evaln = evaluateVideoQuality({
      brief,
      submission: {
        scriptVersionId: "script-WRONG",
        campaignId: "other-campaign",
        skuId: "v2-rtu-voice",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: false,
        renderState: "render_completed",
        artifacts: [registered],
      },
    });
    expect(evaln.ok).toBe(false);
    expect(evaln.findings.some((f) => f.checkKind === "script_version")).toBe(true);
    expect(evaln.findings.some((f) => f.checkKind === "campaign_scope")).toBe(true);
    expect(evaln.findings.some((f) => f.checkKind === "sku_scope")).toBe(true);
  });

  it("failed render cannot become QA READY; metadata alone cannot QA PASS", () => {
    const brief = {
      ...defaultVideoQualityBrief("v2-rtu-short-video", "video-prod-1", "script-v1"),
      assemblyCapability: "manual_operational_authorized" as const,
      artifactRepoRoot: repoRoot,
    };
    const failed = evaluateVideoQuality({
      brief,
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: false,
        renderState: "render_failed",
        artifacts: [],
      },
    });
    expect(failed.ok).toBe(false);
    expect(failed.findings.some((f) => f.checkKind === "render_state")).toBe(true);

    const registered = registerBoundVideoArtifact({
      repoRoot,
      id: "bind-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-v1",
      campaignId: "video-prod-1",
      skuId: "v2-rtu-short-video",
      extension: "mp4",
      declaredDurationSeconds: 18,
    });
    if ("error" in registered) throw new Error(registered.error);

    const metaOnly = gateVideoQualityForQaPass({
      brief,
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: false,
        renderState: "render_completed",
        artifacts: [registered],
      },
      attestations: {
        ...fullVideoPassAttestations("incomplete"),
        commercialUsabilityReviewed: false,
        viewingMatchesBoundArtifact: false,
      },
    });
    expect(metaOnly.evaluation.ok).toBe(true);
    expect(metaOnly.gatePassed).toBe(false);
    expect(metaOnly.customerReady).toBe(false);
  });

  it("integration_required brief still blocks Studio-assembled video claims", () => {
    const evaln = evaluateVideoQuality({
      brief: {
        ...defaultVideoQualityBrief("v2-rtu-short-video", "video-prod-1", "script-v1"),
        assemblyCapability: "integration_required",
      },
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: true,
        renderState: "render_completed",
        artifacts: [],
      },
    });
    expect(evaln.ok).toBe(false);
    expect(evaln.findings.some((f) => f.checkKind === "generation_capability")).toBe(true);
    expect(evaln.findings.some((f) => f.checkKind === "phantom_file")).toBe(true);
  });

  it("references certified voice hash without re-certifying voice; missing required audio fails", () => {
    const registered = registerBoundVideoArtifact({
      repoRoot,
      id: "bind-fixture",
      relativePath: BINDING_FIXTURE_REL,
      scriptVersionId: "script-v1",
      campaignId: "video-prod-1",
      skuId: "v2-rtu-short-video",
      extension: "mp4",
      declaredDurationSeconds: 20,
      voiceArtifactSha256: CERT_VOICE_HASH,
    });
    if ("error" in registered) throw new Error(registered.error);

    const brief = {
      ...defaultVideoQualityBrief("v2-rtu-short-video", "video-prod-1", "script-v1"),
      assemblyCapability: "manual_operational_authorized" as const,
      artifactRepoRoot: repoRoot,
      requireVoiceArtifact: true,
    };
    const ok = evaluateVideoQuality({
      brief,
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: false,
        renderState: "render_completed",
        voiceArtifactSha256: CERT_VOICE_HASH,
        artifacts: [registered],
      },
    });
    expect(ok.ok).toBe(true);

    const missingVoice = evaluateVideoQuality({
      brief,
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: false,
        renderState: "render_completed",
        artifacts: [{ ...registered, voiceArtifactSha256: undefined }],
      },
    });
    expect(missingVoice.ok).toBe(false);
    expect(missingVoice.findings.some((f) => f.checkKind === "voice_artifact")).toBe(true);
  });

  it("unsupported stock-media and unresolved music fail honestly", () => {
    const stock = evaluateCustomerAssetTruth("approved_studio_stock_ai");
    expect(stock.findings.some((f) => f.checkKind === "stock_media")).toBe(true);

    const music = evaluateVideoQuality({
      brief: {
        ...defaultVideoQualityBrief("v2-rtu-short-video", "video-prod-1", "script-v1"),
        assemblyCapability: "manual_operational_authorized",
        musicUsed: true,
        musicRightsResolved: false,
      },
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: false,
        renderState: "render_completed",
        artifacts: [],
      },
    });
    expect(music.findings.some((f) => f.checkKind === "music_rights")).toBe(true);
  });

  it("kitchen states never invent artifacts; chain covers required labels", () => {
    const snap = projectVideoKitchenStates("v2-rtu-short-video");
    expect(snap.customerReady).toBe(false);
    expect(snap.assemblyIntegrated).toBe(true);
    expect(snap.canRepresentVideoArtifactProduced).toBe(true);
    const labels = VIDEO_PRODUCTION_CHAIN.map((s) => s.kitchenStateLabel);
    expect(labels).toContain("render pending");
    expect(labels).toContain("video artifact produced");
    expect(labels).toContain("QA ready");

    const claim = resolveClaimableVideoKitchenLabels({
      skuId: "v2-rtu-short-video",
      hasAssetsReady: true,
      hasScriptReady: true,
      hasStoryboardReady: true,
      hasBoundVideoArtifact: false,
      videoQaPassed: false,
    });
    expect(claim.inventedArtifact).toBe(false);
    expect(claim.customerReady).toBe(false);
    expect(claim.blocked).toContain("QA pass");
  });

  it("routine video corrections remain owner_not_required", () => {
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");
    const task = videoTask();
    expect(requiresVideoQualityGate(task)).toBe(true);
    const fail = applyQaFail(
      envelope([task]),
      {
        action: "qa_fail",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        notes: "Caption timing and crop — routine Creative Production correction.",
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(fail.ok).toBe(true);
    if (!fail.ok) return;
    expect(fail.envelope.tasks[0]?.workflowState).toBe("needs_revision");
    // Ensure viewing notes helper stays available for future cert binding (not used as QA PASS here).
    expect(viewingNotesForHash("abc", "not a pass")).toMatch(/boundSha256=abc/);
  });

  it("does not certify any unrelated SKU or grant customer-ready", () => {
    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    expect(flyer.status).toBe("resolved");
    if (flyer.status === "resolved") {
      // This package must not invent video/MP4 readiness on unrelated SKUs.
      expect(flyer.contract.readinessNotes ?? "").not.toMatch(/CUSTOMER READY WITH LIMITS — MP4/i);
      expect(flyer.contract.primaryTool.toolId).not.toBe("capcut");
    }
    const voice = resolveServiceProductionContract("v2-rtu-voice");
    expect(voice.status).toBe("resolved");
    if (voice.status === "resolved") {
      // Voice remains MP3-limited from prior seal — not reclassified by this package.
      expect(voice.contract.readinessNotes).toMatch(/MP3/i);
    }
    const gate = gateVideoQualityForQaPass({
      brief: defaultVideoQualityBrief("v2-rtu-short-video", "video-prod-1", "script-v1"),
      submission: {
        scriptVersionId: "script-v1",
        campaignId: "video-prod-1",
        skuId: "v2-rtu-short-video",
        assetInputKind: "customer_footage",
        claimsStudioAssembledVideo: true,
        renderState: "render_completed",
        artifacts: [],
      },
      attestations: fullVideoPassAttestations("must not grant ready"),
    });
    expect(gate.customerReady).toBe(false);
    expect(gate.gatePassed).toBe(false);
  });
});
