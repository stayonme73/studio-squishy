import { describe, expect, it } from "vitest";

import {
  buildProjectBuilderStudioPlanSummary,
  consolidateStudioPlanRequirements,
} from "@/lib/project-builder-studio-plan-summary";

describe("project-builder studio plan summary", () => {
  it("builds a project-level summary with concise scope lines", () => {
    const model = buildProjectBuilderStudioPlanSummary(["v2-rtu-flyer"], "update");

    expect(model.routeLabel).toBe("I-285 · Update What I Already Have");
    expect(model.deliverables).toHaveLength(1);
    expect(model.deliverables[0]?.title).toBe("Update My Flyer");
    expect(model.deliverables[0]?.scopeSummary).toMatch(/existing single-sided flyer/i);
    expect(model.totalDisplay).toBe("$69");
    expect(model.revisionPolicySummary).toHaveLength(3);
    expect(model.revisionPolicyFull.length).toBeGreaterThan(model.revisionPolicySummary.length);
    expect(model.consolidatedRequirements.some((item) => /wording|logo|approval/i.test(item))).toBe(true);
    expect(model.canContinue).toBe(true);
  });

  it("computes an overall timeline from selected deliverables", () => {
    const model = buildProjectBuilderStudioPlanSummary(
      ["v2-rtu-flyer", "v2-rtu-social-posts"],
      "i75",
    );

    expect(model.overallTimelineDisplay).toMatch(/3–5 business days after all required materials are received/i);
    expect(model.deliverableTimelines).toEqual([
      { title: "Make Me a Flyer", timingDisplay: "2–3 business days" },
      { title: "Make My Social Media Posts", timingDisplay: "3–5 business days" },
    ]);
  });

  it("uses creation titles on non-update routes", () => {
    const model = buildProjectBuilderStudioPlanSummary(["v2-rtu-flyer"], "i75");

    expect(model.routeLabel).toBe("I-75 · Get My Business Started");
    expect(model.deliverables[0]?.title).toBe("Make Me a Flyer");
    expect(model.deliverables[0]?.scopeSummary).not.toMatch(/preserving the existing design direction/i);
  });

  it("returns an empty-state message when no deliverables are selected", () => {
    const model = buildProjectBuilderStudioPlanSummary([], "i75");

    expect(model.deliverables).toHaveLength(0);
    expect(model.canContinue).toBe(false);
    expect(model.emptyMessage).toMatch(/empty/i);
  });

  it("consolidates duplicate customer requirements into shared themes", () => {
    const consolidated = consolidateStudioPlanRequirements([
      "Replacement wording, pricing, dates, or contact information",
      "Any new logo or approved images",
      "Final approval before delivery",
      "Exact replacement dates, prices, contact information, wording, or one image you supply",
    ]);

    expect(consolidated).toContain("Final wording");
    expect(consolidated).toContain("Logo");
    expect(consolidated).toContain("Pricing");
    expect(consolidated).toContain("Contact information");
    expect(consolidated).toContain("Final approval before delivery");
    expect(consolidated.filter((item) => /contact information/i.test(item))).toHaveLength(1);
  });
});
