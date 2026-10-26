import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS } from "@/catalog/activation";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import { isRouteMapV2ShelfServiceId } from "@/catalog/route-map-v2-launch";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import {
  CLIP_REPURPOSING_INTAKE_TEMPLATE,
  CLIP_REPURPOSING_PRIMARY_TOOL_ID,
  studioClipRepurposingLaunchIntegrationV1,
} from "@/config/studio-clip-repurposing-launch-integration-v1";
import { studioClipRepurposingPublicPublishV1 } from "@/config/studio-clip-repurposing-public-publish-v1";
import {
  ORIGINAL_FROZEN_NINE_SELL_NOW_SKUS,
  studioInternalSellNowRegisterV1,
} from "@/config/studio-internal-sell-now-register-v1";
import { launchMenuHonestClassification } from "@/config/studio-launch-menu-production-runtime-v1";
import { getJobsForRoad, getRouteMapJob } from "@/config/route-map-v1";
import {
  SHORT_FORM_VIDEO_EDITING_SKU,
  SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE,
} from "@/config/studio-short-form-video-editing-build-v1";
import { FOOTAGE_EDITING_PRIMARY_TOOL_ID } from "@/config/studio-short-form-video-editing-launch-integration-v1";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production/active-set";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { resolveClipRepurposingCustomerOutcome } from "@/lib/studio-clip-repurposing/customer-outcome";
import { presentClipRepurposingReviewProof } from "@/lib/studio-review-revision/present-clip-repurposing-review";
import {
  attachSourceAudioAcknowledgement,
  evaluateSourceAudioCheckoutGate,
} from "@/lib/studio-source-audio-preflight";
import {
  writeCleanTalkingHeadFixture,
  writeNoisyTalkingHeadFixture,
} from "@/lib/studio-source-audio-preflight/fixtures";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { buildClipRepurposingStagingCampaign } from "@/lib/studio-clip-repurposing-launch/staging-purchase";

const REPO = path.resolve(__dirname, "../../..");
const SKU = CLIP_REPURPOSING_SKU;

describe("$549 Clip Repurposing public publish", () => {
  it("publishes the certified offer at 549 on Launch Now and Route Map", () => {
    expect(studioClipRepurposingPublicPublishV1.priceCents).toBe(54900);
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(studioClipRepurposingLaunchIntegrationV1.publicMenuPublished).toBe(true);
    expect(studioClipRepurposingLaunchIntegrationV1.onLaunchMenu).toBe(true);
    expect(isRouteMapV2ShelfServiceId(SKU)).toBe(true);
    expect(CATALOG_V2_ACTIVATION_LAUNCH_CANDIDATE_SKUS).toContain(SKU);
    expect(launchMenuHonestClassification[SKU]).toBe("READY_WITH_EXPLICIT_LIMITS");

    const service = getServiceById(SKU);
    expect(service?.priceCents).toBe(54900);
    expect(service?.launchStatus).toBe("limited");
    expect(service?.intakeTemplate).toBe(CLIP_REPURPOSING_INTAKE_TEMPLATE);
    expect(service?.name).toBe("Clip Repurposing");

    const job = getRouteMapJob(SKU);
    expect(job?.priceCents).toBe(54900);
    expect(job?.intakeType).toBe("rtu-clip-repurposing");
    expect(getJobsForRoad("i75").some((item) => item.id === SKU)).toBe(true);
    expect(getJobsForRoad("i20").some((item) => item.id === SKU)).toBe(true);
    expect(getJobsForRoad("random-exit").some((item) => item.id === SKU)).toBe(true);
    expect(getJobsForRoad("update").some((item) => item.id === SKU)).toBe(false);

    const schema = getRouteMapIntakeSchema(CLIP_REPURPOSING_INTAKE_TEMPLATE);
    expect(schema.type).toBe("rtu-clip-repurposing");
    expect(schema.lead).toMatch(/15–60 minute/);
    expect(schema.fields.some((field) => field.id === "rightsAcknowledgement")).toBe(
      true,
    );
  });

  it("keeps $349, $149, original nine, and Kitchen 22 untouched", () => {
    expect(studioClipRepurposingPublicPublishV1.doNotAlterShortFormVideoEditing).toBe(
      true,
    );
    expect(studioClipRepurposingPublicPublishV1.doNotAlterStillsShortVideo).toBe(true);
    expect(studioClipRepurposingPublicPublishV1.doNotTouchOriginalNine).toBe(true);
    expect(studioClipRepurposingLaunchIntegrationV1.primaryToolId).toBe(
      CLIP_REPURPOSING_PRIMARY_TOOL_ID,
    );

    const clip = resolveServiceProductionContract(SKU);
    expect(clip.contract.primaryTool.toolId).toBe(CLIP_REPURPOSING_PRIMARY_TOOL_ID);
    const footage = resolveServiceProductionContract(SHORT_FORM_VIDEO_EDITING_SKU);
    expect(footage.contract.primaryTool.toolId).toBe(FOOTAGE_EDITING_PRIMARY_TOOL_ID);
    const stills = resolveServiceProductionContract(SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE);
    expect(stills.contract.primaryTool.toolId).toBe("shotstack");
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(22);
    expect(ACTIVE_CUSTOMER_FACING_SKUS).not.toContain(SKU);
    expect(ORIGINAL_FROZEN_NINE_SELL_NOW_SKUS).toHaveLength(9);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.eleventhPublicMenuPublished).toBe(true);
    expect(studioInternalSellNowRegisterV1.tenthPublicMenuPublished).toBe(true);
  });

  it("preserves frozen 0/1/2/3+ remedy economics", () => {
    expect(resolveClipRepurposingCustomerOutcome(0).settlementPriceCents).toBe(0);
    expect(resolveClipRepurposingCustomerOutcome(0).treatment).toMatch(/cannot/i);
    expect(resolveClipRepurposingCustomerOutcome(1).settlementPriceCents).toBe(34900);
    expect(resolveClipRepurposingCustomerOutcome(2).settlementPriceCents).toBe(44900);
    expect(resolveClipRepurposingCustomerOutcome(3).settlementPriceCents).toBe(54900);
    expect(resolveClipRepurposingCustomerOutcome(3).fileCount).toBe(3);
  });

  it("blocks payment when source audio is missing or unacknowledged", async () => {
    const campaignId = `camp-clip-publish-preflight-${Date.now()}`;
    const campaign = buildClipRepurposingStagingCampaign({ campaignId });
    const missing = await evaluateSourceAudioCheckoutGate({
      repoRoot: REPO,
      campaign,
      selectedServiceIds: [SKU],
    });
    expect(missing.ok).toBe(false);

    const rel = `data/campaign-design-artifacts/${campaignId}/materials/talking-head.mp4`;
    writeNoisyTalkingHeadFixture(path.join(REPO, rel));
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
    const cleanCampaign = buildClipRepurposingStagingCampaign({
      campaignId: cleanId,
    });
    const pass = await evaluateSourceAudioCheckoutGate({
      repoRoot: REPO,
      campaign: cleanCampaign,
      selectedServiceIds: [SKU],
    });
    expect(pass.ok).toBe(true);
  });

  it("keeps set Review, one set revision, and three-file Final Delivery", () => {
    expect(
      studioClipRepurposingPublicPublishV1.preserveSetReviewRevisionDelivery,
    ).toBe(true);
    expect(presentClipRepurposingReviewProof).toEqual(expect.any(Function));
    expect(studioClipRepurposingBuildV1.proposedOffer.includedSetRevisions).toBe(1);
    expect(studioClipRepurposingBuildV1.proposedOffer.finishedClipCount).toBe(3);
  });
});
