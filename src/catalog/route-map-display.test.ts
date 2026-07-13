import { describe, expect, it } from "vitest";

import { getActiveServices, getServiceById } from "@/catalog/accessors";
import {
  getCheckoutPriceDisplay,
  getCheckoutTimingLabel,
  getRouteMapIntakeTemplate,
  getRouteMapPriceDisplay,
  getRouteMapTurnaroundLabel,
} from "@/catalog/route-map-display";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import { buildRouteMapTimingLabel } from "@/catalog/route-map-shared-copy";
import type { ServiceId } from "@/catalog/types";

const MONTHLY_CYCLE_LABEL =
  "First batch 6–8 business days after direction/materials are complete; later batches follow the monthly production calendar.";

function legacyDiscoveryTimingLabel(
  service: NonNullable<ReturnType<typeof getServiceById>>,
): string {
  if (service.monthlyCycleWindow?.label) return service.monthlyCycleWindow.label;
  if (service.finalDeliveryWindow?.label) return service.finalDeliveryWindow.label;
  return service.firstReviewWindow.label;
}

describe("route-map-display accessors", () => {
  it("getCheckoutPriceDisplay matches derived pricing for active discovery services", () => {
    for (const service of getActiveServices()) {
      if (service.routeMapPriceDisplay) continue;
      expect(getCheckoutPriceDisplay(service)).toBe(getRouteMapPriceDisplay(service));
    }
  });

  it("getCheckoutPriceDisplay prefers routeMapPriceDisplay when seeded", () => {
    expect(getCheckoutPriceDisplay(getServiceById("rm-j002")!)).toBe("$99 / platform");
  });

  it("getCheckoutTimingLabel matches legacy discovery timing for active services without overrides", () => {
    for (const service of getActiveServices()) {
      if (service.routeMapTurnaroundLabel) continue;
      expect(getCheckoutTimingLabel(service)).toBe(legacyDiscoveryTimingLabel(service));
    }
  });

  it("getCheckoutTimingLabel preserves green foundation timing labels", () => {
    expect(getCheckoutTimingLabel(getServiceById("bf-001")!)).toBe("12–17 business days");
    expect(getCheckoutTimingLabel(getServiceById("sm-001")!)).toBe("12–17 business days");
    expect(getCheckoutTimingLabel(getServiceById("ma-001")!)).toBe("12–17 business days");
  });

  it("getCheckoutTimingLabel preserves monthly cycle copy for active monthly services", () => {
    expect(getCheckoutTimingLabel(getServiceById("sm-001-monthly")!)).toBe(MONTHLY_CYCLE_LABEL);
    expect(getCheckoutTimingLabel(getServiceById("em-001-monthly")!)).toBe(MONTHLY_CYCLE_LABEL);
  });

  it("getCheckoutTimingLabel matches Route Map seeded turnaround labels", () => {
    expect(getCheckoutTimingLabel(getServiceById("rm-j001")!)).toBe(
      getRouteMapTurnaroundLabel(getServiceById("rm-j001")!),
    );
    expect(getCheckoutTimingLabel(getServiceById("rm-j005")!)).toBe(
      buildRouteMapTimingLabel("within 5 business days"),
    );
  });

  it("buildServiceScopeSnapshot uses getCheckoutTimingLabel for approval snapshots", () => {
    const foundationIds = ["bf-001", "sm-001", "ma-001"] as const satisfies readonly ServiceId[];
    const lines = buildServiceScopeSnapshot(foundationIds);

    expect(lines.map((line) => line.timingWindowLabel)).toEqual([
      "12–17 business days",
      "12–17 business days",
      "12–17 business days",
    ]);
    expect(buildServiceScopeSnapshot(["sm-001-monthly"])[0].timingWindowLabel).toBe(
      MONTHLY_CYCLE_LABEL,
    );
  });

  it("returns per-platform price labels from catalog seeds", () => {
    const j002 = getServiceById("rm-j002");
    expect(j002).toBeDefined();
    expect(getRouteMapPriceDisplay(j002!)).toBe("$99 / platform");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j003")!)).toBe("$450 / platform");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j004")!)).toBe("$650 / platform");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j006")!)).toBe("$400 / platform");
  });

  it("formats standard shelf prices without override", () => {
    expect(getRouteMapPriceDisplay(getServiceById("rm-j008")!)).toBe("$99 / platform");
    expect(getRouteMapPriceDisplay(getServiceById("v2-rtu-flyer")!)).toBe("$69");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j005")!)).toBe("$349");
    expect(getRouteMapPriceDisplay(getServiceById("v2-rtu-email-kit")!)).toBe("$129");
    expect(getRouteMapPriceDisplay(getServiceById("v2-rtu-sms-kit")!)).toBe("$69");
    expect(getRouteMapPriceDisplay(getServiceById("v2-rtu-voice")!)).toBe("$79");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j007")!)).toBe("$69");
  });

  it("returns V1 turnaround labels from catalog seeds", () => {
    expect(getRouteMapTurnaroundLabel(getServiceById("rm-j001")!)).toBe(
      buildRouteMapTimingLabel("within 2 business days"),
    );
    expect(getRouteMapTurnaroundLabel(getServiceById("rm-j005")!)).toBe(
      buildRouteMapTimingLabel("within 5 business days"),
    );
    expect(getRouteMapTurnaroundLabel(getServiceById("rm-j007")!)).toBe(
      buildRouteMapTimingLabel("within 2 business days"),
    );
  });

  it("returns V2 turnaround labels from catalog seeds", () => {
    const flyer = getServiceById("v2-rtu-flyer");
    expect(flyer?.routeMapTurnaroundLabel?.toLowerCase()).toContain("2–3 business days");
    expect(getRouteMapTurnaroundLabel(flyer!)).toBe(flyer!.routeMapTurnaroundLabel);
  });

  it("returns intake template keys from catalog seeds", () => {
    expect(getRouteMapIntakeTemplate(getServiceById("rm-j001")!)).toBe("discovery");
    expect(getRouteMapIntakeTemplate(getServiceById("rm-j005")!)).toBe("page");
    expect(getRouteMapIntakeTemplate(getServiceById("v2-rtu-email-kit")!)).toBe("rtu-email-kit");
    expect(getRouteMapIntakeTemplate(getServiceById("v2-rtu-social-posts")!)).toBe("rtu-social-posts");
  });
});
