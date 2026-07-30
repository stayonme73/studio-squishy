/**
 * C8d — resolve customer-facing Final substance from existing authorities only.
 *
 * 7A stages → status, work reference, customer action
 * Honest Final Files delivery view → release / Delivery availability
 * Never invents files, dates, completion %, or version numbers.
 *
 * Delivery-availability language is scoped to the focused job when one exists.
 * A stale requested jobId does not silently rename another job as the requested work.
 */

import { c8dFinalSubstanceV1 } from "@/config/c8d-final-substance-v1";
import type { FinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import type {
  ClientStagesJobItem,
  ClientStagesSummary,
} from "@/lib/review-delivery-stage/build-client-stages";

export type FinalSubstanceStagesInput =
  | { status: "loading" }
  | { status: "error" }
  | { status: "unavailable" }
  | {
      status: "ready";
      summary: ClientStagesSummary;
      jobs: readonly ClientStagesJobItem[];
    };

export type FinalSubstanceDeliveryInput =
  | { status: "loading" | "idle" }
  | { status: "error" }
  | { status: "ready"; delivery: FinalDeliveryView };

export type FinalCustomerActionKind = "none_required" | "action_required" | "neutral";

export type FinalDeliveryAvailabilityKind =
  | "loading"
  | "preparing"
  | "available"
  | "available_other"
  | "unavailable"
  | "error";

export type FinalRoomSubstance = {
  heading: string;
  statusExplanation: string;
  workReference: {
    serviceName: string | null;
    stageLabel: string | null;
    /** Only when an authoritative released-file version label exists for the focused job. */
    versionLabel: string | null;
    detail: string;
  };
  customerAction: {
    kind: FinalCustomerActionKind;
    message: string;
  };
  whatHappensNext: {
    label: string;
    body: string;
  };
  deliveryAvailability: {
    kind: FinalDeliveryAvailabilityKind;
    message: string;
  };
  openDelivery: {
    label: string;
    enabled: boolean;
    emphasize: boolean;
  };
  /** Focused job used for substance, when known and authorized in stages. */
  focusedJobId: string | null;
  /**
   * True when a requested jobId was provided but is not in the authorized stages list.
   * Campaign-level Final is shown; another job is not silently renamed as the request.
   */
  requestedJobUnavailable: boolean;
};

function pickDefaultFocusedJob(
  jobs: readonly ClientStagesJobItem[],
): ClientStagesJobItem | null {
  if (jobs.length === 0) return null;
  const finalPrep = jobs.find((job) => job.stageId === "approved-for-final-delivery");
  if (finalPrep) return finalPrep;
  const delivered = jobs.find((job) => job.stageId === "final-delivery");
  if (delivered) return delivered;
  const active = jobs.find((job) => job.stageId !== "cancelled");
  return active ?? jobs[0] ?? null;
}

/**
 * Resolve focus without silently substituting a different named job for a stale request.
 */
export function resolveFinalJobFocus(
  jobs: readonly ClientStagesJobItem[],
  requestedJobId: string | null,
): { focused: ClientStagesJobItem | null; requestedJobUnavailable: boolean } {
  if (requestedJobId) {
    const match = jobs.find((job) => job.jobId === requestedJobId);
    if (match) {
      return { focused: match, requestedJobUnavailable: false };
    }
    return { focused: null, requestedJobUnavailable: true };
  }
  return { focused: pickDefaultFocusedJob(jobs), requestedJobUnavailable: false };
}

function resolveCustomerAction(job: ClientStagesJobItem | null): FinalRoomSubstance["customerAction"] {
  if (!job) {
    return {
      kind: "neutral",
      message: c8dFinalSubstanceV1.customerAction.neutral,
    };
  }
  if (job.actionOwner === "customer" || job.blocksCampaignCustomerAction) {
    return {
      kind: "action_required",
      message: c8dFinalSubstanceV1.customerAction.actionRequired,
    };
  }
  if (job.actionOwner === "studio" || job.actionOwner === "complete" || job.actionOwner === "none") {
    return {
      kind: "none_required",
      message: c8dFinalSubstanceV1.customerAction.noneRequired,
    };
  }
  return {
    kind: "neutral",
    message: c8dFinalSubstanceV1.customerAction.neutral,
  };
}

function countReleasedFilesForJob(delivery: FinalDeliveryView, jobId: string): number {
  const job = delivery.jobs.find((entry) => entry.jobId === jobId);
  return job?.files.length ?? 0;
}

function countReleasedFilesCampaign(delivery: FinalDeliveryView): number {
  return delivery.jobs.reduce((sum, job) => sum + job.files.length, 0);
}

function countReleasedFilesOtherJobs(delivery: FinalDeliveryView, focusedJobId: string): number {
  return delivery.jobs.reduce((sum, job) => {
    if (job.jobId === focusedJobId) return sum;
    return sum + job.files.length;
  }, 0);
}

function versionLabelFromDelivery(
  delivery: FinalDeliveryView | null,
  jobId: string | null,
): string | null {
  if (!delivery || !jobId) return null;
  const job = delivery.jobs.find((entry) => entry.jobId === jobId);
  if (!job) return null;
  for (const file of job.files) {
    const label = file.versionLabel?.trim();
    if (label) return label;
  }
  return null;
}

function resolveDeliveryAvailability(options: {
  deliveryInput: FinalSubstanceDeliveryInput;
  focusedJobId: string | null;
}): Pick<FinalRoomSubstance, "deliveryAvailability" | "openDelivery"> {
  const copy = c8dFinalSubstanceV1;
  const { deliveryInput, focusedJobId } = options;

  if (deliveryInput.status === "loading" || deliveryInput.status === "idle") {
    return {
      deliveryAvailability: {
        kind: "loading",
        message: copy.deliveryAvailability.loading,
      },
      openDelivery: {
        label: copy.openDelivery.loading,
        enabled: false,
        emphasize: false,
      },
    };
  }
  if (deliveryInput.status === "error") {
    return {
      deliveryAvailability: {
        kind: "error",
        message: copy.deliveryAvailability.error,
      },
      openDelivery: {
        label: copy.openDelivery.error,
        enabled: true,
        emphasize: false,
      },
    };
  }

  const { delivery } = deliveryInput;

  if (focusedJobId) {
    const focusedReleased = countReleasedFilesForJob(delivery, focusedJobId);
    const otherReleased = countReleasedFilesOtherJobs(delivery, focusedJobId);

    if (focusedReleased > 0) {
      return {
        deliveryAvailability: {
          kind: "available",
          message: copy.deliveryAvailability.focusedAvailable,
        },
        openDelivery: {
          label: copy.openDelivery.available,
          enabled: true,
          emphasize: true,
        },
      };
    }

    if (otherReleased > 0) {
      return {
        deliveryAvailability: {
          kind: "available_other",
          message: copy.deliveryAvailability.focusedOtherAvailable,
        },
        openDelivery: {
          label: copy.openDelivery.preparing,
          enabled: true,
          emphasize: false,
        },
      };
    }

    if (delivery.state === "preparing" || delivery.state === "ready" || delivery.state === "no_access") {
      return {
        deliveryAvailability: {
          kind: "preparing",
          message: copy.deliveryAvailability.focusedPreparing,
        },
        openDelivery: {
          label: copy.openDelivery.preparing,
          enabled: true,
          emphasize: false,
        },
      };
    }

    return {
      deliveryAvailability: {
        kind: "unavailable",
        message: copy.deliveryAvailability.focusedPreparing,
      },
      openDelivery: {
        label: copy.openDelivery.unavailable,
        enabled: true,
        emphasize: false,
      },
    };
  }

  // Campaign-level (no focused job — including stale request that was ignored).
  const campaignReleased = countReleasedFilesCampaign(delivery);

  if (campaignReleased > 0) {
    return {
      deliveryAvailability: {
        kind: "available",
        message: copy.deliveryAvailability.campaignAvailable,
      },
      openDelivery: {
        label: copy.openDelivery.available,
        enabled: true,
        emphasize: true,
      },
    };
  }

  if (delivery.state === "preparing" || delivery.state === "ready") {
    return {
      deliveryAvailability: {
        kind: "preparing",
        message: copy.deliveryAvailability.campaignPreparing,
      },
      openDelivery: {
        label: copy.openDelivery.preparing,
        enabled: true,
        emphasize: false,
      },
    };
  }

  return {
    deliveryAvailability: {
      kind: "unavailable",
      message: copy.deliveryAvailability.campaignUnavailable,
    },
    openDelivery: {
      label: copy.openDelivery.unavailable,
      enabled: true,
      emphasize: false,
    },
  };
}

export function resolveFinalRoomSubstance(input: {
  requestedJobId?: string | null;
  stages: FinalSubstanceStagesInput;
  delivery: FinalSubstanceDeliveryInput;
}): FinalRoomSubstance {
  const copy = c8dFinalSubstanceV1;

  if (input.stages.status === "loading") {
    const deliveryResolved = resolveDeliveryAvailability({
      deliveryInput: input.delivery,
      focusedJobId: null,
    });
    return {
      heading: copy.headings.loading,
      statusExplanation: copy.status.loading,
      workReference: {
        serviceName: null,
        stageLabel: null,
        versionLabel: null,
        detail: copy.workReference.none,
      },
      customerAction: {
        kind: "neutral",
        message: copy.customerAction.neutral,
      },
      whatHappensNext: {
        label: copy.whatHappensNext.label,
        body: copy.whatHappensNext.body,
      },
      ...deliveryResolved,
      focusedJobId: null,
      requestedJobUnavailable: false,
    };
  }

  if (input.stages.status === "error" || input.stages.status === "unavailable") {
    const deliveryResolved = resolveDeliveryAvailability({
      deliveryInput: input.delivery,
      focusedJobId: null,
    });
    return {
      heading: copy.headings.fallback,
      statusExplanation: copy.status.unavailable,
      workReference: {
        serviceName: null,
        stageLabel: null,
        versionLabel: null,
        detail: copy.workReference.none,
      },
      customerAction: {
        kind: "neutral",
        message: copy.customerAction.neutral,
      },
      whatHappensNext: {
        label: copy.whatHappensNext.label,
        body: copy.whatHappensNext.body,
      },
      ...deliveryResolved,
      focusedJobId: null,
      requestedJobUnavailable: Boolean(input.requestedJobId),
    };
  }

  const { focused, requestedJobUnavailable } = resolveFinalJobFocus(
    input.stages.jobs,
    input.requestedJobId ?? null,
  );
  const focusedJobId = focused?.jobId ?? null;
  const deliveryResolved = resolveDeliveryAvailability({
    deliveryInput: input.delivery,
    focusedJobId,
  });

  const deliveryView =
    input.delivery.status === "ready" ? input.delivery.delivery : null;
  const versionLabel = versionLabelFromDelivery(deliveryView, focusedJobId);

  // Stale request: campaign-level heading/explanation — do not name a substitute job.
  if (requestedJobUnavailable) {
    return {
      heading: input.stages.summary.label || copy.headings.fallback,
      statusExplanation:
        input.stages.summary.explanation || copy.status.preparingGeneric,
      workReference: {
        serviceName: null,
        stageLabel: null,
        versionLabel: null,
        detail: copy.workReference.requestedUnavailable,
      },
      customerAction: {
        kind: "neutral",
        message: copy.customerAction.neutral,
      },
      whatHappensNext: {
        label: copy.whatHappensNext.label,
        body: copy.whatHappensNext.body,
      },
      ...deliveryResolved,
      focusedJobId: null,
      requestedJobUnavailable: true,
    };
  }

  const heading = focused?.label ?? input.stages.summary.label ?? copy.headings.fallback;
  const statusExplanation =
    focused?.explanation ??
    input.stages.summary.explanation ??
    copy.status.preparingGeneric;

  let workDetail = copy.workReference.none;
  if (focused) {
    workDetail = versionLabel
      ? `${focused.serviceName} · ${focused.label} · ${versionLabel}`
      : `${focused.serviceName} · ${focused.label}`;
  }

  return {
    heading,
    statusExplanation,
    workReference: {
      serviceName: focused?.serviceName ?? null,
      stageLabel: focused?.label ?? null,
      versionLabel,
      detail: workDetail,
    },
    customerAction: resolveCustomerAction(focused),
    whatHappensNext: {
      label: copy.whatHappensNext.label,
      body: copy.whatHappensNext.body,
    },
    ...deliveryResolved,
    focusedJobId,
    requestedJobUnavailable: false,
  };
}
