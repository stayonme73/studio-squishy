import path from "path";
import { describe, expect, it } from "vitest";

import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";

import { runLivePaidFootageStagingPass } from "./live-paid-staging-pass";

const LIVE = process.env.LIVE_FOOTAGE_STAGING_PASS === "1";
const REPO = path.resolve(__dirname, "../../..");

describe.skipIf(!LIVE)("Live paid $349 staging pass", () => {
  it("drives one unpublished job through the certified factory and vendors", async () => {
    const proof = await runLivePaidFootageStagingPass({ repoRoot: REPO });
    expect(proof.priceCents).toBe(34900);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(proof.onLaunchNowShelf).toBe(false);
    expect(proof.contractTool).toBe("footage_editing_pipeline");
    expect(proof.stillsTool).toBe("shotstack");
    expect(proof.stillsHookRefused).toBe(true);
    expect(proof.rightsGateClosedWithoutClearance).toBe(true);
    expect(proof.source.nativeVertical).toBe(true);
    expect(proof.source.durationSeconds).toBeLessThanOrEqual(180);
    expect(proof.firstDispatch.ok).toBe(true);
    expect(proof.observerRetry.outcome).toBe("ALREADY_RENDERED");
    expect(proof.observerRetry.sameHash).toBe(true);
    expect(proof.review.presented).toBe(true);
    expect(proof.review.skuId).toBe("v2-rtu-short-form-video-edit");
    expect(proof.revision.ok).toBe(true);
    expect(proof.finalDelivery.assembled).toBe(true);
    expect(proof.finalDelivery.clientVisible).toBe(true);
    expect(proof.quality.reviewHasAudio).toBe(true);
    expect(proof.quality.revisionHasAudio).toBe(true);
    expect(proof.quality.factoryRegression).toBe(false);
  }, 900_000);
});
