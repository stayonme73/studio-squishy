import { describe, expect, it } from "vitest";

import { getRouteMapJob } from "@/config/route-map-v1";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import {
  resolveProjectBuilderJobPresentation,
  resolveRouteMapServiceDisplayName,
} from "@/lib/project-builder-update-exit-copy";

describe("project-builder update exit copy", () => {
  it("shows Update titles on the Update Exit only", () => {
    const flyer = getRouteMapJob("v2-rtu-flyer");
    expect(flyer).toBeDefined();
    if (!flyer) return;

    expect(resolveRouteMapServiceDisplayName("v2-rtu-flyer", "update")).toBe("Update My Flyer");
    expect(resolveRouteMapServiceDisplayName("v2-rtu-flyer", "i75")).toBe("Make Me a Flyer");
    expect(resolveProjectBuilderJobPresentation(flyer, "update").name).toBe("Update My Flyer");
    expect(resolveProjectBuilderJobPresentation(flyer, "i75").name).toBe("Make Me a Flyer");
  });

  it("uses update doctrine copy in Learn More panels on the Update Exit", () => {
    const flyer = getRouteMapJob("v2-rtu-flyer");
    expect(flyer).toBeDefined();
    if (!flyer) return;

    const presentation = resolveProjectBuilderJobPresentation(flyer, "update");
    expect(presentation.tagline).toMatch(/existing flyer/i);
    expect(presentation.drawerPurpose).toMatch(/preserving the existing design direction/i);
    expect(presentation.deliverables).toContain("Print-ready PDF");
    expect(presentation.exclusions).toContain("Complete redesign");
    expect(presentation.exclusions).not.toContain(
      "Additional pages, sizes, versions, posts, or graphics",
    );
    expect(presentation.clientResponsibilities[0]).toMatch(/existing flyer/i);
  });

  it("keeps creation-oriented catalog copy on non-update routes", () => {
    const flyer = getRouteMapJob("v2-rtu-flyer");
    expect(flyer).toBeDefined();
    if (!flyer) return;

    const presentation = resolveProjectBuilderJobPresentation(flyer, "i75");
    expect(presentation.name).toBe("Make Me a Flyer");
    expect(presentation.deliverables.some((item) => /finished/i.test(item))).toBe(true);
  });

  it("snapshots update scope into approved plan line items on the Update Exit", () => {
    const [line] = buildServiceScopeSnapshot(["v2-rtu-flyer"], "update");
    expect(line?.serviceName).toBe("Update My Flyer");
    expect(line?.deliverables.some((item) => /existing single-sided flyer/i.test(item))).toBe(true);
    expect(line?.exclusions).toContain("New flyer concept");
    expect(line?.clientResponsibilities.some((item) => /existing flyer/i.test(item))).toBe(true);
    expect(line?.deliverables.some((item) => /One finished single-sided flyer design/i.test(item))).toBe(
      false,
    );
  });

  it("applies update doctrine to rm-j007 and rm-j008 on the Update Exit only", () => {
    const promotion = getRouteMapJob("rm-j007");
    const profile = getRouteMapJob("rm-j008");
    expect(promotion).toBeDefined();
    expect(profile).toBeDefined();
    if (!promotion || !profile) return;

    expect(resolveProjectBuilderJobPresentation(promotion, "update").tagline).toMatch(
      /existing promotional item/i,
    );
    expect(resolveProjectBuilderJobPresentation(profile, "update").drawerPurpose).toMatch(
      /Social Profile Update Kit|existing platform profile/i,
    );
    expect(resolveProjectBuilderJobPresentation(promotion, "i20").purpose).toBe(promotion.purpose);
  });
});
