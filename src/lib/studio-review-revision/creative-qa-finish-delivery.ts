import { CREATIVE_QA_DELIVERABLE_LABEL, CREATIVE_QA_FINISH_SKU } from "@/lib/studio-creative-qa-finish/contract";
import { isApprovedReviewProofReference } from "@/lib/file-registry/job-files";
import type { StudioFileReference, StudioFileStorageReference } from "@/lib/file-registry/types";
import { addClientDeliveryFile } from "@/lib/job-control/final-delivery-actions";
import type { JobActivityActor, JobActivityEvent, PurchasedJobRecord } from "@/lib/job-control/types";

export function creativeQaProofSha256(storageRef: StudioFileStorageReference): string | null {
  if (storageRef.provider === "supabase_storage") {
    const checksum = storageRef.checksumSha256?.trim().toLowerCase() ?? "";
    return /^[a-f0-9]{64}$/.test(checksum) ? checksum : null;
  }
  if (storageRef.provider === "google_shared_drive" && storageRef.note?.startsWith("sha256:")) {
    const checksum = storageRef.note.slice("sha256:".length).trim().toLowerCase();
    return /^[a-f0-9]{64}$/.test(checksum) ? checksum : null;
  }
  return null;
}

function proofLocation(ref: StudioFileReference): string | null {
  if (ref.storageRef.provider !== "google_shared_drive") return null;
  const reference = ref.storageRef.reference.trim();
  return reference || null;
}

/**
 * Bind the approved Creative QA proof into Final Delivery.
 * Only a proof whose checksum is on the customer approval pin is copied.
 */
export function assembleApprovedCreativeQaClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  if (input.job.skuId !== CREATIVE_QA_FINISH_SKU) {
    return { job: input.job, events: [...input.events], assembled: false };
  }
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }
  const pin = new Set(approval.contentSha256s.map((value) => value.trim().toLowerCase()));
  const proofs = (input.job.fileRegistry ?? []).filter((ref) => {
    if (!isApprovedReviewProofReference(ref)) return false;
    const checksum = creativeQaProofSha256(ref.storageRef);
    return Boolean(checksum && pin.has(checksum) && proofLocation(ref));
  });
  if (proofs.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const label = input.requiredDeliverables?.[0] ?? input.requiredDeliverableLabel ?? CREATIVE_QA_DELIVERABLE_LABEL;
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  let job = input.job;
  let events = [...input.events];
  proofs.forEach((proof, index) => {
    const checksum = creativeQaProofSha256(proof.storageRef);
    const url = proofLocation(proof);
    if (!checksum || !url) return;
    const added = addClientDeliveryFile(job, events, {
      clientId: proof.clientId,
      deliverableKey: `deliverable-${index}`,
      deliverableLabel: index === 0 ? label : proof.deliverableLabel ?? proof.filename,
      fileName: proof.filename,
      fileType: proof.fileType,
      url,
      contentSha256: checksum,
      artifactId: proof.id,
      approvedWorkVersionId: approval.workVersionId ?? undefined,
      approvedAuthorizationDecisionId: approval.decisionId,
      actor: input.actor,
      occurredAt,
    });
    job = added.job;
    events = added.events;
  });

  const assembled = (job.clientDeliveryFiles ?? []).length > (input.job.clientDeliveryFiles ?? []).length;
  return { job, events, assembled };
}
