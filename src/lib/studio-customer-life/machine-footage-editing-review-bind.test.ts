import { createHash } from "crypto";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { buildJobId } from "@/lib/job-control/lane-map";
import { bindMachineVideoIdentityToQaRecords } from "@/lib/studio-customer-life/machine-short-video-review-bind";
import { normalizeContentSha256 } from "@/lib/studio-review-revision/hash";

const SKU = SHORT_FORM_VIDEO_EDITING_SKU;
const FIXTURE_DIR = path.join(process.cwd(), "data", "footage-review-bind-fixture");

function campaignFor(id: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId: id,
    campaignName: "Footage Review Bind Fixture",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "SFV footage QA bind",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 34900,
      confirmedAmountCents: 34900,
      checkoutSessionId: `cs_${id}`,
      selectedServiceIds: [SKU],
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
  } as CampaignRecord;
}

function envelopeFor(campaign: CampaignRecord): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = buildJobId(campaign.campaignId, SKU);
  return {
    campaignId: campaign.campaignId,
    version: 12,
    planFingerprint: "fp-footage-bind",
    updatedAt: now,
    syncedAt: now,
    tasks: [
      {
        id: `${SKU}:qa`,
        familyId: "video_audio",
        catalogFamilyId: "marketing_video",
        title: "Quality review",
        phase: "qa",
        status: "open",
        workflowState: "open",
        relatedServiceIds: [SKU],
        createdAt: now,
        updatedAt: now,
      },
    ],
    jobRecords: [
      {
        jobId,
        campaignId: campaign.campaignId,
        skuId: SKU,
        serviceName: "Short-Form Video Editing",
        spineStatus: "building_concepts",
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
      },
    ],
  } as unknown as ServerTasksEnvelope;
}

afterEach(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("footage editing Review bind", () => {
  it("bindMachineVideoIdentityToQaRecords opens ELIGIBLE_FOR_REVIEW for $349 SKU", () => {
    const campaign = campaignFor("sfv-bind-qa-1");
    const hash = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const bound = bindMachineVideoIdentityToQaRecords({
      skuId: SKU,
      campaign,
      envelope: envelopeFor(campaign),
      mp4ContentSha256: hash,
      renderVersion: 1,
      artifactId: `${SKU}-v1`,
      durationSeconds: 22,
      qaCheckId: "machine_footage_editing_identity",
    });

    expect(bound.bound).toBe(true);
    expect(bound.qaAction).toBe("qa_pass");
    expect(bound.envelope.jobRecords?.[0]?.internalQaReviewAuthorization?.status).toBe(
      "ELIGIBLE_FOR_REVIEW",
    );
    expect(bound.envelope.jobRecords?.[0]?.spineStatus).toBe("ready_for_review");
    expect(
      bound.envelope.qaRecords?.[0]?.artifactBinding?.contentSha256s,
    ).toContain(normalizeContentSha256(hash));
  });

  it("writes review proof bytes when MP4 exists on disk", async () => {
    const rel = "data/footage-review-bind-fixture/proof-v1.mp4";
    const abs = path.join(process.cwd(), rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    const bytes = Buffer.from("footage-mp4-proof-bytes");
    writeFileSync(abs, bytes);
    const hash = createHash("sha256").update(bytes).digest("hex");

    const { presentFootageEditingReviewProof } = await import(
      "@/lib/studio-review-revision/present-footage-editing-review"
    );
    const campaign = campaignFor("sfv-present-1");
    const bound = bindMachineVideoIdentityToQaRecords({
      skuId: SKU,
      campaign,
      envelope: envelopeFor(campaign),
      mp4ContentSha256: hash,
      renderVersion: 1,
      artifactId: `${SKU}-v1`,
    });

    const presented = await presentFootageEditingReviewProof({
      campaign,
      envelope: bound.envelope,
      mp4RelativePath: rel,
      mp4ContentSha256: hash,
      renderVersion: 1,
    });
    expect(presented.presented).toBe(true);
    const proof = presented.envelope.jobRecords?.[0]?.fileRegistry?.find(
      (ref) => ref.category === "review_proof",
    );
    expect(proof?.fileType).toBe("video/mp4");
  });
});
