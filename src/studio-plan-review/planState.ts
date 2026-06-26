/**
 * Studio Plan Review — plan selection state and allocation rules.
 * Uses catalog production allocation — no duplicated limits in UI.
 */

import { getActiveServices, getServiceById } from "@/catalog/accessors";
import { PRODUCTION_ALLOCATION_LIMITS } from "@/catalog/production-allocation";
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

export function removeServiceFromPlan(state: StudioPlanState, serviceId: ServiceId): StudioPlanState {
  return {
    selectedServiceIds: state.selectedServiceIds.filter((id) => id !== serviceId),
  };
}

export function addServiceToPlan(state: StudioPlanState, serviceId: ServiceId): StudioPlanState {
  if (state.selectedServiceIds.includes(serviceId)) return state;
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
  return {
    selectedServiceIds: state.selectedServiceIds.map((id) => (id === fromId ? toId : id)),
  };
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
  return getActiveServices()
    .filter((service) => !selected.has(service.id))
    .map((service) => service.id);
}

export function computeAdditionalCostUsd(additionalServiceIds: readonly ServiceId[]): {
  amountUsd: number;
  hasQuotedItems: boolean;
} {
  let amountUsd = 0;
  let hasQuotedItems = false;

  for (const serviceId of additionalServiceIds) {
    const service = getServiceById(serviceId);
    const pricing = service?.pricing;
    if (!pricing) {
      hasQuotedItems = true;
      continue;
    }
    if (pricing.amountUsd === 0) {
      hasQuotedItems = true;
    }
    amountUsd += pricing.amountUsd;
  }

  return { amountUsd, hasQuotedItems };
}
