/**
 * Route Map V1 — campaign creation and approved-plan handoff to Secure Checkout.
 * Supports activated V2 RTU shelf SKUs and optional v2-addon-post-publish at checkout.
 */

import type { ServiceId } from "@/catalog/types";
import { getServiceById } from "@/catalog/accessors";
import {
  isPostPublishAddonEligibleParent,
  ROUTE_MAP_V2_POST_PUBLISH_ADDON,
} from "@/catalog/route-map-v2-launch";
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
  /** When true, v2-addon-post-publish was included at checkout. */
  postPublishAddon?: boolean;
};

export type RouteMapCheckoutOptions = {
  includePostPublishAddon?: boolean;
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

function buildPostPublishAddonLineItem(): ApprovedStudioPlanLineItem {
  const addon = ROUTE_MAP_V2_POST_PUBLISH_ADDON;
  return {
    skuId: addon.id,
    serviceName: addon.name,
    billingType: "one_time",
    exactPriceCents: addon.priceCents,
    priceDisplay: formatUsd(addon.priceCents),
    deliverables: addon.deliverables,
    exclusions: addon.exclusions,
    timingWindowLabel: "Usually within 1–2 business days after approval and clean access.",
    revisionRule: addon.revisionRule,
    clientResponsibilities: addon.clientResponsibilities,
    executionResponsibility: EXECUTION_MODE_LABELS.managed_execution_when_selected,
    serviceId: addon.id,
    name: addon.name,
    priceCents: addon.priceCents,
  };
}

export function isRouteMapPostPublishAddonEligible(jobId: RouteMapJobId): boolean {
  return isPostPublishAddonEligibleParent(jobId);
}

export function buildApprovedPlanFromRouteMapJob(
  job: RouteMapJob,
  options: RouteMapCheckoutOptions = {},
): ApprovedStudioPlan {
  const catalog = getServiceById(job.id as ServiceId);
  const priceCents = catalog?.priceCents ?? job.priceCents;
  const lineItem = buildLineItem(job);
  const includeAddon =
    options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(job.id);
  const addonLineItem = includeAddon ? buildPostPublishAddonLineItem() : null;
  const lineItems = addonLineItem ? [lineItem, addonLineItem] : [lineItem];
  const addonCents = addonLineItem?.priceCents ?? 0;

  return {
    selectedServiceIds: lineItems.map((item) => item.skuId),
    includedServiceIds: lineItems.map((item) => item.skuId),
    additionalServiceIds: addonLineItem ? [addonLineItem.skuId] : [],
    additionalCostUsd: addonCents / 100,
    oneTimeTotalCents: priceCents + addonCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: priceCents + addonCents,
    lineItems,
    approvedAt: new Date().toISOString(),
  };
}

export function buildRouteMapPaymentSummary(
  job: RouteMapJob,
  options: RouteMapCheckoutOptions = {},
) {
  const catalog = getServiceById(job.id as ServiceId);
  const priceCents = catalog?.priceCents ?? job.priceCents;
  const includeAddon =
    options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(job.id);
  const addonCents = includeAddon ? ROUTE_MAP_V2_POST_PUBLISH_ADDON.priceCents : 0;
  const totalCents = priceCents + addonCents;

  const lineItems = [
    {
      serviceId: job.id as ServiceId,
      name: catalog?.name ?? job.name,
      priceDisplay: job.priceDisplay,
      priceCents,
      billingType: job.billingType,
    },
    ...(includeAddon
      ? [
          {
            serviceId: ROUTE_MAP_V2_POST_PUBLISH_ADDON.id,
            name: ROUTE_MAP_V2_POST_PUBLISH_ADDON.name,
            priceDisplay: formatUsd(ROUTE_MAP_V2_POST_PUBLISH_ADDON.priceCents),
            priceCents: ROUTE_MAP_V2_POST_PUBLISH_ADDON.priceCents,
            billingType: "one_time" as const,
          },
        ]
      : []),
  ];

  return {
    lineItems,
    services: lineItems.map((item) => item.name),
    oneTimeSubtotalCents: totalCents,
    monthlySubtotalCents: 0,
    amountDueTodayCents: totalCents,
    oneTimeSubtotalDisplay: formatUsd(totalCents),
    monthlySubtotalDisplay: formatUsd(0),
    amountDueTodayDisplay: formatUsd(totalCents),
    investmentLabel: "Amount Due Today" as const,
    investmentDisplay: formatUsd(totalCents),
    source: "storage" as const,
  };
}

export function createCampaignFromRouteMapJob(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
  options: RouteMapCheckoutOptions = {},
): CampaignRecord | null {
  const job = getRouteMapJob(jobId);
  if (!job) return null;

  const content = studioBoard.statusContent.DISCOVERY_COMPLETE;
  const now = new Date().toISOString();
  const approvedStudioPlan = buildApprovedPlanFromRouteMapJob(job, options);
  const postPublishAddon =
    options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(jobId);

  const campaign: CampaignRecord = {
    campaignId: crypto.randomUUID(),
    campaignName: job.name,
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: CUSTOM_STUDIO_PLAN_LABEL,
    approvedStudioPlan,
    routeMapContext: { jobId, roadId, selectedAt: now, ...(postPublishAddon ? { postPublishAddon: true } : {}) },
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
  options: RouteMapCheckoutOptions = {},
): CampaignRecord | null {
  const job = getRouteMapJob(jobId);
  const campaign = readCurrentCampaign();
  if (!job || !campaign) return null;

  const approvedStudioPlan: ApprovedStudioPlan = {
    ...buildApprovedPlanFromRouteMapJob(job, options),
    ...(acknowledgment
      ? {
          acknowledgmentVersion: acknowledgment.acknowledgmentVersion,
          acknowledgmentText: acknowledgment.acknowledgmentText,
          acknowledgedAt: acknowledgment.acknowledgedAt,
        }
      : {}),
  };

  const postPublishAddon =
    options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(jobId);

  const updated: CampaignRecord = {
    ...campaign,
    approvedStudioPlan,
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: CUSTOM_STUDIO_PLAN_LABEL,
    revisionRoundsIncluded: 1,
    routeMapContext: campaign.routeMapContext
      ? {
          ...campaign.routeMapContext,
          ...(postPublishAddon ? { postPublishAddon: true } : {}),
        }
      : campaign.routeMapContext,
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
