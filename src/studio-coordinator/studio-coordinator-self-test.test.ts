import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import {
  directClientUploadActivity,
  formatSelfTestReport,
  runStudioCoordinatorSelfTest,
  SELF_TEST_DELIVERABLES,
  SELF_TEST_JOB_ID,
  SELF_TEST_PRICE_CENTS,
  SELF_TEST_SERVICE_ID,
  SELF_TEST_SERVICE_NAME,
} from "./studio-coordinator-self-test";

describe("studio-coordinator self-test scenario", () => {
  it("uses the live Route Map flyer ServiceId with coherent catalog facts", () => {
    const service = getServiceById(SELF_TEST_SERVICE_ID);
    expect(service, "v2-rtu-flyer must exist in the live catalog").toBeDefined();
    expect(service?.name).toBe(SELF_TEST_SERVICE_NAME);
    expect(service?.familyId).toBe("marketing_assets");
    expect(service?.deliverables).toEqual([...SELF_TEST_DELIVERABLES]);
    // Static snapshot check — update fixture constants if this drifts intentionally.
    expect(service?.priceCents).toBe(SELF_TEST_PRICE_CENTS);
  });

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

    const job: PurchasedJobRecord = {
      jobId: SELF_TEST_JOB_ID,
      campaignId: "sc-self-test",
      skuId: SELF_TEST_SERVICE_ID,
      serviceName: SELF_TEST_SERVICE_NAME,
      spineStatus: "ready_for_review",
      productionLane: "quick",
      intakeComplete: true,
      updatedAt: "2026-07-03T12:00:00.000Z",
    };
    const envelope: ServerTasksEnvelope = {
      campaignId: "sc-self-test",
      tasks: [],
      planFingerprint: "sc-self-test",
      updatedAt: "2026-07-03T12:00:00.000Z",
      syncedAt: "2026-07-03T12:00:00.000Z",
      version: 1,
      jobActivityEvents: [],
    };
    const direct = directClientUploadActivity(envelope, job, "2026-07-02T10:00:00.000Z");
    expect(direct.jobActivityEvents?.some((e) => e.kind === "client_upload")).toBe(true);
    void report;
  });
});
