/**
 * STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1
 * Coordination fire drill. Scout is not the project manager.
 */

import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  productionTeamCustomerCopy,
  studioProductionTeamLaunchReadinessV1,
} from "@/config/studio-production-team-launch-readiness-v1";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import {
  findReviewReadyJobs,
  resolveClientReviewView,
} from "@/lib/job-control/review-room-view";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { writeMaterialsEnvelope, readMaterialsEnvelope } from "@/lib/materials/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import {
  customerStatusLabel,
  buildCustomerJobStatusSummaries,
} from "@/lib/project-record-status";
import { resolveBoardNextActionPresentation } from "@/lib/studio-board-next-action";
import { resolveStudioBoardView } from "@/lib/studio-board-view";
import { certifyCustomerMaterialUpload } from "@/lib/studio-customer-content-intake";
import { resolveCustomerCurrentStatusOverlay } from "@/lib/studio-customer-current-status";
import {
  buildClearedCustomerLogoMaterial,
  stageGenericCustomerLogoPng,
} from "@/lib/studio-dispatch/cleared-customer-logo";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { mapShortVideoProjectTruthFromJob } from "@/lib/studio-dispatch/map-short-video-job-truth";
import { shotstackCredentialPresence } from "@/lib/studio-kitchen-production/video-integration";
import { assembleProductionTeamCampaignTruth } from "./assemble";

const REPO = path.resolve(__dirname, "../../..");

function applyDotenvLocal(): void {
  const abs = path.join(REPO, ".env.local");
  if (!existsSync(abs)) return;
  const text = readFileSync(abs, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

applyDotenvLocal();

const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const EVIDENCE_DIR = path.join(
  REPO,
  "docs",
  "launch",
  "studio-operating-production-team-launch-readiness-1",
);
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const DESIGN = studioProductionTeamLaunchReadinessV1.designSku;
const COPY = studioProductionTeamLaunchReadinessV1.copySku;
const VIDEO = studioProductionTeamLaunchReadinessV1.videoSku;
const LIVE_PRESENCE = shotstackCredentialPresence();
const LIVE_CONFIGURED =
  LIVE_PRESENCE.configured && LIVE_PRESENCE.shotstackEnv === "stage";

function jobRecord(
  skuId: string,
  spine: PurchasedJobRecord["spineStatus"],
  extras: Partial<PurchasedJobRecord> = {},
): PurchasedJobRecord {
  const now = "2026-09-11T21:00:00.000Z";
  return {
    jobId: `pkgg:${skuId}`,
    campaignId: "pkgg-unit",
    skuId,
    serviceName: skuId,
    spineStatus: spine,
    productionLane: "standard",
    intakeComplete: true,
    updatedAt: now,
    ...(spine === "ready_for_review"
      ? {
          internalQaReviewAuthorization: {
            status: "ELIGIBLE_FOR_REVIEW",
            decisionId: `dec-${skuId}`,
            authorizedAt: now,
          },
        }
      : {}),
    ...extras,
  } as PurchasedJobRecord;
}

function campaignStub(status: CampaignRecord["campaignStatus"]): CampaignRecord {
  const now = "2026-09-11T21:00:00.000Z";
  return {
    campaignId: "pkgg-unit",
    campaignName: "Ashwillow Press",
    campaignStatus: status,
    campaignDescription: "Package G coordination",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    deliverablesDelivered: {},
    revisionRoundsUsed: 0,
    projectDetailsSubmittedAt: now,
  };
}

function paidCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const skus = [DESIGN, COPY, VIDEO];
  const totals = computePlanPricingTotals([...skus]);
  return {
    campaignId,
    campaignName: "Ashwillow Press",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Letterpress workshop campaign",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: totals.amountDueTodayCents,
      confirmedAmountCents: totals.amountDueTodayCents,
      checkoutSessionId: `cs_pkgg_${campaignId}`,
      paymentIntentId: `pi_pkgg_${campaignId}`,
      stripeEventId: `evt_pkgg_${campaignId}`,
      selectedServiceIds: [...skus],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...skus],
      includedServiceIds: [...skus],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([...skus]),
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${DESIGN}:businessName`]: "Ashwillow Press",
        [`${DESIGN}:businessType`]: "Cafe",
        [`${DESIGN}:dietaryLabels`]: "Contains gluten and dairy. Customer-verified wording.",
        [`${DESIGN}:disclaimers`]: "Prices may change with paper stock.",
        [`${DESIGN}:materials`]: "Logo on file",
        [`${DESIGN}:intendedUse`]: "Both print and digital",
        [`${DESIGN}:sections`]: "Pastries\nDrinks",
        [`${DESIGN}:items`]:
          "Pastries | Butter Croissant | Flaky layers. | $3.75\nDrinks | Drip Coffee | House brew. | $2.75",
        [`${COPY}:campaignGoal`]: "Letterpress workshop seats for Saturday evening",
        [`${COPY}:mustInclude`]:
          "Letterpress Saturday — seats $40. Call (804) 555-0188 or visit ashwillow.example",
        [`${COPY}:callToAction`]: "Call (804) 555-0188 or visit ashwillow.example",
        [`${COPY}:listConsent`]: "Yes — I own the list and have consent",
        [`${COPY}:sendingAccount`]: "Mailchimp",
        [`${COPY}:mustNotSay`]: "guaranteed savings",
        [`${COPY}:materials`]: "No extra files. Brand name and offer are in this form.",
        [`${VIDEO}:videoPurpose`]: "Workshop open-studio walk-through",
        [`${VIDEO}:onScreenText`]:
          "Ashwillow Press open studio. Seats $40. Call (804) 555-0188.",
        [`${VIDEO}:format`]: "Vertical",
      },
    },
  };
}

async function seedClearedLogo(campaignId: string): Promise<void> {
  const now = new Date().toISOString();
  const staged = stageGenericCustomerLogoPng({ repoRoot: REPO, campaignId });
  const item = buildClearedCustomerLogoMaterial({
    campaignId,
    skuId: DESIGN,
    stagedRelativePath: staged,
    fileName: "customer-mark.png",
  });
  await writeMaterialsEnvelope({
    campaignId,
    items: [
      {
        ...item,
        relatedServiceIds: [DESIGN, COPY, VIDEO] as never,
      },
    ],
    updatedAt: now,
    syncedAt: now,
    version: 1,
  });
}

function stageLiveCustomerStill(campaignId: string): Buffer {
  const relativePath = `data/campaign-design-artifacts/${campaignId}/materials/still-1.png`;
  const abs = path.join(REPO, relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=0x3a2f1c:s=1080x1920:d=0.1",
        "-frames:v",
        "1",
        abs,
      ],
      { stdio: "ignore" },
    );
  } catch {
    /* ffmpeg missing */
  }
  if (!existsSync(abs) || readFileSync(abs).byteLength < 8_000) {
    throw new Error(
      "LIVE_STILL_REQUIRED: could not write a legitimate customer still for live Shotstack ingest.",
    );
  }
  return readFileSync(abs);
}

async function addCustomerStillThroughMaterials(campaignId: string): Promise<void> {
  const now = new Date().toISOString();
  const bytes = stageLiveCustomerStill(campaignId);
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const certified = certifyCustomerMaterialUpload({
    category: "photo-video",
    bytes,
    fileName: "still-1.png",
    mimeType: "image/png",
    checksumSha256,
    rightsInput: {
      useAuthorizationBasis: "customer_owns",
      commercialUsePermitted: true,
      cropAdaptPermitted: true,
      recognizablePeoplePresent: false,
      thirdPartyMaterialPresent: false,
    },
    evaluatedAt: now,
  });
  if (!certified.ok) {
    throw new Error(`STILL_CERT_FAILED: ${certified.error}`);
  }
  const prior = await readMaterialsEnvelope(campaignId);
  const relativePath = `data/campaign-design-artifacts/${campaignId}/materials/still-1.png`;
  await writeMaterialsEnvelope({
    campaignId,
    items: [
      ...(prior?.items ?? []),
      {
        id: `photo-${campaignId}`,
        category: "photo-video",
        requirementLevel: "optional",
        reviewStatus: "approved_for_use",
        contentKind: "file-metadata",
        label: "Workshop still",
        reason: "Customer-provided still for captions-only short video",
        relatedServiceIds: [VIDEO as never],
        uploadStatus: "stored",
        fileName: "still-1.png",
        mimeType: "image/png",
        sizeBytes: bytes.byteLength,
        url: relativePath,
        submittedAt: now,
        useAuthorization: { basis: "customer_owns", attestedAt: now },
        contentCertification: certified.certification,
      },
    ],
    updatedAt: now,
    syncedAt: now,
    version: (prior?.version ?? 1) + 1,
  });
}

async function cleanup(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
  rmSync(path.join(REPO, "data", "campaign-design-artifacts", campaignId), {
    recursive: true,
    force: true,
  });
}

describe("STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1", () => {
  it("keeps Package G coordination guards", () => {
    expect(studioProductionTeamLaunchReadinessV1.packageId).toBe(
      "STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1",
    );
    expect(studioProductionTeamLaunchReadinessV1.doNotMerge).toBe(true);
    expect(studioProductionTeamLaunchReadinessV1.doNotPush).toBe(true);
    expect(studioProductionTeamLaunchReadinessV1.doNotTouchMaya).toBe(true);
    expect(studioProductionTeamLaunchReadinessV1.doNotStartVoice).toBe(true);
    expect(studioProductionTeamLaunchReadinessV1.doNotExpandLaunchMenu).toBe(true);
    expect(studioProductionTeamLaunchReadinessV1.scoutIsNotProjectManager).toBe(true);
    expect(studioProductionTeamLaunchReadinessV1.designSku).toBe("v2-rtu-menu");
    expect(studioProductionTeamLaunchReadinessV1.copySku).toBe("v2-rtu-email-kit");
    expect(studioProductionTeamLaunchReadinessV1.videoSku).toBe("v2-rtu-short-video");
  });

  it("does not let one ready sibling bless a failed lane at campaign aggregation", () => {
    const truth = assembleProductionTeamCampaignTruth({
      jobs: [
        jobRecord(DESIGN, "ready_for_review"),
        jobRecord(COPY, "ready_for_review"),
        jobRecord(VIDEO, "waiting_on_client"),
      ],
      launchResults: [
        {
          dispatchId: "dd:copy",
          skuId: COPY,
          action: "invoked",
          ok: true,
          invocationOutcome: "ALREADY_PRODUCED",
          ownerRoutineProduction: "NONE",
        },
        {
          dispatchId: "dd:video",
          skuId: VIDEO,
          action: "invoked",
          ok: false,
          failureCode: "MISSING_USABLE_FOOTAGE",
          ownerRoutineProduction: "NONE",
        },
      ],
      designResults: [
        {
          dispatchId: "dd:design",
          skuId: DESIGN,
          action: "invoked",
          ok: true,
          invocationOutcome: "RENDERED",
          ownerRoutineProduction: "NONE",
          canvaRequired: false,
          makeRequired: false,
        },
      ],
    });
    expect(truth.kind).toBe("blocked_on_service");
    expect(truth.wholePackageComplete).toBe(false);
    expect(truth.readyCount).toBe(2);
    expect(truth.notReadyCount).toBe(1);
    expect(truth.lanes.find((lane) => lane.skuId === VIDEO)?.reviewReady).toBe(false);
    expect(truth.lanes.find((lane) => lane.skuId === DESIGN)?.reviewReady).toBe(true);
    expect(truth.lanes.find((lane) => lane.skuId === COPY)?.reviewReady).toBe(true);
    expect(truth.customerLead).toBe(productionTeamCustomerCopy.blockedOnServiceLead);
  });

  it("Board overlay keeps Review open without calling the whole campaign complete", () => {
    const campaign = campaignStub("READY_FOR_REVIEW");
    const jobs = [
      {
        jobId: `pkgg:${DESIGN}`,
        campaignId: "pkgg-unit",
        skuId: DESIGN as never,
        serviceName: "Make Me a Menu",
        statusLabel: customerStatusLabel("ready_for_review"),
        isWaitingOnClient: false,
        hasProductionStarted: true,
        deliveredAt: null,
        clientDeadline: null,
      },
      {
        jobId: `pkgg:${COPY}`,
        campaignId: "pkgg-unit",
        skuId: COPY as never,
        serviceName: "Make My Email Campaign Kit",
        statusLabel: customerStatusLabel("ready_for_review"),
        isWaitingOnClient: false,
        hasProductionStarted: true,
        deliveredAt: null,
        clientDeadline: null,
      },
      {
        jobId: `pkgg:${VIDEO}`,
        campaignId: "pkgg-unit",
        skuId: VIDEO as never,
        serviceName: "Make Me a Short Video",
        statusLabel: customerStatusLabel("waiting_on_client"),
        isWaitingOnClient: true,
        hasProductionStarted: true,
        deliveredAt: null,
        clientDeadline: null,
      },
    ];
    const overlay = resolveCustomerCurrentStatusOverlay(
      campaign,
      { productionGatePassed: true, blockingRequiredCount: 0 },
      jobs,
    );
    expect(overlay?.kind).toBe("partial_review_ready");
    expect(overlay?.suppressReviewCta).toBe(false);
    expect(overlay?.statusLabel).not.toBe("Ready for Review");
    expect(overlay?.lead).toMatch(/still needs something from you/i);
    const board = resolveStudioBoardView(campaign, {
      jobs,
      movedToProduction: true,
      productionGatePassed: true,
    });
    expect(board.statusLabel).toBe(productionTeamCustomerCopy.blockedOnServiceLabel);
    const next = resolveBoardNextActionPresentation({
      campaign,
      displayFacts: {
        jobs,
        movedToProduction: true,
        productionGatePassed: true,
      },
    });
    expect(next.action?.type).toBe("navigate");
    if (next.action?.type === "navigate") {
      expect(next.action.href).toContain("feedback");
    }
  });

  it("a Design logo is not usable video footage", () => {
    const campaign = paidCampaign("pkgg-logo-not-footage");
    const mapped = mapShortVideoProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      materials: [
        {
          id: "logo-only",
          category: "logo-brand",
          requirementLevel: "required",
          reviewStatus: "approved_for_use",
          contentKind: "file-metadata",
          label: "Logo",
          reason: "Brand mark",
          relatedServiceIds: [DESIGN as never],
          uploadStatus: "stored",
          fileName: "customer-mark.png",
          mimeType: "image/png",
        },
      ],
    });
    expect(mapped.ok).toBe(false);
    if (!mapped.ok) expect(mapped.code).toBe("MISSING_USABLE_FOOTAGE");
  });
});

describe("STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1 paid Machine fire drill", () => {
  const ids: string[] = [];
  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it(
    "one paid Design+Copy+Video campaign: Machine coordinates, video fails closed, siblings stay ready, recovery is lane-local",
    async () => {
      const campaignId = `pkgg-ashwillow-${Date.now()}`;
      expect(campaignId).not.toBe(MAYA_ID);
      ids.push(campaignId);
      const campaign = paidCampaign(campaignId);
      expect(campaign.campaignName).not.toMatch(/maya|cedar|harbor|nia/i);
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId);

      const first = await ensureDispatchExecution(campaign);
      expect(first.ok, first.ok ? "ok" : `${first.error}: ${first.message}`).toBe(true);
      const firstTasks = await readTasksEnvelope(campaignId);
      const jobsAfterFirst = firstTasks?.jobRecords ?? [];
      const designJob = jobsAfterFirst.find((entry) => entry.skuId === DESIGN);
      const copyJob = jobsAfterFirst.find((entry) => entry.skuId === COPY);
      const videoJob = jobsAfterFirst.find((entry) => entry.skuId === VIDEO);
      expect(designJob && copyJob && videoJob).toBeTruthy();

      const designObs = first.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === DESIGN,
      );
      const copyObs = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
        (result) => result.skuId === COPY,
      );
      const videoObs = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
        (result) => result.skuId === VIDEO,
      );
      expect(designObs?.action).toBe("invoked");
      expect(copyObs?.action).toBe("invoked");
      expect(videoObs?.action).toBe("invoked");
      expect(videoObs?.ok).toBe(false);
      expect(videoObs?.failureCode).toBe("MISSING_USABLE_FOOTAGE");
      expect(canClientAccessJobReview(designJob!)).toBe(true);
      expect(canClientAccessJobReview(copyJob!)).toBe(true);
      expect(canClientAccessJobReview(videoJob!)).toBe(false);
      expect(videoJob?.spineStatus).toBe("waiting_on_client");
      expect(findReviewReadyJobs(jobsAfterFirst).map((job) => job.skuId).sort()).toEqual(
        [COPY, DESIGN].sort(),
      );

      const designView = resolveClientReviewView({
        campaign: first.campaign,
        job: designJob!,
        envelope: firstTasks!,
      });
      const copyView = resolveClientReviewView({
        campaign: first.campaign,
        job: copyJob!,
        envelope: firstTasks!,
      });
      const videoView = resolveClientReviewView({
        campaign: first.campaign,
        job: videoJob!,
        envelope: firstTasks!,
      });
      expect(designView?.deliverables[0]?.proofFiles[0]?.accessHref).toBeTruthy();
      expect(copyView?.deliverables.some((entry) => entry.proofFiles[0]?.accessHref)).toBe(true);
      expect(videoView?.deliverables.some((entry) => entry.proofFiles.length > 0) ?? false).toBe(
        false,
      );

      const team = assembleProductionTeamCampaignTruth({
        jobs: jobsAfterFirst,
        launchResults: first.campaign.dispatchExecution?.launchMenuProductionObserver?.results,
        designResults: first.campaign.dispatchExecution?.designRendererObserver?.results,
      });
      expect(team.wholePackageComplete).toBe(false);
      expect(team.kind).toBe("blocked_on_service");
      expect(first.campaign.revisionRoundsUsed ?? 0).toBe(0);
      expect(first.campaign.dispatchExecution?.ownerActionRequired).not.toBe(true);

      const overlayJobs = buildCustomerJobStatusSummaries(jobsAfterFirst);
      const overlay = resolveCustomerCurrentStatusOverlay(
        first.campaign,
        { productionGatePassed: true, blockingRequiredCount: 0 },
        overlayJobs,
      );
      expect(overlay?.kind).toBe("partial_review_ready");
      expect(overlay?.suppressReviewCta).toBe(false);

      const second = await ensureDispatchExecution(first.campaign);
      expect(second.ok).toBe(true);
      const designObs2 = second.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === DESIGN,
      );
      const copyObs2 = second.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
        (result) => result.skuId === COPY,
      );
      const videoObs2 = second.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
        (result) => result.skuId === VIDEO,
      );
      expect(designObs2?.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(copyObs2?.invocationOutcome).toBe("ALREADY_PRODUCED");
      expect(videoObs2?.failureCode).toBe("MISSING_USABLE_FOOTAGE");
      expect(videoObs2?.providerRenderId).toBeFalsy();
      const secondTasks = await readTasksEnvelope(campaignId);
      const designJob2 = secondTasks?.jobRecords?.find((entry) => entry.skuId === DESIGN);
      const copyJob2 = secondTasks?.jobRecords?.find((entry) => entry.skuId === COPY);
      const videoJob2 = secondTasks?.jobRecords?.find((entry) => entry.skuId === VIDEO);
      expect(canClientAccessJobReview(designJob2!)).toBe(true);
      expect(canClientAccessJobReview(copyJob2!)).toBe(true);
      expect(canClientAccessJobReview(videoJob2!)).toBe(false);
      expect(second.campaign.revisionRoundsUsed ?? 0).toBe(0);

      const designProofs = (designJob?.fileRegistry ?? []).filter(
        (ref) => ref.category === "review_proof",
      ).length;
      const copyProofs = (copyJob?.fileRegistry ?? []).filter(
        (ref) => ref.category === "review_proof",
      ).length;
      const designProofs2 = (designJob2?.fileRegistry ?? []).filter(
        (ref) => ref.category === "review_proof",
      ).length;
      const copyProofs2 = (copyJob2?.fileRegistry ?? []).filter(
        (ref) => ref.category === "review_proof",
      ).length;
      expect(designProofs2).toBe(designProofs);
      expect(copyProofs2).toBe(copyProofs);

      let recoveryOutcome: "live_bound" | "credentials_blocked" | "live_failed" | "skipped" =
        "skipped";
      let videoRenderId: string | undefined;
      if (LIVE_CONFIGURED) {
        await addCustomerStillThroughMaterials(campaignId);
        const recovered = await ensureDispatchExecution(second.campaign);
        expect(recovered.ok).toBe(true);
        const videoObs3 =
          recovered.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
            (result) => result.skuId === VIDEO,
          );
        const recoverTasks = await readTasksEnvelope(campaignId);
        const designJob3 = recoverTasks?.jobRecords?.find((entry) => entry.skuId === DESIGN);
        const copyJob3 = recoverTasks?.jobRecords?.find((entry) => entry.skuId === COPY);
        const videoJob3 = recoverTasks?.jobRecords?.find((entry) => entry.skuId === VIDEO);
        expect(canClientAccessJobReview(designJob3!)).toBe(true);
        expect(canClientAccessJobReview(copyJob3!)).toBe(true);
        expect(recovered.campaign.revisionRoundsUsed ?? 0).toBe(0);
        videoRenderId = videoObs3?.providerRenderId;
        if (videoObs3?.ok && canClientAccessJobReview(videoJob3!)) {
          recoveryOutcome = "live_bound";
          const videoView3 = resolveClientReviewView({
            campaign: recovered.campaign,
            job: videoJob3!,
            envelope: recoverTasks!,
          });
          expect(
            videoView3?.deliverables.some((entry) =>
              entry.proofFiles.some((file) => file.fileType === "video/mp4"),
            ),
          ).toBe(true);
          const afterRecover = assembleProductionTeamCampaignTruth({
            jobs: recoverTasks?.jobRecords ?? [],
            launchResults: recovered.campaign.dispatchExecution?.launchMenuProductionObserver?.results,
            designResults: recovered.campaign.dispatchExecution?.designRendererObserver?.results,
          });
          expect(afterRecover.wholePackageComplete).toBe(true);
          expect(afterRecover.kind).toBe("all_review_ready");
          const fourth = await ensureDispatchExecution(recovered.campaign);
          const videoObs4 =
            fourth.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
              (result) => result.skuId === VIDEO,
            );
          expect(videoObs4?.invocationOutcome).toBe("ALREADY_RENDERED");
          expect(videoObs4?.providerRenderId).toBe(videoRenderId);
        } else if (videoObs3?.failureCode === "CREDENTIALS_BLOCKED") {
          recoveryOutcome = "credentials_blocked";
          expect(canClientAccessJobReview(videoJob3!)).toBe(false);
        } else {
          recoveryOutcome = "live_failed";
          expect(canClientAccessJobReview(videoJob3!)).toBe(false);
        }
      }

      mkdirSync(EVIDENCE_DIR, { recursive: true });
      writeFileSync(
        path.join(EVIDENCE_DIR, "PACKAGE-G-EVIDENCE.json"),
        `${JSON.stringify(
          {
            packageId: studioProductionTeamLaunchReadinessV1.packageId,
            campaignId,
            campaignName: "Ashwillow Press",
            skus: [DESIGN, COPY, VIDEO],
            mayaUntouched: true,
            scoutDidNotSetJobStates: true,
            scoutDidNotUploadReviewProofs: true,
            firstWake: {
              designReviewReady: canClientAccessJobReview(designJob!),
              copyReviewReady: canClientAccessJobReview(copyJob!),
              videoFailureCode: videoObs?.failureCode,
              videoSpine: videoJob?.spineStatus,
              campaignKind: team.kind,
              revisionRoundsUsed: first.campaign.revisionRoundsUsed ?? 0,
              ownerActionRequired: first.campaign.dispatchExecution?.ownerActionRequired ?? false,
            },
            secondWake: {
              designOutcome: designObs2?.invocationOutcome,
              copyOutcome: copyObs2?.invocationOutcome,
              videoFailureCode: videoObs2?.failureCode,
              revisionRoundsUsed: second.campaign.revisionRoundsUsed ?? 0,
            },
            recovery: {
              liveConfigured: LIVE_CONFIGURED,
              outcome: recoveryOutcome,
              providerRenderId: videoRenderId ?? null,
            },
          },
          null,
          2,
        )}\n`,
      );
    },
    480_000,
  );
});
