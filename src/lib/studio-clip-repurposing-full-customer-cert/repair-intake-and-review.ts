/**
 * Stamp truthful designated-source clearance and rebind Review.
 * Does not invent customer facts. Does not publish.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID,
  studioClipRepurposingFullCustomerCertificationV1 as cert,
} from "@/config/studio-clip-repurposing-full-customer-certification-v1";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { syncMaterialsSummaryOnCampaign } from "@/lib/materials/campaign-summary";
import { countBlockingRequiredMaterials } from "@/lib/materials/materials-view";
import { readMaterialsEnvelope, writeMaterialsEnvelope } from "@/lib/materials/store";
import { certifyCustomerMaterialUpload } from "@/lib/studio-customer-content-intake/certify-upload";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";

const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

export async function repairClipFullCustomerIntakeAndReview(input: {
  repoRoot: string;
}) {
  const campaignId = CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID;
  const sourceAbs = path.join(input.repoRoot, cert.designatedSourceRelativePath);
  if (!existsSync(sourceAbs)) {
    throw new Error("Designated Clip source is missing.");
  }
  const bytes = readFileSync(sourceAbs);
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const certified = certifyCustomerMaterialUpload({
    category: "photo-video",
    bytes,
    fileName: path.basename(cert.designatedSourceRelativePath),
    mimeType: "video/mp4",
    checksumSha256,
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
  if (!certified.ok) {
    throw new Error(certified.error);
  }

  const existing = await readMaterialsEnvelope(campaignId);
  const item = {
    ...(existing?.items[0] ?? {
      id: "source-1",
      category: "photo-video" as const,
      requirementLevel: "required" as const,
      contentKind: "file-metadata" as const,
      label: "Talking-head",
      reason: "Owner-designated certification-rights-cleared source",
      relatedServiceIds: [CLIP_REPURPOSING_SKU] as const,
      uploadStatus: "stored" as const,
      fileName: path.basename(cert.designatedSourceRelativePath),
      url: cert.designatedSourceRelativePath,
    }),
    reviewStatus: "approved_for_use" as const,
    useAuthorization: {
      basis: "customer_owns" as const,
      attestedAt: new Date().toISOString(),
    },
    contentCertification: certified.certification,
  };
  const savedMaterials = await writeMaterialsEnvelope({
    campaignId,
    items: [item],
    updatedAt: new Date().toISOString(),
    version: 1,
    syncedAt: new Date().toISOString(),
  });
  await syncMaterialsSummaryOnCampaign(
    campaignId,
    countBlockingRequiredMaterials(savedMaterials.items, campaignId),
  );

  const envelope = await readCampaignEnvelope(campaignId);
  if (!envelope?.record) {
    throw new Error("River & Reed campaign is missing.");
  }
  const withIntakeContext = await upsertCampaignRecord(
    {
      ...envelope.record,
      routeMapIntakeSubmittedAt:
        envelope.record.routeMapIntakeSubmittedAt ?? new Date().toISOString(),
      routeMapContext: envelope.record.routeMapContext ?? {
        roadId: "i20",
        jobId: CLIP_REPURPOSING_SKU,
        selectedServiceIds: [CLIP_REPURPOSING_SKU],
        currentStep: "intake",
        selectedAt: new Date().toISOString(),
      },
    },
    envelope.clientUserId,
  );
  const bound = await ensureClipRepurposingMachineReviewBindFromCampaign(
    withIntakeContext.record,
  );
  const tasks = await readTasksEnvelope(campaignId);
  const job = tasks?.jobRecords?.find(
    (record) => record.skuId === CLIP_REPURPOSING_SKU,
  );
  if (tasks && job && job.spineStatus !== "ready_for_review") {
    const changed = applyJobSpineStatusChange(job, tasks.jobActivityEvents ?? [], {
      job: {
        ...job,
        productionStartedAt: job.productionStartedAt ?? new Date().toISOString(),
        intakeComplete: true,
      },
      nextStatus: "ready_for_review",
      actor: MACHINE_ACTOR,
      reason:
        "The talking-head is cleared and the three finished shorts are ready for review.",
    });
    await writeTasksEnvelope({
      ...tasks,
      jobRecords: (tasks.jobRecords ?? []).map((record) =>
        record.jobId === job.jobId ? changed.job : record,
      ),
      jobActivityEvents: changed.events,
    });
  }
  const latest = await readCampaignEnvelope(campaignId);
  if (latest?.record) {
    await upsertCampaignRecord(latest.record, latest.clientUserId);
  }

  return {
    campaignId,
    blockingRequiredCount: countBlockingRequiredMaterials(
      savedMaterials.items,
      campaignId,
    ),
    routingState: certified.certification.routingState,
    productionCleared: certified.certification.productionCleared,
    boundCampaignName: bound.campaignName,
  };
}
