import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";

import {
  applyClientSubmitConsolidated,
  applyClientSubmitItem,
  applyTeamReview,
  isFilenameOnlyFileMetadataClaim,
} from "./actions";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "./types";

const client: StudioUser = {
  id: "client-1",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: "campaign-a",
};

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

function sampleItem(overrides: Partial<CampaignMaterialItem> = {}): CampaignMaterialItem {
  return {
    id: "logo-brand-bf-001-slot",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo & brand assets",
    reason: "Brand Foundation",
    relatedServiceIds: ["bf-001"],
    uploadStatus: "none",
    ...overrides,
  };
}

function envelope(items: CampaignMaterialItem[]): ServerMaterialsEnvelope {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    campaignId: "campaign-a",
    items,
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

describe("materials actions", () => {
  it("applies consolidated client submit to all underlying slots", () => {
    const input = envelope([
      sampleItem({ id: "a" }),
      sampleItem({ id: "b", reason: "Social Media Launch Set", relatedServiceIds: ["sm-001"] }),
    ]);

    const result = applyClientSubmitConsolidated(
      input,
      "logo-brand:file-metadata",
      { fileName: "logo.svg", mimeType: "image/svg+xml" },
      client,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.items.every((item) => item.reviewStatus === "submitted")).toBe(true);
    expect(result.envelope.items.every((item) => item.fileName === "logo.svg")).toBe(true);
  });

  it("rejects secret-like client payload", () => {
    const result = applyClientSubmitConsolidated(
      envelope([sampleItem()]),
      "logo-brand:file-metadata",
      { note: "password: hunter2" },
      client,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/password/i);
    expect(result.status).toBe(400);
  });

  it("preserves client not-available disposition on submit", () => {
    const result = applyClientSubmitConsolidated(
      envelope([sampleItem({ id: "a", category: "factual-confirmation", contentKind: "text" })]),
      "factual-confirmation:text",
      { text: "I do not have this yet.", availability: "not_available_yet" },
      client,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.items[0]?.reviewStatus).toBe("submitted");
    expect(result.envelope.items[0]?.clientAvailability).toBe("not_available_yet");
    expect(result.envelope.items[0]?.submittedAt).toBeDefined();
  });

  it("blocks consolidated path for optional single-item submit on required blocking slot", () => {
    const result = applyClientSubmitItem(
      envelope([sampleItem()]),
      "logo-brand-bf-001-slot",
      { fileName: "logo.png" },
      client,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consolidated/i);
  });

  it("allows team review with clarification note", () => {
    const submitted = sampleItem({
      reviewStatus: "submitted",
      fileName: "logo.svg",
      submittedBy: { role: "client", userId: "client-1" },
      submittedAt: "2026-01-02T00:00:00.000Z",
    });

    const result = applyTeamReview(
      envelope([submitted]),
      submitted.id,
      "needs_clarification",
      "Please send a vector version.",
      owner,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.items[0]?.reviewStatus).toBe("needs_clarification");
    expect(result.envelope.items[0]?.teamNote).toContain("vector");
  });

  it("requires team note for needs_clarification", () => {
    const submitted = sampleItem({ reviewStatus: "submitted" });
    const result = applyTeamReview(
      envelope([submitted]),
      submitted.id,
      "needs_clarification",
      "",
      owner,
    );

    expect(result.ok).toBe(false);
  });

  it("flags filename-only file claims unless the customer said they do not have the file yet", () => {
    expect(
      isFilenameOnlyFileMetadataClaim({ fileName: "logo.png" }, [sampleItem()]),
    ).toBe(true);
    expect(
      isFilenameOnlyFileMetadataClaim(
        { text: "No logo. Wordmark only.", availability: "not_available_yet" },
        [sampleItem()],
      ),
    ).toBe(false);
  });
});
