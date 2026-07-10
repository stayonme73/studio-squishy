/**
 * Route Map V1 — campaign creation and approved-plan handoff to Secure Checkout.
 * Supports activated V2 RTU shelf SKUs and optional v2-addon-post-publish at checkout.
 */

import type { ServiceId } from "@/catalog/types";
import {
  isPostPublishAddonEligibleParent,
  ROUTE_MAP_V2_POST_PUBLISH_ADDON,
} from "@/catalog/route-map-v2-launch";
import type {
  ApprovalAcknowledgment,
  ApprovedStudioPlan,
  CampaignRecord,
  RouteMapJourneyStep,
} from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import {
  ROUTE_MAP_V1,
  getRouteMapJob,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { CUSTOM_STUDIO_PLAN_LABEL, CUSTOM_STUDIO_PLAN_PACKAGE_ID } from "@/lib/approved-plan-display";
import { syncCampaignToServer } from "@/lib/campaign-store/sync-client";
import { buildServiceScopeSnapshot, computePlanPricingTotals } from "@/lib/plan-pricing";
import { readCurrentCampaign, saveCurrentCampaign } from "@/lib/studio-board-campaign";
import {
  addServiceToPlan,
  allocateSelectedServices,
  computeAdditionalCostUsd,
  removeServiceFromPlan,
  type StudioPlanState,
} from "@/studio-plan-review/planState";

function persistRouteMapCampaign(campaign: CampaignRecord): CampaignRecord {
  saveCurrentCampaign(campaign);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }
  void syncCampaignToServer(campaign);
  return campaign;
}

export type RouteMapCampaignContext = {
  selectedServiceIds?: readonly ServiceId[];
  jobId: RouteMapJobId;
  roadId: RouteMapRoadId;
  selectedAt: string;
  currentStep?: RouteMapJourneyStep;
  /** When true, v2-addon-post-publish was included at checkout. */
  postPublishAddon?: boolean;
};

export type RouteMapCheckoutOptions = {
  includePostPublishAddon?: boolean;
};

export type RouteMapRestoredJourney = {
  step: RouteMapJourneyStep;
  jobId: RouteMapJobId;
  roadId: RouteMapRoadId;
  selectedServiceIds: readonly ServiceId[];
  includePostPublishAddon: boolean;
};

function isRouteMapJourneyStep(value: unknown): value is RouteMapJourneyStep {
  return (
    value === "panel" ||
    value === "job" ||
    value === "studio-plan" ||
    value === "checkout" ||
    value === "intake"
  );
}

function isRouteMapRoadId(value: unknown): value is RouteMapRoadId {
  return typeof value === "string" && ROUTE_MAP_V1.roads.some((road) => road.id === value);
}

function isRouteMapStudioPlanServiceId(value: unknown): value is ServiceId {
  if (typeof value !== "string") return false;
  return Boolean(getRouteMapJob(value as RouteMapJobId) || value === ROUTE_MAP_V2_POST_PUBLISH_ADDON.id);
}

function dedupeServiceIds(serviceIds: readonly ServiceId[]): ServiceId[] {
  return [...new Set(serviceIds)];
}

/**
 * `Array.isArray` alone does not narrow a `readonly ServiceId[]` out of a union with a scalar —
 * a readonly array isn't assignable to the guard's `any[]` signature, so TS can't exclude it from
 * the negative branch. This explicit predicate narrows both branches correctly.
 */
function isRouteMapServiceIdList(
  value: RouteMapJobId | readonly ServiceId[],
): value is readonly ServiceId[] {
  return Array.isArray(value);
}

export function addServiceToRouteMapPlanState(
  state: StudioPlanState,
  serviceId: ServiceId,
): StudioPlanState {
  const sharedPlanState = addServiceToPlan(state, serviceId);
  if (sharedPlanState.selectedServiceIds !== state.selectedServiceIds) return sharedPlanState;
  if (state.selectedServiceIds.includes(serviceId)) return state;

  if (serviceId === ROUTE_MAP_V2_POST_PUBLISH_ADDON.id) {
    const hasEligibleParent = state.selectedServiceIds.some((selectedId) =>
      isRouteMapPostPublishAddonEligible(selectedId as RouteMapJobId),
    );
    return hasEligibleParent
      ? { selectedServiceIds: [...state.selectedServiceIds, serviceId] }
      : state;
  }

  if (getRouteMapJob(serviceId as RouteMapJobId)) {
    return { selectedServiceIds: [...state.selectedServiceIds, serviceId] };
  }

  return sharedPlanState;
}

/**
 * Shared `pruneOrphanedExecutionAddOns` (via `removeServiceFromPlan`) relies on
 * `canAttachExecutionAddOn`, which matches by catalog `dependencies`/`eligibleParentFamilyIds`.
 * The Route Map post/publish add-on has neither — its two eligible parents
 * (v2-rtu-social-posts, v2-rtu-short-video) span different families on purpose, so the shared
 * rule can never recognize either as a valid parent and always prunes it. Restore it here when
 * an eligible parent is still selected after the shared removal runs.
 */
export function removeServiceFromRouteMapPlanState(
  state: StudioPlanState,
  serviceId: ServiceId,
): StudioPlanState {
  const hadAddon = state.selectedServiceIds.includes(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id);
  const sharedResult = removeServiceFromPlan(state, serviceId);

  if (!hadAddon || serviceId === ROUTE_MAP_V2_POST_PUBLISH_ADDON.id) {
    return sharedResult;
  }

  const stillHasEligibleParent = sharedResult.selectedServiceIds.some((id) =>
    isRouteMapPostPublishAddonEligible(id as RouteMapJobId),
  );
  if (!stillHasEligibleParent || sharedResult.selectedServiceIds.includes(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id)) {
    return sharedResult;
  }

  const keepIds = new Set(sharedResult.selectedServiceIds);
  keepIds.add(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id);
  return {
    selectedServiceIds: state.selectedServiceIds.filter(
      (id) => id !== serviceId && keepIds.has(id),
    ),
  };
}

export function deriveRouteMapJobIdFromSelectedServices(
  selectedServiceIds: readonly ServiceId[],
  fallbackJobId?: RouteMapJobId,
): RouteMapJobId | null {
  const firstSelectedJobId = selectedServiceIds.find((serviceId) =>
    Boolean(getRouteMapJob(serviceId as RouteMapJobId)),
  );
  if (firstSelectedJobId) return firstSelectedJobId as RouteMapJobId;
  return fallbackJobId && getRouteMapJob(fallbackJobId) ? fallbackJobId : null;
}

export function resolveRouteMapSelectedServiceIds(
  routeMapContext: Partial<RouteMapCampaignContext> | null | undefined,
): ServiceId[] | null {
  const rawSelectedServiceIds = routeMapContext?.selectedServiceIds;

  if (rawSelectedServiceIds) {
    if (!Array.isArray(rawSelectedServiceIds)) return null;
    if (rawSelectedServiceIds.some((serviceId) => !isRouteMapStudioPlanServiceId(serviceId))) {
      return null;
    }

    return dedupeServiceIds(rawSelectedServiceIds);
  }

  if (routeMapContext?.jobId && getRouteMapJob(routeMapContext.jobId)) {
    const selectedServiceIds: ServiceId[] = [routeMapContext.jobId as ServiceId];
    if (routeMapContext.postPublishAddon === true) {
      selectedServiceIds.push(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id);
    }
    return selectedServiceIds;
  }

  return null;
}

export function resolveRouteMapRestoredJourney(
  routeMapContext: Partial<RouteMapCampaignContext> | null | undefined,
  requestedStep: string | null,
): RouteMapRestoredJourney | null {
  if (!routeMapContext?.jobId || !routeMapContext.roadId) return null;
  if (!getRouteMapJob(routeMapContext.jobId)) return null;
  if (!isRouteMapRoadId(routeMapContext.roadId)) return null;
  const selectedServiceIds = resolveRouteMapSelectedServiceIds(routeMapContext);
  if (!selectedServiceIds) return null;

  const restoredStep = requestedStep === "intake" ? "intake" : routeMapContext.currentStep ?? "job";
  if (!isRouteMapJourneyStep(restoredStep)) return null;

  return {
    step: restoredStep,
    jobId: routeMapContext.jobId,
    roadId: routeMapContext.roadId,
    selectedServiceIds,
    includePostPublishAddon: routeMapContext.postPublishAddon === true,
  };
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function routeMapContextFor(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
  selectedAt: string,
  currentStep: RouteMapJourneyStep,
  options: RouteMapCheckoutOptions = {},
  selectedServiceIds: readonly ServiceId[] = [jobId as ServiceId],
): RouteMapCampaignContext {
  const postPublishAddon =
    options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(jobId);
  const nextSelectedServiceIds = postPublishAddon
    ? dedupeServiceIds([...selectedServiceIds, ROUTE_MAP_V2_POST_PUBLISH_ADDON.id])
    : dedupeServiceIds(selectedServiceIds);
  const derivedJobId = deriveRouteMapJobIdFromSelectedServices(nextSelectedServiceIds, jobId) ?? jobId;

  return {
    selectedServiceIds: nextSelectedServiceIds,
    jobId: derivedJobId,
    roadId,
    selectedAt,
    currentStep,
    ...(postPublishAddon ? { postPublishAddon: true } : {}),
  };
}

export function isRouteMapPostPublishAddonEligible(jobId: RouteMapJobId): boolean {
  return isPostPublishAddonEligibleParent(jobId);
}

export function buildApprovedPlanFromRouteMapJob(
  job: RouteMapJob,
  options: RouteMapCheckoutOptions = {},
): ApprovedStudioPlan {
  const selectedServiceIds: ServiceId[] = [job.id as ServiceId];
  if (options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(job.id)) {
    selectedServiceIds.push(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id);
  }

  return buildApprovedPlanFromRouteMapServices(selectedServiceIds);
}

export function buildApprovedPlanFromRouteMapServices(
  selectedServiceIds: readonly ServiceId[],
): ApprovedStudioPlan {
  const { includedServiceIds, additionalServiceIds } = allocateSelectedServices(selectedServiceIds);
  const additionalCost = computeAdditionalCostUsd(additionalServiceIds);
  const pricing = computePlanPricingTotals(selectedServiceIds);
  const lineItems = buildServiceScopeSnapshot(selectedServiceIds);

  return {
    selectedServiceIds: [...selectedServiceIds],
    includedServiceIds,
    additionalServiceIds,
    additionalCostUsd: additionalCost.amountUsd,
    oneTimeTotalCents: pricing.oneTimeSubtotalCents,
    monthlyTotalCents: pricing.monthlySubtotalCents,
    amountDueTodayCents: pricing.amountDueTodayCents,
    lineItems,
    approvedAt: new Date().toISOString(),
  };
}

export function buildRouteMapPaymentSummaryFromServices(selectedServiceIds: readonly ServiceId[]) {
  const totals = computePlanPricingTotals(selectedServiceIds);

  return {
    lineItems: totals.lineItems,
    services: totals.lineItems.map((item) => item.name),
    oneTimeSubtotalCents: totals.oneTimeSubtotalCents,
    monthlySubtotalCents: totals.monthlySubtotalCents,
    amountDueTodayCents: totals.amountDueTodayCents,
    oneTimeSubtotalDisplay: formatUsd(totals.oneTimeSubtotalCents),
    monthlySubtotalDisplay: formatUsd(totals.monthlySubtotalCents),
    amountDueTodayDisplay: formatUsd(totals.amountDueTodayCents),
    investmentLabel: "Amount Due Today" as const,
    investmentDisplay: formatUsd(totals.amountDueTodayCents),
    source: "storage" as const,
  };
}

export function buildRouteMapPaymentSummary(
  job: RouteMapJob,
  options: RouteMapCheckoutOptions = {},
) {
  const selectedServiceIds: ServiceId[] = [job.id as ServiceId];
  if (options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(job.id)) {
    selectedServiceIds.push(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id);
  }
  return buildRouteMapPaymentSummaryFromServices(selectedServiceIds);
}

export function createCampaignFromRouteMapJob(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
  options: RouteMapCheckoutOptions & { currentStep?: RouteMapJourneyStep } = {},
): CampaignRecord | null {
  const job = getRouteMapJob(jobId);
  if (!job) return null;

  const content = studioBoard.statusContent.DISCOVERY_COMPLETE;
  const now = new Date().toISOString();
  const approvedStudioPlan = buildApprovedPlanFromRouteMapJob(job, options);

  const campaign: CampaignRecord = {
    campaignId: crypto.randomUUID(),
    campaignName: job.name,
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: CUSTOM_STUDIO_PLAN_LABEL,
    approvedStudioPlan,
    routeMapContext: routeMapContextFor(
      jobId,
      roadId,
      now,
      options.currentStep ?? "job",
      options,
    ),
    paymentReceivedAt: null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: `Your project has been created: ${job.name}.` }],
    createdAt: now,
    updatedAt: now,
  };

  return campaign;
}

export function selectRouteMapJob(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
): CampaignRecord | null {
  const existing = readCurrentCampaign();
  if (existing?.routeMapContext) {
    const selectedServiceIds = resolveRouteMapSelectedServiceIds(existing.routeMapContext) ?? [];
    const updated: CampaignRecord = {
      ...existing,
      routeMapContext: {
        ...existing.routeMapContext,
        jobId: deriveRouteMapJobIdFromSelectedServices(selectedServiceIds, jobId) ?? jobId,
        roadId,
        selectedServiceIds,
        currentStep: "job",
      },
      updatedAt: new Date().toISOString(),
    };
    return persistRouteMapCampaign(updated);
  }

  const campaign = createCampaignFromRouteMapJob(jobId, roadId);
  if (!campaign) return null;
  return persistRouteMapCampaign({
    ...campaign,
    approvedStudioPlan: undefined,
    routeMapContext: {
      ...campaign.routeMapContext!,
      selectedServiceIds: [],
      jobId,
      roadId,
      currentStep: "job",
    },
  });
}

export function addRouteMapServiceToPlan(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
): CampaignRecord | null {
  const existing = readCurrentCampaign();
  const currentSelected = existing?.routeMapContext
    ? resolveRouteMapSelectedServiceIds(existing.routeMapContext) ?? []
    : [];
  const nextPlanState = addServiceToRouteMapPlanState(
    { selectedServiceIds: currentSelected },
    jobId as ServiceId,
  );
  if (nextPlanState.selectedServiceIds.length === 0) return existing ?? null;

  const derivedJobId =
    deriveRouteMapJobIdFromSelectedServices(nextPlanState.selectedServiceIds, jobId) ?? jobId;
  const now = new Date().toISOString();
  const baseCampaign =
    existing ??
    createCampaignFromRouteMapJob(derivedJobId, roadId, {
      currentStep: "studio-plan",
    });
  if (!baseCampaign) return null;

  const updated: CampaignRecord = {
    ...baseCampaign,
    campaignName: getRouteMapJob(derivedJobId)?.name ?? baseCampaign.campaignName,
    routeMapContext: routeMapContextFor(
      derivedJobId,
      roadId,
      baseCampaign.routeMapContext?.selectedAt ?? now,
      "studio-plan",
      {},
      nextPlanState.selectedServiceIds,
    ),
    approvedStudioPlan: buildApprovedPlanFromRouteMapServices(nextPlanState.selectedServiceIds),
    updatedAt: now,
  };

  return persistRouteMapCampaign(updated);
}

export function removeRouteMapServiceFromPlan(serviceId: ServiceId): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  const ctx = campaign?.routeMapContext;
  if (!campaign || !ctx) return null;

  const currentSelected = resolveRouteMapSelectedServiceIds(ctx) ?? [];
  const planState = removeServiceFromRouteMapPlanState({ selectedServiceIds: currentSelected }, serviceId);
  const derivedJobId = deriveRouteMapJobIdFromSelectedServices(planState.selectedServiceIds, ctx.jobId);
  const now = new Date().toISOString();

  const updated: CampaignRecord = {
    ...campaign,
    approvedStudioPlan:
      planState.selectedServiceIds.length > 0
        ? buildApprovedPlanFromRouteMapServices(planState.selectedServiceIds)
        : undefined,
    routeMapContext: {
      ...ctx,
      selectedServiceIds: planState.selectedServiceIds,
      jobId: derivedJobId ?? ctx.jobId,
      currentStep: "studio-plan",
      postPublishAddon: planState.selectedServiceIds.includes(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id)
        ? true
        : undefined,
    },
    updatedAt: now,
  };

  return persistRouteMapCampaign(updated);
}

export function saveRouteMapPlanState(planState: StudioPlanState): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  const ctx = campaign?.routeMapContext;
  if (!campaign || !ctx) return null;
  const derivedJobId = deriveRouteMapJobIdFromSelectedServices(planState.selectedServiceIds, ctx.jobId);

  return persistRouteMapCampaign({
    ...campaign,
    approvedStudioPlan:
      planState.selectedServiceIds.length > 0
        ? buildApprovedPlanFromRouteMapServices(planState.selectedServiceIds)
        : undefined,
    routeMapContext: {
      ...ctx,
      selectedServiceIds: [...planState.selectedServiceIds],
      jobId: derivedJobId ?? ctx.jobId,
      currentStep: "studio-plan",
      postPublishAddon: planState.selectedServiceIds.includes(ROUTE_MAP_V2_POST_PUBLISH_ADDON.id)
        ? true
        : undefined,
    },
    updatedAt: new Date().toISOString(),
  });
}

export function saveRouteMapJourneyStep(
  currentStep: RouteMapJourneyStep,
  options: RouteMapCheckoutOptions = {},
): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  const ctx = campaign?.routeMapContext;
  if (!campaign || !ctx) return null;

  const includePostPublishAddon =
    options.includePostPublishAddon === true && isRouteMapPostPublishAddonEligible(ctx.jobId);

  const updated: CampaignRecord = {
    ...campaign,
    routeMapContext: {
      ...ctx,
      currentStep,
      ...(includePostPublishAddon ? { postPublishAddon: true } : { postPublishAddon: undefined }),
    },
    updatedAt: new Date().toISOString(),
  };

  return persistRouteMapCampaign(updated);
}

export function saveApprovedRouteMapPlan(
  jobIdOrServiceIds: RouteMapJobId | readonly ServiceId[],
  acknowledgment?: ApprovalAcknowledgment,
  options: RouteMapCheckoutOptions = {},
): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return null;

  let selectedServiceIds: ServiceId[];
  let basePlan: ApprovedStudioPlan;

  if (isRouteMapServiceIdList(jobIdOrServiceIds)) {
    if (jobIdOrServiceIds.length === 0) return null;
    selectedServiceIds = [...jobIdOrServiceIds];
    basePlan = buildApprovedPlanFromRouteMapServices(selectedServiceIds);
  } else {
    const routeMapJob = getRouteMapJob(jobIdOrServiceIds);
    if (!routeMapJob) return null;
    selectedServiceIds = [jobIdOrServiceIds];
    basePlan = buildApprovedPlanFromRouteMapJob(routeMapJob, options);
  }

  const approvedStudioPlan: ApprovedStudioPlan = {
    ...basePlan,
    ...(acknowledgment
      ? {
          acknowledgmentVersion: acknowledgment.acknowledgmentVersion,
          acknowledgmentText: acknowledgment.acknowledgmentText,
          acknowledgedAt: acknowledgment.acknowledgedAt,
        }
      : {}),
  };

  const derivedJobId = deriveRouteMapJobIdFromSelectedServices(
    approvedStudioPlan.selectedServiceIds,
    campaign.routeMapContext?.jobId,
  );

  const updated: CampaignRecord = {
    ...campaign,
    approvedStudioPlan,
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: CUSTOM_STUDIO_PLAN_LABEL,
    revisionRoundsIncluded: 1,
    routeMapContext: campaign.routeMapContext
      ? {
          ...campaign.routeMapContext,
          selectedServiceIds: approvedStudioPlan.selectedServiceIds,
          jobId: derivedJobId ?? campaign.routeMapContext.jobId,
          currentStep: "checkout",
          postPublishAddon: approvedStudioPlan.selectedServiceIds.includes(
            ROUTE_MAP_V2_POST_PUBLISH_ADDON.id,
          )
            ? true
            : undefined,
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
    routeMapIntakeDraft: undefined,
    routeMapIntakeSubmittedAt: submittedAt,
    routeMapContext: campaign.routeMapContext
      ? { ...campaign.routeMapContext, currentStep: "intake" }
      : campaign.routeMapContext,
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

export function saveRouteMapIntakeDraft(
  answers: RouteMapIntakeAnswers,
  savedAt = new Date().toISOString(),
): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign?.paymentReceivedAt || !campaign.approvedStudioPlan) return null;
  if (campaign.routeMapIntakeSubmittedAt) return campaign;

  return persistRouteMapCampaign({
    ...campaign,
    routeMapIntakeDraft: { answers, savedAt },
    routeMapContext: campaign.routeMapContext
      ? { ...campaign.routeMapContext, currentStep: "intake" }
      : campaign.routeMapContext,
    updatedAt: savedAt,
  });
}
