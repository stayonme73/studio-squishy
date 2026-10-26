import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { projectCustomerUpdateHistory } from "./customer-update-history";
import type { JobActivityEvent, PurchasedJobRecord } from "./types";

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

  it("labels an automatic Machine system actor as The Studio", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "status_change:machine",
          kind: "status_change",
          occurredAt: "2026-08-01T10:00:00.000Z",
          spineStatus: "ready_for_review",
          reason: "Machine presented the review",
          actor: { role: "system", displayName: "Studio Machine" },
        }),
      ],
      "job-1",
    );
    expect(items[0]?.actorLabel).toBe("The Studio");
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
      "The Studio updated your files",
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

  it("does not keep Review action-needed on historical events after approval", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "status_change:a",
          kind: "status_change",
          occurredAt: "2026-08-01T10:00:00.000Z",
          spineStatus: "ready_for_review",
          reason: "Released for Review Room",
        }),
        event({
          id: "approval:a",
          kind: "client_delivery_approval",
          occurredAt: "2026-08-01T12:00:00.000Z",
          actor: { role: "client" },
        }),
      ],
      "job-1",
      { currentSpineStatus: "approved" },
    );

    expect(items.find((item) => item.id === "status_change:a")?.actionRequired).toBeNull();
    expect(items.find((item) => item.id === "status_change:a")?.detail).toBeNull();
  });

  it("strips internal QA / Machine detail from customer history", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "status_change:qa",
          kind: "status_change",
          occurredAt: "2026-08-01T10:00:00.000Z",
          spineStatus: "ready_for_review",
          reason: "Machine flyer identity passed internal QA.",
        }),
      ],
      "job-1",
      { currentSpineStatus: "ready_for_review" },
    );

    expect(items[0]?.headline).toBe("Studio submitted work for your review");
    expect(items[0]?.detail).toBeNull();
    expect(items[0]?.actionRequired).toContain("return feedback or approve");
  });

  it("ready_for_delivery is ready, not still preparing, and hides Machine authorize jargon", () => {
    const items = projectCustomerUpdateHistory(
      [
        event({
          id: "status_change:ready",
          kind: "status_change",
          occurredAt: "2026-09-17T01:26:39.529Z",
          spineStatus: "ready_for_delivery",
          reason:
            "System authorized Final Delivery — approved identity matches delivery candidate",
        }),
      ],
      "job-1",
      { currentSpineStatus: "ready_for_delivery" },
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.headline).toBe("Your files are ready");
    expect(items[0]?.headline).not.toMatch(/preparing/i);
    expect(items[0]?.detail).toBeNull();
  });

  it("Maya Version 16 activity projects approval and release when a jobId is named", () => {
    const MAYA = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
    const envelope = JSON.parse(
      readFileSync(path.join(process.cwd(), "data/campaign-tasks", `${MAYA}.json`), "utf8"),
    ) as { jobRecords?: PurchasedJobRecord[]; jobActivityEvents?: JobActivityEvent[] };
    const job = envelope.jobRecords?.[0];
    expect(job?.jobId).toBe(`${MAYA}:v2-rtu-flyer`);
    const items = projectCustomerUpdateHistory(
      envelope.jobActivityEvents ?? [],
      job!.jobId,
      { currentSpineStatus: job!.spineStatus },
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item) => item.sourceKind === "client_delivery_approval")).toBe(true);
    expect(
      items.some(
        (item) =>
          item.sourceKind === "owner_final_release" ||
          item.sourceKind === "file_released" ||
          item.sourceKind === "file_download_available",
      ),
    ).toBe(true);
  });
});
