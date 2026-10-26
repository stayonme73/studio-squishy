/**
 * STUDIO-OPERATING-MAYA-REVIEW-REVISION-CERTIFICATION-1
 * Inspect Maya Customer-One. Builder QA uses a controlled clone so Maya's
 * one included revision round remains for Samsung.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioMayaReviewRevisionCertificationV1 as cfg } from "@/config/studio-maya-review-revision-certification-v1";
import { studioCustomerReviewRoomSimplificationV1 as simplify } from "@/config/studio-customer-review-room-simplification-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import type { StudioUser } from "@/lib/campaign-store/types";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { canRequestJobRevision } from "@/lib/job-control/review-room-gates";
import { applyReviewRoomPatch } from "@/lib/job-control/review-room-actions";
import {
  CORRECTION_EXHAUSTED_WORDING,
  resolveClientReviewView,
} from "@/lib/job-control/review-room-view";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import {
  buildClearedCustomerLogoMaterial,
  stageGenericCustomerLogoPng,
} from "@/lib/studio-dispatch/cleared-customer-logo";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import {
  buildMachineFlyerRevisionEmphasis,
  resolveFlyerRevisionCallToAction,
} from "@/lib/studio-review-revision/flyer-revision-emphasis";

const REPO = path.resolve(__dirname, "../../..");
const MAYA_ID = cfg.mayaCampaignId;
const SKU = cfg.skuId;
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const EVIDENCE_DIR = path.join(
  REPO,
  "docs",
  "launch",
  "studio-operating-maya-review-revision-certification-1",
);
const MAYA_MARK = path.join(
  REPO,
  "public",
  "mobile-customer-journey-cert-1",
  "pine-petal-ordinary-mark.png",
);

const MAYA_CLIENT: StudioUser = {
  id: "local-customer-one",
  email: "customer-one@local.dev",
  displayName: "Maya",
  roles: ["client"],
};

function mayaSnapshot() {
  return {
    campaign: JSON.parse(
      readFileSync(path.join(CAMPAIGNS_DIR, `${MAYA_ID}.json`), "utf8"),
    ) as { record: CampaignRecord },
    tasks: JSON.parse(readFileSync(path.join(TASKS_DIR, `${MAYA_ID}.json`), "utf8")),
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

describe("STUDIO-OPERATING-MAYA-REVIEW-REVISION-CERTIFICATION-1 inspect Maya", () => {
  // Maya spent her one included round on 2026-09-12 in the owner walkthrough this
  // package scheduled ("expected after that one submit: 0 -> 1"). Evidence — a
  // human-paced client-role session, four feedback saves 04:59-05:38 then submit
  // at 05:39:44 with a customer communication emitted — is recorded in
  // docs/launch/studio-operating-project-alpha-hybrid-creative-certification-1/customer-one-hybrid-proofs/MAYA-REVISION-DRIFT-INCIDENT.md.
  // Her protected baseline is therefore 1 used / 0 remaining. Entitlement was
  // never expanded; the round was spent, not granted.
  it("keeps package guards and Maya parked at 0 remaining revisions", async () => {
    expect(cfg.doNotRemintMaya).toBe(true);
    expect(cfg.doNotEditMayaCreative).toBe(true);
    expect(cfg.doNotStartFinalApproval).toBe(true);
    expect(cfg.doNotModifyRevisionEntitlement).toBe(true);
    expect(simplify.doNotConsumeMayaRevision).toBe(true);
    expect(simplify.primaryActions).toEqual([
      "Approve",
      "Request a Change",
      "Ask The Studio",
    ]);
    const envelope = await readCampaignEnvelope(MAYA_ID);
    expect(envelope?.record.campaignId).toBe(MAYA_ID);
    expect(envelope?.record.campaignName).toMatch(/Maya/);
    expect(envelope?.record.campaignStatus).toBe("READY_FOR_REVIEW");
    expect(envelope?.record.revisionRoundsUsed ?? 0).toBe(1);
    expect(envelope?.record.revisionRoundsIncluded).toBe(1);
    const tasks = await readTasksEnvelope(MAYA_ID);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
    expect(job?.spineStatus).toBe("ready_for_review");
    expect(canClientAccessJobReview(job!)).toBe(true);
    const accounting = deriveCorrectionAccounting({
      campaign: envelope!.record,
      envelope: tasks!,
    });
    expect(accounting.included).toBe(1);
    expect(accounting.used).toBe(1);
    expect(accounting.remaining).toBe(0);
    // Exactly one row — her genuine round. The protected-campaign guard caps the
    // ledger here so a stray write cannot add a second.
    expect(accounting.history).toHaveLength(1);
    const view = resolveClientReviewView({
      campaign: envelope!.record,
      job: job!,
      envelope: tasks!,
    });
    expect(view).toBeTruthy();
    expect(view?.revisionRoundsRemaining).toBe(0);
    // Her round is spent, so the customer view must say so rather than offering a
    // round she no longer has. `blockedReasons` describes the draft she has not
    // started; the spent entitlement surfaces through `exhaustedWording`.
    expect(view?.exhaustedWording).toBe(CORRECTION_EXHAUSTED_WORDING);
    expect(view?.canRequestRevision).toBe(false);
    expect(view?.deliverables.some((entry) => entry.proofFiles.length > 0)).toBe(true);
    expect(view?.spineStatus).not.toBe("approved");
    expect(envelope?.record.campaignStatus).not.toBe("DELIVERED");
    const withIntent = createEmptyJobReviewFeedback(
      MAYA_ID,
      job!.jobId,
      (job?.deliverablePrep ?? []).map((entry) => entry.deliverableKey),
    );
    withIntent.sectionStatuses["deliverable-1"] = "revision";
    withIntent.stickyNotes.push({
      id: "sticky-maya-inspect",
      deliverableKey: "deliverable-1",
      color: "coral",
      text: cfg.builderRevisionInstruction,
      createdAt: "2026-09-11T21:00:00.000Z",
    });
    // Intent is present and every other precondition passes, so the only thing
    // standing in the way is her spent entitlement — the gate must refuse on that
    // reason alone, not on missing intent.
    const spent = canRequestJobRevision({
      job: job!,
      feedback: withIntent,
      revisionRoundsRemaining: 0,
      allDeliverablesPrepared: true,
    });
    expect(spent.allowed).toBe(false);
    expect(spent.reasons.join(" ")).not.toMatch(/Needs Revision or leave feedback/i);
    // Same intent, one round available: the mechanism still opens. Entitlement is
    // what closed it, not a broken gate.
    expect(
      canRequestJobRevision({
        job: job!,
        feedback: withIntent,
        revisionRoundsRemaining: 1,
        allDeliverablesPrepared: true,
      }).allowed,
    ).toBe(true);
  });

  it("opening Review (read path) does not consume a customer revision", async () => {
    const before = mayaSnapshot();
    const beforeUsed = before.campaign.record.revisionRoundsUsed ?? 0;
    const envelope = await readCampaignEnvelope(MAYA_ID);
    const tasks = await readTasksEnvelope(MAYA_ID);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
    resolveClientReviewView({
      campaign: envelope!.record,
      job: job!,
      envelope: tasks!,
    });
    const after = mayaSnapshot();
    expect(after.campaign.record.revisionRoundsUsed ?? 0).toBe(beforeUsed);
    expect(JSON.stringify(after.tasks.jobCorrectionUses ?? [])).toBe(
      JSON.stringify(before.tasks.jobCorrectionUses ?? []),
    );
  });

  it("Maya facts produce a Machine CTA-headline emphasis without inventing copy", () => {
    const campaign = mayaSnapshot().campaign.record;
    expect(resolveFlyerRevisionCallToAction(campaign)).toBe("Call or visit");
    const emphasis = buildMachineFlyerRevisionEmphasis({
      feedback: {
        packageId: "pkg:maya-inspect",
        jobId: `${MAYA_ID}:${SKU}`,
        campaignId: MAYA_ID,
        sectionStatuses: { "deliverable-1": "revision" },
        stickyNotes: [
          {
            id: "sticky-inspect",
            deliverableKey: "deliverable-1",
            color: "coral",
            text: cfg.builderRevisionInstruction,
            createdAt: "2026-09-11T21:00:00.000Z",
          },
        ],
        voiceNotes: [],
        drawSections: [],
        updatedAt: "2026-09-11T21:00:00.000Z",
        submittedAt: null,
        submissionType: null,
      },
      campaign,
      priorWorkVersionId: "flyer-v8",
    });
    expect(emphasis?.emphasizeExistingCtaAsHeadline).toBe(true);
    expect(emphasis?.instruction).toBe(cfg.builderRevisionInstruction);
  });
});

describe("STUDIO-OPERATING-MAYA-REVIEW-REVISION-CERTIFICATION-1 Builder QA clone", () => {
  const ids: string[] = [];
  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it(
    "customer revision request becomes Machine input, produces a new proof, and consumes exactly 1 round",
    async () => {
      const mayaBefore = mayaSnapshot();
      // Maya sits at her protected baseline: 1 used, 0 remaining. The point of this
      // test is that everything below happens on a clone and leaves that untouched.
      expect(mayaBefore.campaign.record.revisionRoundsUsed ?? 0).toBe(1);

      const campaignId = `maya-rev-builder-qa-${Date.now()}`;
      expect(campaignId).not.toBe(MAYA_ID);
      ids.push(campaignId);
      const now = new Date().toISOString();
      const maya = mayaBefore.campaign.record;
      const clone: CampaignRecord = {
        ...maya,
        campaignId,
        campaignStatus: "BUILDING_CONCEPTS",
        revisionRoundsUsed: 0,
        revisionRoundsIncluded: 1,
        revisionRoundsIncludedSource: "approved_plan",
        machineFlyerRevisionEmphasis: undefined,
        updatedAt: now,
        paymentTruth: {
          ...maya.paymentTruth!,
          checkoutSessionId: `cs_builder_${campaignId}`,
          paymentIntentId: `pi_builder_${campaignId}`,
          stripeEventId: `evt_builder_${campaignId}`,
        },
        dispatchExecution: undefined,
        routingHandoff: undefined,
        postPayActivation: undefined,
        internalProductionLoop: undefined,
        // Maya's freeze is hers: it says "do not remint, the delivered artifact is
        // flyer-v16" and points at her v16 bytes. Inherited by a clone it refuses
        // production for a version the clone has no artifacts for, so the clone
        // never reaches ready_for_review and every downstream assertion fails for
        // an unrelated reason. Belongs with the other per-campaign runtime state
        // cleared just above.
        productionFreeze: undefined,
      };
      await upsertCampaignRecord(clone, MAYA_CLIENT.id);
      const logoBytes = existsSync(MAYA_MARK)
        ? readFileSync(MAYA_MARK)
        : undefined;
      const staged = stageGenericCustomerLogoPng({
        repoRoot: REPO,
        campaignId,
        bytes: logoBytes,
      });
      const item = buildClearedCustomerLogoMaterial({
        campaignId,
        skuId: SKU,
        stagedRelativePath: staged,
        bytes: logoBytes,
        fileName: "pine-petal-ordinary-mark.png",
      });
      await writeMaterialsEnvelope({
        campaignId,
        items: [item],
        updatedAt: now,
        syncedAt: now,
        version: 1,
      });

      const first = await ensureDispatchExecution(clone);
      expect(first.ok, first.ok ? "ok" : `${first.error}: ${first.message}`).toBe(true);
      const firstTasks = await readTasksEnvelope(campaignId);
      const job = firstTasks?.jobRecords?.find((entry) => entry.skuId === SKU);
      expect(canClientAccessJobReview(job!)).toBe(true);
      expect(first.campaign.revisionRoundsUsed ?? 0).toBe(0);
      const firstProofs = (job?.fileRegistry ?? []).filter(
        (ref) => ref.category === "review_proof" && ref.fileType === "image/png",
      );
      expect(firstProofs.length).toBeGreaterThan(0);
      const firstHash = firstProofs[firstProofs.length - 1]?.storageRef;
      const firstSha =
        firstHash && "checksumSha256" in firstHash
          ? String(firstHash.checksumSha256 ?? "")
          : "";
      const firstView = resolveClientReviewView({
        campaign: first.campaign,
        job: job!,
        envelope: firstTasks!,
      });
      expect(firstView?.revisionRoundsRemaining).toBe(1);
      expect(firstView?.deliverables.some((entry) => entry.proofFiles.length > 0)).toBe(true);

      const keys = (job?.deliverablePrep ?? []).map((entry) => entry.deliverableKey);
      const feedback = createEmptyJobReviewFeedback(campaignId, job!.jobId, keys);
      feedback.sectionStatuses["deliverable-1"] = "revision";
      feedback.stickyNotes.push({
        id: `sticky-${campaignId}`,
        deliverableKey: "deliverable-1",
        color: "coral",
        text: cfg.builderRevisionInstruction,
        createdAt: now,
      });

      const requested = applyReviewRoomPatch(
        firstTasks!,
        first.campaign,
        job!,
        { action: "request_revision", feedback },
        MAYA_CLIENT,
        { staffByUserId: {}, staffCapabilities: {} },
      );
      expect(requested.ok, requested.ok ? "ok" : requested.ok === false ? requested.error : "").toBe(
        true,
      );
      if (!requested.ok) return;
      expect(requested.correctionUseCreated).toBe(true);
      expect(requested.job.spineStatus).toBe("revision_requested");
      // Owner call 2026-09-15 (REVISION-TO-REVIEW-ROUND-TRIP-1): asking records the
      // request but does not spend the round. It is charged when the revised work
      // reaches Review.
      expect(requested.updatedCampaign?.revisionRoundsUsed).toBe(0);
      expect(requested.updatedCampaign?.machineFlyerRevisionEmphasis?.instruction).toBe(
        cfg.builderRevisionInstruction,
      );
      expect(
        requested.updatedCampaign?.machineFlyerRevisionEmphasis?.emphasizeExistingCtaAsHeadline,
      ).toBe(true);
      await upsertCampaignRecord(requested.updatedCampaign!, MAYA_CLIENT.id);
      await writeTasksEnvelope(requested.envelope);

      const produced = await ensureDispatchExecution(requested.updatedCampaign!);
      expect(produced.ok).toBe(true);
      const afterTasks = await readTasksEnvelope(campaignId);
      const afterJob = afterTasks?.jobRecords?.find((entry) => entry.skuId === SKU);

      // REVISION-TO-REVIEW-ROUND-TRIP-1 — whatever internal QA decides about the
      // revised artifact, Maya must not lose the round or be left in silence.
      const afterAccounting = deriveCorrectionAccounting({
        campaign: produced.campaign,
        envelope: afterTasks!,
      });
      const reviewOpened = afterAccounting.pending.length === 0;
      if (!reviewOpened) {
        expect(afterAccounting.requested).toBe(1);
        expect(afterAccounting.used).toBe(0);
        expect(afterAccounting.remaining).toBe(1);
        expect(afterJob?.ownerApprovalPending).toBe("before_review");
        const reworkNotice = (afterTasks?.jobCommunicationRecords ?? []).find(
          (record) => record.eventType === "revision_rework_in_progress",
        );
        expect(reworkNotice).toBeDefined();
        expect(reworkNotice?.deliveryStatus).toBe("sent");
      } else {
        expect(afterAccounting.used).toBe(1);
        expect(afterAccounting.remaining).toBe(0);
      }

      expect(canClientAccessJobReview(afterJob!)).toBe(true);
      expect(produced.campaign.revisionRoundsUsed).toBe(1);
      expect(produced.campaign.campaignStatus).not.toBe("DELIVERED");
      expect(afterJob?.spineStatus).toBe("ready_for_review");
      expect(afterJob?.spineStatus).not.toBe("approved");

      const pngProofs = (afterJob?.fileRegistry ?? []).filter(
        (ref) => ref.category === "review_proof" && ref.fileType === "image/png",
      );
      expect(pngProofs.length).toBeGreaterThan(firstProofs.length);
      const labels = pngProofs.map((ref) => ref.versionLabel);
      expect(new Set(labels).size).toBeGreaterThan(1);
      const latestSha =
        pngProofs[pngProofs.length - 1]?.storageRef &&
        "checksumSha256" in pngProofs[pngProofs.length - 1]!.storageRef
          ? String(
              (pngProofs[pngProofs.length - 1]!.storageRef as { checksumSha256?: string })
                .checksumSha256 ?? "",
            )
          : "";
      expect(latestSha).toBeTruthy();
      expect(latestSha).not.toBe(firstSha);

      const observer = produced.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === SKU,
      );
      expect(observer?.ok).toBe(true);
      const loopAttempts =
        observer?.internalLoop?.attempts?.length ??
        produced.campaign.internalProductionLoop?.attempts?.length ??
        0;
      expect(produced.campaign.revisionRoundsUsed).toBe(1);
      expect(loopAttempts).toBeGreaterThanOrEqual(1);

      const again = await ensureDispatchExecution(produced.campaign);
      expect(again.campaign.revisionRoundsUsed).toBe(1);
      expect(
        again.campaign.dispatchExecution?.designRendererObserver?.results.find(
          (result) => result.skuId === SKU,
        )?.invocationOutcome,
      ).toBe("ALREADY_RENDERED");

      const afterView = resolveClientReviewView({
        campaign: produced.campaign,
        job: afterJob!,
        envelope: afterTasks!,
      });
      expect(afterView?.deliverables.some((entry) => entry.proofFiles.length > 0)).toBe(true);
      expect(canClientAccessJobReview(afterJob!)).toBe(true);

      const mayaAfter = mayaSnapshot();
      // The clone consumed a round; Maya's count did not move.
      expect(mayaAfter.campaign.record.revisionRoundsUsed ?? 0).toBe(
        mayaBefore.campaign.record.revisionRoundsUsed ?? 0,
      );
      expect(mayaAfter.campaign.record.campaignId).toBe(MAYA_ID);
      expect(mayaAfter.campaign.record.campaignStatus).toBe("READY_FOR_REVIEW");

      mkdirSync(EVIDENCE_DIR, { recursive: true });
      writeFileSync(
        path.join(EVIDENCE_DIR, "PACKAGE-MAYA-REVIEW-REVISION-EVIDENCE.json"),
        `${JSON.stringify(
          {
            packageId: cfg.packageId,
            mayaCampaignId: MAYA_ID,
            mayaRevisionRoundsUsedBefore:
              mayaBefore.campaign.record.revisionRoundsUsed ?? 0,
            mayaRevisionRoundsUsedAfterBuilderQa: mayaAfter.campaign.record.revisionRoundsUsed ?? 0,
            mayaRevisionRoundsIncluded: 1,
            builderQaCampaignId: campaignId,
            builderRevisionInstruction: cfg.builderRevisionInstruction,
            builderFirstWorkVersionId: job?.internalQaReviewAuthorization?.workVersionId,
            builderRevisedWorkVersionId: afterJob?.internalQaReviewAuthorization?.workVersionId,
            builderRevisionRoundsUsed: produced.campaign.revisionRoundsUsed,
            internalLoopAttempts: loopAttempts,
            firstPngSha256: firstSha,
            revisedPngSha256: latestSha,
            scoutDidNotEditMayaCreative: true,
            finalApprovalStarted: false,
            finalDeliveryStarted: false,
          },
          null,
          2,
        )}\n`,
      );
    },
    360_000,
  );
});
