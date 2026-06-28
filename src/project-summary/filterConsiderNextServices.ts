import type { DiscoverySummaryServiceItem } from "@/discovery-summary";
import type { ServiceId } from "@/catalog/types";

/** Hero Consider Next — hide services the client already added to their plan. */
export function filterConsiderNextServices(
  considerNextServices: readonly DiscoverySummaryServiceItem[],
  selectedServiceIds: readonly ServiceId[],
): readonly DiscoverySummaryServiceItem[] {
  const selected = new Set(selectedServiceIds);
  return considerNextServices.filter((service) => !selected.has(service.serviceId));
}
