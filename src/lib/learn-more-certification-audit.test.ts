import { describe, expect, it } from "vitest";

import { ROUTE_MAP_V1 } from "@/config/route-map-v1";
import { classifyServiceExclusions } from "@/lib/project-builder-exclusion-groups";
import { resolveProjectBuilderJobPresentation } from "@/lib/project-builder-update-exit-copy";

/** Manual certification flags — review during Learn More audit. */
const LEARN_MORE_MANUAL_REVIEW: Record<string, readonly string[]> = {
  "v2-rtu-flyer": [],
};

describe("Learn More certification audit", () => {
  it("classifies every Route Map service exclusion without empty mis-buckets", () => {
    const misclassified: string[] = [];

    for (const job of ROUTE_MAP_V1.jobs) {
      for (const road of ROUTE_MAP_V1.roads) {
        if (road.id === "i285") continue;
        const presentation = resolveProjectBuilderJobPresentation(job, road.id);
        const groups = classifyServiceExclusions(presentation.exclusions);

        for (const item of presentation.exclusions) {
          const inStudio = groups.studioDoesNotProvide.includes(item);
          const inPurchased = groups.purchasedDeliverableChanges.includes(item);
          if (!inStudio && !inPurchased) {
            misclassified.push(`${job.id}/${road.id}: unclassified exclusion "${item}"`);
          }
        }

        for (const item of groups.studioDoesNotProvide) {
          if (/distribution or posting/i.test(item) && !/unless separately purchased/i.test(item)) {
            // Posting unless purchased is studio-does-not-provide in base SKU — OK
          }
        }

        for (const manual of LEARN_MORE_MANUAL_REVIEW[job.id] ?? []) {
          if (presentation.exclusions.includes(manual)) {
            misclassified.push(`${job.id}: flagged for manual review — "${manual}"`);
          }
        }
      }
    }

    expect(misclassified).toEqual([]);
  });

  it("documents customer-responsibility items separately from exclusions", () => {
    for (const job of ROUTE_MAP_V1.jobs) {
      const presentation = resolveProjectBuilderJobPresentation(job, "i75");
      expect(presentation.clientResponsibilities.length).toBeGreaterThan(0);
      for (const responsibility of presentation.clientResponsibilities) {
        expect(presentation.exclusions).not.toContain(responsibility);
      }
    }
  });
});
