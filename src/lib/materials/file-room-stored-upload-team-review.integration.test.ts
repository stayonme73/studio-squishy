import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import { createMockFileRoomStorageAdapter } from "@/lib/file-storage/mock";
import { buildJobId } from "@/lib/job-control/lane-map";
import { applyTeamReview } from "@/lib/materials/actions";
import { canReviewMaterials } from "@/lib/materials/access";
import {
  applyMaterialUseDecisionToItem,
  buildMaterialContentFingerprint,
  priorApprovalMatchesCurrentContent,
} from "@/lib/studio-material-use/evaluate";
import { isCustomerContentClearedForProduction } from "@/lib/studio-customer-content-intake";
import { resolveApprovedLogoMaterial } from "@/lib/studio-dispatch/map-flyer-job-truth";

import { minimalSyntheticPngBytes } from "./image-file-bytes";
import { storeAndAttachCustomerMaterialFile } from "./client-file-store";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "./types";

const CAMPAIGN_ID = "file-room-integration-cert-harness";
const JOB_ID = buildJobId(CAMPAIGN_ID, "social_and_promo_graphics");
const SKU = "social_and_promo_graphics";

const client: StudioUser = {
  id: "client-file-room-int",
  email: "client-fr-int@local.dev",
  displayName: "Integration Client",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
};

const assignedStaff: StudioUser = {
  id: "staff-assigned-fr-int",
  email: "staff-assigned@local.dev",
  displayName: "Assigned Reviewer",
  roles: ["staff"],
};

const unassignedStaff: StudioUser = {
  id: "staff-other-fr-int",
  email: "staff-other@local.dev",
  displayName: "Other Staff",
  roles: ["staff"],
};

const assignments = {
  staffByUserId: {
    [assignedStaff.id]: [CAMPAIGN_ID],
  },
  staffCapabilities: {},
};

const envelope: ServerCampaignEnvelope = {
  campaignId: CAMPAIGN_ID,
  clientUserId: client.id,
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "File Room integration",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "",
    createdAt: "2026-10-25T00:00:00.000Z",
    updatedAt: "2026-10-25T00:00:00.000Z",
  },
  syncedAt: "2026-10-25T00:00:00.000Z",
  syncVersion: 1,
};

function campaign(): CampaignRecord {
  return envelope.record;
}

function logoSlot(): CampaignMaterialItem {
  return {
    id: "condensed-social-logo",
    category: "logo-brand",
    requirementLevel: "optional",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo",
    clientFacingLabel: "Logo",
    clientFacingPrompt: "Logo",
    reason: "Social & Promo",
    relatedServiceIds: [SKU],
    uploadStatus: "none",
    storageRef: null,
    isolatedSlot: true,
  } as CampaignMaterialItem;
}

function materials(items: CampaignMaterialItem[]): ServerMaterialsEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    items,
    syncedAt: "2026-10-25T00:00:00.000Z",
  };
}

function tasks(): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    tasks: [],
    jobRecords: [
      {
        jobId: JOB_ID,
        campaignId: CAMPAIGN_ID,
        skuId: SKU,
        spineStatus: "ready_for_queue",
      },
    ],
    syncedAt: "2026-10-25T00:00:00.000Z",
  };
}

function logoRightsInput() {
  return {
    useAuthorizationBasis: "customer_owns" as const,
    cropAdaptPermitted: true,
    commercialUsePermitted: true,
    recognizablePeoplePresent: false,
    thirdPartyMaterialPresent: false,
    attestationTextVersion: "gate-x-rights-attestation-v1-2026-08-22-honest-hold",
  };
}

describe("File Room stored upload + team review integration", () => {
  it("stores logo with real adapter metadata, matching fingerprint, no false quarantine, persisting team approval", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const bytes = minimalSyntheticPngBytes();
    const file = new File([bytes], "spruce-line-logo.png", { type: "image/png" });
    const expectedHash = createHash("sha256").update(bytes).digest("hex");

    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([logoSlot()]),
      user: client,
      file,
      itemId: logoSlot().id,
      useAuthorizationBasis: "customer_owns",
      rightsInput: logoRightsInput(),
    });

    expect(stored.ok).toBe(true);
    if (!stored.ok) return;

    const item = stored.materials.items[0]!;
    expect(item.uploadStatus).toBe("stored");
    expect(item.reviewStatus).toBe("submitted");
    expect(item.storageRef).toBeTruthy();
    if (!item.storageRef || !("objectPath" in item.storageRef)) return;
    expect(item.storageRef.objectPath).toMatch(/spruce-line-logo\.png$/);
    expect(item.storageRef.checksumSha256).toBe(expectedHash);
    expect(item.sizeBytes).toBe(bytes.byteLength);

    expect(priorApprovalMatchesCurrentContent(item)).toBe(true);
    expect(item.useDecision?.contentFingerprint).toBe(buildMaterialContentFingerprint(item));

    expect(item.contentCertification?.routingState).not.toBe("QUARANTINED");
    expect(isCustomerContentClearedForProduction(item)).toBe(true);

    expect(canReviewMaterials(unassignedStaff, CAMPAIGN_ID, envelope, assignments)).toBe(false);
    expect(canReviewMaterials(assignedStaff, CAMPAIGN_ID, envelope, assignments)).toBe(true);

    const reviewed = applyTeamReview(
      stored.materials,
      item.id,
      "approved_for_use",
      undefined,
      assignedStaff,
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    const approved = reviewed.envelope.items[0]!;
    expect(approved.reviewStatus).toBe("approved_for_use");
    expect(priorApprovalMatchesCurrentContent(approved)).toBe(true);

    const resolved = resolveApprovedLogoMaterial({
      repoRoot: process.cwd(),
      items: reviewed.envelope.items,
      skuId: "v2-rtu-social-posts",
    });
    expect(resolved.ok).toBe(true);
  });

  it("invalidates team approval when stored file identity changes (replacement protection)", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const first = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([logoSlot()]),
      user: client,
      file: new File([minimalSyntheticPngBytes()], "spruce-line-logo.png", { type: "image/png" }),
      itemId: logoSlot().id,
      useAuthorizationBasis: "customer_owns",
      rightsInput: logoRightsInput(),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const reviewed = applyTeamReview(
      first.materials,
      logoSlot().id,
      "approved_for_use",
      undefined,
      assignedStaff,
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.envelope.items[0]?.reviewStatus).toBe("approved_for_use");

    const replacedItem: CampaignMaterialItem = {
      ...reviewed.envelope.items[0]!,
      fileName: "spruce-line-logo-v2.png",
      sizeBytes: (reviewed.envelope.items[0]?.sizeBytes ?? 0) + 1,
    };
    const priorFingerprint = reviewed.envelope.items[0]?.useDecision?.contentFingerprint;
    expect(buildMaterialContentFingerprint(replacedItem)).not.toBe(priorFingerprint);

    const reevaluated = applyMaterialUseDecisionToItem({
      item: replacedItem,
      campaignId: CAMPAIGN_ID,
    });
    expect(reevaluated.reviewStatus).toBe("needs_clarification");
    expect(reevaluated.useDecision?.outcome).toBe("CLARIFICATION_REQUIRED");
  });

  it("still quarantines genuine likeness filename contradiction on photo-video", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const photoItem = {
      ...logoSlot(),
      id: "photo-slot",
      category: "photo-video" as const,
      reviewStatus: "missing" as const,
    };
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([photoItem]),
      user: client,
      file: new File([minimalSyntheticPngBytes()], "team-member-portrait.png", {
        type: "image/png",
      }),
      itemId: photoItem.id,
      useAuthorizationBasis: "customer_owns",
      rightsInput: logoRightsInput(),
    });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.materials.items[0]?.contentCertification?.routingState).toBe("QUARANTINED");
    expect(stored.materials.items[0]?.contentCertification?.rights.rightsAnswersContradictFilenameHints).toBe(
      true,
    );
  });

  it("rejects invalid image bytes before storage", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const stored = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: campaign(),
      campaignClientUserId: client.id,
      tasks: tasks(),
      materials: materials([logoSlot()]),
      user: client,
      file: new File(["not-a-png"], "spruce-line-logo.png", { type: "image/png" }),
      itemId: logoSlot().id,
      useAuthorizationBasis: "customer_owns",
      rightsInput: logoRightsInput(),
    });
    expect(stored.ok).toBe(false);
    if (stored.ok) return;
    expect(stored.status).toBe(400);
  });
});
