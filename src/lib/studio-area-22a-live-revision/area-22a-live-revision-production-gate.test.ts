/**
 * Area 22A — live flyer revision production gate.
 *
 * Fresh controlled customer. Does not remint Maya. Does not write Customer-One.
 * Does not repair the legacy composer. Exercises the live Stage 0 dispatch path.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioArea22aLiveRevisionProductionGateV1 as cfg } from "@/config/studio-area-22a-live-revision-production-gate-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import type { StudioUser } from "@/lib/campaign-store/types";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import {
  factProjectionTruth,
  fingerprintDesignSpec,
  reasonFlyerDesignSpecDeterministic,
  type FlyerDesignSpec,
} from "@/lib/studio-design-renderer";
import {
  buildClearedCustomerLogoMaterial,
  stageGenericCustomerLogoPng,
} from "@/lib/studio-dispatch/cleared-customer-logo";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { readProductionSpendLedger } from "@/lib/studio-dispatch/production-spend-ledger";
import { evaluateFlyerSpecCreativeQuality } from "@/lib/studio-design-renderer/flyer-creative-quality";

const REPO = path.resolve(__dirname, "../../..");
const MAYA_ID = cfg.mayaCampaignId;
const CUSTOMER_ONE_ID = cfg.customerOneFlyerCampaignId;
const SKU = "v2-rtu-flyer" as const;
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const EVIDENCE_DIR = path.join(
  REPO,
  "docs",
  "launch",
  "studio-operating-area-22a-live-revision-production-gate-1",
);

const CLIENT: StudioUser = {
  id: "area22a-controlled-customer",
  email: "area22a@local.dev",
  displayName: "Northshore",
  roles: ["client"],
};

function mayaRevisionUsed(): number {
  const raw = JSON.parse(
    readFileSync(path.join(CAMPAIGNS_DIR, `${MAYA_ID}.json`), "utf8"),
  ) as { record: CampaignRecord };
  return raw.record.revisionRoundsUsed ?? 0;
}

function paidNorthshoreCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const skus = [SKU] as const;
  const totals = computePlanPricingTotals([...skus]);
  const lineItems = buildServiceScopeSnapshot([...skus]);
  const proof = cfg.proofCustomer;
  return {
    campaignId,
    campaignName: proof.campaignName,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Area 22A controlled live revision proof",
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
      checkoutSessionId: `cs_area22a_${campaignId}`,
      paymentIntentId: `pi_area22a_${campaignId}`,
      stripeEventId: `evt_area22a_${campaignId}`,
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
      answers: {
        businessName: proof.businessName,
        flyerPurpose: `Promotional flyer for ${proof.offerName}`,
        callToAction: proof.cta,
        mustInclude: [
          proof.headline,
          `${proof.offerName} — ${proof.priceDisplay}`,
          `${proof.phone}`,
          proof.webDisplay,
          proof.cta,
        ].join(". "),
        materials: "Logo staged for Machine",
        intendedUse: "Both print and digital",
      },
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

function readSpec(pngRelativePath: string | undefined): FlyerDesignSpec | null {
  if (!pngRelativePath) return null;
  const specAbs = path.join(REPO, pngRelativePath.replace(/flyer\.png$/i, "design-spec.json"));
  if (!existsSync(specAbs)) return null;
  return JSON.parse(readFileSync(specAbs, "utf8")) as FlyerDesignSpec;
}

function pngSize(absolutePath: string): { width: number; height: number } | null {
  try {
    const bytes = readFileSync(absolutePath);
    if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  } catch {
    return null;
  }
}

describe("AREA 22A live revision production gate", () => {
  const ids: string[] = [];
  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it("treats a CTA-as-headline revision as new request identity, not reused v1", () => {
    const truth = {
      campaignId: "area22a-fingerprint",
      jobId: `area22a-fingerprint::${SKU}`,
      dispatchId: "dd-area22a",
      skuId: SKU,
      fixtureId: "area22a",
      label: "proof",
      outputMode: "customer" as const,
      businessName: cfg.proofCustomer.businessName,
      wordmark: cfg.proofCustomer.businessName,
      descriptor: cfg.proofCustomer.offerName,
      headline: cfg.proofCustomer.headline,
      offerName: cfg.proofCustomer.offerName,
      priceDisplay: cfg.proofCustomer.priceDisplay,
      dateWindow: "",
      body: cfg.proofCustomer.headline,
      cta: cfg.proofCustomer.cta,
      phone: cfg.proofCustomer.phone,
      webDisplay: cfg.proofCustomer.webDisplay,
      webUrl: `https://${cfg.proofCustomer.webDisplay}`,
      disclaimer: "",
      brandColors: {
        primary: "#1F3A5F",
        secondary: "#C4A574",
        background: "#F7F4EF",
        text: "#1A1A1A",
        muted: "#5A6570",
      },
      approvedLogoVariantId: null,
      materials: [],
      requiredTextTokens: [],
      prohibitedClaimPatterns: [],
    };
    const first = reasonFlyerDesignSpecDeterministic(truth);
    const revised = reasonFlyerDesignSpecDeterministic({
      ...truth,
      revisionEmphasis: {
        emphasizeExistingCtaAsHeadline: true,
        instruction: cfg.proofCustomer.revisionInstruction,
      },
    });
    expect(fingerprintDesignSpec(first)).not.toBe(fingerprintDesignSpec(revised));
    expect(fingerprintDesignSpec(factProjectionTruth({ ...truth }))).toBeTruthy();
    expect(revised.revisionEmphasis?.emphasizeExistingCtaAsHeadline).toBe(true);
  });

  it(
    "takes a supported revision through live Stage 0 to Review without Owner rescue",
    async () => {
      expect(cfg.doNotRemintMaya).toBe(true);
      expect(cfg.doNotRepairLegacyComposer).toBe(true);
      expect(cfg.priorCloseConditionNamedMaya).toBe(true);
      const mayaBefore = mayaRevisionUsed();
      const customerOneBefore = existsSync(path.join(CAMPAIGNS_DIR, `${CUSTOMER_ONE_ID}.json`))
        ? readFileSync(path.join(CAMPAIGNS_DIR, `${CUSTOMER_ONE_ID}.json`), "utf8")
        : null;

      const campaignId = `area22a-northshore-${Date.now()}`;
      expect(campaignId).not.toBe(MAYA_ID);
      expect(campaignId).not.toBe(CUSTOMER_ONE_ID);
      ids.push(campaignId);

      const campaign = paidNorthshoreCampaign(campaignId);
      await upsertCampaignRecord(campaign, CLIENT.id);
      const staged = stageGenericCustomerLogoPng({ repoRoot: REPO, campaignId });
      const item = buildClearedCustomerLogoMaterial({
        campaignId,
        skuId: SKU,
        stagedRelativePath: staged,
      });
      const now = new Date().toISOString();
      await writeMaterialsEnvelope({
        campaignId,
        items: [item],
        updatedAt: now,
        syncedAt: now,
        version: 1,
      });

      const first = await ensureDispatchExecution(campaign);
      expect(first.ok, first.ok ? "ok" : `${first.error}: ${first.message}`).toBe(true);
      if (!first.ok) return;

      const firstTasks = await readTasksEnvelope(campaignId);
      const job = firstTasks?.jobRecords?.find((entry) => entry.skuId === SKU);
      const firstObserver = first.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === SKU,
      );
      mkdirSync(EVIDENCE_DIR, { recursive: true });
      writeFileSync(
        path.join(EVIDENCE_DIR, "AREA-22A-FIRST-PASS.json"),
        `${JSON.stringify(
          {
            ok: first.ok,
            spineStatus: job?.spineStatus ?? null,
            ownerApprovalPending: job?.ownerApprovalPending ?? null,
            qaAuth: job?.internalQaReviewAuthorization ?? null,
            reviewAccess: job ? canClientAccessJobReview(job) : false,
            observer: firstObserver ?? null,
            qaRecords: (firstTasks?.qaRecords ?? []).map((record) => ({
              action: record.action,
              taskId: record.taskId,
              createdAt: record.createdAt,
            })),
          },
          null,
          2,
        )}\n`,
      );
      expect(job).toBeTruthy();
      expect(canClientAccessJobReview(job!)).toBe(true);
      expect(job?.ownerApprovalPending ?? null).not.toBe("before_review");
      expect(first.campaign.revisionRoundsUsed ?? 0).toBe(0);

      expect(firstObserver?.ok).toBe(true);
      expect(firstObserver?.invocationOutcome).toBe("RENDERED");
      const firstSpec = readSpec(firstObserver?.pngRelativePath);
      expect(firstSpec).toBeTruthy();
      expect(firstSpec?.layers.some((layer) => layer.id === "lead-line")).toBe(true);
      expect(firstSpec?.layers.some((layer) => layer.id === "offer-panel")).toBe(true);
      expect(
        evaluateFlyerSpecCreativeQuality(firstSpec!, {
          campaignId,
          jobId: job!.jobId,
          dispatchId: "area22a",
          skuId: SKU,
          fixtureId: "area22a",
          label: "proof",
          outputMode: "customer",
          businessName: cfg.proofCustomer.businessName,
          wordmark: cfg.proofCustomer.businessName,
          descriptor: cfg.proofCustomer.offerName,
          headline: cfg.proofCustomer.headline,
          offerName: cfg.proofCustomer.offerName,
          priceDisplay: cfg.proofCustomer.priceDisplay,
          dateWindow: "",
          body: cfg.proofCustomer.headline,
          cta: cfg.proofCustomer.cta,
          phone: cfg.proofCustomer.phone,
          webDisplay: cfg.proofCustomer.webDisplay,
          webUrl: `https://${cfg.proofCustomer.webDisplay}`,
          disclaimer: "",
          brandColors: firstSpec!.colors,
          approvedLogoVariantId: null,
          materials: firstSpec!.materials,
          requiredTextTokens: [],
          prohibitedClaimPatterns: [],
        }).some((finding) => finding.id === "hollow_offer_panel"),
      ).toBe(false);

      const keys = (job?.deliverablePrep ?? []).map((entry) => entry.deliverableKey);
      const feedback = createEmptyJobReviewFeedback(campaignId, job!.jobId, keys);
      const deliverableKey = keys[0] ?? "deliverable-1";
      feedback.sectionStatuses[deliverableKey] = "revision";
      feedback.stickyNotes.push({
        id: `sticky-${campaignId}`,
        deliverableKey,
        color: "coral",
        text: cfg.proofCustomer.revisionInstruction,
        createdAt: now,
      });

      const requested = applyReviewRoomPatch(
        firstTasks!,
        first.campaign,
        job!,
        { action: "request_revision", feedback },
        CLIENT,
        { staffByUserId: {}, staffCapabilities: {} },
      );
      expect(requested.ok, requested.ok ? "ok" : requested.ok === false ? requested.error : "").toBe(
        true,
      );
      if (!requested.ok) return;
      expect(requested.correctionUseCreated).toBe(true);
      expect(requested.job.spineStatus).toBe("revision_requested");
      expect(requested.updatedCampaign?.revisionRoundsUsed).toBe(0);
      expect(
        requested.updatedCampaign?.machineFlyerRevisionEmphasis?.emphasizeExistingCtaAsHeadline,
      ).toBe(true);
      expect(canClientAccessJobReview(requested.job)).toBe(false);

      await upsertCampaignRecord(requested.updatedCampaign!, CLIENT.id);
      await writeTasksEnvelope(requested.envelope);

      const produced = await ensureDispatchExecution(requested.updatedCampaign!);
      expect(produced.ok, produced.ok ? "ok" : `${produced.error}: ${produced.message}`).toBe(true);
      if (!produced.ok) return;

      const afterTasks = await readTasksEnvelope(campaignId);
      const afterJob = afterTasks?.jobRecords?.find((entry) => entry.skuId === SKU);
      const afterAccounting = deriveCorrectionAccounting({
        campaign: produced.campaign,
        envelope: afterTasks!,
      });
      const observer = produced.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === SKU,
      );
      const attempts =
        observer?.internalLoop?.attempts?.length ??
        produced.campaign.internalProductionLoop?.attempts?.length ??
        0;
      const dispatchId = produced.campaign.dispatchExecution?.records.find(
        (record) => record.skuId === SKU,
      )?.dispatchId;
      const spend = dispatchId
        ? readProductionSpendLedger({
            repoRoot: REPO,
            artifactRootRel: customerArtifactRootRel(campaignId, dispatchId),
          })
        : { readable: true, entries: [], unreadableLines: 0 };
      const spendUsd = spend.entries.reduce((sum, entry) => sum + (entry.totalCostUsd ?? 0), 0);

      const reviewOpened =
        afterJob?.spineStatus === "ready_for_review" &&
        canClientAccessJobReview(afterJob) &&
        (afterJob.ownerApprovalPending ?? null) !== "before_review";

      if (!reviewOpened) {
        mkdirSync(EVIDENCE_DIR, { recursive: true });
        writeFileSync(
          path.join(EVIDENCE_DIR, "AREA-22A-NOT-READY.json"),
          `${JSON.stringify(
            {
              packageId: cfg.packageId,
              verdict: "NOT READY TO CLOSE",
              campaignId,
              spineStatus: afterJob?.spineStatus ?? null,
              ownerApprovalPending: afterJob?.ownerApprovalPending ?? null,
              reviewAccess: afterJob ? canClientAccessJobReview(afterJob) : false,
              accounting: afterAccounting,
              attempts,
              spendUsd,
              observer,
            },
            null,
            2,
          )}\n`,
        );
      }

      expect(reviewOpened).toBe(true);
      expect(afterAccounting.used).toBe(1);
      expect(afterAccounting.remaining).toBe(0);
      expect(produced.campaign.revisionRoundsUsed).toBe(1);
      expect(afterJob?.ownerApprovalPending ?? null).not.toBe("before_review");
      expect(attempts).toBeGreaterThan(0);
      expect(attempts).toBeLessThanOrEqual(cfg.maxSeriousAttempts);
      expect(spendUsd).toBe(0);

      const revisedSpec = readSpec(observer?.pngRelativePath);
      expect(revisedSpec).toBeTruthy();
      expect(revisedSpec?.revisionEmphasis?.emphasizeExistingCtaAsHeadline).toBe(true);
      const lead = revisedSpec?.layers.find((layer) => layer.id === "lead-line");
      expect(lead && "content" in lead ? lead.content : "").toBe(cfg.proofCustomer.cta);
      const eyebrow = revisedSpec?.layers.find((layer) => layer.id === "eyebrow");
      expect(eyebrow && "content" in eyebrow ? String(eyebrow.content) : "").toMatch(
        /SPRING OPEN HOUSE/i,
      );
      expect(
        revisedSpec?.layers.some((layer) => {
          if (layer.type !== "text") return false;
          return layer.content.includes(cfg.proofCustomer.priceDisplay);
        }),
      ).toBe(true);
      expect(
        evaluateFlyerSpecCreativeQuality(revisedSpec!, {
          campaignId,
          jobId: afterJob!.jobId,
          dispatchId: dispatchId ?? "area22a",
          skuId: SKU,
          fixtureId: "area22a",
          label: "proof",
          outputMode: "customer",
          businessName: cfg.proofCustomer.businessName,
          wordmark: cfg.proofCustomer.businessName,
          descriptor: cfg.proofCustomer.offerName,
          headline: cfg.proofCustomer.headline,
          offerName: cfg.proofCustomer.offerName,
          priceDisplay: cfg.proofCustomer.priceDisplay,
          dateWindow: "",
          body: cfg.proofCustomer.headline,
          cta: cfg.proofCustomer.cta,
          phone: cfg.proofCustomer.phone,
          webDisplay: cfg.proofCustomer.webDisplay,
          webUrl: `https://${cfg.proofCustomer.webDisplay}`,
          disclaimer: "",
          brandColors: revisedSpec!.colors,
          approvedLogoVariantId: null,
          materials: revisedSpec!.materials,
          requiredTextTokens: [],
          prohibitedClaimPatterns: [],
          revisionEmphasis: revisedSpec!.revisionEmphasis,
        }).some((finding) => finding.id === "hollow_offer_panel"),
      ).toBe(false);

      const pngRel = observer?.pngRelativePath;
      expect(pngRel).toBeTruthy();
      const pngAbs = path.join(REPO, pngRel!);
      expect(existsSync(pngAbs)).toBe(true);
      const pdfAbs = path.join(REPO, pngRel!.replace(/\.png$/i, ".pdf"));
      expect(existsSync(pdfAbs)).toBe(true);
      const measured = pngSize(pngAbs);
      expect(measured?.width).toBeGreaterThan(800);
      expect(measured?.height).toBeGreaterThan(800);

      expect(mayaRevisionUsed()).toBe(mayaBefore);
      if (customerOneBefore) {
        expect(readFileSync(path.join(CAMPAIGNS_DIR, `${CUSTOMER_ONE_ID}.json`), "utf8")).toBe(
          customerOneBefore,
        );
      }
      const mayaEnvelope = await readCampaignEnvelope(MAYA_ID);
      expect(mayaEnvelope?.record.campaignId).toBe(MAYA_ID);

      mkdirSync(EVIDENCE_DIR, { recursive: true });
      const proofCopy = path.join(EVIDENCE_DIR, "northshore-revised-flyer.png");
      writeFileSync(proofCopy, readFileSync(pngAbs));
      writeFileSync(
        path.join(EVIDENCE_DIR, "AREA-22A-EVIDENCE.json"),
        `${JSON.stringify(
          {
            packageId: cfg.packageId,
            verdict: "PASS WITH EXPLICIT LIMITS",
            campaignId,
            mayaUntouched: true,
            customerOneUntouched: true,
            path: "live_stage0",
            revisionInstruction: cfg.proofCustomer.revisionInstruction,
            firstPngSha256: firstObserver?.pngContentSha256 ?? null,
            revisedPngSha256: observer?.pngContentSha256 ?? null,
            firstRenderVersion: firstObserver?.renderVersion ?? null,
            revisedRenderVersion: observer?.renderVersion ?? null,
            attempts,
            spendUsd,
            reviewOpened: true,
            ownerApprovalPending: afterJob?.ownerApprovalPending ?? null,
            revisionRoundsUsed: produced.campaign.revisionRoundsUsed,
            lead: lead && "content" in lead ? lead.content : null,
            pngRelativePath: pngRel,
            measured,
          },
          null,
          2,
        )}\n`,
      );
    },
    360_000,
  );
});
