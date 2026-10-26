import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { studioCustomerCurrentStatusV1 as currentStatus } from "@/config/studio-customer-current-status-v1";
import type { DeliverableRemainingItem } from "@/lib/campaign-record";
import {
  SOCIAL_POSTS_LABEL,
  SOCIAL_POSTS_TOTAL,
  isSocialPostsCampaign,
  resolveSocialPostsDeliveredCount,
} from "@/lib/route-map-social-posts";

/** Empty / unavailable snapshot copy — reuse Board empty state language. */
export const PROJECT_SNAPSHOT_DELIVERABLES_UNAVAILABLE =
  studioBoard.empty.board.snapshot.deliverables;

export type ProjectSnapshotDeliverablesView =
  | {
      kind: "unavailable";
      message: string;
    }
  | {
      kind: "progress";
      label: string;
      delivered: number;
      total: number;
      /** True only when released/complete counts prove files or completion exist. */
      showViewDeliverables: boolean;
    };

/**
 * Project Snapshot deliverables truth.
 * Never invent Social Posts (or any service) when the campaign does not prove it.
 * Never treat missing / empty plan data as completion.
 */
export function resolveProjectSnapshotDeliverables(
  campaign: CampaignRecord,
  deliverablesProgress: readonly DeliverableRemainingItem[],
): ProjectSnapshotDeliverablesView {
  if (isSocialPostsCampaign(campaign)) {
    const delivered = resolveSocialPostsDeliveredCount(campaign);
    const total = resolveSocialPostsSnapshotTotal(campaign);
    if (total == null || total <= 0) {
      return {
        kind: "unavailable",
        message: PROJECT_SNAPSHOT_DELIVERABLES_UNAVAILABLE,
      };
    }
    return {
      kind: "progress",
      label: SOCIAL_POSTS_LABEL,
      delivered,
      total,
      showViewDeliverables: delivered > 0 || delivered >= total,
    };
  }

  // Approved-plan rows only — package-quota assumptions are not snapshot evidence.
  const approvedLines = campaign.approvedStudioPlan?.lineItems;
  if (approvedLines && approvedLines.length > 0) {
    const first = deliverablesProgress[0];
    if (first && first.total > 0) {
      return {
        kind: "progress",
        label: first.label,
        delivered: first.delivered,
        total: first.total,
        showViewDeliverables: first.delivered > 0 || first.remaining === 0,
      };
    }
  }

  // Any proven release count without inventing a service label from package defaults.
  const released = deliverablesProgress.find((item) => item.delivered > 0 && item.total > 0);
  if (released) {
    return {
      kind: "progress",
      label: released.label,
      delivered: released.delivered,
      total: released.total,
      showViewDeliverables: true,
    };
  }

  return {
    kind: "unavailable",
    message: PROJECT_SNAPSHOT_DELIVERABLES_UNAVAILABLE,
  };
}

/**
 * Snapshot progress copy. "Complete" is delivery, not review-ready.
 * Ready for Review plus "0 of 1 complete" is a customer contradiction.
 */
export function resolveProjectSnapshotProgressCopy(
  view: { delivered: number; total: number },
  statusLabel: string | null | undefined,
): string {
  if (view.total <= 0) return "";
  if (view.delivered >= view.total) {
    return `${view.delivered} of ${view.total} complete`;
  }
  const label = statusLabel ?? "";
  if (/ready for review/i.test(label)) {
    return "Ready for review — not yet released";
  }
  if (
    label === currentStatus.labels.deliveryReady ||
    /final delivery ready|ready to download/i.test(label)
  ) {
    return currentStatus.progressDetails.deliveryReady;
  }
  if (
    label === currentStatus.labels.approvedPreparing ||
    /approved — preparing/i.test(label)
  ) {
    return currentStatus.progressDetails.approvedPreparing;
  }
  return `${view.delivered} of ${view.total} delivered`;
}

/** Final Delivery ready is a live download door. Do not invent a completed count. */
export function projectSnapshotShowsDeliverablesLink(
  view: { showViewDeliverables: boolean },
  statusLabel: string | null | undefined,
): boolean {
  if (view.showViewDeliverables) return true;
  const label = statusLabel ?? "";
  return (
    label === currentStatus.labels.deliveryReady ||
    label === currentStatus.labels.delivered ||
    /final delivery ready|ready to download|^delivered$/i.test(label)
  );
}

/**
 * Social Posts total is allowed only after the campaign proves that service
 * (`isSocialPostsCampaign`). The RTU product total is then evidence-bound to
 * that proven campaign — never used as a default for unknown campaigns.
 */
function resolveSocialPostsSnapshotTotal(campaign: CampaignRecord): number | null {
  if (!isSocialPostsCampaign(campaign)) return null;
  return SOCIAL_POSTS_TOTAL;
}
