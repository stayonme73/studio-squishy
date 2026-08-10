import type { StudioUser } from "@/lib/campaign-store/types";
import {
  clientDeliveryFileIsReleased,
  isApprovedReviewProofReference,
  isReleasedFinalDeliveryReference,
} from "@/lib/file-registry/job-files";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import type { StudioFileReference } from "@/lib/file-registry/types";
import { canClientAccessJobDelivery } from "@/lib/job-control/final-delivery-access";
import type { JobClientDeliveryFile, PurchasedJobRecord } from "@/lib/job-control/types";
import { evaluateDeliveryEligibility, isEligibleForDelivery } from "@/lib/studio-approved-delivery";

export type FileRoomAccessDecision = {
  allowed: boolean;
  reason: string;
};

function deny(reason: string): FileRoomAccessDecision {
  return { allowed: false, reason };
}

function allow(reason: string): FileRoomAccessDecision {
  return { allowed: true, reason };
}

function userOwnsCampaign(user: StudioUser, campaignId: string): boolean {
  return user.currentCampaignId === campaignId || (user.clientCampaignIds ?? []).includes(campaignId);
}

function fileMatchesPurchasedJob(file: StudioFileReference, job: PurchasedJobRecord): boolean {
  return file.campaignId === job.campaignId && file.jobId === job.jobId;
}

export function canClientAccessFinalDeliveryFile(input: {
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
  clientDeliveryFile?: JobClientDeliveryFile;
}): FileRoomAccessDecision {
  const { user, job, file, clientDeliveryFile } = input;
  if (!user || !user.roles.includes("client")) return deny("Client role required.");
  if (!userOwnsCampaign(user, file.campaignId) && user.id !== file.clientId) {
    return deny("Client does not own this campaign file.");
  }
  if (!fileMatchesPurchasedJob(file, job)) return deny("File is not scoped to this purchased job.");
  if (!canClientAccessJobDelivery(job)) return deny("Final Delivery is not open for this job.");
  if (!isReleasedFinalDeliveryReference(file)) {
    return deny("Clients may only retrieve released client-final files.");
  }
  if (isApprovedReviewProofReference(file)) return deny("Review proofs are not Final Delivery files.");
  if (clientDeliveryFile && !clientDeliveryFileIsReleased(job, clientDeliveryFile)) {
    return deny("Client delivery file has not been released.");
  }

  const eligibility = evaluateDeliveryEligibility({ job });
  if (!isEligibleForDelivery(eligibility)) {
    return deny("Final delivery candidate does not match the customer-approved identity.");
  }

  if (clientDeliveryFile) {
    const approval = job.customerApprovedArtifactAuthorization;
    if (
      approval &&
      clientDeliveryFile.approvedAuthorizationDecisionId &&
      clientDeliveryFile.approvedAuthorizationDecisionId !== approval.decisionId
    ) {
      return deny("Final delivery file is not bound to the customer-approved identity.");
    }
    if (
      approval &&
      approval.contentSha256s.length > 0 &&
      (!clientDeliveryFile.contentSha256 ||
        !approval.contentSha256s.includes(clientDeliveryFile.contentSha256))
    ) {
      return deny("Final delivery file hash does not match the customer-approved identity.");
    }
  }

  return allow("Released client-final file.");
}

export function canClientAccessReviewProofFile(input: {
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
}): FileRoomAccessDecision {
  const { user, job, file } = input;
  if (!user || !user.roles.includes("client")) return deny("Client role required.");
  if (!userOwnsCampaign(user, file.campaignId) && user.id !== file.clientId) {
    return deny("Client does not own this campaign file.");
  }
  if (!fileMatchesPurchasedJob(file, job)) return deny("File is not scoped to this purchased job.");
  if (!canClientAccessJobReview(job)) return deny("Review Room is not open for this job.");
  if (!isApprovedReviewProofReference(file)) {
    return deny("Review Room may only retrieve released review proofs.");
  }

  return allow("Released review proof file.");
}

export function canInternalAccessFileRoomFile(input: {
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
  campaignAccessAllowed?: boolean;
}): FileRoomAccessDecision {
  const { user, job, file, campaignAccessAllowed = false } = input;
  if (!user) return deny("Staff or owner role required.");
  if (!fileMatchesPurchasedJob(file, job)) return deny("File is not scoped to this purchased job.");
  if (user.roles.includes("owner")) return allow("Owner may access File Room files.");
  if (!user.roles.includes("staff")) return deny("Staff or owner role required.");
  if (!campaignAccessAllowed) return deny("Staff user is not authorized for this campaign.");

  return allow("Assigned staff may access File Room files.");
}

export function canStaffAccessInternalFile(input: {
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
  campaignAccessAllowed?: boolean;
}): FileRoomAccessDecision {
  const { user, job, file, campaignAccessAllowed = false } = input;
  if (!user) return deny("Staff or owner role required.");
  if (!fileMatchesPurchasedJob(file, job)) return deny("File is not scoped to this purchased job.");
  if (file.visibility !== "internal_only") return deny("Use client-facing delivery/review access for visible files.");

  if (user.roles.includes("owner")) return allow("Owner may access internal File Room files.");
  if (!user.roles.includes("staff")) return deny("Staff or owner role required.");
  if (!campaignAccessAllowed) return deny("Staff user is not authorized for this campaign.");

  return allow("Assigned staff may access internal File Room files.");
}
