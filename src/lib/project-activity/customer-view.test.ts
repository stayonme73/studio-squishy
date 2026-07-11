import { describe, expect, it } from "vitest";

import {
  countPendingCustomerRequests,
  isAwaitingProjectChangeConsent,
  isPendingCustomerRequest,
  projectActivityToCustomerTimeline,
} from "./customer-view";
import type { InformationUpdateRequest, ProjectActivityAuditEvent } from "./types";

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

  it("does not expose owner briefing payload fields on customer timeline", () => {
    const timeline = projectActivityToCustomerTimeline([
      event({
        kind: "owner_decision_recorded",
        sourceType: "owner_decision",
        requestId: "req-pc-1",
        headline: "Owner recorded decision",
        payload: {
          decision: "approved",
          briefingSnapshot: { pricingDeltaCents: 50000 },
          exceptionId: "exc-1",
        },
      }),
    ]);
    expect(timeline[0]?.headline).toBe("Project change approved");
    expect(timeline[0]).not.toHaveProperty("payload");
  });

  it("renders project change lifecycle headlines for customer-visible kinds", () => {
    const kinds = [
      {
        kind: "customer_approval_requested" as const,
        headline: "The Studio needs your confirmation",
      },
      {
        kind: "customer_approval_granted" as const,
        headline: "You confirmed this project change",
      },
      {
        kind: "customer_approval_declined" as const,
        headline: "You declined this project change",
      },
      {
        kind: "project_change_applied" as const,
        headline: "Project change applied",
      },
      {
        kind: "project_change_escalated" as const,
        headline: "Submitted for Studio review",
      },
    ];

    for (const { kind, headline } of kinds) {
      const timeline = projectActivityToCustomerTimeline([
        event({ kind, requestId: "req-pc-1", headline: "Stored headline" }),
      ]);
      expect(timeline[0]?.headline).toBe(headline);
    }
  });
});

function pendingRequest(
  overrides: Partial<InformationUpdateRequest>,
): InformationUpdateRequest {
  return {
    id: "req-1",
    campaignId: "camp-1",
    idempotencyKey: "idem-1",
    targetKey: "freeform_request",
    targetLabel: "Freeform request",
    previousValueCaptured: null,
    requestedValue: "Add another social platform",
    status: "request_received",
    classification: null,
    fieldTokenAtCapture: null,
    submittedBy: { userId: "client-1" },
    submittedAt: "2026-07-11T14:00:00.000Z",
    ...overrides,
  };
}

describe("isPendingCustomerRequest", () => {
  it("counts held project changes as pending", () => {
    expect(
      isPendingCustomerRequest(
        pendingRequest({ status: "held", classification: "project_change" }),
      ),
    ).toBe(true);
  });

  it("counts consent-pending project changes as pending", () => {
    expect(
      isPendingCustomerRequest(
        pendingRequest({
          status: "held",
          classification: "project_change",
          consentStatus: "pending",
        }),
      ),
    ).toBe(true);
  });

  it("does not count applied or rejected requests as pending", () => {
    expect(isPendingCustomerRequest(pendingRequest({ status: "applied" }))).toBe(false);
    expect(isPendingCustomerRequest(pendingRequest({ status: "rejected" }))).toBe(false);
  });

  it("does not count terminal requests with resolved consent as pending", () => {
    expect(
      isPendingCustomerRequest(
        pendingRequest({
          status: "applied",
          classification: "project_change",
          consentStatus: "granted",
        }),
      ),
    ).toBe(false);
  });

  it("keeps held project changes pending after consent is granted until applied", () => {
    expect(
      isPendingCustomerRequest(
        pendingRequest({
          status: "held",
          classification: "project_change",
          consentStatus: "granted",
        }),
      ),
    ).toBe(true);
  });
});

describe("countPendingCustomerRequests", () => {
  it("includes held requests in pending count", () => {
    expect(
      countPendingCustomerRequests([
        pendingRequest({ status: "request_received" }),
        pendingRequest({ id: "req-2", status: "held", classification: "project_change" }),
        pendingRequest({ id: "req-3", status: "applied" }),
      ]),
    ).toBe(2);
  });
});

describe("isAwaitingProjectChangeConsent", () => {
  it("is true only for project_change requests with pending consent", () => {
    expect(
      isAwaitingProjectChangeConsent(
        pendingRequest({
          status: "held",
          classification: "project_change",
          consentStatus: "pending",
        }),
      ),
    ).toBe(true);
    expect(
      isAwaitingProjectChangeConsent(
        pendingRequest({
          status: "held",
          classification: "information_update",
          consentStatus: "pending",
        }),
      ),
    ).toBe(false);
  });
});
