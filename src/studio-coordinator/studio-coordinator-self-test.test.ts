import { describe, expect, it } from "vitest";

import {
  directClientUploadActivity,
  formatSelfTestReport,
  runStudioCoordinatorSelfTest,
} from "./studio-coordinator-self-test";

describe("studio-coordinator self-test scenario", () => {
  it("runs the full Phase 1 flow without UI", () => {
    const report = runStudioCoordinatorSelfTest();
    const formatted = formatSelfTestReport(report);
    if (!report.ok) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
    expect(report.ok, formatted).toBe(true);
    expect(report.steps.every((step) => step.pass)).toBe(true);
    expect(report.routedToOwner).toHaveLength(0);
    expect(report.learningCandidates).toHaveLength(0);
    expect(report.observations.length).toBeGreaterThan(0);
    expect(report.auditTrail.some((line) => line.includes("decision_evaluated"))).toBe(true);
  });

  it("client upload store state matches direct activity mutator", () => {
    const report = runStudioCoordinatorSelfTest();
    expect(report.storeStateMatch.some((line) => line.includes("owner exception: none"))).toBe(true);

    const job = {
      jobId: "sc-self-test:ma-flyer-v2",
      campaignId: "sc-self-test",
      skuId: "ma-flyer-v2",
      serviceName: "Flyer",
      spineStatus: "ready_for_review" as const,
      productionLane: "standard" as const,
      intakeComplete: true,
      updatedAt: "2026-07-03T12:00:00.000Z",
    };
    const envelope = { campaignId: "sc-self-test", jobActivityEvents: [] as never[], tasks: [] };
    const direct = directClientUploadActivity(envelope, job, "2026-07-02T10:00:00.000Z");
    expect(direct.jobActivityEvents?.some((e) => e.kind === "client_upload")).toBe(true);
    void report;
  });
});
