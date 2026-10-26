/**
 * Campaign Launch Kit review opens only when flyer, email, texts, and graphics
 * pass as one package. A failed combined check stays closed and records qa_fail.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { campaignLaunchKitCustomerDeliverableLabels } from "@/config/studio-campaign-launch-kit-current-door-contract-v1";
import { requiredDeliverablesForJob } from "@/lib/approved-plan-line";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { appendQaRecord, buildQaRecord, formalQaTaskIdForService } from "@/lib/campaign-tasks/qa";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { isApprovedReviewProofReference } from "@/lib/file-registry/job-files";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { listCorrectionUses } from "@/lib/job-control/correction-round-ledger";
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "@/lib/job-control/communication";
import {
  mergeDeliverablePrep,
  resolveRequiredDeliverableKeys,
} from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { DesignRendererObserverResult } from "@/lib/studio-dispatch/design-renderer-observer";
import type { LaunchMenuObserverResult } from "@/lib/studio-dispatch/launch-menu-production-observer";
import {
  buildCampaignLaunchKitUsageGuide,
  readCampaignLaunchKitBrief,
} from "@/lib/studio-dispatch/campaign-launch-kit-brief";
import { collectGeneralDesignReviewContract } from "@/lib/studio-general-design-review-bind/collect";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";
import { evaluateCampaignLaunchKitPackage } from "@/lib/studio-design-renderer/campaign-launch-kit-customer-package-qa";
import type { SquareCompositionLayer } from "@/lib/studio-design-renderer/social-promo-customer-package-qa";
import {
  CAMPAIGN_LAUNCH_KIT_DELIVERY_FILES,
  campaignLaunchKitReviewProofKey,
  isCampaignLaunchKitParentSku,
  type CampaignLaunchKitDeliveryMember,
} from "@/lib/studio-review-revision/campaign-launch-kit-purchase-delivery-truth";
import { contentSha256Hex, normalizeContentSha256, sameContentSha256 } from "@/lib/studio-review-revision/hash";
import { uploadJobFile } from "@/lib/studio-review-revision/present-general-design-review";
import { certifyPrintFileDeliverable } from "@/lib/studio-production-team-workforce/print-file";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";

import { assembleCustomerLifeTruth } from "./assemble-truth";

const MACHINE_USER = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};
const MACHINE_ACTOR = { role: "system" as const, displayName: "Studio Machine" };
const GRAPHICS_SKU = "v2-rtu-promotion-graphics";
const SETTLED_SPINES = new Set(["approved", "ready_for_delivery", "delivered"]);

type PackageFile = {
  member: CampaignLaunchKitDeliveryMember;
  abs: string;
  hex: string;
};

function absPath(rel: string | undefined): string | null {
  if (!rel?.trim()) return null;
  const abs = path.join(process.cwd(), rel.replace(/\\/g, "/"));
  return existsSync(abs) ? abs : null;
}

function shaFile(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function textBeside(abs: string): string {
  const dir = path.dirname(abs);
  if (!existsSync(dir)) return "";
  return readdirSync(dir)
    .filter((name) => name.endsWith(".html") || name.endsWith(".txt"))
    .map((name) => readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
}

function proofPresented(job: PurchasedJobRecord, file: PackageFile): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      isApprovedReviewProofReference(ref) &&
      ref.deliverableKey === campaignLaunchKitReviewProofKey(file.member) &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage" ? ref.storageRef.checksumSha256 : undefined,
        file.hex,
      ),
  );
}

function ensureFormalQaTask(envelope: ServerTasksEnvelope, skuId: string): ServerTasksEnvelope {
  const id = formalQaTaskIdForService(skuId);
  if (envelope.tasks.some((task) => task.id === id)) return envelope;
  const task: CampaignTaskItem = {
    id,
    title: "Campaign Launch Kit — QA review",
    phase: "qa",
    status: "not_ready",
    relatedServiceIds: [skuId as CampaignTaskItem["relatedServiceIds"][number]],
    familyId: "marketing_assets",
    catalogFamilyId: "marketing_assets",
    serviceName: "Campaign Launch Kit",
    dependsOn: [],
    workflowState: "unstarted",
  };
  return { ...envelope, tasks: [...envelope.tasks, task] };
}

function syncQaTask(
  envelope: ServerTasksEnvelope,
  taskId: string,
  passed: boolean,
): ServerTasksEnvelope {
  return {
    ...envelope,
    tasks: envelope.tasks.map((task) => {
      if (task.id !== taskId) return task;
      return passed
        ? { ...task, status: "complete" as const, workflowState: "complete" as const }
        : { ...task, status: "needs_revision" as const, workflowState: "needs_revision" as const };
    }),
  };
}

/**
 * An internal Quality miss can leave the spine looking like a revision before
 * the customer has asked for one. The notice follows the customer's correction
 * record.
 */
export function campaignLaunchKitReviewNoticeEvent(
  envelope: Pick<ServerTasksEnvelope, "jobCorrectionUses">,
  jobId: string,
): "ready_for_review" | "revision_ready_again" {
  const customerAsked = listCorrectionUses(envelope, jobId).some(
    (entry) => entry.submissionType === "revision_requested",
  );
  return customerAsked ? "revision_ready_again" : "ready_for_review";
}

function pasteText(result: LaunchMenuObserverResult | undefined, filename: string): string | null {
  const artifact = absPath(result?.artifactRelativePath);
  if (!artifact) return null;
  const file = path.join(path.dirname(artifact), filename);
  return existsSync(file) ? file : null;
}

function collectPackage(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  flyer: DesignRendererObserverResult;
  graphics: DesignRendererObserverResult;
  email: LaunchMenuObserverResult;
  sms: LaunchMenuObserverResult;
}): { files: PackageFile[]; flyerVersion: number; graphicsVersion: number } | { error: string } {
  const brief = readCampaignLaunchKitBrief(input.campaign);
  if (!brief.ok) return { error: brief.message };
  const flyerPng = absPath(input.flyer.pngRelativePath);
  const flyerPdf = absPath(input.flyer.pdfRelativePath);
  const emailAbs = pasteText(input.email, "email-1.txt");
  const smsAbs = pasteText(input.sms, "sms-kit.txt");
  if (!flyerPng || !flyerPdf || !emailAbs || !smsAbs) {
    return { error: "Campaign production is missing the flyer, email, or text files." };
  }
  const print = certifyPrintFileDeliverable({
    repoRoot: process.cwd(),
    skuId: "v2-rtu-flyer",
    pngRelativePath: input.flyer.pngRelativePath,
    pdfRelativePath: input.flyer.pdfRelativePath,
  });
  if (!print.ok) return { error: print.message };

  const graphics = collectGeneralDesignReviewContract({
    campaignId: input.campaign.campaignId,
    jobId: `${input.job.jobId}:branch:graphics`,
    skuId: GRAPHICS_SKU,
    result: input.graphics,
  });
  if (graphics.setStatus !== "complete_reviewable_set") {
    return { error: "Campaign graphics are not a complete square and portrait set." };
  }
  const square = graphics.members.find((member) => member.memberId === "square");
  const portrait = graphics.members.find((member) => member.memberId === "portrait");
  const squareAbs = absPath(square?.pngRelativePath);
  const portraitAbs = absPath(portrait?.pngRelativePath);
  if (!squareAbs || !portraitAbs || !square || !portrait) {
    return { error: "Square or portrait campaign graphic is missing." };
  }

  const guideRel = `data/campaign-design-artifacts/${input.campaign.campaignId}/campaign-launch-kit`;
  const guideAbs = path.join(process.cwd(), guideRel, "usage-guide.txt");
  mkdirSync(path.dirname(guideAbs), { recursive: true });
  writeFileSync(guideAbs, `${buildCampaignLaunchKitUsageGuide(brief.brief)}\n`, "utf8");

  const files: PackageFile[] = [
    { member: "flyer-png", abs: flyerPng, hex: shaFile(flyerPng) },
    { member: "flyer-pdf", abs: flyerPdf, hex: shaFile(flyerPdf) },
    { member: "email", abs: emailAbs, hex: shaFile(emailAbs) },
    { member: "sms", abs: smsAbs, hex: shaFile(smsAbs) },
    { member: "square", abs: squareAbs, hex: square.pngContentSha256 },
    { member: "portrait", abs: portraitAbs, hex: portrait.pngContentSha256 },
    { member: "usage-guide", abs: guideAbs, hex: shaFile(guideAbs) },
  ];
  return {
    files,
    flyerVersion: input.flyer.renderVersion ?? 1,
    graphicsVersion: graphics.renderVersion,
  };
}

function inspectPackage(campaign: CampaignRecord, files: PackageFile[]) {
  const brief = readCampaignLaunchKitBrief(campaign);
  if (!brief.ok) return { ok: false as const, code: "PACKAGE_INCOMPLETE" as const, message: brief.message };
  const byMember = (member: CampaignLaunchKitDeliveryMember) => files.find((file) => file.member === member);
  const square = byMember("square");
  const flyerPng = byMember("flyer-png");
  const flyerPdf = byMember("flyer-pdf");
  const email = byMember("email");
  const sms = byMember("sms");
  const guide = byMember("usage-guide");
  const portrait = byMember("portrait");
  if (!square || !flyerPng || !flyerPdf || !email || !sms || !guide || !portrait) {
    return { ok: false as const, code: "PACKAGE_INCOMPLETE" as const, message: "A campaign channel is missing." };
  }
  const specAbs = path.join(path.dirname(square.abs), "campaign-set-design-spec.json");
  if (!existsSync(specAbs)) {
    return {
      ok: false as const,
      code: "PACKAGE_INCOMPLETE" as const,
      message: "Campaign graphic spec is missing, so the square composition cannot be checked.",
    };
  }
  const spec = JSON.parse(readFileSync(specAbs, "utf8")) as {
    assets?: { layoutVariant?: string; layers?: SquareCompositionLayer[] }[];
  };
  const asset = spec.assets?.find((entry) => entry.layoutVariant === "compact_square");
  if (!asset?.layers) {
    return { ok: false as const, code: "PACKAGE_INCOMPLETE" as const, message: "Square campaign spec has no layers." };
  }
  const pdfHead = readFileSync(flyerPdf.abs).subarray(0, 4).toString("utf8");
  return evaluateCampaignLaunchKitPackage({
    brief: brief.brief,
    emailText: readFileSync(email.abs, "utf8"),
    smsText: readFileSync(sms.abs, "utf8"),
    usageGuideText: readFileSync(guide.abs, "utf8"),
    flyerText: textBeside(flyerPng.abs),
    flyerPngBytes: readFileSync(flyerPng.abs).length,
    flyerPdfBytes: readFileSync(flyerPdf.abs).length,
    flyerPdfIsPdf: pdfHead === "%PDF",
    squarePngBytes: readFileSync(square.abs).length,
    portraitPngBytes: readFileSync(portrait.abs).length,
    squareLayers: asset.layers,
  });
}

async function bindParentJob(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  job: PurchasedJobRecord;
  flyer: DesignRendererObserverResult;
  graphics: DesignRendererObserverResult;
  email: LaunchMenuObserverResult;
  sms: LaunchMenuObserverResult;
  clientUserId?: string | null;
}): Promise<{ envelope: ServerTasksEnvelope; bound: boolean; rejected: boolean }> {
  const collected = collectPackage(input);
  if ("error" in collected) {
    return { envelope: input.envelope, bound: false, rejected: false };
  }
  const set = collected;
  if (
    input.job.spineStatus === "ready_for_review" &&
    set.files.every((file) => proofPresented(input.job, file))
  ) {
    return { envelope: input.envelope, bound: false, rejected: false };
  }

  const purchased = requiredDeliverablesForJob(input.campaign, input.job);
  const expected = campaignLaunchKitCustomerDeliverableLabels();
  if (purchased.length !== expected.length || purchased.some((label, index) => label !== expected[index])) {
    return { envelope: input.envelope, bound: false, rejected: false };
  }
  const purchasedDefs = resolveRequiredDeliverableKeys(purchased);
  const skuId = input.job.skuId;
  const workVersionId = `${skuId}:flyer-v${set.flyerVersion}+graphics-v${set.graphicsVersion}`;
  const hashes = set.files.map((file) => normalizeContentSha256(file.hex));
  const qaTaskId = formalQaTaskIdForService(skuId);
  let envelope = ensureFormalQaTask(input.envelope, skuId);
  const packageCheck = inspectPackage(input.campaign, set.files);

  if (!packageCheck.ok) {
    envelope = syncQaTask(envelope, qaTaskId, false);
    const priorFails = (envelope.qaRecords ?? []).filter(
      (record) =>
        record.taskId === qaTaskId &&
        record.action === "qa_fail" &&
        record.workVersionId === workVersionId,
    );
    if (priorFails.length === 0) {
      const record = buildQaRecord({
        campaignId: input.campaign.campaignId,
        taskId: qaTaskId,
        user: MACHINE_USER,
        actorRole: "qa",
        action: "qa_fail",
        category: "production_correction",
        checks: ["machine_campaign_launch_kit_package"],
        notes: packageCheck.message,
        workVersionId,
        designQualityEvidence: {
          evaluation: {
            skuId,
            fixtureId: `job-${input.campaign.campaignId}`,
            ok: false,
            findings: [],
            checkedAt: new Date().toISOString(),
            deterministicFailCount: 1,
            judgmentRequired: true as const,
            summary: packageCheck.message,
          },
          attestations: {
            hierarchyReviewed: false,
            readabilityReviewed: false,
            spacingCompositionReviewed: false,
            brandFitReviewed: false,
            genericnessRejected: false,
            exportReadinessReviewed: false,
            notes: packageCheck.message,
          },
          gatePassed: false,
        },
        artifactBinding: { workVersionId, artifactIds: [workVersionId], contentSha256s: hashes },
      });
      envelope = {
        ...envelope,
        qaRecords: appendQaRecord(envelope.qaRecords, record),
        updatedAt: new Date().toISOString(),
      };
    }
    return { envelope, bound: false, rejected: true };
  }

  envelope = syncQaTask(envelope, qaTaskId, true);
  const priorPasses = (envelope.qaRecords ?? []).filter(
    (record) => record.taskId === qaTaskId && record.action === "qa_pass",
  );
  if (!priorPasses.some((record) => record.workVersionId === workVersionId)) {
    const record = buildQaRecord({
      campaignId: input.campaign.campaignId,
      taskId: qaTaskId,
      user: MACHINE_USER,
      actorRole: "qa",
      action: "qa_pass",
      checks: ["machine_campaign_launch_kit_package"],
      notes: packageCheck.summary,
      workVersionId,
      designQualityEvidence: {
        evaluation: {
          skuId,
          fixtureId: `job-${input.campaign.campaignId}`,
          ok: true,
          findings: [],
          checkedAt: new Date().toISOString(),
          deterministicFailCount: 0,
          judgmentRequired: true as const,
          summary: packageCheck.summary,
        },
        attestations: {
          hierarchyReviewed: false,
          readabilityReviewed: false,
          spacingCompositionReviewed: true,
          brandFitReviewed: false,
          genericnessRejected: true,
          exportReadinessReviewed: true,
          notes: packageCheck.summary,
        },
        gatePassed: true,
      },
      artifactBinding: { workVersionId, artifactIds: [workVersionId], contentSha256s: hashes },
    });
    envelope = {
      ...envelope,
      qaRecords: appendQaRecord(envelope.qaRecords, record),
      updatedAt: new Date().toISOString(),
    };
  }

  const decision = evaluateReviewEligibility({
    jobId: input.job.jobId,
    campaignId: input.campaign.campaignId,
    skuId,
    tasks: envelope.tasks,
    qaRecords: envelope.qaRecords ?? [],
    reviewCandidate: { artifactId: workVersionId, workVersionId, contentSha256: hashes[0] },
  });
  const authorization = buildInternalQaReviewAuthorization(decision);
  if (!authorization) return { envelope, bound: true, rejected: false };

  const reviewVersion = new Set(
    [...priorPasses.map((record) => record.workVersionId), workVersionId].filter(Boolean),
  ).size;
  const versionLabel = `Version ${reviewVersion}`;
  const occurredAt = new Date().toISOString();
  let job = envelope.jobRecords?.find((entry) => entry.jobId === input.job.jobId) ?? input.job;
  let events = envelope.jobActivityEvents ?? [];
  for (const file of set.files) {
    const truth = CAMPAIGN_LAUNCH_KIT_DELIVERY_FILES.find((entry) => entry.member === file.member)!;
    const key = campaignLaunchKitReviewProofKey(file.member);
    job = {
      ...job,
      deliverablePrep: mergeDeliverablePrep(job.deliverablePrep, key, truth.reviewLabel, true, MACHINE_ACTOR, occurredAt),
    };
    if (proofPresented(job, file)) continue;
    const uploaded = await uploadJobFile({
      job,
      events,
      campaign: input.campaign,
      abs: file.abs,
      filename: truth.filename,
      contentType: truth.contentType,
      hex: contentSha256Hex(file.hex),
      versionLabel,
      category: "review_proof",
      visibility: "client_visible",
      status: "approved_for_review",
      deliverableKey: key,
      deliverableLabel: truth.reviewLabel,
      idPrefix: `campaign-launch-kit-review-${file.member}`,
      occurredAt,
    });
    job = uploaded.job;
    events = uploaded.events;
  }
  for (const def of purchasedDefs) {
    job = {
      ...job,
      deliverablePrep: mergeDeliverablePrep(job.deliverablePrep, def.key, def.label, true, MACHINE_ACTOR, occurredAt),
    };
  }
  job = {
    ...job,
    internalQaReviewAuthorization: authorization,
    productionStartedAt: job.productionStartedAt ?? occurredAt,
  };

  const truth = assembleCustomerLifeTruth({ campaign: input.campaign, tasks: envelope });
  if (job.spineStatus !== "ready_for_review" && truth.intakeComplete && truth.blockingMaterialsCount === 0) {
    const moved = applyJobSpineStatusChange(job, events, {
      job,
      nextStatus: "ready_for_review",
      actor: MACHINE_ACTOR,
      reason: "Campaign Launch Kit passed combined Quality and is presented for Review.",
    });
    job = moved.job;
    events = moved.events;
  }

  envelope = {
    ...envelope,
    jobRecords: (envelope.jobRecords ?? []).map((row) => (row.jobId === job.jobId ? job : row)),
    jobActivityEvents: events,
    updatedAt: occurredAt,
  };
  if (input.job.spineStatus !== "ready_for_review" && job.spineStatus === "ready_for_review") {
    envelope = enqueueJobCommunicationRecord(envelope, {
      campaign: input.campaign,
      clientId: resolveCampaignCommunicationClientId(input.clientUserId, input.campaign.campaignId),
      job,
      eventType: campaignLaunchKitReviewNoticeEvent(envelope, job.jobId),
      idempotencyKey: authorization.decisionId,
    });
  }
  return { envelope, bound: true, rejected: false };
}

export async function ensureCampaignLaunchKitReviewBind(campaign: CampaignRecord): Promise<CampaignRecord> {
  const design = campaign.dispatchExecution?.designRendererObserver?.results ?? [];
  const launch = campaign.dispatchExecution?.launchMenuProductionObserver?.results ?? [];
  if (design.length === 0 || launch.length === 0) return campaign;
  const envelope = await readTasksEnvelope(campaign.campaignId);
  const job = envelope?.jobRecords?.find((entry) => isCampaignLaunchKitParentSku(entry.skuId));
  if (!envelope || !job || SETTLED_SPINES.has(job.spineStatus)) return campaign;

  const flyer = design.find((result) => result.dispatchId === `dd:${job.jobId}:branch:flyer`);
  const graphics = design.find((result) => result.dispatchId === `dd:${job.jobId}:branch:graphics`);
  const email = launch.find((result) => result.dispatchId === `dd:${job.jobId}:branch:email`);
  const sms = launch.find((result) => result.dispatchId === `dd:${job.jobId}:branch:sms`);
  if (!flyer?.ok || !graphics?.ok || !email?.ok || !sms?.ok) return campaign;
  if (flyer.action !== "invoked" || graphics.action !== "invoked") return campaign;
  if (email.action !== "invoked" || sms.action !== "invoked") return campaign;

  const campaignEnvelope = await readCampaignEnvelope(campaign.campaignId);
  const bound = await bindParentJob({
    campaign,
    envelope,
    job,
    flyer,
    graphics,
    email,
    sms,
    clientUserId: campaignEnvelope?.clientUserId,
  });
  if (bound.rejected) {
    await writeTasksEnvelope(bound.envelope);
    return campaign;
  }
  if (!bound.bound) return campaign;
  await writeTasksEnvelope(bound.envelope);
  await deliverLifecycleNoticesForCampaign(campaign.campaignId);
  const latest = await readCampaignEnvelope(campaign.campaignId);
  return latest?.record ?? campaign;
}
