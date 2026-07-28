import { studioBoard, type CampaignRecord } from "@/config/studio-board";
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
 * Social Posts total is allowed only after the campaign proves that service
 * (`isSocialPostsCampaign`). The RTU product total is then evidence-bound to
 * that proven campaign — never used as a default for unknown campaigns.
 */
function resolveSocialPostsSnapshotTotal(campaign: CampaignRecord): number | null {
  if (!isSocialPostsCampaign(campaign)) return null;
  return SOCIAL_POSTS_TOTAL;
}
