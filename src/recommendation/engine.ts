/**
 * Recommendation Engine — pure scoring against catalog discoveryMapping rules.
 * Catalog defines WHAT; this module decides WHICH services fit the discovery brief.
 */

import { getActiveServices } from "@/catalog/accessors";
import type {
  DiscoveryMappingRule,
  ServiceCatalogEntry,
  ServiceId,
} from "@/catalog/types";
import type {
  DeliverablesSummaryItem,
  DiscoveryBrief,
  DiscoveryFormTileId,
  MatchedDiscoveryRule,
  PricingSummary,
  RecommendationCatalogInput,
  RecommendationRationale,
  RecommendationResult,
  ServiceRecommendation,
} from "@/recommendation/types";
import { validateDiscoveryBrief } from "@/recommendation/validate";

export const RECOMMENDATION_ENGINE_VERSION = "0.1.0-scaffold";

const DEFAULT_RULE_WEIGHT = 1;

const SITUATION_TILE: DiscoveryFormTileId = "your-situation";
const CHALLENGE_TILE: DiscoveryFormTileId = "your-challenge";
const FOCUS_TILE: DiscoveryFormTileId = "your-focus";

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

function buildDeliverablesSummary(
  services: readonly ServiceCatalogEntry[],
): DeliverablesSummaryItem[] {
  return services.map((service) => ({
    serviceId: service.id,
    deliverables: service.deliverables,
    totalQuantity: service.deliverables.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

function buildPricingSummary(services: readonly ServiceCatalogEntry[]): PricingSummary {
  const items = services.map((service) => ({
    serviceId: service.id,
    display: service.pricing.display,
    amountUsd: service.pricing.amountUsd,
    billing: service.pricing.billing,
  }));

  return {
    items,
    totalAmountUsd: items.reduce((sum, item) => sum + item.amountUsd, 0),
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
  const scored = services
    .map((service) => {
      const { score, matchedRules } = scoreService(service, brief);
      return { serviceId: service.id, score, matchedRules, service };
    })
    .filter((entry) => entry.score > 0)
    .sort(compareRecommendations);

  const recommendations: ServiceRecommendation[] = scored.map((entry, index) => ({
    serviceId: entry.serviceId,
    score: entry.score,
    matchedRules: entry.matchedRules,
    rank: index + 1,
  }));

  const recommendedServices = scored.map((entry) => entry.service);
  const primaryServiceId = recommendations[0]?.serviceId ?? null;

  return {
    brief,
    recommendations,
    primaryServiceId,
    rationale: buildRationale(recommendations),
    deliverablesSummary: buildDeliverablesSummary(recommendedServices),
    pricingSummary: buildPricingSummary(recommendedServices),
    generatedAt: new Date().toISOString(),
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
  };
}
