import { describe, expect, it } from "vitest";

import { projectCustomerUpdateHistory } from "./customer-update-history";
import type { JobActivityEvent } from "./types";

function event(
  partial: Partial<JobActivityEvent> &
    Pick<JobActivityEvent, "id" | "kind" | "occurredAt">,
): JobActivityEvent {
  return {
    campaignId: "camp-1",
    jobId: "job-1",
    actor: { role: "staff", displayName: "Studio" },
    ...partial,
  };
}

describe("projectCustomerUpdateHistory", () => {
  it("returns empty for no events", () => {
    expect(projectCustomerUpdateHistory([], "job-1")).toEqual([]);
  });

  it("remaps Studio submit and customer receive without inventing facts", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "status_change:a",
          kind: "status_change",
          occurredAt: "2026-08-01T10:00:00.000Z",
          spineStatus: "ready_for_review",
          reason: "Released for Review Room",
          actor: { role: "staff", displayName: "Maya" },
        }),
        event({
          id: "client_review_received:a",
          kind: "client_review_received",
          occurredAt: "2026-08-01T11:00:00.000Z",
          actor: { role: "client", displayName: "Tagia" },
          messageRef: "release:status_change:a",
        }),
      ],
      "job-1",
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.headline).toBe("You received this submission");
    expect(items[0]?.actorLabel).toBe("Tagia");
    expect(items[1]?.headline).toBe("Studio submitted work for your review");
    expect(items[1]?.actionRequired).toContain("return feedback or approve");
    expect(items[1]?.actorLabel).toBe("Maya");
  });

  it("remaps formerly client-hidden file release kinds to customer-safe language", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "file_released:1",
          kind: "file_released",
          occurredAt: "2026-08-01T12:00:00.000Z",
          reason: "Version 3 released",
        }),
        event({
          id: "file_version_updated:1",
          kind: "file_version_updated",
          occurredAt: "2026-08-01T12:05:00.000Z",
          reason: "Version 3",
        }),
      ],
      "job-1",
    );

    expect(items.map((item) => item.headline)).toEqual([
      "Studio updated a file version",
      "Studio released files for you",
    ]);
    expect(items[0]?.versionLabel).toBe("Version 3");
    expect(items.every((item) => !/file_released|file_version/i.test(item.headline))).toBe(
      true,
    );
  });

  it("never surfaces internal notes or refund events", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "internal_note:1",
          kind: "internal_note",
          occurredAt: "2026-08-01T09:00:00.000Z",
          reason: "Secret staff note",
        }),
        event({
          id: "refund:1",
          kind: "refund",
          occurredAt: "2026-08-01T09:30:00.000Z",
          reason: "Refund discussion",
        }),
        event({
          id: "work_packet_assigned:1",
          kind: "work_packet_assigned",
          occurredAt: "2026-08-01T09:45:00.000Z",
        }),
        event({
          id: "client_communication:1",
          kind: "client_communication",
          occurredAt: "2026-08-01T09:50:00.000Z",
          reason: "Chat belongs in Project Communication",
        }),
      ],
      "job-1",
    );

    expect(items).toEqual([]);
  });

  it("scopes to the requested job only", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "a",
          kind: "delivery_completed",
          occurredAt: "2026-08-01T13:00:00.000Z",
          jobId: "job-other",
        }),
        event({
          id: "b",
          kind: "client_revision_request",
          occurredAt: "2026-08-01T14:00:00.000Z",
        }),
      ],
      "job-1",
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.headline).toBe("You returned feedback to The Studio");
  });

  it("preserves timing order newest first", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "older",
          kind: "intake",
          occurredAt: "2026-07-01T10:00:00.000Z",
          actor: { role: "client" },
        }),
        event({
          id: "newer",
          kind: "client_delivery_approval",
          occurredAt: "2026-08-01T10:00:00.000Z",
          actor: { role: "client" },
        }),
      ],
      "job-1",
    );

    expect(items.map((item) => item.id)).toEqual(["newer", "older"]);
  });
});
