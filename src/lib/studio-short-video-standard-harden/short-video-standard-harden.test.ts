/**
 * HARDEN #8 — SHORT VIDEO (STANDARD)
 * Proves the locked $149 stills + captions vertical video.
 * Does not remint Maya. The eight earlier SELL NOW services stay frozen.
 */

import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import {
  SHORT_VIDEO_HONEST_PROMISED_OUTPUT,
  SHORT_VIDEO_MP4_LABEL,
  SHORT_VIDEO_STANDARD_HARDEN_SKU,
  estimateShotstackPaygCents,
  studioShortVideoStandardHardenV1 as harden,
} from "@/config/studio-short-video-standard-harden-v1";
import {
  appendGeneralDesignAttempt,
  createGeneralDesignInternalLoop,
} from "@/lib/studio-general-design-runtime/correction";
import {
  evaluateShortVideoExactFacts,
  shortVideoCaptionsPreserveApprovedWords,
} from "@/lib/studio-design-renderer/short-video-exact-facts";
import { videoSkuContractTruth } from "@/lib/studio-kitchen-production/video-production";
import { assembleApprovedShortVideoClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { clientDeliveryFileLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";
import { evaluateWorkSupervision } from "@/lib/studio-work-supervision/evaluate";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";
import { mapShortVideoProjectTruthFromJob } from "@/lib/studio-dispatch/map-short-video-job-truth";
import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";

function failAttempt(n: number) {
  return {
    attemptNumber: n,
    triggeredBy: n === 1 ? ("initial_dispatch" as const) : ("qa_correction" as const),
    qaResult: "fail" as const,
    failureCode: "QA_FAILURE",
    message: "fail",
    pngContentSha256: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

function campaign(answers: Record<string, string>): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId: "harden-video",
    ownerId: "owner",
    status: "active",
    createdAt: now,
    updatedAt: now,
    routeMapIntake: { submittedAt: now, answers },
  } as CampaignRecord;
}

describe("HARDEN #8 — Short Video STANDARD", () => {
  it("locks the smallest honest $149 stills + captions vertical video", () => {
    expect(harden.skuId).toBe(SHORT_VIDEO_STANDARD_HARDEN_SKU);
    expect(harden.hardenClass).toBe("STANDARD");
    expect(harden.offer.priceCents).toBe(14900);
    expect(harden.offer.plate).toEqual({ widthPx: 1080, heightPx: 1920 });
    expect(harden.offer.aspect).toBe("vertical");
    expect(harden.offer.stillCount).toEqual({ min: 1, max: 4 });
    expect(harden.offer.narration).toBe(false);
    expect(harden.offer.studioMusic).toBe(false);
    expect(harden.offer.customerFootageEditing).toBe(false);
    expect(harden.offer.stockFootage).toBe(false);
    expect(harden.offer.landscape).toBe(false);
    expect(harden.offer.square).toBe(false);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.doNotBroadenToMakeThePriceWorthIt).toBe(true);
    expect(harden.classification).toBe("SELL_NOW");
    expect(harden.frozen).toBe(true);
  });

  it("1 + 2 — paid Shotstack stills hook already proves the lane; vertical 1080×1920 is locked", () => {
    const contract = videoSkuContractTruth(SHORT_VIDEO_STANDARD_HARDEN_SKU);
    expect(contract.promisedDeliverable).toBe(SHORT_VIDEO_HONEST_PROMISED_OUTPUT);
    expect(contract.aspectRatioChoices).toEqual(["vertical"]);
    expect(contract.resolutionPromise).toBe("1080x1920");
    expect(contract.voiceOverIncluded).toBe("not_sold");
    expect(contract.musicPromise).toBe("not_sold");
    expect(contract.stockMediaPromise).toBe("not_sold");
    expect(harden.offer.durationSeconds).toEqual({ min: 15, max: 30, target: 18 });
  });

  it("3–5 — only customer-cleared stills; missing/uncleared wait; no silent substitute", () => {
    const missing = mapShortVideoProjectTruthFromJob({
      repoRoot: process.cwd(),
      campaign: campaign({
        videoPurpose: "Spring special",
        onScreenText: "Harbor Spring Special. Book now.",
        format: "Vertical 1080×1920 — I post it myself",
        footageMaterials: "I will send storefront.jpg. I own it.",
      }),
      materials: [],
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe("MISSING_USABLE_FOOTAGE");

    const uncleared: CampaignMaterialItem = {
      id: "still-1",
      category: "photo-video",
      requirementLevel: "required",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: "Storefront",
      reason: "Still",
      relatedServiceIds: [SHORT_VIDEO_STANDARD_HARDEN_SKU],
      uploadStatus: "stored",
      fileName: "storefront.jpg",
      url: "docs/launch/studio-operating-design-business-card-proof-1/artifacts/v2-rtu-business-card/materials/harbor-oak-anchor-oak-oval-v1.svg",
    };
    const pending = mapShortVideoProjectTruthFromJob({
      repoRoot: process.cwd(),
      campaign: campaign({
        videoPurpose: "Spring special",
        onScreenText: "Harbor Spring Special. Book now.",
        format: "Vertical",
        footageMaterials: "storefront.jpg",
      }),
      materials: [uncleared],
    });
    expect(pending.ok).toBe(false);
    if (!pending.ok) expect(pending.code).toBe("UNCLEARED_CUSTOMER_STILL");

    const stock = evaluateShortVideoExactFacts({
      videoPurpose: "Spring special",
      onScreenText: "Harbor Spring Special. Book now.",
      format: "Vertical",
      footageMaterials: "Use Studio-approved stock if needed.",
    });
    expect(stock.ok).toBe(false);
    if (!stock.ok) expect(stock.code).toBe("UNSUPPORTED_SUBSTITUTE");

    const footage = evaluateShortVideoExactFacts({
      videoPurpose: "Spring special",
      onScreenText: "Harbor Spring Special. Book now.",
      format: "Vertical",
      footageMaterials: "phone clip named patio-tour.mp4",
    });
    expect(footage.ok).toBe(false);
    if (!footage.ok) expect(footage.code).toBe("UNSUPPORTED_FOOTAGE_CLAIM");
  });

  it("6 — captions preserve approved customer wording", () => {
    expect(
      shortVideoCaptionsPreserveApprovedWords({
        approvedOnScreenText: "Harbor Spring Special is $20. Book now.",
        captions: ["Harbor Spring Special is $20"],
        cta: "Book now.",
      }),
    ).toBe(true);
    expect(
      shortVideoCaptionsPreserveApprovedWords({
        approvedOnScreenText: "Harbor Spring Special is $20. Book now.",
        captions: ["Guaranteed results this week"],
        cta: "Book now.",
      }),
    ).toBe(false);
  });

  it("7–9 + 11 — ceilings and one video revision", () => {
    expect(harden.ceilings.productionTime).toBe("within 3–5 business days");
    expect(harden.ceilings.videoTransportAttempts).toBe(2);
    expect(harden.ceilings.videoCreativeAttempts).toBe(2);
    expect(harden.ceilings.includedCustomerRevisions).toBe(1);
    expect(harden.ceilings.toolCostWarningCents).toBe(2235);
    expect(harden.ceilings.toolCostFailCents).toBe(4470);
    expect(estimateShotstackPaygCents({ durationSeconds: 18 })).toBe(9);
    expect(estimateShotstackPaygCents({ durationSeconds: 30, renderCount: 5 })).toBe(75);
    const video = getServiceById(SHORT_VIDEO_STANDARD_HARDEN_SKU);
    expect(video?.routeMapTurnaroundLabel?.toLowerCase()).toContain("3–5 business days");
    expect(video?.includedRevisionRounds).toBe(1);
  });

  it("12 + 13 — exhaust fail-closes; timeouts do not escalate to Owner", () => {
    let loop = createGeneralDesignInternalLoop({
      skuId: SHORT_VIDEO_STANDARD_HARDEN_SKU,
      campaignId: "harden-video",
      jobId: "harden-video::v2-rtu-short-video",
      dispatchId: "dd:harden-video::v2-rtu-short-video",
    });
    for (const n of [1, 2, 3]) {
      loop = appendGeneralDesignAttempt(loop, failAttempt(n));
    }
    expect(loop.status).toBe("fail_closed");
    expect(loop.ownerEscalation).toBeNull();

    const supervision = evaluateWorkSupervision({
      campaignId: "harden-video",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "harden-video::v2-rtu-short-video",
          skuId: SHORT_VIDEO_STANDARD_HARDEN_SKU,
          serviceName: "Make Me a Short Video",
          productionAttemptsUsed: 4,
          pendingCustomerRevision: false,
          unresolvedQaFail: true,
          customerInformedOfIncident: true,
          waitingOnCustomer: false,
          failedTransport: false,
          missingAuthorizedNotice: false,
        },
      ],
    });
    expect(supervision.incidents[0]?.recovery).toBe("fail_closed_refund");
    expect(supervision.incidents[0]?.ownerRequired).toBe(false);
    expect(supervision.ownerEscalations).toHaveLength(0);
    expect(supervision.customerMessages[0]?.whatStudioIsDoing).toMatch(
      /will not finish the short video/i,
    );
  });

  it("15 + 16 — advertised files match the delivered $149 stills video", () => {
    const video = getServiceById(SHORT_VIDEO_STANDARD_HARDEN_SKU)!;
    expect(video.priceCents).toBe(14900);
    expect(video.purpose).toBe(SHORT_VIDEO_HONEST_PROMISED_OUTPUT);
    expect(video.deliverables.some((label) => /1080×1920/.test(label))).toBe(true);
    expect(video.deliverables.join(" ")).not.toMatch(/basic edit/i);
    expect(video.exclusions).toEqual(
      expect.arrayContaining([
        "Customer footage editing",
        "Narration or voice",
        "Studio music",
        "Landscape or square versions",
        "Owner or Scout finishing the video after QA exhausts",
      ]),
    );
    const schema = getRouteMapIntakeSchema("rtu-short-video");
    const format = schema.fields.find((field) => field.id === "format");
    expect(format && "options" in format ? format.options : []).toEqual([
      "Vertical 1080×1920 — I post it myself",
    ]);
    expect(clientDeliveryFileLabelsForSku(SHORT_VIDEO_STANDARD_HARDEN_SKU, [])).toEqual([
      SHORT_VIDEO_MP4_LABEL,
    ]);
  });

  it("14 + 15 — assembles the approved MP4 only", () => {
    const hash =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const mp4: StudioFileReference = {
      id: "proof:short-video.mp4",
      clientId: "client",
      campaignId: "video-harden",
      jobId: "video-harden::v2-rtu-short-video",
      category: "review_proof",
      filename: "short-video.mp4",
      fileType: "video/mp4",
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "studio-files-local",
        objectPath:
          "clients/x/campaigns/video-harden/jobs/j/review_proof/v1/short-video.mp4",
        visibilityState: "review-proof",
        originalFilename: "short-video.mp4",
        contentType: "video/mp4",
        checksumSha256: hash,
      },
      visibility: "client_visible",
      versionLabel: "Version 1",
      status: "approved_for_review",
      deliverableKey: "gd-proof:mp4",
      addedBy: { role: "system", displayName: "Studio Machine" },
      addedAt: "2026-09-24T15:00:00.000Z",
    };
    const job: PurchasedJobRecord = {
      jobId: "video-harden::v2-rtu-short-video",
      campaignId: "video-harden",
      skuId: SHORT_VIDEO_STANDARD_HARDEN_SKU,
      serviceName: "Make Me a Short Video",
      spineStatus: "approved",
      productionLane: "complex_build",
      intakeComplete: true,
      updatedAt: "2026-09-24T15:00:00.000Z",
      fileRegistry: [mp4],
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "caa-video",
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
        jobId: "video-harden::v2-rtu-short-video",
        campaignId: "video-harden",
        skuId: SHORT_VIDEO_STANDARD_HARDEN_SKU,
        workVersionId: "v2-rtu-short-video-v1",
        artifactIds: ["v2-rtu-short-video-v1"],
        contentSha256s: [hash],
        qaRecordIds: ["qa-1"],
        reviewPackageId: "pkg:video:approve",
        releaseActivityId: null,
        approvedAt: "2026-09-24T15:00:00.000Z",
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "re-1",
      },
    };
    const assembled = assembleApprovedShortVideoClientDelivery({
      job,
      events: [],
      actor: { role: "system", displayName: "Studio Machine" },
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles?.map((file) => file.fileName)).toEqual([
      "short-video.mp4",
    ]);
  });
});
