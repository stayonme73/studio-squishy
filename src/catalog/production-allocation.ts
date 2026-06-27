/**
 * Production Allocation Rules — central business configuration.
 * Limits, service-class mapping, substitution rules, and customer-facing section labels.
 * Do not duplicate these values in UI components.
 */

import type { ServiceClass, ServiceId } from "@/catalog/types";

/** Maximum automatically included services per internal service class. */
export const SIGNATURE_MAX_INCLUDED = 1 as const;
export const CORE_MAX_INCLUDED = 2 as const;
export const ESSENTIAL_MAX_INCLUDED = 4 as const;

export const PRODUCTION_ALLOCATION_LIMITS: Readonly<Record<ServiceClass, number>> = {
  signature: SIGNATURE_MAX_INCLUDED,
  core: CORE_MAX_INCLUDED,
  essential: ESSENTIAL_MAX_INCLUDED,
};

/** Locked V1 service class assignments — keyed by catalog service ID. */
export const SERVICE_CLASS_BY_ID: Readonly<Partial<Record<ServiceId, ServiceClass>>> = {
  "bf-001": "signature",
  "bf-002": "signature",
  "cp-001": "signature",
  "sm-001": "signature",
  "cc-001": "signature",
  "vp-001": "signature",
  "lp-001": "signature",
  "em-001": "core",
  "sms-001": "core",
  "cc-002": "core",
  "ap-001": "core",
  "mo-001": "core",
  "ma-001": "essential",
};

export type SubstitutionSwapKind = "same-class" | "upgrade" | "downgrade";

/** Whether a service swap requires a price change per locked substitution rules. */
export function classifyServiceSubstitution(
  fromClass: ServiceClass,
  toClass: ServiceClass,
): SubstitutionSwapKind {
  if (fromClass === toClass) return "same-class";

  const classRank: Record<ServiceClass, number> = {
    essential: 0,
    core: 1,
    signature: 2,
  };

  return classRank[toClass] > classRank[fromClass] ? "upgrade" : "downgrade";
}

export function substitutionRequiresUpgrade(fromClass: ServiceClass, toClass: ServiceClass): boolean {
  return classifyServiceSubstitution(fromClass, toClass) === "upgrade";
}

/** True when adding a service beyond the included allocation limits. */
export function addingBeyondIncludedAllocation(
  currentIncludedCount: number,
  classLimit: number,
): boolean {
  return currentIncludedCount >= classLimit;
}

/** Customer-facing section labels — for Discovery Summary view model, not raw UI copy. */
export const CUSTOMER_SECTION_LABELS = {
  includedRecommendations: "Recommended Studio Services",
  additionalStudioServices: "Additional Studio Services Available",
  addToPlan: "Add to My Studio Plan",
  replaceService: "Replace This Service",
  reviewPlan: "Review My Studio Plan",
} as const;

export type CustomerSectionLabels = typeof CUSTOMER_SECTION_LABELS;
