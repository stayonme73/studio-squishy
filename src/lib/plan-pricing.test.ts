import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { getCheckoutPriceDisplay, getCheckoutTimingLabel } from "@/catalog/route-map-display";
import type { ServiceId } from "@/catalog/types";

import { buildServiceScopeSnapshot } from "./plan-pricing";

describe("buildServiceScopeSnapshot", () => {
  it("copies catalog scope fields into immutable approved-plan line items", () => {
    const serviceIds = ["bf-001", "sm-001"] as const satisfies readonly ServiceId[];
    const lines = buildServiceScopeSnapshot(serviceIds);

    expect(lines).toHaveLength(2);

    for (const line of lines) {
      const catalog = getServiceById(line.skuId)!;
      expect(line.serviceName).toBe(catalog.name);
      expect(line.exactPriceCents).toBe(catalog.priceCents);
      expect(line.priceDisplay).toBe(getCheckoutPriceDisplay(catalog));
      expect(line.deliverables).toEqual([...catalog.deliverables]);
      expect(line.exclusions).toEqual([...catalog.exclusions]);
      expect(line.timingWindowLabel).toBe(getCheckoutTimingLabel(catalog));
      expect(line.revisionRule).toBe(catalog.revisionRule);
      expect(line.clientResponsibilities).toEqual([...catalog.clientResponsibilities]);
    }
  });

  it("freezes snapshot values independently of later catalog edits", () => {
    const lines = buildServiceScopeSnapshot(["bf-001"]);
    const frozen = lines[0]!;

    const mutatedCatalog = {
      ...getServiceById("bf-001")!,
      name: "Mutated Name",
      priceCents: 1,
      deliverables: ["Should not appear"],
      revisionRule: "99 rounds",
    };

    expect(frozen.serviceName).not.toBe(mutatedCatalog.name);
    expect(frozen.exactPriceCents).not.toBe(mutatedCatalog.priceCents);
    expect(frozen.deliverables).not.toEqual(mutatedCatalog.deliverables);
    expect(frozen.revisionRule).not.toBe(mutatedCatalog.revisionRule);
  });

  it("resolves legacy service IDs through compat aliases", () => {
    const lines = buildServiceScopeSnapshot(["bf-001" as ServiceId]);
    expect(lines[0]?.skuId).toBe("bf-001");
  });
});
