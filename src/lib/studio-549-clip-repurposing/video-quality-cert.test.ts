import { describe, expect, it } from "vitest";

import { studio549ClipRepurposingBuildV1 as build } from "@/config/studio-549-clip-repurposing-build-v1";

describe("STUDIO-$549-CLIP-REPURPOSING-BUILD-1 video quality Owner cert", () => {
  it("keeps VIDEO QUALITY certified while the value package runs separately", () => {
    expect(build.laneCertified).toBe("VIDEO_QUALITY");
    expect(build.videoQualityClassification).toBe(
      "OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS",
    );
    expect(build.videoQualitySectionClosed).toBe(true);
    expect(build.ownerResult).toBe("VIDEO_QUALITY_PASS");
    expect(build.doNotPublish).toBe(true);
    expect(build.published).toBe(false);
    expect(build.doNotChangePublicCatalog).toBe(true);
    expect(build.productValueDeliveryPackage.status).toBe("STARTED");
    expect(build.productValueDeliveryPackage.packageId).toBe(
      "STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1",
    );
    expect(build.productValueDeliveryPackage.authorizedToStart).toBe(true);
    expect(build.doNotStartMenuCleanup).toBe(true);
    expect(build.doNotStartAdCreative).toBe(true);
    expect(build.doNotStartAiLocalVisibility).toBe(true);
    expect(build.doNotMerge).toBe(true);
    expect(build.doNotPush).toBe(true);
  });
});
