import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  studioExtraArtifactAbsolutePath,
  studioExtraArtifactAllowed,
} from "@/lib/studio-extras/customer-view";
import type { StudioExtraArtifact } from "@/lib/studio-extras/types";

describe("studioExtraArtifactAbsolutePath", () => {
  const campaignId = "camp-abc";
  const repoRoot = path.join("C:", "studio-repo");

  const artifact: StudioExtraArtifact = {
    path: `data/campaign-design-artifacts/${campaignId}/extras/unit/file.pdf`,
    mimeType: "application/pdf",
    bytes: 100,
    sha256: "abc",
  };

  it("allows and resolves paths under the campaign artifact root", () => {
    expect(studioExtraArtifactAllowed(campaignId, artifact)).toBe(true);
    const abs = studioExtraArtifactAbsolutePath(repoRoot, campaignId, artifact);
    expect(abs).toBe(
      path.join(
        repoRoot,
        "data",
        "campaign-design-artifacts",
        campaignId,
        "extras",
        "unit",
        "file.pdf",
      ),
    );
  });

  it("rejects path traversal and foreign campaign folders", () => {
    const evil: StudioExtraArtifact = {
      ...artifact,
      path: `data/campaign-design-artifacts/other-camp/../${campaignId}/x.pdf`,
    };
    expect(studioExtraArtifactAbsolutePath(repoRoot, campaignId, evil)).toBeNull();
  });
});
