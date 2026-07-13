import { ROUTE_MAP_REVISION_DRAWER_ITEMS } from "@/catalog/route-map-shared-copy";
import type { ServiceId } from "@/catalog/types";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import { getRouteMapJob, getRouteMapRoad, type RouteMapRoadId } from "@/config/route-map-v1";
import { resolveProjectBuilderJobPresentation } from "@/lib/project-builder-update-exit-copy";
import { computePlanPricingTotals, formatUsdFromCents } from "@/lib/plan-pricing";

export type ProjectBuilderStudioPlanLineItem = {
  serviceId: ServiceId;
  title: string;
  priceDisplay: string;
  scopeSummary: string;
};

export type ProjectBuilderStudioPlanTimelineItem = {
  title: string;
  timingDisplay: string;
};

export type ProjectBuilderStudioPlanSummaryModel = {
  routeLabel: string;
  deliverables: readonly ProjectBuilderStudioPlanLineItem[];
  totalDisplay: string;
  overallTimelineDisplay: string | null;
  deliverableTimelines: readonly ProjectBuilderStudioPlanTimelineItem[];
  revisionPolicySummary: readonly string[];
  revisionPolicyFull: readonly string[];
  consolidatedRequirements: readonly string[];
  canContinue: boolean;
  emptyMessage: string | null;
};

type BusinessDayRange = {
  min: number;
  max: number;
};

type RequirementTheme = {
  id: string;
  label: string;
  test: (text: string) => boolean;
};

const REQUIREMENT_THEMES: readonly RequirementTheme[] = [
  {
    id: "wording",
    label: "Final wording",
    test: (text) =>
      /wording|copy|item names?|services|menu|posts|script|announcement|promotional details|business information/i.test(
        text,
      ),
  },
  { id: "logo", label: "Logo", test: (text) => /\blogo\b/i.test(text) },
  {
    id: "photos",
    label: "Photos",
    test: (text) => /photo|image|banner|graphic|asset|footage|visual/i.test(text),
  },
  { id: "pricing", label: "Pricing", test: (text) => /pric/i.test(text) },
  { id: "contact", label: "Contact information", test: (text) => /contact/i.test(text) },
  {
    id: "links",
    label: "Platform or website links (if applicable)",
    test: (text) => /platform|login|link|website|account|profile you control/i.test(text),
  },
  {
    id: "source",
    label: "Existing source files or references (if applicable)",
    test: (text) => /existing|source file|reference to the item|link or file for the existing/i.test(text),
  },
  {
    id: "approval",
    label: "Final approval before delivery",
    test: (text) => /approval/i.test(text),
  },
];

export const STUDIO_PLAN_REVISION_SUMMARY = PROJECT_BUILDER_V1.planRevisionSummary;

function parseBusinessDayRange(timingLabel: string): BusinessDayRange | null {
  const rangeMatch = timingLabel.match(/(\d+)\s*[–-]\s*(\d+)\s+business\s+days/i);
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
  }

  const singleMatch = timingLabel.match(/(\d+)\s+business\s+days?/i);
  if (singleMatch) {
    const days = Number(singleMatch[1]);
    return { min: days, max: days };
  }

  return null;
}

function formatBusinessDayRange(range: BusinessDayRange): string {
  if (range.min === range.max) {
    return `${range.min} business day${range.min === 1 ? "" : "s"}`;
  }
  return `${range.min}–${range.max} business days`;
}

function resolveShortTimingDisplay(timingLabel: string): string {
  const range = parseBusinessDayRange(timingLabel);
  return range ? formatBusinessDayRange(range) : "Timing varies by deliverable";
}

function computeOverallTimelineDisplay(ranges: readonly BusinessDayRange[]): string | null {
  if (ranges.length === 0) return null;

  const min = Math.max(...ranges.map((range) => range.min));
  const max = Math.max(...ranges.map((range) => range.max));

  return `${formatBusinessDayRange({ min, max })} after all required materials are received.`;
}

function mergeExactResponsibilities(items: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(normalized);
  }

  return merged;
}

export function consolidateStudioPlanRequirements(items: readonly string[]): readonly string[] {
  if (items.length === 0) return [];

  const matchedLabels = REQUIREMENT_THEMES.filter((theme) =>
    items.some((item) => theme.test(item)),
  ).map((theme) => theme.label);

  if (matchedLabels.length > 0) return matchedLabels;

  return mergeExactResponsibilities(items);
}

export function buildProjectBuilderStudioPlanSummary(
  selectedServiceIds: readonly ServiceId[],
  roadId: RouteMapRoadId,
): ProjectBuilderStudioPlanSummaryModel {
  const road = getRouteMapRoad(roadId);
  const routeLabel = road ? `${road.highwayLabel} · ${road.customerLabel}` : roadId;
  const totals = computePlanPricingTotals(selectedServiceIds, roadId);

  const deliverables: ProjectBuilderStudioPlanLineItem[] = [];
  const deliverableTimelines: ProjectBuilderStudioPlanTimelineItem[] = [];
  const timingRanges: BusinessDayRange[] = [];
  const responsibilityItems: string[] = [];

  for (const serviceId of selectedServiceIds) {
    const job = getRouteMapJob(serviceId);
    if (!job) continue;

    const presentation = resolveProjectBuilderJobPresentation(job, roadId);
    const lineItem = totals.lineItems.find((item) => item.serviceId === serviceId);
    const timingDisplay = resolveShortTimingDisplay(job.timingLabel);
    const parsedRange = parseBusinessDayRange(job.timingLabel);

    deliverables.push({
      serviceId,
      title: presentation.name,
      priceDisplay: lineItem?.priceDisplay ?? job.priceDisplay,
      scopeSummary: presentation.purpose,
    });
    deliverableTimelines.push({
      title: presentation.name,
      timingDisplay,
    });
    if (parsedRange) timingRanges.push(parsedRange);

    responsibilityItems.push(...presentation.clientResponsibilities);
  }

  return {
    routeLabel,
    deliverables,
    totalDisplay: formatUsdFromCents(totals.amountDueTodayCents),
    overallTimelineDisplay: computeOverallTimelineDisplay(timingRanges),
    deliverableTimelines,
    revisionPolicySummary: [...STUDIO_PLAN_REVISION_SUMMARY],
    revisionPolicyFull: [...ROUTE_MAP_REVISION_DRAWER_ITEMS],
    consolidatedRequirements: consolidateStudioPlanRequirements(responsibilityItems),
    canContinue: deliverables.length > 0,
    emptyMessage:
      deliverables.length > 0
        ? null
        : "Your Studio Plan is empty. Edit your project to add deliverables.",
  };
}
