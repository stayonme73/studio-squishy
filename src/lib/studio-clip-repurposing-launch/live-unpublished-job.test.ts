import path from "path";
import { describe, expect, it } from "vitest";

import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";

import { runClipRepurposingLiveUnpublishedJob } from "./live-unpublished-job";

const LIVE = process.env.LIVE_CLIP_UNPUBLISHED === "1";
const REPO = path.resolve(__dirname, "../../..");

describe.skipIf(!LIVE)("Clip Repurposing live unpublished $549 job", () => {
  it("wires the certified factory and runs one unpublished job", async () => {
    const proof = await runClipRepurposingLiveUnpublishedJob({ repoRoot: REPO });
    expect(proof.offerPriceCents).toBe(54900);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(proof.primaryToolId).toBe("clip_repurposing_pipeline");
    expect(proof.footageHookRefused).toBe(true);
    expect(proof.stillsHookRefused).toBe(true);
    expect(proof.firstDispatch.ok).toBe(true);
    expect(proof.outcome.ownerRoutineIntervention).toBe("NONE");
    expect(proof.firstDispatch.fileCount).toBe(proof.outcome.fileCount);
    if (proof.outcome.fileCount === 3) {
      expect(proof.outcome.settlementPriceCents).toBe(54900);
    }
    if (proof.outcome.fileCount < 3) {
      expect(proof.outcome.settlementPriceCents).not.toBe(54900);
    }
  }, 7_200_000);
});
