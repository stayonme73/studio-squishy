import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioMaterialsUploadV1 } from "@/config/studio-materials-upload-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import { createMockFileRoomStorageAdapter } from "@/lib/file-storage/mock";
import {
  SYNTHETIC_PNG_1X1_BYTES,
  SYNTHETIC_PNG_REPLACEMENT_BYTES,
} from "@/lib/studio-customer-content-intake/test-fixtures";

import {
  resolveConsolidatedClientRequests,
  sanitizeClientConsolidatedRequests,
} from "./client-requests";
import { storeAndAttachCustomerMaterialFile } from "./client-file-store";
import {
  condensedPackageMaterialSlots,
  ensureCondensedPackageMaterialSlots,
} from "./condensed-package-slots";
import type { CampaignMaterialsRecord, ServerMaterialsEnvelope } from "./types";

const now = "2026-10-07T03:00:00.000Z";

function campaign(
  packageId: NonNullable<CampaignRecord["condensedOffer"]>["packageId"],
  name: string,
): CampaignRecord {
  return {
    campaignId: `camp-${packageId}`,
    campaignName: name,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "After intake",
    packageId: "custom-studio-plan",
    packageLabel: name,
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    condensedOffer: {
      packageId,
      name,
      priceCents: 100,
      revisionRounds: 3,
      customerName: "Ada",
      customerEmail: "ada@example.com",
      company: "Cedar Lane",
      projectNeed: "Launch",
      materialsNote: "",
      support: {},
    },
    approvedStudioPlan: {
      selectedServiceIds: [],
      includedServiceIds: [],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 100,
      monthlyTotalCents: 0,
      amountDueTodayCents: 100,
      lineItems: [
        {
          skuId: packageId as never,
          serviceName: name,
          billingType: "one_time",
          exactPriceCents: 100,
          priceDisplay: "$1",
          deliverables: [],
          exclusions: [],
          timingWindowLabel: "Timing varies by package.",
          revisionRule: "3 rounds",
          clientResponsibilities: ["Files are sent from My Studio after payment."],
          executionResponsibility: "The Studio",
        },
      ],
      approvedAt: now,
    },
  };
}

function emptyRecord(campaignId: string): CampaignMaterialsRecord {
  return { campaignId, items: [], updatedAt: now, version: 1 };
}

describe("condensed package material slots", () => {
  it("adds one clip source and does not duplicate it", () => {
    const clip = campaign("clip_repurposing", "Clip Repurposing");
    const first = ensureCondensedPackageMaterialSlots(emptyRecord(clip.campaignId), clip);
    const second = ensureCondensedPackageMaterialSlots(first.record, clip);
    const sources = first.record.items.filter((item) => item.id === "condensed-clip-source");
    expect(sources).toHaveLength(1);
    expect(sources[0]?.isolatedSlot).toBe(true);
    expect(sources[0]?.requirementLevel).toBe("required");
    expect(first.record.items.filter((item) => item.category === "photo-video")).toHaveLength(1);
    expect(second.changed).toBe(false);
    expect(second.record.items).toHaveLength(first.record.items.length);
  });

  it("keeps three short-form clips as separate rows and separate files", async () => {
    const offer = campaign("short_form_video_editing", "Short-Form Video Editing");
    const seeded = ensureCondensedPackageMaterialSlots(emptyRecord(offer.campaignId), offer);
    const clips = seeded.record.items.filter((item) => item.category === "photo-video");
    expect(clips.map((item) => item.id)).toEqual([
      "condensed-short-source-1",
      "condensed-short-source-2",
      "condensed-short-source-3",
    ]);
    expect(new Set(clips.map((item) => item.clientFacingLabel)).size).toBe(3);

    const requests = sanitizeClientConsolidatedRequests(
      resolveConsolidatedClientRequests(seeded.record),
    ).filter((request) => request.contentKind === "file-metadata");
    expect(requests.map((request) => request.id)).toEqual(clips.map((item) => item.id));
    expect(requests.every((request) => request.isolateSlot)).toBe(true);

    const user: StudioUser = {
      id: "short-owner",
      email: "short.owner@example.com",
      displayName: "Short Owner",
      roles: ["client"],
      currentCampaignId: offer.campaignId,
    };
    const materials: ServerMaterialsEnvelope = { ...seeded.record, syncedAt: now };
    const tasks: ServerTasksEnvelope = {
      campaignId: offer.campaignId,
      version: 1,
      planFingerprint: "fp",
      updatedAt: now,
      syncedAt: now,
      tasks: [],
      jobRecords: [
        {
          jobId: `${offer.campaignId}:short_form_video_editing`,
          campaignId: offer.campaignId,
          skuId: "short_form_video_editing" as never,
          serviceName: offer.packageLabel,
          spineStatus: "ready_for_queue",
          productionLane: "standard",
          intakeComplete: true,
          productionStartedAt: null,
          updatedAt: now,
        },
      ],
      qaRecords: [],
    };

    const rights = {
      useAuthorizationBasis: "customer_owns" as const,
      cropAdaptPermitted: true,
      commercialUsePermitted: true,
      recognizablePeoplePresent: true,
      likenessConsentConfirmed: true,
      thirdPartyMaterialPresent: false,
    };
    const firstFile = new File([SYNTHETIC_PNG_1X1_BYTES], "clip-one.png", { type: "image/png" });
    const secondFile = new File([SYNTHETIC_PNG_REPLACEMENT_BYTES], "clip-two.png", {
      type: "image/png",
    });
    const first = await storeAndAttachCustomerMaterialFile({
      adapter: createMockFileRoomStorageAdapter(),
      campaign: offer,
      campaignClientUserId: user.id,
      tasks,
      materials,
      user,
      file: firstFile,
      itemId: "condensed-short-source-1",
      useAuthorizationBasis: "customer_owns",
      rightsInput: rights,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const mirrored = await storeAndAttachCustomerMaterialFile({
      adapter: createMockFileRoomStorageAdapter(),
      campaign: offer,
      campaignClientUserId: user.id,
      tasks: first.tasks,
      materials: first.materials,
      user,
      file: secondFile,
      consolidatedItemId: "photo-video:file-metadata",
      useAuthorizationBasis: "customer_owns",
      rightsInput: rights,
    });
    expect(mirrored.ok).toBe(false);

    const second = await storeAndAttachCustomerMaterialFile({
      adapter: createMockFileRoomStorageAdapter(),
      campaign: offer,
      campaignClientUserId: user.id,
      tasks: first.tasks,
      materials: first.materials,
      user,
      file: secondFile,
      itemId: "condensed-short-source-2",
      useAuthorizationBasis: "customer_owns",
      rightsInput: rights,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const slot1 = second.materials.items.find((item) => item.id === "condensed-short-source-1");
    const slot2 = second.materials.items.find((item) => item.id === "condensed-short-source-2");
    const slot3 = second.materials.items.find((item) => item.id === "condensed-short-source-3");
    expect(slot1?.fileName).toBe("clip-one.png");
    expect(slot2?.fileName).toBe("clip-two.png");
    expect(slot1?.storageRef?.checksumSha256).not.toBe(slot2?.storageRef?.checksumSha256);
    expect(slot3?.uploadStatus).toBe("none");
    expect(slot3?.fileName).toBeUndefined();
    expect(second.tasks.jobRecords?.[0]?.productionStartedAt ?? null).toBeNull();
    expect(slot2?.storageRef?.checksumSha256).toBeTruthy();
  });

  it("keeps social assets off the talking-head source prompt", () => {
    const slots = condensedPackageMaterialSlots("social_and_promo_graphics");
    const prompts = slots.map((slot) => slot.prompt).join(" ");
    expect(prompts).not.toMatch(/15–60 minute|talking-head|native-vertical/i);
    expect(slots.find((slot) => slot.id === "condensed-social-logo")?.category).toBe("logo-brand");
    expect(slots.find((slot) => slot.id === "condensed-social-photos")?.requirementLevel).toBe(
      "optional",
    );
    expect(slots.find((slot) => slot.id === "condensed-social-facts")?.contentKind).toBe("text");
  });

  it("offers MOV because the server already accepts it", () => {
    expect(studioMaterialsUploadV1.allowedExtensions).toContain(".mov");
    expect(studioMaterialsUploadV1.allowedMimeTypes).toContain("video/quicktime");
  });
});
