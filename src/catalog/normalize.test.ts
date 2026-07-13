import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { normalizeStudioServiceEntry } from "@/catalog/normalize";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";

describe("normalizeStudioServiceEntry", () => {
  it("stamps schema v3 and derives reviewType for representative SKUs", () => {
    const retiredRouteStart = normalizeStudioServiceEntry(getServiceById("rm-j001")!);
    expect(retiredRouteStart.schemaVersion).toBe(CATALOG_SCHEMA_VERSION);
    expect(retiredRouteStart.reviewType).toBe("no_review");

    const rtu = normalizeStudioServiceEntry(getServiceById("v2-rtu-flyer")!);
    expect(rtu.reviewType).toBe("ready_to_use_handoff");

    const retired = normalizeStudioServiceEntry(getServiceById("spark")!);
    expect(retired.reviewType).toBe("no_review");
  });

  it("derives deliveryPackage by service class", () => {
    expect(normalizeStudioServiceEntry(getServiceById("rm-j001")!).deliveryPackage).toBe(
      "advisory_recommendation",
    );
    expect(normalizeStudioServiceEntry(getServiceById("v2-rtu-flyer")!).deliveryPackage).toBe(
      "ready_to_use_files",
    );
    expect(
      normalizeStudioServiceEntry(getServiceById("social_media-execution")!).deliveryPackage,
    ).toBe("execution_handoff");
  });

  it("derives pricingDisplayType including per-platform Route Map jobs", () => {
    expect(normalizeStudioServiceEntry(getServiceById("rm-j002")!).pricingDisplayType).toBe(
      "per_platform",
    );
    expect(normalizeStudioServiceEntry(getServiceById("spark")!).pricingDisplayType).toBe(
      "bundle_package",
    );
    expect(normalizeStudioServiceEntry(getServiceById("sm-001-monthly")!).pricingDisplayType).toBe(
      "per_month",
    );
  });

  it("derives qaChecklist and aiPromptRef without mutating seed prices", () => {
    const before = getServiceById("bf-001")!;
    const normalized = normalizeStudioServiceEntry(before);

    expect(normalized.priceCents).toBe(before.priceCents);
    expect(normalized.id).toBe(before.id);
    expect(normalized.qaChecklist?.templateKey).toBeTruthy();
    expect(normalized.qaChecklist?.items.length).toBeGreaterThan(0);
    expect(normalized.aiPromptRef?.templateKey).toBeTruthy();
  });

  it("preserves explicit seed overrides when present", () => {
    const base = getServiceById("sm-001")!;
    const withOverrides = normalizeStudioServiceEntry({
      ...base,
      reviewType: "standard_production_review",
      deliveryPackage: "project_deliverables",
    });

    expect(withOverrides.reviewType).toBe("standard_production_review");
    expect(withOverrides.deliveryPackage).toBe("project_deliverables");
  });
});
