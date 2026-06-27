/**
 * Recommendation Engine — pure scoring against catalog discoveryMapping rules.
 * Catalog defines WHAT; this module decides WHICH services fit the discovery brief.
 * Production allocation limits are enforced after scoring via central catalog config.
 *
 * Locked principle: Recommendation, Not Direction — docs/recommendation-not-direction-v1-locked.md
 * The Studio recommends. The client decides. This module returns suggestions only; it never forces purchase.
 */

import { getActiveServices, getServiceCatalog } from "@/catalog/accessors";
import {
  PRODUCTION_ALLOCATION_LIMITS,
} from "@/catalog/production-allocation";
import type {
  DiscoveryMappingRule,
  ServiceCatalogEntry,
  ServiceClass,
  ServiceId,
} from "@/catalog/types";
import type {
  DeliverablesSummaryItem,
  DiscoveryBrief,
  DiscoveryFormTileId,
  EstimatedInvestment,
  EstimatedTimeline,
  MatchedDiscoveryRule,
  RecommendationCatalogInput,
  RecommendationRationale,
  RecommendationReason,
  RecommendationResult,
  RecommendationWarning,
  ServiceRecommendation,
} from "@/recommendation/types";
import { validateDiscoveryBrief } from "@/recommendation/validate";

export const RECOMMENDATION_ENGINE_VERSION = "1.1.0";

const DEFAULT_RULE_WEIGHT = 1;
const LOW_CONFIDENCE_MAX_SCORE = 1;

const SITUATION_TILE: DiscoveryFormTileId = "your-situation";
const CHALLENGE_TILE: DiscoveryFormTileId = "your-challenge";
const FOCUS_TILE: DiscoveryFormTileId = "your-focus";

const KEY_DISCOVERY_TILES: readonly DiscoveryFormTileId[] = [
  SITUATION_TILE,
  CHALLENGE_TILE,
  FOCUS_TILE,
];

type ScoredService = {
  serviceId: ServiceId;
  score: number;
  matchedRules: MatchedDiscoveryRule[];
  service: ServiceCatalogEntry;
};

function tileAnswer(brief: DiscoveryBrief, tileId: DiscoveryFormTileId): string | undefined {
  return brief.answers[tileId]?.trim() || undefined;
}

function ruleRequiresTile(rule: DiscoveryMappingRule): DiscoveryFormTileId | undefined {
  return rule.tileId;
}

/**
 * Returns the matched value when a rule applies, otherwise null.
 * Deterministic — same brief + catalog always yields the same matches.
 */
export function matchDiscoveryRule(
  rule: DiscoveryMappingRule,
  brief: DiscoveryBrief,
): string | null {
  const requiredTile = ruleRequiresTile(rule);
  if (requiredTile && !tileAnswer(brief, requiredTile)) {
    return null;
  }

  switch (rule.signal) {
    case "need": {
      const needs = brief.selectedNeeds ?? [];
      return needs.some((need) => need === rule.value) ? rule.value : null;
    }
    case "situation": {
      const answer = tileAnswer(brief, SITUATION_TILE);
      return answer === rule.value ? answer : null;
    }
    case "challenge": {
      const answer = tileAnswer(brief, CHALLENGE_TILE);
      return answer === rule.value ? answer : null;
    }
    case "focus-keyword": {
      const focusTile = rule.tileId ?? FOCUS_TILE;
      const focus = tileAnswer(brief, focusTile)?.toLowerCase() ?? "";
      if (!focus) return null;
      const keyword = rule.value.toLowerCase();
      return focus.includes(keyword) ? rule.value : null;
    }
    default:
      return null;
  }
}

function scoreService(
  service: ServiceCatalogEntry,
  brief: DiscoveryBrief,
): { score: number; matchedRules: MatchedDiscoveryRule[] } {
  const matchedRules: MatchedDiscoveryRule[] = [];
  let score = 0;

  for (const rule of service.discoveryMapping) {
    const matchedValue = matchDiscoveryRule(rule, brief);
    if (matchedValue === null) continue;

    const weight = rule.weight ?? DEFAULT_RULE_WEIGHT;
    score += weight;
    matchedRules.push({ serviceId: service.id, rule, matchedValue });
  }

  return { score, matchedRules };
}

function compareRecommendations(
  a: { serviceId: ServiceId; score: number },
  b: { serviceId: ServiceId; score: number },
): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.serviceId.localeCompare(b.serviceId);
}

function buildReasons(matchedRules: readonly MatchedDiscoveryRule[]): RecommendationReason[] {
  return matchedRules.map((match) => {
    const weight = match.rule.weight ?? DEFAULT_RULE_WEIGHT;
    return {
      signal: match.rule.signal,
      value: match.matchedValue,
      weight,
      detail: `${match.rule.signal}="${match.matchedValue}" (+${weight})`,
    };
  });
}

function toServiceRecommendations(scored: readonly ScoredService[]): ServiceRecommendation[] {
  return scored.map((entry, index) => ({
    serviceId: entry.serviceId,
    score: entry.score,
    matchedRules: entry.matchedRules,
    reasons: buildReasons(entry.matchedRules),
    rank: index + 1,
  }));
}

function applyProductionAllocation(scored: readonly ScoredService[]): {
  included: ScoredService[];
  additional: ScoredService[];
} {
  const classCounts: Record<ServiceClass, number> = {
    signature: 0,
    core: 0,
    essential: 0,
  };
  const included: ScoredService[] = [];
  const additional: ScoredService[] = [];

  for (const entry of scored) {
    const serviceClass = entry.service.serviceClass;
    const limit = PRODUCTION_ALLOCATION_LIMITS[serviceClass];

    if (classCounts[serviceClass] < limit) {
      classCounts[serviceClass]++;
      included.push(entry);
    } else {
      additional.push(entry);
    }
  }

  return { included, additional };
}

function buildDeliverablesSummary(
  services: readonly ServiceCatalogEntry[],
): DeliverablesSummaryItem[] {
  return services
    .filter((service) => (service.deliverables?.length ?? 0) > 0)
    .map((service) => ({
      serviceId: service.id,
      deliverables: service.deliverables ?? [],
      totalQuantity: (service.deliverables ?? []).reduce((sum, item) => sum + item.quantity, 0),
    }));
}

function buildEstimatedInvestment(services: readonly ServiceCatalogEntry[]): EstimatedInvestment {
  const items = services
    .filter((service) => service.pricing !== undefined)
    .map((service) => ({
      serviceId: service.id,
      display: service.pricing!.display,
      amountUsd: service.pricing!.amountUsd,
      billing: service.pricing!.billing,
    }));

  return {
    items,
    totalAmountUsd: items.reduce((sum, item) => sum + item.amountUsd, 0),
    hasQuotedItems: items.some((item) => item.amountUsd === 0),
  };
}

function compareTimelineItems(
  a: { serviceId: ServiceId; businessDays: number },
  b: { serviceId: ServiceId; businessDays: number },
): number {
  if (b.businessDays !== a.businessDays) return b.businessDays - a.businessDays;
  return a.serviceId.localeCompare(b.serviceId);
}

function buildEstimatedTimeline(services: readonly ServiceCatalogEntry[]): EstimatedTimeline {
  const items = services
    .filter((service) => service.estimatedProductionTime !== undefined)
    .map((service) => ({
      serviceId: service.id,
      customerLabel: service.estimatedProductionTime!.customerLabel,
      businessDays: service.estimatedProductionTime!.businessDays,
    }))
    .sort(compareTimelineItems);

  const longest = items[0];
  const totalBusinessDays = longest?.businessDays ?? 0;

  return {
    items,
    totalBusinessDays,
    customerLabel: longest?.customerLabel ?? "",
  };
}

function buildRationale(
  recommendations: readonly ServiceRecommendation[],
): RecommendationRationale {
  const matchedSignals = recommendations.flatMap((rec) =>
    rec.matchedRules.map(
      (match) =>
        `${match.serviceId}:${match.rule.signal}=${match.matchedValue}(+${match.rule.weight ?? DEFAULT_RULE_WEIGHT})`,
    ),
  );

  if (recommendations.length === 0) {
    return {
      summary: "No catalog discovery rules matched the brief.",
      matchedSignals,
    };
  }

  const top = recommendations[0];
  return {
    summary: `Top recommendation ${top.serviceId} (score ${top.score}) from ${top.matchedRules.length} matched rule(s).`,
    matchedSignals,
  };
}

function buildMissingAnswerWarnings(brief: DiscoveryBrief): RecommendationWarning[] {
  const missingTiles = KEY_DISCOVERY_TILES.filter((tile) => !tileAnswer(brief, tile));
  if (missingTiles.length === 0) return [];

  const tileList = missingTiles.map((tile) => `"${tile}"`).join(", ");
  return [
    {
      kind: "missing-discovery-answer",
      message: `Discovery tile(s) ${tileList} have no answer — rule matches may be incomplete.`,
    },
  ];
}

function buildInactiveServiceWarnings(
  brief: DiscoveryBrief,
  catalog: readonly ServiceCatalogEntry[],
): RecommendationWarning[] {
  return catalog
    .filter((service) => service.status === "inactive")
    .map((service) => ({
      service,
      serviceId: service.id,
      ...scoreService(service, brief),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => compareRecommendations(a, b))
    .map(({ service, score }) => ({
      kind: "inactive-service-match" as const,
      message: `Inactive service "${service.id}" would score ${score} but is not offered.`,
      serviceId: service.id,
    }));
}

function buildDependencyWarnings(
  recommendedIds: ReadonlySet<ServiceId>,
  services: readonly ServiceCatalogEntry[],
): RecommendationWarning[] {
  const warnings: RecommendationWarning[] = [];

  for (const service of services) {
    for (const depId of service.dependencies) {
      if (!recommendedIds.has(depId)) {
        warnings.push({
          kind: "unmet-dependency",
          message: `"${service.id}" requires "${depId}" which is not in the recommendation set.`,
          serviceId: service.id,
        });
      }
    }
  }

  return warnings.sort((a, b) => {
    const serviceCompare = (a.serviceId ?? "").localeCompare(b.serviceId ?? "");
    if (serviceCompare !== 0) return serviceCompare;
    return a.message.localeCompare(b.message);
  });
}

function buildLowConfidenceWarning(
  recommendations: readonly ServiceRecommendation[],
): RecommendationWarning | null {
  if (recommendations.length === 0) return null;

  const top = recommendations[0];
  if (top.score <= LOW_CONFIDENCE_MAX_SCORE) {
    return {
      kind: "low-confidence-match",
      message: `Top recommendation "${top.serviceId}" has low score (${top.score}).`,
      serviceId: top.serviceId,
    };
  }

  const runnerUp = recommendations[1];
  if (runnerUp && runnerUp.score === top.score) {
    return {
      kind: "low-confidence-match",
      message: `Tie between "${top.serviceId}" and "${runnerUp.serviceId}" (score ${top.score}).`,
      serviceId: top.serviceId,
    };
  }

  return null;
}

function buildWarnings(
  brief: DiscoveryBrief,
  recommendations: readonly ServiceRecommendation[],
  includedServices: readonly ServiceCatalogEntry[],
  fullCatalog: readonly ServiceCatalogEntry[],
): RecommendationWarning[] {
  const warnings: RecommendationWarning[] = [
    ...buildMissingAnswerWarnings(brief),
    ...buildInactiveServiceWarnings(brief, fullCatalog),
    ...buildDependencyWarnings(
      new Set(includedServices.map((service) => service.id)),
      includedServices,
    ),
  ];

  const lowConfidence = buildLowConfidenceWarning(recommendations);
  if (lowConfidence) warnings.push(lowConfidence);

  return warnings.sort((a, b) => {
    const kindCompare = a.kind.localeCompare(b.kind);
    if (kindCompare !== 0) return kindCompare;
    return (a.serviceId ?? "").localeCompare(b.serviceId ?? "");
  });
}

function computeRequiresApproval(
  includedRecommendations: readonly ServiceRecommendation[],
  warnings: readonly RecommendationWarning[],
  investment: EstimatedInvestment,
): boolean {
  if (includedRecommendations.length === 0) return true;
  if (investment.hasQuotedItems) return true;

  return warnings.some(
    (warning) =>
      warning.kind === "unmet-dependency" ||
      warning.kind === "low-confidence-match",
  );
}

/**
 * Score discovery answers against catalog discoveryMapping rules and return a ranked result.
 * Uses active catalog services by default; pass `catalog` to override (e.g. tests).
 */
export function recommendFromDiscovery(
  brief: DiscoveryBrief,
  catalog?: RecommendationCatalogInput,
): RecommendationResult {
  validateDiscoveryBrief(brief);

  const services = catalog ?? getActiveServices();
  const fullCatalog = catalog ?? getServiceCatalog();

  const scored: ScoredService[] = services
    .map((service) => {
      const { score, matchedRules } = scoreService(service, brief);
      return { serviceId: service.id, score, matchedRules, service };
    })
    .filter((entry) => entry.score > 0)
    .sort(compareRecommendations);

  const recommendations = toServiceRecommendations(scored);
  const { included, additional } = applyProductionAllocation(scored);
  const includedRecommendations = toServiceRecommendations(included);
  const additionalStudioServices = toServiceRecommendations(additional);

  const includedServiceEntries = included.map((entry) => entry.service);
  const primaryServiceId = includedRecommendations[0]?.serviceId ?? null;
  const estimatedInvestment = buildEstimatedInvestment(includedServiceEntries);
  const estimatedTimeline = buildEstimatedTimeline(includedServiceEntries);
  const warnings = buildWarnings(brief, recommendations, includedServiceEntries, fullCatalog);

  return {
    brief,
    recommendations,
    includedRecommendations,
    additionalStudioServices,
    primaryServiceId,
    rationale: buildRationale(recommendations),
    deliverablesSummary: buildDeliverablesSummary(includedServiceEntries),
    estimatedInvestment,
    estimatedTimeline,
    warnings,
    requiresApproval: computeRequiresApproval(
      includedRecommendations,
      warnings,
      estimatedInvestment,
    ),
    generatedAt: new Date().toISOString(),
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
  };
}
