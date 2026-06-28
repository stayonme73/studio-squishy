import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import {
  EMPTY_PROJECT_DETAILS_FORM,
  isProjectDetailsFormValid,
  isProjectDetailsStepValid,
  resolveApprovedGreenServiceIds,
  resolveProjectDetailsMissingItems,
  resolveProjectDetailsSteps,
} from "@/config/project-details";
import type { ApprovedStudioPlan } from "@/config/studio-board";

function mockApproved(selectedServiceIds: ServiceId[]): ApprovedStudioPlan {
  return {
    selectedServiceIds,
    includedServiceIds: selectedServiceIds,
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 0,
    monthlyTotalCents: 0,
    amountDueTodayCents: 0,
    lineItems: [],
    approvedAt: "2026-06-27T12:00:00.000Z",
  };
}

describe("resolveProjectDetailsSteps", () => {
  it("includes working-on for social SKUs", () => {
    const steps = resolveProjectDetailsSteps(["sm-001", "bf-001"]);
    expect(steps).toContain("working-on");
    expect(steps).toContain("brand-materials");
    expect(steps).toContain("approval-contact");
    expect(steps).toContain("final-review");
  });

  it("omits working-on for brand foundation only", () => {
    const steps = resolveProjectDetailsSteps(["bf-001"]);
    expect(steps).not.toContain("working-on");
    expect(steps).toContain("brand-materials");
  });

  it("includes channels when social or email SKUs selected", () => {
    expect(resolveProjectDetailsSteps(["em-001-monthly"])).toContain("channels");
    expect(resolveProjectDetailsSteps(["sm-001-monthly"])).toContain("channels");
  });
});

describe("resolveApprovedGreenServiceIds", () => {
  it("filters to green SKUs only", () => {
    const ids = resolveApprovedGreenServiceIds(
      mockApproved(["bf-001", "sm-001", "social_media-execution" as ServiceId]),
    );
    expect(ids).toEqual(["bf-001", "sm-001"]);
  });
});

describe("project details validation", () => {
  const socialPlan: ServiceId[] = ["sm-001", "bf-001"];

  it("requires step 1 fields when shown", () => {
    expect(
      isProjectDetailsStepValid("working-on", EMPTY_PROJECT_DETAILS_FORM, [], socialPlan),
    ).toBe(false);

    const form = {
      ...EMPTY_PROJECT_DETAILS_FORM,
      workingOn: "Summer sale",
      mainOffer: "20% off",
      importantDates: "July 4",
      callToAction: "Shop online",
      destinationLink: "https://example.com",
    };
    expect(isProjectDetailsStepValid("working-on", form, [], socialPlan)).toBe(true);
  });

  it("requires brand uploads when brand step shown", () => {
    const form = {
      ...EMPTY_PROJECT_DETAILS_FORM,
      brandOutdatedParts: "Old logo",
      brandPartsToKeep: "Teal accent",
    };
    expect(isProjectDetailsStepValid("brand-materials", form, [], socialPlan)).toBe(false);

    const files = [
      {
        id: "1",
        category: "logo" as const,
        fileName: "logo.png",
        mimeType: "image/png",
        sizeBytes: 100,
        uploadedAt: "2026-06-27T12:00:00.000Z",
      },
    ];
    expect(isProjectDetailsStepValid("brand-materials", form, files, socialPlan)).toBe(true);
  });

  it("flags missing items for final review", () => {
    const missing = resolveProjectDetailsMissingItems(EMPTY_PROJECT_DETAILS_FORM, [], socialPlan);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.some((item) => item.stepId === "approval-contact")).toBe(true);
  });

  it("validates full form for social + brand plan", () => {
    const form = {
      ...EMPTY_PROJECT_DETAILS_FORM,
      workingOn: "Launch",
      mainOffer: "Offer",
      importantDates: "Soon",
      callToAction: "Visit",
      destinationLink: "https://example.com",
      brandOutdatedParts: "Colors",
      brandPartsToKeep: "Logo mark",
      socialPlatforms: "Instagram",
      socialAccountLinks: "@studio",
      primaryApproverName: "Tagia",
      primaryApproverEmail: "tagia@example.com",
    };
    const files = [
      {
        id: "1",
        category: "logo" as const,
        fileName: "logo.png",
        mimeType: "image/png",
        sizeBytes: 100,
        uploadedAt: "2026-06-27T12:00:00.000Z",
      },
    ];
    expect(isProjectDetailsFormValid(form, files, socialPlan)).toBe(true);
  });
});
