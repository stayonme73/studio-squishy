import { getDerivedServicePricing, getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import {
  CLIENT_ACCESS_BOILERPLATE,
  CLIENT_MATERIALS_BOILERPLATE,
  EXECUTION_MODE_LABELS,
} from "@/config/service-guide";
import type { ServiceGuideModel } from "@/service-guide/types";

function resolveTimingWindowLabel(service: NonNullable<ReturnType<typeof getServiceById>>): string {
  if (service.monthlyCycleWindow?.label) return service.monthlyCycleWindow.label;
  if (service.finalDeliveryWindow?.label) return service.finalDeliveryWindow.label;
  return service.firstReviewWindow.label;
}

function resolveParentSkuId(service: NonNullable<ReturnType<typeof getServiceById>>): ServiceId | undefined {
  if (!service.isExecutionAddOn) return undefined;
  const parentId = service.dependencies[0];
  return parentId ?? undefined;
}

/** Build customer-facing Service Guide content from catalog — no invented FAQ or scope. */
export function buildServiceGuide(serviceId: ServiceId): ServiceGuideModel | null {
  const service = getServiceById(serviceId);
  if (!service) return null;

  const pricing = getDerivedServicePricing(service.id);
  const parentSkuId = resolveParentSkuId(service);
  const parentService = parentSkuId ? getServiceById(parentSkuId) : undefined;

  return {
    skuId: service.id,
    serviceName: service.name,
    purpose: service.purpose,
    billingType: service.billingType,
    priceDisplay: pricing?.display ?? `$${service.priceCents / 100}`,
    exactPriceCents: service.priceCents,
    deliverables: service.deliverables,
    exclusions: service.exclusions,
    timingWindow: { label: resolveTimingWindowLabel(service) },
    revisionRule: service.revisionRule,
    clientResponsibilities: service.clientResponsibilities,
    executionResponsibility: EXECUTION_MODE_LABELS[service.executionMode],
    requiresClientAccess: service.requiresClientAccess,
    requiresClientMaterials: service.requiresClientMaterials,
    parentSkuId,
    parentFamilyId: service.eligibleParentFamilyIds?.[0],
    parentServiceName: parentService?.name,
    faq: service.serviceGuideFaq,
  };
}

export { CLIENT_ACCESS_BOILERPLATE, CLIENT_MATERIALS_BOILERPLATE };
