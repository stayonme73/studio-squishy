/**
 * Route Map V1 — campaign creation and approved-plan handoff to Secure Checkout.
 */

import type { ServiceId } from "@/catalog/types";
import { getServiceById } from "@/catalog/accessors";
import type {
  ApprovalAcknowledgment,
  ApprovedStudioPlan,
  ApprovedStudioPlanLineItem,
  CampaignRecord,
} from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import {
  getRouteMapJob,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { EXECUTION_MODE_LABELS } from "@/config/service-guide";
import { CUSTOM_STUDIO_PLAN_LABEL, CUSTOM_STUDIO_PLAN_PACKAGE_ID } from "@/lib/approved-plan-display";
import { syncCampaignToServer } from "@/lib/campaign-store/sync-client";
import { readCurrentCampaign, saveCurrentCampaign } from "@/lib/studio-board-campaign";

function persistRouteMapCampaign(campaign: CampaignRecord): CampaignRecord {
  saveCurrentCampaign(campaign);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }
  void syncCampaignToServer(campaign);
  return campaign;
}

export type RouteMapCampaignContext = {
  jobId: RouteMapJobId;
  roadId: RouteMapRoadId;
  selectedAt: string;
};

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function buildLineItem(job: RouteMapJob): ApprovedStudioPlanLineItem {
  const skuId = job.id as ServiceId;
  const catalog = getServiceById(skuId);
  return {
    skuId,
    serviceName: catalog?.name ?? job.name,
    billingType: job.billingType,
    exactPriceCents: catalog?.priceCents ?? job.priceCents,
    priceDisplay: job.priceDisplay,
    deliverables: catalog?.deliverables ?? job.deliverables,
    exclusions: catalog?.exclusions ?? job.exclusions,
    timingWindowLabel: job.timingLabel,
    revisionRule: catalog?.revisionRule ?? job.revisionRule,
    clientResponsibilities: catalog?.clientResponsibilities ?? job.clientResponsibilities,
    executionResponsibility: EXECUTION_MODE_LABELS.managed_execution_when_selected,
    serviceId: skuId,
    name: catalog?.name ?? job.name,
    priceCents: catalog?.priceCents ?? job.priceCents,
  };
}

export function buildApprovedPlanFromRouteMapJob(job: RouteMapJob): ApprovedStudioPlan {
  const catalog = getServiceById(job.id as ServiceId);
  const priceCents = catalog?.priceCents ?? job.priceCents;
  const lineItem = buildLineItem(job);
  return {
    selectedServiceIds: [lineItem.skuId],
    includedServiceIds: [lineItem.skuId],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: priceCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: priceCents,
    lineItems: [lineItem],
    approvedAt: new Date().toISOString(),
  };
}

export function buildRouteMapPaymentSummary(job: RouteMapJob) {
  const catalog = getServiceById(job.id as ServiceId);
  const priceCents = catalog?.priceCents ?? job.priceCents;
  return {
    lineItems: [
      {
        serviceId: job.id as ServiceId,
        name: catalog?.name ?? job.name,
        priceDisplay: job.priceDisplay,
        priceCents,
        billingType: job.billingType,
      },
    ],
    services: [catalog?.name ?? job.name],
    oneTimeSubtotalCents: priceCents,
    monthlySubtotalCents: 0,
    amountDueTodayCents: priceCents,
    oneTimeSubtotalDisplay: formatUsd(priceCents),
    monthlySubtotalDisplay: formatUsd(0),
    amountDueTodayDisplay: formatUsd(priceCents),
    investmentLabel: "Amount Due Today" as const,
    investmentDisplay: formatUsd(priceCents),
    source: "storage" as const,
  };
}

export function createCampaignFromRouteMapJob(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
): CampaignRecord | null {
  const job = getRouteMapJob(jobId);
  if (!job) return null;

  const content = studioBoard.statusContent.DISCOVERY_COMPLETE;
  const now = new Date().toISOString();
  const approvedStudioPlan = buildApprovedPlanFromRouteMapJob(job);

  const campaign: CampaignRecord = {
    campaignId: crypto.randomUUID(),
    campaignName: job.name,
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: CUSTOM_STUDIO_PLAN_LABEL,
    approvedStudioPlan,
    routeMapContext: { jobId, roadId, selectedAt: now },
    paymentReceivedAt: null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: `Route Map job selected: ${job.name}.` }],
    createdAt: now,
    updatedAt: now,
  };

  return campaign;
}

export function selectRouteMapJob(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
): CampaignRecord | null {
  const campaign = createCampaignFromRouteMapJob(jobId, roadId);
  if (!campaign) return null;
  return persistRouteMapCampaign(campaign);
}

export function saveApprovedRouteMapPlan(
  jobId: RouteMapJobId,
  acknowledgment?: ApprovalAcknowledgment,
): CampaignRecord | null {
  const job = getRouteMapJob(jobId);
  const campaign = readCurrentCampaign();
  if (!job || !campaign) return null;

  const approvedStudioPlan: ApprovedStudioPlan = {
    ...buildApprovedPlanFromRouteMapJob(job),
    ...(acknowledgment
      ? {
          acknowledgmentVersion: acknowledgment.acknowledgmentVersion,
          acknowledgmentText: acknowledgment.acknowledgmentText,
          acknowledgedAt: acknowledgment.acknowledgedAt,
        }
      : {}),
  };

  const updated: CampaignRecord = {
    ...campaign,
    approvedStudioPlan,
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: CUSTOM_STUDIO_PLAN_LABEL,
    revisionRoundsIncluded: 1,
    updatedAt: new Date().toISOString(),
  };

  return persistRouteMapCampaign(updated);
}

export function submitRouteMapIntake(
  answers: RouteMapIntakeAnswers,
  submittedAt = new Date().toISOString(),
): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign?.paymentReceivedAt || !campaign.approvedStudioPlan) return null;
  if (campaign.routeMapIntakeSubmittedAt) return campaign;

  let updated: CampaignRecord = {
    ...campaign,
    routeMapIntake: { answers, submittedAt },
    routeMapIntakeSubmittedAt: submittedAt,
    updatedAt: submittedAt,
  };

  updated = {
    ...updated,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: studioBoard.statusContent.BUILDING_CONCEPTS.campaignDescription,
    estimatedCompletion: studioBoard.statusContent.BUILDING_CONCEPTS.estimatedCompletion,
    studioNotes: [
      ...(updated.studioNotes ?? []),
      { date: "Today", message: "Route Map intake received." },
    ],
  };

  return persistRouteMapCampaign(updated);
}
