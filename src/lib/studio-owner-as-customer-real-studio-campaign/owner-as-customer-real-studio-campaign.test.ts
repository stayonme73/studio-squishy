/**
 * Owner-as-Customer — Tagia hires Social Posts on the live factory path.
 * Does not remint Maya. Does not treat SharedJobTruth as live.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog";
import {
  getCheckoutTimingLabel,
  getRouteMapTurnaroundLabel,
} from "@/catalog/route-map-display";
import type { CampaignRecord } from "@/config/studio-board";
import { getRouteMapJob } from "@/config/route-map-v1";
import { LAUNCH_MENU_HONEST_TIMING_LABEL } from "@/config/studio-menu-readiness-and-demand-freeze-v1";
import { studioOwnerAsCustomerRealStudioCampaignV1 as stamp } from "@/config/studio-owner-as-customer-real-studio-campaign-v1";
import { studioVoiceMachineTeamStressV1 } from "@/config/studio-voice-machine-team-stress-v1";
import type { StudioUser } from "@/lib/campaign-store/types";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { answerCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";
import { mapSocialPostsProjectTruthFromJob } from "@/lib/studio-dispatch/map-social-job-truth";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { readProductionSpendLedger } from "@/lib/studio-dispatch/production-spend-ledger";
import { socialPostsClientDeliveryFileLabels } from "@/lib/studio-review-revision/social-posts-purchase-delivery-truth";

const REPO = path.resolve(__dirname, "../../..");
const SKU = stamp.skuId;
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const EVIDENCE_DIR = path.join(
  REPO,
  "docs",
  "launch",
  "studio-operating-owner-as-customer-real-studio-campaign-1",
);

const CLIENT: StudioUser = {
  id: "owner-as-customer-tagia",
  email: stamp.customer.email,
  displayName: stamp.customer.displayName,
  roles: ["client"],
};

function pngSize(absolutePath: string): { width: number; height: number } | null {
  try {
    const bytes = readFileSync(absolutePath);
    if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  } catch {
    return null;
  }
}

function readySocialRecord(campaignId: string) {
  const jobId = `${campaignId}::${SKU}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: SKU,
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "social",
      controlLane: "standard",
      factFingerprint: `fp-${campaignId}`,
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: SKU,
  });
}

function intakeAnswers(cta: string): Record<string, string> {
  const about = `Promote an offer — ${stamp.customer.offer}. ${stamp.customer.dateWindow}. ${stamp.customer.website}`;
  return {
    businessName: stamp.customer.businessName,
    socialPostsPurposeChoice: "Promote an offer",
    socialPostsActionChoice: "Start now",
    socialPostsPlatformChoice: stamp.customer.platform,
    socialPostsMaterialsChoices: "I can provide a logo",
    postsAbout: about,
    callToAction: `${cta} — ${stamp.customer.website}`,
    platform: `${stamp.customer.platform} — Square feed graphic`,
    materials: "Selected materials path: I can provide a logo",
    wordingHashtags: stamp.customer.mustNotSay.join(" "),
    mustNotSay: stamp.customer.mustNotSay.join(" "),
  };
}

function paidTagiaCampaign(campaignId: string, cta: string): CampaignRecord {
  const now = new Date().toISOString();
  const skus = [SKU] as const;
  const totals = computePlanPricingTotals([...skus]);
  const lineItems = buildServiceScopeSnapshot([...skus]);
  return {
    campaignId,
    campaignName: stamp.customer.businessName,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Owner-as-Customer real Studio pre-launch social posts",
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
      checkoutSessionId: `cs_owner_as_customer_${campaignId}`,
      paymentIntentId: `pi_owner_as_customer_${campaignId}`,
      stripeEventId: `evt_owner_as_customer_${campaignId}`,
      selectedServiceIds: [...skus],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    revisionRoundsIncludedSource: "approved_plan",
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
      lineItems,
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: intakeAnswers(cta),
    },
  };
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

describe("STUDIO-OPERATING-OWNER-AS-CUSTOMER-REAL-STUDIO-CAMPAIGN-1", () => {
  const ids: string[] = [];
  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it("selects Social Posts because the public 11 match and the path is not the easiest flyer", () => {
    const job = getRouteMapJob(SKU);
    const catalog = getServiceById(SKU);
    expect(job?.priceCents).toBe(9900);
    expect(catalog?.priceCents).toBe(9900);
    expect(getRouteMapTurnaroundLabel(catalog!)).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
    expect(getCheckoutTimingLabel(catalog!)).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
    expect(job?.timingLabel).not.toMatch(/\d+\s*[–-]\s*\d+\s+business days/i);
    expect(stamp.skuId).toBe("v2-rtu-social-posts");
    expect(stamp.verdict).toBe("PASS_WITH_EXPLICIT_LIMITS");
    expect(stamp.doNotRemintMaya).toBe(true);
    expect(stamp.sharedJobTruthOnLiveSpine).toBe(false);
    expect(studioVoiceMachineTeamStressV1.sharedJobTruthOnLiveSpine).toBe(false);
    expect(existsSync(path.join(REPO, stamp.stampDoc))).toBe(true);
    expect(existsSync(path.join(REPO, stamp.proofJson))).toBe(true);
  });

  it("Voice answers shelf truth and does not invent a phone the customer never gave", () => {
    const fit = answerCustomerLifeQuestion("I need Instagram posts for my business", {
      campaign: null,
    });
    expect(fit.known).toBe(true);
    expect(fit.text).toMatch(/social/i);
    const price = answerCustomerLifeQuestion("How much are social posts?", {
      campaign: null,
    });
    expect(price.text).toContain("$199");
    expect(price.text).not.toMatch(/\$99/);
    const missing = mapSocialPostsProjectTruthFromJob({
      repoRoot: REPO,
      campaign: {
        ...paidTagiaCampaign("oac-map-missing", stamp.customer.cta),
        routeMapIntake: {
          submittedAt: new Date().toISOString(),
          answers: {
            socialPostsPurposeChoice: "Promote an offer",
            socialPostsActionChoice: "Start now",
            postsAbout: "Promote The Studio",
            callToAction: "Start now",
          },
        },
      },
      dispatchRecord: readySocialRecord("oac-map-missing"),
      materials: [],
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.code).toBe("MISSING_REQUIRED_TRUTH");
      expect(missing.message).not.toMatch(/invent/i);
    }
  });

  it(
    "runs Tagia's Social Posts job on the live hook through revision without Owner rescue",
    async () => {
      const mayaPath = path.join(CAMPAIGNS_DIR, `${stamp.mayaCampaignId}.json`);
      const mayaBefore = existsSync(mayaPath) ? readFileSync(mayaPath, "utf8") : null;
      const customerOnePath = path.join(
        CAMPAIGNS_DIR,
        `${stamp.customerOneFlyerCampaignId}.json`,
      );
      const customerOneBefore = existsSync(customerOnePath)
        ? readFileSync(customerOnePath, "utf8")
        : null;

      const campaignId = `oac-tagia-social-${Date.now()}`;
      expect(campaignId).not.toBe(stamp.mayaCampaignId);
      expect(campaignId).not.toBe(stamp.customerOneFlyerCampaignId);
      ids.push(campaignId);

      const campaign = paidTagiaCampaign(campaignId, stamp.customer.cta);
      await upsertCampaignRecord(campaign, CLIENT.id);

      const beforeMaterials = answerCustomerLifeQuestion(
        "Do you need anything else from me?",
        { campaign },
      );
      expect(beforeMaterials.known).toBe(true);
      expect(beforeMaterials.text.toLowerCase()).not.toMatch(/owner desk|tagia must/);

      const mapped = mapSocialPostsProjectTruthFromJob({
        repoRoot: REPO,
        campaign,
        dispatchRecord: readySocialRecord(campaignId),
        materials: [],
      });
      expect(mapped.ok, mapped.ok ? "ok" : mapped.ok === false ? mapped.message : "").toBe(
        true,
      );
      if (!mapped.ok) return;
      expect(mapped.truth.phone).toBe("");
      expect(mapped.truth.webDisplay).toMatch(/thestudiocompany7\.com/i);
      expect(mapped.truth.priceDisplay).toBe("$69");
      expect(mapped.truth.offerName).toMatch(/Ready-to-use/i);
      expect(mapped.truth.offerName).not.toBe("Ready");
      expect(mapped.truth.approvedLogoVariantId).toBe("wordmark-only");
      expect(mapped.truth.materials).toEqual([]);
      expect(mapped.truth.descriptor.toLowerCase()).not.toBe("wellness studio");

      const first = await ensureDispatchExecution(campaign);
      expect(first.ok, first.ok ? "ok" : `${first.error}: ${first.message}`).toBe(true);
      if (!first.ok) return;

      const firstTasks = await readTasksEnvelope(campaignId);
      const job = firstTasks?.jobRecords?.find((entry) => entry.skuId === SKU);
      const firstObserver = first.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === SKU,
      );
      expect(job).toBeTruthy();
      expect(
        firstObserver?.invocationOutcome,
        JSON.stringify(
          {
            firstOk: first.ok,
            firstError: "error" in first ? first.error : null,
            records: first.campaign.dispatchExecution?.records,
            observer: first.campaign.dispatchExecution?.designRendererObserver?.results,
          },
          null,
          2,
        ),
      ).toBe("RENDERED");
      expect(firstObserver?.ok).toBe(true);
      expect(firstObserver?.ownerRoutineProduction).toBe("NONE");
      expect(canClientAccessJobReview(job!)).toBe(true);
      expect(job?.ownerApprovalPending ?? null).not.toBe("before_review");

      const status = answerCustomerLifeQuestion("What is happening with my project?", {
        campaign: first.campaign,
        tasks: firstTasks ?? undefined,
      });
      expect(status.known).toBe(true);
      expect(status.text).not.toMatch(/\d+\s*[–-]\s*\d+\s+business days/i);
      expect(status.text.toLowerCase()).not.toMatch(/queue position|number \d+ in line/);

      const dispatchId = first.campaign.dispatchExecution?.records.find(
        (record) => record.skuId === SKU,
      )?.dispatchId;
      expect(dispatchId).toBeTruthy();
      const artifactRoot = path.join(
        REPO,
        customerArtifactRootRel(campaignId, dispatchId!),
      );
      const artifactFiles = (await fs.readdir(artifactRoot, { recursive: true })).map(
        String,
      );
      const pngs = artifactFiles.filter((name) => name.toLowerCase().endsWith(".png"));
      expect(pngs.length).toBeGreaterThanOrEqual(4);
      mkdirSync(path.join(EVIDENCE_DIR, "artifacts"), { recursive: true });
      const copied: string[] = [];
      for (const rel of pngs.slice(0, 4)) {
        const abs = path.join(artifactRoot, rel);
        const size = pngSize(abs);
        expect(size, rel).toEqual({ width: 1024, height: 1024 });
        const dest = path.join(EVIDENCE_DIR, "artifacts", path.basename(rel));
        writeFileSync(dest, readFileSync(abs));
        copied.push(dest);
      }
      for (const rel of artifactFiles) {
        if (!/\.(txt|json)$/i.test(rel)) continue;
        if (!/caption|posting-order/i.test(rel)) continue;
        const dest = path.join(EVIDENCE_DIR, "artifacts", path.basename(rel));
        writeFileSync(dest, readFileSync(path.join(artifactRoot, rel)));
        copied.push(dest);
      }

      const labels = socialPostsClientDeliveryFileLabels(SKU, []);
      expect(labels.length).toBeGreaterThanOrEqual(4);

      const keys = (job?.deliverablePrep ?? []).map((entry) => entry.deliverableKey);
      const feedback = createEmptyJobReviewFeedback(campaignId, job!.jobId, keys);
      const deliverableKey = keys[0] ?? "deliverable-1";
      feedback.sectionStatuses[deliverableKey] = "revision";
      feedback.stickyNotes.push({
        id: `sticky-${campaignId}`,
        deliverableKey,
        color: "coral",
        text: `Please use this CTA instead: ${stamp.customer.revisionCta}`,
        createdAt: campaign.createdAt,
      });

      const requested = applyReviewRoomPatch(
        firstTasks!,
        {
          ...first.campaign,
          routeMapIntake: {
            submittedAt: campaign.createdAt,
            answers: intakeAnswers(stamp.customer.revisionCta),
          },
        },
        job!,
        { action: "request_revision", feedback },
        CLIENT,
        { staffByUserId: {}, staffCapabilities: {} },
      );
      expect(requested.ok, requested.ok ? "ok" : requested.ok === false ? requested.error : "").toBe(
        true,
      );
      if (!requested.ok) return;
      expect(requested.job.spineStatus).toBe("revision_requested");
      expect(canClientAccessJobReview(requested.job)).toBe(false);

      await upsertCampaignRecord(requested.updatedCampaign!, CLIENT.id);
      await writeTasksEnvelope(requested.envelope);

      const produced = await ensureDispatchExecution(requested.updatedCampaign!);
      expect(produced.ok, produced.ok ? "ok" : `${produced.error}: ${produced.message}`).toBe(
        true,
      );
      if (!produced.ok) return;

      const afterTasks = await readTasksEnvelope(campaignId);
      const afterJob = afterTasks?.jobRecords?.find((entry) => entry.skuId === SKU);
      const afterAccounting = deriveCorrectionAccounting({
        campaign: produced.campaign,
        envelope: afterTasks!,
      });
      const afterObserver = produced.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === SKU,
      );
      expect(afterObserver?.ok).toBe(true);
      expect(afterObserver?.ownerRoutineProduction).toBe("NONE");
      expect(afterJob && canClientAccessJobReview(afterJob)).toBe(true);
      expect(afterAccounting.used).toBe(1);
      expect(afterAccounting.remaining).toBe(0);
      expect(produced.campaign.revisionRoundsUsed).toBe(1);

      const afterKeys = (afterJob?.deliverablePrep ?? []).map(
        (entry) => entry.deliverableKey,
      );
      const exhaustedFeedback = createEmptyJobReviewFeedback(
        campaignId,
        afterJob!.jobId,
        afterKeys,
      );
      exhaustedFeedback.sectionStatuses[afterKeys[0] ?? keys[0] ?? "deliverable-1"] =
        "revision";
      const exhausted = applyReviewRoomPatch(
        afterTasks!,
        produced.campaign,
        afterJob!,
        {
          action: "request_revision",
          feedback: exhaustedFeedback,
        },
        CLIENT,
        { staffByUserId: {}, staffCapabilities: {} },
      );
      expect(exhausted.ok).toBe(false);
      expect(exhausted.ok === false && exhausted.revisionLimitReached).toBe(true);

      const spend = readProductionSpendLedger({
        repoRoot: REPO,
        artifactRootRel: customerArtifactRootRel(campaignId, dispatchId!),
      });
      const spendUsd = spend.entries.reduce((sum, entry) => sum + (entry.totalCostUsd ?? 0), 0);

      writeFileSync(
        path.join(EVIDENCE_DIR, "proof-run.json"),
        `${JSON.stringify(
          {
            campaignId,
            firstOutcome: firstObserver?.invocationOutcome,
            revisionOutcome: afterObserver?.invocationOutcome,
            pngsCopied: copied.map((file) => path.relative(REPO, file)),
            spendUsd,
            revisionUsed: afterAccounting.used,
            ownerRoutineProduction: "NONE",
            liveStripeUsed: stamp.liveStripeUsed,
            mayaUntouched: mayaBefore === (existsSync(mayaPath) ? readFileSync(mayaPath, "utf8") : null),
          },
          null,
          2,
        )}\n`,
      );

      expect(spendUsd).toBe(0);
      expect(mayaBefore).toBe(
        existsSync(mayaPath) ? readFileSync(mayaPath, "utf8") : null,
      );
      expect(customerOneBefore).toBe(
        existsSync(customerOnePath) ? readFileSync(customerOnePath, "utf8") : null,
      );
      expect(stamp.nextPackageStarted).toBe(false);
      expect(stamp.nextPackageId).toBe(
        "STUDIO-OPERATING-CONTROLLED-OUTSIDE-CUSTOMER-TRIAL-1",
      );
    },
    120_000,
  );
});
