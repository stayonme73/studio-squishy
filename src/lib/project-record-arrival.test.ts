import { describe, expect, it } from "vitest";

import {
  PROJECT_RECORD_ARRIVAL_PARAM,
  projectRecordArrivalHref,
  shouldShowProjectRecordArrival,
} from "@/lib/project-record-arrival";

describe("projectRecordArrivalHref", () => {
  it("appends the arrival param to the given base href", () => {
    expect(projectRecordArrivalHref("/campaign-details")).toBe("/campaign-details?arrived=1");
  });
});

describe("shouldShowProjectRecordArrival", () => {
  const paidAt = "2026-07-11T12:00:00.000Z";

  it("shows the arrival message after intake when payment is confirmed", () => {
    expect(shouldShowProjectRecordArrival("1", paidAt)).toBe(true);
  });

  it("does not show it on a normal direct visit with no param", () => {
    expect(shouldShowProjectRecordArrival(null, paidAt)).toBe(false);
    expect(shouldShowProjectRecordArrival(undefined, paidAt)).toBe(false);
  });

  it("does not show it for an unrecognized param value", () => {
    expect(shouldShowProjectRecordArrival("0", paidAt)).toBe(false);
    expect(shouldShowProjectRecordArrival("true", paidAt)).toBe(false);
    expect(shouldShowProjectRecordArrival("", paidAt)).toBe(false);
  });

  it("does not show it when the arrival param is present but payment is not confirmed", () => {
    expect(shouldShowProjectRecordArrival("1", null)).toBe(false);
    expect(shouldShowProjectRecordArrival("1", undefined)).toBe(false);
  });

  it("PROJECT_RECORD_ARRIVAL_PARAM matches the query key the href helper writes", () => {
    const href = projectRecordArrivalHref("/campaign-details");
    const params = new URL(href, "http://localhost").searchParams;
    expect(shouldShowProjectRecordArrival(params.get(PROJECT_RECORD_ARRIVAL_PARAM), paidAt)).toBe(
      true,
    );
  });
});
