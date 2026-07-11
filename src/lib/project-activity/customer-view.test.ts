import { describe, expect, it } from "vitest";

import { projectActivityToCustomerTimeline } from "./customer-view";
import type { ProjectActivityAuditEvent } from "./types";

function event(overrides: Partial<ProjectActivityAuditEvent>): ProjectActivityAuditEvent {
  return {
    id: "evt-1",
    campaignId: "camp-1",
    occurredAt: "2026-07-11T14:00:00.000Z",
    kind: "request_received",
    sourceType: "information_update_request",
    sourceId: "req-1",
    actor: { role: "customer", userId: "user-1" },
    headline: "Request received",
    ...overrides,
  };
}

describe("projectActivityToCustomerTimeline requestId boundary", () => {
  it("preserves requestId when present on request-linked events", () => {
    const timeline = projectActivityToCustomerTimeline([
      event({ requestId: "req-abc", detail: "Email platform — Mailchimp" }),
    ]);
    expect(timeline[0]?.requestId).toBe("req-abc");
    expect(timeline[0]?.headline).toBe("Request received");
  });

  it("renders legacy events safely when requestId is absent", () => {
    const timeline = projectActivityToCustomerTimeline([
      event({ requestId: undefined, detail: "Phone number — 555-0100" }),
    ]);
    expect(timeline[0]?.requestId).toBeUndefined();
    expect(timeline[0]?.detail).toBe("Phone number — 555-0100");
  });

  it("omits requestId for non-request customer-visible kinds", () => {
    const timeline = projectActivityToCustomerTimeline([
      event({
        kind: "material_submitted",
        sourceType: "materials_submit",
        requestId: undefined,
        headline: "File information sent",
        detail: "We received your material submission.",
      }),
    ]);
    expect(timeline[0]?.kind).toBe("material_submitted");
    expect(timeline[0]?.requestId).toBeUndefined();
  });

  it("does not leak staff-only audit payload fields", () => {
    const timeline = projectActivityToCustomerTimeline([
      event({
        requestId: "req-safe",
        payload: { suggestedClassification: "project_change", classifiedBy: "staff-1" },
      }),
    ]);
    expect(timeline[0]).toEqual({
      id: "evt-1",
      occurredAt: "2026-07-11T14:00:00.000Z",
      headline: "Request received",
      detail: undefined,
      kind: "request_received",
      requestId: "req-safe",
    });
  });
});
