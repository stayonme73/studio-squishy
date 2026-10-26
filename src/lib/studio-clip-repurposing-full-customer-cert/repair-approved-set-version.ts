/**
 * Pin and assemble the approved Set version 2 files.
 * Customer approved version 2; leftover version 1 QA must not ship.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID,
  studioClipRepurposingFullCustomerCertificationV1 as cert,
} from "@/config/studio-clip-repurposing-full-customer-certification-v1";
import { requiredClientDeliveryFileLabelsForJob } from "@/lib/approved-plan-line";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { applySystemFinalDeliveryAuthorization } from "@/lib/job-control/final-delivery-actions";
import { materialContextFromLedger } from "@/lib/job-control/final-delivery-gates";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";
import { buildCustomerApprovedArtifactAuthorization } from "@/lib/studio-approved-delivery";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";
import { assembleApprovedClipRepurposingClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";

import { CLIP_FULL_CUSTOMER_CERT_REVISED_CTA } from "./run-cta-revision";

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

export async function repairClipFullCustomerApprovedSetVersion(input: {
  repoRoot: string;
}) {
  const campaignId = CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID;
  const loaded = await readCampaignEnvelope(campaignId);
  if (!loaded?.record) throw new Error("River & Reed campaign is missing.");

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
          ctaText: CLIP_FULL_CUSTOMER_CERT_REVISED_CTA,
          [ctaKey]: CLIP_FULL_CUSTOMER_CERT_REVISED_CTA,
        },
      },
    },
    loaded.clientUserId ?? "local-clip-full-customer-cert",
  );

  const bound = await ensureClipRepurposingMachineReviewBindFromCampaign(
    withCta.record,
  );
  const envelope = await readTasksEnvelope(campaignId);
  const job = envelope?.jobRecords?.find((record) => record.skuId === SKU);
  if (!envelope || !job) throw new Error("Clip job is missing after bind.");

  const feedback = (envelope.jobReviewFeedback ?? []).find(
    (row) => row.jobId === job.jobId,
  );
  const pin = buildCustomerApprovedArtifactAuthorization({
    job,
    feedback: {
      packageId: feedback?.packageId ?? `pkg:${job.jobId}:approved-set-v2`,
      releaseActivityId: feedback?.releaseActivityId ?? null,
      submissionType: "approved_for_delivery",
    },
    approvedAt: job.customerApprovedArtifactAuthorization?.approvedAt,
  });
  if (!pin.ok) throw new Error(pin.error);

  const restored = applyJobSpineStatusChange(
    {
      ...job,
      clientDeliveryFiles: [],
      customerApprovedArtifactAuthorization: pin.authorization,
    },
    envelope.jobActivityEvents ?? [],
    {
      job,
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
  const materials = await readMaterialsEnvelope(campaignId);
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
    revisedCta: CLIP_FULL_CUSTOMER_CERT_REVISED_CTA,
    workVersionId: pin.authorization.workVersionId,
    hashes: pin.authorization.contentSha256s,
    fileNames: files.map((file) => file.fileName),
    versionLabels: files.map((file) => file.versionLabel),
    fileCount: files.length,
    spine: released.job.spineStatus,
  };
  writeJson(
    path.join(input.repoRoot, cert.stampDir, "APPROVED-SET-VERSION-2.json"),
    proof,
  );
  return proof;
}
