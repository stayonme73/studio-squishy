import { describe, expect, it } from "vitest";
import type { DiscoverySummaryServiceItem } from "@/discovery-summary";
import type { ServiceId } from "@/catalog/types";
import { filterConsiderNextServices } from "@/project-summary/filterConsiderNextServices";

function mockConsiderNext(serviceId: ServiceId): DiscoverySummaryServiceItem {
  return {
    serviceId,
    rank: 1,
    title: serviceId,
    explanation: "Test explanation",
    deliverables: [],
    investment: { display: "$0", amountUsd: 0, billing: "one-time" },
    timelineLabel: "Test timeline",
  };
}

describe("filterConsiderNextServices", () => {
  it("removes services already selected in the plan", () => {
    const services = [
      mockConsiderNext("em-001" as ServiceId),
      mockConsiderNext("cc-001" as ServiceId),
    ];
    const filtered = filterConsiderNextServices(services, ["em-001"] as ServiceId[]);
    expect(filtered.map((service) => service.serviceId)).toEqual(["cc-001"]);
  });

  it("returns empty when every consider-next service is in the plan", () => {
    const services = [mockConsiderNext("em-001" as ServiceId)];
    expect(filterConsiderNextServices(services, ["em-001"] as ServiceId[])).toEqual([]);
  });
});
