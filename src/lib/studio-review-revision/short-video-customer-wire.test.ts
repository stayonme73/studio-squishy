import { createHash } from "crypto";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  SHORT_VIDEO_MACHINE_REVIEW_SKU,
} from "@/config/studio-review-revision-full-loop-v1";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import {
  bindShortVideoIdentityToQaRecords,
} from "@/lib/studio-customer-life/machine-short-video-review-bind";
import {
  applyShortVideoTimingRevision,
  isPriceOrDateScene,
  normalizeContentSha256,
  presentShortVideoReviewProof,
  shortVideoReviewProofAlreadyPresented,
} from "@/lib/studio-review-revision";
import type { ShotstackWorkPacket } from "@/lib/studio-kitchen-production/video-integration/types";
import { sortProofsByAddedAtDesc } from "@/lib/job-control/version-compare";

const SKU = SHORT_VIDEO_MACHINE_REVIEW_SKU;
const FIXTURE_DIR = path.join(
  process.cwd(),
  "data",
  "campaign-short-video-wire-fixture",
);

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function campaignFor(id: string): CampaignRecord {
  const now = new Date().toISOString();
  const selected = [SKU] as const;
  const totals = computePlanPricingTotals([...selected]);
  return {
    campaignId: id,
    campaignName: "Short Video Wire Fixture",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Room 4B short-video customer wire",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 14900,
      confirmedAmountCents: 14900,
      checkoutSessionId: `cs_${id}`,
      selectedServiceIds: [...selected],
      decisionId: `dec_${id}`,
      factFingerprint: `fp_${id}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...selected],
      includedServiceIds: [...selected],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([...selected]),
      approvedAt: now,
    },
  };
}

function envelopeFor(
  campaign: CampaignRecord,
  spine: "building_concepts" | "ready_for_review" | "revision_requested" = "building_concepts",
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = buildJobId(campaign.campaignId, SKU);
  return {
    campaignId: campaign.campaignId,
    version: 12,
    planFingerprint: "fp-short-video",
    updatedAt: now,
    syncedAt: now,
    tasks: [
      {
        id: `${SKU}:qa`,
        familyId: "video_audio",
        catalogFamilyId: "marketing_video",
        title: "Short Video QA",
        status: "ready",
        serviceName: "Make Me a Short Video",
        phase: "qa",
        relatedServiceIds: [SKU],
        dependsOn: [],
        workflowState: "ready_for_qa",
      },
    ],
    jobRecords: [
      {
        jobId,
        campaignId: campaign.campaignId,
        skuId: SKU,
        serviceName: "Make Me a Short Video",
        spineStatus: spine,
        productionLane: "quick",
        intakeComplete: Boolean(campaign.projectDetailsSubmittedAt),
        updatedAt: now,
      },
    ],
    qaRecords: [],
    jobActivityEvents: [],
  };
}

function samplePacket(): ShotstackWorkPacket {
  return {
    workPacketId: "wire-test-packet",
    workPacketVersion: "wp-wire-v1",
    storyboardVersion: "sb-wire-v1",
    scriptVersionId: "script-wire-1",
    campaignId: "wire-test",
    skuId: SKU,
    label: "timing revision fixture",
    durationMinSeconds: 15,
    durationMaxSeconds: 30,
    durationTargetSeconds: 20,
    aspectRatio: "vertical",
    width: 1080,
    height: 1920,
    exportFormat: "mp4",
    musicAllowed: false,
    stockAllowed: false,
    productionMethod: "shotstack",
    productionRoleOwner: "creative_production",
    voiceArtifact: {
      relativePath: "docs/launch/fixture/voice.mp3",
      contentSha256: "aa".repeat(32),
    },
    exportRelativePath: "docs/launch/fixture/out.mp4",
    ctaCaptionSceneNumber: 4,
    primaryCtaText: "Enroll today",
    requiredShotstackEnv: "v1",
    scenes: [
      {
        sceneNumber: 1,
        assetId: "brand",
        relativePath: "plates/beat-01-brand.png",
        startSeconds: 0,
        endSeconds: 3,
        caption: "Brand",
      },
      {
        sceneNumber: 2,
        assetId: "offer",
        relativePath: "plates/beat-02-offer.png",
        startSeconds: 3,
        endSeconds: 8,
        caption: "$297 Fall Reset",
      },
      {
        sceneNumber: 3,
        assetId: "dates",
        relativePath: "plates/beat-03-dates.png",
        startSeconds: 8,
        endSeconds: 13,
        caption: "September 9",
      },
      {
        sceneNumber: 4,
        assetId: "cta",
        relativePath: "plates/beat-05-cta.png",
        startSeconds: 13,
        endSeconds: 20,
        caption: "Enroll today",
      },
    ],
  };
}

afterEach(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("Room 4B short-video customer wire", () => {
  it("bindShortVideoIdentityToQaRecords opens Review eligibility", () => {
    const campaign = campaignFor("sv-bind-1");
    const hash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const bound = bindShortVideoIdentityToQaRecords({
      campaign,
      envelope: envelopeFor(campaign),
      mp4ContentSha256: hash,
      renderVersion: 1,
      artifactId: "short-video-v1",
      durationSeconds: 24.6,
    });

    expect(bound.bound).toBe(true);
    expect(bound.qaAction).toBe("qa_pass");
    expect(bound.envelope.qaRecords?.[0]?.action).toBe("qa_pass");
    expect(bound.envelope.qaRecords?.[0]?.videoQualityEvidence?.gatePassed).toBe(true);
    expect(bound.envelope.jobRecords?.[0]?.internalQaReviewAuthorization?.status).toBe(
      "ELIGIBLE_FOR_REVIEW",
    );
    expect(bound.envelope.jobRecords?.[0]?.spineStatus).toBe("ready_for_review");
    expect(
      bound.envelope.qaRecords?.[0]?.artifactBinding?.contentSha256s,
    ).toContain(normalizeContentSha256(hash));
  });

  it("presentShortVideoReviewProof registers video/mp4 review proof", async () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const rel = "data/campaign-short-video-wire-fixture/proof-v1.mp4";
    const bytes = Buffer.from("fake-mp4-bytes-for-wire-test-v1");
    writeFileSync(path.join(process.cwd(), rel), bytes);
    const hash = sha256(bytes);
    const campaign = campaignFor("sv-present-1");
    const afterBind = bindShortVideoIdentityToQaRecords({
      campaign,
      envelope: envelopeFor(campaign),
      mp4ContentSha256: hash,
      renderVersion: 1,
      artifactId: "short-video-v1",
    });

    const presented = await presentShortVideoReviewProof({
      campaign,
      envelope: afterBind.envelope,
      mp4RelativePath: rel,
      mp4ContentSha256: hash,
      renderVersion: 1,
      artifactId: "short-video-v1",
    });

    expect(presented.presented).toBe(true);
    const job = presented.envelope.jobRecords?.[0];
    const proof = job?.fileRegistry?.find((ref) => ref.category === "review_proof");
    expect(proof?.fileType).toBe("video/mp4");
    expect(proof?.status).toBe("approved_for_review");
    expect(shortVideoReviewProofAlreadyPresented(job!, hash)).toBe(true);

    const again = await presentShortVideoReviewProof({
      campaign,
      envelope: presented.envelope,
      mp4RelativePath: rel,
      mp4ContentSha256: hash,
      renderVersion: 1,
      artifactId: "short-video-v1",
    });
    expect(again.presented).toBe(false);
  });

  it("applyShortVideoTimingRevision lengthens price/date scene holds", () => {
    const packet = samplePacket();
    expect(isPriceOrDateScene(packet.scenes[1]!, packet)).toBe(true);
    expect(isPriceOrDateScene(packet.scenes[2]!, packet)).toBe(true);
    expect(isPriceOrDateScene(packet.scenes[0]!, packet)).toBe(false);

    const revised = applyShortVideoTimingRevision(packet, {
      packageId: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
      instruction: "The video is too fast around price and dates",
      lengthenPriceDateSceneHolds: true,
      holdExtensionSeconds: 1.5,
      sourceRevisionPackageId: "pkg-1",
      priorWorkVersionId: "short-video-v1",
      recordedAt: new Date().toISOString(),
    });

    const offer = revised.scenes.find((s) => s.sceneNumber === 2)!;
    const dates = revised.scenes.find((s) => s.sceneNumber === 3)!;
    const cta = revised.scenes.find((s) => s.sceneNumber === 4)!;
    expect(offer.endSeconds - offer.startSeconds).toBeCloseTo(6.5, 5);
    expect(dates.endSeconds - dates.startSeconds).toBeCloseTo(6.5, 5);
    expect(dates.startSeconds).toBeCloseTo(9.5, 5);
    expect(cta.startSeconds).toBeCloseTo(16, 5);
    expect(revised.durationTargetSeconds).toBeCloseTo(23, 5);
  });

  it("stale MP4 hash is not presented as current after revision", async () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const v1Rel = "data/campaign-short-video-wire-fixture/proof-stale-v1.mp4";
    const v2Rel = "data/campaign-short-video-wire-fixture/proof-stale-v2.mp4";
    const v1Bytes = Buffer.from("stale-mp4-version-one-bytes");
    const v2Bytes = Buffer.from("revised-mp4-version-two-bytes-longer");
    writeFileSync(path.join(process.cwd(), v1Rel), v1Bytes);
    writeFileSync(path.join(process.cwd(), v2Rel), v2Bytes);
    const hashV1 = sha256(v1Bytes);
    const hashV2 = sha256(v2Bytes);
    expect(hashV1).not.toBe(hashV2);

    const campaign = campaignFor("sv-stale-1");
    let envelope = envelopeFor(campaign);

    const bind1 = bindShortVideoIdentityToQaRecords({
      campaign,
      envelope,
      mp4ContentSha256: hashV1,
      renderVersion: 1,
      artifactId: "short-video-v1",
    });
    const present1 = await presentShortVideoReviewProof({
      campaign,
      envelope: bind1.envelope,
      mp4RelativePath: v1Rel,
      mp4ContentSha256: hashV1,
      renderVersion: 1,
      artifactId: "short-video-v1",
      versionLabel: "Version 1",
    });
    envelope = present1.envelope;

    // Revision path clears prior authorization before rebinding.
    envelope = {
      ...envelope,
      jobRecords: (envelope.jobRecords ?? []).map((job) => ({
        ...job,
        spineStatus: "revision_requested" as const,
        internalQaReviewAuthorization: undefined,
      })),
    };

    const bind2 = bindShortVideoIdentityToQaRecords({
      campaign,
      envelope,
      mp4ContentSha256: hashV2,
      renderVersion: 2,
      artifactId: "short-video-v2",
    });
    const present2 = await presentShortVideoReviewProof({
      campaign,
      envelope: bind2.envelope,
      mp4RelativePath: v2Rel,
      mp4ContentSha256: hashV2,
      renderVersion: 2,
      artifactId: "short-video-v2",
      versionLabel: "Version 2",
    });

    const job = present2.envelope.jobRecords?.[0];
    const proofs = (job?.fileRegistry ?? []).filter(
      (ref) => ref.category === "review_proof",
    );
    expect(proofs.length).toBe(2);
    const current = sortProofsByAddedAtDesc(
      proofs.map((ref) => ({
        id: ref.id,
        filename: ref.filename,
        fileType: ref.fileType,
        accessHref: null,
        versionLabel: ref.versionLabel,
        addedAt: ref.addedAt,
      })),
    )[0];
    expect(current?.versionLabel).toBe("Version 2");
    expect(shortVideoReviewProofAlreadyPresented(job!, hashV1)).toBe(true);
    expect(shortVideoReviewProofAlreadyPresented(job!, hashV2)).toBe(true);
    expect(job?.internalQaReviewAuthorization?.contentSha256s).toContain(
      normalizeContentSha256(hashV2),
    );
    expect(job?.internalQaReviewAuthorization?.contentSha256s).not.toContain(
      normalizeContentSha256(hashV1),
    );
  });
});
