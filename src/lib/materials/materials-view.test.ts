import { describe, expect, it } from "vitest";

import {
  countBlockingRequiredMaterials,
  isBlockingMaterialItem,
  resolveFileRoomMaterialsView,
  resolveMaterialsApiPayload,
} from "./materials-view";
import type { CampaignMaterialItem } from "./types";

function item(overrides: Partial<CampaignMaterialItem>): CampaignMaterialItem {
  return {
    id: "item-1",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo files",
    reason: "Brand Foundation",
    relatedServiceIds: ["bf-001"],
    uploadStatus: "none",
    ...overrides,
  };
}

describe("materials-view", () => {
  it("groups items by category with status labels", () => {
    const view = resolveFileRoomMaterialsView({
      campaignId: "c-1",
      items: [
        item({ id: "a", category: "logo-brand" }),
        item({ id: "b", category: "url-link", requirementLevel: "optional" }),
      ],
      updatedAt: "2026-01-01T00:00:00.000Z",
      version: 1,
    });

    expect(view.groups).toHaveLength(2);
    expect(view.groups[0]?.categoryLabel.length).toBeGreaterThan(0);
    expect(view.isEmpty).toBe(false);
  });

  it("counts uncleared required materials as blocking (submitted alone is not enough for logos)", () => {
    expect(
      countBlockingRequiredMaterials(
        [
          item({ reviewStatus: "missing" }),
          item({ reviewStatus: "submitted", submittedAt: "2026-01-02T00:00:00.000Z" }),
          item({ requirementLevel: "optional", reviewStatus: "missing" }),
          item({ reviewStatus: "needs_clarification" }),
          item({
            reviewStatus: "approved_for_use",
            useAuthorization: {
              basis: "customer_owns",
              attestedAt: "2026-01-02T00:00:00.000Z",
            },
          }),
        ],
        "c-1",
      ),
    ).toBe(3);
    expect(isBlockingMaterialItem(item({ reviewStatus: "not_needed" }), "c-1")).toBe(false);
  });

  it("client API payload omits internal ledger fields and team notes", () => {
    const record = {
      campaignId: "c-1",
      items: [
        item({
          reviewStatus: "needs_clarification",
          teamNote: "Internal: need vector format",
          reviewedBy: { role: "owner" as const, userId: "owner-1" },
        }),
      ],
      updatedAt: "2026-01-01T00:00:00.000Z",
      version: 1,
    };

    const payload = resolveMaterialsApiPayload(record, "client");
    expect(payload.materials).toBeUndefined();
    expect(payload.consolidatedRequests?.[0]?.statusLabel).toBe("Needs your update");
    expect(payload.consolidatedRequests?.[0]).not.toHaveProperty("teamNote");
    expect(payload.consolidatedRequests?.[0]).not.toHaveProperty("relatedServiceIds");
    expect(payload.consolidatedRequests?.[0]).not.toHaveProperty("underlyingItemIds");
    expect(JSON.stringify(payload)).not.toContain("Internal: need vector format");
    expect(JSON.stringify(payload)).not.toContain("owner-1");
  });

  it("client API keeps submitted rows visible with intake count", () => {
    const payload = resolveMaterialsApiPayload(
      {
        campaignId: "c-2",
        items: [
          item({
            reviewStatus: "submitted",
            clientFacingLabel: "Logo file",
            submittedAt: "2026-01-02T12:30:00.000Z",
          }),
        ],
        updatedAt: "2026-01-01T00:00:00.000Z",
        version: 1,
      },
      "client",
    );

    expect(payload.clientIntakeCount).toBe(1);
    // Logo submitted without use authorization remains production-blocking.
    expect(payload.blockingRequiredCount).toBe(1);
    expect(payload.consolidatedRequests).toHaveLength(1);
    expect(payload.consolidatedRequests?.[0]?.statusLabel).toBe("Received — under review");
    expect(payload.consolidatedRequests?.[0]?.submittedAt).toBe("2026-01-02T12:30:00.000Z");
    expect(payload.consolidatedRequests?.[0]?.canSubmit).toBe(true);
  });
});
