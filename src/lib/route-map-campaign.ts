/**
 * Route Map V1 — campaign creation and approved-plan handoff to Secure Checkout.
 * Supports activated V2 RTU shelf SKUs. Retired commerce SKUs remain readable for history only.
 */

import type { ServiceId } from "@/catalog/types";
import type {
  ApprovalAcknowledgment,
  ApprovedStudioPlan,
  CampaignRecord,
  RouteMapJourneyStep,
} from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import {
  ROUTE_MAP_V1,
  getJobsForRoad,
  getRouteMapJob,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { isRouteMapRetiredCommerceSku } from "@/config/route-map-guidance-v1";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { CUSTOM_STUDIO_PLAN_LABEL, CUSTOM_STUDIO_PLAN_PACKAGE_ID } from "@/lib/approved-plan-display";
import { syncCampaignToServer } from "@/lib/campaign-store/sync-client";
import { buildServiceScopeSnapshot, computePlanPricingTotals } from "@/lib/plan-pricing";
import { resolveRouteMapServiceDisplayName } from "@/lib/project-builder-update-exit-copy";
import { readCurrentCampaign, saveCurrentCampaign } from "@/lib/studio-board-campaign";
import {
  addServiceToPlan,
  allocateSelectedServices,
  computeAdditionalCostUsd,
  removeServiceFromPlan,
  type StudioPlanState,
} from "@/studio-plan-review/planState";

function persistRouteMapCampaign(campaign: CampaignRecord): CampaignRecord | null {
  const saved = saveCurrentCampaign(campaign);
  if (!saved) return null;
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
};

export type RouteMapCheckoutOptions = {
  roadId?: RouteMapRoadId;
};

export type RouteMapRestoredJourney = {
  step: RouteMapJourneyStep;
  jobId: RouteMapJobId;
  roadId: RouteMapRoadId;
  selectedServiceIds: readonly ServiceId[];
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

function isActiveRouteMapPlanServiceId(value: unknown): value is ServiceId {
  if (typeof value !== "string") return false;
  if (isRouteMapRetiredCommerceSku(value)) return false;
  return Boolean(getRouteMapJob(value as RouteMapJobId));
}

function filterActiveRouteMapServiceIds(serviceIds: readonly ServiceId[]): ServiceId[] {
  return dedupeServiceIds(serviceIds.filter((id) => isActiveRouteMapPlanServiceId(id)));
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
  if (isRouteMapRetiredCommerceSku(serviceId)) return state;

  const sharedPlanState = addServiceToPlan(state, serviceId);
  if (sharedPlanState.selectedServiceIds !== state.selectedServiceIds) return sharedPlanState;
  if (state.selectedServiceIds.includes(serviceId)) return state;

  if (getRouteMapJob(serviceId as RouteMapJobId)) {
    return { selectedServiceIds: [...state.selectedServiceIds, serviceId] };
  }

  return sharedPlanState;
}

export function removeServiceFromRouteMapPlanState(
  state: StudioPlanState,
  serviceId: ServiceId,
): StudioPlanState {
  return removeServiceFromPlan(state, serviceId);
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

    const hasUnsupportedId = rawSelectedServiceIds.some(
      (serviceId) =>
        !isActiveRouteMapPlanServiceId(serviceId) && !isRouteMapRetiredCommerceSku(serviceId),
    );
    if (hasUnsupportedId) return null;

    return filterActiveRouteMapServiceIds(rawSelectedServiceIds);
  }

  if (routeMapContext?.jobId && isActiveRouteMapPlanServiceId(routeMapContext.jobId)) {
    return [routeMapContext.jobId as ServiceId];
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

  const restoredStep = requestedStep === "intake" ? "intake" : routeMapContext.currentStep;
  if (!restoredStep || !isRouteMapJourneyStep(restoredStep)) return null;

  return {
    step: restoredStep,
    jobId: routeMapContext.jobId,
    roadId: routeMapContext.roadId,
    selectedServiceIds,
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
  _options: RouteMapCheckoutOptions = {},
  selectedServiceIds: readonly ServiceId[] = [jobId as ServiceId],
): RouteMapCampaignContext {
  const nextSelectedServiceIds = filterActiveRouteMapServiceIds(selectedServiceIds);
  const derivedJobId =
    deriveRouteMapJobIdFromSelectedServices(nextSelectedServiceIds, jobId) ?? jobId;

  return {
    selectedServiceIds: nextSelectedServiceIds,
    jobId: derivedJobId,
    roadId,
    selectedAt,
    currentStep,
  };
}

export function buildApprovedPlanFromRouteMapJob(
  job: RouteMapJob,
  options: RouteMapCheckoutOptions = {},
): ApprovedStudioPlan {
  return buildApprovedPlanFromRouteMapServices([job.id as ServiceId], options.roadId);
}

export function buildApprovedPlanFromRouteMapServices(
  selectedServiceIds: readonly ServiceId[],
  roadId?: RouteMapRoadId,
): ApprovedStudioPlan {
  const activeServiceIds = filterActiveRouteMapServiceIds(selectedServiceIds);
  const { includedServiceIds, additionalServiceIds } = allocateSelectedServices(activeServiceIds);
  const additionalCost = computeAdditionalCostUsd(additionalServiceIds);
  const pricing = computePlanPricingTotals(activeServiceIds, roadId);
  const lineItems = buildServiceScopeSnapshot(activeServiceIds, roadId);

  return {
    selectedServiceIds: activeServiceIds,
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

export function buildRouteMapPaymentSummaryFromServices(
  selectedServiceIds: readonly ServiceId[],
  roadId?: RouteMapRoadId,
) {
  const totals = computePlanPricingTotals(selectedServiceIds, roadId);

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
  return buildRouteMapPaymentSummaryFromServices([job.id as ServiceId], options.roadId);
}

export function createCampaignFromRouteMapJob(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
  options: RouteMapCheckoutOptions & { currentStep?: RouteMapJourneyStep } = {},
): CampaignRecord | null {
  if (isRouteMapRetiredCommerceSku(jobId)) return null;
  const job = getRouteMapJob(jobId);
  if (!job) return null;

  const content = studioBoard.statusContent.DISCOVERY_COMPLETE;
  const now = new Date().toISOString();
  const approvedStudioPlan = buildApprovedPlanFromRouteMapJob(job, { ...options, roadId });

  const campaign: CampaignRecord = {
    campaignId: crypto.randomUUID(),
    campaignName: resolveRouteMapServiceDisplayName(job.id as ServiceId, roadId),
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
    studioNotes: [
      {
        date: "Today",
        message: `Added to your Studio Plan: ${resolveRouteMapServiceDisplayName(job.id as ServiceId, roadId)}.`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return campaign;
}

export function selectRouteMapRoad(roadId: RouteMapRoadId): CampaignRecord | null {
  const existing = readCurrentCampaign();
  const now = new Date().toISOString();
  const jobs = getJobsForRoad(roadId);
  const anchorJobId = jobs[0]?.id;
  if (!anchorJobId) return null;

  if (existing?.routeMapContext) {
    const selectedServiceIds = resolveRouteMapSelectedServiceIds(existing.routeMapContext) ?? [];

    return persistRouteMapCampaign({
      ...existing,
      approvedStudioPlan:
        selectedServiceIds.length > 0
          ? buildApprovedPlanFromRouteMapServices(selectedServiceIds, roadId)
          : undefined,
      routeMapContext: {
        ...existing.routeMapContext,
        roadId,
        jobId: deriveRouteMapJobIdFromSelectedServices(selectedServiceIds, anchorJobId) ?? anchorJobId,
        selectedServiceIds,
        currentStep: "panel",
      },
      updatedAt: now,
    });
  }

  const campaign = createCampaignFromRouteMapJob(anchorJobId, roadId, { currentStep: "panel" });
  if (!campaign) return null;

  return persistRouteMapCampaign({
    ...campaign,
    approvedStudioPlan: undefined,
    routeMapContext: {
      ...campaign.routeMapContext!,
      selectedServiceIds: [],
      jobId: anchorJobId,
      roadId,
      currentStep: "panel",
    },
  });
}

export function selectRouteMapJob(
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
): CampaignRecord | null {
  if (isRouteMapRetiredCommerceSku(jobId)) return null;
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
  // Defensive boundary only — does not evaluate eligibility, price, or schedule impact.
  // A paid project's approvedStudioPlan must never be altered by the old pre-payment path.
  if (existing?.paymentReceivedAt) return existing;
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
    campaignName: resolveRouteMapServiceDisplayName(derivedJobId as ServiceId, roadId),
    routeMapContext: routeMapContextFor(
      derivedJobId,
      roadId,
      baseCampaign.routeMapContext?.selectedAt ?? now,
      "studio-plan",
      {},
      nextPlanState.selectedServiceIds,
    ),
    approvedStudioPlan: buildApprovedPlanFromRouteMapServices(nextPlanState.selectedServiceIds, roadId),
    updatedAt: now,
  };

  return persistRouteMapCampaign(updated);
}

export function removeRouteMapServiceFromPlan(serviceId: ServiceId): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  const ctx = campaign?.routeMapContext;
  if (!campaign || !ctx) return null;
  // Defensive boundary only — does not evaluate refund eligibility or production status.
  // A paid project's approvedStudioPlan must never be altered by the old pre-payment path.
  if (campaign.paymentReceivedAt) return null;

  const currentSelected = resolveRouteMapSelectedServiceIds(ctx) ?? [];
  const planState = removeServiceFromRouteMapPlanState({ selectedServiceIds: currentSelected }, serviceId);
  const derivedJobId = deriveRouteMapJobIdFromSelectedServices(planState.selectedServiceIds, ctx.jobId);
  const now = new Date().toISOString();

  const updated: CampaignRecord = {
    ...campaign,
    approvedStudioPlan:
      planState.selectedServiceIds.length > 0
        ? buildApprovedPlanFromRouteMapServices(planState.selectedServiceIds, ctx.roadId)
        : undefined,
    routeMapContext: {
      ...ctx,
      selectedServiceIds: planState.selectedServiceIds,
      jobId: derivedJobId ?? ctx.jobId,
      currentStep: "studio-plan",
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
        ? buildApprovedPlanFromRouteMapServices(planState.selectedServiceIds, ctx.roadId)
        : undefined,
    routeMapContext: {
      ...ctx,
      selectedServiceIds: [...planState.selectedServiceIds],
      jobId: derivedJobId ?? ctx.jobId,
      currentStep: "studio-plan",
    },
    updatedAt: new Date().toISOString(),
  });
}

/** Clear in-progress journey step so Route Map can display without auto-redirecting away. */
export function releaseRouteMapForMapView(): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  const ctx = campaign?.routeMapContext;
  if (!campaign || !ctx || !ctx.currentStep) return campaign;

  const { currentStep: _removed, ...routeMapContext } = ctx;

  return persistRouteMapCampaign({
    ...campaign,
    routeMapContext,
    updatedAt: new Date().toISOString(),
  });
}

/** @deprecated Prefer releaseRouteMapForMapView — kept for existing call sites. */
export const releaseRouteMapPanelStep = releaseRouteMapForMapView;

export function saveRouteMapJourneyStep(
  currentStep: RouteMapJourneyStep,
  _options: RouteMapCheckoutOptions = {},
): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  const ctx = campaign?.routeMapContext;
  if (!campaign || !ctx) return null;

  return persistRouteMapCampaign({
    ...campaign,
    routeMapContext: {
      ...ctx,
      currentStep,
    },
    updatedAt: new Date().toISOString(),
  });
}

export function saveApprovedRouteMapPlan(
  jobIdOrServiceIds: RouteMapJobId | readonly ServiceId[],
  acknowledgment?: ApprovalAcknowledgment,
  options: RouteMapCheckoutOptions = {},
): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return null;
  // Defensive boundary only — does not evaluate eligibility, price, or schedule impact.
  // A paid project's approvedStudioPlan must never be overwritten by the old pre-payment path.
  if (campaign.paymentReceivedAt) return null;

  let selectedServiceIds: ServiceId[];
  let basePlan: ApprovedStudioPlan;

  if (isRouteMapServiceIdList(jobIdOrServiceIds)) {
    if (jobIdOrServiceIds.length === 0) return null;
    selectedServiceIds = [...jobIdOrServiceIds];
    basePlan = buildApprovedPlanFromRouteMapServices(
      selectedServiceIds,
      campaign.routeMapContext?.roadId,
    );
  } else {
    const routeMapJob = getRouteMapJob(jobIdOrServiceIds);
    if (!routeMapJob) return null;
    selectedServiceIds = [jobIdOrServiceIds];
    basePlan = buildApprovedPlanFromRouteMapJob(routeMapJob, {
      ...options,
      roadId: options.roadId ?? campaign.routeMapContext?.roadId,
    });
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
  // Already submitted — do not treat as a successful new write.
  if (campaign.routeMapIntakeSubmittedAt) return null;

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
  // Already submitted — do not report as a successful draft save.
  if (campaign.routeMapIntakeSubmittedAt) return null;

  return persistRouteMapCampaign({
    ...campaign,
    routeMapIntakeDraft: { answers, savedAt },
    routeMapContext: campaign.routeMapContext
      ? { ...campaign.routeMapContext, currentStep: "intake" }
      : campaign.routeMapContext,
    updatedAt: savedAt,
  });
}
