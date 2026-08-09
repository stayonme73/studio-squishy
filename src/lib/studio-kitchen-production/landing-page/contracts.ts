/**
 * Authoritative rm-j005 contract projection for Kitchen landing-page production.
 * Source: src/catalog/route-map-launch.ts + sku-overrides.ts
 */

import { getServiceById } from "@/catalog";
import { getSkuOverride } from "../sku-overrides";
import { LANDING_PAGE_SKU } from "./types";

export function loadAuthoritativeRmJ005Contract(): {
  skuId: typeof LANDING_PAGE_SKU;
  serviceName: string;
  purpose: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  revisionRule: string;
  clientResponsibilities: readonly string[];
  priceCents: number;
  intakeTemplate: "page";
  productionReadiness: string;
  productionReadinessNotes: string;
  primaryToolId: string;
  formPromised: boolean;
  customDomainPromised: boolean;
  discrepancies: readonly string[];
} {
  const service = getServiceById(LANDING_PAGE_SKU);
  if (!service) {
    throw new Error("rm-j005 missing from catalog — cannot invent contract");
  }
  const override = getSkuOverride(LANDING_PAGE_SKU);
  const deliverables = service.deliverables ?? [];
  const formPromised = deliverables.some((d) =>
    /basic contact form/i.test(d),
  );
  // Form is conditional ("only if supported") — structure does not promise an always-on form.
  const formAlwaysRequired = false;
  const customDomainPromised = deliverables.some((d) =>
    /custom domain/i.test(d),
  );

  const discrepancies: string[] = [];
  // Catalog allows optional basic form only if structure supports it — we do not invent a form.
  if (formPromised && !formAlwaysRequired) {
    discrepancies.push(
      "Catalog allows one approved basic contact form only if supported by existing Studio structure — structure previously absent; this package uses link-based CTA (tel/https) without inventing a form.",
    );
  }
  if (!customDomainPromised) {
    // Not a discrepancy — documenting boundary.
  }

  return {
    skuId: LANDING_PAGE_SKU,
    serviceName: service.name,
    purpose: service.purpose ?? "",
    deliverables,
    exclusions: service.exclusions ?? [],
    revisionRule: service.revisionRule ?? "",
    clientResponsibilities: service.clientResponsibilities ?? [],
    priceCents: service.priceCents ?? 0,
    intakeTemplate: "page",
    productionReadiness: override?.readiness ?? "partial",
    productionReadinessNotes: override?.readinessNotes ?? "",
    primaryToolId: override?.primaryTool?.toolId ?? "studio_landing_page_structure",
    formPromised: formAlwaysRequired,
    customDomainPromised,
    discrepancies,
  };
}
