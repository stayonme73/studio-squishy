/**
 * Route Map customer-facing display accessors — read from unified Service Catalog.
 * Phase 3A: price labels, turnaround copy, intake template reference.
 */

import { deriveCompatibilityPricing } from "@/catalog/compat";
import type { RouteMapIntakeTemplateId } from "@/catalog/intake/types";
import type { StudioServiceEntry } from "@/catalog/types";

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Customer-facing Route Map price label — preserves per-platform overrides when seeded. */
export function getRouteMapPriceDisplay(service: StudioServiceEntry): string {
  if (service.routeMapPriceDisplay) {
    return service.routeMapPriceDisplay;
  }
  const derived = deriveCompatibilityPricing(service);
  if (derived?.display) {
    return derived.display;
  }
  if (service.priceCents > 0) {
    return formatUsd(service.priceCents);
  }
  return formatUsd(0);
}

/** Customer-facing Route Map turnaround / timing copy. */
export function getRouteMapTurnaroundLabel(service: StudioServiceEntry): string {
  if (service.routeMapTurnaroundLabel) {
    return service.routeMapTurnaroundLabel;
  }
  if (service.finalDeliveryWindow?.label) {
    return service.finalDeliveryWindow.label;
  }
  if (service.firstReviewWindow?.label) {
    return service.firstReviewWindow.label;
  }
  return "Timing varies by job.";
}

/** Intake form template key for this shelf SKU. */
export function getRouteMapIntakeTemplate(
  service: StudioServiceEntry,
): RouteMapIntakeTemplateId | undefined {
  return service.intakeTemplate;
}
