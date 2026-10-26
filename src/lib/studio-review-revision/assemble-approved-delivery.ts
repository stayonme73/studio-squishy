/**
 * Bind the exact approved Review identity into customer Final Delivery files.
 * Flyer: PNG + PDF of Version N. Short video: MP4 of Version N.
 * Approval of the creative authorizes coordinated exports from that render identity.
 * Wrong-version or missing promised files fail closed.
 */

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { CREATIVE_QA_FINISH_SKU } from "@/lib/studio-creative-qa-finish/contract";
import { assembleApprovedCreativeQaClientDelivery } from "./creative-qa-finish-delivery";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import {
  SHORT_VIDEO_MACHINE_REVIEW_SKU,
  studioReviewRevisionFullLoopV1,
} from "@/config/studio-review-revision-full-loop-v1";
import {
  addJobFileReference,
  isApprovedReviewProofReference,
} from "@/lib/file-registry/job-files";
import { fileRoomFileAccessPath } from "@/lib/file-storage/routes";
import { resolveRequiredDeliverableKeys } from "@/lib/job-control/production-workspace-gates";
import type {
  JobActivityActor,
  JobActivityEvent,
  JobClientDeliveryFile,
  PurchasedJobRecord,
} from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

import { isCampaignGraphicsLightHardenSku } from "@/config/studio-campaign-graphics-light-harden-v1";
import { isCopyKitLightHardenSku } from "@/config/studio-copy-kit-light-harden-v1";
import { isMenuLightHardenSku } from "@/config/studio-menu-light-harden-v1";
import { isServiceSheetLightHardenSku } from "@/config/studio-service-sheet-light-harden-v1";
import { isBusinessCardLightHardenSku } from "@/config/studio-business-card-light-harden-v1";
import { isSocialPostsStandardHardenSku } from "@/config/studio-social-posts-standard-harden-v1";
import {
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL,
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL,
  CAMPAIGN_GRAPHICS_EXPORT_PREFIX,
} from "./campaign-graphics-purchase-delivery-truth";
import {
  MENU_CUSTOMER_PRINT_PDF_LABEL,
  MENU_DIGITAL_PNG_LABEL,
  MENU_EXPORT_PREFIX,
} from "./menu-purchase-delivery-truth";
import {
  BUSINESS_CARD_BACK_PNG_LABEL,
  BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
  BUSINESS_CARD_EXPORT_PREFIX,
  BUSINESS_CARD_FRONT_PNG_LABEL,
} from "./business-card-purchase-delivery-truth";
import {
  SOCIAL_POSTS_CAPTIONS_LABEL,
  SOCIAL_POSTS_EXPORT_PREFIX,
  SOCIAL_POSTS_ORDER_LABEL,
  socialPostsPngLabel,
} from "./social-posts-purchase-delivery-truth";
import {
  SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL,
  SERVICE_SHEET_DIGITAL_PNG_LABEL,
  SERVICE_SHEET_EXPORT_PREFIX,
} from "./service-sheet-purchase-delivery-truth";
import {
  COPY_EXPORT_DELIVERABLE_PREFIX,
  copyKitClientDeliveryFileLabels,
} from "./copy-kit-purchase-delivery-truth";
import {
  classifyFlyerIncludedSlot,
  customerPromisedFileLabels,
} from "./flyer-purchase-delivery-truth";
import {
  SOCIAL_PROMO_DELIVERY_FILES,
  isSocialPromoParentSku,
  socialPromoDeliveryFileForFilename,
  socialPromoDeliveryKey,
} from "./social-promo-purchase-delivery-truth";
import { isCampaignLaunchKitParentSku } from "./campaign-launch-kit-purchase-delivery-truth";
import { assembleApprovedCampaignLaunchKitClientDelivery } from "./campaign-launch-kit-delivery";
import { normalizeContentSha256, sameContentSha256 } from "./hash";

function proofChecksum(ref: StudioFileReference): string | undefined {
  return ref.storageRef.provider === "supabase_storage"
    ? ref.storageRef.checksumSha256
    : undefined;
}

function isInternalPrintPdf(ref: StudioFileReference): boolean {
  return (
    ref.category === "internal_draft" &&
    /pdf/i.test(ref.fileType) &&
    Boolean(proofChecksum(ref))
  );
}

function pinHashMatching(pinHashes: readonly string[], checksum: string | undefined): string | undefined {
  if (!checksum) return undefined;
  return pinHashes.find((hash) => sameContentSha256(checksum, hash));
}

function appendCdf(
  files: JobClientDeliveryFile[],
  input: {
    job: PurchasedJobRecord;
    def: { key: string; label: string };
    source: StudioFileReference;
    pinHash: string;
    occurredAt: string;
    actor: JobActivityActor;
    approval: NonNullable<PurchasedJobRecord["customerApprovedArtifactAuthorization"]>;
    registryFileId: string;
    storageRef: StudioFileReference["storageRef"];
  },
): JobClientDeliveryFile[] {
  if (
    files.some(
      (file) =>
        file.deliverableKey === input.def.key &&
        sameContentSha256(file.contentSha256, input.pinHash),
    )
  ) {
    return files;
  }
  return [
    ...files,
    {
      id: `cdf:${input.job.jobId}:${input.def.key}:${input.occurredAt}`,
      registryFileId: input.registryFileId,
      deliverableKey: input.def.key,
      deliverableLabel: input.def.label,
      fileName: input.source.filename,
      fileType: input.source.fileType,
      url: fileRoomFileAccessPath(input.registryFileId, "download"),
      storageRef: input.storageRef,
      versionLabel: input.source.versionLabel,
      visibility: "client_visible",
      releaseStatus: "pending_release",
      addedAt: input.occurredAt,
      addedBy: input.actor,
      contentSha256: input.pinHash,
      artifactId: input.approval.artifactIds[0],
      approvedWorkVersionId: input.approval.workVersionId ?? undefined,
      approvedAuthorizationDecisionId: input.approval.decisionId,
    },
  ];
}

function isVideoMp4Proof(ref: StudioFileReference): boolean {
  return (
    /video\/mp4/i.test(ref.fileType) ||
    /\.mp4$/i.test(ref.filename) ||
    (ref.storageRef.provider === "supabase_storage" &&
      /video\/mp4/i.test(ref.storageRef.contentType ?? ""))
  );
}

/**
 * Pin the approved Review MP4 as the client Final Delivery file for $349 footage editing.
 * Reuses the stills MP4 pin structure, not the stills SKU or stills copy.
 */
export function assembleApprovedFootageEditingClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  return assembleApprovedShortVideoClientDelivery({
    ...input,
    requiredDeliverableLabel:
      input.requiredDeliverableLabel ??
      "Final vertical MP4 1080×1920 — edited talking-head with speech captions and CTA",
  });
}

/**
 * Pin the approved Review MP4 as the client Final Delivery file for short video.
 */
export function assembleApprovedShortVideoClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const pinHashes = approval.contentSha256s.map(normalizeContentSha256);
  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const mp4Source = proofs.find(
    (ref) => isVideoMp4Proof(ref) && Boolean(pinHashMatching(pinHashes, proofChecksum(ref))),
  );
  const mp4PinHash = mp4Source
    ? pinHashMatching(pinHashes, proofChecksum(mp4Source))
    : undefined;
  if (!mp4Source || !mp4PinHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const allDefs = resolveRequiredDeliverableKeys(input.requiredDeliverables ?? []);
  const fallbackKey =
    mp4Source.deliverableKey ?? studioReviewRevisionFullLoopV1.deliverableKey;
  const fallbackLabel =
    mp4Source.deliverableLabel ??
    input.requiredDeliverableLabel ??
    "Final vertical MP4 1080×1920 — still photos, captions, and CTA";
  const defs =
    allDefs.length > 0 ? allDefs : [{ key: fallbackKey, label: fallbackLabel }];
  const existing = input.job.clientDeliveryFiles ?? [];
  const missing = defs.filter(
    (def) =>
      !existing.some(
        (file) =>
          file.deliverableKey === def.key &&
          sameContentSha256(file.contentSha256, mp4PinHash),
      ),
  );
  if (missing.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];

  for (const def of missing) {
    const registry = addJobFileReference(job, events, {
      clientId: mp4Source.clientId,
      category: "final_delivery",
      filename: mp4Source.filename,
      fileType: mp4Source.fileType,
      storageRef:
        mp4Source.storageRef.provider === "supabase_storage"
          ? { ...mp4Source.storageRef, visibilityState: "client-final" }
          : mp4Source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: mp4Source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def,
      source: mp4Source,
      pinHash: mp4PinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: true,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

/**
 * Pin every approved set Review MP4 as client Final Delivery for Clip Repurposing.
 * One purchase. One, two, or three files matching the frozen remedy.
 */
export function assembleApprovedClipRepurposingClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const pinHashes = approval.contentSha256s.map(normalizeContentSha256);
  const proofs = (input.job.fileRegistry ?? []).filter(
    (ref) => isApprovedReviewProofReference(ref) && isVideoMp4Proof(ref),
  );
  const matched = proofs
    .map((source) => ({
      source,
      pinHash: pinHashMatching(pinHashes, proofChecksum(source)),
    }))
    .filter((entry): entry is { source: typeof proofs[number]; pinHash: string } =>
      Boolean(entry.pinHash),
    );
  if (matched.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...(job.clientDeliveryFiles ?? [])];
  let assembled = false;

  matched.forEach((entry, index) => {
    const def = {
      key: entry.source.deliverableKey ?? `clip-repurposing-${index + 1}`,
      label:
        entry.source.deliverableLabel ??
        input.requiredDeliverableLabel ??
        `Clip ${index + 1} — 1080×1920 MP4`,
    };
    if (
      nextFiles.some(
        (file) =>
          file.deliverableKey === def.key &&
          sameContentSha256(file.contentSha256, entry.pinHash),
      )
    ) {
      return;
    }
    nextFiles = nextFiles.filter((file) => file.deliverableKey !== def.key);
    const registry = addJobFileReference(job, events, {
      clientId: entry.source.clientId,
      category: "final_delivery",
      filename: entry.source.filename,
      fileType: entry.source.fileType,
      storageRef:
        entry.source.storageRef.provider === "supabase_storage"
          ? { ...entry.source.storageRef, visibilityState: "client-final" }
          : entry.source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: entry.source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def,
      source: entry.source,
      pinHash: entry.pinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
    assembled = true;
  });

  return {
    assembled,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

/** Route flyer vs short-video vs copy-kit Final Delivery assembly. */
export function assembleApprovedClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  if (isCampaignLaunchKitParentSku(input.job.skuId)) {
    return assembleApprovedCampaignLaunchKitClientDelivery(input);
  }
  if (isSocialPromoParentSku(input.job.skuId)) {
    return assembleApprovedSocialPromoClientDelivery(input);
  }
  if (input.job.skuId === SHORT_VIDEO_MACHINE_REVIEW_SKU) {
    return assembleApprovedShortVideoClientDelivery(input);
  }
  if (input.job.skuId === SHORT_FORM_VIDEO_EDITING_SKU) {
    return assembleApprovedFootageEditingClientDelivery(input);
  }
  if (input.job.skuId === CLIP_REPURPOSING_SKU) {
    return assembleApprovedClipRepurposingClientDelivery(input);
  }
  if (isCopyKitLightHardenSku(input.job.skuId)) {
    return assembleApprovedCopyKitClientDelivery(input);
  }
  if (isServiceSheetLightHardenSku(input.job.skuId)) {
    return assembleApprovedServiceSheetClientDelivery(input);
  }
  if (isCampaignGraphicsLightHardenSku(input.job.skuId)) {
    return assembleApprovedCampaignGraphicsClientDelivery(input);
  }
  if (isMenuLightHardenSku(input.job.skuId)) {
    return assembleApprovedMenuClientDelivery(input);
  }
  if (isSocialPostsStandardHardenSku(input.job.skuId)) {
    return assembleApprovedSocialPostsClientDelivery(input);
  }
  if (isBusinessCardLightHardenSku(input.job.skuId)) {
    return assembleApprovedBusinessCardClientDelivery(input);
  }
  if (input.job.skuId === CREATIVE_QA_FINISH_SKU) {
    return assembleApprovedCreativeQaClientDelivery(input);
  }
  return assembleApprovedFlyerClientDelivery(input);
}

/**
 * Social & Promo Graphics: all eight approved Review files become the Final Delivery set.
 * Only proofs whose bytes are in the customer approval pin are used; a partial set fails closed.
 */
export function assembleApprovedSocialPromoClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const pinHashes = approval.contentSha256s.map(normalizeContentSha256);
  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const defs = SOCIAL_PROMO_DELIVERY_FILES.map((file) => {
    const source = [...proofs]
      .reverse()
      .find(
        (ref) =>
          socialPromoDeliveryFileForFilename(ref.filename)?.member === file.member &&
          Boolean(pinHashMatching(pinHashes, proofChecksum(ref))),
      );
    const pinHash = source ? pinHashMatching(pinHashes, proofChecksum(source)) : undefined;
    return { file, source, pinHash };
  });
  if (defs.some((def) => !def.source || !def.pinHash)) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = defs.filter(
    (def) =>
      !existing.some(
        (file) =>
          file.deliverableKey === socialPromoDeliveryKey(def.file.member) &&
          sameContentSha256(file.contentSha256, def.pinHash),
      ),
  );
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  for (const def of pending) {
    const source = def.source!;
    const key = socialPromoDeliveryKey(def.file.member);
    const registry = addJobFileReference(job, events, {
      clientId: source.clientId,
      category: "final_delivery",
      filename: source.filename,
      fileType: source.fileType,
      storageRef:
        source.storageRef.provider === "supabase_storage"
          ? { ...source.storageRef, visibilityState: "client-final" }
          : source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: key,
      deliverableLabel: def.file.fileLabel,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def: { key, label: def.file.fileLabel },
      source,
      pinHash: def.pinHash!,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

export function assembleApprovedBusinessCardClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const pngs = proofs.filter((ref) => /png/i.test(ref.fileType) || /\.png$/i.test(ref.filename));
  const unique = pngs.filter((ref, index, list) => {
    const hash = proofChecksum(ref);
    return (
      Boolean(hash) &&
      list.findIndex((other) => sameContentSha256(proofChecksum(other), hash)) === index
    );
  });
  const front =
    unique.find((ref) => Boolean(ref.deliverableKey?.endsWith(":front"))) ?? unique[0];
  const back =
    unique.find((ref) => Boolean(ref.deliverableKey?.endsWith(":back"))) ?? unique[1];
  const pdfSource = (input.job.fileRegistry ?? []).find(
    (ref) =>
      ref.category === "internal_draft" &&
      Boolean(ref.deliverableKey?.startsWith(`${BUSINESS_CARD_EXPORT_PREFIX}:`)),
  );
  const frontHash = front ? proofChecksum(front) : undefined;
  const backHash = back ? proofChecksum(back) : undefined;
  const pdfHash = pdfSource ? proofChecksum(pdfSource) : undefined;
  if (!front || !frontHash || !back || !backHash || !pdfSource || !pdfHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const defs = [
    {
      key: `${BUSINESS_CARD_EXPORT_PREFIX}:front`,
      label: BUSINESS_CARD_FRONT_PNG_LABEL,
      source: front,
      pinHash: frontHash,
    },
    {
      key: `${BUSINESS_CARD_EXPORT_PREFIX}:back`,
      label: BUSINESS_CARD_BACK_PNG_LABEL,
      source: back,
      pinHash: backHash,
    },
    {
      key: `${BUSINESS_CARD_EXPORT_PREFIX}:pdf`,
      label: BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
      source: pdfSource,
      pinHash: pdfHash,
    },
  ];
  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = defs.filter(
    (def) => !existing.some((file) => sameContentSha256(file.contentSha256, def.pinHash)),
  );
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  for (const def of pending) {
    const registry = addJobFileReference(job, events, {
      clientId: def.source.clientId,
      category: "final_delivery",
      filename: def.source.filename,
      fileType: def.source.fileType,
      storageRef:
        def.source.storageRef.provider === "supabase_storage"
          ? { ...def.source.storageRef, visibilityState: "client-final" }
          : def.source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: def.source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def: { key: def.key, label: def.label },
      source: def.source,
      pinHash: def.pinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

export function assembleApprovedSocialPostsClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const pngs = proofs.filter((ref) => /png/i.test(ref.fileType) || /\.png$/i.test(ref.filename));
  const unique = pngs.filter((ref, index, list) => {
    const hash = proofChecksum(ref);
    return (
      Boolean(hash) &&
      list.findIndex((other) => sameContentSha256(proofChecksum(other), hash)) === index
    );
  });
  const orderedPngs = ([1, 2, 3, 4] as const).map((order) => {
    const keyed = unique.find((ref) =>
      Boolean(ref.deliverableKey?.endsWith(`:post-${order}`)),
    );
    return keyed ?? unique[order - 1];
  });
  if (orderedPngs.some((ref) => !ref || !proofChecksum(ref))) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const captionsSource = (input.job.fileRegistry ?? []).find(
    (ref) =>
      ref.category === "internal_draft" &&
      ref.deliverableKey === `${SOCIAL_POSTS_EXPORT_PREFIX}:captions`,
  );
  const orderSource = (input.job.fileRegistry ?? []).find(
    (ref) =>
      ref.category === "internal_draft" &&
      ref.deliverableKey === `${SOCIAL_POSTS_EXPORT_PREFIX}:order`,
  );
  const captionsHash = captionsSource ? proofChecksum(captionsSource) : undefined;
  const orderHash = orderSource ? proofChecksum(orderSource) : undefined;
  if (!captionsSource || !captionsHash || !orderSource || !orderHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const defs = [
    ...orderedPngs.map((source, index) => ({
      key: `${SOCIAL_POSTS_EXPORT_PREFIX}:post-${(index + 1) as 1 | 2 | 3 | 4}`,
      label: socialPostsPngLabel((index + 1) as 1 | 2 | 3 | 4),
      source: source!,
      pinHash: proofChecksum(source!)!,
    })),
    {
      key: `${SOCIAL_POSTS_EXPORT_PREFIX}:captions`,
      label: SOCIAL_POSTS_CAPTIONS_LABEL,
      source: captionsSource,
      pinHash: captionsHash,
    },
    {
      key: `${SOCIAL_POSTS_EXPORT_PREFIX}:order`,
      label: SOCIAL_POSTS_ORDER_LABEL,
      source: orderSource,
      pinHash: orderHash,
    },
  ];
  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = defs.filter(
    (def) => !existing.some((file) => sameContentSha256(file.contentSha256, def.pinHash)),
  );
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  for (const def of pending) {
    const registry = addJobFileReference(job, events, {
      clientId: def.source.clientId,
      category: "final_delivery",
      filename: def.source.filename,
      fileType: def.source.fileType,
      storageRef:
        def.source.storageRef.provider === "supabase_storage"
          ? { ...def.source.storageRef, visibilityState: "client-final" }
          : def.source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: def.source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def: { key: def.key, label: def.label },
      source: def.source,
      pinHash: def.pinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

export function assembleApprovedMenuClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const pngSource = proofs.find((ref) => /png/i.test(ref.fileType) || /\.png$/i.test(ref.filename));
  const pngHash = pngSource ? proofChecksum(pngSource) : undefined;
  const pdfSource = (input.job.fileRegistry ?? []).find(
    (ref) =>
      ref.category === "internal_draft" &&
      Boolean(ref.deliverableKey?.startsWith(`${MENU_EXPORT_PREFIX}:`)),
  );
  const pdfHash = pdfSource ? proofChecksum(pdfSource) : undefined;
  if (!pngSource || !pngHash || !pdfSource || !pdfHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const defs = [
    { key: `${MENU_EXPORT_PREFIX}:png`, label: MENU_DIGITAL_PNG_LABEL, source: pngSource, pinHash: pngHash },
    { key: `${MENU_EXPORT_PREFIX}:pdf`, label: MENU_CUSTOMER_PRINT_PDF_LABEL, source: pdfSource, pinHash: pdfHash },
  ];
  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = defs.filter(
    (def) => !existing.some((file) => sameContentSha256(file.contentSha256, def.pinHash)),
  );
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  for (const def of pending) {
    const registry = addJobFileReference(job, events, {
      clientId: def.source.clientId,
      category: "final_delivery",
      filename: def.source.filename,
      fileType: def.source.fileType,
      storageRef:
        def.source.storageRef.provider === "supabase_storage"
          ? { ...def.source.storageRef, visibilityState: "client-final" }
          : def.source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: def.source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def: { key: def.key, label: def.label },
      source: def.source,
      pinHash: def.pinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

export function assembleApprovedCampaignGraphicsClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const pngs = proofs.filter((ref) => /png/i.test(ref.fileType) || /\.png$/i.test(ref.filename));
  const unique = pngs.filter((ref, index, list) => {
    const hash = proofChecksum(ref);
    return (
      Boolean(hash) &&
      list.findIndex((other) => sameContentSha256(proofChecksum(other), hash)) === index
    );
  });
  if (unique.length < 2) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const defs = [
    {
      key: `${CAMPAIGN_GRAPHICS_EXPORT_PREFIX}:png-a`,
      label: CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL,
      source: unique[0]!,
      pinHash: proofChecksum(unique[0]!)!,
    },
    {
      key: `${CAMPAIGN_GRAPHICS_EXPORT_PREFIX}:png-b`,
      label: CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL,
      source: unique[1]!,
      pinHash: proofChecksum(unique[1]!)!,
    },
  ];
  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = defs.filter(
    (def) => !existing.some((file) => sameContentSha256(file.contentSha256, def.pinHash)),
  );
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  for (const def of pending) {
    const registry = addJobFileReference(job, events, {
      clientId: def.source.clientId,
      category: "final_delivery",
      filename: def.source.filename,
      fileType: def.source.fileType,
      storageRef:
        def.source.storageRef.provider === "supabase_storage"
          ? { ...def.source.storageRef, visibilityState: "client-final" }
          : def.source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: def.source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def: { key: def.key, label: def.label },
      source: def.source,
      pinHash: def.pinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

export function assembleApprovedServiceSheetClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const pngSource = proofs.find((ref) => /png/i.test(ref.fileType) || /\.png$/i.test(ref.filename));
  const pngHash = pngSource ? proofChecksum(pngSource) : undefined;
  const pdfSource = (input.job.fileRegistry ?? []).find(
    (ref) =>
      ref.category === "internal_draft" &&
      Boolean(ref.deliverableKey?.startsWith(`${SERVICE_SHEET_EXPORT_PREFIX}:`)),
  );
  const pdfHash = pdfSource ? proofChecksum(pdfSource) : undefined;
  if (!pngSource || !pngHash || !pdfSource || !pdfHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const defs = [
    { key: `${SERVICE_SHEET_EXPORT_PREFIX}:png`, label: SERVICE_SHEET_DIGITAL_PNG_LABEL, source: pngSource, pinHash: pngHash },
    { key: `${SERVICE_SHEET_EXPORT_PREFIX}:pdf`, label: SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL, source: pdfSource, pinHash: pdfHash },
  ];
  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = defs.filter(
    (def) => !existing.some((file) => sameContentSha256(file.contentSha256, def.pinHash)),
  );
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  for (const def of pending) {
    const registry = addJobFileReference(job, events, {
      clientId: def.source.clientId,
      category: "final_delivery",
      filename: def.source.filename,
      fileType: def.source.fileType,
      storageRef:
        def.source.storageRef.provider === "supabase_storage"
          ? { ...def.source.storageRef, visibilityState: "client-final" }
          : def.source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: def.source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def: { key: def.key, label: def.label },
      source: def.source,
      pinHash: def.pinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

export function assembleApprovedCopyKitClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const exports = (input.job.fileRegistry ?? []).filter(
    (ref) =>
      ref.category === "internal_draft" &&
      Boolean(ref.deliverableKey?.startsWith(`${COPY_EXPORT_DELIVERABLE_PREFIX}:`)),
  );
  const fileLabels = copyKitClientDeliveryFileLabels(
    input.job.skuId,
    input.requiredDeliverables ?? [],
  );
  if (exports.length === 0 || fileLabels.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = exports.filter((source) => {
    const checksum = proofChecksum(source);
    return (
      Boolean(checksum) &&
      !existing.some((file) => sameContentSha256(file.contentSha256, checksum))
    );
  });
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  const slotLabel = fileLabels[0]!;

  for (const source of pending) {
    const pinHash = proofChecksum(source);
    if (!pinHash) continue;
    const def = {
      key: source.deliverableKey ?? `${COPY_EXPORT_DELIVERABLE_PREFIX}:${source.filename}`,
      label: source.deliverableLabel || slotLabel,
    };
    const registry = addJobFileReference(job, events, {
      clientId: source.clientId,
      category: "final_delivery",
      filename: source.filename,
      fileType: source.fileType,
      storageRef:
        source.storageRef.provider === "supabase_storage"
          ? { ...source.storageRef, visibilityState: "client-final" }
          : source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def,
      source,
      pinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: {
      ...job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}

export function assembleApprovedFlyerClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const pinHashes = approval.contentSha256s.map(normalizeContentSha256);
  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const pngSource = proofs.find((ref) => pinHashMatching(pinHashes, proofChecksum(ref)));
  const pngPinHash = pngSource
    ? pinHashMatching(pinHashes, proofChecksum(pngSource))
    : undefined;
  const pdfSource = (input.job.fileRegistry ?? []).find(
    (ref) =>
      isInternalPrintPdf(ref) && Boolean(pinHashMatching(pinHashes, proofChecksum(ref))),
  );
  const pdfPinHash = pdfSource
    ? pinHashMatching(pinHashes, proofChecksum(pdfSource))
    : undefined;

  const allDefs = resolveRequiredDeliverableKeys(input.requiredDeliverables ?? []);
  const fileLabels = customerPromisedFileLabels(input.requiredDeliverables ?? []);
  const fileDefs =
    fileLabels.length > 0
      ? allDefs.filter((def) => fileLabels.includes(def.label))
      : [];

  if (fileDefs.length > 0) {
    const pngDef = fileDefs.find(
      (def) => classifyFlyerIncludedSlot(def.label)?.format === "png",
    );
    const pdfDef = fileDefs.find(
      (def) => classifyFlyerIncludedSlot(def.label)?.format === "pdf",
    );
    if (!pngSource || !pngPinHash || (pdfDef && (!pdfSource || !pdfPinHash))) {
      return { job: input.job, events: [...input.events], assembled: false };
    }

    const existing = input.job.clientDeliveryFiles ?? [];
    const missing = fileDefs.filter(
      (def) =>
        !existing.some((file) => {
          const expected =
            classifyFlyerIncludedSlot(def.label)?.format === "pdf" ? pdfPinHash : pngPinHash;
          return (
            file.deliverableKey === def.key &&
            sameContentSha256(file.contentSha256, expected)
          );
        }),
    );
    if (missing.length === 0) {
      return { job: input.job, events: [...input.events], assembled: false };
    }

    let job = input.job;
    let events = [...input.events];
    let nextFiles = [...existing];

    for (const def of missing) {
      const format = classifyFlyerIncludedSlot(def.label)?.format;
      const source = format === "pdf" ? pdfSource : pngSource;
      const pinHash = format === "pdf" ? pdfPinHash : pngPinHash;
      if (!source || !pinHash) {
        return { job: input.job, events: [...input.events], assembled: false };
      }
      const registry = addJobFileReference(job, events, {
        clientId: source.clientId,
        category: "final_delivery",
        filename: source.filename,
        fileType: source.fileType,
        storageRef:
          source.storageRef.provider === "supabase_storage"
            ? { ...source.storageRef, visibilityState: "client-final" }
            : source.storageRef,
        visibility: "client_visible",
        status: "approved_for_release",
        versionLabel: source.versionLabel,
        actor: input.actor,
        occurredAt,
        deliverableKey: def.key,
        deliverableLabel: def.label,
        idPrefix: "final-file",
      });
      job = registry.job;
      events = registry.events;
      nextFiles = appendCdf(nextFiles, {
        job,
        def,
        source,
        pinHash,
        occurredAt,
        actor: input.actor,
        approval,
        registryFileId: registry.file.id,
        storageRef: registry.file.storageRef,
      });
    }

    return {
      assembled: true,
      events,
      job: {
        ...job,
        clientDeliveryFiles: nextFiles,
        updatedAt: occurredAt,
      },
    };
  }

  if (!pngSource || !pngPinHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const fallbackKey =
    pngSource.deliverableKey ?? studioReviewRevisionFullLoopV1.deliverableKey;
  const fallbackLabel =
    pngSource.deliverableLabel ??
    input.requiredDeliverableLabel ??
    studioReviewRevisionFullLoopV1.serviceName;
  const defs = allDefs.length > 0 ? allDefs : [{ key: fallbackKey, label: fallbackLabel }];
  const existing = input.job.clientDeliveryFiles ?? [];
  const missing = defs.filter(
    (def) =>
      !existing.some(
        (file) =>
          file.deliverableKey === def.key &&
          sameContentSha256(file.contentSha256, pngPinHash),
      ),
  );
  if (missing.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const registry = addJobFileReference(input.job, input.events, {
    clientId: pngSource.clientId,
    category: "final_delivery",
    filename: pngSource.filename,
    fileType: pngSource.fileType,
    storageRef:
      pngSource.storageRef.provider === "supabase_storage"
        ? { ...pngSource.storageRef, visibilityState: "client-final" }
        : pngSource.storageRef,
    visibility: "client_visible",
    status: "approved_for_release",
    versionLabel: pngSource.versionLabel,
    actor: input.actor,
    occurredAt,
    deliverableKey: missing[0]!.key,
    deliverableLabel: missing[0]!.label,
    idPrefix: "final-file",
  });

  let nextFiles: JobClientDeliveryFile[] = [...(registry.job.clientDeliveryFiles ?? [])];
  for (const def of missing) {
    nextFiles = appendCdf(nextFiles, {
      job: registry.job,
      def,
      source: pngSource,
      pinHash: pngPinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: true,
    events: registry.events,
    job: {
      ...registry.job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}
