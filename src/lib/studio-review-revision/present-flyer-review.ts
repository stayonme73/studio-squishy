/**
 * Present the QA-passed Machine flyer PNG as a customer Review proof,
 * and hold the coordinated print PDF as an internal draft of the same identity.
 * Bytes live in File Room. Old proofs stay. Newest is current.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
import { requiredDeliverablesForJob } from "@/lib/approved-plan-line";
import { resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import {
  mergeDeliverablePrep,
  resolveRequiredDeliverableKeys,
} from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { addJobFileReference } from "@/lib/file-registry/job-files";
import type { StudioFileCategory, StudioFileVisibility } from "@/lib/file-registry/types";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";

import { classifyFlyerIncludedSlot } from "./flyer-purchase-delivery-truth";
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

function registryHasHash(
  job: PurchasedJobRecord,
  category: StudioFileCategory,
  contentSha256: string,
): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      ref.category === category &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage"
          ? ref.storageRef.checksumSha256
          : undefined,
        contentSha256,
      ),
  );
}

export function reviewProofAlreadyPresented(
  job: PurchasedJobRecord,
  pngContentSha256: string,
): boolean {
  return registryHasHash(job, "review_proof", pngContentSha256);
}

async function uploadJobFile(input: {
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

export async function presentFlyerReviewProof(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  pngRelativePath?: string;
  pngContentSha256: string;
  pdfRelativePath?: string;
  pdfContentSha256?: string;
  renderVersion: number;
  artifactId: string;
}): Promise<{ envelope: ServerTasksEnvelope; presented: boolean }> {
  const job = input.envelope.jobRecords?.find(
    (entry) => entry.skuId === DESIGN_RENDERER_PROOF_SKU,
  );
  if (!job) return { envelope: input.envelope, presented: false };

  const pngAbs = resolveAbsolutePath(input.pngRelativePath);
  const pdfAbs = resolveAbsolutePath(input.pdfRelativePath);
  const pngReady = Boolean(pngAbs);
  const pdfReady = Boolean(pdfAbs && input.pdfContentSha256);
  const pngPresented = reviewProofAlreadyPresented(job, input.pngContentSha256);
  const pdfPresented = input.pdfContentSha256
    ? registryHasHash(job, "internal_draft", input.pdfContentSha256)
    : true;
  if (pngPresented && pdfPresented) {
    return { envelope: input.envelope, presented: false };
  }
  if (!pngReady && !pdfReady) return { envelope: input.envelope, presented: false };

  const versionLabel = `Version ${input.renderVersion}`;
  const occurredAt = new Date().toISOString();
  const required = requiredDeliverablesForJob(input.campaign, job);
  const requiredDefs = resolveRequiredDeliverableKeys([...required]);
  const designDef =
    requiredDefs.find(
      (def) => classifyFlyerIncludedSlot(def.label)?.class === "customer_promised_design",
    ) ?? requiredDefs[0];
  const pdfDef = requiredDefs.find(
    (def) => classifyFlyerIncludedSlot(def.label)?.format === "pdf",
  );
  const deliverableLabel =
    designDef?.label ?? studioReviewRevisionFullLoopV1.serviceName;
  const deliverableKey =
    designDef?.key ?? studioReviewRevisionFullLoopV1.deliverableKey;

  let nextJob = job;
  let events = input.envelope.jobActivityEvents ?? [];

  if (pngAbs && !pngPresented) {
    const uploaded = await uploadJobFile({
      job: nextJob,
      events,
      campaign: input.campaign,
      abs: pngAbs,
      filename: `flyer-${versionLabel.replace(/\s+/g, "-").toLowerCase()}.png`,
      contentType: "image/png",
      hex: contentSha256Hex(input.pngContentSha256),
      versionLabel,
      category: "review_proof",
      visibility: "client_visible",
      status: "approved_for_review",
      deliverableKey,
      deliverableLabel,
      idPrefix: "proof",
      occurredAt,
    });
    nextJob = uploaded.job;
    events = uploaded.events;
  }

  if (pdfAbs && input.pdfContentSha256 && !pdfPresented) {
    const uploaded = await uploadJobFile({
      job: nextJob,
      events,
      campaign: input.campaign,
      abs: pdfAbs,
      filename: `flyer-${versionLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      contentType: "application/pdf",
      hex: contentSha256Hex(input.pdfContentSha256),
      versionLabel,
      category: "internal_draft",
      visibility: "internal_only",
      status: "draft",
      deliverableKey: pdfDef?.key ?? "print_ready_pdf",
      deliverableLabel: pdfDef?.label ?? "Print-ready PDF",
      idPrefix: "print-export",
      occurredAt,
    });
    nextJob = uploaded.job;
    events = uploaded.events;
  }

  let prep = nextJob.deliverablePrep;
  for (const def of requiredDefs.length > 0
    ? requiredDefs
    : [{ key: deliverableKey, label: deliverableLabel }]) {
    prep = mergeDeliverablePrep(
      prep,
      def.key,
      def.label,
      true,
      MACHINE_ACTOR,
      occurredAt,
    );
  }

  nextJob = {
    ...nextJob,
    deliverablePrep: prep,
  };

  return {
    envelope: {
      ...updateJobInEnvelope(input.envelope, nextJob),
      jobActivityEvents: events,
    },
    presented: true,
  };
}
