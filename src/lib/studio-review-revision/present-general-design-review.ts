/**
 * Present QA-authorized general design PNGs as customer Review proofs.
 * Bytes live in File Room. Old proofs stay. Newest per format is current.
 * Review proof is not Final Delivery.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioGeneralDesignReviewBindV1 } from "@/config/studio-general-design-review-bind-v1";
import { resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import { mergeDeliverablePrep } from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { addJobFileReference } from "@/lib/file-registry/job-files";
import type { StudioFileCategory, StudioFileVisibility } from "@/lib/file-registry/types";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import {
  customerProofFilename,
  generalDesignReviewDeliverableKey,
} from "@/lib/studio-general-design-review-bind/customer-facing";
import type { GeneralDesignReviewArtifactContract } from "@/lib/studio-general-design-review-bind/types";
import { isBusinessCardLightHardenSku } from "@/config/studio-business-card-light-harden-v1";
import { isMenuLightHardenSku } from "@/config/studio-menu-light-harden-v1";
import { isServiceSheetLightHardenSku } from "@/config/studio-service-sheet-light-harden-v1";
import { isSocialPostsStandardHardenSku } from "@/config/studio-social-posts-standard-harden-v1";
import {
  BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
  BUSINESS_CARD_EXPORT_PREFIX,
} from "./business-card-purchase-delivery-truth";
import {
  MENU_CUSTOMER_PRINT_PDF_LABEL,
  MENU_EXPORT_PREFIX,
} from "./menu-purchase-delivery-truth";
import {
  SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL,
  SERVICE_SHEET_EXPORT_PREFIX,
} from "./service-sheet-purchase-delivery-truth";
import {
  SOCIAL_POSTS_CAPTIONS_LABEL,
  SOCIAL_POSTS_EXPORT_PREFIX,
  SOCIAL_POSTS_ORDER_LABEL,
} from "./social-posts-purchase-delivery-truth";
import { contentSha256Hex, sameContentSha256 } from "./hash";

const MACHINE_ACTOR = {
  role: "system" as const,
  displayName: "Studio Machine",
};

function updateJobInEnvelope(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
): ServerTasksEnvelope {
  const jobRecords = [...(envelope.jobRecords ?? [])];
  const index = jobRecords.findIndex((entry) => entry.jobId === job.jobId);
  if (index >= 0) jobRecords[index] = job;
  else jobRecords.push(job);
  return {
    ...envelope,
    jobRecords,
    jobActivityEvents: envelope.jobActivityEvents,
    updatedAt: new Date().toISOString(),
  };
}

function resolveAbsolutePath(relativePath: string | undefined): string | null {
  if (!relativePath?.trim()) return null;
  const abs = path.join(process.cwd(), relativePath.replace(/\\/g, "/"));
  return existsSync(abs) ? abs : null;
}

export function generalDesignReviewProofAlreadyPresented(
  job: PurchasedJobRecord,
  pngContentSha256: string,
): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      ref.category === "review_proof" &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage"
          ? ref.storageRef.checksumSha256
          : undefined,
        pngContentSha256,
      ),
  );
}

export async function uploadJobFile(input: {
  job: PurchasedJobRecord;
  events: readonly import("@/lib/job-control/types").JobActivityEvent[];
  campaign: CampaignRecord;
  abs: string;
  filename: string;
  contentType: string;
  hex: string;
  versionLabel: string;
  category: StudioFileCategory;
  visibility: StudioFileVisibility;
  status: "approved_for_review" | "draft";
  deliverableKey: string;
  deliverableLabel: string;
  idPrefix: string;
  occurredAt: string;
}): Promise<{
  job: PurchasedJobRecord;
  events: import("@/lib/job-control/types").JobActivityEvent[];
}> {
  const bytes = readFileSync(input.abs);
  const clientId = resolveCampaignCommunicationClientId(
    undefined,
    input.campaign.campaignId,
  );
  const adapter = createServerFileRoomStorageAdapter();
  const metadata = {
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: bytes.byteLength,
    checksumSha256: input.hex,
    versionLabel: input.versionLabel,
    uploadedAt: input.occurredAt,
  };
  const scope = {
    clientId,
    campaignId: input.job.campaignId,
    jobId: input.job.jobId,
    category: input.category,
  };
  const stored = await adapter.uploadObject({
    scope,
    metadata,
    body: bytes,
  });
  const storageRef = adapter.createStorageRef(scope, {
    ...metadata,
    uploadedAt: input.occurredAt,
  });
  const storedStorageRef =
    storageRef.provider === "supabase_storage"
      ? { ...storageRef, objectVersion: stored.objectVersion, checksumSha256: input.hex }
      : storageRef;

  const registry = addJobFileReference(input.job, input.events, {
    clientId,
    category: input.category,
    filename: input.filename,
    fileType: input.contentType,
    storageRef: storedStorageRef,
    visibility: input.visibility,
    status: input.status,
    versionLabel: input.versionLabel,
    actor: MACHINE_ACTOR,
    occurredAt: input.occurredAt,
    deliverableKey: input.deliverableKey,
    deliverableLabel: input.deliverableLabel,
    idPrefix: input.idPrefix,
  });
  return { job: registry.job, events: registry.events };
}

export async function presentGeneralDesignReviewProof(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  contract: GeneralDesignReviewArtifactContract;
}): Promise<{ envelope: ServerTasksEnvelope; presented: boolean }> {
  const job = input.envelope.jobRecords?.find(
    (entry) => entry.skuId === input.contract.skuId,
  );
  if (!job) return { envelope: input.envelope, presented: false };

  const versionLabel = `Version ${input.contract.renderVersion}`;
  const occurredAt = new Date().toISOString();
  let nextJob = job;
  let events = input.envelope.jobActivityEvents ?? [];
  let presentedAny = false;

  for (const member of input.contract.members) {
    const pngAbs = resolveAbsolutePath(member.pngRelativePath);
    if (!pngAbs) continue;
    if (generalDesignReviewProofAlreadyPresented(nextJob, member.pngContentSha256)) {
      const key = generalDesignReviewDeliverableKey(member.memberId);
      nextJob = {
        ...nextJob,
        deliverablePrep: mergeDeliverablePrep(
          nextJob.deliverablePrep,
          key,
          member.customerFormatLabel,
          true,
          MACHINE_ACTOR,
          occurredAt,
        ),
      };
      continue;
    }

    const uploaded = await uploadJobFile({
      job: nextJob,
      events,
      campaign: input.campaign,
      abs: pngAbs,
      filename: customerProofFilename({
        formatLabel: member.customerFormatLabel,
        renderVersion: input.contract.renderVersion,
      }),
      contentType: "image/png",
      hex: contentSha256Hex(member.pngContentSha256),
      versionLabel,
      category: "review_proof",
      visibility: "client_visible",
      status: "approved_for_review",
      deliverableKey: generalDesignReviewDeliverableKey(member.memberId),
      deliverableLabel: member.customerFormatLabel,
      idPrefix: `${studioGeneralDesignReviewBindV1.proofKeyPrefix}-${member.memberId}`,
      occurredAt,
    });
    nextJob = uploaded.job;
    events = uploaded.events;
    presentedAny = true;
    nextJob = {
      ...nextJob,
      deliverablePrep: mergeDeliverablePrep(
        nextJob.deliverablePrep,
        generalDesignReviewDeliverableKey(member.memberId),
        member.customerFormatLabel,
        true,
        MACHINE_ACTOR,
        occurredAt,
      ),
    };
  }

  const pdfExport = isServiceSheetLightHardenSku(input.contract.skuId)
    ? { prefix: SERVICE_SHEET_EXPORT_PREFIX, label: SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL }
    : isMenuLightHardenSku(input.contract.skuId)
      ? { prefix: MENU_EXPORT_PREFIX, label: MENU_CUSTOMER_PRINT_PDF_LABEL }
      : isBusinessCardLightHardenSku(input.contract.skuId)
        ? { prefix: BUSINESS_CARD_EXPORT_PREFIX, label: BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL }
        : null;
  if (pdfExport) {
    for (const member of input.contract.members) {
      if (!member.pdfRelativePath || !member.pdfContentSha256) continue;
      const pdfAbs = resolveAbsolutePath(member.pdfRelativePath);
      if (!pdfAbs) continue;
      const already = (nextJob.fileRegistry ?? []).some(
        (ref) =>
          ref.category === "internal_draft" &&
          ref.deliverableKey?.startsWith(`${pdfExport.prefix}:`) &&
          sameContentSha256(
            ref.storageRef.provider === "supabase_storage"
              ? ref.storageRef.checksumSha256
              : undefined,
            member.pdfContentSha256,
          ),
      );
      if (already) continue;
      const uploaded = await uploadJobFile({
        job: nextJob,
        events,
        campaign: input.campaign,
        abs: pdfAbs,
        filename: path.posix.basename(member.pdfRelativePath.replace(/\\/g, "/")),
        contentType: "application/pdf",
        hex: contentSha256Hex(member.pdfContentSha256),
        versionLabel,
        category: "internal_draft",
        visibility: "internal_only",
        status: "draft",
        deliverableKey: `${pdfExport.prefix}:pdf`,
        deliverableLabel: pdfExport.label,
        idPrefix: `${pdfExport.prefix}-pdf`,
        occurredAt,
      });
      nextJob = uploaded.job;
      events = uploaded.events;
      presentedAny = true;
    }
  }

  if (isSocialPostsStandardHardenSku(input.contract.skuId)) {
    const socialExports = [
      {
        rel: input.contract.captionTextRelativePath,
        hex: input.contract.captionTextSha256,
        key: `${SOCIAL_POSTS_EXPORT_PREFIX}:captions`,
        label: SOCIAL_POSTS_CAPTIONS_LABEL,
      },
      {
        rel: input.contract.postingOrderTextRelativePath,
        hex: input.contract.postingOrderTextSha256,
        key: `${SOCIAL_POSTS_EXPORT_PREFIX}:order`,
        label: SOCIAL_POSTS_ORDER_LABEL,
      },
    ];
    for (const file of socialExports) {
      if (!file.rel || !file.hex) continue;
      const abs = resolveAbsolutePath(file.rel);
      if (!abs) continue;
      const already = (nextJob.fileRegistry ?? []).some(
        (ref) =>
          ref.category === "internal_draft" &&
          ref.deliverableKey === file.key &&
          sameContentSha256(
            ref.storageRef.provider === "supabase_storage"
              ? ref.storageRef.checksumSha256
              : undefined,
            file.hex,
          ),
      );
      if (already) continue;
      const uploaded = await uploadJobFile({
        job: nextJob,
        events,
        campaign: input.campaign,
        abs,
        filename: path.posix.basename(file.rel.replace(/\\/g, "/")),
        contentType: "text/plain",
        hex: contentSha256Hex(file.hex),
        versionLabel,
        category: "internal_draft",
        visibility: "internal_only",
        status: "draft",
        deliverableKey: file.key,
        deliverableLabel: file.label,
        idPrefix: file.key.replace(":", "-"),
        occurredAt,
      });
      nextJob = uploaded.job;
      events = uploaded.events;
      presentedAny = true;
    }
  }

  if (!presentedAny && nextJob === job) {
    return { envelope: input.envelope, presented: false };
  }

  return {
    envelope: {
      ...updateJobInEnvelope(input.envelope, nextJob),
      jobActivityEvents: events,
    },
    presented: presentedAny,
  };
}
