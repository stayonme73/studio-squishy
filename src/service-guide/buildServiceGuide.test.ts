import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import { buildServiceGuide } from "@/service-guide/buildServiceGuide";

describe("buildServiceGuide", () => {
  it("builds one-time service guide from catalog", () => {
    const guide = buildServiceGuide("bf-001");
    expect(guide).not.toBeNull();
    expect(guide!.skuId).toBe("bf-001");
    expect(guide!.serviceName).toBe(getServiceById("bf-001")!.name);
    expect(guide!.billingType).toBe("one_time");
    expect(guide!.exactPriceCents).toBe(49500);
    expect(guide!.deliverables.length).toBeGreaterThan(0);
    expect(guide!.exclusions.length).toBeGreaterThan(0);
    expect(guide!.timingWindow.label).toBeTruthy();
    expect(guide!.revisionRule).toBeTruthy();
    expect(guide!.clientResponsibilities.length).toBeGreaterThan(0);
    expect(guide!.executionResponsibility).toContain("creates and delivers");
  });

  it("builds monthly service guide with monthly cycle timing", () => {
    const guide = buildServiceGuide("sm-001-monthly");
    expect(guide).not.toBeNull();
    expect(guide!.billingType).toBe("monthly");
    expect(guide!.priceDisplay.toLowerCase()).toContain("month");
    expect(guide!.timingWindow.label).toBeTruthy();
  });

  it("includes parent SKU for execution add-on", () => {
    const guide = buildServiceGuide("social_media-execution");
    expect(guide).not.toBeNull();
    expect(guide!.parentSkuId).toBe("sm-001");
    expect(guide!.parentServiceName).toBe(getServiceById("sm-001")!.name);
    expect(guide!.executionResponsibility).toContain("schedules and publishes");
  });

  it("hides FAQ section when catalog has none", () => {
    const guide = buildServiceGuide("bf-001");
    expect(guide!.faq).toEqual([]);
  });

  it("returns null for unknown service id", () => {
    expect(buildServiceGuide("not-a-service" as ServiceId)).toBeNull();
  });
});
