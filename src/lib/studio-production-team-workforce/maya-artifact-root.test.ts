import { describe, expect, it } from "vitest";

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";

import { mayaFlyerArtifactRootRel } from "./freeze-maya";

describe("Maya artifact root", () => {
  it("keeps the protected campaign id and the default root", () => {
    expect(MAYA_PROTECTED_CAMPAIGN_ID).toBe("716a15b6-d8d6-436c-8f84-9e8b40d2f959");
    expect(mayaFlyerArtifactRootRel()).toBe(
      customerArtifactRootRel(
        MAYA_PROTECTED_CAMPAIGN_ID,
        `dd:${MAYA_PROTECTED_CAMPAIGN_ID}:v2-rtu-flyer`,
      ),
    );
  });

  it("builds the same root shape for an explicit campaign string", () => {
    const campaignId = "campaign-other";
    expect(mayaFlyerArtifactRootRel(campaignId)).toBe(
      customerArtifactRootRel(campaignId, "dd:campaign-other:v2-rtu-flyer"),
    );
  });
});
