import { describe, expect, it } from "vitest";

import { getRouteMapJob } from "@/config/route-map-v1";
import { expandDrawerTimelineItems } from "@/lib/project-builder-drawer-timing";
import { resolveProjectBuilderDrawerTagline } from "@/lib/project-builder-drawer-tagline";
import { expandScannableCopyItems } from "@/lib/project-builder-scannable-copy";

describe("expandScannableCopyItems", () => {
  it("splits semicolon-delimited deliverables into scan lines", () => {
    const items = expandScannableCopyItems([
      "One finished service sheet — up to 10 services; Print-ready PDF; One digital PNG or JPG",
    ]);
    expect(items.length).toBeGreaterThan(2);
    expect(items.some((item) => /Print-ready PDF/i.test(item))).toBe(true);
  });

  it("splits comma-separated exclusion lists into separate bullets", () => {
    const items = expandScannableCopyItems(["Brochures, catalogs, packages, websites, printing, or posting"], {
      splitCommas: true,
    });
    expect(items).toEqual(["Brochures", "catalogs", "packages", "websites", "printing", "posting"]);
  });
});

describe("expandDrawerTimelineItems", () => {
  it("returns scannable timeline bullets from catalog timing copy", () => {
    const job = getRouteMapJob("v2-rtu-service-sheet");
    expect(job).toBeDefined();
    if (!job) return;

    const items = expandDrawerTimelineItems(job.timingLabel);
    expect(items[0]).toMatch(/Estimated service turnaround: 2 to 3 business days/i);
    expect(items[1]).toMatch(/required materials/i);
    expect(items[2]).toMatch(/this service only/i);
    expect(items[3]).toMatch(/confirmed before payment/i);
  });
});

describe("resolveProjectBuilderDrawerTagline", () => {
  it("adds best-for context under the service title", () => {
    const job = getRouteMapJob("v2-rtu-service-sheet");
    expect(job).toBeDefined();
    if (!job) return;

    expect(resolveProjectBuilderDrawerTagline(job)).toMatch(/quickly understand everything they offer/i);
  });
});
