import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import type { StudioUser } from "@/lib/campaign-store/types";

import {
  applyExceptionStatusOnClientMaterialSubmit,
  applyPromotionToMaterials,
  isClientVisibleMaterialItem,
  validateApproveClientRequestPayload,
} from "./promotion";
import { resolveConsolidatedClientRequests } from "./client-requests";
import { resolveMaterialsApiPayload } from "./materials-view";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "./types";

const now = "2026-06-29T12:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

function sampleItem(overrides: Partial<CampaignMaterialItem> = {}): CampaignMaterialItem {
  return {
    id: "logo-brand-sm-001-slot",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo & brand assets",
    reason: "Social Media Launch Set",
    relatedServiceIds: ["sm-001"],
    uploadStatus: "none",
    ...overrides,
  };
}

function materialsEnvelope(items: CampaignMaterialItem[]): ServerMaterialsEnvelope {
  return {
    campaignId: "campaign-1",
    items,
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

function exception(overrides: Partial<CampaignExceptionRecord> = {}): CampaignExceptionRecord {
  return {
    id: "exc-logo",
    campaignId: "campaign-1",
    kind: "client_request",
    status: "waiting_owner",
    title: "Need vector logo",
    createdAt: now,
    updatedAt: now,
    raisedByUserId: owner.id,
    raisedByDisplayName: owner.displayName,
    raisedByRole: "owner",
    ...overrides,
  };
}

const approvePayload = {
  exceptionId: "exc-logo",
  category: "logo-brand" as const,
  clientFacingLabel: "Logo file",
  clientFacingPrompt: "Please send your logo file",
  whyNeeded: "Needed for Social Media Launch Set and Brand Foundation",
  requirementLevel: "required" as const,
  relatedServiceIds: ["sm-001", "bf-001"] as const satisfies readonly ServiceId[],
};

describe("materials promotion", () => {
  it("consolidates logo promotion across multiple service slots", () => {
    const items = [
      sampleItem({ id: "logo-sm", relatedServiceIds: ["sm-001"], reason: "Social" }),
      sampleItem({ id: "logo-bf", relatedServiceIds: ["bf-001"], reason: "Brand Foundation" }),
    ];

    const { envelope, materialItemIds } = applyPromotionToMaterials(
      materialsEnvelope(items),
      exception(),
      approvePayload,
      now,
    );

    expect(materialItemIds).toHaveLength(2);
    expect(envelope.items.every((item) => item.reviewStatus === "requested")).toBe(true);
    expect(envelope.items.every((item) => item.sourceExceptionId === "exc-logo")).toBe(true);

    const consolidated = resolveConsolidatedClientRequests(envelope);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]?.label).toBe("Logo file");
    expect(consolidated[0]?.underlyingItemIds).toHaveLength(2);
  });

  it("dedupes repeat promotion for the same exception", () => {
    const items = [sampleItem()];
    const first = applyPromotionToMaterials(
      materialsEnvelope(items),
      exception(),
      approvePayload,
      now,
    );
    const promoted = exception({
      promotion: {
        approvedAt: now,
        approvedByUserId: owner.id,
        approvedByDisplayName: owner.displayName,
        materialItemIds: first.materialItemIds,
        consolidatedRequestId: "logo-brand:file-metadata",
        ...approvePayload,
        contentKind: "file-metadata",
      },
    });

    const second = applyPromotionToMaterials(first.envelope, promoted, approvePayload, now);
    expect(second.envelope.items).toHaveLength(1);
    expect(second.materialItemIds).toEqual(first.materialItemIds);
  });

  it("hides unapproved exception-linked items from client API", () => {
    const unapproved = sampleItem({
      sourceExceptionId: "exc-draft",
      reviewStatus: "missing",
    });
    const approved = sampleItem({
      id: "logo-approved",
      sourceExceptionId: "exc-logo",
      promotionApprovedAt: now,
      reviewStatus: "requested",
      clientFacingLabel: "Logo file",
    });

    expect(isClientVisibleMaterialItem(unapproved)).toBe(false);
    expect(isClientVisibleMaterialItem(approved)).toBe(true);
    expect(isClientVisibleMaterialItem(sampleItem())).toBe(true);

    const payload = resolveMaterialsApiPayload(
      { campaignId: "c-1", items: [unapproved, approved], updatedAt: now, version: 1 },
      "client",
    );
    expect(payload.consolidatedRequests).toHaveLength(1);
    expect(payload.consolidatedRequests?.[0]?.label).toBe("Logo file");
  });

  it("rejects secret-like client-facing wording", () => {
    const result = validateApproveClientRequestPayload({
      ...approvePayload,
      clientFacingPrompt: "Send your api_key here",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/secret|credential|password/i);
  });

  it("rejects internal-only phrasing in client-facing fields", () => {
    const result = validateApproveClientRequestPayload({
      ...approvePayload,
      whyNeeded: "Internal team must verify before client send",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/internal-only/i);
  });

  it("rejects blocklisted generic whyNeeded", () => {
    const result = validateApproveClientRequestPayload({
      ...approvePayload,
      whyNeeded: "Needed for your approved Studio Plan services",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/specific/i);
  });

  it("moves promoted exception to waiting_internal on client submit hook", () => {
    const tasksEnvelope = {
      campaignId: "campaign-1",
      tasks: [],
      planFingerprint: "fp",
      updatedAt: now,
      version: 6,
      syncedAt: now,
      exceptionRecords: [
        exception({
          status: "waiting_client",
          promotion: {
            approvedAt: now,
            approvedByUserId: owner.id,
            approvedByDisplayName: owner.displayName,
            materialItemIds: ["logo-sm"],
            consolidatedRequestId: "logo-brand:file-metadata",
            clientFacingLabel: "Logo file",
            clientFacingPrompt: "Please send your logo file",
            whyNeeded: "Needed for Social",
            category: "logo-brand",
            contentKind: "file-metadata",
            requirementLevel: "required",
          },
        }),
      ],
      exceptionEvents: [],
    };

    const updated = applyExceptionStatusOnClientMaterialSubmit(tasksEnvelope, ["logo-sm"]);
    expect(updated.exceptionRecords?.[0]?.status).toBe("waiting_internal");
    expect(updated.exceptionRecords?.[0]?.status).not.toBe("resolved");
  });
});
