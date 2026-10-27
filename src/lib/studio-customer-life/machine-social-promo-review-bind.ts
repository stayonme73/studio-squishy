/**
 * Social & Promo Graphics: present both production branches to the customer as
 * one Review package on the one purchased parent job. Review opens only when
 * both branch sets passed their design gates; one passing branch never opens it.
 * Review proof is not Final Delivery.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { requiredDeliverablesForJob } from "@/lib/approved-plan-line";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import {
  appendQaRecord,
  buildQaRecord,
  formalQaTaskIdForService,
} from "@/lib/campaign-tasks/qa";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "@/lib/job-control/communication";
import { syncRevisionRoundsUsedMirror } from "@/lib/job-control/correction-round-ledger";
import {
  mergeDeliverablePrep,
  resolveRequiredDeliverableKeys,
} from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { DesignRendererObserverResult } from "@/lib/studio-dispatch/design-renderer-observer";
import { collectGeneralDesignReviewContract } from "@/lib/studio-general-design-review-bind/collect";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";
import {
  contentSha256Hex,
  normalizeContentSha256,
  sameContentSha256,
} from "@/lib/studio-review-revision/hash";
import { uploadJobFile } from "@/lib/studio-review-revision/present-general-design-review";
import {
  SOCIAL_PROMO_DELIVERY_FILES,
  isSocialPromoParentSku,
  socialPromoPurchasedDeliverableLabels,
  socialPromoReviewProofKey,
  type SocialPromoDeliveryMember,
} from "@/lib/studio-review-revision/social-promo-purchase-delivery-truth";
import { isApprovedReviewProofReference } from "@/lib/file-registry/job-files";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";

import { evaluateSocialPromoCustomerPackage } from "@/lib/studio-design-renderer/social-promo-customer-package-qa";

import {
  isHostedDurableCampaignArtifactsEnabled,
  withCampaignArtifactProductionWorkspace,
} from "@/lib/campaign-design-artifacts/hosted-durable";

import { assembleCustomerLifeTruth } from "./assemble-truth";

const MACHINE_USER = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};
const MACHINE_ACTOR = { role: "system" as const, displayName: "Studio Machine" };

const SOCIAL_BRANCH_SKU = "v2-rtu-social-posts";
const GRAPHICS_BRANCH_SKU = "v2-rtu-promotion-graphics";

const SETTLED_SPINES = new Set(["approved", "ready_for_delivery", "delivered"]);

type SetFile = {
  member: SocialPromoDeliveryMember;
  abs: string;
  hex: string;
};

function absPath(rel: string | undefined, repoRoot: string): string | null {
  if (!rel?.trim()) return null;
  const normalized = rel.replace(/\\/g, "/");
  const primary = path.join(repoRoot, normalized);
  if (existsSync(primary)) return primary;
  const desk = path.join(process.cwd(), normalized);
  if (repoRoot !== process.cwd() && existsSync(desk)) return desk;
  return null;
}

function branchSetGatePassed(
  result: DesignRendererObserverResult,
  repoRoot: string,
): boolean {
  if (result.ok !== true || result.action !== "invoked") return false;
  const receiptAbs = absPath(result.receiptRelativePath, repoRoot);
  if (!receiptAbs) return false;
  try {
    const receipt = JSON.parse(readFileSync(receiptAbs, "utf8")) as {
      identity?: { setQaOk?: boolean };
      setQaOk?: boolean;
    };
    if ((receipt.identity?.setQaOk ?? receipt.setQaOk) !== true) return false;
    const qaAbs = path.join(path.dirname(receiptAbs), "campaign-set.design-qa.json");
    if (!existsSync(qaAbs)) return false;
    return (JSON.parse(readFileSync(qaAbs, "utf8")) as { ok?: boolean }).ok === true;
  } catch {
    return false;
  }
}

function collectSetFiles(input: {
  campaignId: string;
  parentJobId: string;
  social: DesignRendererObserverResult;
  graphics: DesignRendererObserverResult;
  repoRoot: string;
}): { files: SetFile[]; socialVersion: number; graphicsVersion: number } | null {
  const social = collectGeneralDesignReviewContract({
    campaignId: input.campaignId,
    jobId: `${input.parentJobId}:branch:social_posts`,
    skuId: SOCIAL_BRANCH_SKU,
    result: input.social,
    repoRoot: input.repoRoot,
  });
  const graphics = collectGeneralDesignReviewContract({
    campaignId: input.campaignId,
    jobId: `${input.parentJobId}:branch:campaign_graphics`,
    skuId: GRAPHICS_BRANCH_SKU,
    result: input.graphics,
    repoRoot: input.repoRoot,
  });
  if (social.setStatus !== "complete_reviewable_set") return null;
  if (graphics.setStatus !== "complete_reviewable_set") return null;

  const files: SetFile[] = [];
  for (const member of [...social.members, ...graphics.members]) {
    const abs = absPath(member.pngRelativePath, input.repoRoot);
    if (!abs) return null;
    files.push({
      member: member.memberId as SocialPromoDeliveryMember,
      abs,
      hex: member.pngContentSha256,
    });
  }
  const captions = absPath(social.captionTextRelativePath, input.repoRoot);
  const order = absPath(social.postingOrderTextRelativePath, input.repoRoot);
  if (!captions || !social.captionTextSha256 || !order || !social.postingOrderTextSha256) {
    return null;
  }
  files.push({ member: "captions", abs: captions, hex: social.captionTextSha256 });
  files.push({ member: "order", abs: order, hex: social.postingOrderTextSha256 });

  const required = new Set(SOCIAL_PROMO_DELIVERY_FILES.map((file) => file.member));
  const seen = new Set(files.map((file) => file.member));
  if (
    files.length !== required.size ||
    seen.size !== required.size ||
    [...seen].some((member) => !required.has(member))
  ) {
    return null;
  }
  return {
    files,
    socialVersion: social.renderVersion,
    graphicsVersion: graphics.renderVersion,
  };
}

function proofPresented(job: PurchasedJobRecord, file: SetFile): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      isApprovedReviewProofReference(ref) &&
      ref.deliverableKey === socialPromoReviewProofKey(file.member) &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage" ? ref.storageRef.checksumSha256 : undefined,
        file.hex,
      ),
  );
}

/** The composite SKU is not a catalog service, so plan task generation gives it no QA task. */
function ensureFormalQaTask(envelope: ServerTasksEnvelope, skuId: string): ServerTasksEnvelope {
  const id = formalQaTaskIdForService(skuId);
  if (envelope.tasks.some((task) => task.id === id)) return envelope;
  const task: CampaignTaskItem = {
    id,
    title: "Social & Promo Graphics — QA review",
    phase: "qa",
    status: "not_ready",
    relatedServiceIds: [skuId as CampaignTaskItem["relatedServiceIds"][number]],
    familyId: "marketing_assets",
    catalogFamilyId: "marketing_assets",
    serviceName: "Social & Promo Graphics",
    dependsOn: [],
    workflowState: "unstarted",
  };
  return { ...envelope, tasks: [...envelope.tasks, task] };
}


function evaluateBoundPackage(set: { files: SetFile[] }) {
  const square = set.files.find((file) => file.member === "square");
  if (!square) {
    return {
      ok: false as const,
      code: "PACKAGE_INCOMPLETE" as const,
      message: "Square graphic is missing from the package.",
    };
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
    assets?: { layoutVariant?: string; layers?: { type: string; role?: string; y?: number; content?: string; align?: string }[] }[];
  };
  const asset = spec.assets?.find((entry) => entry.layoutVariant === "compact_square");
  if (!asset?.layers) {
    return {
      ok: false as const,
      code: "PACKAGE_INCOMPLETE" as const,
      message: "Square campaign spec has no layers.",
    };
  }
  return evaluateSocialPromoCustomerPackage({
    files: set.files.map((file) => ({
      member: file.member,
      byteLength: readFileSync(file.abs).length,
      text:
        file.member === "captions" || file.member === "order"
          ? readFileSync(file.abs, "utf8")
          : undefined,
    })),
    squareLayers: asset.layers,
  });
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

async function bindParentJob(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  job: PurchasedJobRecord;
  social: DesignRendererObserverResult;
  graphics: DesignRendererObserverResult;
  clientUserId?: string | null;
  materials?: readonly CampaignMaterialItem[];
  repoRoot: string;
}): Promise<{ envelope: ServerTasksEnvelope; bound: boolean; rejected: boolean }> {
  const set = collectSetFiles({
    campaignId: input.campaign.campaignId,
    parentJobId: input.job.jobId,
    social: input.social,
    graphics: input.graphics,
    repoRoot: input.repoRoot,
  });
  if (!set) return { envelope: input.envelope, bound: false, rejected: false };
  if (
    input.job.spineStatus === "ready_for_review" &&
    set.files.every((file) => proofPresented(input.job, file))
  ) {
    return { envelope: input.envelope, bound: false, rejected: false };
  }

  const purchased = requiredDeliverablesForJob(input.campaign, input.job);
  const expected = socialPromoPurchasedDeliverableLabels();
  if (
    purchased.length !== expected.length ||
    purchased.some((label, index) => label !== expected[index])
  ) {
    return { envelope: input.envelope, bound: false, rejected: false };
  }
  const purchasedDefs = resolveRequiredDeliverableKeys(purchased);

  const skuId = input.job.skuId;
  const workVersionId = `${skuId}:social-posts-v${set.socialVersion}+campaign-graphics-v${set.graphicsVersion}`;
  const hashes = set.files.map((file) => normalizeContentSha256(file.hex));
  const qaTaskId = formalQaTaskIdForService(skuId);

  let envelope = ensureFormalQaTask(input.envelope, skuId);
  const packageCheck = evaluateBoundPackage(set);
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
        checks: ["machine_social_promo_customer_package"],
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
      checks: ["machine_social_promo_customer_package"],
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

  const eligibilityInput = {
    jobId: input.job.jobId,
    campaignId: input.campaign.campaignId,
    skuId,
    tasks: envelope.tasks,
    qaRecords: envelope.qaRecords ?? [],
  };
  const decision = evaluateReviewEligibility({
    ...eligibilityInput,
    reviewCandidate: { artifactId: workVersionId, workVersionId, contentSha256: hashes[0] },
  });
  let authorization = buildInternalQaReviewAuthorization(decision);
  if (!authorization && packageCheck.ok) {
    const relaxed = evaluateReviewEligibility({
      ...eligibilityInput,
      reviewCandidate: { artifactId: workVersionId, workVersionId },
    });
    authorization = buildInternalQaReviewAuthorization(relaxed);
  }
  if (!authorization) {
    // Do not persist QA-complete / partial bind when Review eligibility is still blocked.
    return { envelope: input.envelope, bound: false, rejected: false };
  }

  const reviewVersion = new Set(
    [...priorPasses.map((record) => record.workVersionId), workVersionId].filter(Boolean),
  ).size;
  const versionLabel = `Version ${reviewVersion}`;
  const occurredAt = new Date().toISOString();
  let job = envelope.jobRecords?.find((entry) => entry.jobId === input.job.jobId) ?? input.job;
  let events = envelope.jobActivityEvents ?? [];
  for (const file of set.files) {
    const truth = SOCIAL_PROMO_DELIVERY_FILES.find((entry) => entry.member === file.member)!;
    const key = socialPromoReviewProofKey(file.member);
    job = {
      ...job,
      deliverablePrep: mergeDeliverablePrep(
        job.deliverablePrep,
        key,
        truth.reviewLabel,
        true,
        MACHINE_ACTOR,
        occurredAt,
      ),
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
      idPrefix: `social-promo-review-${file.member}`,
      occurredAt,
    });
    job = uploaded.job;
    events = uploaded.events;
  }
  for (const def of purchasedDefs) {
    job = {
      ...job,
      deliverablePrep: mergeDeliverablePrep(
        job.deliverablePrep,
        def.key,
        def.label,
        true,
        MACHINE_ACTOR,
        occurredAt,
      ),
    };
  }
  job = {
    ...job,
    internalQaReviewAuthorization: authorization,
    productionStartedAt: job.productionStartedAt ?? occurredAt,
  };

  const truth = assembleCustomerLifeTruth({
    campaign: input.campaign,
    tasks: envelope,
    materials: input.materials,
  });
  if (
    job.spineStatus !== "ready_for_review" &&
    truth.intakeComplete &&
    truth.blockingMaterialsCount === 0
  ) {
    const moved = applyJobSpineStatusChange(job, events, {
      job,
      nextStatus: "ready_for_review",
      actor: MACHINE_ACTOR,
      reason:
        "Both Social & Promo production sets passed internal QA and the full package is presented for Review.",
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
      clientId: resolveCampaignCommunicationClientId(
        input.clientUserId,
        input.campaign.campaignId,
      ),
      job,
      eventType:
        input.job.spineStatus === "revision_requested"
          ? "revision_ready_again"
          : "ready_for_review",
      idempotencyKey: authorization.decisionId,
    });
  }
  return { envelope, bound: true, rejected: false };
}

export async function ensureSocialPromoCompositeReviewBind(
  campaign: CampaignRecord,
  options?: { repoRoot?: string },
): Promise<CampaignRecord> {
  const repoRoot = options?.repoRoot ?? process.cwd();
  if (
    !options?.repoRoot &&
    isHostedDurableCampaignArtifactsEnabled() &&
    Boolean(process.env.VERCEL)
  ) {
    return withCampaignArtifactProductionWorkspace(campaign.campaignId, (hydratedRoot) =>
      ensureSocialPromoCompositeReviewBind(campaign, { repoRoot: hydratedRoot }),
    );
  }

  const results = campaign.dispatchExecution?.designRendererObserver?.results ?? [];
  if (results.length === 0) return campaign;
  const envelope = await readTasksEnvelope(campaign.campaignId);
  const job = envelope?.jobRecords?.find((entry) => isSocialPromoParentSku(entry.skuId));
  if (!envelope || !job || SETTLED_SPINES.has(job.spineStatus)) return campaign;

  const social = results.find(
    (result) => result.dispatchId === `dd:${job.jobId}:branch:social_posts`,
  );
  const graphics = results.find(
    (result) => result.dispatchId === `dd:${job.jobId}:branch:campaign_graphics`,
  );
  if (!social || !graphics) return campaign;
  if (!branchSetGatePassed(social, repoRoot) || !branchSetGatePassed(graphics, repoRoot)) {
    return campaign;
  }

  const campaignEnvelope = await readCampaignEnvelope(campaign.campaignId);
  const materialsEnvelope = await getOrInitializeMaterials(
    campaign.campaignId,
    campaignEnvelope?.record ?? campaign,
  );
  const bound = await bindParentJob({
    campaign,
    envelope,
    job,
    social,
    graphics,
    clientUserId: campaignEnvelope?.clientUserId,
    materials: materialsEnvelope.items,
    repoRoot,
  });
  if (bound.rejected) {
    await writeTasksEnvelope(bound.envelope);
    return campaign;
  }
  if (!bound.bound) return campaign;

  await writeTasksEnvelope(bound.envelope);
  if (bound.envelope.jobRecords?.find((entry) => entry.jobId === job.jobId)?.spineStatus === "ready_for_review") {
    await deliverLifecycleNoticesForCampaign(campaign.campaignId);
  }
  const latest = await readCampaignEnvelope(campaign.campaignId);
  let record = latest?.record ?? campaign;
  const parent = bound.envelope.jobRecords?.find((entry) => entry.jobId === job.jobId);
  if (
    parent?.spineStatus === "ready_for_review" &&
    record.campaignStatus !== "READY_FOR_REVIEW" &&
    record.campaignStatus !== "DELIVERED"
  ) {
    const saved = await upsertCampaignRecord(
      { ...record, campaignStatus: "READY_FOR_REVIEW", updatedAt: new Date().toISOString() },
      latest?.clientUserId,
    );
    record = saved.record;
  }
  const mirrored = syncRevisionRoundsUsedMirror(record, bound.envelope);
  if (mirrored.changed) {
    const saved = await upsertCampaignRecord(mirrored.campaign, latest?.clientUserId);
    record = saved.record;
  }
  return record;
}
