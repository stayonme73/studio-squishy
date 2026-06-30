import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan } from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";

import { KITCHEN_V1_SERVICE_ID } from "./types";

function lineSkuId(line: { skuId?: string; serviceId?: string }): ServiceId {
  return (line.skuId ?? line.serviceId!) as ServiceId;
}

/** Resolve stable deliverable keys from catalog deliveryMapping for a service line. */
export function resolveDeliverableKeysForService(serviceId: ServiceId): readonly string[] {
  const catalog = getServiceById(serviceId);
  const items = catalog?.deliveryMapping?.items;
  if (!items?.length) return [];
  return items.map((item) => item.key);
}

/** sm-001 line items in the frozen approved plan — first Kitchen V1 slice scope. */
export function resolveKitchenV1ServiceIds(plan: ApprovedStudioPlan): readonly ServiceId[] {
  return filterProductionPlanLineItems(plan)
    .map(lineSkuId)
    .filter((id): id is typeof KITCHEN_V1_SERVICE_ID => id === KITCHEN_V1_SERVICE_ID);
}

export function deliverableKeysForKitchenPlanLine(
  plan: ApprovedStudioPlan,
  serviceId: typeof KITCHEN_V1_SERVICE_ID,
): readonly string[] {
  const line = filterProductionPlanLineItems(plan).find((entry) => lineSkuId(entry) === serviceId);
  if (!line) return resolveDeliverableKeysForService(serviceId);
  const catalogKeys = resolveDeliverableKeysForService(serviceId);
  if (catalogKeys.length > 0) return catalogKeys;
  return line.deliverables.map((label, index) => `${serviceId}-scope-${index}`);
}
