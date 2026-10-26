import { readFileSync, readdirSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { formalQaTaskIdForService } from "@/lib/campaign-tasks/qa";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { socialPromoReviewProofKey } from "@/lib/studio-review-revision/social-promo-purchase-delivery-truth";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";

const CAMPAIGN_ID = "harbor-oak-social-promo-quality-gate";
const JOB_ID = "harbor-oak-social-promo-quality-gate:social_and_promo_graphics";
const CLIENT = {
  id: "harbor-oak-customer",
  email: "owner@harborandoak.example",
  displayName: "Harbor Oak",
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

describe("Harbor and Oak Social closure on the existing job", () => {
  it(
    "revises the square graphic, checks the whole package, and releases final delivery",
    async () => {
      const opened = await readCampaignEnvelope(CAMPAIGN_ID);
      const tasks = await readTasksEnvelope(CAMPAIGN_ID);
      if (!opened || !tasks) throw new Error("Existing Harbor and Oak job is missing.");
      let campaign = opened.record;
      let envelope = tasks;
      let job = envelope.jobRecords?.find((entry) => entry.jobId === JOB_ID);
      if (!job) throw new Error("Parent Social job is missing.");

      const beforeVersions = renderVersions("campaign_graphics");
      const socialBefore = renderVersions("social_posts");
      expect(socialBefore).toContain(1);
      expect(beforeVersions).toContain(1);

      if (job.spineStatus === "ready_for_review") {
        const accounting = deriveCorrectionAccounting({ campaign, envelope });
        if (accounting.requested === 0) {
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
            campaign,
            job,
            { action: "request_revision", feedback },
            CLIENT,
            ASSIGNMENTS,
          );
          if (!revised.ok) throw new Error(revised.error);
          envelope = revised.envelope;
          job = revised.job;
          if (revised.updatedCampaign) campaign = revised.updatedCampaign;
          await writeTasksEnvelope(envelope);
          await upsertCampaignRecord(campaign, opened.clientUserId);
          expect(job.spineStatus).toBe("revision_requested");
        }
      }

      const latest = await readCampaignEnvelope(CAMPAIGN_ID);
      if (!latest) throw new Error("Campaign disappeared during revision.");
      campaign = latest.record;
      job = (await readTasksEnvelope(CAMPAIGN_ID))?.jobRecords?.find((entry) => entry.jobId === JOB_ID);
      if (!job) throw new Error("Parent job disappeared during revision.");

      if (job.spineStatus !== "ready_for_delivery" && job.spineStatus !== "delivered") {
        const dispatched = await ensureDispatchExecution(campaign);
        if (!dispatched.ok) throw new Error(`${dispatched.error}: ${dispatched.message}`);
        const results = dispatched.dispatch.designRendererObserver?.results ?? [];
        const social = results.find((entry) => entry.skuId === "v2-rtu-social-posts");
        const graphics = results.find((entry) => entry.skuId === "v2-rtu-promotion-graphics");
        expect(social?.ok).toBe(true);
        expect(graphics?.ok).toBe(true);
        expect(social?.renderVersion).toBe(1);
        expect(graphics?.renderVersion).toBeGreaterThanOrEqual(2);
      }

      envelope = (await readTasksEnvelope(CAMPAIGN_ID))!;
      job = envelope.jobRecords?.find((entry) => entry.jobId === JOB_ID)!;
      const qaTask = envelope.tasks.find(
        (task) => task.id === formalQaTaskIdForService(job.skuId),
      );
      expect(qaTask?.status).toBe("complete");
      expect(qaTask?.workflowState).toBe("complete");
      const passes = (envelope.qaRecords ?? []).filter(
        (record) => record.taskId === qaTask?.id && record.action === "qa_pass",
      );
      expect(passes.some((record) => record.workVersionId?.includes("campaign-graphics-v2"))).toBe(true);

      if (job.spineStatus === "ready_for_review") {
        const materials = await readMaterialsEnvelope(CAMPAIGN_ID);
        const keys = (job.deliverablePrep ?? [])
          .filter((entry) => entry.preparedAt)
          .map((entry) => entry.deliverableKey);
        const feedback = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, keys);
        for (const key of keys) feedback.sectionStatuses[key] = "approved";
        const approved = applyReviewRoomPatch(
          envelope,
          campaign,
          job,
          { action: "approve_for_delivery", feedback },
          CLIENT,
          ASSIGNMENTS,
          opened.clientUserId ?? `unclaimed-client:${CAMPAIGN_ID}`,
          materials?.items ?? [],
        );
        if (!approved.ok) throw new Error(approved.error);
        await writeTasksEnvelope(approved.envelope);
        if (approved.updatedCampaign) {
          await upsertCampaignRecord(approved.updatedCampaign, opened.clientUserId);
        }
        job = approved.job;
      }

      expect(["ready_for_delivery", "delivered"]).toContain(job.spineStatus);
      const files = job.clientDeliveryFiles ?? [];
      expect(files).toHaveLength(8);
      const names = files.map((file) => file.fileName).sort();
      expect(files.every((file) => file.releaseStatus === "released")).toBe(true);
      expect(names).toEqual([
        "Campaign-Graphic-Portrait.png",
        "Campaign-Graphic-Square.png",
        "Social-Post-1.png",
        "Social-Post-2.png",
        "Social-Post-3.png",
        "Social-Post-4.png",
        "Social-Post-Captions.txt",
        "Suggested-Posting-Order.txt",
      ]);

      const closed = await readTasksEnvelope(CAMPAIGN_ID);
      const closedCampaign = await readCampaignEnvelope(CAMPAIGN_ID);
      const accounting = deriveCorrectionAccounting({
        campaign: closedCampaign!.record,
        envelope: closed!,
      });
      expect(accounting.included).toBe(3);
      expect(accounting.requested).toBe(1);
      expect(renderVersions("social_posts")).toEqual([1]);
      expect(renderVersions("campaign_graphics")).toContain(2);

      const squareV2 = path.join(
        process.cwd(),
        "data",
        "campaign-design-artifacts",
        CAMPAIGN_ID,
        `dd_${CAMPAIGN_ID}_social_and_promo_graphics_branch_campaign_graphics`,
        "renders",
        "v2",
        "campaign-graphic-square.png",
      );
      expect(readFileSync(squareV2).length).toBeGreaterThan(8000);
    },
    240000,
  );
});
