/**
 * Customer current-status overlay for Board / Project Record.
 * Reads purchased-service spine when present. Does not mutate Machine state.
 */

import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";
import { studioCustomerCurrentStatusV1 as copy } from "@/config/studio-customer-current-status-v1";
import { productionTeamCustomerCopy } from "@/config/studio-production-team-launch-readiness-v1";
import {
  PROJECT_INTAKE_RECEIVED_STATUS,
  isPaidIncompleteIntake,
  resolvePostSubmitCustomerMode,
  type PostSubmitSignalFacts,
} from "@/lib/post-submit-customer-signals";
import type { CustomerJobStatusSummary } from "@/lib/project-record-status";
import {
  CLIP_RECORDING_NEXT,
  clipRepurposingRecordingIsNext,
} from "@/lib/studio-dispatch/clip-door-facts";
import {
  SOCIAL_FILES_NEXT,
  socialGraphicsFilesAreNext,
} from "@/lib/project-intake-plan";
import { isCustomerIdentityBlocked } from "@/lib/studio-customer-identity-safety-gate/evaluate";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";

export type CustomerCurrentStatusKind =
  | "intake_needed"
  | "intake_received"
  | "producing"
  | "waiting_for_production_slot"
  | "waiting_on_you"
  | "review_ready"
  | "partial_review_ready"
  | "revision_underway"
  | "approved_preparing"
  | "delivery_ready"
  | "cancelled"
  | "identity_verifying";

export type CustomerCurrentStatusOverlay = {
  kind: CustomerCurrentStatusKind;
  statusLabel: string;
  progressLabel: string;
  lead: string;
  hint: string | null;
  suppressReviewCta: boolean;
  preferDeliveryCta: boolean;
  journeyStatus: CampaignStatus;
  currentStepDetail: string | null;
  activityCurrentMessage: string | null;
};

const SPINE_PRIORITY: Record<string, number> = {
  waiting_on_client: 100,
  ready_for_review: 90,
  revision_requested: 80,
  approved: 70,
  ready_for_delivery: 60,
  building_concepts: 50,
  ready_for_queue: 40,
  delivered: 30,
  refunded_cancelled: 10,
};

function spineKindFromLabel(statusLabel: string): string | null {
  const normalized = statusLabel.trim().toLowerCase();
  if (normalized === copy.labels.waitingOnYou.toLowerCase()) return "waiting_on_client";
  if (normalized === copy.labels.reviewReady.toLowerCase()) return "ready_for_review";
  if (normalized === copy.labels.revisionUnderway.toLowerCase()) return "revision_requested";
  if (normalized === copy.labels.approvedPreparing.toLowerCase()) return "approved";
  if (normalized === copy.labels.deliveryReady.toLowerCase()) return "ready_for_delivery";
  if (normalized === copy.labels.delivered.toLowerCase()) return "delivered";
  if (normalized === copy.labels.producing.toLowerCase()) return "building_concepts";
  if (normalized === copy.labels.preparingToStart.toLowerCase()) return "ready_for_queue";
  if (normalized === copy.labels.cancelled.toLowerCase()) return "refunded_cancelled";
  return null;
}

export function pickPrimaryCustomerJob(
  jobs: readonly CustomerJobStatusSummary[] | undefined,
): CustomerJobStatusSummary | null {
  if (!jobs?.length) return null;
  return [...jobs].sort((a, b) => {
    const aKind = spineKindFromLabel(a.statusLabel) ?? "";
    const bKind = spineKindFromLabel(b.statusLabel) ?? "";
    return (SPINE_PRIORITY[bKind] ?? 0) - (SPINE_PRIORITY[aKind] ?? 0);
  })[0] ?? null;
}

function overlayFromSpineLabel(
  statusLabel: string,
  campaign: CampaignRecord,
  facts: PostSubmitSignalFacts,
): CustomerCurrentStatusOverlay | null {
  const kind = spineKindFromLabel(statusLabel);
  if (!kind) return null;

  if (kind === "waiting_on_client") {
    return {
      kind: "waiting_on_you",
      statusLabel: copy.labels.waitingOnYou,
      progressLabel: copy.labels.waitingOnYou,
      lead: copy.leads.waitingOnYou,
      hint: copy.hints.waitingOnYou,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: campaign.campaignStatus,
      currentStepDetail: copy.labels.waitingOnYou,
      activityCurrentMessage: copy.labels.waitingOnYou,
    };
  }

  if (kind === "revision_requested") {
    return {
      kind: "revision_underway",
      statusLabel: copy.labels.revisionUnderway,
      progressLabel: copy.labels.revisionUnderway,
      lead: copy.leads.revisionUnderway,
      hint: copy.hints.revisionUnderway,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: "READY_FOR_REVIEW",
      currentStepDetail: copy.progressDetails.revisionUnderway,
      activityCurrentMessage: copy.activity.revisionUnderway,
    };
  }

  if (kind === "ready_for_review") {
    return {
      kind: "review_ready",
      statusLabel: copy.labels.reviewReady,
      progressLabel: copy.labels.reviewReady,
      lead: copy.leads.reviewReady,
      hint: null,
      suppressReviewCta: false,
      preferDeliveryCta: false,
      journeyStatus: "READY_FOR_REVIEW",
      currentStepDetail: copy.labels.reviewReady,
      activityCurrentMessage: copy.activity.reviewReady,
    };
  }

  if (kind === "approved") {
    return {
      kind: "approved_preparing",
      statusLabel: copy.labels.approvedPreparing,
      progressLabel: copy.labels.approvedPreparing,
      lead: copy.leads.approvedPreparing,
      hint: copy.hints.approvedPreparing,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: "DELIVERED",
      currentStepDetail: copy.progressDetails.approvedPreparing,
      activityCurrentMessage: copy.activity.approvedPreparing,
    };
  }

  if (kind === "ready_for_delivery" || kind === "delivered") {
    return {
      kind: "delivery_ready",
      statusLabel: copy.labels.deliveryReady,
      progressLabel: copy.labels.delivered,
      lead: copy.leads.deliveryReady,
      hint: null,
      suppressReviewCta: true,
      preferDeliveryCta: true,
      journeyStatus: "DELIVERED",
      currentStepDetail: copy.progressDetails.deliveryReady,
      activityCurrentMessage: copy.activity.deliveryReady,
    };
  }

  if (kind === "refunded_cancelled") {
    return {
      kind: "cancelled",
      statusLabel: copy.labels.cancelled,
      progressLabel: copy.labels.cancelled,
      lead: copy.leads.cancelled,
      hint: copy.hints.cancelled,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: campaign.campaignStatus,
      currentStepDetail: copy.labels.cancelled,
      activityCurrentMessage: copy.activity.cancelled,
    };
  }

  if (kind === "ready_for_queue") {
    const mode = resolvePostSubmitCustomerMode(campaign, facts);
    if (mode === "intake_received" || mode === "materials_blocking") {
      return {
        kind: "intake_received",
        statusLabel: PROJECT_INTAKE_RECEIVED_STATUS,
        progressLabel: PROJECT_INTAKE_RECEIVED_STATUS,
        lead: PROJECT_INTAKE_RECEIVED_STATUS,
        hint: null,
        suppressReviewCta: true,
        preferDeliveryCta: false,
        journeyStatus: campaign.campaignStatus,
        currentStepDetail: PROJECT_INTAKE_RECEIVED_STATUS,
        activityCurrentMessage: null,
      };
    }
    return {
      kind: "waiting_for_production_slot",
      statusLabel: copy.labels.preparingToStart,
      progressLabel: copy.labels.preparingToStart,
      lead: copy.leads.waitingForProductionSlot,
      hint: copy.hints.waitingForProductionSlot,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: "BUILDING_CONCEPTS",
      currentStepDetail: copy.labels.preparingToStart,
      activityCurrentMessage: copy.leads.waitingForProductionSlot,
    };
  }

  if (kind === "building_concepts") {
    const mode = resolvePostSubmitCustomerMode(campaign, facts);
    if (mode === "intake_received" || mode === "materials_blocking") {
      return {
        kind: "intake_received",
        statusLabel: PROJECT_INTAKE_RECEIVED_STATUS,
        progressLabel: PROJECT_INTAKE_RECEIVED_STATUS,
        lead: PROJECT_INTAKE_RECEIVED_STATUS,
        hint: null,
        suppressReviewCta: true,
        preferDeliveryCta: false,
        journeyStatus: campaign.campaignStatus,
        currentStepDetail: PROJECT_INTAKE_RECEIVED_STATUS,
        activityCurrentMessage: null,
      };
    }
    return {
      kind: "producing",
      statusLabel: copy.labels.producing,
      progressLabel: copy.labels.producing,
      lead: "The Studio is building your concepts. Check back here for your review invitation.",
      hint: null,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: "BUILDING_CONCEPTS",
      currentStepDetail: "In Progress",
      activityCurrentMessage: null,
    };
  }

  return null;
}

function overlayForMixedPurchasedServices(
  _campaign: CampaignRecord,
  liveJobs: readonly CustomerJobStatusSummary[],
): CustomerCurrentStatusOverlay | null {
  if (liveJobs.length < 2) return null;
  const kinds = liveJobs.map((job) => spineKindFromLabel(job.statusLabel));
  const readyCount = kinds.filter((kind) => kind === "ready_for_review").length;
  if (readyCount === 0 || readyCount === liveJobs.length) return null;
  const waiting = kinds.some((kind) => kind === "waiting_on_client");
  const teamCopy = productionTeamCustomerCopy;
  return {
    kind: "partial_review_ready",
    statusLabel: waiting ? teamCopy.blockedOnServiceLabel : teamCopy.partialReviewReadyLabel,
    progressLabel: waiting ? teamCopy.blockedOnServiceLabel : teamCopy.partialReviewReadyLabel,
    lead: waiting ? teamCopy.blockedOnServiceLead : teamCopy.partialReviewReadyLead,
    hint: null,
    suppressReviewCta: false,
    preferDeliveryCta: false,
    journeyStatus: "READY_FOR_REVIEW",
    currentStepDetail: waiting ? teamCopy.blockedOnServiceLabel : teamCopy.partialReviewReadyLabel,
    activityCurrentMessage: waiting
      ? teamCopy.blockedOnServiceLead
      : teamCopy.partialReviewReadyLead,
  };
}

export function resolveCustomerCurrentStatusOverlay(
  campaign: CampaignRecord | null,
  facts: PostSubmitSignalFacts,
  jobs?: readonly CustomerJobStatusSummary[],
): CustomerCurrentStatusOverlay | null {
  if (!campaign) return null;

  if (isCustomerIdentityBlocked(campaign)) {
    const copyGate = studioCustomerIdentitySafetyGateV1.customerCopy;
    return {
      kind: "identity_verifying",
      statusLabel: copyGate.statusLabel,
      progressLabel: copyGate.statusLabel,
      lead: copyGate.lead,
      hint: copyGate.hint,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: campaign.campaignStatus,
      currentStepDetail: copyGate.statusLabel,
      activityCurrentMessage: copyGate.lead,
    };
  }

  const cancelledJobs =
    jobs?.filter((job) => spineKindFromLabel(job.statusLabel) === "refunded_cancelled") ?? [];
  const liveJobs =
    jobs?.filter((job) => spineKindFromLabel(job.statusLabel) !== "refunded_cancelled") ?? [];
  if (jobs && jobs.length > 0 && liveJobs.length === 0 && cancelledJobs.length > 0) {
    return overlayFromSpineLabel(copy.labels.cancelled, campaign, facts);
  }

  if (isPaidIncompleteIntake(campaign)) {
    if (clipRepurposingRecordingIsNext(campaign)) {
      return {
        kind: "intake_needed",
        statusLabel: CLIP_RECORDING_NEXT.statusLabel,
        progressLabel: CLIP_RECORDING_NEXT.actionLabel,
        lead: CLIP_RECORDING_NEXT.lead,
        hint: null,
        suppressReviewCta: true,
        preferDeliveryCta: false,
        journeyStatus: "PAYMENT_RECEIVED",
        currentStepDetail: CLIP_RECORDING_NEXT.actionLabel,
        activityCurrentMessage: null,
      };
    }
    if (socialGraphicsFilesAreNext(campaign)) {
      return {
        kind: "intake_needed",
        statusLabel: SOCIAL_FILES_NEXT.statusLabel,
        progressLabel: SOCIAL_FILES_NEXT.actionLabel,
        lead: SOCIAL_FILES_NEXT.lead,
        hint: null,
        suppressReviewCta: true,
        preferDeliveryCta: false,
        journeyStatus: "PAYMENT_RECEIVED",
        currentStepDetail: SOCIAL_FILES_NEXT.actionLabel,
        activityCurrentMessage: null,
      };
    }
    return {
      kind: "intake_needed",
      statusLabel: copy.labels.intakeNeeded,
      progressLabel: copy.labels.intakeNeeded,
      lead: "Tell us what we need for the services in your approved Studio Plan.",
      hint: null,
      suppressReviewCta: true,
      preferDeliveryCta: false,
      journeyStatus: "PAYMENT_RECEIVED",
      currentStepDetail: copy.labels.intakeNeeded,
      activityCurrentMessage: null,
    };
  }

  const mixed = overlayForMixedPurchasedServices(campaign, liveJobs);
  if (mixed) return mixed;

  const primary = pickPrimaryCustomerJob(jobs);
  if (!primary) return null;
  return overlayFromSpineLabel(primary.statusLabel, campaign, facts);
}

const SERVICE_STATUS_SEPARATOR = " — ";

/** Board / Record / Ask share this: intake is current, not Building Concepts. */
export function isIntakeCurrentCustomerStatus(statusLabel: string): boolean {
  return (
    statusLabel === PROJECT_INTAKE_RECEIVED_STATUS ||
    statusLabel === copy.labels.intakeNeeded
  );
}

/** Remap a producing-spine job label to the shared current customer status. */
export function alignCustomerFacingJobStatusLabel(
  jobStatusLabel: string,
  currentStatusLabel: string,
): string {
  if (!isIntakeCurrentCustomerStatus(currentStatusLabel)) {
    return jobStatusLabel;
  }
  if (
    jobStatusLabel === copy.labels.producing ||
    jobStatusLabel === copy.labels.preparingToStart
  ) {
    return currentStatusLabel;
  }
  return jobStatusLabel;
}

/** Ask service lines must use the same current status as Board / Record. */
export function alignCustomerFacingServiceStatusLines(
  jobStatusLabels: readonly string[],
  currentStatusLabel: string,
): string[] {
  return jobStatusLabels.map((line) => {
    const idx = line.lastIndexOf(SERVICE_STATUS_SEPARATOR);
    if (idx < 0) {
      return alignCustomerFacingJobStatusLabel(line, currentStatusLabel);
    }
    const serviceName = line.slice(0, idx);
    const status = line.slice(idx + SERVICE_STATUS_SEPARATOR.length);
    return `${serviceName}${SERVICE_STATUS_SEPARATOR}${alignCustomerFacingJobStatusLabel(
      status,
      currentStatusLabel,
    )}`;
  });
}
