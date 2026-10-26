/**
 * Messy-customer recovery — one fictional Social & Promo Graphics job.
 * Synthetic payment only. Does not touch Harbor Oak or Customer-One.
 */
import { createHash } from "crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { feedbackStudio } from "@/config/feedback-studio";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { formalQaTaskIdForService } from "@/lib/campaign-tasks/qa";
import { getOrGenerateTasks, readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import { resolveClientReviewView } from "@/lib/job-control/review-room-view";
import { getOrInitializeMaterials, readMaterialsEnvelope, writeMaterialsEnvelope } from "@/lib/materials/store";
import { assessSuggestedClassification } from "@/lib/project-activity/classify";
import { submitInformationUpdateRequest } from "@/lib/project-activity/actions";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { socialPromoParentProductionState } from "@/lib/studio-dispatch/social-promo-composite-dispatch";
import { readProductionTeamLog } from "@/lib/studio-production-team-workforce";
import { socialPromoReviewProofKey } from "@/lib/studio-review-revision/social-promo-purchase-delivery-truth";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";

const CAMPAIGN_ID = "messy-customer-social-promo-recovery";
const JOB_ID = `${CAMPAIGN_ID}:social_and_promo_graphics`;
const SOURCE = "route-proof-social-promo-1791620985041";
const LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
const EVIDENCE = path.join(process.cwd(), "docs", "launch", "studio-messy-customer-1", "production-revision.json");
const CLIENT = {
  id: "messy-customer-fictional",
  email: "cedar@example.test",
  displayName: "Cedar Lane",
  roles: ["client"] as const,
  currentCampaignId: CAMPAIGN_ID,
};
const ASSIGNMENTS = { staffByUserId: {}, staffCapabilities: {} };

function renderVersions(branch: "social_posts" | "campaign_graphics"): number[] {
  const root = path.join(
    process.cwd(),
    "data",
    "campaign-design-artifacts",
    CAMPAIGN_ID,
    `dd_${CAMPAIGN_ID}_social_and_promo_graphics_branch_${branch}`,
    "renders",
  );
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
    .map((entry) => Number(entry.name.slice(1)))
    .sort((a, b) => a - b);
}

function fileProof(relativePath: string) {
  const absolute = path.join(process.cwd(), relativePath);
  const bytes = readFileSync(absolute);
  return {
    relativePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function campaign(): CampaignRecord {
  const envelope = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "campaigns", `${SOURCE}.json`), "utf8"),
  ) as { record: CampaignRecord };
  const record = structuredClone(envelope.record);
  const now = "2026-10-18T23:40:00.000Z";
  record.campaignId = CAMPAIGN_ID;
  record.campaignName = harborOakIdentityLock.businessName;
  delete record.routingHandoff;
  delete record.dispatchExecution;
  record.routeMapIntakeSubmittedAt = now;
  record.routeMapIntake = {
    submittedAt: now,
    answers: {
      "shared:businessName": harborOakIdentityLock.businessName,
      "social_and_promo_graphics:purpose": harborOakIdentityLock.campaign.offerName,
      "social_and_promo_graphics:facts":
        "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
      "social_and_promo_graphics:prices": "$189 (was $249)",
      "social_and_promo_graphics:dates": "March 10 – April 15, 2026",
      "social_and_promo_graphics:cta": "Book online or call",
      "social_and_promo_graphics:phone": harborOakIdentityLock.campaign.phone,
      "social_and_promo_graphics:website": "harborandoak.example/book-tuneup",
      "social_and_promo_graphics:mustKeep": "Spring service you can trust",
      "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
    },
  };
  record.socialPromoRenderRelease = {
    releasedAt: now,
    authorizedBy: "owner",
    reason: "Messy-customer recovery. Fictional Harbor and Oak record. Synthetic payment. No new charge.",
  };
  if (record.approvedStudioPlan) {
    record.approvedStudioPlan = {
      ...record.approvedStudioPlan,
      selectedServiceIds: ["social_and_promo_graphics"],
    };
  }
  if (record.paymentTruth) {
    record.paymentTruth = {
      ...record.paymentTruth,
      status: "confirmed",
      checkoutSessionId: "local-messy-customer-recovery-no-charge",
      paymentIntentId: null,
      stripeEventId: null,
      sandbox: true,
      expectedAmountCents: 15920,
      confirmedAmountCents: 15920,
      selectedServiceIds: ["social_and_promo_graphics"],
    };
  }
  record.paymentReceivedAt = now;
  if (record.postPayActivation) {
    record.postPayActivation = {
      ...record.postPayActivation,
      checkoutSessionId: "local-messy-customer-recovery-no-charge",
      paymentIntentId: null,
      jobIds: [JOB_ID],
      intakeComplete: true,
    };
  }
  if (record.condensedOffer) {
    record.condensedOffer = {
      ...record.condensedOffer,
      customerName: "Cedar Lane",
      company: harborOakIdentityLock.businessName,
      projectNeed: harborOakIdentityLock.campaign.offerName,
    };
  }
  return record;
}

describe("Messy customer Social & Promo recovery", () => {
  it(
    "produces the package, revises one graphic, and refuses scope and exhausted asks",
    async () => {
      rmSync(path.join(process.cwd(), "data", "campaign-tasks", `${CAMPAIGN_ID}.json`), { force: true });
      rmSync(path.join(process.cwd(), "data", "campaign-materials", `${CAMPAIGN_ID}.json`), { force: true });
      rmSync(path.join(process.cwd(), "data", "project-activity", `${CAMPAIGN_ID}.json`), { force: true });
      const saved = await upsertCampaignRecord(campaign(), `unclaimed-client:${CAMPAIGN_ID}`);
      await getOrGenerateTasks(CAMPAIGN_ID, saved.record);
      const materials = await getOrInitializeMaterials(CAMPAIGN_ID, saved.record);
      const logo = materials.items.find((item) => item.category === "logo-brand");
      if (!logo) throw new Error("Social package did not open a logo slot.");
      logo.reviewStatus = "approved_for_use";
      logo.url = LOGO;
      logo.relatedServiceIds = ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"];
      await writeMaterialsEnvelope({ ...materials, items: materials.items });

      const first = await ensureDispatchExecution(saved.record);
      if (!first.ok) throw new Error(`${first.error}: ${first.message}`);
      const parent = socialPromoParentProductionState(first.campaign);
      const firstResults = first.dispatch.designRendererObserver?.results ?? [];
      const firstSocial = firstResults.find((entry) => entry.skuId === "v2-rtu-social-posts");
      const firstGraphics = firstResults.find((entry) => entry.skuId === "v2-rtu-promotion-graphics");
      expect(firstSocial?.ok).toBe(true);
      expect(firstGraphics?.ok).toBe(true);
      expect(parent.state).toBe("complete");
      expect(renderVersions("social_posts")).toEqual([1]);
      expect(renderVersions("campaign_graphics")).toEqual([1]);

      let opened = await readCampaignEnvelope(CAMPAIGN_ID);
      let envelope = await readTasksEnvelope(CAMPAIGN_ID);
      if (!opened || !envelope) throw new Error("Campaign disappeared after production.");
      let job = envelope.jobRecords?.find((entry) => entry.jobId === JOB_ID);
      if (!job) throw new Error("Parent Social job is missing.");
      expect(job.spineStatus).toBe("ready_for_review");

      const beforeRevision = resolveClientReviewView({
        campaign: opened.record,
        job,
        envelope,
        materials: materials.items,
      });
      expect(beforeRevision?.spineStatus).toBe("ready_for_review");
      expect(beforeRevision?.revisionRoundsRemaining).toBe(3);
      expect(beforeRevision?.deliverables.length).toBeGreaterThan(0);

      const feedback = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, []);
      feedback.stickyNotes.push({
        id: "sticky-square-composition",
        deliverableKey: socialPromoReviewProofKey("square"),
        color: "coral",
        text: "The square campaign graphic has too much empty space and looks like the first post. Tighten it using the same Harbor and Oak facts.",
        createdAt: new Date().toISOString(),
      });
      const revised = applyReviewRoomPatch(
        envelope,
        opened.record,
        job,
        { action: "request_revision", feedback },
        CLIENT,
        ASSIGNMENTS,
      );
      if (!revised.ok) throw new Error(revised.error);
      await writeTasksEnvelope(revised.envelope);
      if (revised.updatedCampaign) {
        await upsertCampaignRecord(revised.updatedCampaign, opened.clientUserId);
      }
      expect(revised.job.spineStatus).toBe("revision_requested");

      const second = await ensureDispatchExecution(revised.updatedCampaign ?? opened.record);
      if (!second.ok) throw new Error(`${second.error}: ${second.message}`);
      const secondResults = second.dispatch.designRendererObserver?.results ?? [];
      expect(secondResults.find((entry) => entry.skuId === "v2-rtu-social-posts")?.renderVersion).toBe(1);
      expect(secondResults.find((entry) => entry.skuId === "v2-rtu-promotion-graphics")?.renderVersion).toBeGreaterThanOrEqual(2);
      expect(renderVersions("campaign_graphics")).toContain(2);

      envelope = (await readTasksEnvelope(CAMPAIGN_ID))!;
      opened = (await readCampaignEnvelope(CAMPAIGN_ID))!;
      job = envelope.jobRecords?.find((entry) => entry.jobId === JOB_ID)!;
      const qaTask = envelope.tasks.find((task) => task.id === formalQaTaskIdForService(job.skuId));
      const passes = (envelope.qaRecords ?? []).filter(
        (record) => record.taskId === qaTask?.id && record.action === "qa_pass",
      );
      expect(qaTask?.status).toBe("complete");
      expect(passes.some((record) => record.workVersionId?.includes("campaign-graphics-v2"))).toBe(true);
      expect(job.spineStatus).toBe("ready_for_review");

      const afterRevision = resolveClientReviewView({
        campaign: opened.record,
        job,
        envelope,
      });
      expect(afterRevision?.revisionRoundsIncluded).toBe(3);
      expect(afterRevision?.revisionRoundsRemaining).toBe(2);
      expect(afterRevision?.spineStatus).toBe("ready_for_review");

      const storedMaterials = await readMaterialsEnvelope(CAMPAIGN_ID);
      const keys = (job.deliverablePrep ?? []).filter((entry) => entry.preparedAt).map((entry) => entry.deliverableKey);
      const approval = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, keys);
      for (const key of keys) approval.sectionStatuses[key] = "approved";
      const approved = applyReviewRoomPatch(
        envelope,
        opened.record,
        job,
        { action: "approve_for_delivery", feedback: approval },
        CLIENT,
        ASSIGNMENTS,
        opened.clientUserId ?? `unclaimed-client:${CAMPAIGN_ID}`,
        storedMaterials?.items ?? [],
      );
      if (!approved.ok) throw new Error(approved.error);
      await writeTasksEnvelope(approved.envelope);
      if (approved.updatedCampaign) await upsertCampaignRecord(approved.updatedCampaign, opened.clientUserId);
      expect(["ready_for_delivery", "delivered"]).toContain(approved.job.spineStatus);
      expect(approved.job.clientDeliveryFiles?.every((file) => file.releaseStatus === "released")).toBe(true);

      const versionsBeforeBoundary = {
        social: renderVersions("social_posts"),
        graphics: renderVersions("campaign_graphics"),
      };
      const outOfScopeText = "Please add two more posts and an extra video deliverable.";
      expect(assessSuggestedClassification(outOfScopeText)).toBe("project_change");
      const filed = await submitInformationUpdateRequest({
        campaignId: CAMPAIGN_ID,
        user: CLIENT,
        idempotencyKey: "messy-customer-out-of-scope",
        targetKey: "freeform_request",
        requestedValue: outOfScopeText,
        campaign: approved.updatedCampaign ?? opened.record,
      });
      if (!filed.ok) throw new Error(filed.error);
      expect(filed.request.suggestedClassification).toBe("project_change");
      expect(filed.request.status).toBe("needs_studio_review");
      expect(renderVersions("social_posts")).toEqual(versionsBeforeBoundary.social);
      expect(renderVersions("campaign_graphics")).toEqual(versionsBeforeBoundary.graphics);

      const exhaustedEnvelope = structuredClone(approved.envelope);
      const liveUses = exhaustedEnvelope.jobCorrectionUses ?? [];
      const seed = liveUses.find((row) => row.jobId === JOB_ID);
      if (!seed) throw new Error("The completed revision was not recorded.");
      const extras = [1, 2].map((offset) => ({
        ...seed,
        id: `${seed.id}-exhausted-${offset}`,
        idempotencyKey: `${seed.idempotencyKey}:exhausted:${offset}`,
        submittedAt: "2026-10-18T23:41:00.000Z",
        occurredAt: "2026-10-18T23:41:00.000Z",
      }));
      exhaustedEnvelope.jobCorrectionUses = [...liveUses, ...extras];
      const exhaustedJob = exhaustedEnvelope.jobRecords?.find((entry) => entry.jobId === JOB_ID);
      if (!exhaustedJob) throw new Error("Clone lost the job.");
      exhaustedJob.spineStatus = "ready_for_review";
      const exhaustedFeedback = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, []);
      exhaustedFeedback.stickyNotes.push({
        id: "sticky-exhausted",
        deliverableKey: socialPromoReviewProofKey("square"),
        color: "coral",
        text: "Please tighten the square graphic again.",
        createdAt: "2026-10-18T23:50:00.000Z",
      });
      const refused = applyReviewRoomPatch(
        exhaustedEnvelope,
        approved.updatedCampaign ?? opened.record,
        exhaustedJob,
        { action: "request_revision", feedback: exhaustedFeedback },
        CLIENT,
        ASSIGNMENTS,
      );
      expect(refused.ok).toBe(false);
      if (refused.ok) return;
      expect(refused.error).toBe(feedbackStudio.feedbackPanel.revisionLimitShort);
      expect(renderVersions("campaign_graphics")).toEqual(versionsBeforeBoundary.graphics);

      const log = readProductionTeamLog(process.cwd(), CAMPAIGN_ID);
      const squareV1 = fileProof(
        `data/campaign-design-artifacts/${CAMPAIGN_ID}/dd_${CAMPAIGN_ID}_social_and_promo_graphics_branch_campaign_graphics/renders/v1/campaign-graphic-square.png`,
      );
      const squareV2 = fileProof(
        `data/campaign-design-artifacts/${CAMPAIGN_ID}/dd_${CAMPAIGN_ID}_social_and_promo_graphics_branch_campaign_graphics/renders/v2/campaign-graphic-square.png`,
      );
      expect(squareV1.sha256).not.toBe(squareV2.sha256);
      const accounting = deriveCorrectionAccounting({
        campaign: (await readCampaignEnvelope(CAMPAIGN_ID))!.record,
        envelope: (await readTasksEnvelope(CAMPAIGN_ID))!,
      });
      mkdirSync(path.dirname(EVIDENCE), { recursive: true });
      writeFileSync(
        EVIDENCE,
        JSON.stringify(
          {
            campaignId: CAMPAIGN_ID,
            payment: "synthetic sandbox, 15920 cents, no Stripe charge",
            firstProduction: { social: firstSocial, graphics: firstGraphics, parent: parent.state },
            revision: {
              note: feedback.stickyNotes[0]?.text,
              spineAfterRequest: "revision_requested",
              graphicsVersions: renderVersions("campaign_graphics"),
              socialVersions: renderVersions("social_posts"),
              qaPasses: passes.map((record) => record.workVersionId),
            },
            customerReceipt: {
              spineStatus: approved.job.spineStatus,
              files: (approved.job.clientDeliveryFiles ?? []).map((file) => ({
                fileName: file.fileName,
                releaseStatus: file.releaseStatus,
              })),
            },
            reviewBeforeRevision: {
              remaining: beforeRevision?.revisionRoundsRemaining,
              canRequestRevision: beforeRevision?.canRequestRevision,
            },
            reviewAfterRevision: {
              included: afterRevision?.revisionRoundsIncluded,
              remaining: afterRevision?.revisionRoundsRemaining,
              spineStatus: afterRevision?.spineStatus,
            },
            storedAllowance: accounting,
            files: { squareV1, squareV2 },
            outOfScope: {
              text: outOfScopeText,
              suggestedClassification: filed.request.suggestedClassification,
              status: filed.request.status,
              extraProduction: false,
            },
            exhausted: {
              error: refused.error,
              extraProduction: false,
            },
            qualityReports: log.reports.filter((report) => report.from === "QUALITY_TEAM").length,
            productionReports: log.reports.filter((report) => report.to === "DESIGN_PRODUCTION").length,
          },
          null,
          2,
        ),
      );
    },
    600000,
  );
});
