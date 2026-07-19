import { describe, expect, it } from "vitest";

import {
  buildProjectIntakePlan,
  countProjectIntakeSections,
  PROJECT_INTAKE_SHARED_MATERIALS_KEY,
  projectIntakeServiceFieldKey,
  projectIntakeSharedContactKey,
} from "@/lib/project-intake-plan";
import {
  isProjectIntakePlanReady,
  countCompletedProjectIntakeSections,
} from "@/lib/project-intake-completeness";
import { INTAKE_MATERIALS_PROVIDE_LATER } from "@/lib/route-map-intake-materials";

describe("project intake multi-service plan", () => {
  it("builds Flyer + Business Cards with shared materials and no duplicated brand fields", () => {
    const plan = buildProjectIntakePlan([
      "v2-rtu-flyer",
      "v2-rtu-business-card",
    ]);

    expect(plan.services.map((s) => s.serviceId)).toEqual([
      "v2-rtu-flyer",
      "v2-rtu-business-card",
    ]);
    expect(plan.services.map((s) => s.title)).toEqual([
      "Flyer",
      "Business Card",
    ]);

    const sharedKeys = plan.sharedFields.map((f) => f.answerKey);
    expect(sharedKeys).toContain(PROJECT_INTAKE_SHARED_MATERIALS_KEY);
    expect(sharedKeys).toContain(projectIntakeSharedContactKey("businessName"));
    expect(sharedKeys).toContain(projectIntakeSharedContactKey("phone"));
    expect(sharedKeys).toContain(projectIntakeSharedContactKey("email"));
    expect(sharedKeys).toContain(projectIntakeSharedContactKey("webOrSocial"));

    const flyer = plan.services.find((s) => s.serviceId === "v2-rtu-flyer")!;
    const cards = plan.services.find(
      (s) => s.serviceId === "v2-rtu-business-card",
    )!;

    expect(flyer.fields.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        "flyerPurpose",
        "mustInclude",
        "intendedUse",
        "sizeNotes",
        "disclaimers",
      ]),
    );
    expect(flyer.fields.some((f) => f.role === "materials")).toBe(false);

    expect(cards.fields.map((f) => f.id)).toEqual(
      expect.arrayContaining(["cardNameTitle", "address", "cardSize"]),
    );
    expect(cards.fields.some((f) => f.id === "businessName")).toBe(false);
    expect(cards.fields.some((f) => f.id === "phone")).toBe(false);
    expect(cards.fields.some((f) => f.role === "materials")).toBe(false);

    expect(countProjectIntakeSections(plan)).toBeGreaterThan(
      flyer.fields.length + cards.fields.length,
    );
  });

  it("requires every purchased service section before intake is ready", () => {
    const plan = buildProjectIntakePlan([
      "v2-rtu-flyer",
      "v2-rtu-business-card",
    ]);

    const answers: Record<string, string> = {
      [PROJECT_INTAKE_SHARED_MATERIALS_KEY]: INTAKE_MATERIALS_PROVIDE_LATER,
      [projectIntakeSharedContactKey("businessName")]: "Home Chef",
      [projectIntakeSharedContactKey("phone")]: "555-0100",
      [projectIntakeSharedContactKey("email")]: "hi@example.com",
      [projectIntakeServiceFieldKey("v2-rtu-flyer", "flyerPurpose")]: "Weekend sale",
      [projectIntakeServiceFieldKey("v2-rtu-flyer", "mustInclude")]: "20% off",
      [projectIntakeServiceFieldKey("v2-rtu-flyer", "intendedUse")]: "Print",
    };

    expect(isProjectIntakePlanReady(plan, answers)).toBe(false);

    answers[projectIntakeServiceFieldKey("v2-rtu-business-card", "cardNameTitle")] =
      "Tagia · Owner";

    expect(isProjectIntakePlanReady(plan, answers)).toBe(true);
    expect(countCompletedProjectIntakeSections(plan, answers)).toBeGreaterThan(0);
  });

  it("does not stop after the first selected service", () => {
    const flyerOnly = buildProjectIntakePlan(["v2-rtu-flyer"]);
    const both = buildProjectIntakePlan([
      "v2-rtu-flyer",
      "v2-rtu-business-card",
    ]);
    expect(both.services.length).toBe(2);
    expect(both.services.length).toBeGreaterThan(flyerOnly.services.length);
  });
});
