import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS } from "@/catalog/activation";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import { isRouteMapV2ShelfServiceId } from "@/catalog/route-map-v2-launch";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  SHORT_FORM_VIDEO_EDITING_SKU,
  SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE,
  studioShortFormVideoEditingBuildV1,
} from "@/config/studio-short-form-video-editing-build-v1";
import {
  FOOTAGE_EDITING_INTAKE_TEMPLATE,
  FOOTAGE_EDITING_PRIMARY_TOOL_ID,
  studioShortFormVideoEditingLaunchIntegrationV1,
} from "@/config/studio-short-form-video-editing-launch-integration-v1";
import { studioShortFormVideoEditingPublicPublishV1 } from "@/config/studio-short-form-video-editing-public-publish-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { launchMenuHonestClassification } from "@/config/studio-launch-menu-production-runtime-v1";
import { getJobsForRoad, getRouteMapJob } from "@/config/route-map-v1";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production/active-set";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { presentFootageEditingReviewProof } from "@/lib/studio-review-revision/present-footage-editing-review";
import {
  attachSourceAudioAcknowledgement,
  evaluateSourceAudioCheckoutGate,
} from "@/lib/studio-source-audio-preflight";
import {
  writeCleanTalkingHeadFixture,
  writeNoisyTalkingHeadFixture,
} from "@/lib/studio-source-audio-preflight/fixtures";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { buildFootageEditingStagingCampaign } from "@/lib/studio-short-form-video-editing-launch/staging-purchase";

const REPO = path.resolve(__dirname, "../../..");
const SKU = SHORT_FORM_VIDEO_EDITING_SKU;

describe("$349 Short-Form Video Editing public publish", () => {
  it("publishes the certified offer at 349 on Launch Now and Route Map", () => {
    expect(studioShortFormVideoEditingPublicPublishV1.priceCents).toBe(34900);
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(studioShortFormVideoEditingLaunchIntegrationV1.publicMenuPublished).toBe(
      true,
    );
    expect(isRouteMapV2ShelfServiceId(SKU)).toBe(true);
    expect(CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS).toContain(SKU);
    expect(launchMenuHonestClassification[SKU]).toBe("READY_WITH_EXPLICIT_LIMITS");

    const service = getServiceById(SKU);
    expect(service?.priceCents).toBe(34900);
    expect(service?.launchStatus).toBe("limited");
    expect(service?.intakeTemplate).toBe(FOOTAGE_EDITING_INTAKE_TEMPLATE);
    expect(service?.name).toBe("Short-Form Content Pack");

    const job = getRouteMapJob(SKU);
    expect(job?.priceCents).toBe(34900);
    expect(job?.intakeType).toBe("rtu-short-form-video-edit");
    expect(getJobsForRoad("i75").some((item) => item.id === SKU)).toBe(true);
    expect(getJobsForRoad("i20").some((item) => item.id === SKU)).toBe(true);
    expect(getJobsForRoad("random-exit").some((item) => item.id === SKU)).toBe(true);

    const schema = getRouteMapIntakeSchema(FOOTAGE_EDITING_INTAKE_TEMPLATE);
    expect(schema.type).toBe("rtu-short-form-video-edit");
    expect(schema.fields.some((field) => field.id === "rightsAcknowledgement")).toBe(
      true,
    );
  });

  it("keeps factory, stills, Clip, and Kitchen 22 untouched", () => {
    expect(studioShortFormVideoEditingPublicPublishV1.doNotAlterCertifiedFactory).toBe(
      true,
    );
    expect(studioShortFormVideoEditingPublicPublishV1.doNotAlterStillsShortVideo).toBe(
      true,
    );
    expect(studioShortFormVideoEditingPublicPublishV1.doNotTouchClipRepurposing).toBe(
      true,
    );
    expect(studioShortFormVideoEditingLaunchIntegrationV1.doNotReopenCertifiedFactory).toBe(
      true,
    );
    expect(studioShortFormVideoEditingLaunchIntegrationV1.doNotWireClipRepurposing).toBe(
      true,
    );
    expect(isRouteMapV2ShelfServiceId(CLIP_REPURPOSING_SKU)).toBe(true);

    const footage = resolveServiceProductionContract(SKU);
    expect(footage.contract.primaryTool.toolId).toBe(FOOTAGE_EDITING_PRIMARY_TOOL_ID);
    const stills = resolveServiceProductionContract(SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE);
    expect(stills.contract.primaryTool.toolId).toBe("shotstack");
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(22);
    expect(ACTIVE_CUSTOMER_FACING_SKUS).not.toContain(SKU);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.eleventhPublicMenuPublished).toBe(true);
  });

  it("blocks payment when source audio is missing or unacknowledged", async () => {
    const campaignId = `camp-publish-preflight-${Date.now()}`;
    const campaign = buildFootageEditingStagingCampaign({ campaignId });
    const missing = await evaluateSourceAudioCheckoutGate({
      repoRoot: REPO,
      campaign,
      selectedServiceIds: [SKU],
    });
    expect(missing.ok).toBe(false);

    const rel = `data/campaign-design-artifacts/${campaignId}/materials/talking-head.mp4`;
    const abs = path.join(REPO, rel);
    writeNoisyTalkingHeadFixture(abs);
    await writeMaterialsEnvelope({
      campaignId,
      items: [
        {
          id: "source-1",
          category: "photo-video",
          requirementLevel: "required",
          reviewStatus: "approved_for_use",
          contentKind: "file-metadata",
          label: "Talking-head",
          reason: "Cleared source",
          relatedServiceIds: [SKU],
          uploadStatus: "stored",
          fileName: "talking-head.mp4",
          url: rel,
          useAuthorization: {
            basis: "customer_owns",
            attestedAt: new Date().toISOString(),
          },
        },
      ],
      updatedAt: new Date().toISOString(),
      version: 1,
      syncedAt: new Date().toISOString(),
    });
    const noisy = await evaluateSourceAudioCheckoutGate({
      repoRoot: REPO,
      campaign,
      selectedServiceIds: [SKU],
    });
    expect(noisy.ok).toBe(false);
    if (noisy.ok) return;
    expect(noisy.error).toBe("source_audio_preflight_required");

    const acknowledged = attachSourceAudioAcknowledgement({
      campaign,
      skuId: SKU,
      outcome: "NOTICE_AND_CHOICE",
    });
    const allowed = await evaluateSourceAudioCheckoutGate({
      repoRoot: REPO,
      campaign: acknowledged,
      selectedServiceIds: [SKU],
    });
    expect(allowed.ok).toBe(true);

    const cleanId = `${campaignId}-clean`;
    const cleanRel = `data/campaign-design-artifacts/${cleanId}/materials/talking-head.mp4`;
    writeCleanTalkingHeadFixture(path.join(REPO, cleanRel));
    await writeMaterialsEnvelope({
      campaignId: cleanId,
      items: [
        {
          id: "source-1",
          category: "photo-video",
          requirementLevel: "required",
          reviewStatus: "approved_for_use",
          contentKind: "file-metadata",
          label: "Talking-head",
          reason: "Cleared source",
          relatedServiceIds: [SKU],
          uploadStatus: "stored",
          fileName: "talking-head.mp4",
          url: cleanRel,
          useAuthorization: {
            basis: "customer_owns",
            attestedAt: new Date().toISOString(),
          },
        },
      ],
      updatedAt: new Date().toISOString(),
      version: 1,
      syncedAt: new Date().toISOString(),
    });
    const cleanCampaign = buildFootageEditingStagingCampaign({ campaignId: cleanId });
    const pass = await evaluateSourceAudioCheckoutGate({
      repoRoot: REPO,
      campaign: cleanCampaign,
      selectedServiceIds: [SKU],
    });
    expect(pass.ok).toBe(true);
  });

  it("keeps Review, revision, and Final Delivery bound to the footage SKU", () => {
    expect(
      studioShortFormVideoEditingPublicPublishV1.preserveReviewRevisionDelivery,
    ).toBe(true);
    expect(presentFootageEditingReviewProof).toEqual(expect.any(Function));
    expect(studioShortFormVideoEditingBuildV1.offer.includedRevisions).toBe(1);
  });
});
