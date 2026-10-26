/**
 * Campaign-level Production Team readiness.
 * Job spines stay independent. This only aggregates them into a truthful
 * campaign statement so one ready sibling cannot bless a failed lane.
 */

import {
  productionTeamCustomerCopy,
  studioProductionTeamLaunchReadinessV1,
} from "@/config/studio-production-team-launch-readiness-v1";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { LaunchMenuObserverResult } from "@/lib/studio-dispatch/launch-menu-production-observer";
import type { DesignRendererObserverResult } from "@/lib/studio-dispatch/design-renderer-observer";

export type ProductionTeamLaneKind = "design" | "copy" | "video" | "other";

export type ProductionTeamLaneState =
  | "producing"
  | "review_ready"
  | "blocked_on_customer"
  | "failed_closed"
  | "escalation_required";

export type ProductionTeamCampaignKind =
  | "producing"
  | "partially_review_ready"
  | "blocked_on_service"
  | "all_review_ready"
  | "escalation_required";

export type ProductionTeamLaneTruth = {
  skuId: string;
  serviceName: string;
  kind: ProductionTeamLaneKind;
  state: ProductionTeamLaneState;
  reviewReady: boolean;
  failureCode?: string;
  invocationOutcome?: string;
  proofCount: number;
};

export type ProductionTeamCampaignTruth = {
  packageId: typeof studioProductionTeamLaunchReadinessV1.packageId;
  kind: ProductionTeamCampaignKind;
  lanes: readonly ProductionTeamLaneTruth[];
  readyCount: number;
  notReadyCount: number;
  customerLabel: string;
  customerLead: string;
  wholePackageComplete: boolean;
};

function laneKind(skuId: string): ProductionTeamLaneKind {
  if (skuId === studioProductionTeamLaunchReadinessV1.designSku) return "design";
  if (skuId === studioProductionTeamLaunchReadinessV1.copySku) return "copy";
  if (skuId === studioProductionTeamLaunchReadinessV1.videoSku) return "video";
  return "other";
}

const CUSTOMER_BLOCK_CODES = new Set([
  "MISSING_USABLE_FOOTAGE",
  "MISSING_REQUIRED_FACTS",
]);

const ESCALATION_CODES = new Set([
  "CREDENTIALS_BLOCKED",
  "VIDEO_TRANSPORT_EXHAUSTED",
  "PACKET_INVALID",
]);

function observerForSku(
  skuId: string,
  launchResults: readonly LaunchMenuObserverResult[],
  designResults: readonly DesignRendererObserverResult[],
): LaunchMenuObserverResult | DesignRendererObserverResult | undefined {
  return (
    launchResults.find((result) => result.skuId === skuId) ??
    designResults.find((result) => result.skuId === skuId)
  );
}

function laneState(input: {
  job: PurchasedJobRecord;
  observer?: { ok?: boolean; failureCode?: string };
}): ProductionTeamLaneState {
  if (canClientAccessJobReview(input.job)) return "review_ready";
  if (input.job.spineStatus === "waiting_on_client") return "blocked_on_customer";
  const code = input.observer?.failureCode;
  if (code && CUSTOMER_BLOCK_CODES.has(code)) return "blocked_on_customer";
  if (code && ESCALATION_CODES.has(code)) return "escalation_required";
  if (input.observer && input.observer.ok === false) return "failed_closed";
  return "producing";
}

export function assembleProductionTeamCampaignTruth(input: {
  jobs: readonly PurchasedJobRecord[];
  launchResults?: readonly LaunchMenuObserverResult[];
  designResults?: readonly DesignRendererObserverResult[];
}): ProductionTeamCampaignTruth {
  const launchResults = input.launchResults ?? [];
  const designResults = input.designResults ?? [];
  const lanes: ProductionTeamLaneTruth[] = input.jobs.map((job) => {
    const observer = observerForSku(job.skuId, launchResults, designResults);
    const state = laneState({ job, observer });
    return {
      skuId: job.skuId,
      serviceName: job.serviceName,
      kind: laneKind(job.skuId),
      state,
      reviewReady: canClientAccessJobReview(job),
      failureCode: observer && "failureCode" in observer ? observer.failureCode : undefined,
      invocationOutcome:
        observer && "invocationOutcome" in observer ? observer.invocationOutcome : undefined,
      proofCount: (job.fileRegistry ?? []).filter((ref) => ref.category === "review_proof")
        .length,
    };
  });

  const readyCount = lanes.filter((lane) => lane.reviewReady).length;
  const notReadyCount = lanes.length - readyCount;
  const blocked = lanes.some((lane) => lane.state === "blocked_on_customer");
  const escalation = lanes.some((lane) => lane.state === "escalation_required");
  const wholePackageComplete = lanes.length > 0 && notReadyCount === 0;

  let kind: ProductionTeamCampaignKind = "producing";
  if (wholePackageComplete) kind = "all_review_ready";
  else if (escalation && readyCount > 0) kind = "escalation_required";
  else if (readyCount > 0 && blocked) kind = "blocked_on_service";
  else if (readyCount > 0 && notReadyCount > 0) kind = "partially_review_ready";
  else if (escalation) kind = "escalation_required";
  else if (blocked && readyCount === 0) kind = "blocked_on_service";

  const copy = productionTeamCustomerCopy;
  const presentation =
    kind === "all_review_ready"
      ? { label: copy.allReviewReadyLabel, lead: copy.allReviewReadyLead }
      : kind === "blocked_on_service"
        ? { label: copy.blockedOnServiceLabel, lead: copy.blockedOnServiceLead }
        : kind === "escalation_required"
          ? { label: copy.escalationLabel, lead: copy.escalationLead }
          : kind === "partially_review_ready"
            ? { label: copy.partialReviewReadyLabel, lead: copy.partialReviewReadyLead }
            : { label: copy.producingLabel, lead: copy.producingLead };

  return {
    packageId: studioProductionTeamLaunchReadinessV1.packageId,
    kind,
    lanes,
    readyCount,
    notReadyCount,
    customerLabel: presentation.label,
    customerLead: presentation.lead,
    wholePackageComplete,
  };
}
