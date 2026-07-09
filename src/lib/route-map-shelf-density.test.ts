import { describe, expect, it } from "vitest";

import {
  getRouteMapJobDetailDensity,
  getRouteMapShelfDensity,
  ROUTE_MAP_CHECKOUT_OVERLAY_DENSITY,
  ROUTE_MAP_JOB_DETAIL_DENSITY,
  ROUTE_MAP_OVERLAY_DENSITY,
  ROUTE_MAP_SHELF_DENSITY_DENSE,
  ROUTE_MAP_SHELF_DENSITY_MIN,
  ROUTE_MAP_SHELF_DENSITY_STANDARD,
} from "@/lib/route-map-shelf-density";

describe("Route Map overlay density constants", () => {
  it("locks shelves baseline at 80% and checkout at 67%", () => {
    expect(ROUTE_MAP_OVERLAY_DENSITY).toBe(0.8);
    expect(ROUTE_MAP_CHECKOUT_OVERLAY_DENSITY).toBe(0.67);
  });

  it("caps 3-row shelves below 80% so I-75 and Update Exit are not oversized", () => {
    expect(ROUTE_MAP_SHELF_DENSITY_STANDARD).toBe(0.74);
    expect(getRouteMapShelfDensity(9, 3, 900)).toBe(0.74);
    expect(getRouteMapShelfDensity(7, 3, 900)).toBe(0.74);
  });

  it("scales 4-row shelves down so I-20 fits without scroll at 900px", () => {
    expect(ROUTE_MAP_SHELF_DENSITY_DENSE).toBe(0.68);
    const density = getRouteMapShelfDensity(11, 3, 900);
    expect(density).toBeLessThanOrEqual(0.68);
    expect(density).toBeGreaterThanOrEqual(ROUTE_MAP_SHELF_DENSITY_MIN);
  });

  it("scales 5-row Launch Job Shelf down further on the same viewport", () => {
    const launchDensity = getRouteMapShelfDensity(13, 3, 900);
    const i20Density = getRouteMapShelfDensity(11, 3, 900);
    expect(launchDensity).toBeLessThanOrEqual(i20Density);
    expect(launchDensity).toBeGreaterThanOrEqual(ROUTE_MAP_SHELF_DENSITY_MIN);
  });

  it("respects shorter laptop viewports", () => {
    const laptop = getRouteMapShelfDensity(13, 3, 768);
    const desktop = getRouteMapShelfDensity(13, 3, 900);
    expect(laptop).toBeLessThanOrEqual(desktop);
  });

  it("locks job detail overlay to 74% for typical jobs", () => {
    expect(ROUTE_MAP_JOB_DETAIL_DENSITY).toBe(0.74);
    expect(getRouteMapJobDetailDensity(2, 2)).toBe(0.74);
    expect(getRouteMapJobDetailDensity(5, 4)).toBe(0.71);
    expect(getRouteMapJobDetailDensity(6, 5)).toBe(0.68);
  });
});
