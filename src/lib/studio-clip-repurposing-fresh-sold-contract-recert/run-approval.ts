/**
 * Pin and assemble the approved Set version 2 files for the sold-contract recert.
 * Does not publish. Does not change the menu.
 */

import { createHash } from "crypto";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "fs";
import { open, stat } from "fs/promises";
import path from "path";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  CLIP_SOLD_RECERT_CAMPAIGN_ID,
  CLIP_SOLD_RECERT_REVISED_CTA,
  studioClipRepurposingFreshSoldContractRecertV1 as recert,
} from "@/config/studio-clip-repurposing-fresh-sold-contract-recert-v1";
import { requiredClientDeliveryFileLabelsForJob } from "@/lib/approved-plan-line";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { generateCampaignTasks } from "@/lib/campaign-tasks/generate";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { applySystemFinalDeliveryAuthorization } from "@/lib/job-control/final-delivery-actions";
import { materialContextFromLedger } from "@/lib/job-control/final-delivery-gates";
import { readMaterialsEnvelope, writeMaterialsEnvelope } from "@/lib/materials/store";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";
import { buildCustomerApprovedArtifactAuthorization } from "@/lib/studio-approved-delivery";
import { buildCustomerContentCertification } from "@/lib/studio-customer-content-intake/routing";
import { buildCustomerContentRightsRecord } from "@/lib/studio-customer-content-intake/rights-record";
import { inspectCustomerFileBytes } from "@/lib/studio-customer-content-intake/technical-inspection";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";
import { assembleApprovedClipRepurposingClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";

const SKU = CLIP_REPURPOSING_SKU;
const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

async function sha256File(abs: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(abs);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function certifySoldRecertSource(repoRoot: string) {
  const sourceAbs = path.join(repoRoot, recert.designatedSourceRelativePath);
  if (!existsSync(sourceAbs)) {
    throw new Error("Eligible sold-contract Clip source is missing.");
  }
  const info = await stat(sourceAbs);
  const handle = await open(sourceAbs, "r");
  const head = Buffer.alloc(16);
  await handle.read(head, 0, 16, 0);
  await handle.close();
  const checksumSha256 = await sha256File(sourceAbs);
  const technical = inspectCustomerFileBytes({
    bytes: head,
    fileName: path.basename(sourceAbs),
    mimeType: "video/mp4",
    checksumSha256,
  });
  const rights = buildCustomerContentRightsRecord({
    category: "photo-video",
    fileName: path.basename(sourceAbs),
    useAuthorizationBasis: "customer_owns",
    rightsInput: {
      useAuthorizationBasis: "customer_owns",
      commercialUsePermitted: true,
      cropAdaptPermitted: true,
      recognizablePeoplePresent: true,
      likenessConsentConfirmed: true,
      thirdPartyMaterialPresent: false,
      thirdPartyRightsConfirmed: true,
    },
  });
  const certification = buildCustomerContentCertification({
    category: "photo-video",
    technical: {
      ...technical,
      byteSize: info.size,
    },
    rights,
  });
  const existing = await readMaterialsEnvelope(CLIP_SOLD_RECERT_CAMPAIGN_ID);
  const item = {
    ...(existing?.items[0] ?? {
      id: "source-1",
      category: "photo-video" as const,
      requirementLevel: "required" as const,
      contentKind: "file-metadata" as const,
      label: "Talking-head",
      relatedServiceIds: [SKU] as const,
      uploadStatus: "stored" as const,
      fileName: path.basename(recert.designatedSourceRelativePath),
      url: recert.designatedSourceRelativePath,
    }),
    reviewStatus: "approved_for_use" as const,
    reason: "Owner-provided eligible 15–60 minute certification source",
    useAuthorization: {
      basis: "customer_owns" as const,
      attestedAt: new Date().toISOString(),
    },
    contentCertification: certification,
  };
  return writeMaterialsEnvelope({
    campaignId: CLIP_SOLD_RECERT_CAMPAIGN_ID,
    items: [item],
    updatedAt: new Date().toISOString(),
    version: existing?.version ?? 1,
    syncedAt: new Date().toISOString(),
  });
}

export async function runClipSoldContractApproval(input: { repoRoot: string }) {
  const campaignId = CLIP_SOLD_RECERT_CAMPAIGN_ID;
  const loaded = await readCampaignEnvelope(campaignId);
  if (!loaded?.record) throw new Error("Cole & Kindred campaign is missing.");

  const ctaKey = projectIntakeServiceFieldKey(SKU, "ctaText");
  const withCta = await upsertCampaignRecord(
    {
      ...loaded.record,
      routeMapIntake: {
        submittedAt:
          loaded.record.routeMapIntake?.submittedAt ??
          loaded.record.routeMapIntakeSubmittedAt ??
          new Date().toISOString(),
        answers: {
          ...(loaded.record.routeMapIntake?.answers ?? {}),
          ctaText: CLIP_SOLD_RECERT_REVISED_CTA,
          [ctaKey]: CLIP_SOLD_RECERT_REVISED_CTA,
        },
      },
    },
    loaded.clientUserId ?? "local-clip-sold-recert",
  );

  const materialsForTasks = (await readMaterialsEnvelope(campaignId))?.items ?? [];
  const existingTasks = await readTasksEnvelope(campaignId);
  if (existingTasks && existingTasks.tasks.length === 0) {
    const generated = generateCampaignTasks(withCta.record, materialsForTasks);
    await writeTasksEnvelope({
      ...existingTasks,
      ...generated,
      jobRecords: existingTasks.jobRecords,
      jobActivityEvents: existingTasks.jobActivityEvents,
      qaRecords: existingTasks.qaRecords,
      jobReviewFeedback: existingTasks.jobReviewFeedback,
    });
  }

  const bound = await ensureClipRepurposingMachineReviewBindFromCampaign(
    withCta.record,
  );
  const envelope = await readTasksEnvelope(campaignId);
  const job = envelope?.jobRecords?.find((record) => record.skuId === SKU);
  if (!envelope || !job) throw new Error("Clip job is missing after bind.");

  const ready =
    job.spineStatus === "ready_for_review" ||
    job.spineStatus === "approved" ||
    job.spineStatus === "ready_for_delivery"
      ? { job, events: envelope.jobActivityEvents ?? [] }
      : applyJobSpineStatusChange(job, envelope.jobActivityEvents ?? [], {
          job: {
            ...job,
            productionStartedAt: job.productionStartedAt ?? new Date().toISOString(),
            intakeComplete: true,
          },
          nextStatus: "ready_for_review",
          actor: MACHINE_ACTOR,
          reason: "Finished shorts are ready for customer review.",
        });

  const feedback = (envelope.jobReviewFeedback ?? []).find(
    (row) => row.jobId === job.jobId,
  );
  const pin = buildCustomerApprovedArtifactAuthorization({
    job: ready.job,
    feedback: {
      packageId: feedback?.packageId ?? `pkg:${job.jobId}:approved-set-v2`,
      releaseActivityId: feedback?.releaseActivityId ?? null,
      submissionType: "approved_for_delivery",
    },
    approvedAt: ready.job.customerApprovedArtifactAuthorization?.approvedAt,
  });
  if (!pin.ok) throw new Error(pin.error);

  const restored = applyJobSpineStatusChange(
    {
      ...ready.job,
      clientDeliveryFiles: [],
      customerApprovedArtifactAuthorization: pin.authorization,
    },
    ready.events,
    {
      job: ready.job,
      nextStatus: "approved",
      actor: MACHINE_ACTOR,
      reason: "Customer approved Set version 2. Restore the pinned delivery identity.",
    },
  );
  const assembled = assembleApprovedClipRepurposingClientDelivery({
    job: {
      ...restored.job,
      customerApprovedArtifactAuthorization: pin.authorization,
    },
    events: restored.events,
    actor: MACHINE_ACTOR,
    occurredAt: new Date().toISOString(),
  });
  const materials = await certifySoldRecertSource(input.repoRoot);
  const released = applySystemFinalDeliveryAuthorization(
    assembled.job,
    assembled.events,
    requiredClientDeliveryFileLabelsForJob(bound, assembled.job),
    {
      occurredAt: new Date().toISOString(),
      materialUse: materials
        ? materialContextFromLedger(materials.items)
        : { ledgerLoaded: false, items: [] },
    },
  );
  await writeTasksEnvelope({
    ...envelope,
    jobRecords: (envelope.jobRecords ?? []).map((record) =>
      record.jobId === job.jobId ? released.job : record,
    ),
    jobActivityEvents: released.events,
  });

  const files = released.job.clientDeliveryFiles ?? [];
  const proof = {
    campaignId,
    campaignName: bound.campaignName,
    revisedCta: CLIP_SOLD_RECERT_REVISED_CTA,
    workVersionId: pin.authorization.workVersionId,
    hashes: pin.authorization.contentSha256s,
    fileNames: files.map((file) => file.fileName),
    versionLabels: files.map((file) => file.versionLabel),
    fileCount: files.length,
    spine: released.job.spineStatus,
    finalDeliveryApplied: released.applied,
    finalDeliveryReason: released.reason ?? null,
  };
  writeJson(
    path.join(input.repoRoot, recert.stampDir, "APPROVED-SET-VERSION-2.json"),
    proof,
  );
  return proof;
}
