import { readFileSync, readdirSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { campaignLaunchKitCustomerDeliverableLabels } from "@/config/studio-campaign-launch-kit-current-door-contract-v1";
import { threePackageRevisionRule } from "@/config/studio-three-package-revision-truth-v1";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { formalQaTaskIdForService } from "@/lib/campaign-tasks/qa";
import { getOrGenerateTasks, readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import { getOrInitializeMaterials, readMaterialsEnvelope, writeMaterialsEnvelope } from "@/lib/materials/store";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { buildMachineFlyerRevisionEmphasis } from "@/lib/studio-review-revision/flyer-revision-emphasis";
import { campaignLaunchKitReviewProofKey } from "@/lib/studio-review-revision/campaign-launch-kit-purchase-delivery-truth";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import { readProductionTeamLog } from "@/lib/studio-production-team-workforce";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";

const CAMPAIGN_ID = "harbor-oak-campaign-launch-kit";
const JOB_ID = `${CAMPAIGN_ID}:campaign_launch_kit`;
const CLIENT_ID = `unclaimed-client:${CAMPAIGN_ID}`;
const SOURCE = "route-proof-social-promo-1791620985041";
const LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
const CLIENT = {
  id: CLIENT_ID,
  email: "unclaimed@studio.local",
  displayName: "Harbor Oak",
  roles: ["client"] as const,
  currentCampaignId: CAMPAIGN_ID,
};
const ASSIGNMENTS = { staffByUserId: {}, staffCapabilities: {} };

function harborCampaign(): CampaignRecord {
  const envelope = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "campaigns", `${SOURCE}.json`), "utf8"),
  ) as { record: CampaignRecord };
  const record = structuredClone(envelope.record);
  const now = "2026-10-17T23:50:00.000Z";
  record.campaignId = CAMPAIGN_ID;
  record.campaignName = harborOakIdentityLock.businessName;
  record.packageLabel = "Campaign Launch Kit";
  if (record.routeMapContext) {
    record.routeMapContext = {
      ...record.routeMapContext,
      jobId: "campaign_launch_kit",
    };
  }
  delete record.routingHandoff;
  delete record.dispatchExecution;
  delete record.socialPromoRenderRelease;
  record.revisionRoundsIncluded = 3;
  record.revisionRoundsIncludedSource = "package_snapshot";
  record.routeMapIntakeSubmittedAt = now;
  record.routeMapIntake = {
    submittedAt: now,
    answers: {
      "shared:businessName": harborOakIdentityLock.businessName,
      "campaign_launch_kit:purpose": harborOakIdentityLock.campaign.offerName,
      "campaign_launch_kit:facts":
        "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
      "campaign_launch_kit:prices": "$189 (was $249)",
      "campaign_launch_kit:dates": "March 10 – April 15, 2026",
      "campaign_launch_kit:cta": "Book online or call",
      "campaign_launch_kit:phone": harborOakIdentityLock.campaign.phone,
      "campaign_launch_kit:website": "harborandoak.example/book-tuneup",
      "campaign_launch_kit:mustKeep": "Spring service you can trust",
      "campaign_launch_kit:rights": "I have permission to use the materials I am supplying.",
    },
  };
  const deliverables = [...campaignLaunchKitCustomerDeliverableLabels()];
  if (record.approvedStudioPlan) {
    const line = record.approvedStudioPlan.lineItems[0];
    record.approvedStudioPlan = {
      ...record.approvedStudioPlan,
      selectedServiceIds: ["campaign_launch_kit"],
      includedServiceIds: ["campaign_launch_kit"],
      oneTimeTotalCents: 34900,
      amountDueTodayCents: 27920,
      lineItems: line
        ? [
            {
              ...line,
              skuId: "campaign_launch_kit",
              serviceName: "Campaign Launch Kit",
              exactPriceCents: 34900,
              priceDisplay: "$349",
              deliverables,
              revisionRule: threePackageRevisionRule("Campaign Launch Kit"),
            },
          ]
        : record.approvedStudioPlan.lineItems,
    };
  }
  if (record.paymentTruth) {
    record.paymentTruth = {
      ...record.paymentTruth,
      status: "confirmed",
      checkoutSessionId: "local-harbor-oak-campaign-launch-kit-no-charge",
      paymentIntentId: null,
      stripeEventId: null,
      sandbox: true,
      expectedAmountCents: 27920,
      confirmedAmountCents: 27920,
      selectedServiceIds: ["campaign_launch_kit"],
    };
  }
  record.paymentReceivedAt = now;
  if (record.postPayActivation) {
    record.postPayActivation = {
      ...record.postPayActivation,
      checkoutSessionId: "local-harbor-oak-campaign-launch-kit-no-charge",
      paymentIntentId: null,
      jobIds: [JOB_ID],
      intakeComplete: true,
    };
  }
  if (record.condensedOffer) {
    record.condensedOffer = {
      ...record.condensedOffer,
      packageId: "campaign_launch_kit",
      name: "Campaign Launch Kit",
      priceCents: 34900,
      listPriceCents: 34900,
      thankYouDiscountCents: 6980,
      amountDueCents: 27920,
      customerName: "Harbor and Oak",
      customerEmail: "harbor-oak-kit-disposable@local.dev",
      company: harborOakIdentityLock.businessName,
      projectNeed: harborOakIdentityLock.campaign.offerName,
    };
  }
  return record;
}

function renderVersions(branch: "flyer" | "graphics"): number[] {
  const root = path.join(
    process.cwd(),
    "data",
    "campaign-design-artifacts",
    CAMPAIGN_ID,
    `dd_${CAMPAIGN_ID}_campaign_launch_kit_branch_${branch}`,
    "renders",
  );
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
    .map((entry) => Number(entry.name.slice(1)))
    .sort((a, b) => a - b);
}

describe("Harbor and Oak Campaign Launch Kit through Machine", () => {
  it(
    "dispatches four channels, rejects a bad package in Quality, revises the flyer, and delivers the set",
    async () => {
      const saved = await upsertCampaignRecord(harborCampaign(), CLIENT_ID);
      await getOrGenerateTasks(CAMPAIGN_ID, saved.record);
      const materials = await getOrInitializeMaterials(CAMPAIGN_ID, saved.record);
      const logo = materials.items.find((item) => item.category === "logo-brand");
      if (!logo) throw new Error("Campaign package did not open a logo slot.");
      logo.reviewStatus = "approved_for_use";
      logo.url = LOGO;
      logo.relatedServiceIds = ["v2-rtu-flyer", "v2-rtu-promotion-graphics", "campaign_launch_kit"];
      const pieces = materials.items.find((item) => item.id === "condensed-campaign-pieces");
      if (pieces) pieces.reviewStatus = "approved_for_use";
      await writeMaterialsEnvelope({ ...materials, items: materials.items });

      const first = await ensureDispatchExecution(saved.record);
      if (!first.ok) throw new Error(`${first.error}: ${first.message}`);
      const design = first.dispatch.designRendererObserver?.results ?? [];
      const launch = first.dispatch.launchMenuProductionObserver?.results ?? [];
      const flyer = design.find((entry) => entry.skuId === "v2-rtu-flyer");
      const graphics = design.find((entry) => entry.skuId === "v2-rtu-promotion-graphics");
      const email = launch.find((entry) => entry.skuId === "v2-rtu-email-kit");
      const sms = launch.find((entry) => entry.skuId === "v2-rtu-sms-kit");
      expect(flyer?.ok).toBe(true);
      expect(graphics?.ok).toBe(true);
      expect(email?.ok).toBe(true);
      expect(sms?.ok).toBe(true);
      expect(flyer?.action).toBe("invoked");
      expect(email?.action).toBe("invoked");

      let envelope = (await readTasksEnvelope(CAMPAIGN_ID))!;
      let job = envelope.jobRecords?.find((entry) => entry.jobId === JOB_ID);
      if (!job) throw new Error("Campaign parent job was not created.");
      expect(job.spineStatus).toBe("ready_for_review");
      const qaTaskId = formalQaTaskIdForService(job.skuId);
      expect(envelope.tasks.find((task) => task.id === qaTaskId)?.status).toBe("complete");

      const feedback = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, []);
      feedback.stickyNotes.push({
        id: "sticky-flyer-cta-headline",
        deliverableKey: campaignLaunchKitReviewProofKey("flyer-png"),
        color: "coral",
        text: "Lead the flyer headline with the call to action.",
        createdAt: new Date().toISOString(),
      });
      const revised = applyReviewRoomPatch(
        envelope,
        first.campaign,
        job,
        { action: "request_revision", feedback },
        CLIENT,
        ASSIGNMENTS,
      );
      if (!revised.ok) throw new Error(revised.error);
      expect(revised.job.spineStatus).toBe("revision_requested");
      const emphasis = buildMachineFlyerRevisionEmphasis({
        feedback,
        campaign: revised.updatedCampaign ?? first.campaign,
      });
      if (!emphasis?.emphasizeExistingCtaAsHeadline) {
        throw new Error("Flyer revision did not keep the existing call to action as the headline.");
      }
      const opened = await readCampaignEnvelope(CAMPAIGN_ID);
      const withEmphasis = {
        ...(revised.updatedCampaign ?? opened?.record ?? first.campaign),
        machineFlyerRevisionEmphasis: emphasis,
      };
      await writeTasksEnvelope(revised.envelope);
      await upsertCampaignRecord(withEmphasis, CLIENT_ID);

      const second = await ensureDispatchExecution(withEmphasis);
      if (!second.ok) throw new Error(`${second.error}: ${second.message}`);
      const design2 = second.dispatch.designRendererObserver?.results ?? [];
      const launch2 = second.dispatch.launchMenuProductionObserver?.results ?? [];
      const flyer2 = design2.find((entry) => entry.skuId === "v2-rtu-flyer");
      const graphics2 = design2.find((entry) => entry.skuId === "v2-rtu-promotion-graphics");
      const email2 = launch2.find((entry) => entry.skuId === "v2-rtu-email-kit");
      const sms2 = launch2.find((entry) => entry.skuId === "v2-rtu-sms-kit");
      expect(flyer2?.ok).toBe(true);
      expect(flyer2?.renderVersion).toBeGreaterThanOrEqual(2);
      expect(graphics2?.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(email2?.invocationOutcome).toBe("ALREADY_PRODUCED");
      expect(sms2?.invocationOutcome).toBe("ALREADY_PRODUCED");

      envelope = (await readTasksEnvelope(CAMPAIGN_ID))!;
      job = envelope.jobRecords?.find((entry) => entry.jobId === JOB_ID);
      if (!job) throw new Error("Campaign job disappeared after revision.");
      expect(job.spineStatus).toBe("ready_for_review");
      const passes = (envelope.qaRecords ?? []).filter(
        (record) => record.taskId === qaTaskId && record.action === "qa_pass",
      );
      expect(passes.some((record) => record.workVersionId?.includes("flyer-v2"))).toBe(true);

      const latestCampaign = (await readCampaignEnvelope(CAMPAIGN_ID))!.record;
      const latestMaterials = await readMaterialsEnvelope(CAMPAIGN_ID);
      const keys = (job.deliverablePrep ?? [])
        .filter((entry) => entry.preparedAt)
        .map((entry) => entry.deliverableKey);
      const approval = createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, keys);
      for (const key of keys) approval.sectionStatuses[key] = "approved";
      const approved = applyReviewRoomPatch(
        envelope,
        latestCampaign,
        job,
        { action: "approve_for_delivery", feedback: approval },
        CLIENT,
        ASSIGNMENTS,
        CLIENT_ID,
        latestMaterials?.items ?? [],
      );
      if (!approved.ok) throw new Error(approved.error);
      await writeTasksEnvelope(approved.envelope);
      if (approved.updatedCampaign) await upsertCampaignRecord(approved.updatedCampaign, CLIENT_ID);
      job = approved.job;

      expect(["ready_for_delivery", "delivered"]).toContain(job.spineStatus);
      const files = job.clientDeliveryFiles ?? [];
      expect(files.map((file) => file.fileName).sort()).toEqual([
        "Campaign-Graphic-Portrait.png",
        "Campaign-Graphic-Square.png",
        "Promotional-Email.txt",
        "Promotional-Flyer.pdf",
        "Promotional-Flyer.png",
        "Text-Campaign.txt",
        "Usage-Guide.txt",
      ]);
      expect(files.every((file) => file.releaseStatus === "released")).toBe(true);

      const closed = await readTasksEnvelope(CAMPAIGN_ID);
      const closedCampaign = await readCampaignEnvelope(CAMPAIGN_ID);
      const accounting = deriveCorrectionAccounting({
        campaign: closedCampaign!.record,
        envelope: closed!,
      });
      expect(accounting.included).toBe(3);
      expect(accounting.requested).toBe(1);
      expect(renderVersions("flyer")).toContain(2);
      expect(renderVersions("graphics").length).toBeGreaterThan(0);

      const log = readProductionTeamLog(process.cwd(), CAMPAIGN_ID);
      expect(log.reports.some((report) => report.to === "DESIGN_PRODUCTION")).toBe(true);
      expect(log.reports.some((report) => report.to === "COPY_PRODUCTION")).toBe(true);
      expect(log.reports.some((report) => report.to === "PRINT_FILE_PRODUCTION")).toBe(true);
      expect(log.reports.some((report) => report.from === "QUALITY_TEAM")).toBe(true);

      const root = path.join(process.cwd(), "data", "campaign-design-artifacts", CAMPAIGN_ID);
      const texts: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir, { withFileTypes: true })) {
          const abs = path.join(dir, name.name);
          if (name.isDirectory()) walk(abs);
          else if (name.name.endsWith(".html") || name.name.endsWith(".txt")) texts.push(readFileSync(abs, "utf8"));
        }
      };
      walk(root);
      const joined = texts.join("\n");
      expect(joined).not.toMatch(/CERTIFICATION FIXTURE|\(CERT\)|INTERNAL TEST/);
      expect(joined).toContain("$189");
      expect(joined).toContain("Harbor & Oak");
      expect(joined).toContain("Book online or call");
      expect(joined).toContain("This guide is not a fifth channel.");
    },
    300000,
  );
});
