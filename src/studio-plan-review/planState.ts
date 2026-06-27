/**
 * Studio Plan Review — plan selection state and allocation rules.
 * Uses catalog production allocation — no duplicated limits in UI.
 */

import { getActiveServices, getServiceById } from "@/catalog/accessors";
import { PRODUCTION_ALLOCATION_LIMITS } from "@/catalog/production-allocation";
import { canAttachExecutionAddOn } from "@/catalog/validate";
import type { ServiceClass, ServiceId } from "@/catalog/types";

export type StudioPlanState = {
  selectedServiceIds: ServiceId[];
};

export type PlanAllocation = {
  includedServiceIds: ServiceId[];
  additionalServiceIds: ServiceId[];
};

export function initialPlanState(recommendedServiceIds: readonly ServiceId[]): StudioPlanState {
  return { selectedServiceIds: [...recommendedServiceIds] };
}

export function allocateSelectedServices(selectedIds: readonly ServiceId[]): PlanAllocation {
  const classCounts: Record<ServiceClass, number> = {
    signature: 0,
    core: 0,
    essential: 0,
  };
  const includedServiceIds: ServiceId[] = [];
  const additionalServiceIds: ServiceId[] = [];

  for (const serviceId of selectedIds) {
    const service = getServiceById(serviceId);
    if (!service) continue;

    const limit = PRODUCTION_ALLOCATION_LIMITS[service.serviceClass];
    if (classCounts[service.serviceClass] < limit) {
      classCounts[service.serviceClass]++;
      includedServiceIds.push(serviceId);
    } else {
      additionalServiceIds.push(serviceId);
    }
  }

  return { includedServiceIds, additionalServiceIds };
}

function pruneOrphanedExecutionAddOns(selectedIds: readonly ServiceId[]): ServiceId[] {
  const services = getActiveServices();
  return selectedIds.filter((id) => {
    const service = getServiceById(id);
    if (!service?.isExecutionAddOn) return true;
    return canAttachExecutionAddOn(id, selectedIds, services);
  });
}

export function removeServiceFromPlan(state: StudioPlanState, serviceId: ServiceId): StudioPlanState {
  const without = state.selectedServiceIds.filter((id) => id !== serviceId);
  return { selectedServiceIds: pruneOrphanedExecutionAddOns(without) };
}

export function addServiceToPlan(state: StudioPlanState, serviceId: ServiceId): StudioPlanState {
  if (state.selectedServiceIds.includes(serviceId)) return state;

  const service = getServiceById(serviceId);
  if (!service) return state;

  const activeServices = getActiveServices();

  if (service.isExecutionAddOn) {
    if (!canAttachExecutionAddOn(serviceId, state.selectedServiceIds, activeServices)) {
      return state;
    }
  } else if (!service.isAddable) {
    return state;
  }

  return { selectedServiceIds: [...state.selectedServiceIds, serviceId] };
}

export function canSwapServices(fromId: ServiceId, toId: ServiceId): boolean {
  const from = getServiceById(fromId);
  const to = getServiceById(toId);
  if (!from || !to) return false;
  return from.serviceClass === to.serviceClass;
}

export function swapServiceInPlan(
  state: StudioPlanState,
  fromId: ServiceId,
  toId: ServiceId,
): StudioPlanState {
  if (!canSwapServices(fromId, toId)) return state;
  if (state.selectedServiceIds.includes(toId)) return state;

  const swapped = state.selectedServiceIds.map((id) => (id === fromId ? toId : id));
  return { selectedServiceIds: pruneOrphanedExecutionAddOns(swapped) };
}

export function getSameClassSwapCandidates(
  serviceId: ServiceId,
  selectedIds: readonly ServiceId[],
): ServiceId[] {
  const service = getServiceById(serviceId);
  if (!service) return [];

  const selected = new Set(selectedIds);
  return getActiveServices()
    .filter(
      (candidate) =>
        candidate.serviceClass === service.serviceClass &&
        candidate.id !== serviceId &&
        !selected.has(candidate.id),
    )
    .map((candidate) => candidate.id);
}

export function getAvailableServicesToAdd(selectedIds: readonly ServiceId[]): ServiceId[] {
  const selected = new Set(selectedIds);
  const activeServices = getActiveServices();

  return activeServices
    .filter((service) => {
      if (selected.has(service.id)) return false;
      if (service.isExecutionAddOn) {
        return canAttachExecutionAddOn(service.id, selectedIds, activeServices);
      }
      return service.isAddable;
    })
    .map((service) => service.id);
}

/** Overflow-only additional cost (services beyond allocation limits) — backward compat. */
export function computeAdditionalCostUsd(additionalServiceIds: readonly ServiceId[]): {
  amountUsd: number;
  hasQuotedItems: boolean;
} {
  let amountUsd = 0;

  for (const serviceId of additionalServiceIds) {
    const pricing = getServiceById(serviceId)?.pricing;
    if (pricing) {
      amountUsd += pricing.amountUsd;
    }
  }

  return { amountUsd, hasQuotedItems: false };
}
