import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import {
  SOURCE_AUDIO_CUSTOMER_NOTICE,
  isSourceAudioPreflightSku,
  studioSourceAudioPreflightV1,
} from "@/config/studio-source-audio-preflight-v1";
import { prepareClipRepurposingSourceAudio } from "@/lib/studio-clip-repurposing/source-audio-preflight";
import { invokeFootageEditingDispatchHook } from "@/lib/studio-dispatch/footage-editing-dispatch-hook";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

import {
  attachSourceAudioAcknowledgement,
  chooseCleanupVersusOriginal,
  evaluateSourceAudioGate,
  prepareCustomerSourceAudio,
  recordSourceAudioGateOnCampaign,
} from "./index";
import {
  classifyClippingMaterial,
  scanClippingFromPcm,
} from "./clipping-material";
import {
  fixturePath,
  writeCleanTalkingHeadFixture,
  writeClippedTalkingHeadFixture,
  writeFlattenedTalkingHeadFixture,
  writeIsolatedNeedleTalkingHeadFixture,
  writeNoisyTalkingHeadFixture,
  writeRepeatedClippingTalkingHeadFixture,
  writeSilentTalkingHeadFixture,
  writeSpeechDamagingCleanupFixture,
} from "./fixtures";

const REPO = path.resolve(__dirname, "../../..");

function campaignFor(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Source audio preflight",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Pre-payment audio gate",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:videoPurpose`]: "Explain the page.",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:talkingHeadConfirm`]:
          "Yes — one native-vertical English talking-head I own or have permission to use",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:rightsAcknowledgement`]:
          "I own this recording, or I have permission from everyone who appears in it",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:ctaText`]: "Book a table",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:sourceMaterials`]: "talking-head.mp4",
      },
    },
  };
}

function material(campaignId: string, rel: string) {
  return {
    id: "source-1",
    category: "photo-video" as const,
    requirementLevel: "required" as const,
    reviewStatus: "approved_for_use" as const,
    contentKind: "file-metadata" as const,
    label: "Talking-head",
    reason: "Cleared source",
    relatedServiceIds: [SHORT_FORM_VIDEO_EDITING_SKU] as const,
    uploadStatus: "stored" as const,
    fileName: "talking-head.mp4",
    url: rel,
    useAuthorization: {
      basis: "customer_owns" as const,
      attestedAt: new Date().toISOString(),
    },
  };
}

function readyRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${SHORT_FORM_VIDEO_EDITING_SKU}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU as JobDispatchRecord["skuId"],
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "video_audio",
      controlLane: "standard",
      factFingerprint: "fp-preflight",
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: SHORT_FORM_VIDEO_EDITING_SKU as JobDispatchRecord["skuId"],
  });
}

describe("Customer source-audio preflight + light cleanup", () => {
  it("classifies clean, noisy, silent, and clipped sources", () => {
    const clean = writeCleanTalkingHeadFixture(fixturePath(REPO, "clean.mp4"));
    const noisy = writeNoisyTalkingHeadFixture(fixturePath(REPO, "noisy.mp4"));
    const silent = writeSilentTalkingHeadFixture(fixturePath(REPO, "silent.mp4"));
    const clipped = writeClippedTalkingHeadFixture(fixturePath(REPO, "clipped.mp4"));

    const pass = evaluateSourceAudioGate({ sourceAbsolutePath: clean });
    const notice = evaluateSourceAudioGate({ sourceAbsolutePath: noisy });
    const tooQuiet = evaluateSourceAudioGate({ sourceAbsolutePath: silent });
    const damaged = evaluateSourceAudioGate({ sourceAbsolutePath: clipped });

    expect(pass.outcome).toBe("PASS");
    expect(pass.customerNotice).toBeNull();
    expect(notice.outcome).toBe("NOTICE_AND_CHOICE");
    expect(notice.customerNotice).toBe(SOURCE_AUDIO_CUSTOMER_NOTICE);
    expect(tooQuiet.outcome).toBe("REPLACEMENT_REQUIRED");
    expect(damaged.outcome).toBe("REPLACEMENT_REQUIRED");
    expect(damaged.measurement.clippingKind).toBeTruthy();
  });

  it("allows isolated non-material needle peaks and still rejects material clipping", () => {
    const needles = writeIsolatedNeedleTalkingHeadFixture(
      fixturePath(REPO, "isolated-needles.mp4"),
    );
    const repeated = writeRepeatedClippingTalkingHeadFixture(
      fixturePath(REPO, "repeated-clip.mp4"),
    );
    const flattened = writeFlattenedTalkingHeadFixture(
      fixturePath(REPO, "flattened-clip.mp4"),
    );

    const isolated = evaluateSourceAudioGate({ sourceAbsolutePath: needles });
    const many = evaluateSourceAudioGate({ sourceAbsolutePath: repeated });
    const flat = evaluateSourceAudioGate({ sourceAbsolutePath: flattened });

    expect(isolated.outcome).not.toBe("REPLACEMENT_REQUIRED");
    expect(isolated.measurement.clippingKind === "isolated_needles" || isolated.measurement.clippingKind == null).toBe(
      true,
    );
    expect(many.outcome).toBe("REPLACEMENT_REQUIRED");
    expect(flat.outcome).toBe("REPLACEMENT_REQUIRED");
    expect(["sustained_plateau", "repeated_clusters", "widespread_ratio"]).toContain(
      many.measurement.clippingKind,
    );
    expect(["sustained_plateau", "widespread_ratio"]).toContain(flat.measurement.clippingKind);
  });

  it("classifies the inspected 23:23 needle census as isolated, not material", () => {
    const rate = 48000;
    const seconds = 1403.477;
    const samples = new Float32Array(Math.round(seconds * rate));
    samples[Math.round(860.326 * rate)] = 1.013341;
    for (let i = 0; i < 7; i += 1) {
      samples[Math.round(979.034 * rate) + i] = i === 3 ? 1.05607 : 1.01;
    }
    const scan = scanClippingFromPcm(samples, rate);
    const classified = classifyClippingMaterial(scan);
    expect(scan.hitCount).toBe(8);
    expect(scan.clusters).toHaveLength(2);
    expect(scan.clusters[1]?.durationMs).toBeLessThanOrEqual(40);
    expect(classified.material).toBe(false);
    expect(classified.kind).toBe("isolated_needles");
  });

  it("persists acknowledgement in shared job truth before production", () => {
    const noisy = writeNoisyTalkingHeadFixture(fixturePath(REPO, "ack-noisy.mp4"));
    const gate = evaluateSourceAudioGate({ sourceAbsolutePath: noisy });
    let campaign = recordSourceAudioGateOnCampaign({
      campaign: campaignFor("camp-preflight-ack"),
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      outcome: gate.outcome,
      customerNotice: gate.customerNotice,
    });
    expect(campaign.sourceAudioPreflight?.customerAcknowledgedLimitation).toBeFalsy();
    campaign = attachSourceAudioAcknowledgement({
      campaign,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      outcome: "NOTICE_AND_CHOICE",
      customerNotice: SOURCE_AUDIO_CUSTOMER_NOTICE,
    });
    expect(campaign.sourceAudioPreflight?.customerAcknowledgedLimitation).toBe(true);
    expect(campaign.sourceAudioPreflight?.proceedWithThisSource).toBe(true);
    expect(campaign.sourceAudioPreflight?.outcome).toBe("NOTICE_AND_CHOICE");
  });

  it("reverts cleanup that damages speech and can keep a better light pass", () => {
    const noisy = writeNoisyTalkingHeadFixture(fixturePath(REPO, "cleanup-noisy.mp4"));
    const wrecked = writeSpeechDamagingCleanupFixture(
      noisy,
      fixturePath(REPO, "cleanup-wrecked.mp4"),
    );
    expect(
      chooseCleanupVersusOriginal({
        originalAbsolutePath: noisy,
        cleanedAbsolutePath: wrecked,
      }),
    ).toBe("original");

    const prepared = prepareCustomerSourceAudio({
      repoRoot: REPO,
      sourceAbsolutePath: noisy,
      sourceRelativePath: path.relative(REPO, noisy).replace(/\\/g, "/"),
      acknowledgement: {
        packageId: studioSourceAudioPreflightV1.packageId,
        skuId: SHORT_FORM_VIDEO_EDITING_SKU,
        outcome: "NOTICE_AND_CHOICE",
        customerAcknowledgedLimitation: true,
        proceedWithThisSource: true,
      },
      workDirectory: fixturePath(REPO, "cleanup-work"),
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.cleanupPassesAttempted).toBeLessThanOrEqual(2);
    if (prepared.cleanupKept) {
      expect(
        chooseCleanupVersusOriginal({
          originalAbsolutePath: noisy,
          cleanedAbsolutePath: prepared.sourceAbsolutePath,
        }),
      ).toBe("cleaned");
    } else {
      expect(prepared.revertedToOriginal).toBe(true);
    }
  });

  it("blocks paid footage production until the customer acknowledges a notice", async () => {
    const campaignId = `camp-preflight-hook-${Date.now()}`;
    const rel = `data/campaign-design-artifacts/${campaignId}/materials/talking-head.mp4`;
    const abs = path.join(REPO, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeNoisyTalkingHeadFixture(abs);
    const campaign = campaignFor(campaignId);
    const record = readyRecord(campaignId);
    let pipelineCalls = 0;
    const blocked = await invokeFootageEditingDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [material(campaignId, rel)],
      runPipeline: async () => {
        pipelineCalls += 1;
        throw new Error("pipeline must not run");
      },
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.failureCode).toBe("SOURCE_AUDIO_CUSTOMER_CHOICE_REQUIRED");
    expect(blocked.message).toBe(SOURCE_AUDIO_CUSTOMER_NOTICE);
    expect(pipelineCalls).toBe(0);

    const acknowledged = attachSourceAudioAcknowledgement({
      campaign,
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      outcome: "NOTICE_AND_CHOICE",
      customerNotice: SOURCE_AUDIO_CUSTOMER_NOTICE,
    });
    const outputRel = `data/campaign-design-artifacts/${campaignId}/footage-out.mp4`;
    writeFileSync(path.join(REPO, outputRel), Buffer.from("preflight-ok"));
    const allowed = await invokeFootageEditingDispatchHook({
      repoRoot: REPO,
      campaign: acknowledged,
      dispatchRecord: record,
      materials: [material(campaignId, rel)],
      runPipeline: async (input) => {
        pipelineCalls += 1;
        return {
          ok: true,
          sourceRelativePath: input.sourceRelativePath,
          probe: { durationSeconds: 2, width: 1080, height: 1920, hasAudio: true },
          edl: {
            ok: true,
            sourceDurationSeconds: 2,
            outputDurationSeconds: 2,
            clips: [],
            captions: [],
            droppedFalseStarts: 0,
            droppedDeadSpaceSeconds: 0,
            selection: "performance_watch",
          },
          outputRelativePath: outputRel,
          providerRenderId: "preflight-0",
          spend: {
            deepgramUsdList: 0,
            deepgramUsdOptOutCeiling: 0,
            modelSelectionUsd: 0,
            performanceWatchUsd: 0,
            shotstackCredits: 0,
            renders: 1,
            transportRetries: 0,
            creativeRetries: 0,
            elapsedMs: 1,
            renderEnv: "stage",
            watermarkExpected: false,
          },
          revisionApplied: false,
          selectionWinner: "performance_watch",
        };
      },
    });
    expect(allowed.ok, allowed.ok ? "ok" : `${allowed.failureCode}: ${allowed.message}`).toBe(
      true,
    );
    expect(pipelineCalls).toBe(1);
    expect(acknowledged.sourceAudioPreflight?.selectedSourceRelativePath).toBeTruthy();
  });

  it("applies the same gate to Clip Repurposing without reopening set logic", () => {
    expect(isSourceAudioPreflightSku(SHORT_FORM_VIDEO_EDITING_SKU)).toBe(true);
    expect(isSourceAudioPreflightSku(CLIP_REPURPOSING_SKU)).toBe(true);
    const noisy = writeNoisyTalkingHeadFixture(fixturePath(REPO, "clip-noisy.mp4"));
    const refused = prepareClipRepurposingSourceAudio({
      repoRoot: REPO,
      campaignId: "camp-clip-preflight",
      sourceAbsolutePath: noisy,
      sourceRelativePath: path.relative(REPO, noisy).replace(/\\/g, "/"),
    });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.failureCode).toBe("SOURCE_AUDIO_CUSTOMER_CHOICE_REQUIRED");
  });

  it("hardens the two frozen contracts without recertifying them or writing refund rules", () => {
    expect(studioSourceAudioPreflightV1.doNotDefineRefundPolicy).toBe(true);
    expect(studioSourceAudioPreflightV1.doNotReopenEditorial).toBe(true);
    expect(studioSourceAudioPreflightV1.doNotReopenClipSetLogic).toBe(true);
    expect(studioSourceAudioPreflightV1.maxLightCleanupPasses).toBe(2);
    expect(studioSourceAudioPreflightV1.clippingMaterialGate.replacesWholeFilePeakReject).toBe(
      true,
    );
    expect(studioSourceAudioPreflightV1.clippingMaterialGate.doNotWhitelistAFile).toBe(true);
    expect(studioSourceAudioPreflightV1.clippingMaterialGate.doNotUseSttAsSoleJudge).toBe(true);
    expect(
      studioShortFormVideoEditingBuildV1.sourceAudioPreflightHardening
        .priorCertificationNotSilentlyRecertified,
    ).toBe(true);
    expect(
      studioClipRepurposingBuildV1.sourceAudioPreflightHardening
        .priorCertificationNotSilentlyRecertified,
    ).toBe(true);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
  });
});
