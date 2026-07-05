import { describe, expect, it } from "vitest";

import { getActiveServices, getServiceById } from "@/catalog/accessors";
import {
  getCheckoutPriceDisplay,
  getRouteMapIntakeTemplate,
  getRouteMapPriceDisplay,
  getRouteMapTurnaroundLabel,
} from "@/catalog/route-map-display";

describe("route-map-display accessors", () => {
  it("getCheckoutPriceDisplay matches derived pricing for active discovery services", () => {
    for (const service of getActiveServices()) {
      if (service.routeMapPriceDisplay) continue;
      expect(getCheckoutPriceDisplay(service)).toBe(getRouteMapPriceDisplay(service));
    }
  });

  it("getCheckoutPriceDisplay prefers routeMapPriceDisplay when seeded", () => {
    expect(getCheckoutPriceDisplay(getServiceById("rm-j002")!)).toBe("$400 / platform");
  });

  it("returns per-platform price labels from catalog seeds", () => {
    const j002 = getServiceById("rm-j002");
    expect(j002).toBeDefined();
    expect(getRouteMapPriceDisplay(j002!)).toBe("$400 / platform");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j003")!)).toBe("$450 / platform");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j004")!)).toBe("$650 / platform");
    expect(getRouteMapPriceDisplay(getServiceById("rm-j006")!)).toBe("$400 / platform");
  });

  it("formats standard shelf prices without override", () => {
    expect(getRouteMapPriceDisplay(getServiceById("rm-j008")!)).toBe("$400");
    expect(getRouteMapPriceDisplay(getServiceById("v2-rtu-flyer")!)).toBe("$300");
  });

  it("returns V1 turnaround labels from catalog seeds", () => {
    expect(getRouteMapTurnaroundLabel(getServiceById("rm-j001")!)).toBe(
      "Route recommendation within 2 business days after intake is complete.",
    );
    expect(getRouteMapTurnaroundLabel(getServiceById("rm-j005")!)).toBe(
      "First draft within 5 business days after intake is complete.",
    );
    expect(getRouteMapTurnaroundLabel(getServiceById("rm-j007")!)).toBe(
      "First draft within 2 business days after intake is complete.",
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
