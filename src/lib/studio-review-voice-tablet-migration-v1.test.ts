import { describe, expect, it } from "vitest";

import { ownerQa } from "@/config/owner-qa";
import {
  getStudioReviewMigrationRow,
  isStudioReviewRowReadyToRemove,
  studioReviewVoiceTabletMigrationLedger,
  type StudioReviewMigrationRow,
} from "@/config/studio-review-voice-tablet-migration-v1";

describe("studio-review-voice-tablet-migration-v1", () => {
  it("covers every Owner QA customer-journey preset", () => {
    const ledgerIds = new Set(
      studioReviewVoiceTabletMigrationLedger
        .map((row) => row.ownerQaPresetId)
        .filter((id): id is string => id !== null),
    );
    for (const preset of ownerQa.journeyPresets) {
      expect(ledgerIds.has(preset.id), `missing ledger row for Owner QA preset: ${preset.id}`).toBe(true);
      const row = studioReviewVoiceTabletMigrationLedger.find((r) => r.ownerQaPresetId === preset.id);
      expect(row?.source).toBe(preset.label);
      expect(row?.sourceHref).toBe(preset.href);
    }
  });

  it("tracks Discovery Migration 1 before Route Map", () => {
    const discovery = getStudioReviewMigrationRow("discovery");
    expect(discovery?.status).toBe("in_progress");
    expect(discovery?.ownerQaPresetId).toBeNull();
    const ids = studioReviewVoiceTabletMigrationLedger.map((row) => row.id);
    expect(ids.indexOf("discovery")).toBeLessThan(ids.indexOf("route-map"));
  });

  it("requires passport fields on every ledger row", () => {
    for (const row of studioReviewVoiceTabletMigrationLedger) {
      expect(row.source.length).toBeGreaterThan(0);
      expect(row.tabletReplacement.length).toBeGreaterThan(0);
      expect(row.presentationView.length).toBeGreaterThan(0);
      expect(row.dataMapping.length).toBeGreaterThan(0);
      expect(row.status).toBeTruthy();
      expect(row.persistence).toBeTruthy();
      expect(row.editing).toBeTruthy();
      expect(row.attribution).toBeTruthy();
      expect(row.tests).toBeTruthy();
      expect(row.desktop).toBeTruthy();
      expect(row.mobile).toBeTruthy();
      expect(row.ownerApproval).toBeTruthy();
      expect(row.removal).toBeTruthy();
    }
  });

  it("does not treat unfinished rows as ready to remove", () => {
    for (const row of studioReviewVoiceTabletMigrationLedger) {
      if (row.status === "not_started" || row.status === "in_progress") {
        expect(isStudioReviewRowReadyToRemove(row)).toBe(false);
      }
    }
  });

  it("ready_to_remove requires all gates stamped", () => {
    const unfinished: StudioReviewMigrationRow = {
      ...studioReviewVoiceTabletMigrationLedger[0],
      status: "ready_to_remove",
      persistence: "pending",
    };
    expect(isStudioReviewRowReadyToRemove(unfinished)).toBe(false);

    const stamped: StudioReviewMigrationRow = {
      ...studioReviewVoiceTabletMigrationLedger[0],
      status: "ready_to_remove",
      persistence: "verified",
      editing: "not_applicable",
      attribution: "verified",
      tests: "verified",
      desktop: "certified",
      mobile: "certified",
      ownerApproval: "received",
      removal: "pending",
    };
    expect(isStudioReviewRowReadyToRemove(stamped)).toBe(true);
  });

  it("looks up rows by id", () => {
    expect(getStudioReviewMigrationRow("route-map")?.source).toBe("Route Map");
    expect(getStudioReviewMigrationRow("missing")).toBeUndefined();
  });
});
