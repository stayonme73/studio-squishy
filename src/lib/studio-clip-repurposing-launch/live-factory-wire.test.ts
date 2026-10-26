import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { CLIP_REPURPOSING_PRIMARY_TOOL_ID } from "@/config/studio-clip-repurposing-launch-integration-v1";
import { studioClipRepurposingLiveUnpublishedJobV1 } from "@/config/studio-clip-repurposing-live-unpublished-job-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { isRouteMapV2ShelfServiceId } from "@/catalog/route-map-v2-launch";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import {
  prepareCertifiedClipRepurposingFactory,
  shouldReuseCertifiedClip,
} from "@/lib/studio-clip-repurposing/live-factory";

const REPO = path.resolve(__dirname, "../../..");

describe("Clip Repurposing live factory wire", () => {
  it("keeps the dedicated hook on the certified factory after public publish", () => {
    const contract = resolveServiceProductionContract(CLIP_REPURPOSING_SKU);
    expect(contract.status).toBe("resolved");
    if (contract.status !== "resolved") return;
    expect(contract.contract.primaryTool.toolId).toBe(CLIP_REPURPOSING_PRIMARY_TOOL_ID);
    expect(contract.contract.primaryTool.toolId).not.toBe("footage_editing_pipeline");
    expect(contract.contract.primaryTool.toolId).not.toBe("shotstack");
    expect(isRouteMapV2ShelfServiceId(CLIP_REPURPOSING_SKU)).toBe(true);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.eleventhPublicMenuPublished).toBe(true);
    expect(studioClipRepurposingLiveUnpublishedJobV1.doNotPublish).toBe(true);
    expect(typeof prepareCertifiedClipRepurposingFactory).toBe("function");
    expect(
      shouldReuseCertifiedClip({
        outputExists: true,
        spendExists: true,
        priorApprovedCta: "Book a River & Reed table",
        requestedCta: "Book a River & Reed table",
      }),
    ).toBe(true);
    expect(
      shouldReuseCertifiedClip({
        outputExists: true,
        spendExists: true,
        priorApprovedCta: "Book a River & Reed table",
        requestedCta: "Book a River & Reed table tonight",
        forceNewRender: true,
      }),
    ).toBe(false);
    expect(
      existsSync(
        path.join(
          REPO,
          studioClipRepurposingLiveUnpublishedJobV1.designatedSourceRelativePath,
        ),
      ),
    ).toBe(true);
  });
});
