import { describe, expect, it } from "vitest";

import {
  resolveSquishyRouteMapMessage,
  SQUISHY_ROUTE_MAP_COPY,
  SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY,
  type SquishyRouteMapMessageKey,
  type SquishyRouteMapSnapshot,
} from "@/lib/route-map-squishy";
import type { ServiceId } from "@/catalog/types";

const FLYER = "v2-rtu-flyer" as ServiceId;
const SOCIAL = "v2-rtu-social-posts" as ServiceId;

function snapshot(overrides: Partial<SquishyRouteMapSnapshot> = {}): SquishyRouteMapSnapshot {
  return {
    step: "panel",
    previousStep: "map",
    selectedServiceIds: [],
    previousSelectedServiceIds: [],
    selectedJobId: null,
    justRestored: false,
    hasGreeted: false,
    ...overrides,
  };
}

describe("resolveSquishyRouteMapMessage", () => {
  it("greets on first arrival — leaving map with nothing selected and no prior greeting", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({ previousStep: "map", step: "panel", selectedServiceIds: [], hasGreeted: false }),
    );
    expect(result).toEqual({ key: "first-arrival", text: SQUISHY_ROUTE_MAP_COPY["first-arrival"] });
  });

  it("does not greet again once already greeted", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({ previousStep: "map", step: "panel", selectedServiceIds: [], hasGreeted: true }),
    );
    expect(result).toBeNull();
  });

  it("does not greet when leaving map with an existing plan", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "map",
        step: "panel",
        selectedServiceIds: [FLYER],
        previousSelectedServiceIds: [FLYER],
        hasGreeted: false,
      }),
    );
    expect(result).toBeNull();
  });

  it("announces a successful addition via the job-detail CTA (list gains a service, step also changes)", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "job",
        step: "studio-plan",
        previousSelectedServiceIds: [],
        selectedServiceIds: [FLYER],
      }),
    );
    expect(result).toEqual({ key: "service-added", text: SQUISHY_ROUTE_MAP_COPY["service-added"] });
  });

  it("announces a successful addition made directly from the Studio Plan menu (no step change at all)", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "studio-plan",
        step: "studio-plan",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [FLYER, SOCIAL],
      }),
    );
    expect(result).toEqual({ key: "service-added", text: SQUISHY_ROUTE_MAP_COPY["service-added"] });
  });

  it("does not announce an addition when the screen changes to Studio Plan but the list did not grow", () => {
    // e.g. backing out of checkout to Studio Plan with the same selection already approved.
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "checkout",
        step: "studio-plan",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [FLYER],
      }),
    );
    expect(result).toBeNull();
  });

  it("announces an already-added service when its job detail opens — no click required", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "panel",
        step: "job",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [FLYER],
        selectedJobId: FLYER,
      }),
    );
    expect(result).toEqual({ key: "already-added", text: SQUISHY_ROUTE_MAP_COPY["already-added"] });
  });

  it("stays silent when viewing a job detail for a service not yet added", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "panel",
        step: "job",
        previousSelectedServiceIds: [],
        selectedServiceIds: [],
        selectedJobId: FLYER,
      }),
    );
    expect(result).toBeNull();
  });

  it("announces return to browsing after leaving job detail with a saved plan", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "job",
        step: "panel",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [FLYER],
      }),
    );
    expect(result).toEqual({
      key: "return-to-browsing",
      text: SQUISHY_ROUTE_MAP_COPY["return-to-browsing"],
    });
  });

  it("announces return to browsing after leaving Studio Plan with a saved plan", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "studio-plan",
        step: "map",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [FLYER],
      }),
    );
    expect(result).toEqual({
      key: "return-to-browsing",
      text: SQUISHY_ROUTE_MAP_COPY["return-to-browsing"],
    });
  });

  it("stays silent returning to browsing with nothing in the plan", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "job",
        step: "panel",
        previousSelectedServiceIds: [],
        selectedServiceIds: [],
      }),
    );
    expect(result).toBeNull();
  });

  it("announces an empty plan when the last service is removed", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "studio-plan",
        step: "studio-plan",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [],
      }),
    );
    expect(result).toEqual({ key: "empty-plan", text: SQUISHY_ROUTE_MAP_COPY["empty-plan"] });
  });

  it("announces a restored journey with services using the restored-plan copy", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "map",
        step: "studio-plan",
        previousSelectedServiceIds: [],
        selectedServiceIds: [FLYER],
        justRestored: true,
        hasGreeted: false,
      }),
    );
    expect(result).toEqual({ key: "restored-journey", text: SQUISHY_ROUTE_MAP_COPY["restored-journey"] });
  });

  it("announces a restored journey with no services using the restored-empty copy", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "map",
        step: "studio-plan",
        previousSelectedServiceIds: [],
        selectedServiceIds: [],
        justRestored: true,
        hasGreeted: false,
      }),
    );
    expect(result).toEqual({ key: "restored-journey", text: SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY });
  });

  it("restored journey outranks first-arrival logic", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "map",
        step: "panel",
        previousSelectedServiceIds: [],
        selectedServiceIds: [],
        justRestored: true,
        hasGreeted: false,
      }),
    );
    expect(result?.key).toBe("restored-journey");
    expect(result?.text).toBe(SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY);
  });

  it("restored journey outranks ordinary empty-plan logic", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "studio-plan",
        step: "studio-plan",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [],
        justRestored: true,
        hasGreeted: true,
      }),
    );
    expect(result).toEqual({ key: "restored-journey", text: SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY });
  });

  it("keeps the six-trigger model unchanged", () => {
    const keys = Object.keys(SQUISHY_ROUTE_MAP_COPY) as SquishyRouteMapMessageKey[];
    expect(keys).toHaveLength(6);
    expect(keys.sort()).toEqual(
      [
        "already-added",
        "empty-plan",
        "first-arrival",
        "restored-journey",
        "return-to-browsing",
        "service-added",
      ].sort(),
    );
  });

  it("stays silent during ordinary browsing (new step, no matching transition)", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "panel",
        step: "job",
        previousSelectedServiceIds: [],
        selectedServiceIds: [],
        selectedJobId: SOCIAL,
      }),
    );
    expect(result).toBeNull();
  });

  it("treats a swap as a service addition, since the list gains a new member (documented simplification)", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "studio-plan",
        step: "studio-plan",
        previousSelectedServiceIds: [FLYER],
        selectedServiceIds: [SOCIAL],
      }),
    );
    // A swap removes FLYER and adds SOCIAL in the same update — the list still "gains" SOCIAL,
    // which is an intentional, acceptable simplification: a swap is still a plan-composition
    // change worth narrating, not a pricing tick.
    expect(result).toEqual({ key: "service-added", text: SQUISHY_ROUTE_MAP_COPY["service-added"] });
  });

  it("stays silent for a removal that leaves the plan valid and unchanged in size", () => {
    const result = resolveSquishyRouteMapMessage(
      snapshot({
        previousStep: "studio-plan",
        step: "studio-plan",
        previousSelectedServiceIds: [FLYER, SOCIAL],
        selectedServiceIds: [FLYER],
      }),
    );
    expect(result).toBeNull();
  });

  it("has no representation of sync status in its snapshot shape or output — sync failure is never a trigger", () => {
    const allKeys = Object.values(SQUISHY_ROUTE_MAP_COPY);
    expect(allKeys.some((text) => /sync/i.test(text))).toBe(false);
    expect(SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY).not.toMatch(/sync/i);
  });

  it("has no free-text message override — output text always comes from approved copy constants", () => {
    const approvedTexts = new Set([
      ...Object.values(SQUISHY_ROUTE_MAP_COPY),
      SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY,
    ]);

    const scenarios: Partial<SquishyRouteMapSnapshot>[] = [
      { previousStep: "map", step: "panel", selectedServiceIds: [], hasGreeted: false },
      { previousStep: "job", step: "studio-plan", previousSelectedServiceIds: [], selectedServiceIds: [FLYER] },
      { previousStep: "panel", step: "job", selectedServiceIds: [FLYER], selectedJobId: FLYER },
      { previousStep: "job", step: "panel", selectedServiceIds: [FLYER] },
      { previousStep: "studio-plan", step: "studio-plan", previousSelectedServiceIds: [FLYER], selectedServiceIds: [] },
      { justRestored: true, selectedServiceIds: [FLYER] },
      { justRestored: true, selectedServiceIds: [] },
    ];

    for (const overrides of scenarios) {
      const result = resolveSquishyRouteMapMessage(snapshot(overrides));
      if (result !== null) {
        expect(approvedTexts.has(result.text)).toBe(true);
      }
    }
  });
});
